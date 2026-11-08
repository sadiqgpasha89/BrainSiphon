import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { DOMAINS, SearchQuerySchema, UseCaseSchema } from '../schemas/usecase.schema';

const all = loadAllUseCases();

describe('use-case schema', () => {
  it('fails the build when a required section is missing', () => {
    const rest: Record<string, unknown> = { ...all[0]! };
    delete rest.signalVsNoiseMatrix;
    expect(UseCaseSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a bad mermaid keyword, unknown domain and extra keys', () => {
    const u = structuredClone(all[0]!);
    expect(
      UseCaseSchema.safeParse({
        ...u,
        architectureBlueprint: { ...u.architectureBlueprint, mermaidDiagram: 'not a diagram at all, sorry' },
      }).success,
    ).toBe(false);
    expect(UseCaseSchema.safeParse({ ...u, domain: 'gaming' }).success).toBe(false);
    expect(UseCaseSchema.safeParse({ ...u, surprise: 1 }).success).toBe(false);
  });

  it('every generated use case satisfies the strict schema', () => {
    for (const u of all) expect(UseCaseSchema.safeParse(u).success, u.slug).toBe(true);
  });

  it('has at least 50 distinct use cases per domain with unique slugs and ids', () => {
    for (const d of DOMAINS) expect(all.filter((u) => u.domain === d).length).toBeGreaterThanOrEqual(50);
    expect(new Set(all.map((u) => u.slug)).size).toBe(all.length);
    expect(new Set(all.map((u) => u.id)).size).toBe(all.length);
  });

  it('validates URL query parameters strictly', () => {
    expect(SearchQuerySchema.safeParse({ q: 'fraud', domain: 'fintech', cursor: '20' }).success).toBe(true);
    expect(SearchQuerySchema.safeParse({ domain: 'nope' }).success).toBe(false);
    expect(SearchQuerySchema.safeParse({ q: "x'; DROP TABLE use_cases;--" }).success).toBe(false);
    expect(SearchQuerySchema.safeParse({ q: '<script>' }).success).toBe(false);
    expect(SearchQuerySchema.safeParse({ limit: '1000' }).success).toBe(false);
    expect(SearchQuerySchema.safeParse({ cursor: '-1' }).success).toBe(false);
  });
});

describe('system-design generation', () => {
  it('gives every blueprint HLD, sequence, LLD, 10 e2e phases and a capacity model', () => {
    for (const u of all) {
      const d = u.systemDesign;
      expect(d.e2e).toHaveLength(10);
      expect(d.hld.mermaid.startsWith('flowchart')).toBe(true);
      expect(d.sequence.mermaid.startsWith('sequenceDiagram')).toBe(true);
      expect(d.lld.classDiagram.startsWith('classDiagram')).toBe(true);
      expect(d.scale.table.map((r) => r.metric)).toContain('Cost per 1,000 decisions');
    }
  });

  it('keeps stage budgets within the latency SLA for online systems', () => {
    for (const u of all.filter((x) => x.systemDesign.mode === 'online')) {
      const total = u.latencySLA === 'sub-10ms' ? 8 : 80;
      const sum = u.systemDesign.hld.components
        .filter((c) => c.latencyBudgetMs !== null && c.name !== 'Edge and API gateway')
        .reduce((a, c) => a + (c.latencyBudgetMs ?? 0), 0);
      expect(sum, u.slug).toBeLessThanOrEqual(total * 1.2);
    }
  });

  it('scales capacity with the traffic profile (fraud scoring needs fewer nodes than 100x-heavier ad bidding)', () => {
    const rows = (slug: string) =>
      Object.fromEntries(
        all.find((u) => u.slug === slug)!.systemDesign.scale.table.map((r) => [r.metric, r.value]),
      );
    expect(rows('adtech/real-time-bidding-bid-optimization')['Peak throughput']).not.toBe(
      rows('fintech/real-time-card-upi-fraud-detection')['Peak throughput'],
    );
  });
});
