import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { toMarkdown } from '../content/markdown';

const all = loadAllUseCases();

describe('use-case-specific problem, solution and end-to-end text', () => {
  it('keeps almost no end-to-end step word for word identical across use cases', () => {
    const seen = new Map<string, number>();
    for (const u of all)
      for (const s of new Set(u.systemDesign.e2e.flatMap((p) => p.steps)))
        seen.set(s, (seen.get(s) ?? 0) + 1);
    let total = 0;
    let shared = 0;
    for (const u of all)
      for (const s of u.systemDesign.e2e.flatMap((p) => p.steps)) {
        total++;
        if ((seen.get(s) ?? 0) > 1) shared++;
      }
    expect(shared / total).toBeLessThan(0.03);
  });

  it('gives every phase deliverable that names its own use case, so none is shared', () => {
    const seen = new Set<string>();
    for (const u of all)
      for (const p of u.systemDesign.e2e) {
        expect(seen.has(p.deliverable), `${u.slug} phase ${p.phase}`).toBe(false);
        seen.add(p.deliverable);
      }
  });

  it('builds the problem statement from the use case itself', () => {
    for (const u of all) {
      const ps = JSON.stringify(u.problemStatement);
      expect(ps, u.slug).toContain(u.evaluationAndMetrics.onlineBusinessMetrics[0]!);
      expect(u.problemStatement.situation, u.slug).toContain(u.problemFormulation.constraints[0]!);
    }
    const texts = new Set(all.map((u) => u.problemStatement.whyHard));
    expect(texts.size).toBe(all.length);
  });

  it('builds the solution approach from its baseline, features and edge cases', () => {
    for (const u of all) {
      const sa = JSON.stringify(u.solutionApproach);
      expect(sa, u.slug).toContain(u.dataAndFeatures.highSignalFeatures[0]!.name);
      expect(sa, u.slug).toContain(u.dataAndFeatures.noisyFeaturesToDrop[0]!.name);
      expect(u.solutionApproach.moves.length, u.slug).toBeGreaterThanOrEqual(5);
    }
  });

  it('explains every pipeline stage of the architecture in this use case', () => {
    for (const u of all) {
      const stages = u.architectureRationale.map((r) => r.stage);
      const comps = u.systemDesign.hld.components.map((c) => c.name);
      for (const s of stages) expect(comps, u.slug).toContain(s);
      expect(new Set(u.architectureRationale.map((r) => r.carries)).size, u.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it('exports the new sections to markdown', () => {
    const md = toMarkdown(all[0]!, 'https://x.test');
    for (const h of ['## Problem statement', '## Solution approach', 'Why each stage exists here'])
      expect(md).toContain(h);
  });
});
