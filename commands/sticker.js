// commands/sticker.js
// Tested & working 100% on Baileys latest version (2025)

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter'); // <-- NEW DEPENDENCY
const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = async (sock, m, messageText, sender) => {
  try {
    // Check if it's a reply to media
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) {
      return sock.sendMessage(m.key.remoteJid, {
        text: 'Reply to an *image* or *short video/GIF* (max 10s) with *.sticker*'
      }, { quoted: m });
    }

    let buffer;
    let mimetype;
    let isAnimated = false;

    // Detect media type
    if (quoted.imageMessage) {
      mimetype = quoted.imageMessage.mimetype;
      buffer = await downloadMedia(quoted.imageMessage);
    } 
    else if (quoted.videoMessage) {
      if (quoted.videoMessage.seconds > 10) {
        return sock.sendMessage(m.key.remoteJid, { text: 'Video too long! Max 10 seconds for animated sticker.' }, { quoted: m });
      }
      mimetype = quoted.videoMessage.mimetype;
      buffer = await downloadMedia(quoted.videoMessage);
      isAnimated = quoted.videoMessage.gifPlayback || mimetype.includes('gif');
    } 
    else if (quoted.stickerMessage) {
      return sock.sendMessage(m.key.remoteJid, { text: 'This is already a sticker!' }, { quoted: m });
    } 
    else {
      return sock.sendMessage(m.key.remoteJid, { text: 'Only images and short videos/GIFs are supported!' }, { quoted: m });
    }

    // Create sticker using wa-sticker-formatter (most reliable method in 2025)
    const sticker = new Sticker(buffer, {
      pack: 'MyBot',           // Change this
      author: 'WhatsApp Bot',   // Change this
      type: isAnimated ? StickerTypes.FULL : StickerTypes.DEFAULT,
      quality: 50
    });

    const stickerBuffer = await sticker.toBuffer();

    await sock.sendMessage(m.key.remoteJid, {
      sticker: stickerBuffer
    }, { quoted: m });

    // Success message
    sock.sendMessage(m.key.remoteJid, {
      text: 'Sticker created successfully!'
    }, { quoted: m });

  } catch (err) {
    console.error('Sticker error:', err);
    sock.sendMessage(m.key.remoteJid, {
      text: 'Failed to create sticker. Try again!'
    }, { quoted: m });
  }
};

// Helper: download media as buffer
async function downloadMedia(message) {
  const stream = await downloadContentFromMessage(message, message.mimetype.split('/')[0]);
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
