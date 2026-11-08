import { describe, expect, it } from 'vitest';
import { CircuitBreaker, CircuitOpenError, TimeoutError } from '../lib/search/breaker';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('circuit breaker', () => {
  it('times out slow dependencies', async () => {
    const b = new CircuitBreaker({ timeoutMs: 20 });
    await expect(b.exec(() => sleep(200))).rejects.toBeInstanceOf(TimeoutError);
  });

  it('opens after consecutive failures and then rejects instantly', async () => {
    const b = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 1000, timeoutMs: 50 });
    const boom = () => Promise.reject(new Error('db down'));
    await expect(b.exec(boom)).rejects.toThrow('db down');
    await expect(b.exec(boom)).rejects.toThrow('db down');
    expect(b.current).toBe('open');
    const t = performance.now();
    await expect(b.exec(() => sleep(500))).rejects.toBeInstanceOf(CircuitOpenError);
    expect(performance.now() - t).toBeLessThan(20);
  });

  it('half-opens after the cooldown and closes again on success', async () => {
    let now = 0;
    const b = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 100, timeoutMs: 50, now: () => now });
    await expect(b.exec(() => Promise.reject(new Error('x')))).rejects.toThrow();
    expect(b.current).toBe('open');
    now = 150;
    expect(b.current).toBe('half-open');
    await expect(b.exec(async () => 'ok')).resolves.toBe('ok');
    expect(b.current).toBe('closed');
  });

  it('re-opens immediately if the half-open probe fails', async () => {
    let now = 0;
    const b = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 100, timeoutMs: 50, now: () => now });
    for (let i = 0; i < 3; i++) await expect(b.exec(() => Promise.reject(new Error('x')))).rejects.toThrow();
    now = 200;
    await expect(b.exec(() => Promise.reject(new Error('still down')))).rejects.toThrow('still down');
    expect(b.current).toBe('open');
  });
});
