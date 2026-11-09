/**
 * Generated per-blueprint extras that close the gaps a rigid template leaves:
 *  - topology: which plane is active-active and which state is pinned (residency, tenancy), instead of "3 regions" everywhere
 *  - roleLenses: what each of six personas must additionally check, specialised with this use case's own stages/features
 *  - primitives: the canonical mechanisms this system leans on, linked to /patterns/primitives/<id>
 */
import type { Domain, LatencySLA, Paradigm, PatternId } from '../schemas/usecase.schema';
import { ROLE_IDS, ROLE_META, type RoleId } from '../lib/roles';
import type { Stage } from './design';
import type { RawUseCase } from './parse';
import type { ScaleResult } from './scale';
import { PRIMITIVE_BY_ID } from './primitives';

export type Stance = 'stateless-active-active' | 'residency-pinned' | 'tenant-isolated';

export interface Topology {
  stance: Stance;
  summary: string;
  inferencePlane: string;
  statePlane: string;
  notes: string[];
}

export interface RoleLensItem {
  title: string;
  detail: string;
  primitive?: string;
}
export interface RoleLens {
  role: RoleId;
  focus: string;
  items: RoleLensItem[];
}

const REGULATED: Domain[] = ['fintech', 'bfsi', 'healthcare'];
const TENANT: Domain[] = ['saas', 'real-estate', 'cybersecurity'];

export const RESIDENCY: Partial<Record<Domain, string>> = {
  fintech: 'RBI payment-data localisation (UPI and card data stored only in India), PCI-DSS scope',
  bfsi: 'RBI/IRDAI data-localisation and outsourcing rules, GDPR for EU customers, regulator-readable audit',
  healthcare: 'ABDM, HIPAA and GDPR: identifiable clinical data stays in the patient\'s jurisdiction',
};

export function stanceOf(domain: Domain, raw: Pick<RawUseCase, 'obj' | 'con'>): Stance {
  if (REGULATED.includes(domain)) return 'residency-pinned';
  if (TENANT.includes(domain) || /\btenant|per-customer|B2B\b/i.test(`${raw.obj} ${raw.con.join(' ')}`)) return 'tenant-isolated';
  return 'stateless-active-active';
}

export function buildTopology(domain: Domain, stance: Stance, raw: Pick<RawUseCase, 'title'>, scale: ScaleResult): Topology {
  if (scale.mode === 'batch') {
    return {
      stance,
      summary:
        stance === 'residency-pinned'
          ? `${raw.title} runs as a batch plane per jurisdiction: partitions are processed where the data lives, and only aggregates or tokens cross borders.`
          : `${raw.title} runs as a single orchestrated batch plane with a warm standby region; there is no request path to make active-active.`,
      inferencePlane: 'Scheduled workers (Spark/Ray) in the data\'s home region; reruns are idempotent by partition.',
      statePlane: stance === 'residency-pinned' ? `Lakehouse and serving tables pinned to the residency region (${RESIDENCY[domain]}).` : 'Lakehouse with cross-region object replication; serving tables rebuilt from the lake on failover.',
      notes: ['Failover is a re-run in the standby region from replicated storage; RPO is the last completed partition.', 'Publish is atomic per partition so downstream consumers never see half a run.'],
    };
  }
  if (stance === 'residency-pinned') {
    return {
      stance,
      summary: `Split the system in two. The stateless inference plane is active-active across three regions. The stateful data plane (ledgers, velocity counters, patient or account state) is pinned to the jurisdiction of the data subject and replicated only to an in-country synchronous standby. ${RESIDENCY[domain]}.`,
      inferencePlane: 'Active-active in three regions, N+1. Holds no regulated state; reads features and writes decisions through the owning shard.',
      statePlane: 'Shard-pinned by data-subject jurisdiction, single writer per key, synchronous standby in-country (RPO 0) with fenced leader election. No cross-border replication of raw records.',
      notes: [
        'Active-active writes to a financial ledger or velocity counter under a network partition produce split-brain and double-spend: counters have one writer per key, other regions read async replicas.',
        'Cross-border calls carry tokens and derived features, never raw regulated records.',
        'Failover the inference plane freely; failover the state plane only with fencing and a rehearsed runbook.',
        'Append every decision to an immutable ledger: feature-vector hash, model version, policy version, output.',
      ],
    };
  }
  if (stance === 'tenant-isolated') {
    return {
      stance,
      summary: `For ${raw.title} the scaling limit is tenancy, not 10 million concurrent users: noisy-neighbour isolation, tenant-scoped keys and per-tenant adapters. The inference plane is stateless and active-active; tenant state lives in cells that can be pinned to a region.`,
      inferencePlane: 'Active-active in three regions with per-tenant quotas, concurrency limits and priority classes at the gateway.',
      statePlane: 'Tenant-scoped storage with row-level security and per-tenant KMS keys (BYOK); largest tenants get their own cell and optional region pinning.',
      notes: [
        'Per-tenant token buckets and separate queues keep one tenant\'s burst from consuming shared GPU or feature-store capacity.',
        'Caches, embeddings and fine-tuned adapters are keyed by tenant; nothing is shared across the tenant boundary.',
        'With small N per tenant, per-tenant models are sparse: fall back to a pooled base model plus a tenant adapter.',
      ],
    };
  }
  return {
    stance,
    summary: `Stateless, deadline-propagating serving in three active-active regions. State that must be exact (budgets, quotas, inventory counters) has a single writer per key; everything else tolerates stale reads.`,
    inferencePlane: 'Active-active in three regions, each sized so that losing one still serves peak.',
    statePlane: 'Online feature store replicated per region (eventually consistent, stale reads acceptable); exact counters are single-writer per key with async read replicas.',
    notes: [
      'Exact counters (budgets, inventory, quotas) must not be written from two regions at once: shard by key and route writes to the owner.',
      'When a region fails, stale features are served with a staleness flag before the system degrades to a smaller model.',
    ],
  };
}

/* ------------------------------------------------------------------ role lenses */

export const PROTOCOLS: Record<Domain, string> = {
  fintech: 'ISO 8583 over mTLS to card switches, NPCI UPI APIs, ISO 20022 for settlement',
  bfsi: 'ISO 20022 / SWIFT MX, core-banking MQ and batch copybooks, FIX for markets',
  healthcare: 'HL7 v2 over MLLP, FHIR R4 REST, DICOMweb and ABDM gateways',
  retail: 'catalogue and OMS feeds (GS1, EDI), payment-gateway webhooks, search and ads APIs',
  'supply-chain': 'EDI X12/EDIFACT, GS1 EPCIS, telematics over MQTT, TMS and WMS APIs',
  adtech: 'OpenRTB 2.5/3.0 (JSON or Protobuf), VAST, win-notice and billing callbacks',
  cybersecurity: 'syslog/CEF, OCSF and STIX/TAXII, EDR and SIEM connectors',
  edtech: 'LTI 1.3, xAPI/Caliper, QTI and OneRoster',
  saas: 'OAuth2/OIDC, REST and GraphQL product APIs, webhooks and SCIM',
  'real-estate': 'RESO Web API, MLS feeds, BIM/IFC and BACnet/Modbus building protocols',
};

export const LABEL_DELAY: Record<Domain, string> = {
  fintech: 'chargebacks that mature in 30 to 90 days',
  bfsi: 'defaults, claims and lapses that resolve over months',
  healthcare: 'outcomes such as 30-day readmission or mortality that arrive after discharge',
  retail: 'returns and refunds that arrive up to 30 days later',
  'supply-chain': 'delivery outcomes and claims that settle days to weeks later',
  adtech: 'conversions inside 1 to 30 day attribution windows',
  cybersecurity: 'incident confirmation that takes days to weeks',
  edtech: 'learning outcomes that show up over weeks or terms',
  saas: 'churn and expansion that show up 30 to 90 days later',
  'real-estate': 'sale, lease and valuation outcomes that take months',
};

export const TAIL_COHORTS: Record<Domain, string> = {
  fintech: 'thin-file and new-to-credit customers, first-time devices, small merchants',
  bfsi: 'thin-file borrowers, new-to-bank customers, small-balance accounts and rare product lines',
  healthcare: 'paediatric and elderly patients, renal failure, rare units and patients with missing devices',
  retail: 'cold-start users, long-tail sellers and new catalogue items',
  'supply-chain': 'new lanes, slow-moving SKUs and small carriers',
  adtech: 'new campaigns, small publishers and rare device types',
  cybersecurity: 'new tenants, rare log sources and low-volume languages',
  edtech: 'new learners, low-connectivity users and minority-language cohorts',
  saas: 'new and small tenants, rarely used features and non-English users',
  'real-estate': 'thin-comp micro-markets, unusual property types and new developments',
};

const RUNTIME: Record<ScaleResult['computeClass'], { compiler: string; bound: string }> = {
  'cpu-scorer': {
    compiler: 'Compile the trees with Treelite or ONNX Runtime, AVX-512 vectorised, cache-line aligned node layout, pinned cores and preallocated buffers',
    bound: 'Memory-latency bound: tree traversal chases pointers, so keep the model resident in L2/L3 and batch lookups; the feature fetch usually costs more than the model.',
  },
  'cpu-graph': {
    compiler: 'ONNX Runtime for the head, cached neighbourhood embeddings in an off-heap map, pinned cores',
    bound: 'Memory-latency bound on neighbourhood expansion; cap fan-out and precompute embeddings off the request path.',
  },
  'gpu-ranker': {
    compiler: 'TensorRT or Torch-TensorRT at FP16, fused embedding lookups, pinned host memory (cudaMallocHost) and CUDA graphs',
    bound: 'Embedding lookups are memory-bandwidth bound while the dense towers are compute bound; shard tables across HBM and host memory and watch PCIe transfers.',
  },
  'gpu-vision': {
    compiler: 'TensorRT at FP16/INT8 with hardware decode (NVDEC) and zero-copy pre-processing',
    bound: 'Often decode and pre-processing bound before the GPU saturates; batch across sources and ship events instead of frames.',
  },
  'gpu-encoder': {
    compiler: 'ONNX Runtime or TensorRT with length-bucketed dynamic batching and FP16',
    bound: 'Compute bound at large batch, queue-wait bound at small batch: the dynamic-batching delay is part of the latency budget.',
  },
  'gpu-llm': {
    compiler: 'vLLM, SGLang or TensorRT-LLM with FP8/AWQ quantisation, PagedAttention KV-cache sizing, prefix caching and speculative decoding',
    bound: 'Prefill is compute bound, decode is memory-bandwidth bound: size KV cache for concurrent sequences x context, and measure time-to-first-token and inter-token latency separately.',
  },
  'cpu-batch': {
    compiler: 'Spark with vectorised (Arrow) UDFs, partition sizing to 128 to 256 MB, broadcast joins for small dimensions',
    bound: 'Shuffle and skew bound; salt hot keys and compact small files.',
  },
  'gpu-batch': {
    compiler: 'Batch inference on spot GPUs with checkpoints every N batches, TensorRT or vLLM offline mode',
    bound: 'Data-loading bound in short windows; shard inputs to 128 MB or more and prefetch.',
  },
};

export const CASCADE: Record<ScaleResult['computeClass'], string> = {
  'cpu-scorer': 'L0 rules and Bloom filters resolve the obvious tail, L1 is the CPU GBDT, and only the uncertain band escalates to a deeper model or review',
  'cpu-graph': 'L0 blocklists, L1 CPU scorer on payload features, L2 graph-derived scalars read from the online store (computed asynchronously, never traversed inline)',
  'gpu-ranker': 'L0 availability and eligibility masks, L1 a cheap pre-ranker, L2 the GPU ranker on a short list',
  'gpu-vision': 'L0 motion/ROI gating, L1 a lightweight detector, L2 the heavy model on flagged frames',
  'gpu-encoder': 'L0 exact-match and cache, L1 a distilled encoder, L2 the large encoder on low-confidence inputs',
  'gpu-llm': 'L0 cache and rules, L1 a small routed model, L2 the large model for hard or high-value requests',
  'cpu-batch': 'L0 deterministic rules, L1 the main batch model, L2 expert review on the uncertain tail',
  'gpu-batch': 'L0 deterministic rules, L1 a cheap model, L2 the GPU model on the uncertain remainder',
};

const strip1 = (s: string) => s.trim().replace(/[.;]+$/, '');

export function buildRoleLenses(
  raw: RawUseCase,
  domain: Domain,
  paradigms: Paradigm[],
  latency: LatencySLA,
  pattern: PatternId,
  stance: Stance,
  scale: ScaleResult,
  stages: Stage[],
  features: string[],
): RoleLens[] {
  const has = (p: Paradigm) => paradigms.includes(p);
  const llm = has('llm-agents') || pattern === 'llm-agent' || pattern === 'llm-rag';
  const batch = scale.mode === 'batch';
  const modelStage = stages.find((s) => s.kind === 'model') ?? stages[0]!;
  const f1 = features[0] ?? 'the leading feature';
  const f2 = features[1] ?? f1;
  const sync = stages.filter((s) => !s.async);
  const rt = RUNTIME[scale.computeClass];
  const regulated = stance === 'residency-pinned';
  const total = latency === 'sub-10ms' ? '8 ms' : latency === 'sub-100ms' ? '80 ms' : latency === 'seconds' ? '2.5 s' : 'the run window';

  const L: Record<RoleId, RoleLensItem[]> = {
    'solution-architect': [
      {
        title: 'Legacy and protocol boundaries',
        detail: `${raw.title} meets the outside world over ${PROTOCOLS[domain]}. Terminate and translate at an anti-corruption layer so the model plane sees one internal schema, and give each upstream its own timeout, retry budget and circuit breaker.`,
      },
      {
        title: stance === 'residency-pinned' ? 'Residency and state synchronisation' : stance === 'tenant-isolated' ? 'Tenancy, not user count, is the bottleneck' : 'Consistency under regional failover',
        detail:
          stance === 'residency-pinned'
            ? `Do not replicate raw regulated state across three international regions (${RESIDENCY[domain]}). Keep the inference plane active-active and stateless; pin ledgers and counters to the data subject's jurisdiction with a synchronous in-country standby (RPO 0). State the PACELC choice: partitions favour consistency for money-moving state.`
            : stance === 'tenant-isolated'
              ? 'Size for the largest tenant and the noisiest neighbour: per-tenant quotas, tenant-scoped keys (BYOK), cell-based deployment and per-tenant adapter routing matter more than the 10M-user headline.'
              : 'State the PACELC choice per store: exact counters (budgets, inventory, quotas) are single-writer per key; features tolerate stale reads. Decide what happens to each when a region disappears.',
        primitive: stance === 'residency-pinned' ? 'residency-pinned-state' : stance === 'tenant-isolated' ? 'tenant-isolation' : 'outbox-cdc',
      },
      {
        title: 'Immutable auditability',
        detail: regulated
          ? `Append (feature_vector_hash, model_version, policy_version, output, reason codes) for every decision to a WORM ledger so a regulator can replay it. Keep the ledger separate from the analytics lake, with retention set by regulation.`
          : `Log inputs, model and policy versions and the output for every decision, append-only, so any disputed outcome can be replayed. Retention and access are an architecture decision, not an afterthought.`,
        primitive: 'wal-decision-ledger',
      },
    ],
    'ai-architect': [
      {
        title: 'Compound cascade topology',
        detail: `${CASCADE[scale.computeClass]}. For ${raw.title} the expensive tier is ${modelStage.label}; give each exit an explicit threshold and log which tier decided every request.`,
        primitive: 'compound-cascade',
      },
      {
        title: 'Shadow and canary governance',
        detail: `Mirror traffic to the challenger for ${modelStage.label} after the response is sent, with a bounded queue that drops on overflow and a logged feature vector instead of live feature-store reads. Promote 1% to 5% to 25% with automatic rollback on SLO or guardrail breach.`,
        primitive: 'shadow-canary-mirroring',
      },
      {
        title: 'Delayed attribution loop',
        detail: `Labels here arrive late: ${LABEL_DELAY[domain]}. Train on matured windows only, treat the rest as censored, and decide how recent behaviour is represented while its labels are still missing.`,
        primitive: 'delayed-label-attribution',
      },
    ],
    'data-engineer': [
      {
        title: 'Offline-online skew and point-in-time joins',
        detail: `Features such as "${f1}" and "${f2}" must come from one transform that writes to the online store and to an Iceberg/Delta table. Specify watermarks, allowed lateness and a side output for late events, and join labels on event time.`,
        primitive: 'point-in-time-feature-joins',
      },
      {
        title: 'Backfill isolation',
        detail: `Recomputing months of windowed features for ${raw.title} must not touch live keys: write to a versioned namespace, load at a capped share of store write IOPS, and flip a pointer only after count and distribution checks.`,
        primitive: 'backfill-isolation',
      },
      {
        title: 'Schema evolution and poison pills',
        detail: batch
          ? 'Enforce data contracts with upstream owners: compatibility checks in CI, a data-quality gate (freshness, nulls, schema) before the run, and a quarantine table for rejected rows.'
          : 'Enforce Avro/Protobuf compatibility in the registry (backward transitive). Decode failures go to a dead-letter topic, never crash the consumer, and replay through a bounded job.',
        primitive: 'schema-evolution-dlq',
      },
      {
        title: 'Source of truth to event bus',
        detail: 'Emit events with a transactional outbox and CDC rather than dual writes, and make consumers idempotent on event_id.',
        primitive: 'outbox-cdc',
      },
    ],
    'data-scientist': [
      {
        title: 'Counterfactuals and treatment bias',
        detail: `The decisions of ${raw.title} change the outcomes you later learn from: a blocked, alerted or re-ranked case may never show its ground truth. Log propensities, reweight (IPW) and keep a small random holdout or exploration bucket, otherwise each retrain learns that the previous model's actions were right.`,
        primitive: 'delayed-label-attribution',
      },
      {
        title: llm ? 'Judge calibration' : 'Post-hoc probability calibration',
        detail: llm
          ? 'Calibrate any LLM-as-judge against human labels on a stratified sample and report agreement per slice before it gates a release.'
          : `Focal or class-weighted loss distorts raw probabilities. Calibrate (Platt, isotonic or Venn-Abers) on a time-forward slice at serving prevalence wherever a threshold or expected-value formula consumes the score from ${modelStage.label}.`,
        primitive: llm ? undefined : 'probability-calibration',
      },
      {
        title: 'Tail-cohort slice metrics',
        detail: `Report performance bounds, not just the aggregate, for ${TAIL_COHORTS[domain]}. An average that hides a failing cohort is the usual way these systems pass review and fail in production.`,
      },
    ],
    'ai-engineer': [
      {
        title: 'Hot-path contract and fallback ladder',
        detail: `The ${sync.map((s) => s.label).slice(0, 3).join(' → ')} path runs under a ${total} budget with idempotency keys, a versioned request/response schema and a tested rung for every fallback level.${llm ? ' Model output is constrained to a JSON Schema.' : ''}`,
      },
      {
        title: llm ? 'Permission-aware retrieval and tool safety' : 'One transform for training and serving',
        detail: llm
          ? 'Apply ReBAC/ABAC filters inside the vector or hybrid query before top-k truncation so unauthorised chunks never enter the context; mutating tools get a dry-run, an idempotency key and a signed confirmation.'
          : `Package the feature transform once and import it in both the training job and the serving path; contract-test it on logged requests so "${f1}" cannot mean two things.`,
        primitive: llm ? 'permission-aware-retrieval' : 'point-in-time-feature-joins',
      },
      {
        title: 'Continuous evaluation harness',
        detail: `Freeze a golden set for ${raw.title}, run deterministic assertions first and calibrated judges second, and block release on regression. Invalidate semantic or response caches whenever the model, prompt, policy or feature definition changes.`,
        primitive: 'shadow-canary-mirroring',
      },
      ...(llm
        ? [
            {
              title: 'Untrusted content isolation',
              detail: 'Mark retrieved and tool-returned text as data, and enforce a deterministic policy engine on every outbound tool call so an injected instruction cannot exfiltrate or mutate.',
              primitive: 'spotlighting-policy-engine',
            },
          ]
        : []),
    ],
    'mlops-engineer': [
      {
        title: 'Registry, lineage and promotion gates',
        detail: `Register ${strip1(raw.prod)} as an immutable, signed version with its data snapshot, code commit, environment lock and model card. Promotion from staging to shadow to canary to production is a gate that needs evidence (metrics vs champion, slice floors, ${total} latency budget, cost per 1,000 decisions), not a button.`,
        primitive: 'model-registry-promotion-gates',
      },
      {
        title: 'Drift monitoring and retraining triggers',
        detail: `Separate feature drift, prediction drift and concept drift for ${raw.title}. Retrain only on matured labels (${LABEL_DELAY[domain]}) and only on evidence: a drop on matured labels triggers a challenger, drift alone opens an investigation.`,
        primitive: 'drift-triggered-retraining',
      },
      {
        title: 'Champion/challenger release and rollback',
        detail: `Shadow the challenger for ${modelStage.label}, canary at 1%, 5%, 25% with automatic halt on guardrail or SLO breach, keep the previous champion warm and rehearse the one-step rollback each quarter.`,
        primitive: 'shadow-canary-mirroring',
      },
      {
        title: batch ? 'Orchestration, idempotent runs and atomic publish' : 'Environments, infrastructure as code and autoscaling',
        detail: batch
          ? 'Make every run idempotent on its partition, orchestrate with retries and backfill isolation, and publish outputs atomically so a failed run never leaves a half-written table.'
          : `Provision with Terraform, promote dev to staging to production by evidence, keep secrets in a vault, and autoscale ${scale.nodeUnit} on queue depth with a tested disaster-recovery path.`,
        primitive: batch ? 'backfill-isolation' : undefined,
      },
      {
        title: 'Release evidence and audit trail',
        detail: 'Every production version has an evidence bundle (data snapshot, validation report, approvals, canary results, SLO baselines) and an append-only audit log of who promoted what and when.',
      },
      ...(llm
        ? [
            {
              title: 'LLMOps: prompts, indexes and providers are release artifacts',
              detail: 'Version prompts, retrieval indexes and provider models together; pin provider versions, shadow-test changes on the frozen evaluation set, track token spend per tenant and replay recorded agent sessions before widening autonomy.',
            },
          ]
        : []),
    ],
    'inference-engineer': [
      {
        title: 'Compiler and runtime',
        detail: `${rt.compiler}. Pin versions of runtime, kernels and model together and ship them as one signed artifact.`,
      },
      {
        title: 'Compute versus memory-bandwidth profile',
        detail: `${rt.bound} Provisioned here: ${scale.nodes} ${scale.nodeUnit} for ${Math.round(scale.provisionedQps).toLocaleString('en-US')} req/s (${scale.nodeCapacity}).`,
      },
      {
        title: batch ? 'Backpressure and checkpointing' : 'Adaptive load shedding',
        detail: batch
          ? 'Checkpoint every N batches so preemption is cheap, and bound in-flight partitions so downstream stores are not overrun.'
          : `Use a Little's-law or Vegas-style concurrency limiter on ${modelStage.label}: reject early when queue wait exceeds the remaining deadline of ${total}, shed retries and background traffic first, and trip breakers on queue depth before timeouts cascade.`,
        primitive: batch ? undefined : 'adaptive-concurrency-shedding',
      },
    ],
  };

  return ROLE_IDS.map((role) => ({ role, focus: ROLE_META[role].focus, items: L[role] }));
}

/* ------------------------------------------------------------------ primitives */

export function pickPrimitives(
  raw: RawUseCase,
  domain: Domain,
  paradigms: Paradigm[],
  pattern: PatternId,
  stance: Stance,
  scale: ScaleResult,
  lenses: RoleLens[],
): string[] {
  const text = `${raw.title} ${raw.obj} ${raw.prod} ${raw.pipe.map((p) => `${p.label} ${p.tech}`).join(' ')} ${raw.sig.map((s) => s[0]).join(' ')}`.toLowerCase();
  const out: string[] = [];
  const add = (id: string, when = true) => {
    if (when && PRIMITIVE_BY_ID[id] && !out.includes(id)) out.push(id);
  };
  const online = scale.mode !== 'batch';
  const llm = paradigms.includes('llm-agents') || pattern === 'llm-agent' || pattern === 'llm-rag';

  add('point-in-time-feature-joins', !llm);
  add('residency-pinned-state', stance === 'residency-pinned');
  add('tenant-isolation', stance === 'tenant-isolated');
  add('wal-decision-ledger', stance === 'residency-pinned');
  add('compound-cascade', online && !llm && scale.computeClass !== 'cpu-batch');
  add('two-tower-hnsw-cross-encoder', paradigms.includes('recommender') && online);
  add('position-bias-tower', paradigms.includes('recommender') && /rank|search|click|feed|slate/.test(text));
  add('availability-bitmap-prefilter', domain === 'retail' && /search|rank|recommend|catalog/.test(text));
  add('pid-budget-pacer', /\bbid|auction|pacing|budget/.test(text));
  add('bid-shading-clearing-price', /\bbid|auction/.test(text));
  add('streaming-graph-features', paradigms.includes('graph') && online);
  add('three-action-decision', /fraud|takeover|step-up|authori[sz]ation|abuse|bot/.test(text) && online);
  add('alert-hysteresis', /alert|early.warning|sepsis|triage|\bsoc\b|page|alarm/.test(text));
  add('delayed-label-attribution', true);
  add('probability-calibration', !llm);
  add('spotlighting-policy-engine', llm && /inject|jailbreak|copilot|agent|rag|tool/.test(text));
  add('permission-aware-retrieval', pattern === 'llm-rag' || (llm && /rag|retriev|knowledge|docs|search/.test(text)));
  add('plan-preview-commit', pattern === 'llm-agent' || /copilot|agent/.test(text));
  add('obo-token-exchange', pattern === 'llm-agent' || /copilot/.test(text));
  add('adaptive-concurrency-shedding', online);
  add('shadow-canary-mirroring', true);
  add('backfill-isolation', true);
  add('schema-evolution-dlq', true);
  add('outbox-cdc', online);
  for (const l of lenses) for (const i of l.items) add(i.primitive ?? '', Boolean(i.primitive));
  return out.slice(0, 14);
}
