async function autoreply(sock, msg, messageText, sender) {
  try {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');

    // Only reply in private chats
    if (isGroup || msg.key.fromMe) {
      return;
    }

    // Check for decryption failure
    if (!msg.message || (!msg.message.conversation && !msg.message.extendedTextMessage && !msg.message.imageMessage && !msg.message.videoMessage && !msg.message.audioMessage && !msg.message.documentMessage && !msg.message.stickerMessage)) {
      console.error('Message decryption failed for:', chatId);
      return;
    }

    // Send auto-reply
    await sock.sendMessage(chatId, {
      text: 'Thanks for your message! I’ll get to you ASAP.'
    });

  } catch (err) {
    console.error('Error in autoreply:', err);
    try {
      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Error: ${err.message || String(err)}. Try re-pairing the bot with the pairing code in pairing-code.txt.`
      });
    } catch (e) {
      console.error('Error sending error message:', e);
    }
  }
}

module.exports = autoreply;
