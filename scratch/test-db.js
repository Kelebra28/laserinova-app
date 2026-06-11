const net = require('net');

const HOST = 'srv1212.hstgr.io';
const PORT = 3306;

console.log(`Intentando conectar a ${HOST}:${PORT}...`);

const socket = new net.Socket();
socket.setTimeout(5000);

socket.on('connect', () => {
  console.log('¡Éxito! El puerto 3306 está abierto y respondiendo.');
  socket.destroy();
});

socket.on('timeout', () => {
  console.log('Error: Conexión expiró (Timeout). El puerto 3306 no responde.');
  socket.destroy();
});

socket.on('error', (err) => {
  console.log('Error de conexión:', err.message);
  socket.destroy();
});
