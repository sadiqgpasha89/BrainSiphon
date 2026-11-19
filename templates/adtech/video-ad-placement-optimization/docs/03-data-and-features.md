# Video Ad Placement & Pod Optimisation: data and feature specification

> Generated from the blueprint `adtech/video-ad-placement-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Video Ad Placement & Pod Optimisation · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Video Ad Placement & Pod Optimisation": Choose ad slots, pod length and creatives in streaming video to maximise revenue and completion while limiting viewer abandonment. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Observational ad loads confounded with content.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Viewer abandonment hazard | probability to drop at ad break | Cost | History |   |   |   |
| Content break-point score | scene-boundary detector | Placement | Model |   |   |   |
| Predicted ad completion | completion probability by creative | Value | Prior |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Cost | Model viewer abandonment cost of ad breaks | Maximise ad count | Too many ads reduce retention more than they earn |
| Timing | Natural break points in content | Fixed intervals | Mid-scene breaks annoy viewers |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Ad ID | none |
| Player version | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Viewer abandonment hazard inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: history. |
| Content break-point score inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: model. |
| Predicted ad completion inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: prior. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: video_ad_placement_optimization_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: viewer_abandonment_hazard, type: double, nullable: false }
    - { name: content_break_point_score, type: double, nullable: false }
    - { name: predicted_ad_completion, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Viewer abandonment hazard and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Content break-point score against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Viewer abandonment hazard, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE video_ad_placement_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  viewer_abandonment_hazard          DOUBLE PRECISION,
  content_break_point_score          DOUBLE PRECISION,
  predicted_ad_completion            DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE video_ad_placement_decisions (
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
CREATE TABLE video_ad_placement_labels (
  decision_id    UUID        NOT NULL REFERENCES video_ad_placement_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Video Ad Placement & Pod Optimisation": Choose ad slots, pod length and creatives in streaming video to maximise revenue and completion while limiting viewer abandonment. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Position, placement and context | The same ad gets very different click rates depending on where it appears (top of the feed versus a sidebar), on the device and on the time of day. Users also look at higher positions more, so observed click rates mix the quality of an ad with how visible it was. | Logs ranked by an old model teach a new model the old ranking unless position is handled explicitly. |
| Creative, brand safety and ad quality | The ad itself (image, video, copy) affects performance, and unsafe or non-compliant placements harm brands. Generative tools produce variants, and moderation checks copy against policy and context. | Optimising click rate alone rewards clickbait; guardrails for quality, compliance and brand suitability are part of the objective. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Viewer abandonment hazard | Probability to drop at ad break. Cost. | Leakage risk to design against: History. |
| A signal-versus-noise trap in this use case: Cost | The true signal is model viewer abandonment cost of ad breaks; the common noise is maximise ad count. | Too many ads reduce retention more than they earn. |

**Ask the experts**

- [ ] What exactly does "Latency before playback" mean in practice for video ad placement & pod optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Viewer abandonment hazard" and "Content break-point score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Revenue per viewing hour" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: observational ad loads confounded with content, and who can confirm the cut-off times and splits?
- [ ] How often does "Live sports where breaks are unpredictable" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Placement | The slot where an ad appears, such as feed, sidebar or banner; position is the rank within it. |
| Calibration | Predicted probabilities matching observed frequencies, so that ads scored at 3% really are clicked about 3% of the time. |
| Feature hashing | Mapping categorical values to a fixed-size vector with a hash function, so memory stays flat however many ids exist. |
| Attention metrics | Measures of how long and how much people look at an ad. |
| CTV | Connected TV: streaming video on internet-connected television sets. |
| Policy | The rule that maps a situation to an action. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Discount factor | How much a future reward is worth compared with the same reward now. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
