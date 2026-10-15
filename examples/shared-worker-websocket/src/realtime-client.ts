import type { RealtimeEvent, WorkerToTab } from './protocol';
export type { RealtimeEvent } from './protocol';

type Listener = (event: RealtimeEvent) => void;

export class SharedRealtimeClient {
  readonly clientId = crypto.randomUUID();
  readonly mode: 'shared' | 'dedicated';
  private readonly channel: MessagePort | Worker;
  private readonly release: () => void;
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly cursors = new Map<string, number>();
  private readonly heartbeatId: number;
  private closed = false;

  // #region transport
  constructor(private readonly onControl: (message: WorkerToTab) => void = () => {}, forceDedicated = false) {
    let shared: SharedWorker | undefined;
    if (!forceDedicated && typeof SharedWorker !== 'undefined') {
      try {
        shared = new SharedWorker(new URL('./realtime.shared-worker.ts', import.meta.url), {
          name: 'realtime-v1', type: 'module',
        });
      } catch { /* Constructor unavailable/blocked: use one dedicated worker per tab. */ }
    }
    if (shared) {
      this.mode = 'shared';
      this.channel = shared.port;
      this.release = () => shared.port.close();
    } else {
      const worker = new Worker(new URL('./realtime.dedicated-worker.ts', import.meta.url), { type: 'module' });
      this.mode = 'dedicated';
      this.channel = worker;
      this.release = () => worker.terminate();
    }
    this.channel.addEventListener('message', this.handleMessage);
    if ('start' in this.channel) this.channel.start();
    this.register();
    this.heartbeatId = window.setInterval(() => this.post({ type: 'HEARTBEAT' }), 30_000);
    window.addEventListener('pagehide', this.onPageHide);
    window.addEventListener('pageshow', this.onPageShow);
  }
  // #endregion transport

  private post(message: Record<string, unknown>) {
    if (!this.closed) this.channel.postMessage({ ...message, clientId: this.clientId });
  }
  private readonly onPageHide = (event: PageTransitionEvent) => { if (!event.persisted) this.close(); };
  private readonly onPageShow = () => this.register();

  private readonly handleMessage = (event: Event) => {
    const message = (event as MessageEvent<WorkerToTab>).data;
    if (this.closed || !message || typeof message.type !== 'string') return;
    if (message.type === 'EVENT') this.deliver(message);
    else if (message.type === 'RESYNC_REQUIRED') {
      this.cursors.delete(message.topic);
      void this.resync(message.topic);
    } else if (message.type === 'REGISTER_REQUIRED') this.register();
    this.onControl(message);
  };

  // #region subscriptions
  subscribe(topic: string, listener: Listener) {
    if (this.closed) throw new Error('Client is closed');
    const listeners = this.listeners.get(topic) ?? new Set<Listener>();
    const first = listeners.size === 0;
    listeners.add(listener);
    this.listeners.set(topic, listeners);
    if (first) {
      this.post({ type: 'SUBSCRIBE', topic });
      // A newly opened tab also needs current state if the shared worker saw it before.
      void this.resync(topic);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(topic);
        this.cursors.delete(topic);
        this.post({ type: 'UNSUBSCRIBE', topic });
      }
    };
  }
  // #endregion subscriptions

  sendCommand(payload: unknown, idempotencyKey: string) {
    const requestId = crypto.randomUUID();
    this.post({ type: 'COMMAND', requestId, idempotencyKey, payload });
    return requestId;
  }

  notifyAuthChanged() {
    this.cursors.clear();
    this.post({ type: 'AUTH_CHANGED' });
  }

  // #region lifecycle
  close() {
    if (this.closed) return;
    this.post({ type: 'DISCONNECT' });
    this.closed = true;
    clearInterval(this.heartbeatId);
    window.removeEventListener('pagehide', this.onPageHide);
    window.removeEventListener('pageshow', this.onPageShow);
    this.channel.removeEventListener('message', this.handleMessage);
    this.release();
    this.listeners.clear();
  }

  private register() {
    this.post({ type: 'REGISTER', protocolVersion: 1 });
    for (const topic of this.listeners.keys()) {
      this.post({ type: 'SUBSCRIBE', topic });
      void this.resync(topic); // Recover a tab that was frozen while other tabs advanced.
    }
  }
  // #endregion lifecycle

  private deliver(event: RealtimeEvent) {
    if (!this.listeners.has(event.topic)) return;
    const previous = this.cursors.get(event.topic) ?? -1;
    if (event.sequence <= previous) return;
    this.cursors.set(event.topic, event.sequence);
    for (const listener of this.listeners.get(event.topic) ?? []) listener(event);
  }

  // #region snapshot
  private async resync(topic: string) {
    try {
      const response = await fetch(`/api/realtime/snapshot?topic=${encodeURIComponent(topic)}`, { credentials: 'include' });
      if (!response.ok) throw new Error(`Snapshot failed: ${response.status}`);
      const snapshot = await response.json();
      if (!this.closed && this.listeners.has(topic) && Number.isSafeInteger(snapshot.sequence)) {
        this.deliver({ type: 'EVENT', topic, eventId: `snapshot-${snapshot.sequence}`, sequence: snapshot.sequence, payload: snapshot.payload, snapshot: true });
      }
    } catch {
      if (!this.closed) this.onControl({ type: 'COMMAND_REJECTED', requestId: 'snapshot', reason: 'snapshot_failed' });
    }
  }
  // #endregion snapshot
}
