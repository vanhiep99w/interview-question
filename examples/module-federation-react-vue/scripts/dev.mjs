import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mode = process.argv.includes('--preview') ? 'preview' : 'dev';
const grouped = process.platform !== 'win32';
const children = [];
let stopping = false;
function signal(child, value) {
  try { grouped ? process.kill(-child.pid, value) : child.kill(value); }
  catch { /* The child has already stopped. */ }
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  children.forEach((child) => signal(child, 'SIGTERM'));
  setTimeout(() => children.forEach((child) => signal(child, 'SIGKILL')), 3000).unref();
}
for (const app of ['shell', 'vue-sub']) {
  const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--prefix', app, 'run', mode], {
    cwd: root, stdio: 'inherit', detached: grouped,
  });
  children.push(child);
  child.on('error', (error) => { console.error(error); stop(1); });
  child.on('exit', (code) => stop(code ?? 1));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
