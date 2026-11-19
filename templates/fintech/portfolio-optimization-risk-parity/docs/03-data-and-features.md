# Robo-Advisor Portfolio Optimization: data and feature specification

> Generated from the blueprint `fintech/portfolio-optimization-risk-parity` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Robo-Advisor Portfolio Optimization · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Robo-Advisor Portfolio Optimization": Construct and rebalance goal-based portfolios for millions of retail users that stay within each user's risk tolerance while minimising taxes and costs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Backtest ignores taxes and transaction costs.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Shrunk covariance matrix | Ledoit-Wolf shrinkage on rolling returns | Stable risk estimate | Rolling window must not include rebalance date |   |   |   |
| Drift from target | L1 distance of current weights to target | Trade trigger | Use pre-trade market values |   |   |   |
| Tax-lot loss harvesting value | unrealised loss available net of wash-sale rules | After-tax alpha | Check wash-sale window across accounts |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Estimation | Shrinkage covariance and robust expected-return priors | Plugging sample mean and covariance into mean-variance | Estimation error makes the optimiser an error maximiser |
| Trading | Drift-threshold and tax-aware rebalancing | Calendar rebalancing everyone monthly | Needless trades erode returns and trigger taxes |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Recent 1-month returns | chasing performance increases risk |
| Forecast of next-day price | not forecastable at useful accuracy |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Shrunk covariance matrix inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: rolling window must not include rebalance date. |
| Drift from target inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use pre-trade market values. |
| Tax-lot loss harvesting value inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: check wash-sale window across accounts. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: portfolio_optimization_risk_parity_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: shrunk_covariance_matrix, type: double, nullable: false }
    - { name: drift_from_target, type: double, nullable: false }
    - { name: tax_lot_loss_harvesting_value, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Shrunk covariance matrix and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Drift from target against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Shrunk covariance matrix, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE portfolio_optimization_risk_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE portfolio_optimization_risk_outputs (
  run_id TEXT NOT NULL REFERENCES portfolio_optimization_risk_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE portfolio_optimization_risk_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE portfolio_optimization_risk_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. For this use case, "Robo-Advisor Portfolio Optimization": Construct and rebalance goal-based portfolios for millions of retail users that stay within each user's risk tolerance while minimising taxes and costs. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Markets, execution and backtesting | Trading models forecast returns, volatility or the cost of trading. Orders move prices (market impact), the gap between expected and achieved price is slippage, and a strategy's apparent performance in history is easily inflated by look-ahead bias, survivorship bias and trying many variants (overfitting the backtest). | Evaluation must respect time, include transaction costs and treat any number from a backtest as an upper bound. |
| Back-office documents and reconciliation | Banks still run on invoices, statements, journal entries and ledgers. Reconciliation matches records between systems, extraction pulls fields from documents, and both must tie to totals: line items add up, debits equal credits. | Arithmetic and accounting rules are hard constraints that a model's output can be checked against, which makes them strong validation signals. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Shrunk covariance matrix | Ledoit-Wolf shrinkage on rolling returns. Stable risk estimate. | Leakage risk to design against: Rolling window must not include rebalance date. |
| A signal-versus-noise trap in this use case: Estimation | The true signal is shrinkage covariance and robust expected-return priors; the common noise is plugging sample mean and covariance into mean-variance. | Estimation error makes the optimiser an error maximiser. |

**Ask the experts**

- [ ] What exactly does "Suitability rules per jurisdiction" mean in practice for robo-advisor portfolio optimization: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Shrunk covariance matrix" and "Drift from target", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Goal-achievement probability" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: backtest ignores taxes and transaction costs, and who can confirm the cut-off times and splits?
- [ ] How often does "Market crash with synchronized rebalancing" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Volatility | How much an asset's returns vary, usually the standard deviation of returns. |
| Sharpe ratio | Excess return per unit of risk; a common but easily inflated measure of strategy quality. |
| Alpha | Return that is not explained by exposure to broad market factors; what a signal is trying to find. |
| Turnover | How much of a portfolio is traded over a period, which drives transaction costs. |
| Limit order book | The list of buy and sell orders at each price for a security, which defines the market's liquidity. |
| Drawdown | The fall from a portfolio's peak value to its subsequent trough. |
| Look-ahead bias | Using information in a backtest that would not have been available at decision time. |
| Survivorship bias | Testing only on assets that still exist today, which hides those that failed. |
| Market regime | A period with distinct statistical behaviour, such as calm, trending or crisis conditions. |
| Risk parity | A portfolio construction approach that allocates so that assets contribute equally to risk. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Doubly robust estimator | An off-policy estimator that combines a reward model with propensity weighting. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
