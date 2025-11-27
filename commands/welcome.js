// commands/welcome.js

module.exports = (sock) => {

  // Keep track of members who have already been welcomed
  const welcomedMembers = new Set();

  try {

    sock.ev.on("group-participants.update", async (update) => {

      const { id, participants, action } = update;

      // Only run when someone is added
      if (action !== "add") return;

      const member = participants[0];

      // If the member has already been welcomed, skip
      if (welcomedMembers.has(member)) return;

      try {

        const meta = await sock.groupMetadata(id);

        await sock.sendMessage(id, {
          text: `👋 Welcome @${member.split("@")[0]} to *${meta.subject}*!\n\n📜 *Group Rules:*\n• Be respectful\n• No spamming\n• No insults or hate speech\n\n🚫 No links allowed\n📌 Type *.help* for commands`,
          mentions: [member]
        });

        // Mark the member as welcomed
        welcomedMembers.add(member);

      } catch (err) {

        console.error("Failed to send welcome message:", err);

      }

    });

  } catch (e) {

    console.error("Welcome.js error:", e);

  }

};
