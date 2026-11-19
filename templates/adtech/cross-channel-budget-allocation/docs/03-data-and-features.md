# Cross-Channel Budget Allocation with Bandits: data and feature specification

> Generated from the blueprint `adtech/cross-channel-budget-allocation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cross-Channel Budget Allocation with Bandits · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Cross-Channel Budget Allocation with Bandits": Shift weekly budget between channels using experimentation-informed bandit policies to maximise incremental outcomes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using platform-reported conversions as rewards.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Channel incremental ROAS | experiment-based | True return | Experiments |   |   |   |
| Posterior uncertainty | variance of ROAS | Exploration | Bayesian |   |   |   |
| Platform-claimed vs incremental ratio | inflation factor | Calibration | Tests |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Signal | Incremental returns from experiments | Platform-reported conversions | Platforms over-claim conversions |
| Safety | Constrained exploration | Unconstrained reallocation | Aggressive shifts break channel performance |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Channel name | none |
| Platform dashboard totals | biased |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Channel incremental ROAS inputs | Ad platform engineering | Campaign and budget ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: experiments. |
| Posterior uncertainty inputs | Measurement science | Billing and invoicing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: bayesian. |
| Platform-claimed vs incremental ratio inputs | Privacy engineering | Identity graph and consent store (CMP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: tests. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: cross_channel_budget_allocation_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: channel_incremental_roas, type: double, nullable: false }
    - { name: posterior_uncertainty, type: double, nullable: false }
    - { name: platform_claimed_vs_incremental_ratio, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Channel incremental ROAS and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Posterior uncertainty against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Channel incremental ROAS, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE cross_channel_budget_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE cross_channel_budget_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES cross_channel_budget_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE cross_channel_budget_assignments (
  plan_id TEXT NOT NULL REFERENCES cross_channel_budget_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE cross_channel_budget_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Cross-Channel Budget Allocation with Bandits": Shift weekly budget between channels using experimentation-informed bandit policies to maximise incremental outcomes. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Measurement, attribution and incrementality | Which ads caused a conversion? Last-click credits whoever came last, multi-touch attribution shares credit along a path, media mix models use aggregate spend and outcomes, and experiments (geo tests, holdouts) measure true incremental lift. Privacy limits individual-level tracking. | Correlation between ad exposure and purchase is not causation; targeting people who would have bought anyway inflates apparent performance. |
| Forecasting inventory and spend | Publishers forecast available impressions for guaranteed deals; advertisers forecast spend and returns across channels; delivery systems must neither over- nor under-deliver. Seasonality, events and policy changes dominate. | Guaranteed contracts create penalties for under-delivery, so forecasts are used at conservative quantiles. |
| Bidding, pacing and budgets | Advertisers set budgets and goals (clicks, installs, return on ad spend). Bidders convert value estimates into bids, shade bids in first-price auctions to avoid overpaying, and pace spend through the day so budgets last. Floors and reserve prices are the publisher's counterpart. | The model's value estimate is only one input; the bid strategy decides profit, and mistakes in pacing waste budget regardless of model quality. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Channel incremental ROAS | Experiment-based. True return. | Leakage risk to design against: Experiments. |
| A signal-versus-noise trap in this use case: Signal | The true signal is incremental returns from experiments; the common noise is platform-reported conversions. | Platforms over-claim conversions. |

**Ask the experts**

- [ ] What exactly does "Channel minimums" mean in practice for cross-channel budget allocation with bandits: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Channel incremental ROAS" and "Posterior uncertainty", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Incremental conversions at constant spend" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using platform-reported conversions as rewards, and who can confirm the cut-off times and splits?
- [ ] How often does "Measurement lag hides negative effect of a shift" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Media mix model (MMM) | A statistical model of sales as a function of channel spend, seasonality and controls. |
| ROAS | Return on ad spend: revenue generated per currency unit of advertising. |
| Saturation curve | The diminishing return from additional spend in a channel. |
| Incrementality | The extra outcome that exists because of advertising, compared with what would have happened anyway. |
| Geo experiment | A test that varies advertising across regions to measure lift without user-level tracking. |
| Synthetic control | A weighted blend of untreated regions that mimics a treated region before the test. |
| Normalised cross-entropy (NE) | Log loss divided by the log loss of always predicting the average click rate; below 1 means better than the base rate. |
| Regret | The reward lost by not always choosing the best action. |
| Thompson sampling / UCB | Bandit methods that explore in proportion to uncertainty. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Reward | The number the system tries to maximise over time. |
| Guardrail metric | A metric that must not get worse when optimising the main objective. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| p99 latency | The time within which 99% of requests complete. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
