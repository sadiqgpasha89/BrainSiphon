import { describe, expect, it } from 'vitest';
import { loadAllUseCases } from '../content/load';
import { toMarkdown } from '../content/markdown';
import {
  blueprintStatuses,
  buildManifest,
  kitKeyFor,
  releaseProblems,
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
  schemaVersion: 1,
  commit: SHA,
  dirty: false,
  contentDigest: DIGEST,
  validatedAt: '2026-11-09T10:00:00.000Z',
  useCases: all.length,
  feasibility: { checks: 10, pass: 10, warn: 0, fail: 0 },
  warnings: 0,
};
const kits: KitReport = {
  schemaVersion: 1,
  commit: SHA,
  dirty: false,
  contentDigest: DIGEST,
  ranAt: '2026-11-09T10:05:00.000Z',
  kits: requiredKits.map((name) => ({ name, status: 'passed' as const, seconds: 1 })),
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
