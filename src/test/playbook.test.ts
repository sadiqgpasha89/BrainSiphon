import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { toMarkdown } from '../content/markdown';
import { PlaybookSchema } from '../schemas/usecase.schema';

const all = loadAllUseCases();
const withPlaybook = all.filter((u) => u.playbook);

describe('build playbooks (pilot)', () => {
  it('ships one playbook per domain for the pilot', () => {
    expect(new Set(withPlaybook.map((u) => u.domain)).size).toBe(8);
    expect(withPlaybook.length).toBeGreaterThanOrEqual(8);
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
      const files = u.playbook!.starter.files;
      expect(files.some((f) => f.path === u.playbook!.data.synthetic.file)).toBe(true);
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
    expect(md).toContain(u.playbook!.starter.files[0]!.code.split('\n')[0]!);
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
      expect(u.systemDesign.e2e[9]!.steps.join(' ')).toContain(`${row} per 1,000 decisions`);
    }
  });

  it('describes embedding stages as embedding stages, not as the scorer', () => {
    const fraud = all.find((u) => u.slug === 'fintech/real-time-card-upi-fraud-detection')!;
    const emb = fraud.systemDesign.hld.components.find((c) => /embedding/i.test(c.name))!;
    const scorer = fraud.systemDesign.hld.components.find((c) => /scorer/i.test(c.name))!;
    expect(emb.responsibility).not.toEqual(scorer.responsibility);
  });
});
