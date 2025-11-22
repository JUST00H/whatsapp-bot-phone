module.exports = async (sock, msg) => {
  const helpMessage = `Bot Commands List

Sticker & Media
- *.sticker* → Reply to an *image* (photo) to convert it into a sticker (videos not supported)

Group Management (Admins only)
- *.kick [all|@user]* → Kick user(s) or all non-admins
- *.promote [@user]* → Make someone admin
- *.demote [@user]* → Remove admin rights
- *.invite* → Get group invite link
- *.revoke* → Reset invite link
- *.mute [minutes]* → Mute group (e.g. .mute 60)
- *.unmute* → Unmute group
- *.tagall* → Mention everyone
- *.hidetag [text]* → Hidden mention with custom message
- *.poll Question|Opt1|Opt2|...* → Create a poll
- *.schedule YYYY-MM-DD HH:MM Message* → Schedule a message (EAT time)
- *.warn [@user]* → Warn user (3 warnings = auto-kick)

Utility & Fun
- *.join [link]* → Bot joins group via invite link
- *.ginfo [link]* → Show group info from invite link
- *.view* → View last deleted message (in private chat)
- *hello* → Get a greeting

Rules
• Non-admins cannot send links — messages will be deleted automatically
• Use commands with dot prefix: .

Enjoy using the bot!`;

  await sock.sendMessage(msg.key.remoteJid, { text: helpMessage }, { quoted: msg });
};
