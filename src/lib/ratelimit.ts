import { getReadyRedis } from './redis';

export interface RateResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  backend: 'redis' | 'memory';
}

export interface RateOptions {
  limit: number;
  windowMs: number;
  now?: number;
}

/** Bounded in-memory sliding-window log with LRU eviction; used when Redis is absent or failing. */
export class MemoryLimiter {
  private readonly hits = new Map<string, number[]>();
  constructor(private readonly maxKeys = 10_000) {}

  check(key: string, { limit, windowMs, now = Date.now() }: RateOptions): RateResult {
    const windowStart = now - windowMs;
    const arr = (this.hits.get(key) ?? []).filter((t) => t > windowStart);
    this.hits.delete(key); // re-insert to refresh LRU order
    const allowed = arr.length < limit;
    if (allowed) arr.push(now);
    this.hits.set(key, arr);
    if (this.hits.size > this.maxKeys) {
      const oldest = this.hits.keys().next().value;
      if (oldest !== undefined) this.hits.delete(oldest);
    }
    const resetMs = arr.length ? Math.max(0, arr[0]! + windowMs - now) : 0;
    return { allowed, remaining: Math.max(0, limit - arr.length), resetMs, backend: 'memory' };
  }
}

const memory = new MemoryLimiter();

/** Atomic sliding window in a Redis sorted set. Returns [allowed, count, oldestScore]. */
const LUA = `
local key, now, window, limit, member = KEYS[1], tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count < limit then
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, window)
  return {1, count + 1}
end
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
return {0, count, oldest[2]}
`;

export async function rateLimit(key: string, opts: RateOptions): Promise<RateResult> {
  const redis = await getReadyRedis();
  const now = opts.now ?? Date.now();
  if (redis) {
    try {
      const res = (await redis.eval(
        LUA,
        1,
        `rl:${key}`,
        now,
        opts.windowMs,
        opts.limit,
        `${now}-${Math.random().toString(36).slice(2)}`,
      )) as [number, number, string?];
      const allowed = res[0] === 1;
      const oldest = res[2] ? Number(res[2]) : now;
      return {
        allowed,
        remaining: Math.max(0, opts.limit - res[1]),
        resetMs: allowed ? 0 : Math.max(0, oldest + opts.windowMs - now),
        backend: 'redis',
      };
    } catch {
      // fall through to memory limiter: availability beats strictness for a read-only API
    }
  }
  return memory.check(key, { ...opts, now });
}

export const clientIp = (headers: Headers): string => {
  const xff = headers.get('x-forwarded-for');
  return (xff?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown').slice(0, 64);
};
