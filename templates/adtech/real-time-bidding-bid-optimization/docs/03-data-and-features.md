# Real-Time Bidding Bid Optimisation: data and feature specification

> Generated from the blueprint `adtech/real-time-bidding-bid-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Real-Time Bidding Bid Optimisation · **Domain:** adtech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Real-Time Bidding Bid Optimisation": Compute the bid for every impression opportunity that maximises campaign value under budget and KPI constraints within the auction deadline. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training only on won impressions ignores the censored losing bids.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Calibrated pCVR | predicted conversion probability after isotonic calibration | Value estimate | Calibrate on delayed-feedback-corrected labels |   |   |   |
| Win-rate curve | win probability as a function of bid for the segment | Bid landscape | Censored data below the observed bids |   |   |   |
| Pacing multiplier | budget remaining relative to the ideal pacing curve | Spend control | Real-time state |   |   |   |
| Clearing-price density | survival regression on won and lost bids per exchange and segment | Shading target between the second-highest expected bid and the advertiser valuation | Lost bids are right-censored, so fitting on won bids only makes the price look too high |   |   |   |
| In-flight spend reserve | sum of submitted bids whose win notice (burl) has not arrived | Stops overspend during the notice delay | Counting only billed wins lets a traffic spike overspend the budget |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Calibration | Calibrated pCTR and pCVR used in the bid formula | Ranking-only models | Bid = value times probability so miscalibration directly loses money |
| Landscape | Model the win-price distribution per segment | Fixed bid multipliers | The market clearing price moves by hour and publisher |
| Pacing | Primal-dual or PID controller updating a per-campaign shadow-price multiplier every few seconds from live spend streams | Predicting pCTR and pCVR well while the budget burns out by mid-morning | An accurate bid on a campaign with no budget left is worth nothing and spend must follow the traffic curve |
| Auction type | First-price bid shading from a censored clearing-price model | Bidding true value in a first-price auction | You overpay by the whole gap between your value and the clearing price |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Raw user-agent string | high cardinality, sparse and unstable |
| Bid request ID | random identifier |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Calibrated pCVR inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: calibrate on delayed-feedback-corrected labels. |
| Win-rate curve inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: censored data below the observed bids. |
| Pacing multiplier inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: real-time state. |
| Clearing-price density inputs | Ad platform engineering | Campaign and budget ledger | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: lost bids are right-censored, so fitting on won bids only makes the price look too high. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: real_time_bidding_bid_optimization_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: calibrated_pcvr, type: double, nullable: false }
    - { name: win_rate_curve, type: double, nullable: false }
    - { name: pacing_multiplier, type: double, nullable: false }
sla:
  freshness_p95: 5 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Calibrated pCVR and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Win-rate curve against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 5 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Calibrated pCVR, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo AI Lab datasets | https://ailab.criteo.com/ressources/ | Research-use terms on the Criteo AI Lab page | Large click logs, uplift, attribution and counterfactual datasets from Criteo | Terabyte scale for some sets; research-use terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE real_time_bidding_bid_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  calibrated_pcvr                    DOUBLE PRECISION,
  win_rate_curve                     DOUBLE PRECISION,
  pacing_multiplier                  DOUBLE PRECISION,
  clearing_price_density             DOUBLE PRECISION,
  in_flight_spend_reserve            DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE real_time_bidding_bid_decisions (
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
CREATE TABLE real_time_bidding_bid_labels (
  decision_id    UUID        NOT NULL REFERENCES real_time_bidding_bid_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Real-Time Bidding Bid Optimisation": Compute the bid for every impression opportunity that maximises campaign value under budget and KPI constraints within the auction deadline. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Bidding, pacing and budgets | Advertisers set budgets and goals (clicks, installs, return on ad spend). Bidders convert value estimates into bids, shade bids in first-price auctions to avoid overpaying, and pace spend through the day so budgets last. Floors and reserve prices are the publisher's counterpart. | The model's value estimate is only one input; the bid strategy decides profit, and mistakes in pacing waste budget regardless of model quality. |
| Pricing models and expected value | Advertisers pay per thousand impressions (CPM), per click (CPC) or per action (CPA). To compare bids on a common scale the system converts everything to expected revenue per thousand impressions (eCPM): for a click-priced bid it is bid times predicted click probability times 1000. | The predicted probability is multiplied by money, so calibration matters as much as ranking. A score that ranks well but is 30% too high overcharges and over-delivers. |
| Click quality and invalid traffic | Not every click is a real, interested human. Bots, click farms, accidental taps and misleading creatives produce invalid traffic that inflates click rates and wastes advertiser budget, and industry bodies set standards for filtering it. Very short dwell time after a click is a common signal. | Training on junk clicks teaches the model to reward what causes mistakes, and advertisers punish platforms that bill for them. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Calibrated pCVR | Predicted conversion probability after isotonic calibration. Value estimate. | Leakage risk to design against: Calibrate on delayed-feedback-corrected labels. |
| A signal-versus-noise trap in this use case: Calibration | The true signal is calibrated pCTR and pCVR used in the bid formula; the common noise is ranking-only models. | Bid = value times probability so miscalibration directly loses money. |

**Ask the experts**

- [ ] What exactly does "Response under 8 ms of a 100 ms exchange timeout" mean in practice for real-time bidding bid optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Calibrated pCVR" and "Win-rate curve", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Cost per acquisition" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training only on won impressions ignores the censored losing bids, and who can confirm the cut-off times and splits?
- [ ] How often does "Exchange changes auction type from second to first price" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| First-price / second-price auction | Auction rules in which the winner pays their own bid or just above the runner-up's bid. |
| Ad exchange | A marketplace that connects sellers and buyers and runs the auction. |
| OpenRTB | A widely used protocol for bid requests and responses, which includes a maximum response time. |
| Floor price | The lowest price a publisher will accept for an impression. |
| Pacing | Spreading an advertiser's budget over the day so it is neither spent in minutes nor left unspent. |
| Invalid traffic (IVT) | Clicks and impressions from bots or accidental taps that should not be billed. |
| Log loss | The negative log-likelihood of the observed clicks under the predicted probabilities, the standard training loss. |
| Calibration | Predicted probabilities matching observed frequencies, so that ads scored at 3% really are clicked about 3% of the time. |
| Feature hashing | Mapping categorical values to a fixed-size vector with a hash function, so memory stays flat however many ids exist. |
| Bid shading | Bidding below one's true value in a first-price auction to keep profit. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Off-policy evaluation (OPE) | Estimating how a new policy would perform from data logged under another policy. |
| Propensity | The probability with which the logging policy chose the logged action. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
