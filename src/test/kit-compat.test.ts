import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { checkKitCompatibility, KNOWN_CASES } from '../content/kit-gate';
import { foreignTerms } from '../content/playbook-gen';
import { toMarkdown } from '../content/markdown';
import { COMPLETION_STATES } from '../lib/artifacts';
import { NO_KIT_STATEMENT } from '../lib/problem-types';
import { CompletionSchema, PlaybookSchema } from '../schemas/usecase.schema';

const all = loadAllUseCases();
const bySlug = (s: string) => all.find((u) => u.slug === s)!;
const pbOf = (s: string) => bySlug(s).playbook!;

describe('starter-kit compatibility gate', () => {
  it('passes for all 500 blueprints and keeps the known cases decided the same way', () => {
    expect(checkKitCompatibility(all)).toEqual([]);
    for (const slug of Object.keys(KNOWN_CASES))
      expect(pbOf(slug).compatibility.verdict, slug).toBe(KNOWN_CASES[slug]!.verdict);
  });

  it('gives every blueprint a verdict from exactly three conditions, with all eight dimensions compared', () => {
    const counts = { exact: 0, adaptable: 0, none: 0 };
    for (const u of all) {
      const c = u.playbook!.compatibility;
      counts[c.verdict]++;
      expect(
        c.dimensions.map((d) => d.dimension),
        u.slug,
      ).toEqual(['problem', 'label', 'validation', 'metrics', 'data', 'model', 'serving', 'integrations']);
    }
    // a gate that never refuses, or never accepts, is not checking anything
    expect(counts.none).toBeGreaterThan(20);
    expect(counts.adaptable).toBeGreaterThan(100);
    expect(counts.exact).toBeGreaterThan(40);
  });

  it("never substitutes one task's kit for another: a kit is shipped only for a problem its contract claims", () => {
    // recompute: tamper with a verdict and the gate must object
    const bad = structuredClone(all);
    const u = bad.find((x) => x.slug === 'fintech/credit-default-survival-modeling')!;
    const real = bad.find((x) => x.slug === 'fintech/real-time-card-upi-fraud-detection')!;
    void real;
    u.playbook!.compatibility = {
      ...u.playbook!.compatibility,
      verdict: 'exact',
      source: 'reference-kit',
      kitId: 'tabular',
      kitLabel: 'Event-level detection with delayed labels',
      blockers: [],
    };
    expect(checkKitCompatibility(bad).join('\n')).toMatch(/credit-default-survival-modeling/);
  });
});

describe('Credit Default Survival Modeling (the mismatch in the review)', () => {
  const pb = pbOf('fintech/credit-default-survival-modeling');
  it('is classified as survival analysis and gets no starter kit', () => {
    expect(pb.compatibility.problemType).toBe('survival-time-to-event');
    expect(pb.compatibility.verdict).toBe('none');
    expect(pb.compatibility.statement).toContain(NO_KIT_STATEMENT);
    expect(pb.starter).toBeUndefined();
    expect(pb.data.synthetic).toBeUndefined();
    expect(pb.data.sample).toBeUndefined();
    expect(pb.compatibility.evaluated.every((e) => e.verdict === 'none')).toBe(true);
  });

  it('says why: censoring and time-to-event cannot be represented, and names the closest kit as background only', () => {
    expect(pb.compatibility.blockers.join(' ')).toMatch(/censor/i);
    expect(pb.compatibility.closest?.kitId).toBe('tabular');
    expect(pb.compatibility.closest?.whyNot).toMatch(/censored/i);
    const rows = Object.fromEntries(pb.compatibility.dimensions.map((d) => [d.dimension, d]));
    expect(rows.problem!.status).toBe('mismatch');
    expect(rows.label!.status).toBe('mismatch');
    expect(rows.metrics!.needs).toMatch(/time-dependent AUC/i);
  });

  it('does not carry card-fraud terminology into its plan', () => {
    const text = JSON.stringify({ ...pb, compatibility: undefined });
    expect(text).not.toMatch(/chargeback|mule|card authori[sz]ation|merchant|fraud/i);
    expect(foreignTerms(text, 'time to default survival', pb.compatibility.problemType)).toEqual([]);
  });

  it('is honest in every milestone: guidance up to M4, your platform for M5 and M6, completion guidance-only', () => {
    expect(pb.milestones.map((m) => m.delivery)).toEqual([
      'guidance',
      'guidance',
      'guidance',
      'guidance',
      'guidance',
      'your-platform',
      'your-platform',
    ]);
    expect(pb.completion.reached).toBe('guidance-only');
    expect(pb.completion.states.every((s) => s.status === 'not-reached')).toBe(true);
    expect(pb.workedExample.basis).toBe('blueprint-only');
    expect(JSON.stringify(pb.workedExample)).not.toMatch(/On the kit/);
    expect(pb.milestones.filter((m) => /\d/.test(m.gate.threshold)).length).toBeGreaterThanOrEqual(5);
  });
});

describe('Personalised Product Search Ranking (a partial match)', () => {
  const pb = pbOf('retail/personalized-search-ranking');
  it('adapts the next-item kit and names exactly what is missing', () => {
    expect(pb.compatibility.verdict).toBe('adaptable');
    expect(pb.compatibility.kitId).toBe('recommender');
    expect(pb.compatibility.problemType).toBe('search-ranking');
    const mods = pb.compatibility.modifications.join(' ');
    expect(mods).toMatch(/query/i);
    expect(mods).toMatch(/graded relevance/i);
    expect(mods).toMatch(/multi-objective/i);
    expect(pb.starter).toBeDefined();
    expect(pb.milestones.slice(1, 5).every((m) => m.delivery === 'adapt-reference')).toBe(true);
    expect(pb.completion.reached).toBe('prototype-ready');
    expect(pb.completion.conditional).toBe(true);
  });
});

describe('In-App AI Copilot (a partial match)', () => {
  const pb = pbOf('saas/in-app-ai-copilot');
  it('adapts the read-only agent kit: writes, user authority and verification are the gap', () => {
    expect(pb.compatibility.verdict).toBe('adaptable');
    expect(pb.compatibility.kitId).toBe('llm-agent');
    expect(pb.compatibility.problemType).toBe('agentic-write-actions');
    const mods = pb.compatibility.modifications.join(' ');
    expect(mods).toMatch(/write tools/i);
    expect(mods).toMatch(/on the user's behalf/i);
    expect(mods).toMatch(/verification|read the system state back/i);
    expect(pb.compatibility.dimensions.find((d) => d.dimension === 'integrations')!.status).toBe('adapt');
  });
});

describe('the fraud pilot: where the running code stops', () => {
  const pb = pbOf('fintech/real-time-card-upi-fraud-detection');
  it("is an exact match with its own starter, and says M1 to M4 run while M5 and M6 are the engineer's platform", () => {
    expect(pb.compatibility.verdict).toBe('exact');
    expect(pb.compatibility.source).toBe('authored-starter');
    expect(pb.milestones.map((m) => m.delivery)).toEqual([
      'guidance',
      'executable-reference',
      'executable-reference',
      'executable-reference',
      'executable-reference',
      'your-platform',
      'your-platform',
    ]);
    expect(pb.completion.boundary).toMatch(/M1–M4/);
    expect(pb.completion.boundary).toMatch(/M5 and M6\) need your platform/);
    expect(pb.completion.reached).toBe('evaluation-ready');
    expect(pb.completion.conditional).toBe(false);
  });
  it('shows the ladder: prototype and evaluation reached, shadow and production not, with what is still needed', () => {
    expect(pb.completion.states.map((s) => [s.state, s.status])).toEqual([
      ['prototype-ready', 'reached'],
      ['evaluation-ready', 'reached'],
      ['shadow-ready', 'not-reached'],
      ['production-ready', 'not-reached'],
    ]);
    expect(pb.completion.states[2]!.stillNeeded.join(' ')).toMatch(/M5/);
    expect(pb.completion.states[3]!.stillNeeded.join(' ')).toMatch(/M6/);
  });
});

describe('completion states and artifact labels', () => {
  it('never claims shadow-ready or production-ready for any use case', () => {
    for (const u of all)
      expect(['guidance-only', 'prototype-ready', 'evaluation-ready'], u.slug).toContain(
        u.playbook!.completion.reached,
      );
  });

  it("makes M5 and M6 the engineer's platform work for every use case, whatever the kit", () => {
    for (const u of all)
      for (const m of u.playbook!.milestones.filter((x) => x.id === 'M5' || x.id === 'M6'))
        expect(m.delivery, `${u.slug} ${m.id}`).toBe('your-platform');
  });

  it('labels every code block: pseudocode and illustrations in the design, executable reference code in starters, production code nowhere', () => {
    for (const u of all) {
      expect(u.systemDesign.lld.artifacts.algorithm, u.slug).toBe('pseudocode');
      expect(Object.values(u.systemDesign.lld.artifacts)).not.toContain('production-code');
      for (const f of u.playbook!.starter?.files ?? [])
        expect(f.kind, `${u.slug}:${f.path}`).toBe('executable-reference');
    }
  });

  it('applies the ladder in order and rejects an inconsistent record', () => {
    const ok = pbOf('fintech/real-time-card-upi-fraud-detection').completion;
    expect(CompletionSchema.safeParse(ok).success).toBe(true);
    expect(CompletionSchema.safeParse({ ...ok, reached: 'production-ready' }).success).toBe(false);
    expect(ok.states.map((s) => s.state)).toEqual([...COMPLETION_STATES]);
    const skipped = {
      ...ok,
      states: ok.states.map((s, i) => (i === 2 ? { ...s, status: 'reached', stillNeeded: [] } : s)),
    };
    expect(CompletionSchema.safeParse(skipped).success).toBe(false);
  });

  it('rejects a playbook that ships a kit without a compatible verdict', () => {
    const none = structuredClone(pbOf('fintech/credit-default-survival-modeling'));
    const withKit = structuredClone(pbOf('fintech/real-time-card-upi-fraud-detection'));
    expect(PlaybookSchema.safeParse({ ...none, starter: withKit.starter }).success).toBe(false);
    const noStarter = { ...withKit, starter: undefined };
    expect(PlaybookSchema.safeParse(noStarter).success).toBe(false);
  });
});

describe('exports', () => {
  it('puts the verdict, the ladder, the fit table and the artifact labels in the markdown twin', () => {
    const md = toMarkdown(bySlug('fintech/credit-default-survival-modeling'));
    expect(md).toContain(NO_KIT_STATEMENT);
    expect(md).toContain('### Fit with the starter kit');
    expect(md).toContain('What the artifact labels mean');
    expect(md).toContain('Artifact kind: Pseudocode');
    expect(md).toContain('**None.**');
    const adapt = toMarkdown(bySlug('retail/personalized-search-ranking'));
    expect(adapt).toContain('**Modifications required first**');
    expect(adapt).toContain('Artifact kind: Executable reference code');
  });
});
