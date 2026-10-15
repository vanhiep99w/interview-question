// LOCAL LAB ONLY: fixed demo identity, one-time tickets and in-memory state.
// Replace this with real session authentication, topic authorization and durable replay in production.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 5175);
const development = process.argv.includes('--dev');
const allowedTopics = new Set(['orders', 'notifications']);
const states = new Map([...allowedTopics].map((topic) => [topic, { sequence: 0, payload: { text: '' } }]));
const history = new Map([...allowedTopics].map((topic) => [topic, []]));
const tickets = new Map();
const processedCommands = new Map();
const subscriptions = new Map();
let acceptedConnections = 0;
let duplicateCommands = 0;
let vite;

function allowedOrigin(value) {
  const actualPort = server.address()?.port;
  return value === `http://127.0.0.1:${actualPort}` || value === `http://localhost:${actualPort}`;
}
function reply(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}
async function body(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 65_536) throw new Error('Request too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}
function send(socket, value) {
  if (socket.readyState !== WebSocket.OPEN) return;
  if (socket.bufferedAmount > 1_000_000) { socket.close(1013, 'slow consumer'); return; }
  socket.send(JSON.stringify(value));
}

// #region ticket-api
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      if (request.method === 'POST' && !allowedOrigin(request.headers.origin)) return reply(response, 403, { error: 'Origin rejected' });
      if (url.pathname === '/api/realtime/ticket' && request.method === 'POST') {
        const command = await body(request);
        if (command.protocolVersion !== 1) return reply(response, 400, { error: 'Unknown protocol' });
        // No real login in this demo: every permitted browser request is demo-user.
        const ticket = randomUUID();
        tickets.set(ticket, { identity: 'demo-user', expiresAt: Date.now() + 30_000 });
        const origin = request.headers.origin;
        return reply(response, 200, { url: `${origin.replace('http:', 'ws:')}/realtime`, ticket });
      }
      if (url.pathname === '/api/realtime/snapshot' && request.method === 'GET') {
        const topic = url.searchParams.get('topic');
        if (!allowedTopics.has(topic)) return reply(response, 403, { error: 'Topic rejected' });
        return reply(response, 200, { topic, ...states.get(topic) });
      }
      if (url.pathname === '/api/demo/metrics' && request.method === 'GET') {
        return reply(response, 200, {
          activeConnections: subscriptions.size,
          acceptedConnections,
          duplicateCommands,
          subscriptions: [...subscriptions.values()].map((topics) => [...topics].sort()),
          states: Object.fromEntries(states),
        });
      }
      if (url.pathname === '/api/demo/disconnect' && request.method === 'POST') {
        const count = subscriptions.size;
        for (const socket of subscriptions.keys()) socket.terminate();
        return reply(response, 200, { disconnected: count });
      }
      return reply(response, 404, { error: 'API route not found' });
    }
    if (vite) return vite.middlewares(request, response);
    const dist = path.join(root, 'dist');
    let filename = path.resolve(dist, `.${decodeURIComponent(url.pathname)}`);
    if (filename !== dist && !filename.startsWith(`${dist}${path.sep}`)) throw new Error('Invalid path');
    if ((await stat(filename)).isDirectory()) filename = path.join(filename, 'index.html');
    const data = await readFile(filename);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
    response.writeHead(200, { 'Content-Type': types[path.extname(filename)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(data);
  } catch {
    if (!response.headersSent) reply(response, 400, { error: 'Invalid request or missing file' });
    else response.end();
  }
});
// #endregion ticket-api

const realtime = new WebSocketServer({ noServer: true, maxPayload: 65_536 });
// #region handshake
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname !== '/realtime') {
    if (!development) socket.destroy();
    return; // Let the Vite HMR upgrade handler handle its own endpoint in dev.
  }
  const ticket = url.searchParams.get('ticket');
  const entry = tickets.get(ticket);
  if (!allowedOrigin(request.headers.origin) || !entry || entry.expiresAt < Date.now()
      || !request.headers['sec-websocket-protocol']?.split(',').map((value) => value.trim()).includes('realtime.v1')) {
    socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
    return;
  }
  tickets.delete(ticket); // Single use, scoped to a demo identity.
  realtime.handleUpgrade(request, socket, head, (connection) => realtime.emit('connection', connection, entry.identity));
});
// #endregion handshake

// #region replay-and-commands
realtime.on('connection', (socket, identity) => {
  acceptedConnections++;
  subscriptions.set(socket, new Set());
  socket.on('close', () => subscriptions.delete(socket));
  socket.on('error', () => socket.close());
  socket.on('message', (raw) => {
    let message;
    try { message = JSON.parse(raw.toString()); }
    catch { socket.close(1008, 'Invalid JSON'); return; }
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      socket.close(1008, 'Invalid message'); return;
    }
    if (message.type === 'sync_subscriptions') {
      if (!Array.isArray(message.topics) || message.topics.length > 20 || message.topics.some((topic) => !allowedTopics.has(topic))) {
        socket.close(1008, 'Topic rejected'); return;
      }
      subscriptions.set(socket, new Set(message.topics));
      for (const topic of message.topics) {
        const cursor = message.resumeFrom?.[topic] ?? 0;
        const state = states.get(topic);
        const events = history.get(topic);
        const oldest = events[0]?.sequence ?? state.sequence + 1;
        if (!Number.isSafeInteger(cursor) || cursor < 0 || cursor > state.sequence || cursor < oldest - 1) {
          send(socket, { type: 'resync_required', topic });
        } else {
          for (const event of events) if (event.sequence > cursor) send(socket, event);
        }
      }
    } else if (message.type === 'command') {
      const { topic, text } = message.payload ?? {};
      if (!allowedTopics.has(topic) || typeof text !== 'string' || text.length > 1000
          || typeof message.idempotencyKey !== 'string' || message.idempotencyKey.length > 200) {
        socket.close(1008, 'Command rejected'); return;
      }
      const key = `${identity}:${message.idempotencyKey}`;
      if (processedCommands.has(key)) { duplicateCommands++; return; }
      processedCommands.set(key, true);
      // Bounded demo storage, not a durable production idempotency contract.
      if (processedCommands.size > 1000) processedCommands.delete(processedCommands.keys().next().value);
      const state = states.get(topic);
      state.sequence++;
      state.payload = { text };
      const event = { type: 'event', topic, eventId: randomUUID(), sequence: state.sequence, payload: state.payload };
      const events = history.get(topic);
      events.push(event);
      if (events.length > 64) events.shift();
      for (const [client, topics] of subscriptions) if (topics.has(topic)) send(client, event);
    }
  });
});
// #endregion replay-and-commands

const expiry = setInterval(() => {
  for (const [ticket, value] of tickets) if (value.expiresAt < Date.now()) tickets.delete(ticket);
}, 30_000);
expiry.unref();
if (development) {
  const { createServer: createViteServer } = await import('vite');
  vite = await createViteServer({ root, server: { middlewareMode: true, hmr: { server } }, appType: 'spa' });
}
server.listen(port, '127.0.0.1', () => console.log(`SHARED_WORKER_LAB http://127.0.0.1:${server.address().port}/ — local demo only`));
