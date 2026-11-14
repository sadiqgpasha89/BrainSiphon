import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { computeScale } from '../content/scale';
import { inferVolume } from '../content/expand';
import { PROFILES, PROFILE_IDS, defaultProfile } from '../content/workload-profiles';
import { ARCHETYPES, EXPERIMENT_DESIGNS, UseCaseSchema } from '../schemas/usecase.schema';
import { toMarkdown } from '../content/markdown';

const all = loadAllUseCases();
const bySlug = (s: string) => all.find((u) => u.slug === s)!;

describe('archetype-driven low-level design', () => {
  it('assigns every blueprint an archetype and uses all nine across the catalogue', () => {
    expect(new Set(all.map((u) => u.systemDesign.lld.archetype)).size).toBe(ARCHETYPES.length);
  });

  it('labels every generated LLD as an illustrative scaffold', () => {
    for (const u of all) expect(u.systemDesign.lld.status, u.slug).toBe('illustrative-scaffold');
  });

  it('gives a forecast a forecast API and quantile tables, not a /decide endpoint', () => {
    const u = bySlug('retail/demand-forecasting-sku-store');
    expect(u.systemDesign.lld.archetype).toBe('forecasting');
    expect(u.systemDesign.lld.apiContract.path).toMatch(/\/forecasts$/);
    expect(u.systemDesign.lld.apiContract.request).toContain('horizon');
    expect(u.systemDesign.lld.dataModelDDL).toMatch(/p10[\s\S]*p50[\s\S]*p90/);
    expect(u.systemDesign.lld.algorithm.code).toContain('reconcile_hierarchy');
  });

  it('keeps the decisioning API for card fraud and gives the docs assistant a retrieval design', () => {
    expect(bySlug('fintech/real-time-card-upi-fraud-detection').systemDesign.lld.apiContract.path).toMatch(
      /\/decide$/,
    );
    const rag = bySlug('saas/developer-docs-assistant');
    expect(rag.systemDesign.lld.archetype).toBe('rag');
    expect(rag.systemDesign.lld.dataModelDDL).toContain('embedding VECTOR');
    expect(rag.systemDesign.lld.securityModel.map((s) => s.surface).join(' ')).toMatch(/Prompt injection/);
  });

  it('never reuses the decisioning endpoint for another archetype, and every LLD has failure, security and test content', () => {
    for (const u of all) {
      const lld = u.systemDesign.lld;
      if (lld.archetype !== 'realtime-decisioning')
        expect(lld.apiContract.path, u.slug).not.toMatch(/\/decide$/);
      expect(lld.failureAndRetry.length, u.slug).toBeGreaterThanOrEqual(4);
      expect(lld.securityModel.length, u.slug).toBeGreaterThanOrEqual(4);
      expect(lld.testScenarios.length, u.slug).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('workload-specific capacity', () => {
  it('sizes the SKU-store forecast from its stated 5M series, not from 10M app users', () => {
    const u = bySlug('retail/demand-forecasting-sku-store');
    const row = (m: string) => u.systemDesign.scale.table.find((r) => r.metric === m)!;
    expect(row('Workload driver').value).toMatch(/5M series nightly/);
    expect(row('Model-touching events per day').value).toBe('5.0M');
    expect(u.systemDesign.scale.table.map((r) => r.metric)).not.toContain('Registered / daily active users');
    expect(row('Required throughput').how).toMatch(/not a request rate/);
  });

  it('extracts stated volumes only when the constraint also says how often', () => {
    expect(inferVolume(['5M series nightly'])?.perDay).toBe(5_000_000);
    expect(inferVolume(['Daily batch for 50M SKUs'])?.perDay).toBe(50_000_000);
    expect(inferVolume(['Match precision above 98%', '5M series'])).toBeNull();
  });

  it('has forecast, streaming and recommender profiles, and opens forecasting use cases in the forecast profile', () => {
    for (const id of ['forecast', 'stream', 'recsys'] as const) expect(PROFILE_IDS).toContain(id);
    expect(defaultProfile('retail', 'cpu-batch', 'forecasting')).toBe('forecast');
    expect(defaultProfile('retail', 'cpu-batch')).toBe('batch');
    const b = { eventsPerDay: 5e6, avgQps: 58, a: 1, k: 1, peakFactor: 1, steps: 3, tokensPerStep: 350 };
    const longer = PROFILES.forecast.apply({ series: 5e6, runs: 1, horizon: 365, q: 3, k: 1 }, b);
    const published = PROFILES.forecast.apply({ series: 5e6, runs: 1, horizon: 28, q: 3, k: 1 }, b);
    expect(longer.k!).toBeGreaterThan(published.k!);
    expect(published.k).toBeCloseTo(1, 9);
  });

  it('scales ranker throughput with candidates per request', () => {
    const base = { paradigms: ['recommender' as const], latency: 'sub-100ms' as const, a: 20, k: 2 };
    const few = computeScale({ ...base, candidates: 300 });
    const many = computeScale({ ...base, candidates: 6000 });
    expect(many.nodes).toBeGreaterThan(few.nodes);
  });

  it('adds an all-in cost, an ordered low/expected/high range and P50/P95/P99 scenarios to every table', () => {
    for (const u of all) {
      const metrics = u.systemDesign.scale.table.map((r) => r.metric);
      expect(metrics, u.slug).toContain('All-in monthly cost');
      expect(metrics, u.slug).toContain('Cost range (low / expected / high)');
      expect(metrics, u.slug).toContain('Load scenarios (P50 / P95 / P99)');
    }
    const r = computeScale({ paradigms: ['tabular'], latency: 'sub-100ms', a: 5, k: 2, reviewRate: 0.01 });
    expect(r.costRange.low).toBeLessThan(r.costRange.expected);
    expect(r.costRange.expected).toBeLessThan(r.costRange.high);
    expect(r.monthlyAllInUSD).toBeGreaterThan(r.monthlyTotalUSD);
    expect(r.scenarios).toHaveLength(3);
    expect(r.scenarios[2]!.nodes).toBe(r.nodes);
    expect(r.scenarios[0]!.nodes).toBeLessThanOrEqual(r.scenarios[1]!.nodes);
    expect(r.scenarios[1]!.nodes).toBeLessThanOrEqual(r.scenarios[2]!.nodes);
    expect(r.costBreakdown.some((c) => c.item === 'Human review and annotation')).toBe(true);
  });
});

describe('provenance', () => {
  it('records origin, number nature, sources, assumptions and limits on every blueprint', () => {
    for (const u of all) {
      const p = u.validation.provenance;
      expect(p.sections.length, u.slug).toBeGreaterThanOrEqual(8);
      expect(
        p.numbers.some((n) => n.nature === 'modelled'),
        u.slug,
      ).toBe(true);
      expect(p.limitations.join(' '), u.slug).toMatch(/modelled|synthetic/);
    }
  });

  it('never presents a generated blueprint as hand-authored or as measured', () => {
    for (const u of all) {
      const p = u.validation.provenance;
      const narrative = p.sections.find((s) => s.section.startsWith('Problem statement'))!;
      expect(narrative.origin, u.slug).toBe(
        u.narrativeProvenance === 'authored' ? 'hand-authored' : 'generated-from-spec',
      );
      for (const s of p.sections.filter((x) =>
        /Low-level|Capacity|Role lenses|Agentic|Statistical/.test(x.section),
      ))
        expect(s.origin, `${u.slug}: ${s.section}`).toBe('generated-from-template');
      expect(['schema-validated', 'technically-validated', 'synthetic-data-tested'], u.slug).toContain(
        p.status,
      );
    }
  });

  it('is exported in the markdown twin', () => {
    const md = toMarkdown(bySlug('retail/demand-forecasting-sku-store'));
    expect(md).toContain('What kind of number is this?');
    expect(md).toContain('Statistical validation and experimentation');
    expect(md).toContain('Do we need an agent at all?');
    expect(md).toContain('illustrative implementation scaffold');
  });
});

describe('statistical validation and experimentation', () => {
  it("exists for every blueprint, with a design that fits the archetype and the use case's own metrics", () => {
    for (const u of all) {
      const x = u.experimentation;
      expect(EXPERIMENT_DESIGNS, u.slug).toContain(x.design.type);
      expect(x.question, u.slug).toContain(u.title.replace(/[.;]+$/, ''));
      expect(x.metrics.primary, u.slug).toContain(
        u.evaluationAndMetrics.onlineBusinessMetrics[0]!.replace(/[.;]+$/, ''),
      );
      expect(x.power.sampleSizeRule, u.slug).toMatch(/16/);
      expect(x.stopping.length, u.slug).toBeGreaterThanOrEqual(4);
    }
    const design = (s: string) => bySlug(s).experimentation.design.type;
    expect(design('retail/session-based-next-item-recommendation')).toBe('interleaving-then-ab');
    expect(design('retail/demand-forecasting-sku-store')).toBe('rolling-origin-backtest');
    expect(design('fintech/real-time-card-upi-fraud-detection')).toBe('shadow-then-holdout');
  });

  it('calls out selective labels in decision systems and uses regulated-domain slices', () => {
    expect(bySlug('fintech/real-time-card-upi-fraud-detection').experimentation.labels.selectionBias).toMatch(
      /randomised slice/,
    );
    expect(bySlug('healthcare/sepsis-early-warning').experimentation.slices.join(' ')).toMatch(/ethnicity/);
  });
});

describe('schema', () => {
  it('rejects a blueprint that drops the new sections', () => {
    const u = bySlug('retail/demand-forecasting-sku-store');
    const rest: Record<string, unknown> = { ...u };
    delete rest.experimentation;
    expect(UseCaseSchema.safeParse(rest).success).toBe(false);
    const v: Record<string, unknown> = { ...u.validation };
    delete v.provenance;
    expect(UseCaseSchema.safeParse({ ...u, validation: v }).success).toBe(false);
  });
});
