# First-Price Auction Bid Shading: data and feature specification

> Generated from the blueprint `adtech/first-price-bid-shading` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** First-Price Auction Bid Shading · **Domain:** adtech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "First-Price Auction Bid Shading": Shade bids below private value in first-price auctions to retain surplus while preserving win rate. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on win prices only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Predicted clearing price | distribution quantiles of the market price | Shading | Exchange feedback |   |   |   |
| Value estimate | expected impression value | Upper bound | Calibrated |   |   |   |
| Competition intensity | recent win rate at multipliers | Aggressiveness | Windowed |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Censoring | Estimate the win-price distribution with censored regression | Regress on winning prices only | Winners-only data biases the landscape low |
| Segmentation | Segment-specific shading functions | One global shading factor | Competition differs by publisher and placement |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Bid request ID | none |
| Page URL query strings | high-cardinality |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Predicted clearing price inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: exchange feedback. |
| Value estimate inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: calibrated. |
| Competition intensity inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: windowed. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: first_price_bid_shading_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: predicted_clearing_price, type: double, nullable: false }
    - { name: value_estimate, type: double, nullable: false }
    - { name: competition_intensity, type: double, nullable: false }
sla:
  freshness_p95: 5 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Predicted clearing price and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Value estimate against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 5 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Predicted clearing price, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo AI Lab datasets | https://ailab.criteo.com/ressources/ | Research-use terms on the Criteo AI Lab page | Large click logs, uplift, attribution and counterfactual datasets from Criteo | Terabyte scale for some sets; research-use terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE first_price_bid_shading_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  predicted_clearing_price           DOUBLE PRECISION,
  value_estimate                     DOUBLE PRECISION,
  competition_intensity              DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE first_price_bid_shading_decisions (
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
CREATE TABLE first_price_bid_shading_labels (
  decision_id    UUID        NOT NULL REFERENCES first_price_bid_shading_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "First-Price Auction Bid Shading": Shade bids below private value in first-price auctions to retain surplus while preserving win rate. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Bidding, pacing and budgets | Advertisers set budgets and goals (clicks, installs, return on ad spend). Bidders convert value estimates into bids, shade bids in first-price auctions to avoid overpaying, and pace spend through the day so budgets last. Floors and reserve prices are the publisher's counterpart. | The model's value estimate is only one input; the bid strategy decides profit, and mistakes in pacing waste budget regardless of model quality. |
| Feedback loops and exploration | You only observe clicks for ads that were shown, and the ranker decides what is shown. A new ad that is never shown never gets a click rate. Systems therefore keep a small exploration budget and a randomised slice that provides unbiased data. | Without exploration, new creatives are starved and offline evaluation rewards the incumbent ranker. |
| Pricing models and expected value | Advertisers pay per thousand impressions (CPM), per click (CPC) or per action (CPA). To compare bids on a common scale the system converts everything to expected revenue per thousand impressions (eCPM): for a click-priced bid it is bid times predicted click probability times 1000. | The predicted probability is multiplied by money, so calibration matters as much as ranking. A score that ranks well but is 30% too high overcharges and over-delivers. |
| Learning from logs: off-policy evaluation | Most business data were generated by an earlier policy. To judge a new policy offline you need the probability with which each logged action was chosen; estimators such as inverse propensity weighting, self-normalised weighting and doubly robust methods correct for the difference, with a bias-variance trade-off. | Never evaluate a new policy only on the rows where it agrees with the old one; log propensities from day one. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Predicted clearing price | Distribution quantiles of the market price. Shading. | Leakage risk to design against: Exchange feedback. |
| A signal-versus-noise trap in this use case: Censoring | The true signal is estimate the win-price distribution with censored regression; the common noise is regress on winning prices only. | Winners-only data biases the landscape low. |

**Ask the experts**

- [ ] What exactly does "Per-request latency under 1 ms" mean in practice for first-price auction bid shading: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Predicted clearing price" and "Value estimate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Cost per won impression at equal win rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on win prices only, and who can confirm the cut-off times and splits?
- [ ] How often does "Exchange hides losing bid information" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| First-price / second-price auction | Auction rules in which the winner pays their own bid or just above the runner-up's bid. |
| Floor price | The lowest price a publisher will accept for an impression. |
| Bid shading | Bidding below one's true value in a first-price auction to keep profit. |
| Ad exchange | A marketplace that connects sellers and buyers and runs the auction. |
| OpenRTB | A widely used protocol for bid requests and responses, which includes a maximum response time. |
| Placement | The slot where an ad appears, such as feed, sidebar or banner; position is the rank within it. |
| Log loss | The negative log-likelihood of the observed clicks under the predicted probabilities, the standard training loss. |
| Reserve price | The minimum price at which a publisher will sell an impression. |
| Impression | One instance of an ad being shown to a user; the denominator of click-through rate. |
| CTR | Click-through rate: clicks divided by impressions, typically a few percent or much less. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Regret | The reward lost by not always choosing the best action. |
| Exploration / exploitation | Trying new actions to learn versus using the best known one. |
| Thompson sampling / UCB | Bandit methods that explore in proportion to uncertainty. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Distribution shift | A change in the data a model sees compared with training. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
