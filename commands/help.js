module.exports = async (sock, msg) => {
  const helpMessage = `📚 *Bot Commands*:
- *.kick [all|@user]*: Kicks mentioned user, replied user, or all non-admins (Admins only).
- *.promote [@user]*: Promotes mentioned or replied user to admin (Admins only).
- *.demote [@user]*: Demotes mentioned or replied admin to member (Admins only).
- *.invite*: Generates group invite link (Admins only).
- *.mute [minutes]*: Mutes group for specified minutes or indefinitely (Admins only).
- *.unmute*: Unmutes group (Admins only).
- *.join [invite_link]*: Joins a group via invite link.
- *.revoke*: Revokes group invite link (Admins only).
- *.ginfo [invite_link]*: Shows group info from invite link.
- *.tagall*: Mentions all group members (Admins only).
- *.hidetag [message]*: Sends a hidden tag message to all members (Admins only).
- *.poll Question|Option1|Option2|...*: Creates a poll (Admins only).
- *.schedule YYYY-MM-DD HH:MM EAT Message*: Schedules a message (Admins only).
- *.warn [@user]*: Warns a user (reply to their message). After 3 warnings, the user is removed. (Admins only).
- *.view*: Shows the last deleted message in private chats.
- *hello*: Sends a greeting message.
- *(Links)*: Non-admins cannot send links; they will be deleted.`;

  await sock.sendMessage(msg.key.remoteJid, { text: helpMessage });
};
