/**
 * .delete command
 * Deletes the replied-to message for everyone.
 * Usage: Reply to a message and type .delete
 * Admins only in groups, anyone in private (bot's own messages only).
 */

module.exports = async (sock, msg, messageText, sender) => {
  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith('@g.us');
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const quotedKey = msg.message?.extendedTextMessage?.contextInfo;

  // Must be a reply
  if (!quoted || !quotedKey?.stanzaId) {
    await sock.sendMessage(chatId, {
      text: '⚠️ Please reply to a message you want to delete.'
    }, { quoted: msg });
    return;
  }

  // In groups, only admins can use this command
  if (isGroup) {
    const groupMetadata = await sock.groupMetadata(chatId);
    const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;

    if (!isAdmin) {
      await sock.sendMessage(chatId, {
        text: '⚠️ Only admins can delete messages.'
      }, { quoted: msg });
      return;
    }
  }

  // Build the key of the message to delete
  let messageToDelete;

  if (isGroup) {
    // Groups: delete any message (bot must be admin)
    messageToDelete = {
      remoteJid: chatId,
      id: quotedKey.stanzaId,
      participant: quotedKey.participant || sender,
      fromMe: false
    };
  } else {
    // Private chats: determine if the quoted message was sent by the bot
    const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
    const quotedSender = quotedKey.participant || quotedKey.remoteJid;
    const isFromMe = quotedSender === botId;

    if (!isFromMe) {
      await sock.sendMessage(chatId, {
        text: "⚠️ I can only delete my own messages in private chats. WhatsApp doesn't allow deleting someone else's messages here."
      }, { quoted: msg });
      return;
    }

    messageToDelete = {
      remoteJid: chatId,
      id: quotedKey.stanzaId,
      fromMe: true
    };
  }

  try {
    await sock.sendMessage(chatId, { delete: messageToDelete });
  } catch (error) {
    await sock.sendMessage(chatId, {
      text: '⚠️ Failed to delete the message. I may not have permission.'
    }, { quoted: msg });
    console.error('Delete error:', error);
  }
};
