// Opt-in: install/build both labs in temporary directories, then test actual browser behavior.
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const root = fileURLToPath(new URL('../', import.meta.url));
const registry = JSON.parse(await readFile(path.join(root, 'examples/registry.json'), 'utf8'));
const temporary = await mkdtemp(path.join(tmpdir(), 'source-labs-test-'));
const children = [];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
let browser;
async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function ready(url) {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).ok) return; } catch { /* Await the local server. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not start: ${url}`);
}
async function install(id) {
  const snapshot = registry.find((item) => item.id === id).snapshots[0];
  const cwd = path.join(temporary, id);
  for (const entry of snapshot.files) {
    const file = typeof entry === 'string' ? entry : entry.source ?? entry.path;
    await mkdir(path.dirname(path.join(cwd, file)), { recursive: true });
    await cp(path.join(root, snapshot.root, file), path.join(cwd, file));
  }
  execFileSync(npm, ['install', '--no-audit', '--no-fund'], { cwd, stdio: 'inherit' });
  execFileSync(npm, ['run', 'build'], { cwd, stdio: 'inherit' });
  return cwd;
}
function start(cwd, args, env = {}) {
  children.push(spawn(process.execPath, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env } }));
}

try {
  const viteLab = await install('frontend-build-lab');
  const sharedLab = await install('shared-worker-websocket');
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });

  const vitePort = await freePort();
  const viteURL = `http://127.0.0.1:${vitePort}`;
  start(viteLab, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort']);
  await ready(viteURL);
  const manifest = JSON.parse(await readFile(path.join(viteLab, 'dist/.vite/manifest.json'), 'utf8'));
  const admin = manifest['src/admin.ts'];
  assert(admin?.isDynamicEntry, 'Admin must be a dynamic entry in the Vite manifest');
  const assets = await readdir(path.join(viteLab, 'dist/assets'));
  const js = await Promise.all(assets.filter((file) => file.endsWith('.js')).map((file) => readFile(path.join(viteLab, 'dist/assets', file), 'utf8')));
  assert(js.every((code) => !code.includes('UNUSED_MATH_SENTINEL')), 'Unused export must be removed from runtime bundles');
  const viteContext = await browser.newContext();
  const vitePage = await viteContext.newPage();
  const requests = [];
  vitePage.on('request', (request) => requests.push(request.url()));
  await vitePage.goto(viteURL);
  await expect(vitePage.getByText('Kết quả: 5', { exact: true })).toBeVisible();
  assert(!requests.some((url) => url.endsWith(`/${admin.file}`)), 'Admin must not be fetched before interaction');
  await vitePage.getByRole('button', { name: 'Tải admin module', exact: true }).click();
  await expect(vitePage.getByRole('status')).toHaveText('Admin module đã được tải');
  assert(requests.some((url) => url.endsWith(`/${admin.file}`)), 'Click must request the emitted admin chunk');
  const mathFile = path.join(viteLab, 'src/math.ts');
  const validMath = await readFile(mathFile, 'utf8');
  await writeFile(mathFile, validMath.replace('return a + b;', 'return String(a + b);'));
  assert.throws(() => execFileSync(npm, ['run', 'typecheck'], { cwd: viteLab, stdio: 'pipe' }));
  execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { cwd: viteLab, stdio: 'inherit' });
  assert.throws(() => execFileSync(npm, ['run', 'build'], { cwd: viteLab, stdio: 'pipe' }));
  await writeFile(mathFile, validMath);
  await viteContext.close();
  const viteDevPort = await freePort();
  const viteDevURL = `http://127.0.0.1:${viteDevPort}`;
  start(viteLab, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(viteDevPort), '--strictPort']);
  await ready(viteDevURL);
  const devContext = await browser.newContext();
  const devPage = await devContext.newPage();
  await devPage.goto(viteDevURL);
  await devPage.getByRole('button', { name: 'Tải admin module', exact: true }).click();
  await expect(devPage.getByRole('status')).toHaveText('Admin module đã được tải');
  const appFile = path.join(viteLab, 'src/App.tsx');
  await writeFile(appFile, (await readFile(appFile, 'utf8')).replace('Frontend build lab', 'Updated build lab'));
  await expect(devPage.getByRole('heading', { name: 'Updated build lab', exact: true })).toBeVisible();
  await expect(devPage.getByRole('status')).toHaveText('Admin module đã được tải');
  await devContext.close();
  console.log('[source-labs] PASS Vite: manifest, lazy request, tree shaking, typecheck versus transform, dev HMR/state retention.');

  const sharedPort = await freePort();
  const sharedURL = `http://127.0.0.1:${sharedPort}`;
  start(sharedLab, ['server.mjs'], { PORT: String(sharedPort) });
  await ready(sharedURL);
  const metrics = async () => (await fetch(`${sharedURL}/api/demo/metrics`)).json();
  const context = await browser.newContext();
  const errors = [];
  const first = await context.newPage();
  const second = await context.newPage();
  for (const page of [first, second]) page.on('pageerror', (error) => errors.push(error.message));
  await first.goto(sharedURL);
  await second.goto(sharedURL);
  await second.locator('#topic').selectOption('notifications');
  await expect(first.locator('#transport')).toHaveText('shared');
  await expect(second.locator('#status')).toHaveText('open');
  await expect.poll(async () => (await metrics()).activeConnections).toBe(1);
  await expect.poll(async () => (await metrics()).subscriptions[0]).toEqual(['notifications', 'orders']);
  await first.locator('#text').fill('orders-message');
  await first.locator('#send').click();
  await expect(first.locator('#latest')).toContainText('orders-message');
  await expect(second.locator('#latest')).not.toContainText('orders-message');
  await second.locator('#text').fill('notification-message');
  await second.locator('#send').click();
  await expect(second.locator('#latest')).toContainText('notification-message');
  await expect(first.locator('#latest')).not.toContainText('notification-message');
  const third = await context.newPage();
  await third.goto(sharedURL);
  await expect(third.locator('#latest')).toContainText('orders-message'); // Snapshot for a late subscriber.
  await first.locator('#close').click();
  await expect.poll(async () => (await metrics()).subscriptions[0]).toEqual(['notifications', 'orders']);
  const before = (await metrics()).acceptedConnections;
  await fetch(`${sharedURL}/api/demo/disconnect`, { method: 'POST', headers: { Origin: sharedURL } });
  await expect.poll(async () => (await metrics()).acceptedConnections, { timeout: 10_000 }).toBeGreaterThan(before);
  await expect(third.locator('#status')).toHaveText('open');
  await expect.poll(async () => (await metrics()).activeConnections).toBe(1);
  await third.locator('#text').fill('after-reconnect');
  await third.locator('#send').click();
  await expect(third.locator('#latest')).toContainText('after-reconnect');
  await second.locator('#close').click();
  await third.locator('#close').click();
  await expect.poll(async () => (await metrics()).activeConnections).toBe(0);
  await context.close();
  assert.deepEqual(errors, []);

  const fallback = await browser.newContext();
  await fallback.addInitScript(() => Object.defineProperty(window, 'SharedWorker', { value: undefined }));
  const fallbacks = [await fallback.newPage(), await fallback.newPage()];
  for (const page of fallbacks) {
    await page.goto(sharedURL);
    await expect(page.locator('#transport')).toHaveText('dedicated');
    await expect(page.locator('#status')).toHaveText('open');
  }
  await expect.poll(async () => (await metrics()).activeConnections).toBe(2);
  await fallback.close();
  await expect.poll(async () => (await metrics()).activeConnections).toBe(0);

  // Exercise one-time tickets and idempotency through a real WebSocket as well.
  const NodeWebSocket = createRequire(path.join(sharedLab, 'package.json'))('ws');
  const ticket = await (await fetch(`${sharedURL}/api/realtime/ticket`, {
    method: 'POST', headers: { Origin: sharedURL, 'Content-Type': 'application/json' }, body: JSON.stringify({ protocolVersion: 1 }),
  })).json();
  const socketURL = `${ticket.url}?ticket=${encodeURIComponent(ticket.ticket)}`;
  const socket = new NodeWebSocket(socketURL, 'realtime.v1', { origin: sharedURL });
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  const sequence = (await metrics()).states.orders.sequence;
  const command = JSON.stringify({ type: 'command', idempotencyKey: 'same-command', payload: { topic: 'orders', text: 'only-once' } });
  socket.send(command); socket.send(command);
  await expect.poll(async () => (await metrics()).duplicateCommands).toBe(1);
  assert.equal((await metrics()).states.orders.sequence, sequence + 1);
  socket.close();
  await new Promise((resolve) => socket.once('close', resolve));
  const reused = new NodeWebSocket(socketURL, 'realtime.v1', { origin: sharedURL });
  await new Promise((resolve, reject) => {
    reused.once('open', () => { reused.close(); reject(new Error('Used ticket unexpectedly accepted')); });
    reused.once('error', resolve);
  });
  const sharedDevPort = await freePort();
  const sharedDevURL = `http://127.0.0.1:${sharedDevPort}`;
  start(sharedLab, ['server.mjs', '--dev'], { PORT: String(sharedDevPort) });
  await ready(sharedDevURL);
  const sharedDevContext = await browser.newContext();
  const devTabs = [await sharedDevContext.newPage(), await sharedDevContext.newPage()];
  for (const page of devTabs) {
    await page.goto(sharedDevURL);
    await expect(page.locator('#status')).toHaveText('open');
  }
  const devMetrics = await (await fetch(`${sharedDevURL}/api/demo/metrics`)).json();
  assert.equal(devMetrics.activeConnections, 1, 'Dev HMR must not interfere with the shared business socket');
  await sharedDevContext.close();
  console.log('[source-labs] PASS SharedWorker: one socket/multiple tabs, topic routing, late snapshot, union subscriptions, reconnect, cleanup, per-tab fallback, idempotency, single-use tickets and dev middleware.');
} finally {
  await browser?.close();
  await Promise.all(children.map((child) => child.exitCode !== null ? undefined : new Promise((resolve) => { child.once('exit', resolve); child.kill('SIGTERM'); })));
  await rm(temporary, { recursive: true, force: true });
}
