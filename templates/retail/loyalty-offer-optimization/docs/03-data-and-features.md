# Loyalty Programme Offer Optimisation: data and feature specification

> Generated from the blueprint `retail/loyalty-offer-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Loyalty Programme Offer Optimisation · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Loyalty Programme Offer Optimisation": Choose personalised points, tier and reward offers that raise lifetime value subject to a programme cost budget. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Logged data lacks randomisation.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Reward elasticity | spend response to reward intensity | Optimisation input | Randomised test cells |   |   |   |
| Tier proximity | gap to next tier threshold | Motivation | Rolling spend as-of |   |   |   |
| Breakage propensity | probability points expire unused | Liability | Historic expiry rates |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Incrementality | Incremental spend from the offer | Redemption rate | Redeemers were mostly going to buy anyway |
| Long horizon | Customer lifetime value in the reward objective | One-purchase ROI | Short-term ROI misses habit formation |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Number of offers received | exposure artefact |
| Email domain | unrelated |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Reward elasticity inputs | Catalogue operations | Product information management (PIM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: randomised test cells. |
| Tier proximity inputs | E-commerce engineering | Order management system (OMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: rolling spend as-of. |
| Breakage propensity inputs | Customer analytics | Customer data platform (CDP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: historic expiry rates. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: loyalty_offer_optimization_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: reward_elasticity, type: double, nullable: false }
    - { name: tier_proximity, type: double, nullable: false }
    - { name: breakage_propensity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Reward elasticity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Tier proximity against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Reward elasticity, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE loyalty_offer_optimization_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE loyalty_offer_optimization_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES loyalty_offer_optimization_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE loyalty_offer_optimization_assignments (
  plan_id TEXT NOT NULL REFERENCES loyalty_offer_optimization_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE loyalty_offer_optimization_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Loyalty Programme Offer Optimisation": Choose personalised points, tier and reward offers that raise lifetime value subject to a programme cost budget. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Customers, lifetime value and churn | Retailers segment customers by recency, frequency and monetary value, estimate lifetime value, and try to predict who will lapse or repurchase. Marketing spend should go where it changes behaviour (uplift), not where customers would buy anyway. | Offers cost margin; a model that targets likely buyers rather than persuadable ones wastes discounts. |
| Offline metrics versus business outcomes | Offline ranking metrics (hit rate, MRR, NDCG) measure whether the held-out next item was ranked high. The business cares about click-through on the strip, add-to-cart and revenue per visit, plus catalogue coverage so that long-tail sellers get exposure. Recommendations also obey merchandising rules: stock, margin, brand and sponsored items. | A model can improve MRR while concentrating on a few popular items. Track coverage and run online tests. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Implicit feedback, exposure and bias | Clicks and purchases are implicit feedback: only shown items can be clicked, higher positions get more attention and popular items are shown more. Logs therefore reflect the old system as much as user taste; corrections include position features, propensity weighting, exploration and randomised data. | Training and evaluating on logs of the incumbent ranker rewards imitating it. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Reward elasticity | Spend response to reward intensity. Optimisation input. | Leakage risk to design against: Randomised test cells. |
| A signal-versus-noise trap in this use case: Incrementality | The true signal is incremental spend from the offer; the common noise is redemption rate. | Redeemers were mostly going to buy anyway. |

**Ask the experts**

- [ ] What exactly does "Programme liability accounting" mean in practice for loyalty programme offer optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Reward elasticity" and "Tier proximity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Incremental margin per programme dollar" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: logged data lacks randomisation, and who can confirm the cut-off times and splits?
- [ ] How often does "Points liability spikes" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Loyalty programme | A scheme that rewards repeat purchases with points or offers. |
| Customer lifetime value (CLV) | The total value a customer is expected to bring over their relationship with the retailer. |
| RFM | Recency, frequency and monetary value: three measures used to segment customers. |
| Uplift | The additional outcome caused by a treatment such as a coupon, compared with doing nothing. |
| Leave-last-out | Evaluation that hides each session's final item and asks the model to predict it from the rest. |
| Elasticity | How much demand changes for a given change in price. |
| Reward | The number the system tries to maximise over time. |
| Policy | The rule that maps a situation to an action. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Inverse propensity weighting | Weighting logged examples by the inverse of how likely they were to be shown, to correct exposure bias. |
| Multi-armed bandit | A decision setting that balances trying options to learn and using the best known option. |
| Counterfactual evaluation | Estimating how a new policy would have performed from logs of a different policy. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Markov decision process | A mathematical model of sequential decisions with states, actions, rewards and transitions. |
