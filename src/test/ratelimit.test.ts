import { describe, expect, it } from 'vitest';
import { clientIp, MemoryLimiter, rateLimit } from '../lib/ratelimit';

describe('sliding-window rate limiter (memory fallback)', () => {
  it('allows exactly `limit` requests per window then blocks', () => {
    const l = new MemoryLimiter();
    const results = Array.from({ length: 62 }, (_, i) =>
      l.check('ip', { limit: 60, windowMs: 60_000, now: 1_000 + i }),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(60);
    expect(results[60]!.allowed).toBe(false);
    expect(results[60]!.resetMs).toBeGreaterThan(0);
  });

  it('slides: old hits expire so traffic resumes', () => {
    const l = new MemoryLimiter();
    for (let i = 0; i < 5; i++) l.check('k', { limit: 5, windowMs: 1000, now: 100 });
    expect(l.check('k', { limit: 5, windowMs: 1000, now: 500 }).allowed).toBe(false);
    expect(l.check('k', { limit: 5, windowMs: 1000, now: 1200 }).allowed).toBe(true);
  });

  it('isolates keys and evicts least-recently-used keys beyond the cap', () => {
    const l = new MemoryLimiter(3);
    ['a', 'b', 'c', 'd'].forEach((k) => l.check(k, { limit: 1, windowMs: 10_000, now: 1 }));
    expect(l.check('d', { limit: 1, windowMs: 10_000, now: 2 }).allowed).toBe(false);
    expect(l.check('a', { limit: 1, windowMs: 10_000, now: 2 }).allowed).toBe(true); // evicted, starts fresh
  });

  it('rateLimit() works without Redis configured', async () => {
    const r = await rateLimit('unit-test', { limit: 2, windowMs: 1000 });
    expect(r.backend).toBe('memory');
    expect(r.allowed).toBe(true);
  });

  it('takes the first X-Forwarded-For hop', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
