// Local production-output preview, not a hardened production server.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = process.argv[2];
if (!['shell', 'vue-sub'].includes(app)) throw new Error('Usage: node scripts/preview.mjs shell|vue-sub');
const root = path.resolve(fileURLToPath(new URL(`../${app}/dist/`, import.meta.url)));
const port = Number(process.env.PORT || (app === 'shell' ? 4173 : 4174));
const shellOrigins = [
  'http://127.0.0.1:5173', 'http://localhost:5173',
  'http://127.0.0.1:4173', 'http://localhost:4173',
  process.env.SHELL_ORIGIN,
].filter(Boolean);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.map': 'application/json', '.css': 'text/css', '.txt': 'text/plain' };

createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (app === 'vue-sub') {
    response.setHeader('Vary', 'Origin');
    if (shellOrigins.includes(request.headers.origin)) response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
  }
  try {
    const url = new URL(request.url, 'http://localhost');
    let filename = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (filename !== root && !filename.startsWith(`${root}${path.sep}`)) throw new Error('Invalid path');
    try {
      if ((await stat(filename)).isDirectory()) filename = path.join(filename, 'index.html');
    } catch {
      // Only HTML navigation to extensionless routes gets the SPA entry.
      if (!path.extname(url.pathname) && request.headers.accept?.includes('text/html')) filename = path.join(root, 'index.html');
      else throw new Error('Asset not found');
    }
    const data = await readFile(filename);
    response.writeHead(200, { 'Content-Type': types[path.extname(filename)] ?? 'application/octet-stream' });
    response.end(data);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`PREVIEW_READY ${app} http://127.0.0.1:${port}/`));
