module.exports = async (sock, msg, messageText, sender) => {
  const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
  const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;

  if (!isAdmin) {
    return sock.sendMessage(msg.key.remoteJid, { text: "🚫 Only admins can add members." });
  }

  let numbers = [];
  const args = messageText.slice(5).trim().split(/\s+/);
  const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant;

  if (args.length === 0 && !replyJid) {
    return sock.sendMessage(msg.key.remoteJid, { text: "❗ Usage: .add +number1 +number2 ... or reply to a message with .add" });
  }

  if (replyJid) {
    numbers.push(replyJid); // Add replied user's JID
  } else {
    numbers = args.map(num => num.startsWith('+') ? num + '@s.whatsapp.net' : '+' + num + '@s.whatsapp.net').filter(num => /^\+\d+@s\.whatsapp\.net$/.test(num));
  }

  console.log('Group ID:', msg.key.remoteJid, 'Numbers to add:', numbers); // Debug log
  if (numbers.length === 0) {
    return sock.sendMessage(msg.key.remoteJid, { text: "❗ Provide valid phone numbers in international format (e.g., +254123456789) or reply to a message." });
  }

  await sock.sendMessage(msg.key.remoteJid, { text: "⏳ Adding member(s)... Please wait." });
  await new Promise(resolve => setTimeout(resolve, 3000)); // 3-second delay

  try {
    const results = [];
    for (const num of numbers) {
      let attempts = 3;
      let success = false;
      let lastError = null;

      while (attempts > 0 && !success) {
        try {
          console.log(`Attempting to add ${num} (Attempt ${4 - attempts}/3)`);
          await Promise.race([
            sock.groupParticipantsUpdate(msg.key.remoteJid, [num], "add"),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out after 30s')), 30000))
          ]);
          success = true;
          results.push({ number: num.split('@')[0], status: 'added' });
        } catch (err) {
          lastError = err;
          console.error(`Failed to add ${num} on attempt ${4 - attempts}/3:`, err);
          attempts--;
          if (attempts > 0) {
            console.log(`Retrying ${num} in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (!success) {
        results.push({ number: num.split('@')[0], status: 'failed', error: lastError ? lastError.message : 'Unknown error' });
      }
    }

    const successCount = results.filter(r => r.status === 'added').length;
    const failed = results.filter(r => r.status === 'failed').map(r => `${r.number}: ${r.error}`);
    let response = `✅ Added ${successCount} member(s) to the group.`;
    if (failed.length > 0) {
      response += `\n❌ Failed to add: ${failed.join(', ')}`;
    }
    await sock.sendMessage(msg.key.remoteJid, { text: response });
  } catch (error) {
    console.error('Error adding members:', error);
    await sock.sendMessage(msg.key.remoteJid, { text: "❌ Failed to add members. Ensure numbers are valid and registered on WhatsApp." });
  }
};
