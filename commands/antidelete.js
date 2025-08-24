// commands/antidelete.js

// Put your own JID here:
const OWNER_JID = "254101273639@s.whatsapp.net";

module.exports = async (sock, msg, messageText, sender) => {
  const chatId = msg.key.remoteJid;

  // Only for private chats
  if (chatId.endsWith("@g.us")) {
    await sock.sendMessage(chatId, { 
      text: "❌ The antidelete command only works in private chats." 
    }, { quoted: msg });
    return;
  }

  // Restrict to owner only
  if (sender !== OWNER_JID) {
    await sock.sendMessage(chatId, { 
      text: "⚠️ Only the bot owner can enable or disable antidelete." 
    });
    return;
  }

  const args = messageText.trim().split(" ");
  const option = args[1] ? args[1].toLowerCase() : null;

  if (option === "on") {
    if (!global.antidelete) global.antidelete = {};
    global.antidelete[chatId] = true;

    await sock.sendMessage(chatId, { 
      text: "✅ Antidelete has been *enabled* for this chat. Deleted messages will be recovered." 
    });
  } 
  else if (option === "off") {
    if (!global.antidelete) global.antidelete = {};
    global.antidelete[chatId] = false;

    await sock.sendMessage(chatId, { 
      text: "🚫 Antidelete has been *disabled* for this chat." 
    });
  } 
  else {
    await sock.sendMessage(chatId, { 
      text: "⚙️ Usage: `.antidelete on` or `.antidelete off`" 
    });
  }
};
