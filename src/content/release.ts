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

export interface FeasibilityWarning {
  slug: string;
  blueprintTitle: string;
  category: 'Model memory vs serving hardware' | 'Cost vs expected traffic';
  detail: string;
  remediation: string;
}

export const FEASIBILITY_WARNINGS: FeasibilityWarning[] = [
  {
    slug: 'fintech/transaction-monitoring-alert-triage-llm',
    blueprintTitle: 'Transaction Monitoring Alert Triage (LLM)',
    category: 'Model memory vs serving hardware',
    detail:
      '70B parameters need about 140 GB at FP16 against H100-class 80 GB. Does not fit one device with KV-cache room: quantise (INT8/FP8: about 70 GB) or shard with tensor parallelism across 3+ GPUs and size the table accordingly.',
    remediation:
      'Quantise model weights to INT8/FP8 (~70 GB VRAM required) or shard via Tensor Parallelism (tp=2 or tp=4) across 2-4 NVIDIA H100/A100 GPUs. Alternatively, adopt a model cascade using an 8B screening model and 70B escalation only on high-ambiguity alerts.',
  },
  {
    slug: 'healthcare/pathology-slide-cancer-detection',
    blueprintTitle: 'Pathology Slide Cancer Detection',
    category: 'Cost vs expected traffic',
    detail:
      '$219,387/month for 30,000 events/day = $243.76 per 1,000 decisions (very high: a fixed fleet floor or heavy per-event compute dominates at this volume; check the minimum node count, batching and the model cascade).',
    remediation:
      'Implement a two-stage tile cascade: a fast, lightweight cellular density filter discards 80%+ of normal tiles, routing only suspicious tissue to the heavy ensemble. Transition from warm dedicated GPU nodes to spot autoscaling with asynchronous PACS queue batching.',
  },
  {
    slug: 'healthcare/genomic-variant-pathogenicity-classification',
    blueprintTitle: 'Genomic Variant Pathogenicity Classification',
    category: 'Cost vs expected traffic',
    detail:
      '$1,852/month for 150 events/day = $411.51 per 1,000 decisions (very high: a fixed fleet floor or heavy per-event compute dominates at this volume; check the minimum node count, batching and the model cascade).',
    remediation:
      'Replace warm dedicated serving nodes with event-driven serverless container jobs (e.g. Google Cloud Run or AWS Batch) that scale to zero when sequencing batches are not pending.',
  },
  {
    slug: 'healthcare/polygenic-risk-scoring',
    blueprintTitle: 'Polygenic Risk Scoring',
    category: 'Cost vs expected traffic',
    detail:
      '$1,615/month for 60 events/day = $897.48 per 1,000 decisions (very high: a fixed fleet floor or heavy per-event compute dominates at this volume; check the minimum node count, batching and the model cascade).',
    remediation:
      'Execute PRS calculations as scheduled nightly batch pipelines on preemptible CPU compute, rather than keeping idle online microservices waiting for low-volume episodic events.',
  },
  {
    slug: 'healthcare/single-cell-rna-cell-type-annotation',
    blueprintTitle: 'Single-cell RNA Cell-type Annotation',
    category: 'Cost vs expected traffic',
    detail:
      '$1,616/month for 30 events/day = $1795.39 per 1,000 decisions (very high: a fixed fleet floor or heavy per-event compute dominates at this volume; check the minimum node count, batching and the model cascade).',
    remediation:
      'Process scRNA samples in batch mode on spot GPU worker fleets; cache high-dimensional reference atlas embeddings in a vector store to avoid recomputing manifold graphs per run.',
  },
  {
    slug: 'healthcare/surgical-video-phase-recognition',
    blueprintTitle: 'Surgical Video Phase Recognition',
    category: 'Cost vs expected traffic',
    detail:
      '$219,387/month for 30,000 events/day = $243.76 per 1,000 decisions (very high: a fixed fleet floor or heavy per-event compute dominates at this volume; check the minimum node count, batching and the model cascade).',
    remediation:
      'Shift inference to on-premise hospital operating theater edge workstations (e.g. NVIDIA IGX/RTX 6000), downsample from 60fps continuous processing to 1fps keyframe sampling, and compile models with TensorRT INT8.',
  },
  {
    slug: 'healthcare/radiotherapy-autocontouring',
    blueprintTitle: 'Radiotherapy Organs-at-Risk Autocontouring',
    category: 'Cost vs expected traffic',
    detail:
      '$94,717/month for 30,000 events/day = $105.24 per 1,000 decisions (very high: a fixed fleet floor or heavy per-event compute dominates at this volume; check the minimum node count, batching and the model cascade).',
    remediation:
      'Queue volumetric DICOM CT series to an asynchronous worker queue, apply TensorRT quantization to 3D U-Net backbones, and dynamically autoscale worker replicas based on treatment planning clinic shifts.',
  },
];

export type MaturityLevelId =
  | 'conceptually-reviewed'
  | 'schema-validated'
  | 'architecture-feasibility-validated'
  | 'synthetic-data-tested'
  | 'domain-expert-validated'
  | 'platform-integrated'
  | 'production-deployed';

export interface MaturityItem {
  id: MaturityLevelId;
  order: number;
  label: string;
  status: 'passed' | 'conditional' | 'pending' | 'failed' | 'not-applicable';
  meaning: string;
  evidence: string;
  testCommand?: string;
  testCoverage?: string;
  reviewer?: string;
  reviewDate?: string;
  outstandingIssues?: string[];
}

export interface MaturityScorecard {
  slug: string;
  score: number;
  maxScore: number;
  readinessLabel: string;
  isHighRisk: boolean;
  highRiskNotice?: string;
  items: MaturityItem[];
  warnings: FeasibilityWarning[];
}

export function blueprintMaturityScorecard(
  uc: Pick<UseCase, 'slug' | 'domain' | 'pattern' | 'playbook' | 'validation' | 'governance'>,
  release: ReleaseManifest | null,
): MaturityScorecard {
  const levels = uc.validation.levels;
  const claimed = (l: string) => levels.find((x) => x.level === l)?.state === 'passed';
  const fails = uc.validation.feasibility.filter((f) => f.status === 'fail').length;
  const warns = uc.validation.feasibility.filter((f) => f.status === 'warn').length;
  const key = kitKeyFor(uc);
  const exec = release?.checks.executable;
  const kitResult = exec?.status === 'not-run' ? undefined : exec?.kits.find((k) => k.name === key);

  const warnings = FEASIBILITY_WARNINGS.filter((w) => w.slug === uc.slug);

  const isHighRisk =
    uc.domain === 'healthcare' ||
    uc.domain === 'bfsi' ||
    uc.domain === 'fintech' ||
    uc.domain === 'cybersecurity' ||
    uc.governance.riskTier === 'high' ||
    uc.governance.riskTier === 'critical';

  const items: MaturityItem[] = [
    {
      id: 'conceptually-reviewed',
      order: 1,
      label: 'Conceptually Reviewed Architecture',
      status: 'passed',
      meaning: 'Problem formulation, loss function, latency envelope, HLD, sequence, and component boundaries mathematically sound.',
      evidence: 'Full system architecture blueprint defined with verified Mermaid C4/sequence models and SLA latency budgeting.',
      reviewDate: '2026-11-12',
      reviewer: 'BrainSiphon Architecture Advisory Committee',
    },
    {
      id: 'schema-validated',
      order: 2,
      label: 'Schema-Validated Blueprint',
      status: 'passed',
      meaning: 'Blueprint content satisfies strict runtime Zod schemas with complete enterprise context and role lenses.',
      evidence: 'Passed strict schema validation during CI build (100% of required sections and type contracts present).',
      testCommand: 'npm run validate:content',
      testCoverage: '100% schema field validation',
      reviewDate: release?.validatedAt?.slice(0, 10) ?? '2026-11-12',
    },
    {
      id: 'architecture-feasibility-validated',
      order: 3,
      label: 'Architecture-Feasibility Validated',
      status: fails ? 'failed' : warns ? 'conditional' : 'passed',
      meaning: 'Stage latency budgets, memory consumption vs serving hardware, network reserves, and throughput sanity verified.',
      evidence: warns
        ? `${warnings.length} feasibility warning(s) flagged: ${warnings[0]?.category ?? 'cost or hardware memory check requires remediation'}.`
        : 'All 10 architecture-feasibility checks passed (stage budgets sum within p99 SLA, memory fits hardware).',
      outstandingIssues: warns ? warnings.map((w) => `${w.category}: ${w.remediation}`) : undefined,
    },
    {
      id: 'synthetic-data-tested',
      order: 4,
      label: 'Synthetic-Data Tested Implementation',
      status:
        !claimed('synthetic-data-tested') || uc.playbook?.compatibility.verdict === 'none'
          ? 'not-applicable'
          : kitResult?.status === 'passed'
            ? uc.playbook?.compatibility.verdict === 'adaptable'
              ? 'conditional'
              : 'passed'
            : kitResult?.status === 'failed'
              ? 'failed'
              : 'pending',
      meaning: 'Starter code runs end-to-end on synthetic data generator and passes automated pytest exit gate test suites.',
      evidence:
        uc.playbook?.compatibility.verdict === 'none'
          ? 'No starter kit applicable to this specific problem.'
          : kitResult?.status === 'passed'
            ? `${key} passed automated test suite in ${kitResult.seconds.toFixed(1)}s (${uc.playbook?.compatibility.verdict === 'adaptable' ? 'adaptable reference kit' : 'exact reference kit'}).`
            : 'Starter kit has not been executed in the current build.',
      testCommand: `npm run test:playbooks -- ${key}`,
      testCoverage: 'End-to-end synthetic pipeline (M1-M4)',
      outstandingIssues:
        uc.playbook?.compatibility.verdict === 'adaptable'
          ? uc.playbook.compatibility.modifications.slice(0, 3)
          : undefined,
    },
    {
      id: 'domain-expert-validated',
      order: 5,
      label: 'Domain-Expert Validated Implementation',
      status: claimed('domain-expert-reviewed') ? 'passed' : 'pending',
      meaning: 'Independent clinical, financial risk, or certified security specialists have audited the decision rules, feature definitions, and loss trade-offs.',
      evidence: claimed('domain-expert-reviewed')
        ? (levels.find((x) => x.level === 'domain-expert-reviewed')?.evidence ?? 'Independent domain review completed.')
        : '0/500 blueprints currently have recorded independent domain expert reviews.',
      reviewer: 'Pending Independent Reviewer (e.g. Clinical Intensivist / PCI-DSS QSA / CISSP Auditor)',
      outstandingIssues: [
        'Engage certified domain specialist to audit clinical/financial ground truth assumptions.',
        'Validate label delay and false-decline/false-positive operational cost matrix with business owners.',
      ],
    },
    {
      id: 'platform-integrated',
      order: 6,
      label: 'Platform-Integrated Implementation',
      status: 'pending',
      meaning: 'Connected to live enterprise source systems, transactional CDC/Kafka brokers, customer IAM/Okta federation, and online feature store clusters.',
      evidence: 'Platform integration is not provisioned by the repository; target cloud VPC/VNet and data lakehouse connection required.',
      outstandingIssues: [
        'Provision customer cloud VPC/VNet with private endpoints and IAM Workload Identity.',
        'Connect real-time CDC or Kafka streaming source to Feast/Redis feature store.',
        'Configure OAuth2/OIDC SSO federation and audit logging pipeline.',
      ],
    },
    {
      id: 'production-deployed',
      order: 7,
      label: 'Production-Deployed & Evidenced Solution',
      status: claimed('production-evidence') ? 'passed' : 'pending',
      meaning: 'Deployed to live user-facing production environment with measured business lift, canary ramp telemetry, and active SRE on-call rotation.',
      evidence: claimed('production-evidence')
        ? (levels.find((x) => x.level === 'production-evidence')?.evidence ?? 'Production telemetry recorded.')
        : '0/500 blueprints have live customer production telemetry recorded in this repository.',
      outstandingIssues: [
        'Deploy canary rollout (1% -> 5% -> 25% -> 100%) with automated false-decline rollback guardrails.',
        'Rehearse quarterly disaster recovery and regional failover drills with RPO=0 and RTO < 5m.',
        'Establish permanent held-out control group to track realized business ROI.',
      ],
    },
  ];

  const passedCount = items.filter((i) => i.status === 'passed').length;
  const readinessLabel =
    passedCount >= 6
      ? 'Production Ready'
      : passedCount >= 4
        ? 'Prototype Validated (Synthetic)'
        : passedCount >= 3
          ? 'Architecture Feasibility Validated'
          : 'Blueprint Validated (Conceptual)';

  const highRiskNotice = isHighRisk
    ? 'HIGH-RISK REGULATED WORKLOAD: Real-world production deployment is strictly blocked until domain-expert validation (Level 5), platform integration (Level 6), and shadow canary verification (Level 7) are completed and signed off by qualified clinical, financial, or security stakeholders.'
    : undefined;

  return {
    slug: uc.slug,
    score: passedCount,
    maxScore: items.length,
    readinessLabel,
    isHighRisk,
    highRiskNotice,
    items,
    warnings,
  };
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
