import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { loadTracksFile, parseItems, resolveTracks } from '../content/tracks';
import { DOMAINS, PATTERN_IDS } from '../schemas/usecase.schema';

describe('tracks and paths', () => {
  it('parses ranges and lists', () => {
    expect(parseItems('1-3,7,10-11')).toEqual([1, 2, 3, 7, 10, 11]);
    expect(() => parseItems('3-1')).toThrow();
    expect(() => parseItems('a')).toThrow();
  });

  it('partitions every domain exactly: each use case is in one track', () => {
    const all = loadAllUseCases();
    const file = loadTracksFile();
    for (const d of DOMAINS) {
      const slugs = all.filter((u) => u.domain === d).map((u) => u.slug);
      const r = resolveTracks(d, file, slugs);
      expect(r.tracks.length, d).toBeGreaterThanOrEqual(6);
      expect(r.tracks.length, d).toBeLessThanOrEqual(8);
      expect(r.tracks.flatMap((t) => t.slugs).sort(), d).toEqual([...slugs].sort());
      expect(r.startHere.steps.length, d).toBe(3);
    }
  });

  it('rejects a track file that forgets or duplicates a use case', () => {
    const slugs = ['a/1', 'a/2', 'a/3'];
    const base = { startHere: { intro: 'x', steps: [1, 2, 3].map((n) => ({ n, why: 'w' })) } };
    const bad = (items: string[]) => ({
      fintech: { ...base, tracks: items.map((i, k) => ({ id: `t${k}`, name: 'n', blurb: 'b', items: i })) },
    });
    expect(() => resolveTracks('fintech', bad(['1-2']), slugs)).toThrow(/no track/);
    expect(() => resolveTracks('fintech', bad(['1-2', '2-3']), slugs)).toThrow(/both/);
    expect(resolveTracks('fintech', bad(['1', '2-3']), slugs).tracks).toHaveLength(2);
  });

  it('puts every use case on one of the 11 patterns, and uses all eleven', () => {
    const all = loadAllUseCases();
    expect(all.every((u) => (PATTERN_IDS as readonly string[]).includes(u.pattern))).toBe(true);
    expect(new Set(all.map((u) => u.pattern)).size).toBe(11);
  });
});
