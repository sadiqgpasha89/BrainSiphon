import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { checkFeasibility, feasibilityFailures, type FeasibilityInput } from '../content/feasibility';
import { computeScale } from '../content/scale';
import { buildStages, EDGE_MS, RESERVE_MS, stagePoolMs, TOTAL_BUDGET_MS } from '../content/design';
import { ARCHITECTURE_PATTERNS } from '../content/architecture-patterns';
import { PRIMITIVE_BY_ID } from '../content/primitives';
import {
  DOMAIN_DIMENSIONS,
  PROFILE_IDS,
  PROFILES,
  defaultProfile,
  paramsAtDefault,
} from '../content/workload-profiles';
import { DOMAINS, RISK_TIERS, VALIDATION_LEVELS } from '../schemas/usecase.schema';
import { ROLE_IDS, ROLE_META, ROLE_SECTIONS } from '../lib/roles';

const all = loadAllUseCases();
const bySlug = (s: string) => all.find((u) => u.slug === s)!;

describe('MLOps Engineer lens', () => {
  it('is a distinct role from the inference engineer and the ML engineer, on key 9', () => {
    expect(ROLE_IDS).toHaveLength(15);
    expect(ROLE_META['mlops-engineer'].key).toBe('9');
    expect(ROLE_IDS).toContain('ml-engineer');
    expect(ROLE_IDS).toContain('inference-engineer');
    expect(ROLE_IDS).toContain('forward-deployed-engineer');
  });
  it('gives every blueprint an MLOps lens that links the registry and drift primitives', () => {
    for (const u of all) {
      const lens = u.roleLenses.find((l) => l.role === 'mlops-engineer')!;
      expect(lens, u.slug).toBeDefined();
      const prims = lens.items.map((i) => i.primitive);
      expect(prims, u.slug).toContain('model-registry-promotion-gates');
      expect(prims, u.slug).toContain('drift-triggered-retraining');
    }
    expect(PRIMITIVE_BY_ID['data-contract-quality-sla']).toBeDefined();
  });
  it('shows MLOps the lifecycle, operations and governance sections', () => {
    for (const s of ['mlops', 'operations', 'governance'])
      expect(ROLE_SECTIONS['mlops-engineer']).toContain(s);
  });
  it('has the nine competency areas on every blueprint, and LLMOps only on language-model systems', () => {
    for (const u of all) {
      expect(u.mlops.lifecycle, u.slug).toHaveLength(9);
      const llm =
        u.pattern === 'llm-rag' || u.pattern === 'llm-agent' || u.mlParadigms.includes('llm-agents');
      expect(Boolean(u.mlops.llmops), u.slug).toBe(llm);
    }
  });
});

describe('enterprise solution context', () => {
  it('is present, complete and specific to the use case on all blueprints', () => {
    for (const u of all) {
      const e = u.enterpriseContext;
      expect(e.application.integration.length, u.slug).toBeGreaterThanOrEqual(4);
      expect(
        e.data.qualitySla.map((q) => q.dimension),
        u.slug,
      ).toEqual(expect.arrayContaining(['Completeness', 'Freshness', 'Uniqueness']));
      expect(e.data.contractExample, u.slug).toContain('BACKWARD_TRANSITIVE');
      expect(e.adrs.length, u.slug).toBeGreaterThanOrEqual(4);
      expect(e.c4Context, u.slug).toMatch(/^flowchart/);
      expect(e.c4Container, u.slug).toContain('trust boundary');
      expect(e.business.currentState, u.slug).not.toMatch(/undefined|NaN/);
    }
    const sources = new Set(all.map((u) => u.enterpriseContext.data.sources[0]!.source));
    expect(sources.size).toBeGreaterThan(400); // derived from each use case's own high-signal features
  });
  it('answers the six AI-architect questions with exactly one chosen option', () => {
    for (const u of all) {
      const m = u.decisionMatrix;
      expect(
        m.alternatives.filter((a) => a.verdict === 'chosen'),
        u.slug,
      ).toHaveLength(1);
      expect(m.changeTriggers.length, u.slug).toBeGreaterThanOrEqual(3);
      expect(m.whyNotRules.length, u.slug).toBeGreaterThan(40);
    }
  });
  it('describes the legacy ISO 8583 boundary for card fraud', () => {
    const f = bySlug('fintech/real-time-card-upi-fraud-detection');
    expect(f.enterpriseContext.application.integration[0]!.contract).toContain('ISO 8583');
    expect(f.enterpriseContext.technology.dr.rpo).toContain('0');
  });
});

describe('architecture feasibility validator', () => {
  const scale = computeScale({ paradigms: ['tabular'], latency: 'sub-10ms', a: 8, k: 2 });
  const input = (over: Partial<FeasibilityInput> = {}): FeasibilityInput => ({
    latency: 'sub-10ms',
    totalMs: 8,
    components: [
      { name: 'Edge and API gateway', latencyBudgetMs: 0.5 },
      { name: 'Auth gateway', latencyBudgetMs: 0.7 },
      { name: 'Feature store', latencyBudgetMs: 1.3 },
      { name: 'Graph embedding', latencyBudgetMs: 2.7 },
      { name: 'Fraud scorer', latencyBudgetMs: 2.7 },
      { name: 'Policy engine', latencyBudgetMs: 0.7 },
    ],
    rationale: [],
    constraints: ['p99 under 8 ms inside the auth path'],
    scale,
    assumedRetentionDays: 400,
    dr: { rpoSeconds: 0, rtoSeconds: 300, replication: 'sync' },
    productionModel: 'LightGBM',
    ...over,
  });

  it('fails the 8.6 ms budget that was reviewed against an 8 ms p99', () => {
    const fails = feasibilityFailures(checkFeasibility(input()));
    expect(fails.map((f) => f.check)).toContain('End-to-end latency budget');
    expect(fails[0]!.detail).toContain('8.6 ms');
    expect(fails.map((f) => f.check)).toContain('Network and serialisation overhead is budgeted');
  });
  it('catches a rationale that disagrees with the HLD, an impossible RPO and an over-sized model', () => {
    const checks = checkFeasibility(
      input({
        components: [
          { name: 'Scorer', latencyBudgetMs: 2 },
          { name: 'Network and serialisation reserve', latencyBudgetMs: 0.5 },
        ],
        rationale: [{ stage: 'Scorer', budget: '3 ms of 8 ms' }],
        dr: { rpoSeconds: 0, rtoSeconds: 300, replication: 'async' },
      }),
    );
    expect(checks.find((c) => c.check === 'Stage rationale matches HLD budgets')!.status).toBe('fail');
    expect(checks.find((c) => c.check === 'RTO/RPO vs replication strategy')!.status).toBe('fail');
    const llm = computeScale({ paradigms: ['llm-agents'], latency: 'seconds', a: 4, k: 8 });
    const mem = checkFeasibility(input({ scale: llm, productionModel: 'a 70B model' })).find(
      (c) => c.check === 'Model memory vs serving hardware',
    )!;
    expect(mem.status).toBe('warn');
  });
  it('warns when retention exceeds what the capacity table assumes', () => {
    const c = checkFeasibility(input({ constraints: ['7 years audit retention'] })).find(
      (x) => x.check === 'Storage vs retention',
    )!;
    expect(c.status).toBe('warn');
  });

  it('allocates stage budgets that sum exactly to the p99 for every latency class', () => {
    for (const latency of ['sub-10ms', 'sub-100ms', 'seconds'] as const) {
      const total = TOTAL_BUDGET_MS[latency]!;
      const stages = buildStages(
        [
          { label: 'Gateway', tech: 'Envoy' },
          { label: 'Feature store', tech: 'Redis' },
          { label: 'Scorer', tech: 'LightGBM' },
          { label: 'Policy engine', tech: 'rules' },
        ],
        latency,
      );
      const sum = stages.reduce((a, s) => a + (s.budgetMs ?? 0), 0);
      expect(Math.round((sum + EDGE_MS[latency]! + RESERVE_MS[latency]!) * 1000) / 1000, latency).toBe(total);
      expect(Math.round(sum * 1000) / 1000).toBe(stagePoolMs(latency));
    }
  });
  it('passes on every published blueprint and keeps the fraud blueprint to exactly 8.0 ms', () => {
    for (const u of all) {
      expect(feasibilityFailures(u.validation.feasibility), u.slug).toEqual([]);
      const total = TOTAL_BUDGET_MS[u.latencySLA];
      if (total !== null) {
        const sum = u.systemDesign.hld.components.reduce((a, c) => a + (c.latencyBudgetMs ?? 0), 0);
        expect(Math.round(sum * 1000) / 1000, u.slug).toBeLessThanOrEqual(total);
      }
    }
    const fraud = bySlug('fintech/real-time-card-upi-fraud-detection');
    const sum = fraud.systemDesign.hld.components.reduce((a, c) => a + (c.latencyBudgetMs ?? 0), 0);
    expect(Math.round(sum * 10) / 10).toBe(8);
  });
});

describe('governance, operations and validation provenance', () => {
  it('assigns a risk tier with its treatment and never leaves a high-risk case fully autonomous', () => {
    const tiers = new Set(all.map((u) => u.governance.riskTier));
    for (const t of RISK_TIERS) expect(tiers.has(t), t).toBe(true);
    for (const u of all) {
      if (u.governance.riskTier === 'high' || u.governance.riskTier === 'critical')
        expect(u.decisionMatrix.humanOversight.mode, u.slug).not.toBe('autonomous-with-audit');
      expect(u.governance.regulatory.length, u.slug).toBeGreaterThanOrEqual(3);
      for (const r of u.governance.regulatory) expect(r.evidence.length, u.slug).toBeGreaterThan(10);
    }
    expect(bySlug('healthcare/sepsis-early-warning').governance.riskTier).toBe('critical');
    expect(bySlug('retail/personalized-search-ranking').governance.riskTier).toBe('low');
  });
  it('has all ten failure scenarios appropriate to the system and an SLO table', () => {
    for (const u of all) {
      expect(u.operations.scenarios.length, u.slug).toBe(10);
      expect(u.operations.slos.length, u.slug).toBeGreaterThanOrEqual(5);
      expect(u.operations.scenarios.map((s) => s.failure).join('|'), u.slug).toMatch(/regional cloud outage/);
    }
    const llm = bySlug('saas/in-app-ai-copilot');
    expect(llm.operations.scenarios.map((s) => s.failure).join('|')).toMatch(/LLM provider/);
  });
  it('records what the automated checks have verified', () => {
    for (const u of all) {
      expect(u.validation.levels.map((l) => l.level)).toEqual([...VALIDATION_LEVELS]);
      const state = Object.fromEntries(u.validation.levels.map((l) => [l.level, l.state]));
      expect(state['schema-validated'], u.slug).toBe('passed');
      expect(state['technically-validated'], u.slug).toBe('passed');
      // a starter pass is claimed only where a compatible starter kit exists to have been run
      expect(state['synthetic-data-tested'], u.slug).toBe(u.playbook?.starter ? 'passed' : 'not-yet');
    }
  });
});

describe('workload-profile sizing', () => {
  const fraud = bySlug('fintech/real-time-card-upi-fraud-detection');
  const inputs = {
    paradigms: fraud.mlParadigms,
    latency: fraud.latencySLA,
    ...fraud.systemDesign.scale.inputs,
  };
  const base = computeScale(inputs);
  const baseline = {
    eventsPerDay: base.eventsPerDay,
    avgQps: base.avgQps,
    a: inputs.a,
    k: inputs.k,
    peakFactor: base.peakFactor,
    steps: 3,
    tokensPerStep: 350,
  };

  it('opens each industry in the unit it is sized in', () => {
    expect(defaultProfile('fintech', 'cpu-graph')).toBe('transaction');
    expect(defaultProfile('healthcare', 'cpu-scorer')).toBe('asset');
    expect(defaultProfile('saas', 'gpu-llm')).toBe('llm');
    expect(defaultProfile('retail', 'cpu-batch')).toBe('batch');
    for (const d of DOMAINS) expect(DOMAIN_DIMENSIONS[d].length).toBeGreaterThan(10);
  });
  it("reproduces the published events per day at every profile's defaults", () => {
    for (const id of PROFILE_IDS.filter((p) => p !== 'session')) {
      const defs = PROFILES[id].params(baseline);
      const v = Object.fromEntries(defs.map((d) => [d.id, d.default]));
      expect(paramsAtDefault(defs, v)).toBe(true);
      const ap = PROFILES[id].apply(v, baseline);
      const r = computeScale({
        ...inputs,
        ...(ap.k ? { k: ap.k } : {}),
        ...(ap.peakFactor ? { peakFactor: ap.peakFactor } : {}),
        eventsPerDay: ap.eventsPerDay ?? base.eventsPerDay,
        driver: ap.driver ?? '',
      });
      expect(r.eventsPerDay / base.eventsPerDay, id).toBeCloseTo(1, 9);
      expect(r.nodes, id).toBe(base.nodes);
    }
  });
  it('sizes a 10x transaction rate larger and names the driver in the table', () => {
    const defs = PROFILES.transaction.params(baseline);
    const ap = PROFILES.transaction.apply(
      { tps: defs[0]!.default * 10, peak: baseline.peakFactor, k: baseline.k },
      baseline,
    );
    const r = computeScale({ ...inputs, eventsPerDay: ap.eventsPerDay!, driver: ap.driver! });
    expect(r.nodes).toBeGreaterThan(base.nodes);
    expect(r.rows[0]!.metric).toBe('Workload driver');
    expect(r.rows[0]!.value).toContain('TPS average');
  });
});

describe('pattern hierarchy', () => {
  it('has L2 patterns that only reference real L1 archetypes and L3 primitives', () => {
    const l1 = new Set(all.map((u) => u.pattern));
    for (const p of ARCHITECTURE_PATTERNS) {
      for (const a of p.archetypes)
        expect(
          l1.has(a as never) ||
            [
              'tabular',
              'forecast',
              'anomaly',
              'recommender',
              'graph',
              'nlp',
              'cv',
              'bandit',
              'optimize',
              'llm-rag',
              'llm-agent',
            ].includes(a),
          p.id,
        ).toBe(true);
      for (const id of p.primitives) expect(PRIMITIVE_BY_ID[id], `${p.id}:${id}`).toBeDefined();
    }
  });
});
