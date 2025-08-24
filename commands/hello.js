module.exports = async (sock, msg) => {
  await sock.sendMessage(msg.key.remoteJid, { text: `👋 Hi there! How can I help you?` });
};
