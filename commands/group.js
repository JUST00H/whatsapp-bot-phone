const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const jidToNum = jid => jid.split('@')[0].replace('+', '');
const parsedJid = (text) => {
  const regex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;
  const match = text.match(regex);
  return match ? [match[1]] : [];
};

module.exports = async (sock, msg, messageText, sender) => {
  const args = messageText.split(" ");
  const command = args[0].slice(1).toLowerCase();
  const groupId = msg.key.remoteJid;

  // ✅ Handle .kick command
  if (command === "kick") {
    const participants = [];

    // ✅ Collect participants (supports reply + multiple mentions for kickall)
    if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
      participants.push(msg.message.extendedTextMessage.contextInfo.participant);
    }
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
      participants.push(...msg.message.extendedTextMessage.contextInfo.mentionedJid);
    }

    if (participants.length === 0) {
      await sock.sendMessage(groupId, { text: "❌ Please reply to or mention the user(s) you want to kick." }, { quoted: msg });
      return;
    }

    try {
      await sock.groupParticipantsUpdate(groupId, participants, "remove");

      // ✅ Dynamic plural message
      await sock.sendMessage(groupId, {
        text: `✅ Kicked 1 member from the group.`
      });

      // ✅ Safe delete (no crash if stanzaId missing)
      const stanzaId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
      if (stanzaId) {
        await sock.sendMessage(groupId, {
          delete: {
            remoteJid: groupId,
            fromMe: false,
            id: stanzaId,
            participant: participants[0] // delete only the first one’s msg
          }
        });
      }
    } catch (err) {
      console.error("❌ Kick command error:", err);
      await sock.sendMessage(groupId, { text: "⚠️ Failed to kick user(s)." }, { quoted: msg });
    }
    return;
  }

  // .promote command
  else if (command === 'promote') {
    if (!isAdmin) {
      return sock.sendMessage(msg.key.remoteJid, { text: "🚫 Only admins can promote members." });
    }

    let users = [];
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant;

    if (mentions.length) {
      users = mentions;
    } else if (replyJid) {
      users = [replyJid];
    }

    const adminUsers = users.filter(u => groupMetadata.participants.find(p => p.id === u)?.admin);
    users = users.filter(u => !adminUsers.includes(u));

    if (users.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❗ User is already an admin or no valid user specified." });
    }

    await sock.groupParticipantsUpdate(msg.key.remoteJid, users, "promote");
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ Promoted ${users.length} member(s) to admin.` });
  }

  // .demote command
  else if (command === 'demote') {
    if (!isAdmin) {
      return sock.sendMessage(msg.key.remoteJid, { text: "🚫 Only admins can demote members." });
    }

    let users = [];
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant;

    if (mentions.length) {
      users = mentions;
    } else if (replyJid) {
      users = [replyJid];
    }

    const nonAdminUsers = users.filter(u => !groupMetadata.participants.find(p => p.id === u)?.admin);
    users = users.filter(u => !nonAdminUsers.includes(u));

    if (users.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❗ User is not an admin or no valid user specified." });
    }

    await sock.groupParticipantsUpdate(msg.key.remoteJid, users, "demote");
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ Demoted ${users.length} admin(s) to member.` });
  }

  // .invite command
  else if (command === 'invite') {
    if (!isAdmin) {
      return sock.sendMessage(msg.key.remoteJid, { text: "🚫 Only admins can generate invite links." });
    }

    try {
      const inviteCode = await Promise.race([
        sock.groupInviteCode(msg.key.remoteJid),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out after 30s')), 30000))
      ]);
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Group invite link: https://chat.whatsapp.com/${inviteCode}` });
    } catch (error) {
      console.error('Error generating invite link:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: "❌ Failed to generate invite link." });
    }
  }

  // .mute command
  else if (command === 'mute') {
    if (!isAdmin) {
      return sock.sendMessage(msg.key.remoteJid, { text: "🚫 Only admins can mute the group." });
    }

    const args = messageText.slice(6).trim();
    const minutes = parseInt(args);
    try {
      await Promise.race([
        sock.groupSettingUpdate(msg.key.remoteJid, 'announcement'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out after 30s')), 30000))
      ]);
      if (!args || isNaN(minutes)) {
        await sock.sendMessage(msg.key.remoteJid, { text: "🔇 Group muted (only admins can send messages)." });
      } else {
        await sock.sendMessage(msg.key.remoteJid, { text: `🔇 Group muted for ${minutes} minute(s).` });
        await sleep(minutes * 60 * 1000);
        await sock.groupSettingUpdate(msg.key.remoteJid, 'not_announcement');
        await sock.sendMessage(msg.key.remoteJid, { text: "🔊 Group unmuted." });
      }
    } catch (error) {
      console.error('Error muting group:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: "❌ Failed to mute group." });
    }
  }

  // .unmute command
  else if (command === 'unmute') {
    if (!isAdmin) {
      return sock.sendMessage(msg.key.remoteJid, { text: "🚫 Only admins can unmute the group." });
    }

    try {
      await Promise.race([
        sock.groupSettingUpdate(msg.key.remoteJid, 'not_announcement'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out after 30s')), 30000))
      ]);
      await sock.sendMessage(msg.key.remoteJid, { text: "🔊 Group unmuted." });
    } catch (error) {
      console.error('Error unmuting group:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: "❌ Failed to unmute group." });
    }
  }

  // .join command
  else if (command === 'join') {
    const args = messageText.slice(6).trim() || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    if (!args) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❗ Provide a group invite link or reply to one." });
    }

    const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;
    const [, code] = args.match(linkRegex) || [];
    if (!code) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❗ Invalid group invite link." });
    }

    try {
      const groupInfo = await Promise.race([
        sock.groupGetInviteInfo(code),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out after 30s')), 30000))
      ]);
      if (groupInfo.size >= 1024) {
        return sock.sendMessage(msg.key.remoteJid, { text: "❗ Group is full (max 1024 members)." });
      }
      await sock.groupAcceptInvite(code);
      await sock.sendMessage(msg.key.remoteJid, { text: "✅ Joined the group successfully." });
    } catch (error) {
      console.error('Error joining group:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: "❗ Failed to join group. Link may be invalid or revoked." });
    }
  }

  // .revoke command
  else if (command === 'revoke') {
    if (!isAdmin) {
      return sock.sendMessage(msg.key.remoteJid, { text: "🚫 Only admins can revoke invite links." });
    }

    try {
      await Promise.race([
        sock.groupRevokeInvite(msg.key.remoteJid),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out after 30s')), 30000))
      ]);
      await sock.sendMessage(msg.key.remoteJid, { text: "✅ Group invite link revoked." });
    } catch (error) {
      console.error('Error revoking invite link:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: "❌ Failed to revoke invite link." });
    }
  }

  // .ginfo command
  else if (command === 'ginfo') {
    const args = messageText.slice(7).trim() || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    if (!args) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❗ Provide a group invite link (e.g., .ginfo https://chat.whatsapp.com/...) or reply to one." });
    }

    const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;
    const [, code] = args.match(linkRegex) || [];
    if (!code) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❗ Invalid group invite link." });
    }

    try {
      const groupInfo = await Promise.race([
        sock.groupGetInviteInfo(code),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out after 30s')), 30000))
      ]);
      const caption = `📋 *Group Info*:\n- *Name*: ${groupInfo.subject}\n- *ID*: ${groupInfo.id}\n- *Creator*: ${groupInfo.owner ? jidToNum(groupInfo.owner) : 'Unknown'}\n- *Members*: ${groupInfo.size}\n- *Created*: ${new Date(groupInfo.creation * 1000).toLocaleString()}\n- *Description*: ${groupInfo.desc || 'None'}`;
      if (groupInfo.groupPicture) {
        await sock.sendMessage(msg.key.remoteJid, { image: { url: groupInfo.groupPicture }, caption });
      } else {
        await sock.sendMessage(msg.key.remoteJid, { text: caption });
      }
    } catch (error) {
      console.error('Error fetching group info:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: "❗ Failed to fetch group info. Link may be invalid or revoked." });
    }
  }
};
