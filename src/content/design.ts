import type { LatencySLA, Paradigm } from '../schemas/usecase.schema';
import type { RawStage } from './parse';
import type { ScaleResult } from './scale';

export type StageKind = 'ingest' | 'feature' | 'retrieve' | 'model' | 'rules' | 'human' | 'sink' | 'other';

export interface Stage {
  id: string;
  label: string;
  tech: string;
  kind: StageKind;
  async: boolean;
  budgetMs: number | null;
}

/* ------------------------------------------------------------------ helpers */

/** Make arbitrary text safe inside Mermaid quoted labels / sequence messages. */
export const m = (s: string, max = 64): string =>
  s
    .replace(/&/g, 'and')
    .replace(/["`#;%<>{}\[\]|\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

export const snake = (s: string, max = 40): string => {
  let out = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (out.length > max) {
    const cut = out.slice(0, max);
    const i = cut.lastIndexOf('_');
    out = i > max * 0.5 ? cut.slice(0, i) : cut;
  }
  out = out.replace(/_+$/g, '');
  return /^[0-9]/.test(out) ? `f_${out}` : out || 'feature';
};

export const pascal = (s: string): string =>
  s
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
    .slice(0, 28) || 'Stage';

const KIND_RULES: [StageKind, RegExp][] = [
  ['human', /human|review|analyst|case |queue|hitl|clinician|teacher|escalat|approver|moderator/i],
  ['sink', /\b(audit|warehouse|lakehouse|archive|label store|feedback|sink|report)/i],
  ['retrieve', /retriev|\bann\b|faiss|hnsw|candidate|nearest|\brag\b|vector (search|db|store|index)|semantic index|search index|elasticsearch|opensearch/i],
  ['model', /model|scor|infer|gbdt|xgboost|lightgbm|rank|transformer|\bgnn\b|llm|classif|predict|detector|forecast|bandit|triton|vllm|bert|embed|agent|planner|generat|vision|\bocr\b|\basr\b|survival|segment|tracker|optimi[sz]er|solver/i],
  ['feature', /feature|redis|cache|store|profile|enrich|state|context|aggregat|window|join|graph db|memory/i],
  ['rules', /rule|guard|constraint|threshold|decision|business|safety|compliance|filter|budget|pacing|allocator|arbiter|policy|validator|verifier/i],
  ['ingest', /gateway|api|stream|kafka|ingest|event|collector|edge|capture|decode|parse|normali|intake|preprocess|sensor|telemetry|upload|cdc|batch load/i],
];
const WEIGHT: Record<StageKind, number> = { model: 4, retrieve: 3, feature: 2, ingest: 1, rules: 1, other: 1.5, human: 0, sink: 0 };

export function classify(label: string, tech: string): StageKind {
  const text = `${label} ${tech}`;
  for (const [k, re] of KIND_RULES) if (re.test(label) || (k !== 'human' && k !== 'sink' && re.test(text))) return k;
  return 'other';
}

export const TOTAL_BUDGET_MS: Record<LatencySLA, number | null> = {
  'sub-10ms': 8,
  'sub-100ms': 80,
  seconds: 2500,
  batch: null,
};

/**
 * The p99 envelope is a sum, not a wish: edge + every synchronous stage + a reserve for network hops and
 * serialisation must equal the SLA exactly. (A review found a blueprint whose stage budgets added up to 8.6 ms
 * against an 8 ms budget; `src/content/feasibility.ts` now fails the build on that.)
 */
export const EDGE_MS: Record<LatencySLA, number | null> = { 'sub-10ms': 0.5, 'sub-100ms': 2, seconds: 25, batch: null };
export const RESERVE_MS: Record<LatencySLA, number | null> = { 'sub-10ms': 0.8, 'sub-100ms': 8, seconds: 250, batch: null };

/** Pool left for synchronous stages once the edge and the network/serialisation reserve are paid. */
export const stagePoolMs = (latency: LatencySLA): number | null => {
  const t = TOTAL_BUDGET_MS[latency];
  return t === null ? null : Math.round((t - EDGE_MS[latency]! - RESERVE_MS[latency]!) * 10) / 10;
};

export function buildStages(pipe: RawStage[], latency: LatencySLA): Stage[] {
  const pool = stagePoolMs(latency);
  const base = pipe.map((p, i) => {
    const kind = classify(p.label, p.tech);
    return { id: `S${i + 1}`, label: p.label, tech: p.tech, kind, async: kind === 'human' || kind === 'sink', budgetMs: null as number | null };
  });
  if (pool !== null) {
    const sync = base.filter((s) => !s.async);
    const wsum = sync.reduce((a, s) => a + WEIGHT[s.kind], 0) || 1;
    // Largest-remainder allocation in whole units (0.1 ms below 10 ms, otherwise 1 ms) so the stages sum to the pool exactly.
    const unit = TOTAL_BUDGET_MS[latency]! <= 10 ? 0.1 : 1;
    const units = Math.round(pool / unit);
    const exact = sync.map((s) => (units * WEIGHT[s.kind]) / wsum);
    const floor = exact.map((x) => Math.max(1, Math.floor(x)));
    let left = units - floor.reduce((a, b) => a + b, 0);
    const order = exact.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0]);
    for (let n = 0; left > 0; n = (n + 1) % order.length, left--) floor[order[n]![1]]! += 1;
    // never possible with sane pools, but keep the sum exact if the floor of 1 unit overshoots
    for (let i = 0; left < 0; i = (i + 1) % floor.length) if (floor[i]! > 1) { floor[i]! -= 1; left++; }
    sync.forEach((s, i) => {
      s.budgetMs = Math.round(floor[i]! * unit * 10) / 10;
    });
  }
  return base;
}

const budgetText = (s: Stage, latency: LatencySLA) => (s.budgetMs === null ? (latency === 'batch' ? 'run window' : 'async') : `${s.budgetMs} ms`);

/* ------------------------------------------------------- pipeline diagram */

export function pipelineDiagram(stages: Stage[], mode: ScaleResult['mode']): string {
  const sync = stages.filter((s) => !s.async);
  const asyncS = stages.filter((s) => s.async);
  const modelStage = sync.find((s) => s.kind === 'model') ?? sync[sync.length - 1]!;
  const L: string[] = ['flowchart LR'];
  const node = (s: Stage) => `${s.id}["${m(s.label, 34)}<br/>${m(s.tech, 40)}"]`;
  L.push(`  IN(["${mode === 'batch' ? 'Daily partition' : 'Request / event'}"])`);
  sync.forEach((s, i) => L.push(`  ${i === 0 ? 'IN' : sync[i - 1]!.id} --> ${node(s)}`));
  L.push(`  ${sync[sync.length - 1]!.id} --> OUT(["${mode === 'batch' ? 'Published outputs' : 'Decision / response'}"])`);
  asyncS.forEach((s) => L.push(`  ${sync[sync.length - 1]!.id} -. async .-> ${node(s)}`));
  L.push('  OUT -. outcomes and labels .-> LOG[("Decision log + delayed labels")]');
  L.push('  LOG --> TRN["Training and evaluation<br/>point-in-time join"]');
  L.push('  TRN --> REG["Model registry<br/>shadow, canary, rollback"]');
  L.push(`  REG -. promote .-> ${modelStage.id}`);
  L.push('  classDef model fill:#0b2e25,stroke:#34d399,color:#d1fae5');
  L.push('  classDef loop fill:#1e1b3a,stroke:#818cf8,color:#e0e7ff');
  L.push(`  class ${modelStage.id} model`);
  L.push('  class LOG,TRN,REG loop');
  return L.join('\n');
}

/* --------------------------------------------------------------------- HLD */

export function hldDiagram(stages: Stage[], mode: ScaleResult['mode'], paradigms: Paradigm[], stance: 'stateless-active-active' | 'residency-pinned' | 'tenant-isolated' = 'stateless-active-active'): string {
  const sync = stages.filter((s) => !s.async);
  const feat = sync.find((s) => s.kind === 'feature') ?? sync[0]!;
  const last = sync[sync.length - 1]!;
  const node = (s: Stage) => `${s.id}["${m(s.label, 30)}<br/>${m(s.tech, 34)}"]`;
  const L: string[] = ['flowchart TB'];

  if (mode === 'batch') {
    L.push('  SRC[("Source systems<br/>OLTP, events, files")] --> CDC["CDC / ingestion<br/>Kafka Connect"]');
    L.push('  CDC --> LAKE[("Lakehouse<br/>bronze, silver, gold")]');
    L.push('  subgraph ORCH["Orchestration - Airflow / Dagster, retries + backfills"]');
    L.push('    DQ["Data-quality gate<br/>freshness, nulls, schema"]');
    sync.forEach((s, i) => L.push(`    ${i === 0 ? 'DQ' : sync[i - 1]!.id} --> ${node(s)}`));
    L.push(`    ${last.id} --> PUB["Idempotent publish<br/>overwrite by partition"]`);
    L.push('  end');
    L.push('  LAKE --> DQ');
    L.push('  PUB --> SERVE[("Serving tables<br/>+ online feature sync")]');
    L.push('  SERVE --> APPS["Consumers<br/>apps, CRM, BI, APIs"]');
    L.push('  PUB -. metrics .-> MON["Monitoring<br/>freshness, drift, coverage"]');
    L.push('  APPS -. outcomes .-> LAKE');
    stages.filter((s) => s.async).forEach((s) => L.push(`  PUB -. async .-> ${node(s)}`));
    return L.join('\n');
  }

  L.push('  U(["10M users / upstream systems"]) --> EDGE["CDN, WAF, GeoDNS<br/>TLS termination"]');
  L.push('  EDGE --> GW');
  L.push(`  subgraph R["Inference plane - Region 1..3 active-active, each sized N+1"]`);
  L.push(`    GW["API gateway<br/>authN, rate limit, ${mode === 'interactive' ? 'streaming, ' : ''}deadline propagation"]`);
  L.push('    subgraph SP["Serving plane - stateless, autoscaled"]');
  sync.forEach((s, i) => L.push(`      ${i === 0 ? 'GW' : sync[i - 1]!.id} --> ${node(s)}`));
  L.push('    end');
  L.push('    FS[("Online feature store<br/>Redis cluster, replicated")]');
  L.push('    BUS[["Event bus<br/>Kafka, partitioned by entity"]]');
  if (paradigms.includes('llm-agents')) L.push('    LLMGW["LLM gateway<br/>routing, caching, quotas, fallbacks"]');
  if (paradigms.includes('llm-agents')) L.push(`    ${sync.find((s) => s.kind === 'model')?.id ?? last.id} --> LLMGW`);
  L.push(`    ${feat.id} -. read .-> FS`);
  L.push(`    ${last.id} -. emit async .-> BUS`);
  stages.filter((s) => s.async).forEach((s) => L.push(`    BUS -.-> ${node(s)}`));
  L.push('  end');
  L.push('  subgraph DP["Data and ML plane - shared"]');
  L.push('    LAKE[("Lakehouse<br/>Iceberg / Delta")]');
  L.push('    TRN["Training and eval<br/>Spark, Ray, GPU pool"]');
  L.push('    REG["Model registry + feature definitions<br/>one transform, train and serve"]');
  L.push('    MON["Monitoring<br/>drift, quality, cost, SLO burn"]');
  L.push('    LAKE --> TRN --> REG');
  L.push('  end');
  if (stance === 'residency-pinned') {
    L.push('  subgraph STP["State plane - pinned to data-subject jurisdiction"]');
    L.push('    LEDGER[("Ledger and counters<br/>single writer per key, sync standby RPO 0")]');
    L.push('    WORM[("Decision ledger<br/>WORM, hash-chained")]');
    L.push('  end');
    L.push('  FS -. owner shard only .-> LEDGER');
    L.push('  BUS --> WORM');
  } else if (stance === 'tenant-isolated') {
    L.push('  subgraph TEN["Tenant cells - quotas, BYOK keys, adapters"]');
    L.push('    TCELL[("Per-tenant state<br/>row-level security, KMS key per tenant")]');
    L.push('  end');
    L.push('  FS -. tenant-scoped .-> TCELL');
  }
  L.push('  BUS --> LAKE');
  L.push('  LAKE -. backfill .-> FS');
  L.push('  REG -. signed artifacts .-> SP');
  L.push('  SP -. traces + metrics .-> MON');
  return L.join('\n');
}

/* ---------------------------------------------------------------- sequence */

export function sequenceDiagram(stages: Stage[], mode: ScaleResult['mode'], latency: LatencySLA, paradigms: Paradigm[], steps: number): { mermaid: string; notes: string[] } {
  const sync = stages.filter((s) => !s.async);
  const asyncS = stages.filter((s) => s.async);
  const total = TOTAL_BUDGET_MS[latency];
  const L: string[] = ['sequenceDiagram', '  autonumber'];
  const alias = (s: Stage) => m(s.label, 30).replace(/[()]/g, '');

  if (mode === 'batch') {
    L.push('  participant SCH as Scheduler');
    L.push('  participant DQ as Data-quality gate');
    sync.forEach((s) => L.push(`  participant ${s.id} as ${alias(s)}`));
    L.push('  participant PUB as Publisher');
    L.push('  participant DOWN as Downstream consumers');
    asyncS.forEach((s) => L.push(`  participant ${s.id} as ${alias(s)}`));
    L.push('  SCH->>DQ: trigger run for partition D (point-in-time snapshot)');
    L.push('  alt gate fails: freshness, schema or null-rate');
    L.push('    DQ-->>SCH: fail run, page owner, keep yesterday outputs');
    L.push('  else gate passes');
    L.push(`    DQ->>${sync[0]!.id}: validated partition`);
    for (let i = 0; i < sync.length - 1; i++) L.push(`    ${sync[i]!.id}->>${sync[i + 1]!.id}: ${m(`${sync[i]!.tech} output`, 40)}`);
    L.push(`    ${sync[sync.length - 1]!.id}->>PUB: scored partition + run manifest`);
    L.push('    PUB->>PUB: overwrite partition atomically, idempotent key (run_date, shard)');
    L.push('    PUB-->>DOWN: publish event, tables ready');
    L.push('  end');
    asyncS.forEach((s) => L.push(`  PUB-)${s.id}: async hand-off ${m(s.tech, 30)}`));
    L.push('  DOWN--)SCH: outcomes land later, feed next training window');
    return {
      mermaid: L.join('\n'),
      notes: [
        'Every stage is idempotent per partition, so retries and backfills overwrite rather than append.',
        'The data-quality gate fails the run loudly; consumers keep yesterday’s outputs instead of reading half-written tables.',
        'Publication is a single atomic swap of the partition, with a manifest (row counts, model version, feature hash) for audit.',
        `Outcome labels return asynchronously and feed the next training window — expect label delay, never join future data into past partitions.`,
      ],
    };
  }

  L.push('  participant C as Client');
  L.push('  participant GW as API gateway');
  sync.forEach((s) => L.push(`  participant ${s.id} as ${alias(s)}`));
  L.push('  participant BUS as Event bus');
  asyncS.forEach((s) => L.push(`  participant ${s.id} as ${alias(s)}`));
  L.push(`  C->>GW: request + idempotency key${mode === 'interactive' ? ' (opens stream)' : ''}`);
  L.push(`  GW->>GW: authN, token-bucket rate limit, set deadline ${total ?? ''} ms`);
  L.push(`  GW->>${sync[0]!.id}: forward with remaining budget`);

  const modelIdx = sync.findIndex((s) => s.kind === 'model');
  const agentLoop = paradigms.includes('llm-agents') && modelIdx >= 0;
  for (let i = 0; i < sync.length - 1; i++) {
    const a = sync[i]!;
    const b = sync[i + 1]!;
    if (agentLoop && i === modelIdx) {
      L.push(`  loop up to ${steps} steps while budget remains`);
      L.push(`    ${a.id}->>${b.id}: tool call or retrieval request`);
      L.push(`    ${b.id}-->>${a.id}: grounded result + citations`);
      L.push('  end');
    }
    const msg: Record<string, string> = { model: 'score + top reason codes', feature: 'features + context snapshot', retrieve: 'ranked candidates and evidence', ingest: 'validated, timestamped event', rules: 'action + constraints applied' };
    L.push(`  ${a.id}->>${b.id}: ${msg[a.kind] ?? 'enriched payload'}`);
  }
  const risky = sync.find((s) => s.kind === 'model' || s.kind === 'feature') ?? sync[0]!;
  L.push('  opt budget exhausted or dependency unhealthy');
  L.push(`    ${risky.id}-->>GW: timeout / breaker open`);
  L.push('    GW->>GW: next rung of the degradation ladder');
  L.push('  end');
  L.push(`  ${sync[sync.length - 1]!.id}-->>GW: ${mode === 'interactive' ? 'final answer, citations, usage' : 'decision + reason codes + model version'}`);
  L.push(`  GW-->>C: ${mode === 'interactive' ? 'stream tokens, then done' : `response, p99 within ${total} ms`}`);
  L.push(`  GW--)BUS: emit decision event (non-blocking)`);
  asyncS.forEach((s) => L.push(`  BUS--)${s.id}: ${m(s.tech, 36)}`));
  L.push('  Note over BUS: outcomes and delayed labels flow back to training');

  const budgets = sync.map((s) => `${s.label} ${budgetText(s, latency)}`).join(' → ');
  return {
    mermaid: L.join('\n'),
    notes: [
      `Deadline propagation: each hop receives the remaining budget, never a fresh timeout. Indicative split — ${budgets}.`,
      'The response never waits on the event bus: emission goes through a local bounded buffer and drops oldest on overflow, with a counter alert.',
      'Idempotency keys make client retries safe; the first decision is cached for the key so retries return the identical answer.',
      mode === 'interactive'
        ? 'Tokens stream as soon as grounded; tool calls, retries and step counts are capped by a per-request budget so one session cannot starve others.'
        : 'No fan-out hop sits on the critical path unless it is required; optional enrichment is parallelised and cancelled at its sub-budget.',
    ],
  };
}

/* --------------------------------------------------------------------- LLD */

export interface LLDInput {
  slugTail: string;
  title: string;
  stages: Stage[];
  mode: ScaleResult['mode'];
  latency: LatencySLA;
  paradigms: Paradigm[];
  features: string[];
  loss: string;
  prod: string;
  onMetrics: string[];
  steps: number;
}

export function buildLLD(i: LLDInput) {
  const feats = i.features.map((f) => snake(f));
  const tbl = snake(i.slugTail, 30);
  const base = `/v1/${i.slugTail}`;
  const inline = feats.slice(0, 2);

  let apiContract: { method: 'GET' | 'POST'; path: string; request: string; response: string };
  if (i.mode === 'online') {
    apiContract = {
      method: 'POST',
      path: `${base}/decide`,
      request: JSON.stringify({ request_id: '01JABCDEF…', entity_id: 'ent_8f3a', occurred_at: '2026-11-07T10:15:30Z', inline_signals: Object.fromEntries(inline.map((f, n) => [f, n === 0 ? 0.0 : 3])), deadline_ms: TOTAL_BUDGET_MS[i.latency] }, null, 2),
      response: JSON.stringify({ request_id: '01JABCDEF…', decision: 'PASS | REVIEW | ACT', score: 0.0134, reason_codes: [feats[0] ?? 'top_signal', feats[1] ?? 'second_signal'], model_version: '2026-11-03.r2', latency_ms: 4.2, degraded: false }, null, 2),
    };
  } else if (i.mode === 'interactive') {
    apiContract = {
      method: 'POST',
      path: `${base}/run`,
      request: JSON.stringify({ session_id: 'ses_91c2', principal: { user_id: 'u_123', scopes: ['read'] }, input: '…', constraints: { max_steps: i.steps, max_cost_usd: 0.02 }, stream: true }, null, 2),
      response: 'event: delta      data: {"text":"…"}\nevent: tool_call  data: {"name":"…","args":{…}}\nevent: final      data: {"answer":"…","citations":[…],"usage":{"steps":2,"tokens":1840,"cost_usd":0.004},"degraded":false}',
    };
  } else {
    apiContract = {
      method: 'POST',
      path: `${base}/runs`,
      request: JSON.stringify({ run_date: '2026-11-07', partition: 'all', dry_run: false, model_version: 'champion' }, null, 2),
      response: JSON.stringify({ run_id: 'run_20261107_01', status: 'RUNNING | SUCCEEDED | FAILED_DQ', rows_in: 0, rows_out: 0, manifest_uri: 's3://…/manifest.json' }, null, 2),
    };
  }

  const featCols = feats.map((f) => `  ${f.padEnd(34)} DOUBLE PRECISION`).join(',\n');
  const dataModelDDL = `-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE ${tbl}_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
${featCols},
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE ${tbl}_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE ${tbl}_labels (
  decision_id    UUID        NOT NULL REFERENCES ${tbl}_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);`;

  const cls = i.stages.map((s) => ({ ...s, cname: `${pascal(s.label)}${s.id}` }));
  const cd: string[] = ['classDiagram', '  class Stage {', '    <<interface>>', '    +run(ctx) StageResult', '    +timeout_ms() int', '  }'];
  cd.push('  class Deadline { +remaining() ms +share(f) ms }');
  cd.push('  class FallbackPolicy { +next(level, ctx) Decision }');
  cd.push('  class DecisionLogger { +emit_async(event) void }');
  cls.forEach((s) => {
    cd.push(`  class ${s.cname} {`);
    cd.push(`    +tech "${m(s.tech, 36)}"`);
    cd.push(`    +budget "${budgetText(s, i.latency)}"`);
    cd.push('  }');
    cd.push(`  Stage <|.. ${s.cname}`);
  });
  cd.push('  Deadline --> Stage : bounds');
  cd.push('  FallbackPolicy --> Stage : replaces on failure');
  cd.push('  DecisionLogger <-- Stage : emits');

  const T = TOTAL_BUDGET_MS[i.latency];
  const code = algorithmCode(i, feats, T);

  const timeouts = i.stages.filter((s) => !s.async).map((s) => `    - { name: ${snake(s.label)}, timeout_ms: ${s.budgetMs ?? 'n/a'}, on_timeout: fallback_level_1 }`).join('\n');
  const guard = i.onMetrics.slice(0, 3).map((x) => `    - "${x.replace(/"/g, "'")}"`).join('\n');
  const config = `serving:
  deadline_ms: ${T ?? 'n/a  # batch: run window = 2h'}
  stages:
${timeouts}
breaker:            # per dependency, not global
  error_rate_open: 0.5
  window_s: 10
  half_open_probes: 5
rollout:
  shadow_days: 7
  canary_steps_pct: [1, 5, 25, 100]
  auto_rollback_if_degraded:
${guard}
privacy:
  pii_in_logs: false
  retention_days: 400`;

  const ladder = degradation(i.mode);
  return { apiContract, dataModelDDL, classDiagram: cd.join('\n'), algorithm: { language: 'python' as const, code }, config, degradationLadder: ladder };
}

function degradation(mode: ScaleResult['mode']) {
  if (mode === 'online')
    return [
      { level: 0, trigger: 'All dependencies healthy', behaviour: 'Full pipeline: fresh features, champion model, policy thresholds.' },
      { level: 1, trigger: 'Optional enrichment or feature store p99 above its sub-budget', behaviour: 'Serve with cached / stale features (age stamped into the decision) and skip optional enrichment.' },
      { level: 2, trigger: 'Champion model breaker open or GPU/CPU saturation', behaviour: 'Route to the distilled fallback model or last-known-good version from the registry.' },
      { level: 3, trigger: 'Model tier unavailable', behaviour: 'Deterministic rules / heuristics that are versioned, tested and owned by the business.' },
      { level: 4, trigger: 'Whole serving plane unreachable from the caller', behaviour: 'Caller-side default (fail-open or fail-closed chosen per risk appetite) + sampled post-hoc review queue.' },
    ];
  if (mode === 'interactive')
    return [
      { level: 0, trigger: 'Healthy', behaviour: 'Full agent / pipeline with tools, retrieval and primary model.' },
      { level: 1, trigger: 'Tool or retrieval dependency slow', behaviour: 'Cap steps, skip non-essential tools, answer from cached context with an explicit caveat.' },
      { level: 2, trigger: 'Primary model rate-limited or over budget', behaviour: 'Route to a smaller or secondary-provider model; semantic cache for repeated intents.' },
      { level: 3, trigger: 'Generation unavailable', behaviour: 'Retrieval-only / templated answer with citations, no free-form generation.' },
      { level: 4, trigger: 'Guardrail or policy service down', behaviour: 'Fail closed for risky actions, hand off to a human queue with full transcript.' },
    ];
  return [
    { level: 0, trigger: 'Healthy', behaviour: 'Full run inside the window, outputs published atomically.' },
    { level: 1, trigger: 'Run would breach the window', behaviour: 'Process high-value partitions first, defer the long tail to the next window with staleness flags.' },
    { level: 2, trigger: 'Data-quality gate fails', behaviour: 'Keep previous outputs, mark them stale in the manifest, page the owning team.' },
    { level: 3, trigger: 'Model artifact invalid or drift alarm', behaviour: 'Pin the previous champion and freeze automated retraining until reviewed.' },
  ];
}

function algorithmCode(i: LLDInput, feats: string[], T: number | null): string {
  const F = feats.map((f) => `"${f}"`).join(', ');
  const model = i.prod.length > 90 ? `${i.prod.slice(0, 87)}…` : i.prod;
  const hdr = `# ${i.title}\n# objective: see Problem Formulation (cost-weighted, calibrated)\n# model: ${model}\n`;
  const has = (p: Paradigm) => i.paradigms.includes(p);

  if (i.mode === 'batch')
    return `${hdr}
FEATURES = [${F}]

def run(run_date, deps):
    snap = deps.lake.read_as_of(run_date)                 # point-in-time snapshot, never "latest"
    deps.dq.assert_gate(snap, freshness_h=6, max_null=0.02, schema=SCHEMA)   # fail the run, do not limp on
    feats = build_features(snap, FEATURES)                 # same transform library as online serving
    scores = deps.model.predict_batch(feats, version="champion")
    out = deps.policy.apply(scores)                         # thresholds are config, not code
    deps.sink.write_idempotent(out, key=(run_date, "partition"))  # overwrite by partition => safe retries
    deps.metrics.publish(run_date, psi=deps.drift.psi(feats), coverage=len(out) / len(snap))
`;

  if (has('llm-agents'))
    return `${hdr}
MAX_STEPS = ${i.steps}

async def run(req, deps):
    budget = Budget(deadline_ms=${T ?? 2500}, max_steps=MAX_STEPS, max_cost_usd=req.constraints.max_cost_usd)
    ctx = await deps.context.build(req)                    # retrieval + memory; ACLs applied BEFORE the model sees data
    deps.guard.check_input(req, ctx)                        # injection, PII, policy
    for _ in range(MAX_STEPS):
        action = await deps.llm.plan(ctx, tools=deps.tools.allowed(req.principal), budget=budget)
        if action.is_final:
            return deps.respond(deps.guard.check_output(action, ctx), citations=ctx.citations)
        result = await deps.tools.invoke(action, principal=req.principal, timeout=budget.tool_timeout())
        ctx.append(action, result)
        budget.consume(action, result)
        if budget.exhausted():
            break
    return deps.handoff(req, ctx)                          # degraded answer or human queue, never a silent failure
`;

  if (has('recommender'))
    return `${hdr}
FEATURES = [${F}]

async def recommend(req, deps):
    dl = Deadline.from_now(ms=${T ?? 80})
    user = await deps.features.user(req.user_id, FEATURES, timeout=dl.share(0.2))
    pools = await asyncio.gather(*[r.fetch(user, k=200, timeout=dl.share(0.25)) for r in deps.retrievers])
    pool = dedupe(flatten(pools))[:1500]                   # ANN + co-visitation + trending + business sources
    scored = await deps.ranker.score(user, pool, timeout=dl.share(0.45))
    slate = deps.rerank.apply(scored, req.constraints)     # diversity, frequency caps, policy, exploration slots
    deps.events.emit_async(Impression(user.id, slate, deps.version, propensities=slate.propensities))
    return slate                                           # propensities logged => unbiased off-policy evaluation
`;

  if (has('computer-vision'))
    return `${hdr}
async def process(batch, deps):
    dl = Deadline.from_now(ms=${T ?? 80})
    frames = deps.decoder.decode(batch, drop_if_queue_over=deps.cfg.max_queue)   # shed load by dropping frames, not by lagging
    dets = await deps.detector.infer(frames, timeout=dl.share(0.6))
    tracks = deps.tracker.update(dets)
    events = deps.rules.evaluate(tracks, deps.zones)       # business rules over tracks, not raw detections
    deps.events.emit_async(Observation(batch.source_id, events, deps.version))
    return events
`;

  return `${hdr}
FEATURES = [${F}]

async def decide(req, deps):
    dl = Deadline.from_now(ms=${T ?? 2500})
    p = None
    try:
        feats = await deps.features.get(req.entity_id, FEATURES, timeout=dl.share(0.3))
        x = deps.encoder.transform(req.inline_signals, feats)          # identical code path to training
        p = await deps.model.predict(x, timeout=dl.share(0.5))
        decision = deps.policy.apply(p, req, feats)                     # thresholds live in config
    except (TimeoutError, FeatureMiss, ModelUnavailable) as e:
        decision = deps.fallback.next(level=deps.breaker.level(e), req=req)
        decision.degraded = True
    deps.events.emit_async(DecisionEvent.of(req, p, decision))          # never blocks the response
    return decision
`;
}

/* ------------------------------------------------------ scale commentary */

export function bottlenecksFor(cc: ScaleResult['computeClass'], mode: ScaleResult['mode']): string[] {
  const common = ['Hot keys: a handful of entities (celebrity users, big merchants, flagship SKUs) can concentrate load — shard by a salted key and cache aggressively.'];
  const by: Record<string, string[]> = {
    'cpu-scorer': ['Feature fetch dominates latency, not the model — co-locate the feature store, batch lookups, pipeline them.', 'Tail latency from GC pauses and noisy neighbours — pin CPUs, preallocate buffers, hedge slow calls.'],
    'cpu-graph': ['Multi-hop neighbourhood expansion explodes on hub nodes — cap fan-out and precompute embeddings off the request path.', 'Graph store memory and replication lag — stale edges are tolerable, cross-region transactions are not.'],
    'gpu-ranker': ['Candidate set size × feature width sets GPU memory and PCIe transfer cost — shrink with a cheap pre-ranker.', 'Embedding table size — shard tables across GPUs / host memory and quantise.'],
    'gpu-vision': ['Decode and pre-processing often starve the GPU — use hardware decode and batch across sources.', 'Bandwidth: raw frames dwarf every other payload — process at the edge and ship events, not video.'],
    'gpu-encoder': ['Variable sequence length wastes batches — bucket by length and use dynamic batching.', 'Cold-start of large models on scale-out — keep warm pools and preload weights.'],
    'gpu-llm': ['Tokens, not requests, are the unit of cost — prompt caching, semantic caching and model routing cut 40–70% of spend.', 'KV-cache memory limits concurrency — use paged attention, shorter contexts and speculative decoding.', 'Provider rate limits and regional capacity — multi-provider routing with budget-aware fallbacks.'],
    'cpu-batch': ['Shuffle and skew in the largest joins — salt hot keys, broadcast small dimensions, partition by date and entity.', 'Small-files and metadata pressure on the lakehouse — compact and Z-order on a schedule.'],
    'gpu-batch': ['GPU utilisation in short bursty windows — use spot pools and checkpoint every N batches so preemption is cheap.', 'Data loading from object storage — shard files to ≥ 128 MB and prefetch.'],
  };
  const out = [...(by[cc] ?? []), ...common];
  if (mode !== 'batch') out.push('Thundering herd after a deploy or cache flush — warm caches before shifting traffic and add jittered TTLs.');
  return out.slice(0, 5);
}

export function resilienceFor(mode: ScaleResult['mode'], stance: 'stateless-active-active' | 'residency-pinned' | 'tenant-isolated' = 'stateless-active-active'): string[] {
  const common = [
    stance === 'residency-pinned'
      ? 'The stateless inference plane is active-active across three regions and each is sized to absorb one failure; the state plane is pinned per jurisdiction with a synchronous in-country standby and fenced failover.'
      : stance === 'tenant-isolated'
        ? 'The inference plane is active-active across three regions, each sized to absorb one failure; tenant cells fail over independently so one tenant\'s incident is not everyone\'s.'
        : 'Three active-active regions; the global load balancer shifts traffic on health and SLO burn, and each region is sized to absorb one failure.',
    'Every model and feature set is versioned and signed; rollback is a pointer flip that finishes in under a minute.',
    'Per-tenant and per-key quotas plus load shedding (reject early, cheap) protect the SLO of well-behaved callers.',
  ];
  if (mode === 'online')
    return [...common, 'Circuit breakers per dependency with the degradation ladder defined in LLD; chaos drills quarterly (kill feature store, kill model tier, inject 500 ms latency).', 'Capacity and cost are SLOs too: alert on cost per 1,000 decisions and GPU/CPU saturation, not only on latency.'];
  if (mode === 'interactive')
    return [...common, 'Per-request budgets (steps, tokens, dollars) are enforced in the gateway so a runaway session cannot become a cost incident.', 'Evaluation harness replays a frozen golden set on every prompt / model / tool change; regressions block release.'];
  return [...common, 'Backfills and reruns are first-class: idempotent partitions, lineage in the manifest, and a dry-run mode that diffs against production outputs.', 'Data contracts with upstream owners: schema changes must pass a compatibility check before they reach the lake.'];
}
