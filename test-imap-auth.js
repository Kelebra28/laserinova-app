const { PrismaClient } = require('@prisma/client');
const { ImapFlow } = require('imapflow');
const { decrypt } = require('./src/lib/encryption.ts'); // Can't require TS directly like this. 

