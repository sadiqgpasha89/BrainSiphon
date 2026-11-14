import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { toMarkdown } from '../content/markdown';
import {
  blueprintMaturityScorecard,
  blueprintStatuses,
  buildManifest,
  feasibilityWarnings,
  kitKeyFor,
  MATURITY_LEVELS,
  releaseOutstanding,
  releaseProblems,
  releaseReportMarkdown,
  staleRemediations,
  STATUS_LABEL,
  type GateInput,
  type KitReport,
  type ValidationReport,
} from '../content/release';
import { discoverKits } from '../content/release-io';

const all = loadAllUseCases();
const fraud = all.find((u) => u.slug === 'fintech/real-time-card-upi-fraud-detection')!;
const DIGEST = 'a'.repeat(64);
const SHA = 'b'.repeat(40);
const requiredKits = discoverKits().map((k) => k.name);

const validation: ValidationReport = {
  schemaVersion: 2,
  commit: SHA,
  dirty: false,
  contentDigest: DIGEST,
  validatedAt: '2026-11-09T10:00:00.000Z',
  useCases: all.length,
  feasibility: { checks: 10, pass: 10, notApplicable: 0, warn: 0, fail: 0 },
  warnings: 0,
};
const kits: KitReport = {
  schemaVersion: 2,
  commit: SHA,
  dirty: false,
  contentDigest: DIGEST,
  ranAt: '2026-11-09T10:05:00.000Z',
  kits: requiredKits.map((name) => ({
    name,
    status: 'passed' as const,
    seconds: 1,
    tests: { passed: 4, failed: 0, skipped: 0 },
    coveragePct: 91,
    log: `4 passed in 1.00s (${name})`,
  })),
};
const manifest = (v: ValidationReport | null = validation, k: KitReport | null = kits, deployment = true) =>
  buildManifest({
    commit: SHA,
    dirty: false,
    contentDigest: DIGEST,
    packageVersion: '1.0.0',
    now: '2026-11-09T11:00:00.000Z',
    useCases: all,
    validation: v,
    kits: k,
    deployment,
  });
const gate = (over: Partial<GateInput> = {}): GateInput => ({
  manifest: manifest(),
  validation,
  kits,
  currentDigest: DIGEST,
  currentCommit: SHA,
  currentDirty: false,
  requiredKits,
  strict: true,
  ...over,
});

describe('fraud-detection latency budget (the reviewed 8.6 ms against 8 ms defect)', () => {
  it('sums to exactly the stated p99, including the edge hop and the network reserve', () => {
    const parts = fraud.systemDesign.hld.components.filter((c) => c.latencyBudgetMs !== null);
    const sum = Math.round(parts.reduce((a, c) => a + (c.latencyBudgetMs ?? 0), 0) * 1000) / 1000;
    expect(sum).toBe(8);
    expect(parts.some((c) => /reserve/i.test(c.name))).toBe(true);
    expect(fraud.validation.feasibility.find((f) => f.check === 'End-to-end latency budget')?.status).toBe(
      'pass',
    );
  });

  it('holds for every online blueprint, not only the one that was reviewed', () => {
    const bad = all.filter((u) => u.validation.feasibility.some((f) => f.status === 'fail'));
    expect(bad.map((u) => u.slug)).toEqual([]);
  });
});

describe('manifest', () => {
  it('records commit, content version, timestamps and the status of every check', () => {
    const m = manifest();
    expect(m.sourceCommit).toBe(SHA);
    expect(m.contentVersion).toBe(`1.0.0+${DIGEST.slice(0, 12)}`);
    expect(m.validatedAt).toBe(validation.validatedAt);
    expect(m.deployedAt).toBe('2026-11-09T11:00:00.000Z');
    expect(m.checks.schema.status).toBe('passed');
    expect(m.checks.feasibility.status).toBe('passed');
    expect(m.checks.executable.status).toBe('passed');
    expect(m.checks.domainExpert.reviewed).toBe(0);
    expect(m.checks.productionEvidence.claimed).toBe(0);
  });

  it('ignores a report that was produced for different content', () => {
    const m = manifest(
      { ...validation, contentDigest: 'c'.repeat(64) },
      { ...kits, contentDigest: 'c'.repeat(64) },
    );
    expect(m.validatedAt).toBeNull();
    expect(m.checks.executable.status).toBe('not-run');
    expect(m.checks.executable.kits).toEqual([]);
  });

  it('is not a deployment unless it is built as one', () => {
    expect(manifest(validation, kits, false).deployedAt).toBeNull();
  });
});

describe('per-blueprint statuses', () => {
  it('shows five separate statuses, never one combined verdict', () => {
    const s = blueprintStatuses(fraud, manifest());
    expect(s.map((x) => x.label)).toEqual(Object.values(STATUS_LABEL));
    expect(Object.fromEntries(s.map((x) => [x.id, x.text]))).toEqual({
      schema: 'Passed',
      feasibility: 'Passed',
      synthetic: 'Passed',
      expert: 'Not reviewed',
      production: 'Not available',
    });
  });

  it('claims a passing starter only when the kit was actually run for this content', () => {
    expect(blueprintStatuses(fraud, null).find((x) => x.id === 'synthetic')?.state).toBe('not-run');
    expect(
      blueprintStatuses(fraud, manifest(validation, null)).find((x) => x.id === 'synthetic')?.state,
    ).toBe('not-run');
    const failing = manifest(validation, {
      ...kits,
      kits: kits.kits.map((k) => (k.name === kitKeyFor(fraud) ? { ...k, status: 'failed' as const } : k)),
    });
    expect(blueprintStatuses(fraud, failing).find((x) => x.id === 'synthetic')?.state).toBe('failed');
  });

  it('maps every blueprint to a kit that exists', () => {
    const missing = all.filter((u) => u.playbook && !requiredKits.includes(kitKeyFor(u))).map((u) => u.slug);
    expect(missing).toEqual([]);
  });

  it('claims no starter pass for a blueprint with no compatible kit, and flags an adaptable kit as such', () => {
    const none = all.filter((u) => u.playbook?.compatibility.verdict === 'none');
    const adaptable = all.filter((u) => u.playbook?.compatibility.verdict === 'adaptable');
    expect(none.length).toBeGreaterThan(0);
    expect(adaptable.length).toBeGreaterThan(0);
    for (const u of none) {
      expect(u.playbook?.starter, u.slug).toBeUndefined();
      const row = blueprintStatuses(u, manifest()).find((x) => x.id === 'synthetic')!;
      expect(row.state, u.slug).toBe('not-available');
      expect(row.detail, u.slug).toMatch(/No compatible executable starter kit/);
      expect(u.validation.levels.find((l) => l.level === 'synthetic-data-tested')?.state, u.slug).toBe(
        'not-yet',
      );
    }
    for (const u of adaptable.slice(0, 20)) {
      const row = blueprintStatuses(u, manifest()).find((x) => x.id === 'synthetic')!;
      expect(row.state, u.slug).toBe('passed');
      expect(row.text, u.slug).toContain('adaptable kit');
    }
  });

  it('names the kit the compatibility check chose, not the blueprint pattern', () => {
    for (const u of all) {
      const id = u.playbook?.starter?.kitId;
      if (id && u.playbook?.provenance !== 'authored') expect(kitKeyFor(u), u.slug).toBe(`kits/${id}`);
    }
  });

  it('never reports expert review or production evidence for a blueprint without a recorded one', () => {
    for (const u of all) {
      const s = blueprintStatuses(u, manifest());
      expect(s.find((x) => x.id === 'expert')?.state).toBe('not-reviewed');
      expect(s.find((x) => x.id === 'production')?.state).toBe('not-available');
    }
  });

  it('puts the same five statuses and the release in the markdown export', () => {
    const md = toMarkdown(fraud, 'https://example.test', manifest());
    for (const label of Object.values(STATUS_LABEL)) expect(md).toContain(label);
    expect(md).toContain(`Release ${manifest().contentVersion}`);
    expect(md).not.toMatch(/Verified against|Automated checks passed/);
  });
});

describe('release gate', () => {
  it('passes when the reports belong to this commit and content', () => {
    expect(releaseProblems(gate())).toEqual([]);
  });

  it('fails when the content changed after validation', () => {
    expect(releaseProblems(gate({ currentDigest: 'd'.repeat(64) })).join('\n')).toMatch(
      /different content|rebuild/,
    );
  });

  it('fails when the reports are for another commit', () => {
    expect(releaseProblems(gate({ currentCommit: 'e'.repeat(40) })).join('\n')).toMatch(
      /not .*commit|is for commit/,
    );
  });

  it('fails without a validation report or a kit report', () => {
    expect(releaseProblems(gate({ validation: null })).join('\n')).toMatch(/no validation report/);
    expect(releaseProblems(gate({ kits: null })).join('\n')).toMatch(/no kit report/);
  });

  it('fails when a starter kit failed or is missing from the report', () => {
    const failed = {
      ...kits,
      kits: kits.kits.map((k, i) => (i === 0 ? { ...k, status: 'failed' as const } : k)),
    };
    expect(releaseProblems(gate({ kits: failed })).join('\n')).toMatch(/failed/);
    const partial = { ...kits, kits: kits.kits.slice(1) };
    expect(releaseProblems(gate({ kits: partial })).join('\n')).toMatch(/missing 1 kit/);
  });

  it('fails when a feasibility check failed', () => {
    expect(
      releaseProblems(
        gate({ validation: { ...validation, feasibility: { ...validation.feasibility, fail: 1 } } }),
      ).join('\n'),
    ).toMatch(/feasibility checks failed/);
  });

  it('demands a known commit and a clean tree only in strict mode', () => {
    expect(releaseProblems(gate({ currentDirty: true })).join('\n')).toMatch(/uncommitted/);
    expect(releaseProblems(gate({ currentDirty: true, strict: false })).join('\n')).not.toMatch(
      /uncommitted/,
    );
    const noCommit = gate({
      currentCommit: null,
      manifest: { ...manifest(), sourceCommit: null },
      validation: { ...validation, commit: null },
      kits: { ...kits, commit: null },
    });
    expect(releaseProblems(noCommit).join('\n')).toMatch(/no source commit/);
    expect(releaseProblems({ ...noCommit, strict: false })).toEqual([]);
  });
});

describe('maturity scorecard', () => {
  const card = (slug: string, m = manifest()) =>
    blueprintMaturityScorecard(
      all.find((u) => u.slug === slug)!,
      m,
    );
  const cards = all.map((u) => blueprintMaturityScorecard(u, manifest()));

  it('has the same seven levels, in order, on every blueprint', () => {
    for (const c of cards) expect(c.items.map((i) => i.id)).toEqual(MATURITY_LEVELS.map((l) => l.id));
  });

  it('never reads a schema pass as implementation readiness', () => {
    // with no kit run, schema and feasibility still pass, and the classification stays below "tested implementation"
    for (const u of all) {
      const c = blueprintMaturityScorecard(u, manifest(validation, null));
      expect(c.items[1]!.state, u.slug).toBe('met');
      expect(c.level, u.slug).toBeLessThanOrEqual(3);
      expect(c.classificationLabel, u.slug).not.toMatch(/implementation|production/i);
    }
  });

  it('classifies no blueprint above synthetic-data tested while no review or production evidence is recorded', () => {
    for (const c of cards) {
      expect(c.level, c.slug).toBeLessThanOrEqual(4);
      expect(
        c.items.slice(4).map((i) => i.state),
        c.slug,
      ).toEqual(['not-met', 'not-met', 'not-met']);
      expect(c.classificationLabel).not.toMatch(/production/i);
    }
  });

  it('reaches level 4 only with a tested starter for the exact problem', () => {
    expect(card('fintech/real-time-card-upi-fraud-detection').level).toBe(4);
    for (const u of all) {
      const c = blueprintMaturityScorecard(u, manifest());
      const verdict = u.playbook?.compatibility.verdict;
      if (verdict === 'adaptable') expect(c.items[3]!.state, u.slug).toBe('partial');
      if (verdict === 'none') expect(c.items[3]!.state, u.slug).toBe('not-applicable');
      if (verdict !== 'exact') expect(c.level, u.slug).toBeLessThanOrEqual(3);
    }
  });

  it('names no reviewer who does not exist', () => {
    for (const c of cards)
      for (const i of c.items) {
        expect(i.reviewer, `${c.slug} ${i.id}`).not.toMatch(/committee|board|auditor|pending/i);
        if (i.id === 'expert-validated') expect(i.reviewer).toBe('None');
      }
  });

  it('gives every unmet level something outstanding and says why the classification stops', () => {
    for (const c of cards) {
      expect(c.blockedBy, c.slug).toBeTruthy();
      for (const i of c.items)
        if (i.state !== 'met') expect(i.outstanding.length, `${c.slug} ${i.id}`).toBeGreaterThan(0);
    }
  });

  it('carries test counts, coverage and a log for a tested starter', () => {
    const item = card('fintech/real-time-card-upi-fraud-detection').items[3]!;
    expect(item.coverage).toMatch(/4 tests passed, 0 failed, 0 skipped/);
    expect(item.coverage).toMatch(/Line coverage of the kit's code: 91%/);
    expect(item.log).toBe('/release/kit-logs/fintech--real-time-card-upi-fraud-detection.txt');
    expect(item.date).toBe('2026-11-09');
  });

  it('says coverage was not measured when the run did not measure it', () => {
    const noCov = manifest(validation, {
      ...kits,
      kits: kits.kits.map((k) => ({ ...k, coveragePct: undefined })),
    });
    expect(blueprintMaturityScorecard(fraud, noCov).items[3]!.coverage).toMatch(
      /Line coverage was not measured/,
    );
  });

  it('marks a blueprint with a feasibility warning and lists the remediation as outstanding', () => {
    const c = card('healthcare/polygenic-risk-scoring');
    expect(c.items[2]!.state).toBe('met-with-warnings');
    expect(c.warnings).toHaveLength(1);
    expect(c.items[2]!.outstanding.join(' ')).toContain(c.warnings[0]!.remediation);
    expect(c.classificationLabel).toMatch(/open warnings/);
  });
});

describe('feasibility warnings and the release report', () => {
  const live = feasibilityWarnings(all);

  it('reads the warnings from the checks, with a remediation for each', () => {
    const fromChecks = all.flatMap((u) => u.validation.feasibility.filter((f) => f.status === 'warn'));
    expect(live).toHaveLength(fromChecks.length);
    expect(live.length).toBeGreaterThan(0);
    for (const w of live) {
      expect(w.remediation.length, w.slug).toBeGreaterThan(40);
      expect(all.some((u) => u.slug === w.slug && u.title === w.title)).toBe(true);
    }
  });

  it('keeps no remediation for a warning that no longer exists', () => {
    expect(staleRemediations(all)).toEqual([]);
    expect(staleRemediations(all.filter((u) => u.domain !== 'healthcare')).length).toBeGreaterThan(0);
  });

  it('puts every warning and the per-level counts in the manifest, and no log text', () => {
    const m = manifest();
    const f = m.checks.feasibility;
    expect(f.warnings).toEqual(live);
    expect(f.warn).toBe(live.length);
    expect(f.pass + f.notApplicable + f.warn + f.fail).toBe(f.checks);
    expect(m.maturity.map((r) => r.id)).toEqual(MATURITY_LEVELS.map((l) => l.id));
    expect(m.maturity[1]!.met).toBe(all.length);
    expect(m.maturity.slice(4).map((r) => r.met)).toEqual([0, 0, 0]);
    expect(m.maturity.reduce((a, r) => a + r.classified, 0)).toBe(all.length);
    expect(JSON.stringify(m.checks.executable.kits)).not.toContain('"log"');
  });

  it('writes a report that lists each warning with its blueprint and remediation, and what is outstanding', () => {
    const m = manifest();
    const md = releaseReportMarkdown(m, 'https://example.test');
    for (const w of live) {
      expect(md).toContain(`https://example.test/${w.slug}`);
      expect(md).toContain(w.remediation);
    }
    expect(md).toContain(`Domain-expert review | 0 of ${all.length} blueprints`);
    expect(md).toContain(`Production evidence | 0 of ${all.length} blueprints`);
    expect(md).toContain('https://example.test/release/kit-logs/kits--tabular.txt');
    const out = releaseOutstanding(m).join('\n');
    expect(out).toMatch(new RegExp(`${all.length} of ${all.length} blueprints have no domain-expert review`));
    expect(out).toMatch(/no production evidence/);
    expect(releaseOutstanding(manifest(validation, null)).join('\n')).toMatch(/starter kits were not run/);
  });
});
