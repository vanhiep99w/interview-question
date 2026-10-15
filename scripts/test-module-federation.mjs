// Opt-in integration test: installs and builds both sample apps in a temporary directory.
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const root = fileURLToPath(new URL('../', import.meta.url));
const registry = JSON.parse(await readFile(path.join(root, 'examples/registry.json'), 'utf8'));
const snapshot = registry.find((item) => item.id === 'module-federation-react-vue').snapshots[0];
const temporary = await mkdtemp(path.join(tmpdir(), 'federation-example-test-'));
const children = [];
const reservations = [];
let browser;

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  reservations.push(server);
  return server.address().port;
}
async function ready(url) {
  for (let attempt = 0; attempt < 80; attempt++) {
    try { if ((await fetch(url)).ok) return; } catch { /* Wait for the preview process. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Preview did not start: ${url}`);
}

try {
  for (const entry of snapshot.files) {
    const file = typeof entry === 'string' ? entry : entry.source ?? entry.path;
    const destination = path.join(temporary, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(root, snapshot.root, file), destination);
  }
  const shellPort = await reservePort();
  const remotePort = await reservePort();
  const shellURL = `http://127.0.0.1:${shellPort}`;
  const remoteURL = `http://127.0.0.1:${remotePort}`;
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  for (const app of ['shell', 'vue-sub']) {
    const cwd = path.join(temporary, app);
    execFileSync(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd, stdio: 'inherit' });
    execFileSync(npm, ['run', 'build'], { cwd, stdio: 'inherit', env: { ...process.env, VUE_SUB_URL: `${remoteURL}/remoteEntry.js` } });
  }
  await Promise.all(reservations.map((server) => new Promise((resolve) => server.close(resolve))));
  reservations.length = 0;
  for (const [app, port] of [['shell', shellPort], ['vue-sub', remotePort]]) {
    children.push(spawn(process.execPath, ['scripts/preview.mjs', app], {
      cwd: temporary, stdio: 'inherit',
      env: { ...process.env, PORT: String(port), SHELL_ORIGIN: shellURL },
    }));
  }
  await Promise.all([ready(`${shellURL}/`), ready(`${remoteURL}/`)]);
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests = [];
  const errors = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(shellURL);
  await expect(page.getByRole('heading', { name: 'Shell home', exact: true })).toBeVisible();
  assert(!requests.some((url) => url.includes('remoteEntry.js')), 'Home must not load Vue');
  await page.getByRole('link', { name: 'Catalog', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vue catalog remote', exact: true })).toBeVisible();
  assert(requests.some((url) => url === `${remoteURL}/remoteEntry.js`), 'Shell must load the remote container');
  await page.getByRole('button', { name: 'Remote count: 0', exact: true }).click();
  await page.getByRole('link', { name: 'Product 42', exact: true }).click();
  await expect(page).toHaveURL(`${shellURL}/catalog/products/42?color=blue#details`);
  await expect(page.getByTestId('remote-location')).toHaveText('/catalog/products/42?color=blue#details');
  await expect(page.getByRole('button', { name: 'Remote count: 1', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('remote-location')).toHaveText('/catalog');
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Product 42', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('remote-location')).toHaveText('/catalog/products/42?color=blue#details');
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vue catalog remote', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Catalog', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remote count: 0', exact: true })).toBeVisible();

  await page.goto(remoteURL);
  await expect(page).toHaveURL(`${remoteURL}/catalog`);
  await page.getByRole('link', { name: 'Product 42', exact: true }).click();
  await expect(page).toHaveURL(`${remoteURL}/catalog/products/42?color=blue#details`);
  await expect(page.getByRole('heading', { name: 'Product 42', exact: true })).toBeVisible();
  assert.deepEqual(errors, [], 'Sample apps must not throw uncaught browser errors');

  const failed = await context.newPage();
  await failed.route('**/remoteEntry.js', (route) => route.abort());
  await failed.goto(`${shellURL}/catalog`);
  await expect(failed.getByRole('alert')).toContainText('Catalog is unavailable');
  await failed.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(failed.getByRole('heading', { name: 'Shell home', exact: true })).toBeVisible();
  const missingAsset = await fetch(`${shellURL}/missing.js`, { headers: { Accept: 'text/html' } });
  assert.equal(missingAsset.status, 404, 'SPA fallback must not return HTML for missing JavaScript');
  console.log('[federation-example] PASS: independent builds, lazy remote, mount/unmount, navigation/query/hash, Back/Forward, deep refresh, standalone and unavailable remote.');
} finally {
  await browser?.close();
  await Promise.all(reservations.map((server) => new Promise((resolve) => server.close(resolve))));
  await Promise.all(children.map((child) => {
    if (child.exitCode !== null) return;
    return new Promise((resolve) => { child.once('exit', resolve); child.kill('SIGTERM'); });
  }));
  await rm(temporary, { recursive: true, force: true });
}
