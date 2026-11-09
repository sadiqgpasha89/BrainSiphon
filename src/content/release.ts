/**
 * Release provenance: which commit and which content a published page was built from, and what has actually been proven about it.
 *
 * Pure (no Node imports) so the same code runs in the build scripts, the page components and the tests. The Node-only parts
 * (hashing the content, reading git, reading and writing the reports) live in `release-io.ts`.
 *
 * Three artefacts feed a release manifest, and none of them is a claim made by hand:
 *   - the validation report  (written by `npm run validate:content` only when every gate passed)
 *   - the kit report         (written by `npm run test:playbooks`: one pytest run per starter kit)
 *   - the content digest     (a hash of every input that shapes a blueprint, so a report cannot be reused for different content)
 * A status is shown as "Passed" only when a report for exactly this content says so; otherwise it reads "Not run".
 */
import type { UseCase } from '../schemas/usecase.schema';

export const RELEASE_SCHEMA_VERSION = 1;

export type RunStatus = 'passed' | 'failed' | 'not-run';

export interface KitResult {
  /** `kits/<pattern>` for a reference kit, `<domain>/<use-case>` for a hand-written pilot starter */
  name: string;
  status: 'passed' | 'failed';
  seconds: number;
}

/** Written by validate:content, and only when it passes. */
export interface ValidationReport {
  schemaVersion: typeof RELEASE_SCHEMA_VERSION;
  commit: string | null;
  dirty: boolean;
  contentDigest: string;
  validatedAt: string;
  useCases: number;
  feasibility: { checks: number; pass: number; warn: number; fail: number };
  warnings: number;
}

/** Written by test:playbooks (a full run only). */
export interface KitReport {
  schemaVersion: typeof RELEASE_SCHEMA_VERSION;
  commit: string | null;
  dirty: boolean;
  contentDigest: string;
  ranAt: string;
  kits: KitResult[];
}

export interface ReleaseManifest {
  schemaVersion: typeof RELEASE_SCHEMA_VERSION;
  /** Full Git commit SHA the content was built from; null when the build had no Git metadata (for example a Docker build without GIT_SHA). */
  sourceCommit: string | null;
  sourceDirty: boolean;
  /** `<package version>+<first 12 hex of the content digest>` */
  contentVersion: string;
  /** sha256 over every content input; see `computeContentDigest` */
  contentDigest: string;
  generatedAt: string;
  /** When validate:content last passed for exactly this content; null when no matching report exists. */
  validatedAt: string | null;
  /** When the static deployment artefact was built; null for a build that is not a deployment. */
  deployedAt: string | null;
  checks: {
    schema: { status: RunStatus; useCases: number };
    feasibility: { status: RunStatus; checks: number; pass: number; warn: number; fail: number };
    executable: { status: RunStatus; ranAt: string | null; kits: KitResult[] };
    domainExpert: { reviewed: number; total: number };
    productionEvidence: { claimed: number; total: number };
  };
}

export const shortSha = (sha: string | null) => (sha ? sha.slice(0, 7) : 'unknown');

/* ------------------------------------------------------------------ per-blueprint status */

export type StatusId = 'schema' | 'feasibility' | 'synthetic' | 'expert' | 'production';
export type StatusState = 'passed' | 'failed' | 'not-run' | 'not-reviewed' | 'not-available';

export interface StatusRow {
  id: StatusId;
  label: string;
  state: StatusState;
  /** the word shown next to the label */
  text: string;
  detail: string;
}

const STATE_TEXT: Record<StatusState, string> = {
  passed: 'Passed',
  failed: 'Failed',
  'not-run': 'Not run',
  'not-reviewed': 'Not reviewed',
  'not-available': 'Not available',
};

export const STATUS_LABEL: Record<StatusId, string> = {
  schema: 'Schema validated',
  feasibility: 'Architecture feasibility',
  synthetic: 'Synthetic starter tested',
  expert: 'Domain expert reviewed',
  production: 'Production evidence',
};

/** Which entry of the kit report covers this blueprint's starter. */
export const kitKeyFor = (uc: Pick<UseCase, 'slug' | 'pattern' | 'playbook'>): string =>
  uc.playbook?.provenance === 'authored' ? uc.slug : `kits/${uc.playbook?.starter?.kitId ?? uc.pattern}`;

/**
 * The five validation statuses of one blueprint, each derived on its own from evidence. Nothing is rolled into a single
 * "verified" verdict: a reader can see that schema, feasibility and the starter run passed and that no expert has looked at it.
 */
export function blueprintStatuses(
  uc: Pick<UseCase, 'slug' | 'pattern' | 'playbook' | 'validation'>,
  release: ReleaseManifest | null,
): StatusRow[] {
  const levels = uc.validation.levels;
  const claimed = (l: string) => levels.find((x) => x.level === l)?.state === 'passed';
  const row = (id: StatusId, state: StatusState, detail: string, suffix = ''): StatusRow => ({
    id,
    label: STATUS_LABEL[id],
    state,
    text: `${STATE_TEXT[state]}${suffix}`,
    detail,
  });

  const fails = uc.validation.feasibility.filter((f) => f.status === 'fail').length;
  const warns = uc.validation.feasibility.filter((f) => f.status === 'warn').length;
  const total = uc.validation.feasibility.length;

  // synthetic starter: the claim is "a kit exists for this pattern"; the status is what the last kit run for this content said
  let synthetic: StatusRow;
  if (!claimed('synthetic-data-tested')) {
    synthetic = row(
      'synthetic',
      'not-available',
      uc.playbook?.compatibility.verdict === 'none'
        ? 'No compatible executable starter kit exists for this problem, so none was run. The playbook is architecture and implementation guidance only.'
        : 'No starter kit is attached to this blueprint.',
    );
  } else {
    const key = kitKeyFor(uc);
    const exec = release?.checks.executable;
    const result = exec?.status === 'not-run' ? undefined : exec?.kits.find((k) => k.name === key);
    if (!result)
      synthetic = row(
        'synthetic',
        'not-run',
        `The starter kit ${key} has not been run in this build, so no pass is claimed. Run npm run test:playbooks.`,
      );
    else if (result.status === 'passed')
      synthetic = row(
        'synthetic',
        'passed',
        `${key} ran end to end on synthetic data (${result.seconds.toFixed(1)} s, ${exec?.ranAt ?? 'unknown time'}). Its numbers are the kit's, not this use case's.${uc.playbook?.compatibility.verdict === 'adaptable' ? ' The kit solves a related problem: this blueprint lists the changes it needs, so the pass is for the kit, not for a finished starter.' : ''}`,
        uc.playbook?.compatibility.verdict === 'adaptable' ? ' (adaptable kit)' : '',
      );
    else synthetic = row('synthetic', 'failed', `${key} failed its tests in the last run.`);
  }

  return [
    row('schema', 'passed', 'The blueprint passed the strict Zod schema when it was built; a missing or malformed section fails the build.'),
    row(
      'feasibility',
      fails ? 'failed' : 'passed',
      `${total} architecture-feasibility checks: ${total - fails - warns} passed or not applicable, ${warns} warning, ${fails} failed. Stage budgets, capacity, availability, storage, cost, recovery and model memory have to agree.`,
      !fails && warns ? ` (${warns} ${warns === 1 ? 'warning' : 'warnings'})` : '',
    ),
    synthetic,
    claimed('domain-expert-reviewed')
      ? row('expert', 'passed', levels.find((x) => x.level === 'domain-expert-reviewed')?.evidence ?? 'Reviewed.', ' (see scope)')
      : row('expert', 'not-reviewed', 'No domain specialist has reviewed this blueprint; content/reviews.json has no entry for it.'),
    claimed('production-evidence')
      ? row('production', 'passed', levels.find((x) => x.level === 'production-evidence')?.evidence ?? 'Recorded.')
      : row('production', 'not-available', 'No evidence from a real deployment or production dataset is recorded.'),
  ];
}

/* ------------------------------------------------------------------ building and checking a manifest */

export interface ManifestInput {
  commit: string | null;
  dirty: boolean;
  contentDigest: string;
  packageVersion: string;
  now: string;
  useCases: UseCase[];
  validation: ValidationReport | null;
  kits: KitReport | null;
  /** true for the static deployment build */
  deployment: boolean;
}

export function buildManifest(i: ManifestInput): ReleaseManifest {
  const checks = i.useCases.flatMap((u) => u.validation.feasibility);
  const count = (s: string) => checks.filter((c) => c.status === s).length;
  const fail = count('fail');
  // a report only counts when it was produced for exactly this content
  const validation = i.validation?.contentDigest === i.contentDigest ? i.validation : null;
  const kits = i.kits?.contentDigest === i.contentDigest ? i.kits : null;
  const reviewed = i.useCases.filter((u) => u.validation.levels.some((l) => l.level === 'domain-expert-reviewed' && l.state === 'passed')).length;
  const production = i.useCases.filter((u) => u.validation.levels.some((l) => l.level === 'production-evidence' && l.state === 'passed')).length;

  return {
    schemaVersion: RELEASE_SCHEMA_VERSION,
    sourceCommit: i.commit,
    sourceDirty: i.dirty,
    contentVersion: `${i.packageVersion}+${i.contentDigest.slice(0, 12)}`,
    contentDigest: i.contentDigest,
    generatedAt: i.now,
    validatedAt: validation?.validatedAt ?? null,
    deployedAt: i.deployment ? i.now : null,
    checks: {
      schema: { status: 'passed', useCases: i.useCases.length },
      feasibility: {
        status: fail ? 'failed' : 'passed',
        checks: checks.length,
        pass: count('pass') + count('n/a'),
        warn: count('warn'),
        fail,
      },
      executable: kits
        ? { status: kits.kits.every((k) => k.status === 'passed') ? 'passed' : 'failed', ranAt: kits.ranAt, kits: kits.kits }
        : { status: 'not-run', ranAt: null, kits: [] },
      domainExpert: { reviewed, total: i.useCases.length },
      productionEvidence: { claimed: production, total: i.useCases.length },
    },
  };
}

export interface GateInput {
  manifest: ReleaseManifest;
  validation: ValidationReport | null;
  kits: KitReport | null;
  /** recomputed from the checkout now */
  currentDigest: string;
  currentCommit: string | null;
  currentDirty: boolean;
  /** every kit the repository contains; each must appear, passed, in the kit report */
  requiredKits: string[];
  /** also demand a commit SHA and a clean tree (the deployment) */
  strict: boolean;
}

/** Why this build must not be published. An empty list means the published content corresponds to the validated release. */
export function releaseProblems(g: GateInput): string[] {
  const p: string[] = [];
  const { manifest: m } = g;

  if (m.contentDigest !== g.currentDigest)
    p.push(`the release manifest was built from content ${m.contentDigest.slice(0, 12)}, but the checkout is ${g.currentDigest.slice(0, 12)}: rebuild`);
  if (g.strict && !g.currentCommit) p.push('no source commit is known (set GITHUB_SHA or GIT_SHA, or build inside a Git checkout)');
  if (g.strict && g.currentDirty) p.push('the working tree has uncommitted changes, so the published content would not correspond to a commit');
  if (m.sourceCommit !== g.currentCommit) p.push(`manifest commit ${shortSha(m.sourceCommit)} is not the checkout commit ${shortSha(g.currentCommit)}`);

  if (!g.validation) p.push('no validation report: run npm run validate:content (it writes .release/validation.json only when every gate passes)');
  else {
    if (g.validation.contentDigest !== g.currentDigest) p.push('the validation report is for different content than this checkout: run npm run validate:content again');
    if (g.validation.commit !== g.currentCommit) p.push(`the validation report is for commit ${shortSha(g.validation.commit)}, not ${shortSha(g.currentCommit)}`);
    if (g.validation.feasibility.fail > 0) p.push(`${g.validation.feasibility.fail} architecture-feasibility checks failed`);
  }
  if (m.checks.feasibility.fail > 0) p.push(`${m.checks.feasibility.fail} architecture-feasibility checks fail in the built content`);
  if (!m.validatedAt) p.push('the manifest carries no validation timestamp');

  if (!g.kits) p.push('no kit report: run npm run test:playbooks (a full run) before publishing');
  else {
    if (g.kits.contentDigest !== g.currentDigest) p.push('the starter-kit report is for different content than this checkout: run npm run test:playbooks again');
    if (g.kits.commit !== g.currentCommit) p.push(`the starter-kit report is for commit ${shortSha(g.kits.commit)}, not ${shortSha(g.currentCommit)}`);
    const byName = new Map(g.kits.kits.map((k) => [k.name, k]));
    const missing = g.requiredKits.filter((k) => !byName.has(k));
    if (missing.length) p.push(`the starter-kit report is missing ${missing.length} kit(s): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ', ...' : ''}`);
    const failed = g.kits.kits.filter((k) => k.status !== 'passed');
    if (failed.length) p.push(`${failed.length} starter kit(s) failed: ${failed.slice(0, 5).map((k) => k.name).join(', ')}`);
  }
  if (m.checks.executable.status !== 'passed') p.push(`executable test status is "${m.checks.executable.status}" in the manifest`);

  return p;
}
