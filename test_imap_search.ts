import { ImapFlow } from 'imapflow';
import { PrismaClient } from '@prisma/client';

async function main() {
  const client = new ImapFlow({
    host: 'imap.hostinger.com',
    port: 993,
    secure: true,
    auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' },
    logger: false
  });

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    const searchResult = await client.search({ header: { 'message-id': '<does-not-exist@test.com>' } });
    console.log("Search for non-existent:", searchResult);
    
    const searchResult2 = await client.search({ header: { 'message-id': '<PH0PR08MB110977DC015613B82A481C567A1ED2@PH0PR08MB11097.namprd08.prod.outlook.com>' } });
    console.log("Search for target:", searchResult2);
  } finally {
    lock.release();
  }
  await client.logout();
}
main().catch(console.error);
