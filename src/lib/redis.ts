import Redis from 'ioredis';
import { logger } from './telemetry/logger';

let client: Redis | null | undefined;

/** Lazily-created Redis client with aggressive timeouts; returns null when REDIS_URL is not configured. */
export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.REDIS_URL;
  if (!url) return (client = null);
  client = new Redis(url, {
    lazyConnect: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 500,
    commandTimeout: 500,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });
  client.on('error', (e) => logger.warn({ err: e.message }, 'redis error'));
  return client;
}

export const redisConfigured = () => Boolean(process.env.REDIS_URL);

/**
 * Returns a client only if it is (or is about to become) usable. During the initial handshake we wait briefly;
 * while the server is down (reconnecting/closed) we return null immediately so callers degrade without added latency.
 */
export async function getReadyRedis(timeoutMs = 300): Promise<Redis | null> {
  const r = getRedis();
  if (!r) return null;
  if (r.status === 'ready') return r;
  if (r.status !== 'wait' && r.status !== 'connecting' && r.status !== 'connect') return null;
  return new Promise((resolve) => {
    const done = (v: Redis | null) => {
      clearTimeout(timer);
      r.off('ready', onReady);
      resolve(v);
    };
    const onReady = () => done(r);
    const timer = setTimeout(() => done(null), timeoutMs);
    r.once('ready', onReady);
  });
}
