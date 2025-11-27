// commands/welcome.js

// Track welcomed users to prevent duplicate messages
const welcomedUsers = new Set();

module.exports = (sock) => {
  try {
    sock.ev.on("group-participants.update", async (update) => {
      const { id, participants, action } = update;

      // Only run when someone is added
      if (action !== "add") return;

      const member = participants[0];
      
      // Create a unique identifier for this welcome event
      const welcomeKey = `${id}:${member}:${Date.now()}`;
      
      // Check if we already welcomed this user recently (within 10 seconds)
      if (welcomedUsers.has(welcomeKey)) {
        return;
      }
      
      // Add to welcomed set
      welcomedUsers.add(welcomeKey);
      
      // Clean up old entries after 10 seconds to prevent memory leaks
      setTimeout(() => {
        welcomedUsers.delete(welcomeKey);
      }, 10000);

      try {
        const meta = await sock.groupMetadata(id);
        await sock.sendMessage(id, {
          text: `👋 Welcome @${member.split("@")[0]} to *${meta.subject}*!\n\n📜 *Group Rules:*\n• Be respectful to everyone\n• No spam or flooding\n• No NSFW content\n• Follow admin instructions\n\nType .help for commands`,
          mentions: [member]
        });
      } catch (err) {
        console.error("Failed to send welcome message:", err);
      }
    });
  } catch (e) {
    console.error("Welcome.js error:", e);
  }
};
