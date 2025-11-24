// commands/antilink.js

module.exports = async (sock, msg, messageText, sender) => {
  try {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');

    if (!isGroup) return;

    const linkRegex = /(http[s]?:\/\/|www\.|bit\.ly|t\.me|wa\.me)/gi;
    if (!linkRegex.test(messageText)) return;

    // Fetch group metadata
    const groupMetadata = await sock.groupMetadata(chatId);
    const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;

    // Only block non-admins
    if (!isAdmin) {
      await sock.sendMessage(chatId, { 
        text: "❌ Links are not allowed here." 
      }, { quoted: msg });

      await sock.sendMessage(chatId, { delete: msg.key });
      return;
    }

  } catch (err) {
    console.error("Error in antilink command:", err);
  }
};
