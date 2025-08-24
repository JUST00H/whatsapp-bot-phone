module.exports = async (sock, msg, messageText, sender) => {
  const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
  const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;

  if (!isAdmin) {
    return sock.sendMessage(msg.key.remoteJid, { text: "🚫 Only admins can use .tagall." });
  }

  const mentions = groupMetadata.participants.map(p => p.id);
  await sock.sendMessage(msg.key.remoteJid, {
    text: `@everyone`,
    mentions
  });
};
