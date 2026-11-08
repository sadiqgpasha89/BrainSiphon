import { describe, expect, it } from 'vitest';
import { loadAllUseCases, toIndexEntry } from '../content/load';
import { buildMiniSearch, staticSearch } from '../lib/search/engine';
import { embed, EMBED_DIM } from '../lib/search/embed';
import { reciprocalRankFusion } from '../lib/search/rrf';

const entries = loadAllUseCases().map(toIndexEntry);
const ms = buildMiniSearch(entries);

describe('reciprocal rank fusion', () => {
  it('rewards documents that appear in both lists over single-list winners', () => {
    const lex = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const sem = [{ id: 'b' }, { id: 'c' }, { id: 'd' }];
    const out = reciprocalRankFusion([lex, sem]).map((r) => r.id);
    expect(out.slice(0, 2)).toEqual(['b', 'c']); // present in both lists → beats the single-list winner 'a'
    expect(out.indexOf('a')).toBeLessThan(out.indexOf('d'));
    expect(out).toContain('d');
  });

  it('is stable and deterministic on ties', () => {
    const out = reciprocalRankFusion([[{ id: 'x' }], [{ id: 'y' }]]).map((r) => r.id);
    expect(out).toEqual(['x', 'y']);
  });
});

describe('static (fallback) search ranking', () => {
  it('puts the exact-topic blueprint first', () => {
    expect(staticSearch(ms, entries, 'prompt injection', {}).items[0]!.slug).toBe(
      'cybersecurity/llm-prompt-injection-detection',
    );
    expect(staticSearch(ms, entries, 'sepsis', {}).items[0]!.slug).toBe('healthcare/sepsis-early-warning');
    expect(staticSearch(ms, entries, 'knowledge tracing', {}).items[0]!.domain).toBe('edtech');
  });

  it('is typo tolerant and prefix friendly', () => {
    expect(staticSearch(ms, entries, 'sepsiss', {}).items.length).toBeGreaterThan(0);
    expect(staticSearch(ms, entries, 'phishi', {}).items.some((e) => e.slug.includes('phishing'))).toBe(true);
  });

  it('applies filters and cursor pagination consistently', () => {
    const a = staticSearch(ms, entries, '', { domain: 'fintech', latency: 'batch' }, 0, 5);
    expect(a.items.every((e) => e.domain === 'fintech' && e.latencySLA === 'batch')).toBe(true);
    expect(a.nextCursor).toBe(5);
    const b = staticSearch(ms, entries, '', { domain: 'fintech', latency: 'batch' }, 5, 5);
    expect(new Set([...a.items, ...b.items].map((e) => e.id)).size).toBe(a.items.length + b.items.length);
  });
});

describe('feature-hash embedding', () => {
  it('is deterministic, fixed-width and unit length', () => {
    const v = embed('real-time fraud detection');
    expect(v).toHaveLength(EMBED_DIM);
    expect(Math.hypot(...v)).toBeCloseTo(1, 5);
    expect(embed('real-time fraud detection')).toEqual(v);
  });

  it('places related text closer than unrelated text', () => {
    const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i]!, 0);
    const q = embed('credit card fraud scoring');
    expect(dot(q, embed('card fraud detection scoring system'))).toBeGreaterThan(
      dot(q, embed('warehouse robot path planning')),
    );
  });
});
