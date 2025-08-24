const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async (sock, msg, messageText, sender) => {
  try {
    const rawCommand = messageText.toLowerCase().split(' ')[0].slice(1); // remove the dot
    const isGroup = msg.key.remoteJid.endsWith('@g.us');

    // ✅ Command trigger depends on chat type
    const expectedCommand = isGroup ? 'view' : 'vie';
    if (rawCommand !== expectedCommand) return;

    // ✅ Admin check only in groups
    if (isGroup) {
      const groupMetadata = await sock.groupMetadata(msg.key.remoteJid).catch(err => null);
      if (!groupMetadata || !Array.isArray(groupMetadata.participants)) {
        await sock.sendMessage(msg.key.remoteJid, { text: "❌ Failed to fetch group metadata." });
        return;
      }
      const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;
      if (!isAdmin) {
        await sock.sendMessage(msg.key.remoteJid, { text: "🚫 Only admins can use the .view command in groups." });
        return;
      }
    }

    // ✅ Find quoted message (if replied) or use current message (caption case)
    const ctx = msg.message?.extendedTextMessage?.contextInfo || {};
    const quoted = ctx.quotedMessage || null;
    const sourceMsg = quoted || msg.message || null;

    if (!sourceMsg) {
      return sock.sendMessage(msg.key.remoteJid, { text: `❗ In ${isGroup ? 'groups use .view' : 'private chats use .vie'} while replying to media, or send media with the command as caption.` });
    }

    // ✅ Unwrap view-once wrapper if present
    const unwrapViewOnce = (m) => {
      if (!m) return null;
      if (m.viewOnceMessage?.message) return m.viewOnceMessage.message;
      if (m.viewOnceMessageV2?.message) return m.viewOnceMessageV2.message;
      if (m.viewOnceMessageV2Extension?.message) return m.viewOnceMessageV2Extension.message;
      return m;
    };

    const unwrapped = unwrapViewOnce(sourceMsg);

    // ✅ Supported media check
    const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
    let mediaKey = null;
    for (const key of mediaTypes) {
      if (unwrapped[key]) {
        mediaKey = key;
        break;
      }
    }

    if (!mediaKey) {
      return sock.sendMessage(msg.key.remoteJid, { text: '❗ No supported media found. Supported: image, video, audio, document, sticker.' });
    }

    const mediaObj = unwrapped[mediaKey];
    if (!mediaObj.mediaKey || mediaObj.mediaKey.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Invalid or expired media. It may already have been viewed.' });
    }

    // Decide typeHint
    let typeHint = 'document';
    if (mediaKey === 'imageMessage') typeHint = 'image';
    else if (mediaKey === 'videoMessage') typeHint = 'video';
    else if (mediaKey === 'audioMessage') typeHint = 'audio';
    else if (mediaKey === 'stickerMessage') typeHint = 'sticker';

    await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Downloading media, please wait...' });

    // ✅ Download helper
    const downloadStream = async (messageContent, typeHint) => {
      if (typeof sock.downloadMediaMessage === 'function') {
        try {
          const buff = await sock.downloadMediaMessage(
            { key: msg.key, message: unwrapped },
            'buffer',
            {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
          );
          if (Buffer.isBuffer(buff)) return buff;
        } catch (e) {
          console.warn('downloadMediaMessage failed, falling back:', e.message);
        }
      }
      const stream = await downloadContentFromMessage(messageContent[mediaKey], typeHint);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      return buffer;
    };

    const buffer = await Promise.race([
      downloadStream(unwrapped, typeHint),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Download timed out (30s)')), 30000))
    ]);

    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to download media.' });
    }

    // ✅ Send back revealed media
    const sendOptions = {};
    if (typeHint === 'image') sendOptions.image = buffer;
    else if (typeHint === 'video') sendOptions.video = buffer;
    else if (typeHint === 'audio') sendOptions.audio = buffer;
    else if (typeHint === 'sticker') sendOptions.sticker = buffer;
    else if (typeHint === 'document') {
      sendOptions.document = buffer;
      sendOptions.mimetype = mediaObj.mimetype || 'application/octet-stream';
      sendOptions.fileName = mediaObj.fileName || `${Date.now()}.bin`;
    }

    await sleep(500);
    await sock.sendMessage(msg.key.remoteJid, {
      ...sendOptions,
      caption: `🔓 Revealed media (${isGroup ? '.view in group' : '.vie in private'})`
    });
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ Successfully revealed ${typeHint}.` });

  } catch (err) {
    console.error('Error in .view/.vie command:', err);
    try {
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${err.message || String(err)}` });
    } catch (e) {}
  }
};
