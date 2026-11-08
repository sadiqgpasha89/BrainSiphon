import 'server-only';
import { createHash } from 'node:crypto';
import { trace } from '@opentelemetry/api';
import type MiniSearch from 'minisearch';
import type { SearchQuery, UseCaseIndexEntry } from '../../schemas/usecase.schema';
import { getIndex } from '../content';
import { dbConfigured, hybridSearchIds } from '../db';
import { getReadyRedis } from '../redis';
import { logger } from '../telemetry/logger';
import { CircuitBreaker } from './breaker';
import { buildMiniSearch, staticSearch } from './engine';

export interface SearchResponse {
  items: UseCaseIndexEntry[];
  total: number;
  nextCursor: number | null;
  source: 'hybrid' | 'static' | 'static-fallback';
  degraded: boolean;
  breaker: string;
}

const tracer = trace.getTracer('brainsiphon.search');
export const searchBreaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 10_000, timeoutMs: 800 });

let staticIdx: Promise<{ ms: MiniSearch<UseCaseIndexEntry>; entries: UseCaseIndexEntry[] }> | null = null;
const getStatic = () =>
  (staticIdx ??= getIndex().then((entries) => ({ ms: buildMiniSearch(entries), entries })));

async function cacheGet(key: string): Promise<SearchResponse | null> {
  try {
    const raw = await (await getReadyRedis())?.get(key);
    return raw ? (JSON.parse(raw) as SearchResponse) : null;
  } catch {
    return null;
  }
}

async function cacheSet(key: string, value: SearchResponse) {
  try {
    await (await getReadyRedis())?.set(key, JSON.stringify(value), 'EX', 60);
  } catch {
    /* cache is best-effort */
  }
}

/**
 * Search with graceful degradation:
 *   Redis cache → Postgres hybrid (FTS + pgvector, RRF) behind a circuit breaker (800 ms) → build-time MiniSearch.
 * A failing or slow dependency can slow one request by at most the breaker timeout, then is skipped entirely.
 */
export async function search(query: SearchQuery): Promise<SearchResponse> {
  return tracer.startActiveSpan('search', async (span) => {
    try {
      const { q, cursor, limit, ...filters } = query;
      const { ms, entries } = await getStatic();
      const base = { breaker: searchBreaker.current };

      if (!q) {
        const r = staticSearch(ms, entries, '', filters, cursor, limit);
        return { ...r, source: 'static' as const, degraded: false, ...base };
      }

      const key = `s:${createHash('sha1').update(JSON.stringify(query)).digest('hex')}`;
      const cached = await cacheGet(key);
      if (cached) return cached;

      if (dbConfigured()) {
        try {
          const ids = await searchBreaker.exec((signal) => hybridSearchIds(q, filters, signal));
          const byId = new Map(entries.map((e) => [e.id, e]));
          const all = ids.map((id) => byId.get(id)).filter((e): e is UseCaseIndexEntry => Boolean(e));
          const items = all.slice(cursor, cursor + limit);
          const end = cursor + items.length;
          const res: SearchResponse = {
            items,
            total: all.length,
            nextCursor: end < all.length ? end : null,
            source: 'hybrid',
            degraded: false,
            breaker: searchBreaker.current,
          };
          void cacheSet(key, res);
          return res;
        } catch (e) {
          logger.warn(
            { err: (e as Error).message, breaker: searchBreaker.current },
            'hybrid search failed; using static index',
          );
        }
      }

      const r = staticSearch(ms, entries, q, filters, cursor, limit);
      const res: SearchResponse = {
        ...r,
        source: dbConfigured() ? 'static-fallback' : 'static',
        degraded: dbConfigured(),
        breaker: searchBreaker.current,
      };
      if (!res.degraded) void cacheSet(key, res);
      return res;
    } finally {
      span.end();
    }
  });
}
