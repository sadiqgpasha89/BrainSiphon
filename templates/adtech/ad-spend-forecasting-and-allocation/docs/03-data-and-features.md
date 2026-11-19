# Ad Spend Forecasting & Budget Allocation: data and feature specification

> Generated from the blueprint `adtech/ad-spend-forecasting-and-allocation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ad Spend Forecasting & Budget Allocation · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Ad Spend Forecasting & Budget Allocation": Forecast spend and outcomes by campaign and allocate budgets across campaigns to maximise return under constraints. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Observational curves confounded by bidding changes.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Marginal ROI | derivative of response curve | Allocation | Estimation |   |   |   |
| Saturation level | spend at which returns flatten | Cap | Curves |   |   |   |
| Pacing state | spend vs plan | Feasibility | Real-time |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Curves | Diminishing-returns response curves per campaign | Proportional allocation | Equal marginal returns is the optimum |
| Uncertainty | Allocate with uncertainty (Thompson sampling) | Plug-in estimates | Noisy curves misallocate budget |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Campaign ID | none |
| Owner | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Marginal ROI inputs | Ad platform engineering | Campaign and budget ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: estimation. |
| Saturation level inputs | Measurement science | Billing and invoicing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: curves. |
| Pacing state inputs | Privacy engineering | Identity graph and consent store (CMP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: real-time. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ad_spend_forecasting_and_allocation_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: marginal_roi, type: double, nullable: false }
    - { name: saturation_level, type: double, nullable: false }
    - { name: pacing_state, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Marginal ROI and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Saturation level against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Marginal ROI, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon Last Mile Routing Research Challenge | https://registry.opendata.aws/amazon-last-mile-challenges/ | CDLA-Sharing 1.0 (see the registry page) | Real delivery routes with stop sequences and driver behaviour for routing research | US urban routes in 2018; routes only, no demand. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE ad_spend_forecasting_and_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE ad_spend_forecasting_and_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES ad_spend_forecasting_and_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE ad_spend_forecasting_and_assignments (
  plan_id TEXT NOT NULL REFERENCES ad_spend_forecasting_and_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE ad_spend_forecasting_and_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Ad Spend Forecasting & Budget Allocation": Forecast spend and outcomes by campaign and allocate budgets across campaigns to maximise return under constraints. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Forecasting inventory and spend | Publishers forecast available impressions for guaranteed deals; advertisers forecast spend and returns across channels; delivery systems must neither over- nor under-deliver. Seasonality, events and policy changes dominate. | Guaranteed contracts create penalties for under-delivery, so forecasts are used at conservative quantiles. |
| Bidding, pacing and budgets | Advertisers set budgets and goals (clicks, installs, return on ad spend). Bidders convert value estimates into bids, shade bids in first-price auctions to avoid overpaying, and pace spend through the day so budgets last. Floors and reserve prices are the publisher's counterpart. | The model's value estimate is only one input; the bid strategy decides profit, and mistakes in pacing waste budget regardless of model quality. |
| Click quality and invalid traffic | Not every click is a real, interested human. Bots, click farms, accidental taps and misleading creatives produce invalid traffic that inflates click rates and wastes advertiser budget, and industry bodies set standards for filtering it. Very short dwell time after a click is a common signal. | Training on junk clicks teaches the model to reward what causes mistakes, and advertisers punish platforms that bill for them. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Marginal ROI | Derivative of response curve. Allocation. | Leakage risk to design against: Estimation. |
| A signal-versus-noise trap in this use case: Curves | The true signal is diminishing-returns response curves per campaign; the common noise is proportional allocation. | Equal marginal returns is the optimum. |

**Ask the experts**

- [ ] What exactly does "Minimum commitments" mean in practice for ad spend forecasting & budget allocation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Marginal ROI" and "Saturation level", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Total conversions at equal budget" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: observational curves confounded by bidding changes, and who can confirm the cut-off times and splits?
- [ ] How often does "Sparse data for new campaigns" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| ROAS | Return on ad spend: revenue generated per currency unit of advertising. |
| Media mix model (MMM) | A statistical model of sales as a function of channel spend, seasonality and controls. |
| Saturation curve | The diminishing return from additional spend in a channel. |
| Pacing | Spreading an advertiser's budget over the day so it is neither spent in minutes nor left unspent. |
| Invalid traffic (IVT) | Clicks and impressions from bots or accidental taps that should not be billed. |
| Guaranteed delivery | A deal in which the publisher promises a number of impressions to an advertiser. |
| Avails | Available ad impressions a publisher can sell in a period. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Thompson sampling / UCB | Bandit methods that explore in proportion to uncertainty. |
| p99 latency | The time within which 99% of requests complete. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
| Guardrail metric | A metric that must not get worse when optimising the main objective. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
