# Campaign Budget Pacing: data and feature specification

> Generated from the blueprint `adtech/budget-pacing-controller` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Campaign Budget Pacing · **Domain:** adtech · **Latency tier:** sub-10ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Campaign Budget Pacing": Spread campaign spend smoothly over the flight so budgets neither exhaust early nor underdeliver, adapting to traffic fluctuations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Testing controllers on smooth traffic only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Spend error vs target curve | actual minus ideal cumulative spend | Control signal | Distributed counters lag |   |   |   |
| Traffic forecast | expected requests per minute | Planning | Forecast quality |   |   |   |
| Win-rate response | change in win rate to bid multiplier | Controller gain | Estimated online |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Control | Feedback controller on forecast traffic | Fixed daily caps | Traffic is non-stationary and caps run out in the morning |
| Quality | Pace toward high-value impressions | Uniform throttling | Uniform throttling wastes budget on low-value traffic |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Campaign name | none |
| Advertiser tenure | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Spend error vs target curve inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: distributed counters lag. |
| Traffic forecast inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: forecast quality. |
| Win-rate response inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: estimated online. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: budget_pacing_controller_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: spend_error_vs_target_curve, type: double, nullable: false }
    - { name: traffic_forecast, type: double, nullable: false }
    - { name: win_rate_response, type: double, nullable: false }
sla:
  freshness_p95: 5 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Spend error vs target curve and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Traffic forecast against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 5 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Spend error vs target curve, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Azure Public Dataset | https://github.com/Azure/AzurePublicDataset | CC BY 4.0 (see the repository) | Anonymised VM, workload and resource utilisation traces from Azure | One cloud and period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon Last Mile Routing Research Challenge | https://registry.opendata.aws/amazon-last-mile-challenges/ | CDLA-Sharing 1.0 (see the registry page) | Real delivery routes with stop sequences and driver behaviour for routing research | US urban routes in 2018; routes only, no demand. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE budget_pacing_controller_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  spend_error_vs_target_curve        DOUBLE PRECISION,
  traffic_forecast                   DOUBLE PRECISION,
  win_rate_response                  DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE budget_pacing_controller_decisions (
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
CREATE TABLE budget_pacing_controller_labels (
  decision_id    UUID        NOT NULL REFERENCES budget_pacing_controller_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Campaign Budget Pacing": Spread campaign spend smoothly over the flight so budgets neither exhaust early nor underdeliver, adapting to traffic fluctuations. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Bidding, pacing and budgets | Advertisers set budgets and goals (clicks, installs, return on ad spend). Bidders convert value estimates into bids, shade bids in first-price auctions to avoid overpaying, and pace spend through the day so budgets last. Floors and reserve prices are the publisher's counterpart. | The model's value estimate is only one input; the bid strategy decides profit, and mistakes in pacing waste budget regardless of model quality. |
| Click quality and invalid traffic | Not every click is a real, interested human. Bots, click farms, accidental taps and misleading creatives produce invalid traffic that inflates click rates and wastes advertiser budget, and industry bodies set standards for filtering it. Very short dwell time after a click is a common signal. | Training on junk clicks teaches the model to reward what causes mistakes, and advertisers punish platforms that bill for them. |
| Forecasting inventory and spend | Publishers forecast available impressions for guaranteed deals; advertisers forecast spend and returns across channels; delivery systems must neither over- nor under-deliver. Seasonality, events and policy changes dominate. | Guaranteed contracts create penalties for under-delivery, so forecasts are used at conservative quantiles. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Spend error vs target curve | Actual minus ideal cumulative spend. Control signal. | Leakage risk to design against: Distributed counters lag. |
| A signal-versus-noise trap in this use case: Control | The true signal is feedback controller on forecast traffic; the common noise is fixed daily caps. | Traffic is non-stationary and caps run out in the morning. |

**Ask the experts**

- [ ] What exactly does "Overspend tolerance under 1%" mean in practice for campaign budget pacing: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Spend error vs target curve" and "Traffic forecast", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Budget utilisation" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: testing controllers on smooth traffic only, and who can confirm the cut-off times and splits?
- [ ] How often does "Counter lag across data centres allows overspend" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Pacing | Spreading an advertiser's budget over the day so it is neither spent in minutes nor left unspent. |
| Throttling | Dropping or ignoring a share of bid requests to stay within capacity or budget. |
| Invalid traffic (IVT) | Clicks and impressions from bots or accidental taps that should not be billed. |
| ROAS | Return on ad spend: revenue generated per currency unit of advertising. |
| Impression | One instance of an ad being shown to a user; the denominator of click-through rate. |
| CTR | Click-through rate: clicks divided by impressions, typically a few percent or much less. |
| CPM / CPC / CPA | Pricing per thousand impressions, per click or per action such as a purchase or install. |
| eCPM | Effective cost per mille: expected revenue per thousand impressions, used to rank bids of different pricing types. |
| RTB | Real-time bidding: ads sold one impression at a time in an auction that runs while the page loads. |
| SSP | Supply-side platform, the system publishers use to sell their ad space. |
| Policy | The rule that maps a situation to an action. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Forecast horizon | How many steps ahead a forecast looks. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Hierarchical forecasting | Forecasting at several levels (item, category, total) that must add up. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| p99 latency | The time within which 99% of requests complete. |
| Distribution shift | A change in the data a model sees compared with training. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
