# Notification Send-Time & Frequency Optimisation: data and feature specification

> Generated from the blueprint `retail/send-time-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Notification Send-Time & Frequency Optimisation · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Notification Send-Time & Frequency Optimisation": Choose when and how often to send push, email and SMS per user to maximise engagement without driving opt-outs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising opens inflated by privacy-proxy pre-fetch.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Hourly engagement profile | per-user open probability by hour with shrinkage | Timing | Windowed history before the send |   |   |   |
| Fatigue state | messages in last 7 days and recent ignores | Saturation | Rolling count excl. current send |   |   |   |
| Opt-out hazard | modelled probability of unsubscribe | Cost term | Calibrated per channel |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Long-term | Value of future engagement including opt-out risk | Open rate of the next message | Maximising opens drives fatigue and unsubscribes |
| Exploration | Randomised time slots with bandit exploration | Fixed per-user best hour from history | History only contains previously chosen times |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Device type | weak |
| Account age | confounded with fatigue |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Hourly engagement profile inputs | Catalogue operations | Product information management (PIM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: windowed history before the send. |
| Fatigue state inputs | E-commerce engineering | Order management system (OMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: rolling count excl. current send. |
| Opt-out hazard inputs | Customer analytics | Customer data platform (CDP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: calibrated per channel. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: send_time_optimization_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: hourly_engagement_profile, type: double, nullable: false }
    - { name: fatigue_state, type: double, nullable: false }
    - { name: opt_out_hazard, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Hourly engagement profile and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Fatigue state against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Hourly engagement profile, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE send_time_optimization_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE send_time_optimization_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES send_time_optimization_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE send_time_optimization_assignments (
  plan_id TEXT NOT NULL REFERENCES send_time_optimization_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE send_time_optimization_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Notification Send-Time & Frequency Optimisation": Choose when and how often to send push, email and SMS per user to maximise engagement without driving opt-outs. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Sessions, anonymity and privacy | A session is a sequence of actions by one visitor, usually split by 30 minutes of inactivity. Many visitors are anonymous or have declined tracking, so the system may only use what happened in this visit and aggregated behaviour of others, not a stored profile. | The model must work from a few clicks, and the way sessions are cut decides what a sequence even is. |
| Intent and the funnel | Shoppers move from browsing to comparing to buying: product views, add-to-cart, checkout and purchase. What is useful changes along the way: alternatives when someone is still choosing, accessories and complements once something is in the cart. | A good next item for a browsing shopper is a bad one for someone about to pay. Decide which stage each placement serves. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Hourly engagement profile | Per-user open probability by hour with shrinkage. Timing. | Leakage risk to design against: Windowed history before the send. |
| A signal-versus-noise trap in this use case: Long-term | The true signal is value of future engagement including opt-out risk; the common noise is open rate of the next message. | Maximising opens drives fatigue and unsubscribes. |

**Ask the experts**

- [ ] What exactly does "Quiet hours and regulation" mean in practice for notification send-time & frequency optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Hourly engagement profile" and "Fatigue state", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Engaged sessions per message" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: optimising opens inflated by privacy-proxy pre-fetch, and who can confirm the cut-off times and splits?
- [ ] How often does "Time-zone change when travelling" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Leave-last-out | Evaluation that hides each session's final item and asks the model to predict it from the rest. |
| Session | A visit: an ordered sequence of one visitor's actions, ended by inactivity or leaving. |
| Catalogue | The set of items the shop sells, with attributes, prices and stock. |
| Impression / click | An impression is a recommendation being shown; a click is the shopper choosing it. |
| Add-to-cart / conversion | Adding an item to the basket, and completing a purchase; the later funnel stages. |
| Co-visitation | Counting how often two items are viewed in the same session, the basis of item-to-item recommenders. |
| Item-to-item | Recommending items related to the item the shopper is currently looking at. |
| Substitute / complement | An alternative to the current item, versus an item bought together with it. |
| Cold start | A new item or visitor with no history to learn from. |
| Popularity bias | The tendency of recommenders to push already-popular items, starving the long tail. |
| Thompson sampling / UCB | Bandit methods that explore in proportion to uncertainty. |
| Policy | The rule that maps a situation to an action. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
| Regret | The reward lost by not always choosing the best action. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Lag feature | A past value of the series used as a predictor. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| p99 latency | The time within which 99% of requests complete. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
