module.exports = async (sock, msg, messageText, sender) => {
  const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
  const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;

  if (!isAdmin) {
    return sock.sendMessage(msg.key.remoteJid, { text: "🚫 Only admins can remove members." });
  }

  const mentionedJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentionedJid) {
    await sock.groupParticipantsUpdate(msg.key.remoteJid, [mentionedJid], "remove");
    sock.sendMessage(msg.key.remoteJid, { text: "👢 User removed from the group." });
  } else {
    sock.sendMessage(msg.key.remoteJid, { text: "❗ Please mention a user to remove." });
  }
};
