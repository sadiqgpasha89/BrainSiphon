import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { searchBreaker } from '../lib/search/service';

vi.mock('../lib/db', () => ({
  dbConfigured: () => true,
  hybridSearchIds: vi.fn(),
  pingDb: vi.fn(),
}));

import { hybridSearchIds } from '../lib/db';
import { search } from '../lib/search/service';
import { SearchQuerySchema } from '../schemas/usecase.schema';

const q = (over: object) => SearchQuerySchema.parse({ q: 'fraud', ...over });

beforeAll(async () => {
  const { loadAllUseCases, toIndexEntry } = await import('../content/load');
  const { mkdirSync, writeFileSync, existsSync } = await import('node:fs');
  if (!existsSync('content/generated/index.json')) {
    mkdirSync('content/generated', { recursive: true });
    writeFileSync('content/generated/index.json', JSON.stringify(loadAllUseCases().map(toIndexEntry)));
  }
});

afterEach(() => vi.clearAllMocks());

describe('search service degradation', () => {
  it('serves hybrid results when Postgres answers', async () => {
    const all = (await import('../lib/content')).getIndex;
    const idx = await all();
    vi.mocked(hybridSearchIds).mockResolvedValueOnce([idx[3]!.id, idx[1]!.id]);
    const res = await search(q({ q: 'hybrid-ok-case' }));
    expect(res.source).toBe('hybrid');
    expect(res.items.map((i) => i.id)).toEqual([idx[3]!.id, idx[1]!.id]);
  });

  it('falls back to the static index when Postgres throws, and flags degradation', async () => {
    vi.mocked(hybridSearchIds).mockRejectedValueOnce(new Error('connection refused'));
    const res = await search(q({ q: 'sepsis early warning' }));
    expect(res.source).toBe('static-fallback');
    expect(res.degraded).toBe(true);
    expect(res.items[0]!.slug).toBe('healthcare/sepsis-early-warning');
  });

  it('falls back when Postgres is slower than the 800 ms budget', async () => {
    vi.mocked(hybridSearchIds).mockImplementationOnce(
      () => new Promise((r) => setTimeout(() => r(['late']), 3000)),
    );
    const t = performance.now();
    const res = await search(q({ q: 'slow dependency case' }));
    expect(performance.now() - t).toBeLessThan(1500);
    expect(res.source).toBe('static-fallback');
  });

  it('trips the breaker and stops calling the database entirely', async () => {
    vi.mocked(hybridSearchIds).mockRejectedValue(new Error('down'));
    for (let i = 0; i < 4; i++) await search(q({ q: `trip ${i}` }));
    expect(searchBreaker.current).toBe('open');
    vi.mocked(hybridSearchIds).mockClear();
    const res = await search(q({ q: 'another query' }));
    expect(hybridSearchIds).not.toHaveBeenCalled();
    expect(res.source).toBe('static-fallback');
  });
});
