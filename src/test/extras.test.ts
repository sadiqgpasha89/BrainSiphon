import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { PRIMITIVE_BY_ID } from '../content/primitives';
import { computeScale } from '../content/scale';
import { ROLE_IDS, ROLE_SECTIONS, SECTION_IDS } from '../lib/roles';

const all = loadAllUseCases();
const bySlug = (s: string) => all.find((u) => u.slug === s)!;

describe('role lenses and primitives', () => {
  it('gives every blueprint all seven role lenses with resolvable primitive links', () => {
    for (const u of all) {
      expect(
        u.roleLenses.map((l) => l.role),
        u.slug,
      ).toEqual([...ROLE_IDS]);
      for (const l of u.roleLenses)
        for (const i of l.items)
          if (i.primitive) expect(PRIMITIVE_BY_ID[i.primitive], `${u.slug}:${i.primitive}`).toBeDefined();
      for (const id of u.primitives) expect(PRIMITIVE_BY_ID[id], `${u.slug}:${id}`).toBeDefined();
    }
  });

  it('only references sections that exist in the reader', () => {
    const toc: readonly string[] = SECTION_IDS;
    for (const r of ROLE_IDS) for (const id of ROLE_SECTIONS[r]) expect(toc).toContain(id);
  });
});

describe('role lens styling', () => {
  it('has a CSS rule that shows the sections of every role (a role without one hides the whole page)', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync('src/app/globals.css', 'utf8');
    for (const r of ROLE_IDS) expect(css, r).toContain(`[data-role='${r}'] section[data-roles~='${r}']`);
  });
});

describe('region topology', () => {
  it('pins regulated state instead of claiming three active-active regions for everything', () => {
    for (const u of all.filter((x) => ['fintech', 'bfsi', 'healthcare'].includes(x.domain))) {
      expect(u.systemDesign.topology.stance, u.slug).toBe('residency-pinned');
      if (u.systemDesign.mode !== 'batch')
        expect(u.systemDesign.hld.mermaid, u.slug).toContain('State plane');
    }
    expect(bySlug('saas/in-app-ai-copilot').systemDesign.topology.stance).toBe('tenant-isolated');
    expect(bySlug('adtech/real-time-bidding-bid-optimization').systemDesign.topology.stance).toBe(
      'stateless-active-active',
    );
  });
});

describe('capacity model overrides', () => {
  const base = { paradigms: ['tabular' as const], latency: 'sub-10ms' as const, a: 8, k: 2 };
  it('reproduces the published numbers when no override is given or all overrides equal the defaults', () => {
    const a = computeScale(base);
    const b = computeScale({ ...base, registeredUsers: 10_000_000, dauRatio: 0.3, peakFactor: 8, slaMs: 8 });
    expect(b.rows).toEqual(a.rows);
  });
  it('needs more headroom for a tighter p99 and more users', () => {
    const a = computeScale(base);
    expect(computeScale({ ...base, slaMs: 2 }).provisionedQps).toBeGreaterThan(a.provisionedQps);
    expect(computeScale({ ...base, registeredUsers: 200_000_000 }).nodes).toBeGreaterThan(a.nodes);
    expect(computeScale({ ...base, peakFactor: 2 }).peakQps).toBeLessThan(a.peakQps);
  });
  it('matches the table stored on every blueprint when re-run from its stored inputs', () => {
    for (const u of all) {
      const r = computeScale({
        paradigms: u.mlParadigms,
        latency: u.latencySLA,
        ...u.systemDesign.scale.inputs,
      });
      expect(r.rows, u.slug).toEqual(u.systemDesign.scale.table);
    }
  });
});

describe('flagship feedback is in the content', () => {
  const text = (slug: string) => JSON.stringify(bySlug(slug));
  it.each([
    ['fintech/real-time-card-upi-fraud-detection', ['step-up', 'Bloom-filter', 'streaming graph worker']],
    ['healthcare/sepsis-early-warning', ['Clinician order frequency', 'refractory', 'inverse-propensity']],
    ['retail/personalized-search-ranking', ['position tower', 'Roaring-bitmap', 'seller']],
    ['adtech/real-time-bidding-bid-optimization', ['PID', 'clearing-price', 'win notice']],
    ['cybersecurity/llm-prompt-injection-detection', ['indirect', 'Spotlighting', 'policy engine']],
    ['saas/in-app-ai-copilot', ['RFC 8693', 'Plan, preview, commit', 'Idempotency']],
  ])('%s', (slug, needles) => {
    for (const n of needles) expect(text(slug).toLowerCase(), `${slug} ~ ${n}`).toContain(n.toLowerCase());
  });
});
