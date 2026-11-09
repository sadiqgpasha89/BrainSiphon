import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { toMarkdown } from '../content/markdown';
import {
  METRIC_LAYER_IDS,
  MetricsSchema,
  OPTIONAL_METRIC_LAYERS,
  UseCaseSchema,
  isAgentic,
} from '../schemas/usecase.schema';

const all = loadAllUseCases();
const bySlug = (s: string) => all.find((u) => u.slug === s)!;
const strip = (s: string) => s.trim().replace(/[.;]+$/, '');
const CORE = METRIC_LAYER_IDS.filter((l) => !(OPTIONAL_METRIC_LAYERS as readonly string[]).includes(l));

describe('metrics catalogue', () => {
  it('gives every blueprint all ten core layers, each with a complete, owned and actionable row', () => {
    for (const u of all) {
      const ids = u.metrics.layers.map((l) => l.id);
      for (const id of CORE) expect(ids, `${u.slug}:${id}`).toContain(id);
      expect(new Set(ids).size, u.slug).toBe(ids.length);
      for (const l of u.metrics.layers)
        for (const r of l.rows) {
          expect(r.owner.length, `${u.slug}:${l.id}:${r.metric}`).toBeGreaterThan(1);
          expect(r.onBreach.length, `${u.slug}:${l.id}:${r.metric}`).toBeGreaterThan(10);
          expect(r.target.length, `${u.slug}:${l.id}:${r.metric}`).toBeGreaterThan(5);
        }
    }
  });

  it('shows an optional layer or says why it does not apply, never both and never neither', () => {
    for (const u of all) {
      const ids = new Set(u.metrics.layers.map((l) => l.id as string));
      for (const o of OPTIONAL_METRIC_LAYERS) {
        const present = ids.has(o);
        const absentWithReason = u.metrics.notApplicable.some((n) => n.layer === o);
        expect(present !== absentWithReason, `${u.slug}:${o}`).toBe(true);
      }
    }
  });

  it('applies RAG, LLM, agent and human-review metrics only where the system has that component', () => {
    const has = (s: string, layer: string) => bySlug(s).metrics.layers.some((l) => l.id === layer);
    // document-grounded assistant: retrieval, generation and agent metrics, no human queue
    expect(has('saas/developer-docs-assistant', 'rag')).toBe(true);
    expect(has('saas/developer-docs-assistant', 'llm')).toBe(true);
    // fraud scoring: conventional model with a case queue; an agent works beside it, no retrieval over documents
    expect(has('fintech/real-time-card-upi-fraud-detection', 'rag')).toBe(false);
    expect(has('fintech/real-time-card-upi-fraud-detection', 'hitl')).toBe(true);
    // nightly forecast: none of the four
    for (const l of ['rag', 'llm', 'agent', 'hitl'])
      expect(has('retail/demand-forecasting-sku-store', l), l).toBe(false);
    for (const u of all)
      expect(
        u.metrics.layers.some((l) => l.id === 'agent'),
        u.slug,
      ).toBe(isAgentic(u.agentic.fit) && u.agentic.agents.length > 0);
  });

  it("is built from the use case's own fields, not a fixed list", () => {
    for (const u of all) {
      const rows = (id: string) => u.metrics.layers.find((l) => l.id === id)!.rows;
      const business = rows('business').map((r) => r.metric);
      for (const m of u.evaluationAndMetrics.onlineBusinessMetrics)
        expect(business, u.slug).toContain(strip(m));
      const model = rows('model').map((r) => r.metric);
      for (const m of u.evaluationAndMetrics.offlineMetrics) expect(model, u.slug).toContain(strip(m));
      const data = rows('data').map((r) => r.metric);
      for (const f of u.dataAndFeatures.highSignalFeatures.slice(0, 3))
        expect(data, u.slug).toContain(`Freshness and leakage guard: ${f.name}`);
      // one monitor per edge case in the specification
      expect(
        u.metrics.failureMonitors.map((f) => f.scenario),
        u.slug,
      ).toEqual(u.productionEdgeCases.map((e) => strip(e.scenario)));
    }
  });

  it("repeats the blueprint's own latency budgets and SLOs rather than inventing new ones", () => {
    for (const u of all.filter((x) => x.systemDesign.mode !== 'batch')) {
      const sys = u.metrics.layers.find((l) => l.id === 'system')!.rows;
      for (const c of u.systemDesign.hld.components.filter(
        (x) => x.latencyBudgetMs !== null && x.name !== 'Edge and API gateway' && !/reserve/i.test(x.name),
      )) {
        const r = sys.find((x) => x.metric === `Stage latency: ${c.name}`);
        expect(r, `${u.slug}:${c.name}`).toBeDefined();
        expect(r!.target, `${u.slug}:${c.name}`).toContain(`${c.latencyBudgetMs} ms`);
      }
      expect(sys[0]!.target, u.slug).toBe(u.operations.slos[1]!.slo);
    }
  });

  it('differs between use cases', () => {
    expect(new Set(all.map((u) => u.metrics.tree)).size).toBe(all.length);
    expect(new Set(all.map((u) => JSON.stringify(u.metrics.gaming))).size).toBe(all.length);
    expect(new Set(all.map((u) => JSON.stringify(u.metrics.failureMonitors))).size).toBe(all.length);
    const names = new Set(all.flatMap((u) => u.metrics.layers.flatMap((l) => l.rows.map((r) => r.metric))));
    expect(names.size).toBeGreaterThan(4000);
  });

  it('chooses model metrics by archetype', () => {
    const model = (s: string) =>
      bySlug(s)
        .metrics.layers.find((l) => l.id === 'model')!
        .rows.map((r) => r.metric)
        .join(' | ');
    expect(model('retail/demand-forecasting-sku-store')).toMatch(/WAPE/);
    expect(model('retail/demand-forecasting-sku-store')).toMatch(/interval coverage/);
    expect(model('fintech/real-time-card-upi-fraud-detection')).toMatch(/PR-AUC/);
    expect(model('retail/session-based-next-item-recommendation')).toMatch(/NDCG/);
  });

  it('is exported in the markdown twin and rejected by the schema when missing', () => {
    const u = bySlug('saas/developer-docs-assistant');
    const md = toMarkdown(u);
    expect(md).toContain('## Metrics catalogue');
    expect(md).toContain('### RAG: retrieval and grounding');
    expect(MetricsSchema.safeParse(u.metrics).success).toBe(true);
    const rest: Record<string, unknown> = { ...u };
    delete rest.metrics;
    expect(UseCaseSchema.safeParse(rest).success).toBe(false);
  });
});
