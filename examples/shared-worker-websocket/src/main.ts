import { SharedRealtimeClient, type RealtimeEvent } from './realtime-client';
import './styles.css';

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
const status = element('#status');
const latest = element('#latest');
const log = element('#log');
const topic = element<HTMLSelectElement>('#topic');
const text = element<HTMLInputElement>('#text');
const send = element<HTMLButtonElement>('#send');
const lines: string[] = [];
function append(message: string) {
  lines.push(message);
  log.textContent = lines.slice(-20).join('\n');
}

// One client for the page lifetime, not one client per render/event handler.
const client = new SharedRealtimeClient((message) => {
  if (message.type === 'STATUS') status.textContent = message.state;
  if (message.type === 'COMMAND_REJECTED') append(`Rejected: ${message.reason}`);
  if (message.type === 'AUTH_REQUIRED') append('Demo session unavailable');
}, new URLSearchParams(location.search).get('mode') === 'dedicated');
element('#transport').textContent = client.mode;

function render(event: RealtimeEvent) {
  if (event.sequence === 0) { latest.textContent = 'No events yet'; return; }
  const value = typeof event.payload === 'object' && event.payload !== null && 'text' in event.payload
    ? String(event.payload.text) : JSON.stringify(event.payload);
  latest.textContent = `${event.topic} #${event.sequence}: ${value}`;
  append(`${event.snapshot ? 'Snapshot' : 'Event'} ${event.topic} #${event.sequence}: ${value}`);
}
let unsubscribe = client.subscribe(topic.value, render);
topic.addEventListener('change', () => {
  unsubscribe();
  latest.textContent = 'No events yet';
  unsubscribe = client.subscribe(topic.value, render);
});
send.addEventListener('click', () => client.sendCommand({ topic: topic.value, text: text.value }, crypto.randomUUID()));
element('#close').addEventListener('click', () => {
  unsubscribe();
  client.close();
  status.textContent = 'closed';
  send.disabled = true;
  topic.disabled = true;
});
