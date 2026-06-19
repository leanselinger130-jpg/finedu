// dev-server.js — SOLO DESARROLLO. Sirve public/ y ejecuta la función ai.js localmente.
// Uso: node --env-file=.env dev-server.js   (Node 20.6+/v24 carga .env nativo)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import aiHandler from './netlify/functions/ai.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const PORT = 8000;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const server = http.createServer(async (req, res) => {
  // Función de IA
  if (req.url.startsWith('/.netlify/functions/ai')) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request('http://local/.netlify/functions/ai', {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
    const response = await aiHandler(request);
    res.writeHead(response.status, { 'Content-Type': 'application/json' });
    res.end(await response.text());
    return;
  }
  // Estático
  let path = decodeURIComponent(req.url.split('?')[0]);
  if (path === '/') path = '/index.html';
  const filePath = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ''));
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404');
  }
});

server.listen(PORT, () => {
  const key = process.env.GEMINI_API_KEY;
  console.log(`FINEDU dev en http://localhost:${PORT}/`);
  console.log(key && key !== 'PEGA_TU_CLAVE_ACA' ? '✓ GEMINI_API_KEY cargada (IA real activa)' : '⚠ Sin GEMINI_API_KEY válida — la IA usará respuestas de respaldo (fallback)');
});
