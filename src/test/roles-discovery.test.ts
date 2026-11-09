import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { toMarkdown } from '../content/markdown';
import { DISCOVERY_QUESTION_IDS } from '../schemas/usecase.schema';
import {
  LIFECYCLE_PHASES,
  ROLE_HANDOFFS,
  ROLE_IDS,
  ROLE_LIFECYCLE,
  ROLE_META,
  ROLE_SECTIONS,
  SECTION_IDS,
  combineRoles,
} from '../lib/roles';

const all = loadAllUseCases();

describe('the fourteen-role model', () => {
  it('has exactly the fourteen roles, each with a unique key', () => {
    expect(ROLE_IDS).toHaveLength(14);
    expect(ROLE_IDS).toEqual(
      expect.arrayContaining([
        'business-analyst',
        'data-analyst',
        'ml-engineer',
        'platform-engineer',
        'sre-devops-engineer',
        'security-engineer',
        'qa-test-engineer',
      ]),
    );
    const keys = ROLE_IDS.map((r) => ROLE_META[r].key);
    expect(new Set(keys).size).toBe(14);
    expect(keys).not.toContain('0');
    expect(keys.filter((k) => !/^[1-9a-e]$/.test(k))).toEqual([]);
  });

  it('gives every role at least three specialised items on every blueprint', () => {
    for (const u of all) {
      expect(u.roleLenses.map((l) => l.role)).toEqual([...ROLE_IDS]);
      for (const l of u.roleLenses) expect(l.items.length, `${u.slug}:${l.role}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('has a lifecycle entry for every role and the Phase 0 section in every role list', () => {
    for (const r of ROLE_IDS) {
      expect(Object.keys(ROLE_LIFECYCLE[r]).length, r).toBeGreaterThan(0);
      expect(ROLE_SECTIONS[r], r).toContain('discovery');
    }
    expect(SECTION_IDS[0]).toBe('discovery');
    expect(LIFECYCLE_PHASES[0].mandatory).toBe(true);
  });

  it('only lists handoffs between known roles', () => {
    for (const h of ROLE_HANDOFFS) {
      expect(ROLE_IDS).toContain(h.from);
      expect(ROLE_IDS).toContain(h.to);
      expect(h.from).not.toBe(h.to);
    }
  });
});

describe('combining roles', () => {
  it('Data Engineer + MLOps Engineer covers data pipeline, training pipeline, deployment dependencies and operational handoffs', () => {
    const v = combineRoles(['mlops-engineer', 'data-engineer']);
    expect(v.roles).toEqual(['data-engineer', 'mlops-engineer']);
    const phaseText = (id: string) =>
      v.phases
        .find((p) => p.id === id)
        ?.items.map((i) => i.text)
        .join(' ') ?? '';
    expect(phaseText('p2')).toMatch(/ingestion|pipelines/i);
    expect(phaseText('p3')).toMatch(/training|CI\/CT/i);
    expect(v.outbound.map((h) => h.to)).toEqual(
      expect.arrayContaining(['platform-engineer', 'sre-devops-engineer']),
    );
    expect(v.outbound.find((h) => h.to === 'platform-engineer')?.artefact).toMatch(
      /deployment dependencies/i,
    );
    expect(v.outbound.find((h) => h.to === 'sre-devops-engineer')?.artefact).toMatch(/operational handoff/i);
    expect(v.internalHandoffs.map((h) => `${h.from}>${h.to}`)).toContain('data-engineer>mlops-engineer');
  });

  it('shows the union of the sections of the chosen roles, always starting with Phase 0', () => {
    const v = combineRoles(['data-engineer', 'security-engineer']);
    for (const id of [...ROLE_SECTIONS['data-engineer'], ...ROLE_SECTIONS['security-engineer']])
      expect(v.sections).toContain(id);
    expect(v.sections[0]).toBe('discovery');
    expect(v.phases[0]!.id).toBe('p0');
  });

  it('a single role gives that role alone, and nothing selected gives nothing', () => {
    expect(combineRoles(['qa-test-engineer']).roles).toEqual(['qa-test-engineer']);
    expect(combineRoles([]).phases).toEqual([]);
  });
});

describe('Phase 0: enterprise discovery and business requirements', () => {
  it('is present and complete on all blueprints', () => {
    for (const u of all) {
      const x = u.discovery;
      expect(x.status, u.slug).toBe('to-confirm');
      expect(x.questions.map((q) => q.id).sort(), u.slug).toEqual([...DISCOVERY_QUESTION_IDS].sort());
      expect(x.requirements.length, u.slug).toBeGreaterThanOrEqual(5);
      for (const r of x.requirements)
        expect(r.acceptance, `${u.slug}:${r.id}`).toMatch(/^Given .+, when .+, then /);
      expect(x.exitGate.length, u.slug).toBeGreaterThanOrEqual(6);
      expect(
        x.exitGate.every((g) => g.status === 'open'),
        u.slug,
      ).toBe(true);
      expect(
        x.raci.some((r) => r.responsible.includes('Business Analyst')),
        u.slug,
      ).toBe(true);
      expect(x.businessCase.roiFormula, u.slug).toMatch(/ROI/);
    }
  });

  it('answers the eight questions asked of every project', () => {
    const q = all[0]!.discovery.questions;
    const text = q.map((x) => x.question).join('\n');
    for (const needle of [
      'actual system user',
      'owns the business decision',
      'existing process',
      'consume the model',
      'output is wrong',
      'approves changes to business policies',
      'baseline business performance',
      'ROI',
    ])
      expect(text).toContain(needle);
  });

  it('is specific to the use case instead of one template', () => {
    const answers = (id: (typeof DISCOVERY_QUESTION_IDS)[number]) =>
      new Set(all.map((u) => u.discovery.questions.find((q) => q.id === id)!.proposedAnswer));
    // answers that come from the use case's own metrics, baseline, edge cases and stages differ per blueprint
    for (const id of ['baseline-performance', 'wrong-output', 'roi-measurement'] as const)
      expect(answers(id).size, id).toBeGreaterThan(450);
    // the consuming systems and the decision owner come from the domain, so they vary by domain at least
    expect(answers('consuming-application').size).toBeGreaterThanOrEqual(10);
    expect(new Set(all.map((u) => JSON.stringify(u.discovery.process.toBe))).size).toBeGreaterThan(450);
  });

  it('never claims a confirmed fact about a real organisation', () => {
    for (const u of all.slice(0, 50)) {
      expect(u.discovery.summary, u.slug).toMatch(/starting positions/);
      expect(JSON.stringify(u.discovery), u.slug).not.toMatch(/\b(undefined|NaN|Infinity)\b|\[object|\$\{/);
    }
  });

  it('appears first in the markdown export, before the enterprise context, and lists all fourteen roles', () => {
    const md = toMarkdown(all[0]!);
    expect(md.indexOf('## Phase 0: Enterprise discovery')).toBeGreaterThan(0);
    expect(md.indexOf('## Phase 0: Enterprise discovery')).toBeLessThan(
      md.indexOf('## Enterprise solution context'),
    );
    for (const r of ROLE_IDS) expect(md).toContain(`### ${ROLE_META[r].label}`);
    expect(md).toContain('(compulsory)');
  });
});
