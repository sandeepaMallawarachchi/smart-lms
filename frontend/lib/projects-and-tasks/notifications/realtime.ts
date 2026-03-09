import IORedis from 'ioredis';

export type NotificationRealtimeEvent =
  | {
      type: 'notification_created';
      studentId: string;
      notification: {
        _id: string;
        title: string;
        message: string;
        description: string;
        type: string;
        isRead: boolean;
        sentAt?: string;
      };
      at: string;
    }
  | {
      type: 'notification_read';
      studentId: string;
      notificationId: string;
      at: string;
    };

type Listener = (event: NotificationRealtimeEvent) => void;

const REALTIME_CHANNEL = 'projects-tasks-notifications:events';

type RealtimeState = {
  listeners: Map<string, Set<Listener>>;
  sub?: IORedis;
  pub?: IORedis;
  subReady: boolean;
};

declare global {
  var __ptNotificationsRealtime: RealtimeState | undefined;
}

function getState(): RealtimeState {
  if (!global.__ptNotificationsRealtime) {
    global.__ptNotificationsRealtime = {
      listeners: new Map(),
      subReady: false,
    };
  }
  return global.__ptNotificationsRealtime;
}

function getRedisUrl() {
  return process.env.REDIS_URL || 'redis://127.0.0.1:6379';
}

function dispatchLocal(event: NotificationRealtimeEvent) {
  const state = getState();
  const listeners = state.listeners.get(event.studentId);
  if (!listeners || listeners.size === 0) return;

  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // Ignore listener errors; stream cleanup handles dead subscribers.
    }
  });
}

function ensureSubscriber() {
  const state = getState();
  if (state.subReady) return;

  try {
    state.sub = new IORedis(getRedisUrl(), {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    state.sub.on('error', () => {
      // Keep local dispatch working even if Redis is unavailable.
    });
    state.sub.on('message', (channel, raw) => {
      if (channel !== REALTIME_CHANNEL) return;
      try {
        const payload = JSON.parse(raw) as NotificationRealtimeEvent;
        dispatchLocal(payload);
      } catch {
        // Ignore invalid payloads.
      }
    });
    state.sub.connect().then(() => state.sub?.subscribe(REALTIME_CHANNEL)).catch(() => {
      // Redis subscription is optional for local-dev fallback.
    });
    state.subReady = true;
  } catch {
    // If redis setup fails, local same-process dispatch still works.
  }
}

function ensurePublisher() {
  const state = getState();
  if (state.pub) return state.pub;

  try {
    state.pub = new IORedis(getRedisUrl(), {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    state.pub.on('error', () => {
      // Ignore and keep local dispatch.
    });
    state.pub.connect().catch(() => {
      // Best effort publisher.
    });
    return state.pub;
  } catch {
    return undefined;
  }
}

export function subscribeStudentNotifications(studentId: string, listener: Listener): () => void {
  const state = getState();
  ensureSubscriber();

  const existing = state.listeners.get(studentId) || new Set<Listener>();
  existing.add(listener);
  state.listeners.set(studentId, existing);

  return () => {
    const current = state.listeners.get(studentId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      state.listeners.delete(studentId);
    }
  };
}

export async function publishNotificationEvent(event: NotificationRealtimeEvent) {
  dispatchLocal(event);

  const pub = ensurePublisher();
  if (!pub) return;

  try {
    await pub.publish(REALTIME_CHANNEL, JSON.stringify(event));
  } catch {
    // Best effort publish; local dispatch already happened.
  }
}

type RealtimeDocShape = {
  _id?: unknown;
  title?: unknown;
  message?: unknown;
  description?: unknown;
  type?: unknown;
  isRead?: unknown;
  sentAt?: unknown;
  toObject?: () => RealtimeDocShape;
};

export function toRealtimeNotificationDoc(input: unknown) {
  const source = (input || {}) as RealtimeDocShape;
  const doc = typeof source.toObject === 'function' ? source.toObject() : source;
  return {
    _id: String(doc?._id || ''),
    title: String(doc?.title || ''),
    message: String(doc?.message || ''),
    description: String(doc?.description || ''),
    type: String(doc?.type || ''),
    isRead: Boolean(doc?.isRead),
    sentAt: doc?.sentAt ? new Date(doc.sentAt).toISOString() : undefined,
  };
}
