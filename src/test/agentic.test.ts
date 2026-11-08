import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { AgenticSchema } from '../schemas/usecase.schema';

const all = loadAllUseCases();

describe('agentic solutioning', () => {
  it('exists, and validates, for every use case', () => {
    for (const u of all) expect(AgenticSchema.safeParse(u.agentic).success, u.slug).toBe(true);
  });

  it('never puts an agent in the decision path of a sub-100ms use case', () => {
    for (const u of all.filter((x) => x.latencySLA === 'sub-10ms' || x.latencySLA === 'sub-100ms')) {
      expect(u.agentic.fit, u.slug).not.toBe('core');
      expect(u.agentic.budget.map((b) => b.value).join(' '), u.slug).toMatch(/never in it|asynchronous/i);
    }
  });

  it('is specific: uses its own constraints, edge cases, guardrail metric and pipeline stages', () => {
    for (const u of all) {
      const text = JSON.stringify(u.agentic);
      expect(text, u.slug).toContain(u.productionEdgeCases[0]!.scenario);
      expect(text, u.slug).toContain(u.problemFormulation.constraints[0]!);
      expect(text, u.slug).toContain(u.evaluationAndMetrics.onlineBusinessMetrics[1]!);
    }
  });

  it('has a human approval gate for every write tool and an autonomy ladder L0 to L3', () => {
    for (const u of all) {
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

  it('contains no unresolved placeholders', () => {
    for (const u of all)
      expect(JSON.stringify(u.agentic), u.slug).not.toMatch(/\b(undefined|NaN|Infinity)\b|\[object|\$\{/);
  });
});
