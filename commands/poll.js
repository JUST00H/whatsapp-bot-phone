module.exports = async (sock, msg, messageText, sender) => {
  const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
  const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;

  if (!isAdmin) {
    return sock.sendMessage(msg.key.remoteJid, { text: "🚫 Only admins can create polls." });
  }

  const pollText = messageText.slice(6).trim();
  console.log('Poll input:', pollText); // Debug log
  const parts = pollText.split('|').map(s => s.trim()).filter(s => s);
  console.log('Parts:', parts); // Debug log
  if (parts.length < 3) {
    return sock.sendMessage(msg.key.remoteJid, { text: "❗ Usage: .poll Question|Option1|Option2|... (at least two options)" });
  }

  const question = parts[0];
  const options = parts.slice(1);
  console.log('Question:', question, 'Options:', options); // Debug log
  if (options.length < 2) {
    return sock.sendMessage(msg.key.remoteJid, { text: "❗ At least two options are required." });
  }

  await sock.sendMessage(msg.key.remoteJid, {
    poll: {
      name: question,
      values: options,
      selectableCount: 1
    }
  });
};
