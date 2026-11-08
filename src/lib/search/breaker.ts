/**
 * Minimal circuit breaker with per-call timeout.
 * closed → (N consecutive failures) → open → (cooldown) → half-open → (success) → closed.
 */
export type BreakerState = 'closed' | 'open' | 'half-open';

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export class CircuitOpenError extends Error {
  constructor() {
    super('circuit open');
    this.name = 'CircuitOpenError';
  }
}

export interface BreakerOptions {
  failureThreshold?: number;
  cooldownMs?: number;
  timeoutMs?: number;
  now?: () => number;
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private state: BreakerState = 'closed';
  private readonly threshold: number;
  private readonly cooldown: number;
  readonly timeoutMs: number;
  private readonly now: () => number;

  constructor(opts: BreakerOptions = {}) {
    this.threshold = opts.failureThreshold ?? 3;
    this.cooldown = opts.cooldownMs ?? 10_000;
    this.timeoutMs = opts.timeoutMs ?? 800;
    this.now = opts.now ?? Date.now;
  }

  get current(): BreakerState {
    if (this.state === 'open' && this.now() - this.openedAt >= this.cooldown) this.state = 'half-open';
    return this.state;
  }

  async exec<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (this.current === 'open') throw new CircuitOpenError();
    const ac = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          ac.abort();
          reject(new TimeoutError(this.timeoutMs));
        }, this.timeoutMs);
      });
      const result = await Promise.race([fn(ac.signal), timeout]);
      this.failures = 0;
      this.state = 'closed';
      return result;
    } catch (e) {
      this.failures += 1;
      if (this.state === 'half-open' || this.failures >= this.threshold) {
        this.state = 'open';
        this.openedAt = this.now();
      }
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
