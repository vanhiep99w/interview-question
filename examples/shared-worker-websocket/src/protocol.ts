export type RealtimeEvent = {
  type: 'EVENT';
  topic: string;
  eventId: string;
  sequence: number;
  payload: unknown;
  snapshot?: boolean;
};

export type WorkerToTab =
  | RealtimeEvent
  | { type: 'STATUS'; state: 'connecting' | 'open' | 'closed' }
  | { type: 'RESYNC_REQUIRED'; topic: string }
  | { type: 'COMMAND_REJECTED'; requestId: string; reason: string }
  | { type: 'AUTH_REQUIRED' | 'PROTOCOL_ERROR' | 'REGISTER_REQUIRED' };
