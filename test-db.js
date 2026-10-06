const mariadb = require('mariadb');
require('dotenv').config();

async function test() {
  console.log("Connecting to:", process.env.DATABASE_URL);
  const url = new URL(process.env.DATABASE_URL);
  const password = decodeURIComponent(url.password).replace(/\\/g, '');
  
  try {
    const conn = await mariadb.createConnection({
      host: url.hostname,
      port: url.port ? parseInt(url.port) : 3306,
      user: url.username,
      password: password,
      database: url.pathname.substring(1),
      connectTimeout: 5000
    });
    console.log("SUCCESS! Connected to DB.");
    await conn.end();
  } catch (err) {
    console.error("FAILED to connect:", err.message);
  }
}
test();
