require('dotenv').config();
const { ImapFlow } = require('imapflow');

async function main() {
  const imapUser = process.env.SMTP_USER;
  const imapPass = process.env.SMTP_PASS;
  const imapHost = process.env.SMTP_HOST.replace('smtp', 'imap');
  
  console.log('Connecting with', imapUser, 'to', imapHost);
  
  const client = new ImapFlow({
    host: imapHost,
    port: 993,
    secure: true,
    auth: { user: imapUser, pass: imapPass },
    logger: false,
    connectionTimeout: 8000,
  });

  try {
    await client.connect();
    console.log('Connected!');
    const lock = await client.getMailboxLock('INBOX');
    console.log('Mailbox exists:', client.mailbox.exists);
    const messages = client.fetch('1:*', { uid: true, envelope: true });
    let count = 0;
    for await (const msg of messages) {
      count++;
    }
    console.log('Fetched messages:', count);
    lock.release();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.logout();
  }
}
main();
