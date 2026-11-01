'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/data.js': ['data.js', 'text/javascript; charset=utf-8'],
  '/narrative.js': ['narrative.js', 'text/javascript; charset=utf-8'],
  '/systems.js': ['systems.js', 'text/javascript; charset=utf-8'],
  '/engine.js': ['engine.js', 'text/javascript; charset=utf-8'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml']
};
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const server = http.createServer((request, response) => {
  const entry = files[new URL(request.url, 'http://localhost').pathname];
  if (!entry || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
    response.end('No encontrado.');
    return;
  }
  fs.readFile(path.join(__dirname, entry[0]), (error, body) => {
    if (error) { response.writeHead(500); response.end('No se pudo abrir el archivo.'); return; }
    response.writeHead(200, {'Content-Type': entry[1], 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff'});
    response.end(request.method === 'HEAD' ? undefined : body);
  });
});
server.listen(port, host, () => console.log(`Vínculos disponible en el puerto ${port}.`));
server.on('error', error => { console.error(`No se pudo iniciar Vínculos: ${error.message}`); process.exitCode = 1; });
