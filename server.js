const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { loadEnvConfig } = require('@next/env');

// Cargar .env manualmente (Requerido para server.js personalizado en Hostinger)
loadEnvConfig(process.cwd());

// Aumentar el límite de listeners para evitar advertencias de MaxListenersExceededWarning en Node/Next.js (especialmente con [Gzip])
require('events').EventEmitter.defaultMaxListeners = 25;

// Configuramos entorno
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
// Hostinger (Passenger) pasará un puerto específico a través de process.env.PORT
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}).catch((ex) => {
  console.error(ex.stack);
  process.exit(1);
});
