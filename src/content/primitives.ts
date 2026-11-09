/**
 * Canonical architectural primitives. Across 500 blueprints the same mechanisms repeat (point-in-time joins, budget pacers,
 * load shedding, outbox + CDC ...). Each is explained once here, at /patterns/primitives/<id>, and blueprints link to it
 * instead of re-deriving it. Client-safe: plain data, no Node imports.
 */
export interface Primitive {
  id: string;
  title: string;
  summary: string;
  /** when a blueprint should reach for it */
  whenToUse: string;
  how: string[];
  language: 'python' | 'sql' | 'yaml' | 'text';
  code: string;
  pitfalls: string[];
}

export const PRIMITIVES: Primitive[] = [
  {
    id: 'point-in-time-feature-joins',
    title: 'Point-in-time feature joins',
    summary:
      'Join labels to features as they were known at decision time, with one transform serving both the offline lakehouse and the online store.',
    whenToUse:
      'Any model trained on history and served online. It is the single biggest source of offline/online skew.',
    how: [
      'Stamp every event with event_time and ingest_time; join on event_time <= decision_time, never on ingest order alone.',
      'In Flink/Spark use event-time watermarks with an explicit allowed-lateness; route later events to a side output and count them as a metric.',
      'Write the same feature value to the online KV store (Redis/ScyllaDB/Aerospike) and to an Iceberg/Delta table from one job, so train and serve cannot drift.',
      'Log the feature vector (or its hash) used for every served decision; that log is the training truth, not a recomputation.',
    ],
    language: 'sql',
    code: `-- ASOF join: the latest feature row at or before the decision, never after
SELECT d.decision_id, d.label, f.*
FROM decisions d
ASOF LEFT JOIN feature_snapshots f
  ON  f.entity_id = d.entity_id
  AND f.valid_from <= d.decision_time          -- strictly known at decision time
WHERE d.decision_time < d.label_matured_at;    -- exclude labels that have not matured`,
    pitfalls: [
      'Joining on processing time silently leaks the future during replays.',
      'Recomputing features at training time with newer code than serving used: log served features instead.',
      'Watermarks set too tight drop real late events; too loose delay every window.',
    ],
  },
  {
    id: 'backfill-isolation',
    title: 'Backfill isolation',
    summary:
      'Recompute months of sliding-window features without saturating the online store or the live consumers.',
    whenToUse: 'Any feature redefinition, bug fix or new window that needs history rebuilt.',
    how: [
      'Run the backfill as a batch job that writes only to the offline lakehouse, in a separate namespace and compute pool.',
      'Publish to the online store by a rate-limited bulk loader (token bucket at a fixed share of write IOPS), keyed by feature version.',
      'Serve from a versioned feature view; flip the pointer only after row counts and distribution checks pass, keep the old version for rollback.',
      'Reserve write capacity: live streaming writers get priority via a separate connection pool and quota.',
    ],
    language: 'yaml',
    code: `backfill:
  feature_view: velocity_v7
  source: lakehouse.events           # replay from the log, not the OLTP database
  window: [2026-05-01, 2026-11-01]
  sink_online:
    rate_limit_writes_per_s: 20000   # <= 15% of the store's write budget
    namespace: velocity_v7           # old version stays serving
  promote_when:
    row_count_ratio: [0.98, 1.02]
    psi_vs_v6_max: 0.1`,
    pitfalls: [
      'Backfilling straight into the live keyspace overwrites fresh values with stale ones.',
      'No kill switch: a runaway backfill takes the serving path down with it.',
    ],
  },
  {
    id: 'schema-evolution-dlq',
    title: 'Schema evolution and poison-pill handling',
    summary:
      'Enforce Avro/Protobuf compatibility at the registry and park undecodable records in a dead-letter queue that can be replayed.',
    whenToUse: 'Every event bus that feeds a model or a regulator-facing log.',
    how: [
      'Set the schema registry to BACKWARD_TRANSITIVE; CI rejects a producer change that breaks any consumer.',
      'Consumers never crash on a bad record: decode failure goes to <topic>.dlq with the original bytes, error and offset.',
      'Alert on DLQ rate; replay with a fixed decoder in a bounded job once the cause is understood.',
      'Add fields as optional with defaults; rename by add-then-deprecate-then-remove across releases.',
    ],
    language: 'python',
    code: `def consume(record):
    try:
        event = registry.decode(record.value, record.schema_id)
    except SchemaError as e:
        dlq.send(topic=f"{record.topic}.dlq", value=record.value,
                 headers={"error": str(e), "offset": record.offset})
        metrics.incr("dlq.decode_error")
        return                                   # never raise: one bad record must not stall the partition
    handle(event)`,
    pitfalls: [
      'Retrying a poison pill forever blocks the whole partition.',
      'A DLQ nobody replays is just a slower way to lose data.',
    ],
  },
  {
    id: 'outbox-cdc',
    title: 'Transactional outbox + CDC',
    summary:
      'Write the state change and the event in one database transaction, then ship the event with change-data-capture so nothing is published twice or lost.',
    whenToUse: 'Whenever a service updates its database and must also emit an event or feed a feature pipeline.',
    how: [
      'In the same transaction as the business write, insert a row into an outbox table.',
      'A CDC connector (Debezium) tails the log and publishes outbox rows to Kafka keyed by aggregate id.',
      'Consumers dedupe on event_id; delivery is at-least-once, effects are idempotent.',
      'Delete or archive published outbox rows on a schedule.',
    ],
    language: 'sql',
    code: `BEGIN;
  UPDATE orders SET status = 'PAID' WHERE id = :id;
  INSERT INTO outbox(event_id, aggregate_id, type, payload, created_at)
  VALUES (:event_id, :id, 'OrderPaid', :payload, now());
COMMIT;                                   -- Debezium publishes outbox rows to Kafka`,
    pitfalls: [
      'Dual writes (DB then Kafka) lose events on a crash between the two.',
      'Consumers that are not idempotent turn at-least-once into double effects.',
    ],
  },
  {
    id: 'compound-cascade',
    title: 'Compound cascade with early exit',
    summary:
      'L0 heuristics and Bloom filters, L1 CPU gradient-boosted trees, L2 GPU deep model or LLM, each with an exit threshold so most traffic never reaches the expensive tier.',
    whenToUse: 'Latency- or cost-bound scoring where a cheap model resolves most requests with confidence.',
    how: [
      'L0 (microseconds): blocklists, Bloom filters, hard rules. Resolves the obvious tail on both ends.',
      'L1 (sub-millisecond, CPU): GBDT compiled with Treelite/ONNX. Exits if score is outside the uncertainty band [lo, hi].',
      'L2 (GPU/LLM): only the ambiguous middle; carries the latency and cost budget.',
      'Tune [lo, hi] on cost per decision against the quality target; log which tier decided every request.',
    ],
    language: 'python',
    code: `def score(req):
    if l0.blocked(req) or l0.allowed(req):    return l0.decision(req)
    p1 = l1.predict(req.features)             # CPU GBDT
    if p1 < LO or p1 > HI:                    return decide(p1, tier="L1")
    p2 = l2.predict(req.features, timeout=budget.remaining())   # GPU / LLM
    return decide(blend(p1, p2), tier="L2")`,
    pitfalls: [
      'An uncertainty band tuned once and never revisited drifts as the data moves.',
      'L1 and L2 trained on different populations make the blend incoherent: train L2 on what L1 passes up.',
    ],
  },
  {
    id: 'two-tower-hnsw-cross-encoder',
    title: 'Two-tower retrieval + HNSW + cross-encoder re-rank',
    summary:
      'Embed queries and items separately, retrieve candidates by approximate nearest neighbour, then re-rank a short list with a joint model.',
    whenToUse: 'Search, recommendation and RAG over catalogues too large to score exhaustively.',
    how: [
      'Train a two-tower model with in-batch negatives (corrected for sampling bias) and publish item vectors to an HNSW index.',
      'Retrieve top-k (200 to 1,500) with metadata filters applied inside the index, not after it.',
      'Re-rank the short list with a cross-encoder or ranker that sees query and item together.',
      'Allocate the latency budget explicitly: retrieval ~25%, features ~20%, re-rank ~45%, business rules ~10%.',
    ],
    language: 'python',
    code: `cands = ann.search(q_vec, k=800, filter=mask)          # HNSW, filter inside the index
cands = pre_ranker.top(q, cands, k=150)                # cheap L1 cut
scored = cross_encoder.score(q, cands, timeout=dl.share(0.45))
return rules.apply(scored, constraints)`,
    pitfalls: [
      'Post-filtering ANN results can return fewer than k valid candidates.',
      'Index and model versions drift apart: ship them as one artifact.',
    ],
  },
  {
    id: 'availability-bitmap-prefilter',
    title: 'Roaring-bitmap availability pre-filter',
    summary:
      'Apply stock, serviceability and eligibility as a bitmap inside the retrieval shard so the ranker never scores items that cannot be shown.',
    whenToUse: 'Hyper-local commerce, entitlement-gated content, anything where large fractions of the catalogue are ineligible per request.',
    how: [
      'Keep one Roaring bitmap per dimension (pincode/dark store, region, entitlement) over item ordinals.',
      'AND the relevant bitmaps at query time and pass the result as the ANN filter.',
      'Update bitmaps from the inventory stream with sub-second lag; version them so a stale bitmap fails open to a safe default.',
    ],
    language: 'python',
    code: `mask = bm["pincode:560001"] & bm["in_stock"] & bm["not_restricted"]
cands = index.search(q_vec, k=800, allow=mask)   # no wasted scoring on ineligible items`,
    pitfalls: ['Bitmaps updated lazily show sold-out items; surface the staleness as a metric.'],
  },
  {
    id: 'position-bias-tower',
    title: 'Position-bias-aware learning (PAL)',
    summary:
      'Train with a shallow tower that sees the slot position, then drop it or pin it to position 1 at inference so the ranker learns relevance, not placement.',
    whenToUse: 'Any model trained on clicks or purchases from a ranked list.',
    how: [
      'Factor P(click) = P(seen | position) x P(relevant | item, context).',
      'Train both towers jointly; at serving use only the relevance tower (or fix position to 1).',
      'Combine tasks into a calibrated utility: click, cart given click, purchase given cart weighted by margin, plus an exposure term for seller fairness.',
      'Add a small randomisation bucket to measure position effects directly.',
    ],
    language: 'python',
    code: `logit = rel_tower(user, query, item) + pos_tower(position)     # train
logit = rel_tower(user, query, item)                            # serve: position tower dropped
score = w1*p_click + w2*p_cart_given_click + w3*p_buy_given_cart*log1p(gmv) + lam*exposure_boost(seller)`,
    pitfalls: [
      'Training on raw clicks makes slot 1 self-reinforcing (rich-get-richer).',
      'Price bias: cheap impulse items win clicks; weight purchase and margin, not clicks alone.',
    ],
  },
  {
    id: 'pid-budget-pacer',
    title: 'PID budget pacer',
    summary:
      'A feedback controller that moves a shadow-price multiplier every few seconds so spend tracks a target curve instead of burning out early.',
    whenToUse: 'Auction bidding, quota-limited APIs and any decision system with a daily budget.',
    how: [
      'Define the target cumulative spend curve (traffic-weighted, not linear).',
      'Every 1 to 5 s compute error = target - actual and update lambda_c with PID gains; clamp and rate-limit the change.',
      'Apply bid = value / (1 + lambda_c); reserve in-flight spend for outstanding bids that have not been billed yet.',
      'Run the controller per campaign with a fleet-level allocator on top; fail safe to a flat conservative multiplier.',
    ],
    language: 'python',
    code: `err = target_spend(t) - spent(t) - inflight_reserved(t)
lam = clamp(lam - (Kp*err + Ki*integral(err) + Kd*d_err_dt), LAM_MIN, LAM_MAX)
bid = pctr * pcvr * value_per_conv / (1.0 + lam)`,
    pitfalls: [
      'Integral wind-up after an outage: clamp and reset the integrator.',
      'Ignoring win-notice delay (50 to 500 ms) overspends during traffic spikes.',
    ],
  },
  {
    id: 'bid-shading-clearing-price',
    title: 'Bid shading with a censored clearing-price model',
    summary:
      'In first-price auctions, bid below true value using a distribution of the clearing price learned from won and lost bids.',
    whenToUse: 'First-price programmatic exchanges.',
    how: [
      'Model the winning price as a density; lost bids are right-censored (you only know the clearing price was above your bid).',
      'Fit with survival regression or a censored histogram per exchange and context.',
      'Choose bid b maximising (value - b) x P(win | b); cap shading so win rate stays inside a band.',
    ],
    language: 'python',
    code: `b_star = argmax(lambda b: (value - b) * win_prob(b, ctx), candidates=grid(0.1*value, value))`,
    pitfalls: ['Fitting on won bids only overestimates the clearing price.'],
  },
  {
    id: 'adaptive-concurrency-shedding',
    title: 'Adaptive concurrency limit and load shedding',
    summary:
      'Limit in-flight requests from measured latency (Little\'s Law, Vegas/Gradient limiters) and shed early so queues never grow past the deadline.',
    whenToUse: 'Every synchronous serving path with a p99 target.',
    how: [
      'Concurrency L = throughput x latency (Little\'s Law). Estimate min latency and shrink the limit when observed latency exceeds it.',
      'Reject at the gateway with a cheap response when the limit or queue wait exceeds the remaining deadline.',
      'Priority classes: shed background and retry traffic first; never shed the health check.',
      'Trip the breaker on queue depth, not just on errors, so you fail before timeouts cascade.',
    ],
    language: 'python',
    code: `limit = max(MIN, min(MAX, limit * (min_rtt / sample_rtt) + queue_allowance))   # Vegas-style
if inflight >= limit or queue_wait_ms > deadline.remaining_ms():
    return reject(status=429, retry_after_ms=jitter(50))`,
    pitfalls: [
      'Static limits are wrong half the time: too low wastes capacity, too high collapses at saturation.',
      'Retries without budgets multiply load during an incident.',
    ],
  },
  {
    id: 'shadow-canary-mirroring',
    title: 'Shadow and canary governance',
    summary:
      'Mirror production traffic to a challenger asynchronously, then promote through a canary, without touching production p99 or the feature store.',
    whenToUse: 'Every model, prompt or policy change.',
    how: [
      'Mirror at the gateway after the response is sent; use a bounded async queue and drop on overflow (shadow loses, production never does).',
      'Challenger reads features from the logged vector or a read replica, not the primary feature store.',
      'Compare on agreement, score distribution and a counterfactual metric; promote to 1% -> 5% -> 25% with automatic rollback on SLO or guardrail breach.',
    ],
    language: 'yaml',
    code: `rollout:
  shadow:  { sample: 0.10, queue_max: 5000, on_overflow: drop, feature_source: logged_vector }
  canary:  { steps: [0.01, 0.05, 0.25, 1.0], bake_minutes: 60 }
  rollback_if: [ "p99_ms > baseline*1.1", "false_positive_rate > guardrail", "cost_per_1k > 1.2*baseline" ]`,
    pitfalls: ['Shadow traffic that hits the live feature store can itself cause the outage.'],
  },
  {
    id: 'delayed-label-attribution',
    title: 'Delayed and censored labels, counterfactuals',
    summary:
      'Handle outcomes that arrive weeks later or that your own decision prevented, with inverse-propensity weighting and an exploration holdout.',
    whenToUse: 'Chargebacks, readmissions, churn, any case where acting on a prediction changes the outcome.',
    how: [
      'Train only on matured windows; treat unmatured rows as censored (survival loss) rather than negative.',
      'Log the propensity of every action. Reweight by 1 / propensity when training on logged decisions.',
      'Keep a small random holdout (about 0.5%) or step-up bucket so some outcomes are observed regardless of the model.',
      'Treat intervened cases explicitly: a treated true positive that did not progress is not a false positive.',
    ],
    language: 'python',
    code: `w = 1.0 / np.clip(propensity, 0.01, 1.0)           # inverse propensity weight
w[is_holdout] = 1.0 / HOLDOUT_RATE                  # random holdout gives unbiased outcomes
loss = weighted_bce(y, p, sample_weight=w * matured_mask)`,
    pitfalls: [
      'Retraining only on outcomes you allowed to happen teaches the model that its own blocks were wrong.',
      'Extreme propensity weights blow up variance: clip and report effective sample size.',
    ],
  },
  {
    id: 'probability-calibration',
    title: 'Post-hoc probability calibration',
    summary:
      'Re-map raw scores to true probabilities (Platt, isotonic, Venn-Abers) after focal-loss or class-weighted training so expected-value decisions are valid.',
    whenToUse: 'Whenever a threshold or an expected-value formula consumes the score.',
    how: [
      'Fit the calibrator on a held-out, time-forward slice that matches serving prevalence.',
      'Choose Platt for small data, isotonic for large, Venn-Abers when you need validity guarantees and intervals.',
      'Decide on E[V] = P(event) x cost - (1 - P) x friction, not on a raw score cut-off.',
      'Monitor expected calibration error per slice, including cold-start and thin-file cohorts.',
    ],
    language: 'python',
    code: `cal = IsotonicRegression(out_of_bounds="clip").fit(p_holdout, y_holdout)
p = cal.predict(raw_score)
act = p * COST_MISS > (1 - p) * COST_FRICTION`,
    pitfalls: ['Calibrating on training data or a different prevalence gives confident, wrong probabilities.'],
  },
  {
    id: 'three-action-decision',
    title: 'Three-action decision space (allow, step-up, block)',
    summary:
      'Insert a challenge between allow and block so ambiguous cases generate verified labels and protect the false-decline ceiling.',
    whenToUse: 'Fraud, account takeover, access control, anywhere a hard block on an uncertain score hurts good users.',
    how: [
      'Two thresholds: below t1 allow, between t1 and t2 challenge (OTP, biometric, cool-off), above t2 block.',
      'Choose t1/t2 on the cost curve and the false-decline ceiling, not on one ROC point.',
      'The challenge outcome is a ground-truth label for the ambiguous region; log it with the action taken.',
    ],
    language: 'python',
    code: `if p < T_ALLOW:   action = ALLOW
elif p < T_BLOCK: action = STEP_UP     # outcome becomes a verified label
else:             action = BLOCK`,
    pitfalls: ['Challenge fatigue: cap challenges per user per day and track abandonment.'],
  },
  {
    id: 'alert-hysteresis',
    title: 'Alert hysteresis and refractory windows',
    summary:
      'A small state machine that suppresses repeat alerts after acknowledgement unless the trajectory worsens materially.',
    whenToUse: 'Clinical early warning, SOC alerting, on-call paging: anywhere trust decays with alert burden.',
    how: [
      'Evaluate at the episode level (patient, incident), not per window.',
      'Two thresholds (raise high, clear low) so a score hovering at the line does not flap.',
      'After acknowledgement enter a refractory window (for example 4 to 6 hours) unless the severity derivative exceeds a delta.',
      'Log suppressed alerts so the suppression itself can be audited.',
    ],
    language: 'python',
    code: `if state == ACKED and now < ack_time + REFRACTORY and (sofa_now - sofa_at_ack) < DELTA:
    return SUPPRESS
if score >= RAISE:   state = ALERTING
elif score <= CLEAR: state = IDLE`,
    pitfalls: ['Suppression with no escalation path hides real deterioration.'],
  },
  {
    id: 'streaming-graph-features',
    title: 'Asynchronous streaming graph features',
    summary:
      'Compute ring and mule-account risk in a streaming graph worker and write scalar features to the online store for O(1) lookup on the hot path.',
    whenToUse: 'Graph signals needed inside a synchronous latency budget.',
    how: [
      'Flink consumes the event stream into an incremental graph (Neo4j/TigerGraph or a custom incremental structure).',
      'Maintain connected components, PageRank from known-bad seeds and shared-device fan-out incrementally.',
      'Write scalars (component risk, fan-out, hop distance to bad seed) to Redis/Aerospike every few seconds with a version.',
      'The auth path reads two or three scalars; it never traverses the graph.',
    ],
    language: 'python',
    code: `for batch in stream.micro_batches(seconds=2):
    graph.apply(batch)
    for entity, feats in graph.dirty_features():       # component risk, fan-out, seed distance
        online.hset(f"gf:{entity}", mapping={**feats, "v": GRAPH_VERSION, "ts": now()})`,
    pitfalls: ['Hub nodes make incremental updates explode: cap fan-out per update.'],
  },
  {
    id: 'wal-decision-ledger',
    title: 'Immutable decision ledger (WORM)',
    summary:
      'An append-only, write-once record of the inputs, model and policy versions and output of every decision, so a regulator can replay it.',
    whenToUse: 'Credit, fraud, claims, clinical decision support and any decision with a legal explanation duty.',
    how: [
      'Append (decision_id, feature_vector_hash, model_version, policy_version, output, reason_codes, ts) to a WORM store (object lock) via Kafka.',
      'Hash-chain records so tampering is detectable; sign batches.',
      'Keep the feature vector (or a pointer to the immutable snapshot) so a replay reproduces the decision bit for bit.',
      'Separate the ledger from the analytical lakehouse and set retention to the regulatory period.',
    ],
    language: 'sql',
    code: `INSERT INTO decision_ledger(decision_id, feature_hash, model_version, policy_version, output, reasons, prev_hash, ts)
VALUES (:id, :fh, :mv, :pv, :out, :reasons, :prev, now());   -- append-only, object-lock backed`,
    pitfalls: ['Logging only the score makes a decision impossible to replay or defend.'],
  },
  {
    id: 'residency-pinned-state',
    title: 'Stateless active-active, state pinned by residency',
    summary:
      'Run inference active-active across regions, but keep regulated state in the jurisdiction it belongs to, with synchronous standby where the ledger needs RPO 0.',
    whenToUse:
      'Payments, banking, insurance and healthcare data under localisation or privacy rules; any ledger or velocity counter where split-brain means double spend.',
    how: [
      'Split the system into a stateless inference plane (any region) and a stateful data plane (pinned by data subject jurisdiction).',
      'Ledgers and counters: single-writer shard per key with a synchronous standby in-country (RPO 0), failover by fenced leader election.',
      'Cross-border flows carry tokens or derived features, never raw regulated records.',
      'Fail over the inference plane freely; fail over the state plane only with fencing and an explicit runbook.',
    ],
    language: 'yaml',
    code: `planes:
  inference:  { topology: active-active, regions: [ap-south-1, ap-south-2, eu-west-1], state: none }
  state:
    ledger:   { topology: shard-pinned, residency: IN, standby: sync, rpo: 0, fencing: lease }
    counters: { topology: single-writer-per-key, replicate: async-readonly }`,
    pitfalls: [
      'Active-active writes to a ledger under a partition produce split-brain and double spend.',
      'Replicating raw regulated records across borders for convenience.',
    ],
  },
  {
    id: 'tenant-isolation',
    title: 'Multi-tenant isolation and noisy-neighbour control',
    summary:
      'Per-tenant quotas, keys and adapters so one tenant\'s load, data or fine-tune cannot affect another.',
    whenToUse: 'B2B SaaS, clinical and enterprise platforms where the bottleneck is tenancy, not total users.',
    how: [
      'Per-tenant token buckets and concurrency limits at the gateway; separate queues for large tenants.',
      'Tenant-scoped encryption keys (BYOK/KMS) and row-level security on every store.',
      'Per-tenant adapter or LoRA routing; cache keyed by tenant so nothing crosses.',
      'Cell-based deployment for the largest tenants.',
    ],
    language: 'yaml',
    code: `tenant_policy:
  quota: { rps: 200, burst: 400, concurrency: 32 }
  keys:  { kms_key_id: "tenant-${'$'}{id}", rotation_days: 90 }
  model: { adapter: "lora/${'$'}{id}", fallback: base }
  cache: { namespace: "${'$'}{id}" }`,
    pitfalls: ['A shared cache without tenant in the key leaks data.'],
  },
  {
    id: 'permission-aware-retrieval',
    title: 'Permission-aware retrieval (ACL pre-filter)',
    summary:
      'Apply tenant and user permissions inside the vector or hybrid query, before top-k truncation, so unauthorised chunks never enter the context.',
    whenToUse: 'Any RAG or search over documents with access control.',
    how: [
      'Store ACL principals (user, group, tenant) as filterable metadata on every chunk.',
      'Resolve the caller\'s effective principals (ReBAC/ABAC) and pass them as a filter to the index query.',
      'Filter inside the ANN search; post-filtering after top-k leaks existence and starves results.',
      'Re-check authorisation at fetch time as well; ACL changes must propagate to the index within an SLA.',
    ],
    language: 'python',
    code: `principals = authz.expand(user)                        # user, groups, tenant
hits = index.search(q_vec, k=20, filter={"acl_any": principals, "tenant": user.tenant})
hits = [h for h in hits if authz.can_read(user, h.doc_id)]   # defence in depth`,
    pitfalls: ['Post-filtering after top-k returns empty or leaks via counts and citations.'],
  },
  {
    id: 'plan-preview-commit',
    title: 'Plan, preview, commit',
    summary:
      'For mutating agent actions: the model proposes a structured dry-run, the user sees a diff, and only a signed confirmation with an idempotency key executes it.',
    whenToUse: 'Any agent or copilot that can create, change or delete data.',
    how: [
      'Tool calls constrained to a JSON Schema; mutating tools have a dry_run mode returning a diff.',
      'Render the diff as a card; the confirmation event is signed and bound to the plan hash.',
      'Execute with an idempotency key; retries and double-clicks are no-ops.',
      'Use a saga with compensating actions for multi-step plans.',
    ],
    language: 'python',
    code: `plan = agent.propose(goal)                                   # structured, schema-validated
diff = tools.dry_run(plan)                                   # no side effects
conf = ui.confirm(diff)                                      # signed over hash(plan)
if verify(conf, plan.hash): tools.execute(plan, idempotency_key=conf.nonce)`,
    pitfalls: ['Executing on the model\'s say-so with no preview turns every prompt injection into a write.'],
  },
  {
    id: 'obo-token-exchange',
    title: 'On-behalf-of token exchange',
    summary:
      'Pass the user\'s short-lived token (RFC 8693 exchange) through the agent to product APIs so the agent never holds more authority than the user.',
    whenToUse: 'Copilots and agents that call internal APIs on a user\'s behalf.',
    how: [
      'Exchange the user\'s OIDC token for a narrowly scoped, short-lived token for the agent run.',
      'Every tool call carries that token; the product API enforces tenant isolation and row-level security.',
      'Never give the agent a service or super-admin credential.',
      'Log token subject and actor separately for audit.',
    ],
    language: 'text',
    code: `POST /oauth/token
grant_type=urn:ietf:params:oauth:grant-type:token-exchange
subject_token=<user JWT>  scope=projects:write  audience=product-api  requested_token_type=access_token
-> 5 minute token, sub=user, act=copilot-agent`,
    pitfalls: ['A shared admin token makes a jailbroken agent a tenant-isolation bypass.'],
  },
  {
    id: 'spotlighting-policy-engine',
    title: 'Spotlighting and a deterministic outbound policy engine',
    summary:
      'Treat all retrieved and tool content as untrusted data, mark it, and enforce a rule engine on every outbound tool call so an injection cannot exfiltrate.',
    whenToUse: 'Any LLM application that reads untrusted text (documents, web, email, tool output).',
    how: [
      'Wrap untrusted content in randomised delimiters or datamark it so the model can distinguish data from instructions.',
      'A classifier on the ingress path catches known attacks; do not rely on it alone.',
      'A deterministic policy engine checks every outbound call: allowed tools, argument allow-lists, no markdown image or link exfiltration, egress domain allow-list.',
      'Privilege separation: the model that reads untrusted text has no write tools.',
    ],
    language: 'python',
    code: `ctx = spotlight(untrusted_chunks, delimiter=secrets.token_hex(8))
call = llm.plan(ctx)
policy.check(call, allowed_tools=ALLOW, arg_schema=SCHEMAS, egress=EGRESS_ALLOWLIST)  # raises on violation`,
    pitfalls: ['A classifier alone is bypassed by encodings, suffix attacks and multi-turn setups.'],
  },
  {
    id: 'model-registry-promotion-gates',
    title: 'Model registry with evidence-gated promotion',
    summary:
      'Every model version is an immutable, signed registry entry with its data snapshot, code commit, metrics and approvals; promotion between stages is a gate that needs evidence, not a button.',
    whenToUse: 'Any model that reaches production. The registry is the single source of truth for what is running and why.',
    how: [
      'Register (model artifact digest, training-data snapshot id, code commit, environment lock, metrics, model card) as one immutable version; sign the artifact.',
      'Stages are None -> Staging -> Shadow -> Canary -> Production -> Archived; each transition checks automated gates (offline metrics vs champion, slice floors, latency and memory budget, bias and robustness suite).',
      'Risk-tiered approvals: low tier auto-promotes on green gates, high and critical tiers also need a named independent validator and a risk owner.',
      'Write every transition (who, when, which evidence bundle) to an append-only audit log; the serving layer only loads versions whose signature and stage verify.',
    ],
    language: 'yaml',
    code: `promotion:
  staging_to_shadow:  { require: [offline_beats_champion, slice_floors_pass, latency_budget_pass] }
  shadow_to_canary:   { require: [shadow_7d_agreement>=0.97, no_guardrail_breach, cost_per_1k<=1.2x] }
  canary_to_prod:     { require: [canary_24h_slo_ok], approvals: [model_owner, independent_validator] }
  rollback_to:        previous_production   # always one click, always rehearsed`,
    pitfalls: [
      'A registry that stores artifacts but not the data snapshot cannot reproduce or audit a model.',
      'Approvals by the same person who trained the model are not independent validation.',
    ],
  },
  {
    id: 'drift-triggered-retraining',
    title: 'Drift monitoring and champion/challenger retraining',
    summary:
      'Separate data drift, prediction drift and concept drift, alert on the right one, and retrain only on matured labels with a champion/challenger gate and a rehearsed rollback.',
    whenToUse: 'Every deployed model whose inputs or world change. Retrain on evidence, not on a calendar alone.',
    how: [
      'Monitor feature drift (PSI / KS per feature against the training reference), prediction drift (score distribution) and, once labels mature, quality (PR-AUC, calibration) per slice.',
      'Feature or score drift without a quality drop is an investigation, not a retrain; a quality drop on matured labels triggers a challenger run.',
      'Retrain on a time-forward window that excludes immature labels; compare challenger with champion on the same frozen holdout and a shadow window.',
      'Keep the previous champion warm for rollback and record the trigger, data window and decision in the registry.',
    ],
    language: 'yaml',
    code: `triggers:
  - { signal: psi_top_feature, threshold: 0.2, action: open_investigation }
  - { signal: pr_auc_matured_7d, threshold: -0.03, action: train_challenger }
  - { signal: calendar,          threshold: 30d,   action: train_challenger }
gate: { champion_vs_challenger: "challenger >= champion on every protected slice", shadow_days: 7 }
rollback: { to: previous_champion, when: [ "guardrail_breach", "slo_breach_30m" ] }`,
    pitfalls: [
      'Retraining on every drift alert chases noise and trains on immature labels.',
      'Without a random holdout the retrain learns from the previous model\'s own decisions.',
    ],
  },
  {
    id: 'data-contract-quality-sla',
    title: 'Data contract with a quality SLA',
    summary:
      'A versioned, machine-checked agreement between a data producer and its consumers: schema, semantics, freshness, quality thresholds, ownership and what happens on breach.',
    whenToUse: 'Every input dataset a model or feature depends on, especially those owned by another team or a vendor.',
    how: [
      'Publish schema (Avro/Protobuf/JSON Schema) in a registry with backward-compatible evolution; breaking changes need a new major version and a migration window.',
      'State semantics and units, the system of record, the owner and on-call, and the quality expectations (completeness, validity, uniqueness, freshness) as testable assertions.',
      'Enforce in CI for the producer and at ingestion for the consumer; failing rows go to a quarantine table with a reason, never silently dropped.',
      'Define breach handling: alert the owner, hold the pipeline or serve stale-with-flag, and record the incident against the contract.',
    ],
    language: 'yaml',
    code: `contract: orders.v2
owner: payments-data@bank   system_of_record: core-ledger
schema: { registry: schema-registry, compatibility: BACKWARD_TRANSITIVE }
sla: { freshness_p95: 60s, completeness: ">=99.5%", duplicates: "<0.01%", null_rate: { customer_id: 0 } }
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }`,
    pitfalls: [
      'A contract nobody enforces is documentation; wire it into CI and ingestion.',
      'Freshness measured at the producer hides delay introduced by the pipeline; measure at the consumer.',
    ],
  },
];

export const PRIMITIVE_BY_ID: Record<string, Primitive> = Object.fromEntries(PRIMITIVES.map((p) => [p.id, p]));
export const PRIMITIVE_IDS = PRIMITIVES.map((p) => p.id);
