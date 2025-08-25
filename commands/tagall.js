module.exports = async (sock, msg, messageText, sender) => {
  try {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');

    if (!isGroup) {
      return sock.sendMessage(chatId, { text: '❌ .tagall is only available in group chats.' });
    }

    const command = messageText.toLowerCase().split(' ')[0].slice(1);
    if (command !== 'tagall') return;

    const groupMetadata = await sock.groupMetadata(chatId);
    const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;
    if (!isAdmin) {
      return sock.sendMessage(chatId, { text: '❌ Only group admins can use .tagall.' });
    }

    const participants = groupMetadata.participants.map(p => p.id);
    if (!participants.length) return;

    // Message after `.tagall`
    const text = messageText.split(' ').slice(1).join(' ') || '📢 Attention everyone!';

    const chunkSize = 250;
    for (let i = 0; i < participants.length; i += chunkSize) {
      const batch = participants.slice(i, i + chunkSize);

      // React 📢 to the admin’s command
      await sock.sendMessage(chatId, {
        react: { text: '📢', key: msg.key }
      });

      // Send the tag message, quoting the admin’s `.tagall`
      await sock.sendMessage(chatId, {
        text: text,
        mentions: batch
      }, { quoted: msg });
    }

  } catch (err) {
    console.error('Error in .tagall command:', err);
    await sock.sendMessage(msg.key.remoteJid, {
      text: `❌ Error: ${err.message || 'Unknown error'}.`
    });
  }
};
