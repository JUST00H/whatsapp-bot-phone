// commands/antilink.js

// Store antilink settings per group
const antilinkStatus = {}; 
// Example: antilinkStatus["1234@g.us"] = true;

module.exports = async (sock, msg, messageText, sender) => {
  try {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    if (!isGroup) return;

    const lower = messageText.toLowerCase();
    const command = lower.split(" ")[0].slice(1); // Remove the dot

    const groupMetadata = await sock.groupMetadata(chatId);
    const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;

    // 📌 Handle .antilink commands
    if (command === "antilink") {
      // Only admins can manage antilink
      if (!isAdmin) {
        return sock.sendMessage(chatId, { 
          text: "⚠️ Only admins can manage Anti-Link." 
        }, { quoted: msg });
      }

      const arg = lower.split(" ")[1];

      if (arg === "on") {
        antilinkStatus[chatId] = true;
        return sock.sendMessage(chatId, { 
          text: "✅ Anti-Link has been *ENABLED* in this group." 
        }, { quoted: msg });
      }

      if (arg === "off") {
        antilinkStatus[chatId] = false;
        return sock.sendMessage(chatId, { 
          text: "❌ Anti-Link has been *DISABLED* in this group." 
        }, { quoted: msg });
      }

      // Show help menu (also works for "status" or no/wrong argument)
      return sock.sendMessage(chatId, {
        text: `🛡 *ANTILINK PROTECTION*\n📊 Current Status: ${antilinkStatus[chatId] ? "🟢 ENABLED" : "🔴 DISABLED"}\n\nAvailable Commands:\n• *.antilink on* - Turn on\n• *.antilink off* - Turn off\n• *.antilink status* - Check current status\n• *.antilink* - Show this help menu\n\nNote: Only group admins can enable/disable antilink protection.`
      }, { quoted: msg });
    }

    // 🚫 Link protection (only when ON)
    if (!antilinkStatus[chatId]) return;

    const linkRegex = /(http[s]?:\/\/|www\.|bit\.ly|t\.me|wa\.me)/gi;
    if (!linkRegex.test(messageText)) return;

    // Ignore admins posting links
    if (isAdmin) return;

    await sock.sendMessage(chatId, {
      text: "❌ Links are not allowed here."
    }, { quoted: msg });

    await sock.sendMessage(chatId, { delete: msg.key });

  } catch (err) {
    console.error("Error in antilink command:", err);
  }
};
