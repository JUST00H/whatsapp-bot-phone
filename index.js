const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const path = require('path');

const PHONE_NUMBER = '+254101273639'; // CHANGE THIS

// Load command modules dynamically
const commandDir = path.join(__dirname, 'commands');
const commands = {};
fs.readdirSync(commandDir).forEach(file => {
  if (file.endsWith('.js')) {
    const commandModule = require(path.join(commandDir, file));
    commands[file.replace('.js', '')] = commandModule;
  }
});

// Global caches
global.messageCache = {};
global.viewOnceCache = {};

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: 'silent' })
  });

  sock.ev.on('creds.update', saveCreds);

  // 🔐 Connection events
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('📱 QR code generated, but using phone number pairing instead.');
      try {
        const pairingCode = await sock.requestPairingCode(PHONE_NUMBER.replace('+', ''));
        console.log(`📱 Pairing code for ${PHONE_NUMBER}: ${pairingCode}`);
        fs.writeFileSync('pairing-code.txt', pairingCode);
        console.log('Pairing code saved to pairing-code.txt');
      } catch (error) {
        console.error('Failed to request pairing code:', error);
      }
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting...', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(startBot, 5000);
      }
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp');
    }
  });

  // 👋 Welcome new group members
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (action === 'add') {
      const groupMetadata = await sock.groupMetadata(id);
      const welcomeMessage = `👋 Welcome @${participants[0].split('@')[0]} to ${groupMetadata.subject}!\n\n📜 *Group Rules*:\n- No links allowed (non-admins).\n- Use .help for commands.`;
      await sock.sendMessage(id, {
        text: welcomeMessage,
        mentions: [participants[0]]
      });
    }
  });

  // 🔁 Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.participant || msg.key.remoteJid;
    const messageText =
      msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    const chatId = msg.key.remoteJid;

    // ✅ Cache for antidelete
    const msgId = msg.key.id;
    global.messageCache[msgId] = { chatId, msg };

    // 📥 Cache incoming view-once messages
    if (msg.message?.viewOnceMessageV2) {
      const innerMsg = msg.message.viewOnceMessageV2.message;
      global.vvCache = global.vvCache || {};
      global.vvCache[msg.key.id] = { chatId, msg: innerMsg };
    }

    // ✅ Cache view-once messages
    if (msg.message?.viewOnceMessageV2) {
      const innerMsg = msg.message.viewOnceMessageV2.message;
      global.viewOnceCache[msgId] = { ...msg, message: innerMsg }; // unwrap
      console.log("📌 Cached view-once message:", msgId);
    }

    // 🚫 Link detection in groups
    const linkRegex = /(http[s]?:\/\/|www\.|bit\.ly|t\.me|wa\.me)/gi;
    if (chatId.endsWith('@g.us') && linkRegex.test(messageText)) {
      const groupMetadata = await sock.groupMetadata(chatId);
      const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;

      if (!isAdmin) {
        await sock.sendMessage(chatId, { text: "❌ Links are not allowed here." }, { quoted: msg });
        await sock.sendMessage(chatId, { delete: msg.key });
        return;
      }
    }

    // 📌 FAQ responses
    const faqs = {
      'rules': '📜 *Group Rules*:\n- No links for non-admins.\n- Admins can use group commands, .tagall, .poll, .schedule, .image.\n- Type .help for all commands.',
      'info': 'ℹ️ This is a community group bot powered by Baileys. Use .help to see what I can do!'
    };

    if (Object.keys(faqs).some(keyword => messageText.toLowerCase().includes(keyword))) {
      const keyword = Object.keys(faqs).find(keyword => messageText.toLowerCase().includes(keyword));
      await sock.sendMessage(chatId, { text: faqs[keyword] });
      return;
    }

    // 📌 Command parsing
    const command = messageText.toLowerCase().split(' ')[0];
    const commandName = command.startsWith('.') ? command.slice(1) : command;

    // 📨 Always run autoreply in private chats
    if (commands.autoreply) {
      await commands.autoreply(sock, msg, messageText, sender);
    }

    // Group command handler
    if (commands.group && ['kick', 'add', 'promote', 'demote', 'invite', 'mute', 'unmute', 'join', 'revoke', 'ginfo', 'common'].includes(commandName)) {
      await commands.group(sock, msg, messageText, sender);
    } 
    // Any other command
    else if (commands[commandName]) {
      await commands[commandName](sock, msg, messageText, sender);
    }
  });
}

// Start bot
startBot();
