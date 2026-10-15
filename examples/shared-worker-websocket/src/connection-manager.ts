// One module instance per worker: shared across tabs only in the SharedWorker entry.
type ClientState = {
  port: MessagePort;
  topics: Set<string>;
  lastSeenAt: number;
};

const clients = new Map<string, ClientState>();
const lastSequence = new Map<string, number>();

const CLIENT_LEASE_MS = 5 * 60_000;
const MAX_BUFFERED_BYTES = 1_000_000;

let socket: WebSocket | null = null;
let connectPromise: Promise<void> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let authGeneration = 0;

// #region clients
export function connectPort(port: MessagePort) {
  let boundClientId: string | null = null;

  port.addEventListener("message", (messageEvent) => {
    const message = messageEvent.data;

    if (message?.type === "REGISTER") {
      if (message.protocolVersion !== 1 || typeof message.clientId !== "string") {
        port.postMessage({ type: "PROTOCOL_ERROR" });
        return;
      }

      if ((boundClientId && boundClientId !== message.clientId) || (clients.has(message.clientId) && clients.get(message.clientId)?.port !== port)) {
        port.postMessage({ type: "PROTOCOL_ERROR" });
        return;
      }
      const clientId: string = message.clientId;
      boundClientId = clientId;
      clients.set(clientId, {
        port,
        topics: clients.get(clientId)?.topics ?? new Set(),
        lastSeenAt: Date.now(),
      });

      postStatus(port);
      void ensureSocket();
      return;
    }

    if (!boundClientId || message?.clientId !== boundClientId) {
      port.postMessage({ type: "PROTOCOL_ERROR" });
      return;
    }

    const client = clients.get(boundClientId);
    if (!client) { port.postMessage({ type: "REGISTER_REQUIRED" }); return; }
    client.lastSeenAt = Date.now();

    switch (message.type) {
      case "HEARTBEAT":
        break;

      case "SUBSCRIBE":
        if (isAllowedTopic(message.topic)) {
          client.topics.add(message.topic);
          syncSubscriptions();
        }
        break;

      case "UNSUBSCRIBE":
        client.topics.delete(message.topic);
        syncSubscriptions();
        break;

      case "COMMAND":
        forwardCommand(client, message);
        break;

      case "AUTH_CHANGED":
        // Cookie/session đã đổi: hủy ticket/socket thuộc identity cũ.
        resetAuthentication();
        break;

      case "DISCONNECT":
        removeClient(boundClientId);
        boundClientId = null;
        break;
    }
  });

  port.start();
}
// #endregion clients

// #region connect
async function ensureSocket() {
  if (clients.size === 0) return;
  if (socket?.readyState === WebSocket.OPEN) return;
  if (socket?.readyState === WebSocket.CONNECTING) return;
  if (connectPromise) return connectPromise;

  connectPromise = openSocket().catch(() => scheduleReconnect()).finally(() => {
    connectPromise = null;
  });

  return connectPromise;
}

async function openSocket() {
  broadcast({ type: "STATUS", state: "connecting" });
  const openingForGeneration = authGeneration;

  let ticketResponse: Response;
  try {
    ticketResponse = await fetch("/api/realtime/ticket", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ protocolVersion: 1 }),
    });
  } catch {
    if (openingForGeneration === authGeneration) scheduleReconnect();
    return;
  }

  // Bỏ toàn bộ response/ticket thuộc auth generation cũ.
  if (openingForGeneration !== authGeneration) return;

  if (ticketResponse.status === 401) {
    broadcast({ type: "AUTH_REQUIRED" });
    return;
  }

  if (!ticketResponse.ok || clients.size === 0) {
    scheduleReconnect();
    return;
  }

  const { url, ticket } = await ticketResponse.json();
  if (openingForGeneration !== authGeneration) return;
  const current = new WebSocket(
    `${url}?ticket=${encodeURIComponent(ticket)}`,
    ["realtime.v1"],
  );
  socket = current;

  current.addEventListener("open", () => {
    if (socket !== current) return;
    reconnectAttempt = 0;
    broadcast({ type: "STATUS", state: "open" });
    syncSubscriptions();
  });

  current.addEventListener("message", (event) => {
    if (socket !== current) return;
    handleServerMessage(event.data);
  });

  current.addEventListener("close", (event) => {
    if (socket !== current) return;
    socket = null;
    broadcast({
      type: "STATUS",
      state: "closed",
      code: event.code,
    });

    if (clients.size === 0 || event.code === 1000) return;

    // Ví dụ: server dùng private close code 4401 cho session hết hạn.
    if (event.code === 4401) {
      broadcast({ type: "AUTH_REQUIRED" });
      return;
    }

    scheduleReconnect();
  });
}
// #endregion connect

// #region auth
function resetAuthentication() {
  authGeneration += 1;
  reconnectAttempt = 0;
  lastSequence.clear();

  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;

  const previous = socket;
  socket = null;
  previous?.close(4000, "auth changed");
  broadcast({ type: "STATUS", state: "closed" });

  // Nếu ticket cũ đang được fetch, chờ attempt đó kết thúc rồi mới mở lại.
  // Logout sẽ nhận 401; login/switch account sẽ lấy ticket identity mới.
  const pendingAttempt = connectPromise;
  void (pendingAttempt ?? Promise.resolve()).finally(() => ensureSocket());
}
// #endregion auth

// #region reconnect
function scheduleReconnect() {
  if (reconnectTimer || clients.size === 0) return;

  const capMs = 30_000;
  const exponentialMs = Math.min(1_000 * 2 ** reconnectAttempt, capMs);
  const delayMs = Math.floor(exponentialMs * (0.5 + Math.random()));
  reconnectAttempt += 1;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void ensureSocket();
  }, delayMs);
}
// #endregion reconnect

// #region subscriptions
function syncSubscriptions() {
  if (socket?.readyState !== WebSocket.OPEN) return;

  const topics = new Set<string>();
  for (const client of clients.values()) {
    for (const topic of client.topics) topics.add(topic);
  }

  sendToServer({
    type: "sync_subscriptions",
    topics: [...topics],
    resumeFrom: Object.fromEntries(lastSequence),
  });
}
// #endregion subscriptions

// #region events
function handleServerMessage(raw: string | ArrayBuffer | Blob) {
  if (typeof raw !== "string" || raw.length > 65_536) return;

  let message: any;
  try {
    message = JSON.parse(raw);
  } catch {
    return;
  }

  if (!message || typeof message !== 'object' || Array.isArray(message)) return;

  if (message.type === "event" && isAllowedTopic(message.topic) && Number.isSafeInteger(message.sequence) && message.sequence > 0 && typeof message.eventId === "string") {
    const previous = lastSequence.get(message.topic) ?? 0;

    if (message.sequence > previous + 1) {
      broadcastToTopic(message.topic, {
        type: "RESYNC_REQUIRED",
        topic: message.topic,
      });
    }

    // Bỏ event cũ/trùng. Server vẫn phải hỗ trợ idempotency theo eventId.
    if (message.sequence <= previous) return;

    lastSequence.set(message.topic, message.sequence);
    broadcastToTopic(message.topic, {
      type: "EVENT",
      topic: message.topic,
      eventId: message.eventId,
      sequence: message.sequence,
      payload: message.payload,
    });
  }

  if (message.type === "resync_required" && isAllowedTopic(message.topic)) {
    lastSequence.delete(message.topic);
    broadcastToTopic(message.topic, { type: "RESYNC_REQUIRED", topic: message.topic });
  }
}
// #endregion events

// #region commands
function forwardCommand(client: ClientState, message: any) {
  if (socket?.readyState !== WebSocket.OPEN) {
    client.port.postMessage({
      type: "COMMAND_REJECTED",
      requestId: message.requestId,
      reason: "socket_not_open",
    });
    return;
  }

  if (socket.bufferedAmount > MAX_BUFFERED_BYTES) {
    client.port.postMessage({
      type: "COMMAND_REJECTED",
      requestId: message.requestId,
      reason: "backpressure",
    });
    return;
  }

  sendToServer({
    type: "command",
    requestId: message.requestId,
    idempotencyKey: message.idempotencyKey,
    payload: message.payload,
  });
}
// #endregion commands

function sendToServer(message: unknown) {
  if (socket?.readyState !== WebSocket.OPEN) return false;
  if (socket.bufferedAmount > MAX_BUFFERED_BYTES) return false;
  socket.send(JSON.stringify(message));
  return true;
}

function broadcastToTopic(topic: string, message: unknown) {
  for (const client of clients.values()) {
    if (client.topics.has(topic)) client.port.postMessage(message);
  }
}

function broadcast(message: unknown) {
  for (const client of clients.values()) {
    client.port.postMessage(message);
  }
}

function postStatus(port: MessagePort) {
  const state =
    socket?.readyState === WebSocket.OPEN
      ? "open"
      : socket?.readyState === WebSocket.CONNECTING
        ? "connecting"
        : "closed";
  port.postMessage({ type: "STATUS", state });
}

function removeClient(clientId: string) {
  clients.delete(clientId);
  syncSubscriptions();

  if (clients.size === 0) {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    socket?.close(1000, "no clients");
  }
}

function isAllowedTopic(topic: unknown): topic is string {
  return typeof topic === "string" && /^[a-z0-9:_-]{1,100}$/i.test(topic);
}

setInterval(() => {
  const expiredBefore = Date.now() - CLIENT_LEASE_MS;
  for (const [clientId, client] of clients) {
    if (client.lastSeenAt < expiredBefore) removeClient(clientId);
  }
}, 60_000);
