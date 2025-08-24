const schedule = require('node-schedule');

module.exports = async (sock, msg, messageText, sender) => {
  const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
  const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;

  if (!isAdmin) {
    return sock.sendMessage(msg.key.remoteJid, { text: "🚫 Only admins can schedule messages." });
  }

  const args = messageText.slice(9).trim().split(' ');
  if (args.length < 3) {
    return sock.sendMessage(msg.key.remoteJid, { text: "❗ Usage: .schedule YYYY-MM-DD HH:MM EAT Message" });
  }

  const dateTime = `${args[0]} ${args[1]} ${args[2]}`;
  const message = args.slice(3).join(' ');
  try {
    const scheduledDate = new Date(dateTime);
    schedule.scheduleJob(scheduledDate, async () => {
      await sock.sendMessage(msg.key.remoteJid, { text: message });
    });
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ Message scheduled for ${dateTime}` });
  } catch (error) {
    await sock.sendMessage(msg.key.remoteJid, { text: "❗ Invalid date format. Use YYYY-MM-DD HH:MM EAT." });
  }
};
