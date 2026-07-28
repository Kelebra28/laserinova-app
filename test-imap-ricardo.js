const { ImapFlow } = require('imapflow');

async function main() {
  const imapUser = 'ricardob@laserinova.com';
  const imapPass = 'Ricardomma28$$$';
  const imapHost = 'imap.hostinger.com';
  
  console.log('Connecting with', imapUser);
  
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
    
    // Check INBOX
    const lock = await client.getMailboxLock('INBOX');
    console.log('INBOX exists:', client.mailbox.exists);
    if (client.mailbox.exists > 0) {
        const messages = client.fetch('1:*', { uid: true, envelope: true });
        let count = 0;
        for await (const msg of messages) {
          count++;
        }
        console.log('Fetched messages from INBOX:', count);
    }
    lock.release();
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.logout();
  }
}
main();
