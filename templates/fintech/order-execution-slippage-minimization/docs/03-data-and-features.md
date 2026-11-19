# Order Execution & Slippage Minimisation: data and feature specification

> Generated from the blueprint `fintech/order-execution-slippage-minimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Order Execution & Slippage Minimisation · **Domain:** fintech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Order Execution & Slippage Minimisation": Slice large parent orders into child orders that minimise implementation shortfall against arrival price. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulator lacks market impact.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Order-book imbalance | (bid depth - ask depth) / total depth at top 5 levels | Short-term price pressure | Snapshot at decision time |   |   |   |
| Spread and depth ratio | spread over mid and depth at touch | Liquidity cost | Use pre-trade quotes only |   |   |   |
| Remaining-time urgency | residual quantity over remaining horizon | Schedule pressure | Normalise by expected volume curve |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Benchmark | Implementation shortfall vs arrival price | VWAP beat rate | VWAP can be gamed by trading late with the market |
| Simulation | Calibrated limit-order-book simulator with impact | Replaying historical fills | Your own orders change the market; replay ignores that |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Order sizes of other participants | not observable reliably |
| Time-of-day dummies | captured by the volume curve |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Order-book imbalance inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: snapshot at decision time. |
| Spread and depth ratio inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: use pre-trade quotes only. |
| Remaining-time urgency inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: normalise by expected volume curve. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: order_execution_slippage_minimization_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: order_book_imbalance, type: double, nullable: false }
    - { name: spread_and_depth_ratio, type: double, nullable: false }
    - { name: remaining_time_urgency, type: double, nullable: false }
sla:
  freshness_p95: 5 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Order-book imbalance and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Spread and depth ratio against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 5 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Order-book imbalance, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| IBM AMLSim (anti-money-laundering simulator) | https://github.com/IBM/AMLSim | Apache 2.0 (see the repository) | A simulator that generates transaction networks with injected laundering patterns | Synthetic; patterns reflect the simulator's assumptions. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Azure Public Dataset | https://github.com/Azure/AzurePublicDataset | CC BY 4.0 (see the repository) | Anonymised VM, workload and resource utilisation traces from Azure | One cloud and period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE order_execution_slippage_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  order_book_imbalance               DOUBLE PRECISION,
  spread_and_depth_ratio             DOUBLE PRECISION,
  remaining_time_urgency             DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE order_execution_slippage_decisions (
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
CREATE TABLE order_execution_slippage_labels (
  decision_id    UUID        NOT NULL REFERENCES order_execution_slippage_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. For this use case, "Order Execution & Slippage Minimisation": Slice large parent orders into child orders that minimise implementation shortfall against arrival price. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Markets, execution and backtesting | Trading models forecast returns, volatility or the cost of trading. Orders move prices (market impact), the gap between expected and achieved price is slippage, and a strategy's apparent performance in history is easily inflated by look-ahead bias, survivorship bias and trying many variants (overfitting the backtest). | Evaluation must respect time, include transaction costs and treat any number from a backtest as an upper bound. |
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Order-book imbalance | (bid depth - ask depth) / total depth at top 5 levels. Short-term price pressure. | Leakage risk to design against: Snapshot at decision time. |
| A signal-versus-noise trap in this use case: Benchmark | The true signal is implementation shortfall vs arrival price; the common noise is vWAP beat rate. | VWAP can be gamed by trading late with the market. |

**Ask the experts**

- [ ] What exactly does "Decision latency under 2 ms" mean in practice for order execution & slippage minimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Order-book imbalance" and "Spread and depth ratio", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Average slippage in basis points" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: simulator lacks market impact, and who can confirm the cut-off times and splits?
- [ ] How often does "Venue outage mid-order" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Limit order book | The list of buy and sell orders at each price for a security, which defines the market's liquidity. |
| Slippage | The difference between the price expected when an order is decided and the price actually obtained. |
| Market impact | The adverse price movement caused by one's own trading. |
| Bid-ask spread | The difference between the highest price buyers offer and the lowest price sellers ask; a cost of trading. |
| VWAP / TWAP | Volume-weighted and time-weighted average price: benchmarks and simple schedules for executing large orders. |
| Market regime | A period with distinct statistical behaviour, such as calm, trending or crisis conditions. |
| Market making | Quoting both buy and sell prices continuously to earn the spread while managing inventory risk. |
| Inventory risk | The risk a market maker carries from holding a position whose price may move against it. |
| Volatility | How much an asset's returns vary, usually the standard deviation of returns. |
| Spoofing | Placing orders with no intention to execute them to mislead other traders, a form of market abuse. |
| Policy | The rule that maps a situation to an action. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Hidden Markov model | A model in which a hidden state switches over time and generates the observations. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Lag feature | A past value of the series used as a predictor. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
