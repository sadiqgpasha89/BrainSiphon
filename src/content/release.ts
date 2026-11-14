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

export const RELEASE_SCHEMA_VERSION = 2;

export type RunStatus = 'passed' | 'failed' | 'not-run';

export interface KitResult {
  /** `kits/<pattern>` for a reference kit, `<domain>/<use-case>` for a hand-written pilot starter */
  name: string;
  status: 'passed' | 'failed';
  seconds: number;
  /** counts from the pytest summary line; absent in reports written before they were recorded */
  tests?: { passed: number; failed: number; skipped: number };
  /** line coverage of the kit's code in percent; null when pytest-cov was not installed for the run */
  coveragePct?: number | null;
  /** the end of the pytest output. Kept in the kit report only: content:build publishes it as a text file and drops it from the manifest. */
  log?: string;
}

/** Written by validate:content, and only when it passes. */
export interface ValidationReport {
  schemaVersion: typeof RELEASE_SCHEMA_VERSION;
  commit: string | null;
  dirty: boolean;
  contentDigest: string;
  validatedAt: string;
  useCases: number;
  feasibility: { checks: number; pass: number; notApplicable: number; warn: number; fail: number };
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
    feasibility: {
      status: RunStatus;
      checks: number;
      pass: number;
      notApplicable: number;
      warn: number;
      fail: number;
      /** every warning, with the blueprint it affects and what to do about it */
      warnings: FeasibilityWarning[];
    };
    executable: { status: RunStatus; ranAt: string | null; kits: KitResult[] };
    domainExpert: { reviewed: number; total: number };
    productionEvidence: { claimed: number; total: number };
  };
  /** how many blueprints meet, and are classified at, each of the seven maturity levels */
  maturity: MaturitySummaryRow[];
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

/* ------------------------------------------------------------------ feasibility warnings */

export interface FeasibilityWarning {
  slug: string;
  title: string;
  /** the name of the feasibility check that raised the warning */
  check: string;
  detail: string;
  remediation: string;
}

/** What to do about a warning of each kind when no blueprint-specific remediation is written. Keyed by the check's name. */
const REMEDIATION_BY_CHECK: Record<string, string> = {
  'Model memory vs serving hardware':
    'Quantise the model so it fits one device with room for the KV cache, or shard it across GPUs with tensor parallelism, and re-size the capacity table for the result.',
  'Cost vs expected traffic':
    'The fixed fleet floor dominates at this volume: move to scale-to-zero or scheduled batch compute, or put a cheap filter in front of the expensive model, then re-run the capacity model.',
};
/** How serious a warning of each kind is: whether the design can be built as written, or only costs more than it should. */
export type WarningSeverity = 'high' | 'medium' | 'low';
const SEVERITY_BY_CHECK: Record<string, { severity: WarningSeverity; meaning: string }> = {
  'Model memory vs serving hardware': {
    severity: 'high',
    meaning: 'The design cannot be built as written: the model does not fit the hardware the blueprint names. Needs remediation before anyone builds it.',
  },
  'Cost vs expected traffic': {
    severity: 'medium',
    meaning: 'The design works but the fixed cost floor dwarfs the traffic. Acceptable for a prototype; needs the remediation before a business case is written on these numbers.',
  },
};
export const warningSeverity = (check: string) =>
  SEVERITY_BY_CHECK[check] ?? { severity: 'low' as WarningSeverity, meaning: 'Unclassified. Read the finding.' };

/** A named owner's decision about one warning, recorded in content/warning-acks.json keyed `<slug>::<check>`. */
export interface WarningAck {
  owner: string;
  date: string;
  decision: 'accepted' | 'remediation-planned' | 'fixed';
  note?: string;
}

const REMEDIATION_FALLBACK =
  'Read the check detail, change the design or the stated workload until the numbers agree, and re-run npm run validate:content.';

/**
 * Blueprint-specific remediation, keyed `<slug>::<check name>`. A key that no longer matches a live warning fails
 * validate:content (`staleRemediations`), so this text cannot outlive the warning it was written for.
 */
export const REMEDIATION_OVERRIDES: Record<string, string> = {
  'fintech/transaction-monitoring-alert-triage-llm::Model memory vs serving hardware':
    'Quantise the 70B model to INT8/FP8 (about 70 GB) and serve it across two 80 GB GPUs so the KV cache has room, or keep FP16 and shard across four. Alternatively screen alerts with an 8B model and escalate only the ambiguous ones to the 70B model. Re-size the capacity table for whichever is chosen.',
  'healthcare/pathology-slide-cancer-detection::Cost vs expected traffic':
    'Add a cheap tissue and cell-density filter that discards normal tiles before the heavy ensemble, and replace the always-warm GPU nodes with autoscaled workers fed from the PACS queue.',
  'healthcare/genomic-variant-pathogenicity-classification::Cost vs expected traffic':
    'Replace the always-on serving nodes with jobs that start when a sequencing batch arrives and scale to zero between batches.',
  'healthcare/polygenic-risk-scoring::Cost vs expected traffic':
    'Run scoring as a scheduled batch on preemptible CPU instead of an online service that waits for about 60 events a day.',
  'healthcare/single-cell-rna-cell-type-annotation::Cost vs expected traffic':
    'Process samples in batches on spot GPU workers and cache the reference-atlas embeddings so they are not recomputed per run.',
  'healthcare/surgical-video-phase-recognition::Cost vs expected traffic':
    'Move inference to a workstation in the operating theatre, sample keyframes instead of every frame, and quantise the model; cloud GPU is then needed only for retraining.',
  'healthcare/radiotherapy-autocontouring::Cost vs expected traffic':
    'Queue CT series to asynchronous workers, quantise the 3D segmentation model, and scale the workers with the planning clinic\'s hours instead of keeping the fleet warm.',
};

const remediationKey = (slug: string, check: string) => `${slug}::${check}`;

/** Every feasibility warning in the given blueprints, read from the checks themselves, with a remediation for each. */
export function feasibilityWarnings(useCases: Pick<UseCase, 'slug' | 'title' | 'validation'>[]): FeasibilityWarning[] {
  return useCases.flatMap((u) =>
    u.validation.feasibility
      .filter((f) => f.status === 'warn')
      .map((f) => ({
        slug: u.slug,
        title: u.title,
        check: f.check,
        detail: f.detail,
        remediation: REMEDIATION_OVERRIDES[remediationKey(u.slug, f.check)] ?? REMEDIATION_BY_CHECK[f.check] ?? REMEDIATION_FALLBACK,
      })),
  );
}

/** Remediation entries written for a warning that no longer exists. */
export function staleRemediations(useCases: Pick<UseCase, 'slug' | 'title' | 'validation'>[]): string[] {
  const live = new Set(feasibilityWarnings(useCases).map((w) => remediationKey(w.slug, w.check)));
  return Object.keys(REMEDIATION_OVERRIDES).filter((k) => !live.has(k));
}

/* ------------------------------------------------------------------ maturity scorecard */

/**
 * Seven maturity levels, lowest first. Each is a different kind of evidence, and a lower one never implies a higher one:
 * a schema pass says the page is complete, not that anything on it works.
 */
export const MATURITY_LEVELS = [
  {
    id: 'conceptual-architecture',
    label: 'Conceptually reviewed architecture',
    short: 'Conceptual architecture',
    meaning: 'The problem, loss, pipeline and system design are written down and the maintainers have read them. Nobody independent has.',
  },
  {
    id: 'schema-validated',
    label: 'Schema-validated blueprint',
    short: 'Schema-validated',
    meaning: 'Every required section is present and well-typed. This proves the page is complete; it proves nothing about whether the design works.',
  },
  {
    id: 'feasibility-validated',
    label: 'Architecture-feasibility validated blueprint',
    short: 'Feasibility-validated',
    meaning: 'The blueprint\'s own numbers agree with each other: stage budgets, capacity, availability, storage, cost, recovery and model memory. The numbers are modelled, not measured.',
  },
  {
    id: 'synthetic-tested',
    label: 'Synthetic-data tested implementation',
    short: 'Synthetic-data tested',
    meaning: 'Starter code for this exact problem runs end to end on generated data and passes its tests. It has never seen real data.',
  },
  {
    id: 'expert-validated',
    label: 'Domain-expert validated implementation',
    short: 'Domain-expert validated',
    meaning: 'A named specialist in the domain has reviewed the content, with the scope of the review recorded.',
  },
  {
    id: 'platform-integrated',
    label: 'Platform-integrated implementation',
    short: 'Platform-integrated',
    meaning: 'The implementation is connected to real source systems, identity, a feature store and a serving platform.',
  },
  {
    id: 'production-evidenced',
    label: 'Production-deployed and production-evidenced solution',
    short: 'Production-evidenced',
    meaning: 'It runs in production and measured results from that deployment are recorded.',
  },
] as const;

export type MaturityLevelId = (typeof MATURITY_LEVELS)[number]['id'];
export type MaturityState = 'met' | 'met-with-warnings' | 'partial' | 'not-met' | 'not-run' | 'failed' | 'not-applicable';

export const MATURITY_STATE_TEXT: Record<MaturityState, string> = {
  met: 'Met',
  'met-with-warnings': 'Met, with open warnings',
  partial: 'Partly met',
  'not-met': 'Not met',
  'not-run': 'Not run in this build',
  failed: 'Failed',
  'not-applicable': 'No starter kit',
};

const counts = (state: MaturityState) => state === 'met' || state === 'met-with-warnings';

export interface MaturityItem {
  id: MaturityLevelId;
  /** 1 to 7 */
  level: number;
  label: string;
  meaning: string;
  state: MaturityState;
  /** what stands behind the state, in one or two sentences */
  evidence: string;
  /** the command that reproduces the check, when one exists */
  command?: string;
  /** a published log of the run, as a site-relative path */
  log?: string;
  /** what the tests cover, when tests exist */
  coverage?: string;
  /** who reviewed, and for which organisation; says so plainly when nobody did */
  reviewer: string;
  /** date of the run or the review; null when there was none */
  date: string | null;
  outstanding: string[];
}

export interface MaturityScorecard {
  slug: string;
  /** the highest level reached with every level below it also met; 0 when not even the first is */
  level: number;
  classification: MaturityLevelId | null;
  classificationLabel: string;
  /** the first level not met, and why the classification stops there */
  blockedBy: string | null;
  highRisk: boolean;
  items: MaturityItem[];
  warnings: FeasibilityWarning[];
}

type ScorecardInput = Pick<UseCase, 'slug' | 'title' | 'pattern' | 'playbook' | 'validation' | 'governance'>;

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null);
const kitLogPath = (name: string) => `/release/kit-logs/${name.replace(/\//g, '--')}.txt`;

/**
 * The maturity scorecard of one blueprint. Every state is derived from recorded evidence: the checks stored on the blueprint,
 * the release manifest for this build, and content/reviews.json. Nothing is asserted by hand, and the classification is the
 * highest level reached without skipping one, so a later level cannot lift a blueprint past an earlier gap.
 */
export function blueprintMaturityScorecard(uc: ScorecardInput, release: ReleaseManifest | null): MaturityScorecard {
  const p = uc.validation.provenance;
  const levelRow = (l: string) => uc.validation.levels.find((x) => x.level === l);
  const claimed = (l: string) => levelRow(l)?.state === 'passed';
  const feas = uc.validation.feasibility;
  const n = (s: string) => feas.filter((f) => f.status === s).length;
  const warnings = feasibilityWarnings([uc]);
  const synthetic = blueprintStatuses(uc, release).find((s) => s.id === 'synthetic')!;
  const verdict = uc.playbook?.compatibility.verdict;
  const key = kitKeyFor(uc);
  const exec = release?.checks.executable;
  const kit = exec?.status === 'not-run' ? undefined : exec?.kits.find((k) => k.name === key);
  const need = (state: string) => uc.playbook?.completion.states.find((s) => s.state === state)?.stillNeeded ?? [];
  const handAuthored = p.sections.filter((s) => s.origin === 'hand-authored').length;
  const validated = release?.validatedAt ?? null;

  const meta = (id: MaturityLevelId) => {
    const i = MATURITY_LEVELS.findIndex((l) => l.id === id);
    return { id, level: i + 1, label: MATURITY_LEVELS[i]!.label, meaning: MATURITY_LEVELS[i]!.meaning };
  };

  const syntheticState: MaturityState =
    synthetic.state === 'not-available'
      ? 'not-applicable'
      : synthetic.state === 'failed'
        ? 'failed'
        : synthetic.state === 'passed'
          ? verdict === 'adaptable'
            ? 'partial'
            : 'met'
          : 'not-run';

  const items: MaturityItem[] = [
    {
      ...meta('conceptual-architecture'),
      state: 'met',
      evidence: `Written and read through by the maintainers: ${handAuthored} of ${p.sections.length} section groups are hand-authored for this use case and the rest are generated from its specification or a shared template (see provenance above). No independent architecture review is recorded.`,
      reviewer: `${p.owner} (the authors; not an independent review)`,
      date: p.generatedAt,
      outstanding: ['An architecture review by someone other than the authors'],
    },
    {
      ...meta('schema-validated'),
      state: 'met',
      evidence: `The blueprint parsed against the strict schema when this page was built; a missing or malformed section fails the build. ${validated ? `The full content gate last passed for this content on ${day(validated)}.` : 'The full content gate has not been run for this exact content in this build.'}`,
      command: 'npm run validate:content',
      log: '/release',
      coverage: 'Every required section and field of the blueprint schema. Structure only: no statement on the page is checked for being true.',
      reviewer: 'Automated check; no human reviewer',
      date: day(validated),
      outstanding: [],
    },
    {
      ...meta('feasibility-validated'),
      state: n('fail') ? 'failed' : warnings.length ? 'met-with-warnings' : 'met',
      evidence: `${feas.length} checks on this blueprint: ${n('pass')} passed, ${n('n/a')} not applicable, ${n('warn')} warning, ${n('fail')} failed. Each result and its arithmetic is in the table below. The inputs are modelled figures, so a pass means the design is internally consistent, not that it has been measured.`,
      command: 'npm run validate:content',
      log: '/release#feasibility-warnings',
      coverage: 'Latency envelope, stage budgets, throughput against capacity, availability against redundancy, storage against retention, cost, recovery objectives and model memory.',
      reviewer: 'Automated check; no human reviewer',
      date: day(validated),
      outstanding: [
        ...feas.filter((f) => f.status === 'fail').map((f) => `Failed: ${f.check}`),
        ...warnings.map((w) => `${w.check}: ${w.remediation}`),
      ],
    },
    {
      ...meta('synthetic-tested'),
      state: syntheticState,
      evidence: synthetic.detail,
      ...(syntheticState === 'not-applicable' ? {} : { command: `npm run test:playbooks`, coverage: kitCoverage(kit) }),
      ...(kit ? { log: kitLogPath(kit.name) } : {}),
      reviewer: 'Automated test run; no human reviewer',
      date: kit ? day(exec?.ranAt) : null,
      outstanding:
        syntheticState === 'not-applicable'
          ? ['Write a first end-to-end run for this problem: no compatible starter kit exists']
          : syntheticState === 'partial'
            ? (uc.playbook?.compatibility.modifications ?? [])
            : syntheticState === 'met'
              ? ['Repeat the starter\'s milestones on your own data: synthetic results do not carry over']
              : syntheticState === 'not-run'
                ? ['Run the starter kits for this content (npm run test:playbooks)']
                : [`Fix the failing tests in ${key}`],
    },
    {
      ...meta('expert-validated'),
      state: claimed('domain-expert-reviewed') ? 'met' : 'not-met',
      evidence: claimed('domain-expert-reviewed')
        ? (levelRow('domain-expert-reviewed')?.evidence ?? 'A review is recorded in content/reviews.json.')
        : 'No review is recorded: content/reviews.json has no entry for this blueprint.',
      reviewer: p.reviewer ?? 'None',
      date: p.reviewedAt,
      outstanding: claimed('domain-expert-reviewed')
        ? ['Anything outside the recorded review scope is still unreviewed']
        : ['Review by a named domain specialist, recorded in content/reviews.json with reviewer, organisation, date and scope'],
    },
    {
      ...meta('platform-integrated'),
      state: 'not-met',
      evidence: 'Nothing in this repository connects this use case to a source system, identity provider, feature store or serving platform, and the project records no integration for any blueprint.',
      reviewer: 'None',
      date: null,
      outstanding: need('integration-ready').length ? [...need('integration-ready'), ...need('shadow-ready').slice(1)] : ['Integration with your data sources, identity and serving platform'],
    },
    {
      ...meta('production-evidenced'),
      state: claimed('production-evidence') ? 'met' : 'not-met',
      evidence: claimed('production-evidence')
        ? (levelRow('production-evidence')?.evidence ?? 'Production evidence is recorded.')
        : 'No deployment of this blueprint is known to the project and no figure on this page was measured in production.',
      reviewer: 'None',
      date: null,
      outstanding: need('production-ready').length ? need('production-ready') : ['A monitored production deployment with measured results'],
    },
  ];

  const firstGap = items.findIndex((i) => !counts(i.state));
  const level = firstGap === -1 ? items.length : firstGap;
  const top = level ? items[level - 1]! : null;
  const gap = firstGap === -1 ? null : items[firstGap]!;

  return {
    slug: uc.slug,
    level,
    classification: top?.id ?? null,
    classificationLabel: top ? `${top.label}${top.state === 'met-with-warnings' ? ' (open warnings)' : ''}` : 'Unclassified',
    blockedBy: gap ? `Level ${gap.level}, ${gap.label.toLowerCase()}: ${MATURITY_STATE_TEXT[gap.state].toLowerCase()}.` : null,
    highRisk: uc.governance.riskTier === 'high' || uc.governance.riskTier === 'critical',
    items,
    warnings,
  };
}

function kitCoverage(kit: KitResult | undefined): string {
  const scope = 'The kit\'s own pipeline on generated data (data, baseline, model and evaluation gates). No test touches real data, serving or integration.';
  if (!kit) return scope;
  const tests = kit.tests ? `${kit.tests.passed} tests passed, ${kit.tests.failed} failed, ${kit.tests.skipped} skipped. ` : '';
  const lines = typeof kit.coveragePct === 'number' ? `Line coverage of the kit's code: ${kit.coveragePct}%. ` : 'Line coverage was not measured in this run. ';
  return `${tests}${lines}${scope}`;
}

export interface MaturitySummaryRow {
  id: MaturityLevelId;
  level: number;
  label: string;
  /** blueprints whose own evidence meets this level, whatever the levels below say */
  met: number;
  /** blueprints classified exactly at this level */
  classified: number;
}

export function maturitySummary(cards: MaturityScorecard[]): MaturitySummaryRow[] {
  return MATURITY_LEVELS.map((l, i) => ({
    id: l.id,
    level: i + 1,
    label: l.label,
    met: cards.filter((c) => counts(c.items[i]!.state)).length,
    classified: cards.filter((c) => c.level === i + 1).length,
  }));
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

  const manifest: ReleaseManifest = {
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
        pass: count('pass'),
        notApplicable: count('n/a'),
        warn: count('warn'),
        fail,
        warnings: feasibilityWarnings(i.useCases),
      },
      executable: kits
        ? {
            status: kits.kits.every((k) => k.status === 'passed') ? 'passed' : 'failed',
            ranAt: kits.ranAt,
            // the log is published as its own file (kitLogFile); the manifest stays small
            kits: kits.kits.map((k) => ({ ...k, log: undefined })),
          }
        : { status: 'not-run', ranAt: null, kits: [] },
      domainExpert: { reviewed, total: i.useCases.length },
      productionEvidence: { claimed: production, total: i.useCases.length },
    },
    maturity: [],
  };
  manifest.maturity = maturitySummary(i.useCases.map((u) => blueprintMaturityScorecard(u, manifest)));
  return manifest;
}

/** Where content:build publishes the log of one kit run, relative to the site root. */
export const kitLogFile = kitLogPath;

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

/* ------------------------------------------------------------------ release report */

const pct = (n: number, total: number) => (total ? `${n} of ${total}` : '0');

/** Outstanding issues of the release as a whole, derived from the manifest: what a reader must not assume. */
export function releaseOutstanding(m: ReleaseManifest): string[] {
  const c = m.checks;
  const total = c.schema.useCases;
  const out: string[] = [];
  const at = (id: MaturityLevelId) => m.maturity.find((r) => r.id === id)?.met ?? 0;
  if (c.domainExpert.reviewed < total)
    out.push(`${total - c.domainExpert.reviewed} of ${total} blueprints have no domain-expert review.`);
  if (c.productionEvidence.claimed < total)
    out.push(`${total - c.productionEvidence.claimed} of ${total} blueprints have no production evidence, and none is integrated with a real platform.`);
  if (c.feasibility.warn) out.push(`${c.feasibility.warn} architecture-feasibility warnings are open; each is listed below with its remediation.`);
  if (c.feasibility.fail) out.push(`${c.feasibility.fail} architecture-feasibility checks fail.`);
  if (c.executable.status === 'not-run') out.push('The starter kits were not run for this content, so no synthetic-data result is claimed.');
  else {
    const failed = c.executable.kits.filter((k) => k.status !== 'passed');
    if (failed.length) out.push(`${failed.length} starter kits fail their tests: ${failed.map((k) => k.name).join(', ')}.`);
    if (c.executable.kits.some((k) => typeof k.coveragePct !== 'number')) out.push('Line coverage was not measured for every starter kit.');
    out.push(`${total - at('synthetic-tested')} of ${total} blueprints have no tested starter for their exact problem: they either reuse a kit built for a neighbouring problem or have none.`);
  }
  if (!m.validatedAt) out.push('The content gate (npm run validate:content) has not passed for exactly this content.');
  return out;
}

export function releaseReportMarkdown(m: ReleaseManifest, origin: string): string {
  const c = m.checks;
  const total = c.schema.useCases;
  const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const L: string[] = [
    '# BrainSiphon release report',
    '',
    `Release ${m.contentVersion}, commit ${m.sourceCommit ?? 'unknown'}${m.sourceDirty ? ' (uncommitted changes)' : ''}.`,
    `Generated ${m.generatedAt}; content gate ${m.validatedAt ? `passed ${m.validatedAt}` : 'not run for this content'}; ${m.deployedAt ? `deployed ${m.deployedAt}` : 'not a deployment build'}.`,
    '',
    'This report says what has been checked for the published blueprints and what has not. A level never implies the one above it.',
    '',
    '## Maturity of the blueprints',
    '',
    '| Level | Classification | Blueprints meeting it | Blueprints classified here |',
    '| --- | --- | --- | --- |',
    ...m.maturity.map((r) => `| ${r.level} | ${r.label} | ${pct(r.met, total)} | ${r.classified} |`),
    '',
    'A blueprint is classified at the highest level it reaches without skipping one.',
    '',
    '## Checks',
    '',
    '| Check | Result | How to reproduce |',
    '| --- | --- | --- |',
    `| Schema validation | ${c.schema.useCases} blueprints parsed | \`npm run validate:content\` |`,
    `| Architecture feasibility | ${c.feasibility.checks} checks: ${c.feasibility.pass} passed, ${c.feasibility.notApplicable} not applicable, ${c.feasibility.warn} warnings, ${c.feasibility.fail} failed | \`npm run validate:content\` |`,
    `| Executable starter kits | ${c.executable.status === 'not-run' ? 'not run for this content' : `${c.executable.kits.filter((k) => k.status === 'passed').length} of ${c.executable.kits.length} passed on synthetic data (${c.executable.ranAt})`} | \`npm run test:playbooks\` |`,
    `| Domain-expert review | ${c.domainExpert.reviewed} of ${c.domainExpert.total} blueprints | \`content/reviews.json\` |`,
    `| Production evidence | ${c.productionEvidence.claimed} of ${c.productionEvidence.total} blueprints | none recorded |`,
    '',
  ];
  if (c.executable.kits.length) {
    L.push('## Starter-kit runs', '', '| Kit | Result | Tests | Line coverage | Seconds | Log |', '| --- | --- | --- | --- | --- | --- |');
    for (const k of c.executable.kits)
      L.push(
        `| ${k.name} | ${k.status} | ${k.tests ? `${k.tests.passed} passed, ${k.tests.failed} failed, ${k.tests.skipped} skipped` : 'not recorded'} | ${typeof k.coveragePct === 'number' ? `${k.coveragePct}%` : 'not measured'} | ${k.seconds} | ${origin}${kitLogFile(k.name)} |`,
      );
    L.push('');
  }
  L.push(`## Architecture-feasibility warnings (${c.feasibility.warnings.length})`, '');
  if (!c.feasibility.warnings.length) L.push('None.', '');
  for (const w of c.feasibility.warnings)
    L.push(`### ${w.title}`, '', `- Blueprint: ${origin}/${w.slug}`, `- Check: ${w.check}`, `- Finding: ${cell(w.detail)}`, `- Recommended remediation: ${cell(w.remediation)}`, '');
  L.push('## Outstanding issues', '', ...releaseOutstanding(m).map((x) => `- ${x}`), '');
  L.push(`Machine-readable: ${origin}/release.json`, '');
  return L.join('\n');
}
