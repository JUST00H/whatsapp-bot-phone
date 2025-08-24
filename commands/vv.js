// commands/vv.js
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = async (sock, msg, messageText, sender) => {
  try {
    const rawCommand = messageText.toLowerCase().split(' ')[0].slice(1);
    if (rawCommand !== 'vv') return;

    const chatId = msg.key.remoteJid;
    if (!chatId.endsWith('@s.whatsapp.net')) {
      await sock.sendMessage(chatId, { text: "❌ The .vv command only works in private chats." }, { quoted: msg });
      return;
    }

    const ctx = msg.message?.extendedTextMessage?.contextInfo || {};
    const quoted = ctx.quotedMessage || null;
    const sourceMsg = quoted || msg.message || null;

    if (!sourceMsg) {
      return sock.sendMessage(chatId, { text: "❗ Reply to a *view-once media* with `.vv`." });
    }

    // ✅ unwrap logic
    const unwrap = (m) => {
      if (!m) return null;
      if (m.viewOnceMessage?.message) return m.viewOnceMessage.message;
      if (m.viewOnceMessageV2?.message) return m.viewOnceMessageV2.message;
      if (m.viewOnceMessageV2Extension?.message) return m.viewOnceMessageV2Extension.message;
      return m;
    };

    const unwrapped = unwrap(sourceMsg);

    // ✅ find supported media
    const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
    let mediaKey = mediaTypes.find(k => unwrapped[k]);
    if (!mediaKey) return sock.sendMessage(chatId, { text: "❗ No supported media found (image, video, audio, doc, sticker)." });

    const mediaObj = unwrapped[mediaKey];
    if (!mediaObj.mediaKey) return sock.sendMessage(chatId, { text: "❌ Expired or invalid media." });

    // ✅ download
    const stream = await downloadContentFromMessage(mediaObj, mediaKey.replace('Message','').toLowerCase());
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

    if (buffer.length === 0) return sock.sendMessage(chatId, { text: "❌ Failed to download media." });

    // ✅ resend
    const sendOptions = {};
    if (mediaKey === 'imageMessage') sendOptions.image = buffer;
    else if (mediaKey === 'videoMessage') sendOptions.video = buffer;
    else if (mediaKey === 'audioMessage') sendOptions.audio = buffer;
    else if (mediaKey === 'stickerMessage') sendOptions.sticker = buffer;
    else {
      sendOptions.document = buffer;
      sendOptions.mimetype = mediaObj.mimetype || 'application/octet-stream';
      sendOptions.fileName = mediaObj.fileName || `${Date.now()}.bin`;
    }

    await sleep(500);
    await sock.sendMessage(chatId, { ...sendOptions, caption: "🔓 View-once unlocked!" }, { quoted: msg });

  } catch (err) {
    console.error("Error in .vv command:", err);
    await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${err.message}` });
  }
};
