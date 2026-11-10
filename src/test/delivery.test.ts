import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ALL_STEPS,
  BLUEPRINT_ANCHORS,
  DELIVERY_PHASES,
  MONITORING,
  PARTY_IDS,
  raciFor,
  stepInvolves,
} from '../content/delivery';
import { deliveryMarkdown } from '../content/delivery-markdown';
import { LIFECYCLE_PHASES, ROLE_IDS, ROLE_LIFECYCLE, SECTION_GROUPS, SECTION_IDS } from '../lib/roles';

describe('delivery guide', () => {
  it('uses the site lifecycle: the same seven phases in the same order', () => {
    expect(DELIVERY_PHASES.map((p) => p.id)).toEqual(LIFECYCLE_PHASES.map((p) => p.id));
    DELIVERY_PHASES.forEach((p, i) => expect(p.n).toBe(i));
  });

  it('numbers every step by its phase, with no gaps or repeats', () => {
    for (const p of DELIVERY_PHASES)
      expect(p.steps.map((s) => s.id)).toEqual(p.steps.map((_, i) => `${p.n}.${i + 1}`));
    expect(new Set(ALL_STEPS.map((s) => s.id)).size).toBe(ALL_STEPS.length);
  });

  it('gives every step an owner, collaborators, a time, instructions, an output and a place to read', () => {
    for (const s of ALL_STEPS) {
      expect(PARTY_IDS, s.id).toContain(s.owner);
      expect(s.with.length, s.id).toBeGreaterThan(0);
      for (const w of s.with) expect(PARTY_IDS, `${s.id} with ${w}`).toContain(w);
      expect(s.with, `${s.id} lists its owner as a collaborator`).not.toContain(s.owner);
      expect(new Set(s.with).size, s.id).toBe(s.with.length);
      expect(s.when.length, s.id).toBeGreaterThan(3);
      expect(s.how.length, s.id).toBeGreaterThanOrEqual(2);
      expect(s.output.length, s.id).toBeGreaterThan(10);
      expect(s.read.length, s.id).toBeGreaterThan(0);
      for (const a of s.read) expect(Object.keys(BLUEPRINT_ANCHORS), `${s.id} reads ${a}`).toContain(a);
    }
  });

  it('points at blueprint sections that exist', () => {
    const sections = new Set<string>(SECTION_IDS);
    const prefix: Record<string, string> = {
      disc: 'discovery',
      ent: 'enterprise',
      gov: 'governance',
      xp: 'experimentation',
      mt: 'metrics',
      mlops: 'mlops',
      pb: 'playbook',
    };
    for (const a of Object.keys(BLUEPRINT_ANCHORS)) {
      const section = sections.has(a) ? a : prefix[a.split('-')[0]!];
      expect(section && sections.has(section), `${a} belongs to no blueprint section`).toBe(true);
    }
  });

  it('ends every phase in a gate signed by someone, and nobody signs alone for a phase they lead', () => {
    for (const p of DELIVERY_PHASES) {
      expect(p.gate.checks.length, p.id).toBeGreaterThanOrEqual(5);
      expect(p.gate.signedBy.length, p.id).toBeGreaterThanOrEqual(2);
      expect(p.traps.length, p.id).toBeGreaterThanOrEqual(4);
      expect(
        p.steps.some((s) => s.owner === p.lead),
        `${p.id} lead owns no step`,
      ).toBe(true);
    }
  });

  it('covers every role responsibility the role lenses list, phase by phase', () => {
    for (const role of ROLE_IDS)
      for (const p of DELIVERY_PHASES)
        if (ROLE_LIFECYCLE[role][p.id])
          expect(
            p.steps.some((s) => stepInvolves(s, role)),
            `${role} has a Phase ${p.n} responsibility but appears in no step of it`,
          ).toBe(true);
  });

  it('derives a RACI with exactly one accountable party per phase and a part for every party', () => {
    for (const p of DELIVERY_PHASES) {
      const cells = PARTY_IDS.map((id) => raciFor(p, id));
      expect(cells.filter((c) => c === 'A' || c === 'A/R').length, p.id).toBe(1);
      expect(cells.filter((c) => c === 'R' || c === 'A/R').length, p.id).toBeGreaterThan(0);
    }
    for (const id of PARTY_IDS)
      expect(
        DELIVERY_PHASES.some((p) => raciFor(p, id) !== ''),
        `${id} has no part anywhere`,
      ).toBe(true);
    // the delivery lead calls every gate review up to handover, so is never absent before Phase 6
    for (const p of DELIVERY_PHASES.slice(0, 6)) expect(raciFor(p, 'delivery-lead'), p.id).not.toBe('');
  });

  it('gives every monitoring layer an owner who acts in Phase 6', () => {
    const p6 = DELIVERY_PHASES.at(-1)!;
    for (const m of MONITORING)
      expect(
        p6.steps.some((s) => stepInvolves(s, m.owner)),
        m.layer,
      ).toBe(true);
  });

  it('keeps docs/DELIVERY_GUIDE.md in step with the source (run `npm run guide:build`)', () => {
    const committed = readFileSync(join(process.cwd(), 'docs', 'DELIVERY_GUIDE.md'), 'utf8');
    expect(committed).toBe(deliveryMarkdown());
  });

  it('groups the blueprint sections without dropping, repeating or reordering any', () => {
    expect(SECTION_GROUPS.flatMap((g) => g.sections)).toEqual([...SECTION_IDS]);
  });

  it('writes every step, gate and party into the markdown', () => {
    const md = deliveryMarkdown();
    for (const s of ALL_STEPS) expect(md).toContain(`### ${s.id} ${s.title}`);
    for (const p of DELIVERY_PHASES) expect(md).toContain(`### ${p.gate.name}`);
    expect(md.startsWith('# BrainSiphon delivery guide')).toBe(true);
  });
});
