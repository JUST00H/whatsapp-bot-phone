// commands/sticker.js
// ONLY IMAGES → No video/GIF support
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const path = require('path');

module.exports = async (sock, m, messageText, sender) => {
  try {
    // Must be a reply to a message
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) {
      return sock.sendMessage(m.key.remoteJid, {
        text: 'Reply to an *image* with *.sticker* to convert it!'
      }, { quoted: m });
    }

    let buffer;

    // Only allow imageMessage
    if (quoted.imageMessage) {
      buffer = await downloadMedia(quoted.imageMessage);
    }
    // Block videos/GIFs
    else if (quoted.videoMessage) {
      return sock.sendMessage(m.key.remoteJid, {
        text: 'Video/GIF not supported!\nOnly *images* can be converted to stickers.'
      }, { quoted: m });
    }
    // Block if already a sticker
    else if (quoted.stickerMessage) {
      return sock.sendMessage(m.key.remoteJid, {
        text: 'This is already a sticker!'
      }, { quoted: m });
    }
    // Any other type
    else {
      return sock.sendMessage(m.key.remoteJid, {
        text: 'Please reply to a valid *image* (photo) with *.sticker*'
      }, { quoted: m });
    }

    // Create sticker from image
    const sticker = new Sticker(buffer, {
      pack: 'MyBot',           // Change if you want
      author: 'WhatsApp Bot',   // Change if you want
      type: StickerTypes.DEFAULT,
      quality: 50
    });

    const stickerBuffer = await sticker.toBuffer();

    await sock.sendMessage(m.key.remoteJid, {
      sticker: stickerBuffer
    }, { quoted: m });

    // Optional success message
    await sock.sendMessage(m.key.remoteJid, {
      text: 'Sticker created!'
    }, { quoted: m });

  } catch (err) {
    console.error('Sticker error:', err);
    sock.sendMessage(m.key.remoteJid, {
      text: 'Failed to create sticker. Try again!'
    }, { quoted: m });
  }
};

// Helper: download image as buffer
async function downloadMedia(message) {
  const stream = await downloadContentFromMessage(message, 'image');
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
