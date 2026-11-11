import { describe, expect, it } from 'vitest';
import { GUARDRAIL_LAYERS, evaluationPlan, guardrailPlan } from '../content/assurance';
import { loadAllUseCases } from '../content/load';
import { toMarkdown } from '../content/markdown';

const all = loadAllUseCases();
const bySlug = (slug: string) => all.find((u) => u.slug === slug)!;

describe('evaluation plan and guardrails, gathered per blueprint', () => {
  it('gives every blueprint a complete evaluation plan', () => {
    for (const uc of all) {
      const e = evaluationPlan(uc);
      expect(e.question.length, uc.slug).toBeGreaterThan(20);
      expect(
        e.protocol.map((p) => p.item),
        uc.slug,
      ).toContain('Split and sampling');
      for (const p of e.protocol) expect(p.how.length, `${uc.slug} ${p.item}`).toBeGreaterThan(10);
      expect(e.slices.length, uc.slug).toBeGreaterThanOrEqual(3);
      expect(e.thresholds.length, uc.slug).toBeGreaterThanOrEqual(4);
      for (const t of e.thresholds) expect(t.target.length && t.onBreach.length, uc.slug).toBeGreaterThan(0);
      expect(e.online.guardrails.length, uc.slug).toBeGreaterThanOrEqual(3);
      expect(e.online.stopping.length, uc.slug).toBeGreaterThanOrEqual(4);
      expect(e.continuous.triggers.length, uc.slug).toBeGreaterThan(0);
      // the metrics the use case itself names are the first thresholds, not generic ones
      expect(e.thresholds[0]!.metric, uc.slug).toBe(uc.evaluationAndMetrics.offlineMetrics[0]);
    }
  });

  it('adds LLM and agent evaluation exactly where the blueprint has agents', () => {
    for (const uc of all)
      expect(evaluationPlan(uc).aiQuality.length > 0, uc.slug).toBe(uc.agentic.agents.length > 0);
    expect(evaluationPlan(bySlug('saas/in-app-ai-copilot')).aiQuality.length).toBeGreaterThan(3);
    expect(evaluationPlan(bySlug('retail/demand-forecasting-sku-store')).aiQuality).toEqual([]);
  });

  it('gives every blueprint guardrails in every layer that applies to it', () => {
    for (const uc of all) {
      const g = guardrailPlan(uc);
      const layers = new Set(g.rows.map((r) => r.layer));
      for (const layer of GUARDRAIL_LAYERS)
        if (layer !== 'Runtime control') expect(layers.has(layer), `${uc.slug} has no ${layer}`).toBe(true);
      expect(layers.has('Runtime control'), uc.slug).toBe(g.hasAgentControls);
      // a blueprint without agent controls says why, rather than leaving a silent gap
      expect(Boolean(g.noAgentNote), uc.slug).toBe(!g.hasAgentControls);
      for (const r of g.rows) {
        expect(r.guardrails.length, `${uc.slug} ${r.layer}`).toBeGreaterThan(0);
        expect(r.enforcedBy.length, `${uc.slug} ${r.layer}`).toBeGreaterThan(0);
        for (const e of r.enforcedBy) expect(e.length, `${uc.slug} ${r.layer}`).toBeGreaterThan(10);
      }
      // each layer that is one mechanism for many limits is one row, not the same sentence repeated
      for (const layer of ['Hard constraint', 'Outcome guardrail', 'Stop and roll back'])
        expect(g.rows.filter((r) => r.layer === layer).length, `${uc.slug} ${layer}`).toBe(1);
      expect(
        g.rows.some((r) => r.guardrails.some((x) => x.startsWith('Violating the constraint'))),
        `${uc.slug} lists a constraint twice`,
      ).toBe(false);
    }
  });

  it('never leaves a system with a language model without runtime controls', () => {
    for (const uc of all.filter((u) => u.mlParadigms.includes('llm-agents')))
      expect(guardrailPlan(uc).hasAgentControls, uc.slug).toBe(true);
  });

  it('writes both into the markdown export', () => {
    const copilot = toMarkdown(bySlug('saas/in-app-ai-copilot'), 'https://example.test', null);
    for (const h of [
      '### What the evaluation has to prove',
      '### Offline protocol',
      '### Release thresholds',
      '### LLM and agent evaluation',
      '### Online evaluation',
      '### After launch: evaluation does not stop',
      '### Guardrails: what must not happen, and what enforces it',
    ])
      expect(copilot).toContain(h);
    const forecast = toMarkdown(bySlug('retail/demand-forecasting-sku-store'), 'https://example.test', null);
    expect(forecast).not.toContain('### LLM and agent evaluation');
    expect(forecast).toContain('no language model or agent in the request path');
  });
});
