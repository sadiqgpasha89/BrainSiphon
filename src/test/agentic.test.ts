import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { AGENT_ALTERNATIVES, AgenticSchema, isAgentic } from '../schemas/usecase.schema';

const all = loadAllUseCases();
const agentic = all.filter((u) => isAgentic(u.agentic.fit));
const plain = all.filter((u) => !isAgentic(u.agentic.fit));

describe('agentic solutioning', () => {
  it('exists, and validates, for every use case', () => {
    for (const u of all) expect(AgenticSchema.safeParse(u.agentic).success, u.slug).toBe(true);
  });

  it('answers "is an agent better than the alternatives?" in every blueprint, with one verdict per approach', () => {
    for (const u of all) {
      const d = u.agentic.decision;
      expect(d.question, u.slug).toMatch(/Why is an agent better/);
      expect(d.options.map((o) => o.approach).sort(), u.slug).toEqual([...AGENT_ALTERNATIVES].sort());
      expect(
        d.options.filter((o) => o.verdict === 'chosen'),
        u.slug,
      ).toHaveLength(1);
    }
  });

  it('lets a blueprint decline agents, and does so for a meaningful share but not all of the catalogue', () => {
    expect(plain.length).toBeGreaterThan(50);
    expect(agentic.length).toBeGreaterThan(150);
    for (const u of plain) {
      expect(u.agentic.agents, u.slug).toEqual([]);
      expect(u.agentic.tools, u.slug).toEqual([]);
      const agentOption = u.agentic.decision.options.find((o) => o.approach === 'agentic-workflow')!;
      expect(agentOption.verdict, u.slug).toBe('rejected');
      expect(agentOption.reason, u.slug).toMatch(/^Rejected:/);
      expect(u.agentic.decision.revisitWhen.length, u.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps the card-fraud and sepsis blueprints agentic (they have review queues) and the SKU-store forecast plain', () => {
    const fit = (slug: string) => all.find((u) => u.slug === slug)!.agentic.fit;
    expect(isAgentic(fit('fintech/real-time-card-upi-fraud-detection'))).toBe(true);
    expect(isAgentic(fit('healthcare/sepsis-early-warning'))).toBe(true);
    expect(isAgentic(fit('retail/demand-forecasting-sku-store'))).toBe(false);
  });

  it('never puts an agent in the decision path of a sub-100ms use case', () => {
    for (const u of agentic.filter((x) => x.latencySLA === 'sub-10ms' || x.latencySLA === 'sub-100ms')) {
      expect(u.agentic.fit, u.slug).not.toBe('core');
      expect(u.agentic.budget.map((b) => b.value).join(' '), u.slug).toMatch(/never in it|asynchronous/i);
    }
  });

  it('is specific: uses its own constraints, edge cases, guardrail metric and pipeline stages', () => {
    for (const u of agentic) {
      const text = JSON.stringify(u.agentic);
      expect(text, u.slug).toContain(u.productionEdgeCases[0]!.scenario);
      expect(text, u.slug).toContain(u.problemFormulation.constraints[0]!);
      expect(text, u.slug).toContain(u.evaluationAndMetrics.onlineBusinessMetrics[1]!);
    }
    for (const u of plain) {
      const text = JSON.stringify(u.agentic);
      expect(text, u.slug).toContain(u.title);
      expect(text, u.slug).toContain(u.evaluationAndMetrics.onlineBusinessMetrics[1]!);
    }
  });

  it('has a human approval gate for every write tool and an autonomy ladder L0 to L3 when agents are recommended', () => {
    for (const u of agentic) {
      expect(
        u.agentic.autonomy.map((a) => a.level),
        u.slug,
      ).toEqual(['L0', 'L1', 'L2', 'L3']);
      expect(
        u.agentic.tools.some((t) => t.access === 'write'),
        u.slug,
      ).toBe(true);
      expect(u.agentic.sequence, u.slug).toContain('Human approver');
    }
  });

  it('shows a no-agent architecture instead, with an exception queue and a log, when agents are not recommended', () => {
    for (const u of plain) {
      expect(u.agentic.architecture, u.slug).toContain('Exception queue');
      expect(u.agentic.sequence, u.slug).toContain('no agent sits anywhere');
    }
  });

  it('contains no unresolved placeholders', () => {
    for (const u of all)
      expect(JSON.stringify(u.agentic), u.slug).not.toMatch(/\b(undefined|NaN|Infinity)\b|\[object|\$\{/);
  });
});
