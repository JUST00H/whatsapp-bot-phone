module.exports = async (sock, msg, messageText, sender) => {
  try {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');

    if (!isGroup) {
      return sock.sendMessage(chatId, { text: '❌ .hidetag is only available in group chats.' });
    }

    const command = messageText.toLowerCase().split(' ')[0].slice(1);
    if (command !== 'hidetag') return;

    const groupMetadata = await sock.groupMetadata(chatId);
    const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;
    if (!isAdmin) {
      return sock.sendMessage(chatId, { text: '❌ Only group admins can use .hidetag.' });
    }

    const participants = groupMetadata.participants.map(p => p.id);
    if (!participants.length) return;

    // 🚀 Send hidden mentions but auto-delete them
    const chunkSize = 250;
    for (let i = 0; i < participants.length; i += chunkSize) {
      const batch = participants.slice(i, i + chunkSize);

      // Send hidden mention duplicate
      const sentMessage = await sock.sendMessage(chatId, {
        text: ".", // invisible placeholder
        mentions: batch
      });

      // Delete the duplicate right away
      await sock.sendMessage(chatId, {
        delete: sentMessage.key
      });
    }

    // React 📢 to the admin's original message
    await sock.sendMessage(chatId, {
      react: { text: '📢', key: msg.key }
    });

  } catch (err) {
    console.error('Error in .hidetag command:', err);
    await sock.sendMessage(msg.key.remoteJid, {
      text: `❌ Error: ${err.message || 'Unknown error'}.`
    });
  }
};
