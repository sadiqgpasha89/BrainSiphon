/**
 * Enterprise layer of Blueprint 2.0, generated deterministically from each use case's own fields (objective, signals, noise,
 * baseline and production model, pipeline stages, constraints, edge cases, metrics) plus per-domain enterprise facts:
 *
 *   enterpriseContext  business, application, data, technology, security and operating architecture; C4 context and container
 *                      diagrams; NFR matrix; ADRs; build / buy / integrate
 *   decisionMatrix     the AI Architect's record: why AI, why this paradigm, what else was considered, what would change it
 *   governance         risk tier and the controls and evidence that follow from it
 *   mlops              the nine-area MLOps lifecycle (plus LLMOps where behaviour depends on prompts, indexes or providers)
 *   operations         SLOs, telemetry, incident model, ten failure scenarios and unit cost
 *   validation         what has and has not been verified: automated gates versus human review and production evidence
 *
 * Nothing here is expert-reviewed unless `content/reviews.json` says so; the validation block says that on every page.
 */
import {
  VALIDATION_LEVELS,
  type Domain,
  type DecisionMatrix,
  type EnterpriseContext,
  type Governance,
  type LatencySLA,
  type Mlops,
  type Operations,
  type Paradigm,
  type PatternId,
  type RiskTier,
  type Validation,
} from '../schemas/usecase.schema';
import { CASCADE, LABEL_DELAY, PROTOCOLS, RESIDENCY, TAIL_COHORTS, type Stance, type Topology } from './extras';
import { DOMAIN_ENTERPRISE } from './enterprise-domains';
import { m, snake, TOTAL_BUDGET_MS, type Stage } from './design';
import type { FeasibilityCheck } from './feasibility';
import type { RawUseCase } from './parse';
import { usd, type ScaleResult } from './scale';

export interface EntCtx {
  raw: RawUseCase;
  domain: Domain;
  paradigms: Paradigm[];
  latency: LatencySLA;
  pattern: PatternId;
  stance: Stance;
  scale: ScaleResult;
  stages: Stage[];
  topology: Topology;
  features: string[];
}

export interface Review {
  reviewer: string;
  date: string;
  scope: string;
}

/* ------------------------------------------------------------------ helpers */

const lc = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const strip = (s: string) => s.trim().replace(/[.;]+$/, '');
const num = (n: number) => Math.round(n).toLocaleString('en-US');
const isLlm = (c: EntCtx) => c.paradigms.includes('llm-agents') || c.pattern === 'llm-agent' || c.pattern === 'llm-rag';
const isBatch = (c: EntCtx) => c.scale.mode === 'batch';
const regulated = (c: EntCtx) => c.stance === 'residency-pinned';
const syncStages = (c: EntCtx) => c.stages.filter((s) => !s.async);
const modelStage = (c: EntCtx) => c.stages.find((s) => s.kind === 'model') ?? c.stages[0]!;
const decisionText = (c: EntCtx) => `${c.raw.title} ${c.raw.obj} ${c.raw.con.join(' ')}`.toLowerCase();

const availabilityOf = (c: EntCtx): number => {
  const stated = c.raw.con.map((x) => /(99\.9{1,3})\s*%/.exec(x)).find(Boolean);
  if (stated) return Number(stated[1]);
  return regulated(c) ? 99.99 : 99.95;
};
const budgetMinutes = (avail: number) => Math.round(43_200 * (1 - avail / 100) * 10) / 10;

export function drFor(c: EntCtx): { rpoSeconds: number; rtoSeconds: number; replication: 'sync' | 'async' | 'batch-rerun'; text: { rto: string; rpo: string; strategy: string } } {
  if (isBatch(c))
    return {
      rpoSeconds: 86_400,
      rtoSeconds: 7_200,
      replication: 'batch-rerun',
      text: {
        rto: '2 hours (one run window)',
        rpo: 'Last completed daily partition',
        strategy: 'Inputs are replicated across regions; a failed run is re-executed in the standby region from the same partition and published atomically, so consumers never see half a run.',
      },
    };
  if (c.stance === 'residency-pinned')
    return {
      rpoSeconds: 0,
      rtoSeconds: 300,
      replication: 'sync',
      text: {
        rto: '5 minutes for the state plane (fenced failover), under 60 seconds for the stateless inference plane',
        rpo: '0 (synchronous in-jurisdiction standby)',
        strategy: 'Active-active stateless inference in three regions; state shards pinned to the jurisdiction with a synchronous standby and fenced leader election; no cross-border replication of raw records.',
      },
    };
  if (c.stance === 'tenant-isolated')
    return {
      rpoSeconds: 30,
      rtoSeconds: 900,
      replication: 'async',
      text: {
        rto: '15 minutes per tenant cell, under 60 seconds for the inference plane',
        rpo: 'Up to 30 seconds of tenant state (asynchronous replication lag)',
        strategy: 'Stateless inference is active-active; tenant cells replicate asynchronously to a standby region and the largest tenants fail over independently.',
      },
    };
  return {
    rpoSeconds: 60,
    rtoSeconds: 300,
    replication: 'async',
    text: {
      rto: '5 minutes (region evacuation), under 60 seconds for request routing',
      rpo: 'Up to 60 seconds of feature state; exact counters have a single writer per key',
      strategy: 'Three active-active regions sized so that losing one still serves peak; stale-tolerant features replicate asynchronously and exact counters fail over with fencing.',
    },
  };
}

/* ------------------------------------------------------------------ enterprise context */

function c4Context(c: EntCtx): string {
  const d = DOMAIN_ENTERPRISE[c.domain];
  const L = [
    'flowchart LR',
    `  U1["${m(d.stakeholders[0]!.who, 48)}"] -->|consumes decisions| SYS`,
    `  U2["${m(d.stakeholders[1]!.who, 48)}"] -->|reviews and overrides| SYS`,
    `  UP1["${m(d.upstream[0]!, 48)}"] -->|requests and events| SYS`,
    `  UP2["${m(d.upstream[1]!, 48)}"] -->|signals| SYS`,
    `  SYS["${m(c.raw.title, 44)}<br/>AI decision service"] -->|decision with reason codes| DN1["${m(d.downstream[0]!, 48)}"]`,
    `  SYS -->|cases and tasks| DN2["${m(d.downstream[1]!, 48)}"]`,
    `  SYS <-->|read context and write back| SOR1[("${m(d.systemsOfRecord[0]!, 44)}")]`,
    `  SYS -.->|audit and lineage| GOV["Model governance and audit"]`,
  ];
  return L.join('\n');
}

function c4Container(c: EntCtx): string {
  const d = DOMAIN_ENTERPRISE[c.domain];
  const sync = syncStages(c);
  const asyncS = c.stages.filter((s) => s.async);
  const L = ['flowchart TB', '  subgraph EXT["Enterprise landscape"]', `    UP["${m(d.upstream[0]!, 44)}"]`, `    SOR[("${m(d.systemsOfRecord[0]!, 44)}")]`, `    DN["${m(d.downstream[0]!, 44)}"]`, '  end', '  subgraph AI["AI service (trust boundary)"]'];
  L.push('    GW["Edge and API gateway"]');
  sync.forEach((s, i) => L.push(`    C${i + 1}["${m(s.label, 36)}<br/>${m(s.tech, 30)}"]`));
  asyncS.forEach((s, i) => L.push(`    A${i + 1}["${m(s.label, 36)}<br/>${m(s.tech, 30)}"]`));
  L.push('    LED[("Decision ledger")]', '  end', '  subgraph MLP["ML platform"]', '    REG["Model registry and release gates"]', '    PIPE["Data and feature pipelines"]', '    MON["Monitoring and drift"]', '  end');
  L.push('  UP --> GW');
  L.push(`  GW --> C1`);
  sync.slice(1).forEach((_, i) => L.push(`  C${i + 1} --> C${i + 2}`));
  L.push(`  C${sync.length} --> DN`, `  C${sync.length} --> LED`);
  asyncS.forEach((_, i) => L.push(`  LED -.-> A${i + 1}`));
  L.push('  SOR <--> PIPE', '  PIPE --> C2', '  REG -->|signed model| C1', '  LED --> MON', '  MON -->|retrain trigger| REG');
  return L.join('\n');
}

export function buildEnterpriseContext(c: EntCtx): EnterpriseContext {
  const { raw, domain, scale } = c;
  const d = DOMAIN_ENTERPRISE[domain];
  const sync = syncStages(c);
  const batch = isBatch(c);
  const dr = drFor(c);
  const avail = availabilityOf(c);
  const total = TOTAL_BUDGET_MS[c.latency];
  const sn0 = raw.sn[0]!;
  const slugTail = raw.key;
  const f = c.features;
  const llm = isLlm(c);

  const freshness = batch ? 'before the run starts' : c.latency === 'sub-10ms' ? '5 seconds' : c.latency === 'sub-100ms' ? '30 seconds' : '60 seconds';
  const quality = regulated(c) ? { completeness: '99.9%', accuracy: 'reconciled to the system of record daily' } : { completeness: '99.5%', accuracy: 'sampled and reconciled weekly' };

  const sources = raw.sig.slice(0, 4).map((s, i) => ({
    source: `${strip(s[0]!)} inputs`,
    owner: d.owners[i % d.owners.length]!,
    systemOfRecord: d.systemsOfRecord[i % d.systemsOfRecord.length]!,
    ingestion: batch
      ? 'Daily partition (CDC snapshot or file drop) with a manifest and row counts'
      : i % 2 === 0
        ? `CDC or event stream (Kafka) with ${freshness} freshness at p95`
        : 'API lookup with a cached snapshot and a stale-with-flag fallback',
    quality: `Point-in-time rule: ${lc(strip(s[3]!))}.`,
  }));

  const contractFields = f.slice(0, 3).map((x) => `    - { name: ${snake(x)}, type: double, nullable: false }`).join('\n');
  const contractExample = `contract: ${snake(slugTail)}_inputs.v1
owner: ${d.owners[0]!.toLowerCase().replace(/\s+/g, '-')}@example.com
system_of_record: ${d.systemsOfRecord[0]}
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
${contractFields}
sla:
  freshness_p95: ${batch ? 'available_before_run' : freshness}
  completeness: ">=${quality.completeness}"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }`;

  const qualitySla = [
    { dimension: 'Completeness', target: `${quality.completeness} of required fields populated`, check: `Null-rate assertion on ${f[0] ?? 'the leading feature'} and the event key, evaluated per partition` },
    { dimension: 'Accuracy', target: `Values ${quality.accuracy}`, check: `Reconcile aggregates for ${f[1] ?? f[0] ?? 'the leading feature'} against ${d.systemsOfRecord[0]}` },
    { dimension: 'Freshness', target: batch ? 'Inputs landed before the run window opens' : `p95 event-to-feature delay ${freshness}`, check: 'Measured at the consumer (not the producer) and alerted against the contract' },
    { dimension: 'Uniqueness', target: 'Duplicate event_id rate below 0.01%', check: 'Idempotent consumers plus a duplicate-rate assertion' },
    { dimension: 'Validity', target: 'Zero schema violations reach the model plane', check: 'Registry compatibility check in CI; violating rows go to a quarantine table with a reason' },
    { dimension: 'Point-in-time correctness', target: 'Every training feature is reproducible from data known at decision time', check: 'Replay the logged feature vector for a sample and compare with the offline join' },
  ];

  const trust = [
    `Internet and partners to the edge gateway: WAF, authentication, per-key rate limits (${PROTOCOLS[domain].split(',')[0]!.trim()})`,
    'Gateway to the inference plane: mTLS with workload identity, deadline propagation, no raw credentials',
    c.stance === 'residency-pinned' ? 'Inference plane to the state plane: jurisdiction-pinned shards, service identity per key range, no raw regulated data crossing regions' : c.stance === 'tenant-isolated' ? 'Inference plane to tenant cells: tenant-scoped keys, row-level security, per-tenant KMS keys' : 'Inference plane to feature and data stores: service identity with read-only scopes, per-region replicas',
    'Training and analytics plane to production: no direct writes; only signed registry artifacts cross the boundary',
    ...(llm ? ['Model to tools boundary: a deterministic policy engine checks every outbound call; retrieved text is treated as untrusted data'] : []),
  ];

  const nfr = [
    { attribute: 'Latency', requirement: total === null ? 'Run completes inside a 2 hour window' : `p99 ≤ ${total} ms end to end including edge and network reserve`, measuredBy: total === null ? 'Run duration per partition' : 'Per-stage and end-to-end latency histograms at the gateway' },
    { attribute: 'Availability', requirement: `${avail}% (${budgetMinutes(avail)} minutes of error budget per 30 days)`, measuredBy: 'Successful in-deadline responses ÷ valid requests' },
    { attribute: 'Throughput', requirement: batch ? `${num(scale.eventsPerDay)} rows per daily run` : `${num(scale.provisionedQps)} req/s provisioned (peak ${num(scale.peakQps)} req/s)`, measuredBy: batch ? 'Rows processed per run' : 'Load test at 1.2× provisioned' },
    { attribute: 'Data freshness', requirement: batch ? 'Inputs landed before the run' : `Features ${freshness} fresh at p95`, measuredBy: 'Consumer-side freshness SLI per contract' },
    { attribute: 'Recovery', requirement: `RTO ${dr.text.rto}; RPO ${dr.text.rpo}`, measuredBy: 'Quarterly failover game-day with measured RTO and RPO' },
    { attribute: 'Security', requirement: `${d.classification.split(';')[0]!}; no direct production writes from the training plane`, measuredBy: 'Access review, penetration test and policy-as-code checks' },
    { attribute: 'Auditability', requirement: 'Every decision replayable from (feature hash, model version, policy version, output)', measuredBy: 'Sampled ledger replay reproduces the output' },
    { attribute: 'Explainability', requirement: llm ? 'Every answer cites its sources and tool calls' : 'Top reason codes returned with each decision', measuredBy: 'Reason-code coverage and sampled review' },
    { attribute: 'Cost', requirement: `≤ ${usd(scale.costPer1kUSD * 1.2)} per 1,000 decisions (1.2× the modelled ${usd(scale.costPer1kUSD)})`, measuredBy: 'FinOps unit-cost dashboard' },
  ];

  const failurePolicy = regulated(c) || /fraud|decline|block|abuse/.test(decisionText(c))
    ? 'Degrade to the in-process baseline, then to a conservative default (step-up or route to review) rather than failing open or closed outright.'
    : 'Serve stale-with-flag features, then the baseline model, then a safe business default; never block the calling system.';

  const adrs = [
    {
      id: 'ADR-001',
      title: c.stance === 'residency-pinned' ? 'Split a stateless inference plane from a jurisdiction-pinned state plane' : c.stance === 'tenant-isolated' ? 'Isolate tenant state in cells behind a shared stateless inference plane' : 'Run stateless inference active-active with single-writer exact state',
      status: 'accepted' as const,
      context: strip(c.topology.summary) + '.',
      decision: `Inference plane: ${strip(c.topology.inferencePlane)}. State plane: ${strip(c.topology.statePlane)}.`,
      alternatives: ['Active-active writes for all state in every region (split-brain risk for exact counters and ledgers)', 'A single region with a cold standby (fails the recovery objective)'],
      consequences: `Failover of the inference plane is routine; failover of the state plane needs fencing and a rehearsed runbook. ${dr.text.strategy}`,
    },
    {
      id: 'ADR-002',
      title: `Model strategy: ${strip(raw.prod).split(',')[0]!}`,
      status: 'accepted' as const,
      context: `${raw.title} must meet: ${raw.con.slice(0, 2).map(strip).join('; ')}.`,
      decision: strip(raw.prod) + '.',
      alternatives: [`Baseline only: ${strip(raw.base)}`, 'Rules and thresholds without a learned model', 'A larger model or an LLM in the decision path'],
      consequences: `The baseline stays deployed as degradation level 2 and as the benchmark every challenger must beat; the cost envelope is ${usd(scale.costPer1kUSD)} per 1,000 decisions.`,
    },
    {
      id: 'ADR-003',
      title: batch ? 'Exchange data as atomic daily partitions with manifests' : 'Synchronous gRPC with deadline propagation; events for everything else',
      status: 'accepted' as const,
      context: `${d.upstream[0]} and ${d.systemsOfRecord[0]} are owned by other teams and change on their own schedules.`,
      decision: batch ? 'Consume immutable partitions with row-count manifests and publish results atomically, so a failed run never exposes partial output.' : `Keep the decision path synchronous with the remaining deadline passed to every hop; publish decisions and outcomes as events through a transactional outbox so ${d.systemsOfRecord[0]} and the analytics plane stay consistent without dual writes.`,
      alternatives: ['Direct database reads from the owning system (couples release cycles)', 'Fully asynchronous decisions (cannot meet the response deadline)'],
      consequences: `Every upstream gets its own timeout, retry budget and circuit breaker; protocol translation (${PROTOCOLS[domain].split(',')[0]!.trim()}) lives in an anti-corruption layer.`,
    },
    {
      id: 'ADR-004',
      title: 'Failure policy when a dependency is unavailable',
      status: 'proposed' as const,
      context: `Edge cases such as "${raw.edge[0]![0]}" show that neither failing open nor failing closed is acceptable on its own.`,
      decision: failurePolicy,
      alternatives: ['Fail open (accept the risk of the unscored case)', 'Fail closed (reject or block everything unscored)'],
      consequences: 'Needs sign-off from the decision owner because it fixes the business cost of a degraded decision. Each rung of the degradation ladder is tested monthly.',
    },
  ];

  const buildBuy = llm
    ? {
        question: `How should ${raw.title} source its language model and retrieval stack?`,
        options: [
          { option: 'Managed foundation-model API plus managed vector search', chooseWhen: 'Data may leave the boundary under contract and time to value matters most', risk: 'Provider outages, price changes and silent model updates; needs a gateway with fallbacks and pinned versions' },
          { option: 'Self-hosted open-weights model with in-house retrieval', chooseWhen: 'Residency, cost at volume or confidentiality rule out external APIs', risk: 'You own GPU capacity, patching and evaluation; quality may lag frontier models on hard cases' },
          { option: 'Small fine-tuned model for the high-volume tier, routed with a large model for hard cases', chooseWhen: 'An evaluation set shows prompting and retrieval cannot close a measurable gap, and volume justifies it', risk: 'Fine-tune drift, data-rights questions and a retraining pipeline to maintain' },
        ],
        recommendation: `Start with the managed API behind an internal gateway, measure on the frozen evaluation set, then route the high-volume tier to a smaller model once the cost per ${d.unit} justifies it. ${regulated(c) ? 'For regulated data, begin self-hosted or in a contractually bounded private endpoint.' : 'Keep the gateway so the provider can change without touching applications.'}`,
      }
    : {
        question: `Build, buy or integrate the scoring capability behind ${raw.title}?`,
        options: [
          { option: 'Build in-house on the shared ML platform', chooseWhen: 'The signal is proprietary (your labels, your entities) and the decision is a core differentiator', risk: 'Needs a sustained team for features, validation and operations' },
          { option: 'Buy a vendor model or managed service and integrate its score as a feature', chooseWhen: 'The problem is commodity or you lack labels at the start', risk: 'Opaque behaviour, vendor lock-in and data leaving your boundary; keep the policy layer in-house' },
          { option: 'Hybrid: vendor signal as a feature into an in-house model and policy engine', chooseWhen: 'A vendor sees data you cannot, but the final decision and its explanation must be yours', risk: 'Two systems to monitor; the vendor score can drift or change without notice' },
        ],
        recommendation: `${regulated(c) ? 'Keep the model, policy engine and decision ledger in-house because a regulator reads them; ' : 'Build the model and policy layer on the shared platform; '}buy commodity components (managed feature store, embeddings, OCR, enrichment feeds) and integrate vendor signals as versioned features behind data contracts.`,
      };

  return {
    business: {
      capability: d.capability,
      processes: d.processes,
      stakeholders: d.stakeholders,
      currentState: `${d.processes[0]} runs on fixed rules, manual work and periodic reports on top of ${d.legacy}. The usual failure is ${lc(strip(sn0[2]!))}: ${lc(strip(sn0[3]!))}.`,
      futureState: `${raw.title} runs as a governed service next to ${d.systemsOfRecord[0]}: ${sync.slice(0, 4).map((s) => s.label).join(' → ')} produce the decision ${total === null ? 'inside the run window' : `within ${total} ms`}, the system of record keeps ownership of state, and every decision carries its model and policy version.`,
      decisionOwner: `${d.stakeholders[0]!.who} owns the business outcome and the thresholds; the model owner in ${d.team} owns the model; an independent validator challenges both.`,
      kpis: raw.on.map(strip),
    },
    application: {
      systemsOfRecord: d.systemsOfRecord,
      upstream: d.upstream,
      downstream: d.downstream,
      integration: [
        { boundary: `${d.upstream[0]} → ${raw.title}`, style: batch ? 'Immutable daily partition with a manifest and row counts' : 'Synchronous gRPC or REST with deadline propagation and an idempotency key', contract: `${PROTOCOLS[domain]}, terminated at an anti-corruption layer into one internal schema`, onFailure: 'Timeout falls to the degradation ladder; the service never blocks its caller beyond the caller\'s own SLA' },
        { boundary: `${raw.title} → ${d.downstream[0]}`, style: 'Decision event plus idempotent write-back through a transactional outbox', contract: 'Versioned decision schema: decision_id, action, reason codes, model and policy version', onFailure: 'Retry with the same decision_id, park poison messages in a dead-letter topic and reconcile nightly' },
        { boundary: `${d.systemsOfRecord[0]} ↔ feature pipelines`, style: 'Change-data-capture into Kafka, then stream or batch transforms', contract: 'Avro or Protobuf with registry compatibility BACKWARD_TRANSITIVE and a data contract', onFailure: 'Schema break or poison pill goes to quarantine; features are served stale with a flag' },
        { boundary: `${d.downstream[1]} ↔ ${raw.title}`, style: 'REST or GraphQL case API behind OIDC with RBAC', contract: 'Case, evidence and override schema; every override is a labelled outcome', onFailure: 'Queues persist; SLA timers escalate unreviewed items' },
        { boundary: 'Model registry → serving', style: 'Signed artifact pull gated by stage', contract: 'Digest, data-snapshot id, code commit and approvals', onFailure: 'Serving keeps the last verified version and refuses unsigned or unapproved artifacts' },
      ],
      coexistence: `Do not replace ${d.legacy} in one step. Run ${raw.title} in shadow beside the existing path, put an anti-corruption layer in front (strangler pattern) and move a growing share of decisions through it. Keep the legacy path as the fallback until canary guardrails have held for a full label-maturity window (${LABEL_DELAY[domain]}).`,
    },
    data: {
      sources,
      contractExample,
      qualitySla,
      lineage: `Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as ${f[0] ?? 'the leading feature'}, traces back to ${d.systemsOfRecord[0]}; the decision ledger links each decision to the feature-vector hash and dataset snapshot.`,
      onSchemaChange: batch
        ? 'Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.'
        : 'Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.',
      corrections: 'Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.',
      privacyDeletion: regulated(c)
        ? `${d.privacy}. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.`
        : `${d.privacy}. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.`,
    },
    technology: {
      hosting: d.hosting,
      compute: `${num(scale.nodes)} ${scale.nodeUnit} for ${batch ? `${num(scale.eventsPerDay)} rows per run` : `${num(scale.provisionedQps)} req/s`} (${scale.nodeCapacity}); ${scale.redisShards} online feature-store shards and ${scale.kafkaPartitions} event-bus partitions.`,
      dataPlatform: `Lakehouse (Iceberg or Delta) as the system of analytical record, Kafka as the event backbone, an online feature store for ${batch ? 'batch lookups' : 'millisecond reads'}, and a catalogue with lineage and classification.`,
      aiPlatform: `${llm ? 'LLM gateway (routing, quotas, fallbacks, caching), vector index, evaluation harness' : 'Feature store, experiment tracking, model registry'}, signed artifacts and a serving layer (${modelStage(c).tech}).`,
      deployment: `Kubernetes with GitOps; ${batch ? 'orchestrated batch jobs (Airflow or Dagster) on autoscaled workers' : 'blue-green for the serving plane, shadow then canary for models'}; infrastructure as code; environments dev, staging and production with promotion by evidence.`,
      dr: { rto: dr.text.rto, rpo: dr.text.rpo, strategy: dr.text.strategy },
    },
    security: {
      identity: d.identity,
      classification: d.classification,
      encryption: `TLS 1.3 and mTLS in transit; AES-256 at rest with envelope keys in KMS${c.stance === 'tenant-isolated' ? ' and per-tenant keys (BYOK)' : regulated(c) ? ' backed by an HSM and jurisdiction-scoped keys' : ''}; secrets in a vault, never in prompts, configs or logs.`,
      trustBoundaries: trust,
      privacy: d.privacy,
    },
    operating: {
      serviceOwner: `${d.team} owns ${raw.title} as a product with a named service owner, an on-call rotation and an error budget.`,
      supportModel: 'L1 monitors dashboards and follows runbooks; L2 (ML platform on-call) restarts, rolls back and backfills; L3 (model and data owners) diagnoses quality and data issues. Vendors are engaged through L3 only.',
      lifecycleOwners: [
        { asset: 'Model, thresholds and challenger pipeline', owner: `${d.team} model owner (accountable) with an independent validator` },
        { asset: 'Data contracts and feature definitions', owner: `${d.owners[0]} and ${d.owners[1]}` },
        { asset: 'Serving platform, SLOs and capacity', owner: 'ML platform / SRE team' },
        { asset: 'Labels, outcomes and the feedback loop', owner: d.owners[2]! },
        { asset: 'Business rules, policy and decision thresholds', owner: d.stakeholders[0]!.who },
      ],
    },
    c4Context: c4Context(c),
    c4Container: c4Container(c),
    nfr,
    adrs,
    buildBuy,
  };
}

/* ------------------------------------------------------------------ decision matrix */

const PARADIGM_WHY: Record<PatternId, { why: string; deep: [string, string]; llm: string }> = {
  tabular: { why: 'The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply.', deep: ['Deep tabular or sequence transformer', 'Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates'], llm: 'An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation' },
  forecast: { why: 'Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals.', deep: ['Deep global forecaster (transformer or N-BEATS class)', 'Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail'], llm: 'A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios' },
  anomaly: { why: 'Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm.', deep: ['Deep sequence autoencoder', 'Harder to explain and tune, with little evidence it beats seasonal baselines on this signal'], llm: 'Use an LLM for triage and root-cause narration of alerts, not for detection' },
  recommender: { why: 'Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context.', deep: ['Sequence transformer ranker', 'Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift'], llm: 'An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment' },
  graph: { why: 'The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see.', deep: ['Full GNN inference per request', 'Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously'], llm: 'An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring' },
  nlp: { why: 'The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss.', deep: ['Large decoder model for every item', 'Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band'], llm: 'Reserve a large model for the low-confidence tail and for generating explanations' },
  cv: { why: 'The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving.', deep: ['Larger foundation vision model on every frame', 'GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only'], llm: 'Use a vision-language model offline for labelling and for explanation, not per-frame inference' },
  bandit: { why: 'The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities.', deep: ['Full reinforcement learning', 'Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation'], llm: 'An LLM can propose candidate actions, but the selection stays with the bandit and its constraints' },
  optimize: { why: 'Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation.', deep: ['End-to-end learned policy', 'Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs'], llm: 'An LLM can translate planner requests into solver parameters, but must not produce the plan itself' },
  'llm-rag': { why: 'Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot.', deep: ['Fine-tune a model on the corpus', 'Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first'], llm: 'A bigger model alone does not fix grounding; retrieval quality and permissions do' },
  'llm-agent': { why: 'The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified.', deep: ['Fully autonomous agent with broad tools', 'Unsafe without earned autonomy; start at read-only and promote by evidence'], llm: 'This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers' },
};

export function buildDecisionMatrix(c: EntCtx): DecisionMatrix {
  const { raw, domain, scale } = c;
  const d = DOMAIN_ENTERPRISE[domain];
  const w = PARADIGM_WHY[c.pattern];
  const sn0 = raw.sn[0]!;
  const text = decisionText(c);
  const hasHuman = c.stages.some((s) => s.kind === 'human');
  const { tier } = riskTierOf(c);
  const rawMode: DecisionMatrix['humanOversight']['mode'] =
    c.pattern === 'llm-agent' || domain === 'healthcare' || /credit|lend|underwrit|claim|clinical|diagnos|sepsis|triage|assess|valuation/.test(text)
      ? 'human-in-the-loop'
      : hasHuman || /fraud|alert|block|moderation|abuse|anomal|escalat|review/.test(text)
        ? 'human-on-the-loop'
        : 'autonomous-with-audit';
  // an AI risk tier of high or critical is never fully autonomous
  const mode: DecisionMatrix['humanOversight']['mode'] = (tier === 'high' || tier === 'critical') && rawMode === 'autonomous-with-audit' ? 'human-on-the-loop' : rawMode;
  const oversight: Record<DecisionMatrix['humanOversight']['mode'], string> = {
    'human-in-the-loop': 'A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.',
    'human-on-the-loop': 'The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.',
    'autonomous-with-audit': 'The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.',
  };

  const baseline = strip(raw.base);
  return {
    whyAI: `${strip(raw.obj)}. The evidence that separates good from bad outcomes (${c.features.slice(0, 3).join(', ')}) is high-dimensional and shifts over time, which a fixed threshold cannot track.`,
    whyNotRules: `Rules of the form "${lc(strip(sn0[2]!))}" are what teams reach for first, and they fail because ${lc(strip(sn0[3]!))}. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.`,
    whyThisParadigm: `${w.why} Here the production design is: ${strip(raw.prod)}.`,
    alternatives: [
      { option: 'Rules and thresholds only (status quo)', verdict: 'rejected', reason: `Cannot capture the interactions among ${c.features.slice(0, 3).join(', ')} and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder.` },
      { option: `Baseline: ${baseline}`, verdict: 'fallback', reason: 'Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback.' },
      { option: strip(raw.prod), verdict: 'chosen', reason: `Meets the ${TOTAL_BUDGET_MS[c.latency] === null ? 'run-window' : `${TOTAL_BUDGET_MS[c.latency]} ms`} envelope at ${usd(scale.costPer1kUSD)} per 1,000 decisions and exposes the signals the baseline cannot use.` },
      { option: w.deep[0], verdict: 'later', reason: w.deep[1] },
      { option: 'LLM or agent as the decision maker', verdict: 'rejected', reason: w.llm },
      { option: 'Buy a vendor model end to end', verdict: regulated(c) ? 'rejected' : 'later', reason: regulated(c) ? 'The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision.' : 'Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house.' },
    ],
    whyChosen: `It is the smallest architecture that meets the objective, the constraints (${raw.con.slice(0, 2).map((x) => lc(strip(x))).join('; ')}) and the cost envelope, while keeping every simpler option available as a fallback.`,
    changeTriggers: [
      `Label volume or signal changes enough that a ${lc(w.deep[0])} beats the champion by a pre-agreed margin on the frozen holdout and every protected slice`,
      `The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)`,
      `The guardrail metric (${strip(raw.on[0]!)}) breaches for two consecutive matured-label windows despite retraining`,
      `A new regulatory or contractual requirement changes what must be explained, localised or approved (${RESIDENCY[domain] ? strip(RESIDENCY[domain]!).split(',')[0]! : d.regulatory[0]!.obligation})`,
      `The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation`,
    ],
    topology: `${CASCADE[scale.computeClass]}. ${c.topology.stance === 'stateless-active-active' ? 'Single stateless model plane' : c.topology.stance === 'residency-pinned' ? 'Stateless model plane with jurisdiction-pinned state' : 'Shared model plane with tenant-scoped adapters'}; platform choice: a centralised AI platform (registry, feature store, gateway) with federated domain ownership of models.`,
    sourcing: isLlm(c)
      ? 'Buy the foundation model via an internal gateway for the hard tier, host a small open-weights model for volume, and fine-tune only after the evaluation set shows a gap that prompting and retrieval cannot close.'
      : 'Build the model, policy engine and decision ledger on the shared platform; buy commodity components (managed feature store, embeddings, OCR, enrichment feeds); fine-tune a pretrained encoder only if labelled volume justifies it. Retire duplicate models by registering every model in one inventory.',
    humanOversight: { mode, detail: oversight[mode] },
    economics: `At 10 million users the model plane costs about ${usd(scale.monthlyTotalUSD)} per month (${usd(scale.costPer1kUSD)} per 1,000 decisions) on ${num(scale.nodes)} ${scale.nodeUnit}. The cascade is the lever: every request resolved at an earlier tier skips the expensive stage, so accuracy is bought only where the uncertain band justifies its latency and cost.`,
  };
}

/* ------------------------------------------------------------------ governance */

const TREATMENT: Record<RiskTier, string> = {
  low: 'Standard security, testing and operational controls.',
  medium: 'Additional data, privacy, fairness and human-review controls.',
  high: 'Formal risk assessment, independent validation, auditability and controlled deployment.',
  critical: 'Strict approval boundaries, continuous assurance, human oversight where required and rehearsed fail-safe mechanisms.',
};
const APPROVALS: Record<RiskTier, string[]> = {
  low: ['Model owner approves promotion when the automated gates are green', 'Security review through the standard SDLC checklist'],
  medium: ['Model owner and product owner approve promotion on green gates and fairness-slice results', 'Privacy review of data use and retention', 'Security review of the model, prompts and tools'],
  high: ['Formal AI risk assessment before build and before launch', 'Independent validation by a team that did not build the model', 'Risk owner and model-risk committee approve promotion; canary only', 'Annual revalidation and re-approval on material change'],
  critical: ['Formal AI risk assessment and hazard or safety case before build', 'Independent validation plus domain safety sign-off (clinical, regulatory or equivalent)', 'Rehearsed manual fail-safe before go-live and a defined stop authority', 'Continuous assurance reviewed monthly, with re-approval on any model or data change'],
};

export function riskTierOf(c: EntCtx): { tier: RiskTier; drivers: string[] } {
  const d = DOMAIN_ENTERPRISE[c.domain];
  const text = decisionText(c);
  const drivers: string[] = [];
  const consequential = /credit|lend|underwrit|claim|aml|sanction|kyc|fraud|decline|block|diagnos|clinical|patient|sepsis|triage|deteriorat|proctor|grade|assessment|hiring|eviction|tenant screening|valuation|autonomous|safety/.test(text);
  const clinical = c.domain === 'healthcare' && /diagnos|clinical|patient|sepsis|triage|deteriorat|safety|mortality|readmission/.test(text);
  const agentActs = c.pattern === 'llm-agent';
  // default: personal-data or regulated domains start at medium, the rest at low; a consequential decision about a person or an account moves to high
  let score = Math.min(d.baseRisk, 1);
  if (consequential) {
    score = 2;
    drivers.push('the output can deny, block, diagnose or price a person or an account');
  }
  if (d.baseRisk === 2) drivers.push(`${c.domain === 'healthcare' ? 'clinical' : 'financial'} domain where a regulator reads the model`);
  else if (d.baseRisk === 1) drivers.push('personal or customer data is processed');
  if (clinical) {
    score = 3;
    drivers.push('patient safety depends on the output');
  } else if (agentActs && d.baseRisk === 2 && consequential) {
    score = 3;
    drivers.push('an agent can take consequential actions through tools in a regulated domain');
  } else if (agentActs) {
    score = Math.min(3, score + 1);
    drivers.push('an agent can take actions through tools');
  }
  if (isBatch(c) && !consequential && !agentActs) {
    score -= 1;
    drivers.push('batch output that a person consumes before any action');
  }
  const tier: RiskTier = (['low', 'medium', 'high', 'critical'] as const)[Math.max(0, Math.min(3, score))]!;
  if (!drivers.length) drivers.push('no direct decision about a person; internal optimisation with reversible effects');
  return { tier, drivers };
}

export function buildGovernance(c: EntCtx): Governance {
  const { domain } = c;
  const d = DOMAIN_ENTERPRISE[domain];
  const { tier, drivers } = riskTierOf(c);
  const llm = isLlm(c);
  const rag = c.pattern === 'llm-rag' || (llm && /rag|retriev|knowledge|docs|search/.test(decisionText(c)));
  const explain = llm
    ? 'Cite retrieved sources and show tool calls for every answer'
    : c.pattern === 'tabular' || c.pattern === 'graph'
      ? 'Return top reason codes (SHAP-based or monotone-constrained) with every decision'
      : 'Expose the main drivers or retrieved evidence behind each output';

  return {
    riskTier: tier,
    rationale: `${tier.charAt(0).toUpperCase() + tier.slice(1)} risk because ${drivers.join('; ')}. The category is a default for this domain and consequence; the deployer must confirm it against the actual jurisdiction and use.`,
    treatment: TREATMENT[tier],
    approvalPath: APPROVALS[tier],
    data: [
      { area: 'Classification and privacy', control: `Tag every dataset and feature with a classification (${d.classification.split(';')[0]!}); enforce column-level access and mask in analyst views`, evidence: 'Catalogue export showing classification coverage and a quarterly access review' },
      { area: 'Consent and data-use rights', control: 'Record the lawful basis and permitted purposes per dataset; a use outside the recorded purpose fails the pipeline policy check', evidence: 'Purpose register and failed-check log' },
      { area: 'Residency and sovereignty', control: RESIDENCY[domain] ? `Pin regulated state by jurisdiction (${strip(RESIDENCY[domain]!)})` : 'Region-pinned storage where contracts or law require; cross-border flows carry derived features, not raw records', evidence: 'Region policy as code and a storage-location report' },
      { area: 'Retention and deletion', control: 'Per-dataset retention, legal-hold support and key-based deletion that reaches features, embeddings, caches and training snapshots', evidence: 'Deletion-latency measurement and a retention-exception register' },
    ],
    model: [
      { area: 'Inventory and ownership', control: 'Every model, prompt set and index is a registry entry with a named owner and risk tier', evidence: 'Model inventory export; no production artifact without an entry' },
      { area: 'Risk classification', control: `Tier assigned at intake (${tier}) and reviewed on any change of use, data or autonomy`, evidence: 'Intake record and tier change log' },
      { area: 'Documentation and approval', control: 'Model card (purpose, data, limits, slice results), intended-use statement and approvals attached to each version', evidence: 'Model card and approval trail in the registry' },
      { area: 'Validation and periodic review', control: tier === 'low' || tier === 'medium' ? 'Automated gates before promotion and a scheduled owner review' : 'Independent validation before promotion and a scheduled revalidation', evidence: 'Validation report and review minutes' },
      { area: 'Version and decision traceability', control: 'Each decision stores (feature-vector hash, model version, policy version, output) in an append-only ledger', evidence: 'Sampled ledger replay reproduces the output' },
    ],
    responsibleAI: [
      { area: 'Fairness and bias', control: `Report performance and error rates by slice, including ${TAIL_COHORTS[domain]}; set floors per slice and treat a breach as a release blocker`, evidence: 'Slice report per release and the recorded trade-off decisions' },
      { area: 'Explainability', control: explain, evidence: 'Reason-code or citation coverage metric and sampled human review' },
      { area: 'Human oversight', control: 'Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue', evidence: 'Oversight procedure and review-queue SLA reports' },
      { area: 'Transparency and accountability', control: 'Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome', evidence: 'User-facing notice and the RACI entry' },
      { area: 'Appeal and override', control: 'A route to contest a decision and a logged override that becomes a labelled outcome', evidence: 'Appeal log with resolution times and override rate' },
    ],
    aiSecurity: [
      { threat: llm ? 'Prompt injection and jailbreaks' : 'Adversarial inputs that evade the model', control: llm ? 'Treat retrieved and tool text as untrusted data, mark it, classify ingress and enforce a deterministic outbound policy engine' : 'Rate-limit and monitor probing, randomise thresholds near the boundary and keep rules and a challenger as a second opinion' },
      { threat: 'Training-data poisoning', control: 'Provenance and signatures on datasets, label audits, outlier checks, matured-label-only training and a holdout the pipeline cannot write to' },
      { threat: 'Model theft and extraction', control: 'Authenticate and rate-limit callers, return only the fields consumers need, audit high-volume querying and encrypt artifacts at rest' },
      { threat: 'Insecure model supply chain', control: 'Sign and verify artifacts, pin and scan base models and dependencies, keep an ML bill of materials and refuse unsafe serialisation formats from untrusted sources' },
      { threat: 'Agent privilege escalation', control: 'Typed least-privilege tools, on-behalf-of tokens for the calling user, approval for every write tool and a bounded budget of steps and cost' },
      { threat: rag ? 'Retrieval-based data leakage' : 'Leakage through features, logs and caches', control: rag ? 'Apply permission filters inside the retrieval query before top-k, scope indexes and caches by tenant, and redact secrets before indexing' : 'Redact sensitive fields from logs and traces, scope caches by principal and exclude prohibited attributes from features' },
    ],
    regulatory: d.regulatory.slice(0, 4),
  };
}

/* ------------------------------------------------------------------ MLOps / LLMOps */

export function buildMlops(c: EntCtx): Mlops {
  const { raw, domain, scale } = c;
  const f = c.features;
  const llm = isLlm(c);
  const batch = isBatch(c);
  const prod = strip(raw.prod).split(',')[0]!;
  const { tier } = riskTierOf(c);
  const serving = modelStage(c).tech;
  const area = (a: string, practice: string, artifact: string, gate: string) => ({ area: a, practice, artifact, gate });

  return {
    lifecycle: [
      area('Experiment management', `Track every run of ${prod} (MLflow or equivalent): code commit, data snapshot id, hyperparameters, seeds, environment lock and metrics (${strip(raw.off[0]!)}); cap and log hyperparameter-search budgets.`, 'Run record and reproducibility manifest', 'A promoted model can be rebuilt from its manifest within metric tolerance'),
      area('Data and feature lifecycle', `Validate inputs (Great Expectations, Deequ or pandera), define features such as ${f[0] ?? 'the leading feature'} once in a feature registry, test offline-online consistency and version datasets with lakehouse snapshots.`, 'Dataset snapshot id, feature definitions and validation report', 'No training on data that fails its contract'),
      area('Model lifecycle management', 'Keep every version in a registry with model card, signed artifact, lineage and an approval workflow matched to the risk tier.', 'Registry version and model card', `Approvals for tier "${tier}" are complete`),
      area('ML CI/CD and continuous training', 'CI runs transform unit tests, contract tests and a training smoke test on synthetic data; CD builds, scans and signs the image; CT retrains on schedule or trigger and runs automated evaluation and promotion gates.', 'Pipeline run with evaluation report', 'Challenger beats champion on the frozen holdout and on every protected slice'),
      area('Deployment and release management', batch ? 'Package the job as a container, orchestrate with Airflow or Dagster, publish partitions atomically and promote by dry-run, shadow run and then cut-over.' : `Containerise (Docker), deploy on Kubernetes with ${serving}; use blue-green for the serving plane and shadow then canary (1%, 5%, 25%, 100%) for models.`, 'Release record with canary results', 'p99, error rate and cost per 1,000 decisions stay within budget through the canary'),
      area('Monitoring and observability', 'Track data drift, feature drift, prediction drift and, once labels mature, concept drift and model quality per slice, together with latency, throughput and cost.', 'Dashboards, alerts and SLO definitions', 'Alerts and owners exist before launch; drift without a quality drop opens an investigation, not a retrain'),
      area('Retraining and rollback', `Retrain on matured labels only (labels here: ${LABEL_DELAY[domain]}); run champion/challenger evaluation; keep the previous champion warm; retire models with no traffic.`, 'Retrain decision record', 'Rollback to the previous champion is one step and rehearsed each quarter'),
      area('Infrastructure and platform operations', `Terraform for infrastructure, secrets in a vault, environment promotion dev → staging → production, and autoscaling on queue depth for ${num(scale.nodes)} ${scale.nodeUnit} with utilisation targets and a tested disaster-recovery path.`, 'IaC repository and capacity plan', 'Environments are reproducible from code and failover is exercised'),
      area('Operational governance', 'Maintain artifact lineage, access controls, audit logs, approvals, the model inventory and a release-evidence bundle per version.', 'Release evidence bundle', 'Every production version has a complete evidence bundle'),
    ],
    retraining: {
      triggers: [
        `Quality on matured labels falls below the guardrail (${strip(raw.on[0]!)}) for two consecutive windows`,
        'Feature drift (PSI above 0.2 on a top feature) together with a prediction-distribution shift',
        `A scheduled refresh (${isBatch(c) ? 'per run window' : 'monthly'}) so the model never ages past its label horizon`,
        'An upstream contract or semantic change in a source dataset',
      ],
      dataMaturity: `Train only on windows whose labels have matured (${LABEL_DELAY[domain]}); treat the rest as censored and never as negatives.`,
      championChallenger: 'The challenger must match or beat the champion on a frozen time-forward holdout and on every protected slice, survive a shadow window, then pass canary guardrails before promotion.',
    },
    rollback: [
      'Automatic rollback to the previous registry version on SLO or guardrail breach during canary',
      'Manual one-step rollback with the previous champion kept warm and signature-verified',
      'Feature-pipeline rollback by flipping the versioned namespace pointer back',
      'If the new version corrupted decisions, replay affected inputs through the previous version and correct downstream records from the ledger',
    ],
    toolchain: [
      { concern: 'Experiment tracking and registry', options: 'MLflow, Weights & Biases, SageMaker or Vertex model registry' },
      { concern: 'Pipelines and orchestration', options: batch ? 'Airflow, Dagster, Kubeflow Pipelines, Spark on Kubernetes' : 'Kubeflow Pipelines, Argo Workflows, Airflow, Flyte' },
      { concern: 'Feature store and data validation', options: 'Feast, Tecton or a managed store; Great Expectations, Deequ, pandera' },
      { concern: 'Serving and release', options: llm ? 'vLLM, TensorRT-LLM, KServe behind an LLM gateway' : 'Triton, KServe, Seldon, BentoML, ONNX Runtime' },
      { concern: 'Monitoring', options: 'Prometheus and Grafana, OpenTelemetry, Evidently or WhyLabs for drift' },
      { concern: 'Infrastructure and secrets', options: 'Terraform or Pulumi, Kubernetes, HashiCorp Vault or cloud KMS' },
    ],
    ...(llm
      ? {
          llmops: [
            { area: 'Prompts as versioned code', practice: 'Store prompts and templates in the repository, version them with the model, test them with a golden set and gate releases on the result.' },
            { area: 'Retrieval index lifecycle', practice: 'Version the index and its embedding model together; rebuild on a schedule; monitor retrieval hit rate and staleness; invalidate caches on any change.' },
            { area: 'Provider and model changes', practice: 'Pin provider model versions, shadow-test a new version on the evaluation set before switching, and keep a fallback provider behind the gateway.' },
            { area: 'Token consumption and cost', practice: 'Budget tokens per request and per tenant, cache prompts and responses where safe, and alert on cost per answer.' },
            { area: 'Grounding and hallucination', practice: 'Measure groundedness, citation accuracy and refusal behaviour continuously; sample production traffic for human review.' },
            { area: 'Agent behaviour', practice: 'Replay recorded sessions against new prompts or tools, track tool-call success and step counts, and require approval for any widened autonomy.' },
            { area: 'Evaluation harness', practice: 'Deterministic assertions first, calibrated LLM judges second, human review on a stratified sample; regressions block release.' },
          ],
        }
      : {}),
  };
}

/* ------------------------------------------------------------------ production operations */

export function buildOperations(c: EntCtx): Operations {
  const { raw, domain, scale } = c;
  const d = DOMAIN_ENTERPRISE[domain];
  const batch = isBatch(c);
  const total = TOTAL_BUDGET_MS[c.latency];
  const avail = availabilityOf(c);
  const llm = isLlm(c);
  const gpu = scale.computeClass.startsWith('gpu');
  const dr = drFor(c);
  const featureStage = c.stages.find((s) => s.kind === 'feature');
  const model = modelStage(c);
  const source = raw.sig[0] ? `${strip(raw.sig[0][0]!)} inputs` : 'the leading input';
  const owner0 = d.owners[0]!;
  const r1 = (n: number) => Math.round(n * 10) / 10;

  const sc = (failure: string, detection: string, alert: string, owner: string, mitigation: string, recovery: string, learning: string) => ({ failure, detection, alert, owner, mitigation, recovery, learning });

  const scenarios = [
    sc('Model endpoint becomes unavailable', `Health probes and error rate on ${model.label}; breaker state`, 'Page L2 when errors exceed 2% for 2 minutes', 'ML platform on-call', `Breaker opens and traffic drops to the in-process baseline (${strip(raw.base).split(',')[0]!}) at degradation level 2`, 'Restart or roll back the serving deployment, then close the breaker through half-open probing', 'Add a synthetic probe for the failure path and review autoscaling and readiness checks'),
    sc('Model quality deteriorates', `Matured-label metric (${strip(raw.on[0]!)}), score-distribution and PSI drift, slice floors`, 'Ticket on drift, page on a guardrail breach', `${d.team} model owner`, 'Move thresholds to a conservative setting or promote the warm previous champion', 'Train a challenger on the latest matured window and pass the promotion gates', `Add the offline-online trap "${strip(raw.gap[0]!)}" to the regression suite`),
    featureStage
      ? sc('Feature store becomes unavailable', `${featureStage.label} p99 above its sub-budget, error rate and replica lag`, 'Page L2 when lookups time out for more than 1 minute', 'ML platform on-call', 'Serve cached features stamped as stale and use the payload-only model; skip optional enrichment', 'Fail over to the replica or restore the shard, then re-warm the cache', 'Rehearse the stale-feature path monthly and track the share of decisions made on stale data')
      : sc('Upstream snapshot is unavailable', 'Manifest missing or row count outside tolerance before the run', 'Alert the data owner and the run orchestrator', owner0, 'Hold the run and publish the last good output flagged as stale', 'Re-run from the corrected snapshot in the standby region', 'Add the manifest check to the producer contract'),
    sc('Training pipeline fails', 'Pipeline run state and the absence of a new registry version at the expected time', 'Ticket to the pipeline owner; page if two consecutive runs fail', `${d.team} model owner`, 'Keep the current champion and freeze automatic promotion', 'Re-run from the last good dataset snapshot after fixing the cause', 'Add a contract or resource test for the failing step'),
    sc('Data source stops sending records', `Volume and freshness anomaly on ${source} against the data contract`, 'Alert the data owner after one missed freshness window', owner0, 'Mark dependent features stale, degrade one level and tell the decision owner', 'Backfill into a versioned namespace once the source recovers, then flip the pointer', 'Tighten the contract SLA and add a consumer-side freshness alert'),
    sc('New model produces unexpected predictions', 'Shadow disagreement rate, score-distribution shift and canary guardrails', 'Automatic halt of the canary and a page to the model owner', `${d.team} model owner`, 'Automatic rollback to the previous version', 'Freeze promotion, diagnose on the logged feature vectors and fix', 'Add the failing cases to the golden set and the promotion gate'),
    llm
      ? sc('LLM provider experiences an outage', 'Provider error rate and latency at the gateway; synthetic prompts', 'Page L2 when error rate exceeds 5% for 3 minutes', 'AI platform on-call', 'Gateway fails over to the secondary provider or the small self-hosted model and degrades long-context features', 'Return to the primary after a half-open probe passes, and replay queued requests that can safely wait', 'Run a provider-failover game day and keep evaluation results for the fallback model current')
      : sc('A third-party dependency is unavailable', 'Per-dependency error rate, timeout rate and breaker state', 'Page L2 when a breaker stays open for 5 minutes', 'ML platform on-call', 'Open the breaker and use cached or default values with a flag; shed non-critical enrichment', 'Close the breaker through half-open probes after the dependency recovers', 'Record the dependency in the service map with its fallback and contract'),
    sc(gpu ? 'GPU resources are exhausted' : 'Compute capacity is exhausted', `${scale.nodeUnit} utilisation, queue depth and queue wait against the remaining deadline`, 'Page L2 when queue wait exceeds 30% of the deadline', 'SRE / ML platform', 'Adaptive concurrency limits shed background and retry traffic first, then route low-value requests to the cheaper tier', `Scale out the node pool${gpu ? ', or fall back to a smaller model while capacity is requested' : ''}, then lift limits gradually`, 'Revisit the capacity model with real peak data and set autoscaling on queue depth'),
    sc('An agent executes an incorrect action', 'Verifier rejections, approval-rejection rate and anomalies in the tool-call audit log', 'Page the agent owner on any write action outside policy', 'AI platform on-call with the business owner', 'Revoke the tool scope and drop the agent to read-only (L0)', 'Apply the compensating action through the idempotent reversal path and restore from the ledger if needed', 'Add the trace to the replay set and tighten the policy engine before restoring autonomy'),
    sc('A regional cloud outage occurs', 'Synthetic probes from all regions and the control-plane health feed', 'Page SRE and the incident commander', 'SRE / incident commander', `The inference plane serves from the remaining regions (N+1 sizing); the state plane follows ${c.stance === 'residency-pinned' ? 'fenced failover to the in-country standby' : c.stance === 'tenant-isolated' ? 'per-cell failover' : 'single-writer failover'}`, `Meet RTO ${dr.text.rto}; verify RPO ${dr.text.rpo}; fail back after reconciliation`, 'Run quarterly game days and record measured RTO and RPO'),
  ];

  const unit = d.unit;
  const slos: Operations['slos'] = [
    { sli: `Share of valid requests answered inside the deadline`, slo: batch ? 'Run completes inside the 2 hour window on 99% of days' : `${avail}% over 30 days`, window: '30 days', errorBudget: batch ? '≈ 7 late runs per year' : `${budgetMinutes(avail)} minutes of unavailability per 30 days` },
    { sli: 'End-to-end latency', slo: total === null ? 'Run duration p95 within 70% of the window' : `p50 ≤ ${r1(total * 0.35)} ms, p95 ≤ ${r1(total * 0.7)} ms, p99 ≤ ${total} ms`, window: '30 days, per region', errorBudget: total === null ? 'Any run over the window' : '1% of requests may exceed p99; burn-rate alerts at 2% in 1 hour' },
    { sli: 'Input freshness at the consumer', slo: batch ? 'All inputs landed before the run opens' : 'p95 event-to-feature delay inside the contract', window: 'Rolling 1 day', errorBudget: 'Two breaches per week before the data owner is escalated' },
    { sli: 'Model quality on matured labels', slo: `${strip(raw.on[0]!)} within guardrail`, window: 'Weekly, per slice', errorBudget: 'No slice below its floor for two consecutive windows' },
    { sli: 'Decisions served from a degraded path', slo: '≤ 1% of decisions below degradation level 1', window: '30 days', errorBudget: '1% of decisions; a breach triggers a review of the ladder' },
    { sli: `Cost per 1,000 decisions`, slo: `≤ ${usd(scale.costPer1kUSD * 1.2)}`, window: 'Monthly', errorBudget: '20% over the modelled cost before FinOps review' },
  ];

  return {
    slos,
    telemetry: [
      { layer: 'Model', signals: 'Score and calibration distributions, drift (PSI/KS) per feature, slice metrics, challenger agreement' },
      { layer: 'Data', signals: 'Freshness, volume, schema and null-rate per contract, quarantine counts, late-event share' },
      { layer: 'Infrastructure', signals: `${scale.nodeUnit} utilisation, queue depth, memory, replica lag, event-bus consumer lag` },
      { layer: 'Application', signals: `Per-stage latency (${syncStages(c).map((s) => s.label).slice(0, 3).join(', ')}), error rate by dependency, fallback level, decisions by action` },
    ],
    severities: [
      { sev: 'SEV1', definition: `Decisions are wrong, unavailable or unsafe for many ${unit}s, or a regulatory obligation is at risk`, response: 'Page immediately, incident commander named, 15 minute acknowledgement, executive update every 30 minutes' },
      { sev: 'SEV2', definition: 'Degraded path in use, a guardrail is breaching or one region or tenant is affected', response: 'Page L2, 30 minute acknowledgement, fix within the working day' },
      { sev: 'SEV3', definition: 'Drift warning, non-critical dependency failure or a single failed run with a safe fallback', response: 'Ticket to the owning team, fixed within the sprint' },
    ],
    support: [
      { level: 'L1', owns: 'Watch dashboards, follow runbooks, restart jobs, open and route tickets' },
      { level: 'L2', owns: 'ML platform on-call: rollbacks, backfills, scaling, breaker and feature-store operations' },
      { level: 'L3', owns: `${d.team} model and data owners: quality diagnosis, retraining, contract changes; vendors engaged here only` },
    ],
    release: {
      deploy: batch ? 'Signed image and model artifact promoted through GitOps; dry-run, shadow run, then cut-over at a run boundary.' : 'Signed image and model artifact promoted through GitOps; blue-green for the serving plane; shadow then canary (1%, 5%, 25%, 100%) with automatic halt on SLO or guardrail breach.',
      rollback: 'One-step revert to the previous registry version and serving revision, with backward-compatible schema migrations only; rollback is rehearsed every quarter.',
    },
    capacity: `${num(scale.nodes)} ${scale.nodeUnit} provisioned for ${batch ? `${num(scale.eventsPerDay)} rows per run` : `${num(scale.provisionedQps)} req/s`} (${r1(scale.utilisation * 100)}% planned utilisation at peak). Autoscale on queue depth and queue wait, load-test at 1.2× provisioned before peak seasons, and re-run the sizing calculator with real traffic each quarter.`,
    scenarios,
    unitCost: [
      { unit: `Cost per ${unit}`, value: usd(scale.costPer1kUSD / 1000), how: 'Monthly run cost ÷ monthly decisions (modelled; on-demand list prices)' },
      { unit: 'Cost per 1,000 decisions', value: usd(scale.costPer1kUSD), how: 'Published in the capacity table and re-run live in the sizing calculator' },
      { unit: 'Modelled monthly run cost at 10M users', value: usd(scale.monthlyTotalUSD), how: 'Compute + platform overhead + cache and bus + storage' },
      { unit: 'Infrastructure cost per daily active user per month', value: usd(scale.monthlyTotalUSD / scale.dau), how: 'Monthly run cost ÷ daily active users' },
    ],
  };
}

/* ------------------------------------------------------------------ validation provenance */

export function buildValidation(
  c: EntCtx,
  feasibility: FeasibilityCheck[],
  opts: { hasPlaybook: boolean; hasStarter: boolean; starterAdaptable?: boolean; hasCompatibleKit?: boolean; review?: Review },
): Omit<Validation, 'provenance'> {
  const fails = feasibility.filter((x) => x.status === 'fail').length;
  const warns = feasibility.filter((x) => x.status === 'warn').length;
  const evidence = {
    schema: 'Passed the strict Zod schema at build time; a missing or malformed section fails the build.',
    technical: fails === 0 ? `${feasibility.filter((x) => x.status === 'pass').length} architecture feasibility checks passed${warns ? `, ${warns} with a warning to read` : ''}; Mermaid diagrams parse and loss formulas compile in the content gate.` : 'Feasibility checks failed.',
    synthetic: opts.hasStarter
      ? opts.starterAdaptable
        ? 'The closest reference kit runs end to end on synthetic data in CI, but it solves a related problem, not this one: the playbook lists the changes it needs. Its numbers are the kit\'s, not this use case\'s.'
        : 'A starter kit for this problem runs end to end on synthetic data in CI. Its numbers are the kit\'s, not this use case\'s.'
      : opts.hasCompatibleKit === false
        ? 'No compatible executable starter kit exists for this problem, so none was run: the playbook is architecture and implementation guidance only.'
        : 'No starter kit has been run for this use case.',
    expert: opts.review ? `Reviewed by ${opts.review.reviewer} on ${opts.review.date}: ${opts.review.scope}` : 'No domain-specialist review is recorded for this blueprint.',
    production: 'No evidence from a real deployment or a production dataset is recorded.',
  };
  return {
    levels: [
      { level: VALIDATION_LEVELS[0], state: 'passed', evidence: evidence.schema },
      { level: VALIDATION_LEVELS[1], state: fails === 0 ? 'passed' : 'not-yet', evidence: evidence.technical },
      { level: VALIDATION_LEVELS[2], state: opts.hasStarter ? 'passed' : 'not-yet', evidence: evidence.synthetic },
      { level: VALIDATION_LEVELS[3], state: opts.review ? 'passed' : 'not-yet', evidence: evidence.expert },
      { level: VALIDATION_LEVELS[4], state: 'not-yet', evidence: evidence.production },
    ],
    feasibility,
  };
}
