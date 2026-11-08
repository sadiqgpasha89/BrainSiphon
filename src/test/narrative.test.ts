import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { toMarkdown } from '../content/markdown';

const all = loadAllUseCases();
// hand-written narratives are free prose; the checks that look for the generator's own phrasing apply to the rest
const generatedOnly = all.filter((u) => u.narrativeProvenance === 'generated');

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
    for (const u of generatedOnly) {
      const ps = JSON.stringify(u.problemStatement);
      expect(ps, u.slug).toContain(u.evaluationAndMetrics.onlineBusinessMetrics[0]!);
      expect(u.problemStatement.situation, u.slug).toContain(u.problemFormulation.constraints[0]!);
    }
    const texts = new Set(all.map((u) => u.problemStatement.whyHard));
    expect(texts.size).toBe(all.length);
  });

  it('builds the solution approach from its baseline, features and edge cases', () => {
    for (const u of generatedOnly) {
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

  it('marks exactly the 8 pilots as hand-written and every other use case as generated', () => {
    const authored = all
      .filter((u) => u.narrativeProvenance === 'authored')
      .map((u) => u.slug)
      .sort();
    const withPlaybook = all
      .filter((u) => u.playbook?.provenance === 'authored')
      .map((u) => u.slug)
      .sort();
    expect(authored).toHaveLength(8);
    expect(authored).toEqual(withPlaybook);
    expect(all.filter((u) => u.narrativeProvenance === 'generated')).toHaveLength(all.length - 8);
  });

  it('gives each hand-written narrative a rationale row per stage and ten numbered phases', () => {
    for (const u of all.filter((x) => x.narrativeProvenance === 'authored')) {
      expect(
        u.architectureRationale.map((r) => r.stage),
        u.slug,
      ).toEqual(
        u.systemDesign.hld.components.slice(1, 1 + u.architectureRationale.length).map((c) => c.name),
      );
      expect(
        u.systemDesign.e2e.map((p) => p.phase),
        u.slug,
      ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(u.solutionApproach.moves.length, u.slug).toBeGreaterThanOrEqual(5);
    }
  });
});
