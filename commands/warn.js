// commands/warn.js
const warns = {}; // store warnings: { groupId: { userId: count } }

module.exports = async (sock, msg, messageText, sender) => {
  try {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');

    const command = (messageText || '').trim().toLowerCase().split(' ')[0].slice(1);
    if (command !== 'warn') return;

    if (!isGroup) {
      return sock.sendMessage(chatId, { text: '⚠️ .warn is only available in group chats.' }, { quoted: msg });
    }

    const groupMetadata = await sock.groupMetadata(chatId);
    const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;
    if (!isAdmin) {
      return sock.sendMessage(chatId, { text: '⚠️ Only group admins can use .warn.' }, { quoted: msg });
    }

    const quotedMessage = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quotedMessage || !msg.message.extendedTextMessage?.contextInfo?.participant) {
      return sock.sendMessage(chatId, { text: '⚠️ Please reply to a message with .warn to warn the sender.' }, { quoted: msg });
    }

    const targetUser = msg.message.extendedTextMessage.contextInfo.participant;
    const isTargetAdmin = groupMetadata.participants.find(p => p.id === targetUser)?.admin;
    if (isTargetAdmin) {
      return sock.sendMessage(chatId, { text: '⚠️ Cannot warn an admin.' }, { quoted: msg });
    }

    // init warning storage
    if (!warns[chatId]) warns[chatId] = {};
    if (!warns[chatId][targetUser]) warns[chatId][targetUser] = 0;

    // increment warning
    warns[chatId][targetUser]++;

    if (warns[chatId][targetUser] >= 3) {
      // remove user after 3rd warning
      await sock.groupParticipantsUpdate(chatId, [targetUser], 'remove');
      await sock.sendMessage(chatId, {
        text: `❌ @${targetUser.split('@')[0]} has been removed after 3 warnings.`,
        mentions: [targetUser]
      }, { quoted: msg });

        // reset warnings
      warns[chatId][targetUser] = 0;
    } else {
      const warnsLeft = 3 - warns[chatId][targetUser];
      await sock.sendMessage(chatId, {
        text: `⚠️ @${targetUser.split('@')[0]} YOU HAVE BEEN WARNED. WARNINGS LEFT (${warnsLeft}/3).`,
        mentions: [targetUser]
      }, { quoted: msg });
    }

  } catch (err) {
    console.error('Error in .warn command:', err);
    await sock.sendMessage(msg.key.remoteJid, {
      text: `⚠️ Error: ${err.message || 'Unknown error'}.`
    }, { quoted: msg });
  }
};
