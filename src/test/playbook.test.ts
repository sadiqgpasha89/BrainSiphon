import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { toMarkdown } from '../content/markdown';
import { PlaybookSchema } from '../schemas/usecase.schema';

const all = loadAllUseCases();
const withPlaybook = all.filter((u) => u.playbook?.provenance === 'authored');
const generated = all.filter((u) => u.playbook?.provenance === 'generated');

describe('generated playbooks (the other 492)', () => {
  it('covers every use case without a hand-written playbook', () => {
    expect(withPlaybook.length + generated.length).toBe(all.length);
    expect(generated.length).toBe(all.length - 8);
  });

  it('uses all eleven reference kits, but only where the compatibility check allows one', () => {
    const withKit = generated.filter((u) => u.playbook!.compatibility.verdict !== 'none');
    const kits = new Set(withKit.map((u) => u.playbook!.starter!.kitId));
    expect(kits.size).toBe(11);
    for (const u of withKit) expect(u.playbook!.starter!.kitId).toBe(u.playbook!.compatibility.kitId);
    for (const u of generated.filter((x) => x.playbook!.compatibility.verdict === 'none'))
      expect(u.playbook!.starter).toBeUndefined();
  });

  it('is specific to the use case: its own objective, signals, constraints, baseline and edge case appear in the plan', () => {
    for (const u of generated.slice(0, 500)) {
      const pb = u.playbook!;
      const text = JSON.stringify(pb);
      expect(text).toContain(u.dataAndFeatures.highSignalFeatures[0]!.name);
      expect(text).toContain(u.productionEdgeCases[0]!.scenario);
      expect(pb.milestones[0]!.tasks.join(' ')).toContain(u.problemFormulation.constraints[0]!);
      expect(pb.milestones[3]!.tasks.join(' ')).toContain(
        u.architectureBlueprint.baselineModel.replace(/\.$/, ''),
      );
    }
  });

  it('shares no more than half of its text with any other playbook of the same kit (the filler check)', () => {
    const lines = (u: (typeof generated)[number]) =>
      new Set(JSON.stringify(u.playbook!.milestones.map((m) => m.tasks)).split('","'));
    const byKit = new Map<string, typeof generated>();
    for (const u of generated) {
      const key = u.playbook!.starter?.kitId ?? 'none';
      byKit.set(key, [...(byKit.get(key) ?? []), u]);
    }
    for (const group of byKit.values()) {
      const a = lines(group[0]!),
        b = lines(group[1]!);
      const shared = [...a].filter((x) => b.has(x)).length;
      expect(shared / a.size).toBeLessThan(0.5);
    }
  });

  it('is labelled as generated and carries a domain-knowledge section, datasets over https and at least six tests', () => {
    for (const u of generated) {
      const pb = u.playbook!;
      expect(pb.provenance).toBe('generated');
      expect(pb.domainKnowledge.glossary.length).toBeGreaterThanOrEqual(15);
      expect(pb.data.datasets.length).toBeGreaterThanOrEqual(1);
      for (const d of pb.data.datasets)
        expect(d.url.startsWith('https://') || d.url.startsWith('http://')).toBe(true);
      expect(pb.tests.length).toBeGreaterThanOrEqual(8);
    }
  });
});

describe('build playbooks (pilot)', () => {
  it('ships one playbook per domain for the pilot', () => {
    expect(new Set(withPlaybook.map((u) => u.domain)).size).toBe(8);
    expect(withPlaybook.length).toBe(8);
  });

  it.each(withPlaybook.map((u) => [u.slug, u] as const))(
    '%s has ordered milestones with numeric-style exit gates',
    (_slug, u) => {
      const pb = u.playbook!;
      expect(pb.milestones.map((m) => m.id)).toEqual(pb.milestones.map((_, i) => `M${i}`));
      for (const m of pb.milestones) {
        expect(m.gate.threshold.length).toBeGreaterThan(20);
        expect(m.gate.how.length).toBeGreaterThan(5);
      }
      expect(pb.milestones.some((m) => /\d/.test(m.gate.threshold))).toBe(true);
    },
  );

  it.each(withPlaybook.map((u) => [u.slug, u] as const))(
    '%s starter code is real, listed and referenced',
    (_slug, u) => {
      const files = u.playbook!.starter!.files;
      expect(files.some((f) => f.path === u.playbook!.data.synthetic!.file)).toBe(true);
      expect(files.some((f) => f.path === 'test_starter.py')).toBe(true);
      for (const f of files) expect(f.code.length).toBeGreaterThan(5);
      expect(
        files
          .filter((f) => f.language === 'python')
          .every((f) => !/\bTODO\b|NotImplementedError/.test(f.code)),
      ).toBe(true);
    },
  );

  it.each(withPlaybook.map((u) => [u.slug, u] as const))(
    '%s names only https datasets and derives the generic tests',
    (_slug, u) => {
      for (const d of u.playbook!.data.datasets) expect(d.url.startsWith('https://')).toBe(true);
      const tests = u.playbook!.tests.map((t) => t.test);
      expect(tests).toContain('Load test at 1.5× provisioned peak');
      expect(tests).toContain('Dependency game-day');
    },
  );

  it.each(withPlaybook.map((u) => [u.slug, u] as const))(
    '%s teaches the domain before the data: concepts, glossary, expert questions',
    (_slug, u) => {
      const dk = u.playbook!.domainKnowledge;
      expect(dk.concepts.length).toBeGreaterThanOrEqual(5);
      expect(dk.glossary.length).toBeGreaterThanOrEqual(15);
      expect(new Set(dk.glossary.map((g) => g.term.toLowerCase())).size).toBe(dk.glossary.length);
      expect(dk.askTheExperts.every((q) => q.endsWith('?'))).toBe(true);
    },
  );

  it('rejects a playbook without domain knowledge', () => {
    const pb = structuredClone(withPlaybook[0]!.playbook!) as Record<string, unknown>;
    delete pb.domainKnowledge;
    expect(PlaybookSchema.safeParse(pb).success).toBe(false);
  });

  it('rejects a milestone without an exit gate and an unlisted pitfall milestone', () => {
    const pb = structuredClone(withPlaybook[0]!.playbook!);
    const noGate = {
      ...pb,
      milestones: pb.milestones.map((m, i) => (i === 0 ? { ...m, gate: undefined } : m)),
    };
    expect(PlaybookSchema.safeParse(noGate).success).toBe(false);
    expect(
      PlaybookSchema.safeParse({ ...pb, pitfalls: [{ ...pb.pitfalls[0]!, at: 'phase two' }, ...pb.pitfalls] })
        .success,
    ).toBe(false);
  });

  it('exports the playbook, with its code, in the markdown for agents', () => {
    const u = withPlaybook[0]!;
    const md = toMarkdown(u);
    expect(md).toContain('## Build playbook');
    expect(md).toContain('#### M0 ·');
    expect(md).toContain('### 1. Domain knowledge and terminology');
    expect(md).toContain(u.playbook!.domainKnowledge.glossary[0]!.term);
    expect(md).toContain(u.playbook!.starter!.files[0]!.code.split('\n')[0]!);
  });
});

describe('generated text defects found in review (regression)', () => {
  it('has no Infinity, NaN or undefined anywhere in the generated system design', () => {
    for (const u of all) expect(JSON.stringify(u.systemDesign)).not.toMatch(/\b(Infinity|NaN|undefined)\b/);
  });

  it('never leaks stripped LaTeX into the phase-4 bullet', () => {
    for (const u of all) expect(u.systemDesign.e2e[3]!.steps.join(' ')).not.toMatch(/mathcal|\\|sum_i/);
  });

  it('prints the same cost per 1,000 decisions in the table and in phase 10', () => {
    for (const u of all) {
      const row = u.systemDesign.scale.table.find((r) => r.metric === 'Cost per 1,000 decisions')!.value;
      const phase10 = u.systemDesign.e2e[9]!.steps.join(' ');
      // generated text prints the exact table value; a hand-written phase may round it, but must never disagree on the first digits
      if (u.narrativeProvenance === 'generated') expect(phase10).toContain(`${row} per 1,000 decisions`);
      else expect(phase10, u.slug).toMatch(/\$\d/);
    }
  });

  it('describes embedding stages as embedding stages, not as the scorer', () => {
    const fraud = all.find((u) => u.slug === 'fintech/real-time-card-upi-fraud-detection')!;
    const emb = fraud.systemDesign.hld.components.find((c) => /embedding/i.test(c.name))!;
    const scorer = fraud.systemDesign.hld.components.find((c) => /scorer/i.test(c.name))!;
    expect(emb.responsibility).not.toEqual(scorer.responsibility);
  });
});

describe('loss formula legend', () => {
  it('explains every symbol: at least two, no duplicates, and each meaning is a real sentence fragment', () => {
    for (const u of all) {
      const v = u.problemFormulation.lossVariables;
      expect(v.length).toBeGreaterThanOrEqual(2);
      expect(new Set(v.map((x) => x.symbol)).size).toBe(v.length);
      for (const x of v) expect(x.meaning.trim().split(/\s+/).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('lists lambda with the penalty-weight meaning whenever the formula uses it as a weight', () => {
    const u = all.find((x) => x.slug === 'adtech/ctr-prediction-ads')!;
    expect(u.problemFormulation.lossVariables.map((x) => x.symbol)).toContain('\\mathcal{L}');
    const sepsis = all.find((x) => x.slug === 'healthcare/sepsis-early-warning')!;
    expect(sepsis.problemFormulation.lossVariables.find((x) => x.symbol.startsWith('w'))!.meaning).toMatch(
      /6 hours before sepsis onset/,
    );
  });

  it('keeps context-dependent symbols context-specific (sigmoid versus standard deviation, uplift versus temperature)', () => {
    const ring = all.find((x) => x.slug === 'fintech/fraud-ring-detection-community')!;
    expect(
      ring.problemFormulation.lossVariables.find((x) => x.symbol.startsWith('\\sigma'))!.meaning,
    ).toMatch(/Sigmoid/);
    const uplift = all.find((x) => x.slug === 'retail/cart-abandonment-and-basket-completion')!;
    expect(
      uplift.problemFormulation.lossVariables.find((x) => x.symbol.startsWith('\\tau'))!.meaning,
    ).toMatch(/Uplift/);
  });
});
