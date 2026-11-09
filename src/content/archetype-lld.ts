/**
 * Archetype-driven low-level design.
 *
 * One endpoint (`POST /decide`) and one decision-ledger schema describe a fraud or risk decision service and nothing else. A
 * forecast is a job that writes intervals for a horizon; a recommender is retrieve, filter, rank, re-rank and log impressions; a
 * RAG assistant is ingestion plus retrieval plus citations; a vision system is frames, detections and tracks. Each archetype
 * below owns the API contract, the data model, the event schema, the core algorithm, the failure and retry behaviour, the
 * security model and the test scenarios that fit it. Everything generated here is an *illustrative scaffold* and is labelled so.
 */
import type { Archetype, LatencySLA, Paradigm } from '../schemas/usecase.schema';
import type { KitId } from './playbook-gen';

export interface ArchCtx {
  slugTail: string;
  title: string;
  feats: string[];
  tbl: string;
  base: string;
  budgetMs: number | null;
  steps: number;
  latency: LatencySLA;
  mode: 'online' | 'interactive' | 'batch';
}

export interface ArchLLD {
  apiContract: { method: 'GET' | 'POST'; path: string; request: string; response: string };
  dataModelDDL: string;
  eventSchema: string;
  failureAndRetry: { failure: string; behaviour: string }[];
  securityModel: { surface: string; control: string }[];
  testScenarios: { scenario: string; kind: 'unit' | 'integration' | 'contract' | 'load' | 'replay' | 'safety'; assertion: string }[];
  /** only archetypes whose core algorithm differs from the generic mode-based one supply code */
  algorithm?: string;
}

/** The archetype a use case is an instance of, from its reference kit, paradigms and serving mode. */
export function archetypeOf(kit: KitId, paradigms: Paradigm[], mode: 'online' | 'interactive' | 'batch'): Archetype {
  switch (kit) {
    case 'llm-rag':
      return 'rag';
    case 'llm-agent':
      return 'agentic-workflow';
    case 'cv':
      return 'computer-vision';
    case 'recommender':
      return mode === 'batch' ? 'batch-analytics' : 'recommendation';
    case 'forecast':
      return 'forecasting';
    case 'optimize':
      return 'optimisation';
    case 'nlp':
      return mode === 'online' ? 'realtime-decisioning' : 'document-extraction';
    case 'anomaly':
    case 'bandit':
    case 'graph':
    case 'tabular':
    default:
      void paradigms;
      return mode === 'batch' ? 'batch-analytics' : 'realtime-decisioning';
  }
}

/** What one model-touching event is in business terms: names the cost-per-outcome row of the capacity model. */
export const OUTCOME_UNIT: Record<Archetype, string> = {
  'realtime-decisioning': 'decision',
  forecasting: 'forecast series-run',
  recommendation: 'ranked slate',
  rag: 'answered question',
  'agentic-workflow': 'completed task',
  'computer-vision': 'analysed frame or image',
  'document-extraction': 'processed document',
  'batch-analytics': 'scored record',
  optimisation: 'planned entity',
};

/** Share of events a person reviews, when the blueprint has a human stage. Assumed, and labelled as such in the capacity table. */
export const REVIEW_RATE: Record<Archetype, number> = {
  'realtime-decisioning': 0.01,
  forecasting: 0.005,
  recommendation: 0.002,
  rag: 0.03,
  'agentic-workflow': 0.1,
  'computer-vision': 0.02,
  'document-extraction': 0.08,
  'batch-analytics': 0.01,
  optimisation: 0.02,
};

const j = (o: unknown) => JSON.stringify(o, null, 2);
const idem = 'Idempotency-Key header: the first response is stored for the key and replayed on retry';

export function archetypeLLD(a: Archetype, c: ArchCtx): ArchLLD {
  const f = (n: number, fallback: string) => c.feats[n] ?? fallback;
  const T = c.budgetMs ?? 2500;

  switch (a) {
    case 'forecasting':
      return {
        apiContract: {
          method: 'POST',
          path: `${c.base}/forecasts`,
          request: j({ run_id: 'fc_20261107_01', as_of: '2026-11-07T00:00:00Z', series_selector: { level: 'sku_store', filter: 'active=true' }, horizon: 28, granularity: 'day', quantiles: [0.1, 0.5, 0.9], model_version: 'champion', covariates: [f(0, 'price'), f(1, 'promo_flag')] }),
          response: j({ run_id: 'fc_20261107_01', status: 'RUNNING | SUCCEEDED | FAILED_DQ', series_in: 0, series_forecast: 0, series_fallback: 0, horizon: 28, interval_coverage_backtest: 0.8, manifest_uri: 's3://…/forecasts/fc_20261107_01/manifest.json' }),
        },
        dataModelDDL: `-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE ${c.tbl}_forecasts (
  series_id      TEXT        NOT NULL,
  origin         TIMESTAMPTZ NOT NULL,   -- the as_of the forecast was made at
  target_period  DATE        NOT NULL,
  horizon_step   SMALLINT    NOT NULL,
  p10            REAL        NOT NULL,
  p50            REAL        NOT NULL,
  p90            REAL        NOT NULL,
  model_version  TEXT        NOT NULL,
  is_fallback    BOOLEAN     NOT NULL DEFAULT FALSE,
  PRIMARY KEY (series_id, origin, target_period)
) PARTITION BY RANGE (origin);

-- actuals land after the fact; joining on (series_id, target_period) gives forecast error by horizon
CREATE TABLE ${c.tbl}_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE ${c.tbl}_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);`,
        eventSchema: j({ type: 'ForecastRunCompleted', run_id: 'string', origin: 'timestamp', series_total: 'int', series_fallback: 'int', model_version: 'string', manifest_uri: 'string', dq_gate: 'PASSED | FAILED', published_at: 'timestamp' }),
        failureAndRetry: [
          { failure: 'Input data-quality gate fails (late or partial sales feed)', behaviour: 'Do not run: keep the previous forecast, stamp it stale in the manifest and page the data owner; a retry re-reads the same as_of snapshot.' },
          { failure: 'A partition of series fails mid-run', behaviour: 'Retry that partition up to 3 times with backoff; the sink writes idempotently by (run_id, partition), so a retry never duplicates rows.' },
          { failure: 'The model cannot forecast a series (new item, no history)', behaviour: 'Fall back to a hierarchy or similar-item forecast and set is_fallback = true so accuracy is reported separately.' },
          { failure: 'The run would miss its window', behaviour: 'Process high-value series first and defer the long tail; downstream consumers read the manifest, not the latest folder.' },
          { failure: 'Actuals are revised after the forecast was scored', behaviour: 'Keep every revision; backtests use the actual as of the evaluation date so metrics can be reproduced.' },
        ],
        securityModel: [
          { surface: 'Run trigger', control: 'Only the scheduler identity and named operators may start a run; manual runs require a ticket reference and are audited.' },
          { surface: 'Input snapshot', control: 'Read-only role on the lake; the job cannot write to source systems of record.' },
          { surface: 'Forecast store', control: 'Write via the job role only; consumers get read-only views scoped to their business unit.' },
          { surface: 'Model artifacts', control: 'Signed and pulled by digest from the registry; unsigned versions cannot be selected.' },
          { surface: 'Commercially sensitive outputs', control: 'Column- and row-level access on forecasts that reveal pricing, promotion or supplier plans.' },
        ],
        testScenarios: [
          { scenario: 'Rolling-origin backtest over the last 12 origins', kind: 'replay', assertion: 'WAPE and bias per segment are within the release gate and no segment regresses by more than the agreed margin.' },
          { scenario: 'Interval calibration', kind: 'replay', assertion: 'The 80% interval covers between 75% and 85% of actuals overall and per top segment.' },
          { scenario: 'Cold-start and intermittent series', kind: 'unit', assertion: 'New and zero-heavy series receive a fallback forecast flagged is_fallback, with no missing or negative demand values.' },
          { scenario: 'Idempotent re-run of one partition', kind: 'integration', assertion: 'Running the same (run_id, partition) twice leaves the table identical.' },
          { scenario: 'Late data gate', kind: 'integration', assertion: 'A feed older than the freshness limit fails the run and leaves the previous forecast published as stale.' },
          { scenario: 'Full-volume timing', kind: 'load', assertion: 'The full series count completes inside the processing window with 30% headroom.' },
        ],
        algorithm: `# ${c.title}
# archetype: forecasting - a scheduled job that writes quantile forecasts for a horizon, never a request/response scorer

def run(run_id, as_of, deps, horizon=28, quantiles=(0.1, 0.5, 0.9)):
    snap = deps.lake.read_as_of(as_of)                               # history up to as_of, never "latest"
    deps.dq.assert_gate(snap, freshness_h=6, max_null=0.02)          # fail the run rather than forecast stale data
    for part in deps.partitions(snap, by="hierarchy_node"):          # partition so a failure retries one slice
        panel = build_panel(part, covariates=deps.known_future(as_of, horizon))   # price, promo, calendar: known ahead
        fc = deps.model.predict_quantiles(panel, horizon, quantiles, version="champion")
        fc = reconcile_hierarchy(fc)                                 # child forecasts must sum to the parent
        fc = deps.fallback.fill_missing(fc, part)                    # new items get a flagged fallback forecast
        deps.sink.write_idempotent(fc, key=(run_id, part.id))        # overwrite by (run_id, partition) => safe retries
    deps.backtest.score_closed_origins(as_of)                        # accuracy by horizon feeds the monitors
    deps.events.emit(ForecastRunCompleted(run_id, as_of, deps.manifest(run_id)))
`,
      };

    case 'recommendation':
      return {
        apiContract: {
          method: 'POST',
          path: `${c.base}/recommendations`,
          request: j({ request_id: '01JABCDEF…', user_id: 'u_123', surface: 'home_feed', context: { device: 'mobile', locale: 'en-IN' }, slate_size: 20, constraints: { exclude_ids: [], max_per_category: 3 }, deadline_ms: T }),
          response: j({ request_id: '01JABCDEF…', slate: [{ item_id: 'i_9', rank: 1, score: 0.82, source: 'ann', propensity: 0.04 }], model_version: '2026-11-03.r2', experiment_arm: 'treatment', degraded: false, latency_ms: 38 }),
        },
        dataModelDDL: `-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE ${c.tbl}_impressions (
  impression_id  UUID PRIMARY KEY,
  user_id        TEXT        NOT NULL,
  shown_at       TIMESTAMPTZ NOT NULL,
  surface        TEXT        NOT NULL,
  item_id        TEXT        NOT NULL,
  rank           SMALLINT    NOT NULL,
  score          REAL,
  propensity     REAL        NOT NULL,   -- probability the policy showed this item at this rank
  source         TEXT        NOT NULL,   -- ann | co-visit | trending | business-rule | exploration
  model_version  TEXT        NOT NULL,
  experiment_arm TEXT
) PARTITION BY RANGE (shown_at);

CREATE TABLE ${c.tbl}_feedback (
  impression_id  UUID        NOT NULL REFERENCES ${c.tbl}_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE ${c.tbl}_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);`,
        eventSchema: j({ type: 'SlateShown', request_id: 'string', user_id: 'pseudonymous string', surface: 'string', items: [{ item_id: 'string', rank: 'int', propensity: 'float', source: 'string' }], model_version: 'string', experiment_arm: 'string', shown_at: 'timestamp' }),
        failureAndRetry: [
          { failure: 'Candidate retriever times out', behaviour: 'Hedge once at the p95 of that retriever, then serve the pool from the sources that answered; record which sources were missing.' },
          { failure: 'Ranker unavailable or over its sub-budget', behaviour: 'Return the pre-ranked pool ordered by the cached popularity-by-segment score and mark degraded = true.' },
          { failure: 'Item index stale (items unavailable still shown)', behaviour: 'Filter through the availability service at serve time, not from the index alone; fail closed on out-of-stock for paid placements.' },
          { failure: 'Impression log write fails', behaviour: 'Buffer locally and drop oldest on overflow; never block the response, and alert on dropped-impression rate.' },
          { failure: 'Client retries a request', behaviour: 'The request_id returns the same slate and does not log a second impression.' },
        ],
        securityModel: [
          { surface: 'User identity', control: 'Pseudonymous user ids in logs and features; the mapping to the person lives only in the identity service.' },
          { surface: 'Consent and personalisation', control: 'Users who opted out of personalisation receive the non-personalised slate; the consent flag is checked in the request path.' },
          { surface: 'Sensitive categories', control: 'Protected or sensitive item categories are excluded from personalisation signals by policy, not by the model.' },
          { surface: 'Feedback poisoning', control: 'Click and rating events are rate-limited and de-duplicated per identity; anomalous bursts are quarantined before training.' },
          { surface: 'Experiment assignment', control: 'Arm assignment is deterministic from a salted hash so it cannot be chosen by the client.' },
        ],
        testScenarios: [
          { scenario: 'Slate respects hard constraints', kind: 'unit', assertion: 'Excluded items, category caps and unavailable items never appear in any slate.' },
          { scenario: 'Propensities are logged and sum correctly', kind: 'contract', assertion: 'Every shown item carries a propensity in (0, 1] and exploration slots are tagged.' },
          { scenario: 'Retriever outage', kind: 'integration', assertion: 'With one retriever down the endpoint still returns a full slate within the deadline, flagged degraded.' },
          { scenario: 'Offline replay with inverse propensity weighting', kind: 'replay', assertion: 'IPS and doubly-robust estimates of the new policy agree in direction with the A/B result on the last experiment.' },
          { scenario: 'Cold-start user and cold-start item', kind: 'unit', assertion: 'Both receive a defined slate from content and popularity signals; no empty response.' },
          { scenario: 'Peak QPS with ranking enabled', kind: 'load', assertion: 'p99 stays inside the deadline at the provisioned peak with one node down.' },
        ],
      };

    case 'rag':
      return {
        apiContract: {
          method: 'POST',
          path: `${c.base}/ask`,
          request: j({ session_id: 'ses_91c2', principal: { user_id: 'u_123', groups: ['claims-analysts'] }, question: '…', filters: { source: ['policy', 'case-notes'] }, max_context_tokens: 6000, stream: true }),
          response: 'event: retrieval  data: {"chunks":12,"after_acl":9,"after_rerank":5}\nevent: delta      data: {"text":"…"}\nevent: final      data: {"answer":"…","citations":[{"doc_id":"d_41","chunk_id":"c_7","span":[120,310]}],"grounded":true,"usage":{"input_tokens":4200,"output_tokens":310},"model_version":"…","prompt_version":"p14","degraded":false}',
        },
        dataModelDDL: `-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE ${c.tbl}_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE ${c.tbl}_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES ${c.tbl}_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON ${c.tbl}_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE ${c.tbl}_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);`,
        eventSchema: j({ type: 'DocumentIngested | AnswerGenerated | AnswerFeedback', doc_id: 'string', version: 'int', chunk_count: 'int', embedding_model: 'string', answer_id: 'uuid', cited_chunk_ids: ['string'], grounded: 'boolean', prompt_version: 'string' }),
        failureAndRetry: [
          { failure: 'Retrieval returns nothing relevant', behaviour: 'Say so and offer a handoff; never generate an ungrounded answer to fill the gap.' },
          { failure: 'Embedding or vector index unavailable', behaviour: 'Fall back to keyword (BM25) retrieval with a reduced-confidence flag; ingestion retries from the queue.' },
          { failure: 'Model provider rate-limited or timing out', behaviour: 'Retry once with jitter, then route to the secondary model or return retrieved passages with citations and no free-form text.' },
          { failure: 'A source document is updated or withdrawn', behaviour: 'Re-ingest by content hash; retrieval filters on effective dates; answers already given keep the version they cited.' },
          { failure: 'Citation does not support the claim', behaviour: 'The verifier drops or rewrites the sentence; if grounding fails overall the response is withheld and escalated.' },
        ],
        securityModel: [
          { surface: 'Document access', control: 'ACL filtering happens before the model sees any chunk; the filter uses the caller\'s groups, never the model\'s judgement.' },
          { surface: 'Prompt injection through documents', control: 'Retrieved text is data in a delimited block; instructions inside it are ignored and flagged; tools are not exposed to this path.' },
          { surface: 'Sensitive data in prompts', control: 'Redact or tokenise identifiers before the prompt is built; log hashes of questions, not raw text, where policy requires.' },
          { surface: 'Provider boundary', control: 'Only approved providers and regions; contractual no-training and retention terms recorded; keys in a secrets manager, rotated.' },
          { surface: 'Cross-tenant leakage', control: 'Tenant id is part of the index partition and the cache key; tested with planted cross-tenant canaries.' },
        ],
        testScenarios: [
          { scenario: 'Answer grounded in cited chunks', kind: 'replay', assertion: 'On the golden question set, at least the agreed share of answers are grounded and every citation supports its claim.' },
          { scenario: 'ACL enforcement', kind: 'safety', assertion: 'A user without access never receives text, citations or counts derived from a restricted document.' },
          { scenario: 'Planted prompt injection in a document', kind: 'safety', assertion: 'The injected instruction is not followed and the document is flagged.' },
          { scenario: 'Out-of-scope question', kind: 'unit', assertion: 'The assistant declines or hands off instead of answering from model memory.' },
          { scenario: 'Retrieval regression on re-index', kind: 'replay', assertion: 'Recall@k and MRR on the labelled retrieval set do not drop after an embedding or chunking change.' },
          { scenario: 'Streaming under load', kind: 'load', assertion: 'Time to first token stays inside budget at provisioned peak concurrency.' },
        ],
        algorithm: `# ${c.title}
# archetype: retrieval-augmented generation - ingestion, retrieval, re-ranking and citation checking around a language model

MAX_CONTEXT = 6000

async def ask(req, deps):
    budget = Budget(deadline_ms=${T}, max_cost_usd=req.constraints.max_cost_usd)
    deps.guard.check_input(req)                                          # injection, PII, scope
    q = deps.rewrite(req.question, history=deps.session.history(req.session_id))
    cands = await deps.retriever.hybrid(q, k=40, filters=req.filters)    # dense + keyword, merged
    cands = [c for c in cands if deps.acl.allows(req.principal, c)]      # ACL BEFORE the model sees anything
    top = deps.reranker.rerank(q, cands)[:8]
    if not top or top[0].score < deps.cfg.min_relevance:
        return deps.respond_no_answer(req, reason="no relevant source")  # abstain rather than guess
    ctx = deps.pack(top, max_tokens=MAX_CONTEXT)                         # delimited, untrusted data block
    draft = await deps.llm.generate(prompt=deps.prompts.get("answer"), question=q, context=ctx, stream=req.stream)
    checked = deps.verifier.check(draft, ctx)                            # every claim must cite a chunk that supports it
    if not checked.grounded:
        return deps.handoff(req, draft=checked.safe_summary)
    deps.audit.record(req, retrieved=cands, cited=checked.citations, versions=deps.versions())
    return deps.respond(checked, citations=checked.citations)
`,
      };

    case 'agentic-workflow':
      return {
        apiContract: {
          method: 'POST',
          path: `${c.base}/tasks`,
          request: j({ task_id: 'tsk_77', principal: { user_id: 'u_123', scopes: ['read', 'propose'] }, goal: '…', inputs: { case_id: 'c_901' }, constraints: { max_steps: c.steps, max_cost_usd: 0.05, autonomy: 'L1' }, stream: true }),
          response: 'event: step       data: {"n":1,"tool":"get_case","status":"ok"}\nevent: proposal   data: {"action":"…","evidence":[{"record_id":"r_12"}],"needs_approval":true}\nevent: final      data: {"state":"AWAITING_APPROVAL | DONE | ESCALATED","usage":{"steps":4,"tokens":9200,"cost_usd":0.03},"trace_id":"tr_55"}',
        },
        dataModelDDL: `-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE ${c.tbl}_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE ${c.tbl}_steps (
  task_id TEXT NOT NULL REFERENCES ${c.tbl}_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE ${c.tbl}_approvals (
  task_id TEXT NOT NULL REFERENCES ${c.tbl}_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);`,
        eventSchema: j({ type: 'TaskStateChanged | ToolCalled | ApprovalRequested | ApprovalDecided', task_id: 'string', step_no: 'int', from_state: 'string', to_state: 'string', tool: 'string', actor: 'agent | human | system', occurred_at: 'timestamp' }),
        failureAndRetry: [
          { failure: 'A tool call fails or times out', behaviour: 'Retry idempotent reads once; never retry a write without its idempotency key; after the second failure checkpoint and escalate with the missing evidence.' },
          { failure: 'The agent loops or exceeds its step or cost budget', behaviour: 'Hard stop enforced outside the model, hand off with the partial trace, count as a failed task in evaluation.' },
          { failure: 'The process crashes mid-task', behaviour: 'Resume from the last checkpoint; completed steps are not repeated because each step is keyed by (task_id, step_no).' },
          { failure: 'Approver does not respond', behaviour: 'The task stays AWAITING_APPROVAL with an SLA timer; it escalates to a second approver and never auto-approves.' },
          { failure: 'Model output does not parse into a valid tool call', behaviour: 'Reject, re-prompt once with the schema error, then escalate; never execute a best-effort parse.' },
        ],
        securityModel: [
          { surface: 'Tool permissions', control: 'Typed tools with a per-principal allow-list; write tools create requests that a named approver releases.' },
          { surface: 'Prompt injection through tool results', control: 'All tool output is untrusted data; allow-list is fixed per task and cannot be extended by content.' },
          { surface: 'Credentials', control: 'The agent never holds credentials; tools run under scoped, short-lived service identities.' },
          { surface: 'Audit', control: 'Every prompt, tool call, result and decision is stored immutably with trace id and model version.' },
          { surface: 'Data minimisation', control: 'Tools return only the fields the task needs, with identifiers tokenised.' },
        ],
        testScenarios: [
          { scenario: 'Replay set of labelled tasks', kind: 'replay', assertion: 'Task success and evidence validity meet the gate for the current autonomy level.' },
          { scenario: 'Planted instruction in a tool result', kind: 'safety', assertion: 'The agent does not follow it, the tool allow-list is unchanged and the record is flagged.' },
          { scenario: 'Crash and resume', kind: 'integration', assertion: 'After a kill at step 3 the task resumes at step 3 and no write is applied twice.' },
          { scenario: 'Step and cost budget exhaustion', kind: 'unit', assertion: 'The run stops at the budget and escalates with the partial trace.' },
          { scenario: 'Approval gate', kind: 'contract', assertion: 'A write action cannot execute without an approval record at autonomy levels below L2.' },
        ],
      };

    case 'computer-vision':
      return {
        apiContract: {
          method: 'POST',
          path: `${c.base}/frames`,
          request: j({ source_id: 'cam_14', captured_at: '2026-11-07T10:15:30.120Z', frame_uri: 's3://…/f_001.jpg', roi: [0, 0, 1920, 1080], model_profile: 'default', deadline_ms: T }),
          response: j({ source_id: 'cam_14', frame_id: 'f_001', detections: [{ class: 'defect', bbox: [412, 220, 90, 64], score: 0.91, track_id: 7 }], events: [{ type: 'ZONE_VIOLATION', zone: 'z2' }], model_version: '2026-11-03.r1', latency_ms: 31, dropped_frames: 0 }),
        },
        dataModelDDL: `-- frames stay in object storage; the database holds pointers and results
CREATE TABLE ${c.tbl}_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE ${c.tbl}_detections (
  frame_id TEXT NOT NULL REFERENCES ${c.tbl}_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE ${c.tbl}_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);`,
        eventSchema: j({ type: 'ObservationEmitted', source_id: 'string', frame_id: 'string', events: [{ type: 'string', zone: 'string', score: 'float' }], model_version: 'string', captured_at: 'timestamp' }),
        failureAndRetry: [
          { failure: 'Inference queue backs up', behaviour: 'Drop frames (newest-first policy per source) rather than lag; count drops and alert when the drop rate exceeds its budget.' },
          { failure: 'Camera or sensor stream drops', behaviour: 'Emit a source-health event; downstream rules treat the gap as unknown, not as clear.' },
          { failure: 'GPU node lost mid-batch', behaviour: 'Re-queue the batch to another node; frames are idempotent by frame_id so results are not duplicated.' },
          { failure: 'Corrupt or unreadable image', behaviour: 'Reject with a typed error, store the hash, skip - never crash the worker.' },
          { failure: 'Model confidence collapses (lighting or lens change)', behaviour: 'Drift monitor trips, route low-confidence frames to human review and pin the previous model if it persists.' },
        ],
        securityModel: [
          { surface: 'Image storage', control: 'Encrypted buckets, signed short-lived URLs, retention enforced by lifecycle rules.' },
          { surface: 'Personal data in images', control: 'Faces and plates blurred at ingest where not required; access to raw frames is role-restricted and audited.' },
          { surface: 'Model artifacts', control: 'Signed engine files; TensorRT or ONNX engines are built in CI and pulled by digest.' },
          { surface: 'Edge devices', control: 'Device identity and attestation; over-the-air updates are signed and can be rolled back.' },
        ],
        testScenarios: [
          { scenario: 'Golden image set per class and per lighting condition', kind: 'replay', assertion: 'Precision and recall per class meet the gate; no class regresses on the hard-example set.' },
          { scenario: 'Corrupt and oversized images', kind: 'unit', assertion: 'Typed rejection, no worker crash, no leak of memory.' },
          { scenario: 'Frame-drop policy under overload', kind: 'load', assertion: 'Latency stays inside budget while the drop rate stays inside its limit.' },
          { scenario: 'Track continuity across occlusion', kind: 'replay', assertion: 'ID switches per hundred tracks stay under the agreed threshold.' },
          { scenario: 'Engine build reproducibility', kind: 'integration', assertion: 'The same weights and build inputs produce an engine with the same digest and accuracy within tolerance.' },
        ],
      };

    case 'document-extraction':
      return {
        apiContract: {
          method: 'POST',
          path: `${c.base}/documents`,
          request: j({ document_id: 'doc_5521', source_uri: 's3://…/scan.pdf', document_type_hint: 'auto', fields: [f(0, 'total_amount'), f(1, 'party_name')], language: 'auto', callback_url: 'https://…/hooks/extraction' }),
          response: j({ document_id: 'doc_5521', status: 'EXTRACTED | NEEDS_REVIEW | REJECTED', document_type: 'invoice', fields: [{ name: f(0, 'total_amount'), value: '1,240.00', confidence: 0.97, page: 1, bbox: [120, 640, 80, 18] }], pages: 3, model_version: '2026-11-03.r2' }),
        },
        dataModelDDL: `CREATE TABLE ${c.tbl}_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE ${c.tbl}_fields (
  document_id TEXT NOT NULL REFERENCES ${c.tbl}_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE ${c.tbl}_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);`,
        eventSchema: j({ type: 'DocumentProcessed | ReviewRequested | ReviewResolved', document_id: 'string', status: 'string', fields_extracted: 'int', fields_needing_review: 'int', model_version: 'string', occurred_at: 'timestamp' }),
        failureAndRetry: [
          { failure: 'OCR or layout step fails on a page', behaviour: 'Retry the page, then try the alternative engine; if both fail mark the page unreadable and route the document to review.' },
          { failure: 'Field fails a business validation (totals do not add up, date in the future)', behaviour: 'Do not emit the value as extracted; open a review task with the failed rule named.' },
          { failure: 'Two sources disagree on a value', behaviour: 'Keep both with provenance, take the rule-verified one if any, otherwise review.' },
          { failure: 'Document is duplicate or a resubmission', behaviour: 'De-duplicate by content hash and return the earlier result with a pointer.' },
          { failure: 'Callback receiver is down', behaviour: 'Retry with exponential backoff for 24 hours, then park in a dead-letter queue; results stay retrievable by id.' },
        ],
        securityModel: [
          { surface: 'Document storage', control: 'Encrypted at rest, per-tenant prefixes, retention and legal-hold rules enforced by policy.' },
          { surface: 'Sensitive fields', control: 'Identifiers and financial values are masked in logs; reviewers see only the fields they must verify.' },
          { surface: 'Malicious files', control: 'Scan and sandbox uploads, cap size and page count, strip active content before parsing.' },
          { surface: 'LLM-assisted steps', control: 'Document text is untrusted input; outputs are schema-validated and never executed.' },
        ],
        testScenarios: [
          { scenario: 'Golden document set per document type and scan quality', kind: 'replay', assertion: 'Field-level accuracy meets the gate per field and per quality band; straight-through rate is reported alongside it.' },
          { scenario: 'Cross-field validation', kind: 'unit', assertion: 'Totals, dates and identifiers that fail validation always create review tasks.' },
          { scenario: 'Rotated, skewed and low-resolution scans', kind: 'unit', assertion: 'Pre-processing recovers readable text or routes to review; no silent wrong value.' },
          { scenario: 'Malformed and oversized files', kind: 'safety', assertion: 'Rejected safely without crashing or exhausting memory.' },
          { scenario: 'Callback retry and idempotency', kind: 'integration', assertion: 'A repeated callback does not create duplicate downstream records.' },
        ],
        algorithm: `# ${c.title}
# archetype: document / language extraction - parse, extract with provenance, validate, and route only the uncertain fields to people

def process(doc, deps):
    pages = deps.preprocess(deps.store.read(doc.source_uri))             # deskew, denoise, split; reject unreadable files here
    layout = deps.layout.analyse(pages)                                  # regions, tables, reading order
    cands = []
    for field in doc.fields:
        cands += deps.extract(field, layout, sources=("rule", "model", "llm"))   # every candidate keeps page + bbox + source
    fields = deps.resolve(cands)                                          # agree, or pick the rule-verified value, or mark conflict
    problems = deps.validate(fields)                                      # cross-field and business rules
    needs_review = [f for f in fields if f.confidence < deps.cfg.min_conf or f.name in problems]
    if needs_review:
        deps.review_queue.open(doc.id, needs_review, reasons=problems)    # humans see the page region, not the whole document
    deps.sink.write_idempotent(doc.id, fields)                            # keyed by document id => safe retries
    return deps.status(doc.id, needs_review)
`,
      };

    case 'optimisation':
      return {
        apiContract: {
          method: 'POST',
          path: `${c.base}/plans`,
          request: j({ plan_id: 'pl_20261107_a', horizon: { start: '2026-11-08', end: '2026-11-14' }, scenario: 'base', objective: 'min_total_cost', constraints_version: 'c42', warm_start_plan_id: 'pl_20261106_a', time_limit_s: 120 }),
          response: j({ plan_id: 'pl_20261107_a', status: 'OPTIMAL | FEASIBLE | INFEASIBLE | TIMEOUT', objective_value: 0, gap_pct: 0.4, violated_soft_constraints: [], explanation_uri: 's3://…/pl_20261107_a/explain.json', solver_version: '…', model_version: '…' }),
        },
        dataModelDDL: `CREATE TABLE ${c.tbl}_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE ${c.tbl}_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES ${c.tbl}_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE ${c.tbl}_assignments (
  plan_id TEXT NOT NULL REFERENCES ${c.tbl}_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE ${c.tbl}_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);`,
        eventSchema: j({ type: 'PlanPublished | PlanInfeasible | ReplanTriggered', plan_id: 'string', status: 'string', objective_value: 'double', gap_pct: 'float', trigger: 'schedule | disruption | manual', occurred_at: 'timestamp' }),
        failureAndRetry: [
          { failure: 'Solver proves the problem infeasible', behaviour: 'Return the minimal conflicting constraints and a relaxed plan labelled as such; never publish an infeasible plan.' },
          { failure: 'Solver hits the time limit', behaviour: 'Publish the best feasible incumbent with its optimality gap, and keep improving in the background.' },
          { failure: 'Inputs change during the solve (disruption)', behaviour: 'Re-plan from the executed state with a warm start and a stability penalty so the new plan stays close to the old one.' },
          { failure: 'Forecast input is missing or stale', behaviour: 'Use the last good forecast with an inflated safety margin and flag the plan.' },
          { failure: 'A solve crashes', behaviour: 'Retry from the same snapshot id; plans are keyed by snapshot so a retry cannot publish two plans.' },
        ],
        securityModel: [
          { surface: 'Constraint and objective changes', control: 'Versioned, reviewed and approved by the business owner; a plan records which constraint version it used.' },
          { surface: 'Plan publication', control: 'Only the planner service identity can publish; humans can override with a reason that is recorded.' },
          { surface: 'Commercial data', control: 'Cost and margin inputs restricted by role; explanations redact them for external viewers.' },
          { surface: 'Audit trail', control: 'Snapshot hash, solver version, constraint version and every manual override are stored with the plan so any plan can be reproduced.' },
        ],
        testScenarios: [
          { scenario: 'Known-optimum benchmark instances', kind: 'replay', assertion: 'The solver reaches the known optimum or an agreed gap on a fixed library of instances.' },
          { scenario: 'Constraint satisfaction on every published plan', kind: 'unit', assertion: 'A checker independent of the solver confirms zero hard-constraint violations.' },
          { scenario: 'Infeasible input', kind: 'unit', assertion: 'The API returns INFEASIBLE with a named conflict set, never a plan.' },
          { scenario: 'Plan stability after a small input change', kind: 'replay', assertion: 'A 1% demand change moves no more than the agreed share of assignments.' },
          { scenario: 'Solve time at full size', kind: 'load', assertion: 'The largest realistic instance returns a feasible plan inside the time limit.' },
        ],
        algorithm: `# ${c.title}
# archetype: optimisation - build a problem from a snapshot, solve under constraints, check independently, publish with an explanation

def plan(req, deps):
    snap = deps.snapshot.freeze(req.horizon, constraints_version=req.constraints_version)   # inputs are fixed and hashed
    problem = deps.build_model(snap)                                      # variables, hard constraints, soft penalties, objective
    start = deps.plans.get(req.warm_start_plan_id)                        # warm start + stability penalty
    sol = deps.solver.solve(problem, warm_start=start, time_limit_s=req.time_limit_s)
    if sol.status == "INFEASIBLE":
        return deps.respond_infeasible(deps.solver.conflicts(problem))    # name the constraints that collide
    violations = deps.checker.hard_violations(snap, sol)                  # independent of the solver
    assert not violations, "solver output violates a hard constraint"
    deps.plans.publish_idempotent(req.plan_id, sol, snapshot=snap.id)     # keyed by snapshot => safe retries
    return deps.respond(sol, explanation=deps.explain(problem, sol))      # binding constraints and trade-offs
`,
      };

    case 'batch-analytics':
      return {
        apiContract: {
          method: 'POST',
          path: `${c.base}/runs`,
          request: j({ run_date: '2026-11-07', partition: 'all', dry_run: false, model_version: 'champion' }),
          response: j({ run_id: 'run_20261107_01', status: 'RUNNING | SUCCEEDED | FAILED_DQ', rows_in: 0, rows_out: 0, rows_quarantined: 0, manifest_uri: 's3://…/manifest.json' }),
        },
        dataModelDDL: `-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE ${c.tbl}_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE ${c.tbl}_outputs (
  run_id TEXT NOT NULL REFERENCES ${c.tbl}_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE ${c.tbl}_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE ${c.tbl}_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);`,
        eventSchema: j({ type: 'BatchRunCompleted', run_id: 'string', run_date: 'date', status: 'string', rows_in: 'long', rows_out: 'long', rows_quarantined: 'long', manifest_uri: 'string' }),
        failureAndRetry: [
          { failure: 'Input freshness or completeness gate fails', behaviour: 'Fail the run, keep the previous outputs marked stale and page the owner; no partial publish.' },
          { failure: 'A partition fails', behaviour: 'Retry the partition with backoff; outputs are written by (run_id, partition) so retries are idempotent.' },
          { failure: 'Run exceeds its window', behaviour: 'Publish completed partitions in priority order, defer the tail with staleness flags.' },
          { failure: 'Row counts do not reconcile (rows_in ≠ rows_out + quarantined)', behaviour: 'Block publication and open an incident - silent row loss is a defect, not a warning.' },
          { failure: 'Downstream consumer reads mid-run', behaviour: 'Publish atomically by manifest swap so consumers never see a half-written run.' },
        ],
        securityModel: [
          { surface: 'Input access', control: 'Read-only, column-scoped roles; sensitive columns are masked or tokenised in the job.' },
          { surface: 'Output access', control: 'Consumers read through governed views; row-level policy for restricted entities.' },
          { surface: 'Job identity', control: 'One service identity per job with no interactive credentials; secrets from a manager.' },
          { surface: 'Reproducibility', control: 'Code version, model digest and input snapshot ids are written into the manifest.' },
        ],
        testScenarios: [
          { scenario: 'Reconciliation', kind: 'integration', assertion: 'rows_in equals rows_out plus rows_quarantined on every run.' },
          { scenario: 'Idempotent rerun', kind: 'integration', assertion: 'Rerunning a run date produces identical outputs and the same manifest content hash.' },
          { scenario: 'Schema drift in an input', kind: 'contract', assertion: 'A renamed or retyped column fails the data contract check before scoring.' },
          { scenario: 'Backfill isolation', kind: 'integration', assertion: 'A historical backfill never overwrites the current published run.' },
          { scenario: 'Score and distribution regression', kind: 'replay', assertion: 'Score distribution and top-band rate stay within the agreed bounds against the previous run.' },
          { scenario: 'Full-volume timing', kind: 'load', assertion: 'The largest day completes inside the window with headroom.' },
        ],
      };

    case 'realtime-decisioning':
    default:
      return {
        apiContract: {
          method: 'POST',
          path: `${c.base}/decide`,
          request: j({ request_id: '01JABCDEF…', entity_id: 'ent_8f3a', occurred_at: '2026-11-07T10:15:30Z', inline_signals: Object.fromEntries(c.feats.slice(0, 2).map((x, n) => [x, n === 0 ? 0.0 : 3])), deadline_ms: c.budgetMs }),
          response: j({ request_id: '01JABCDEF…', decision: 'PASS | REVIEW | ACT', score: 0.0134, reason_codes: [f(0, 'top_signal'), f(1, 'second_signal')], model_version: '2026-11-03.r2', latency_ms: 4.2, degraded: false }),
        },
        dataModelDDL: '',
        eventSchema: j({ type: 'DecisionMade', decision_id: 'uuid', request_id: 'string', entity_id: 'string', decision: 'PASS | REVIEW | ACT', score: 'float', reason_codes: ['string'], model_version: 'string', degraded: 'boolean', latency_ms: 'float', decided_at: 'timestamp' }),
        failureAndRetry: [
          { failure: 'Feature store slow or unavailable', behaviour: `Serve with cached or stale features (age stamped on the decision) inside the sub-budget; ${idem}.` },
          { failure: 'Champion model breaker opens', behaviour: 'Route to the distilled fallback or last-known-good version; the decision carries degraded = true.' },
          { failure: 'Caller times out and retries', behaviour: 'The idempotency key returns the first decision; the retry is never scored twice.' },
          { failure: 'Decision log or event bus unavailable', behaviour: 'Buffer locally with drop-oldest and a counter alert; the response never waits on emission.' },
          { failure: 'Whole serving plane unreachable', behaviour: 'Caller-side default (fail-open or fail-closed by risk appetite) plus a sampled post-hoc review queue.' },
        ],
        securityModel: [
          { surface: 'API authentication', control: 'mTLS between services and short-lived signed tokens; per-client rate limits and quotas.' },
          { surface: 'Authorisation', control: 'Callers may only decide for entities in their scope; policy thresholds are config changeable only through reviewed change requests.' },
          { surface: 'Sensitive attributes', control: 'Tokenised identifiers in features and logs; protected attributes excluded from the model and used only for fairness monitoring.' },
          { surface: 'Decision log', control: 'Append-only, access-audited; retention and deletion follow the data-classification policy.' },
          { surface: 'Model artifacts', control: 'Signed and pulled by digest; a new version cannot serve without passing the registry gates.' },
        ],
        testScenarios: [
          { scenario: 'Point-in-time feature correctness', kind: 'unit', assertion: 'Training and serving transforms produce identical values for the same as_of.' },
          { scenario: 'Latency under deadline propagation', kind: 'load', assertion: 'p99 stays inside the budget at provisioned peak with one region down.' },
          { scenario: 'Fallback ladder', kind: 'integration', assertion: 'Killing the feature store, then the model, walks the ladder one level at a time with degraded = true.' },
          { scenario: 'Idempotent retries', kind: 'contract', assertion: 'The same Idempotency-Key returns the identical decision and writes one ledger row.' },
          { scenario: 'Threshold change replay', kind: 'replay', assertion: 'A proposed threshold is replayed on a week of traffic and its cost-weighted effect is within the approved range.' },
          { scenario: 'Delayed-label reconciliation', kind: 'integration', assertion: 'A label arriving late joins to the exact decision snapshot that produced it.' },
        ],
      };
  }
}

export function algorithmFor(a: Archetype, ctx: ArchCtx): string | undefined {
  return archetypeLLD(a, ctx).algorithm;
}
