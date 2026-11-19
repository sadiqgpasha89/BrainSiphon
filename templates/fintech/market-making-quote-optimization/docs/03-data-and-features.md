# Market-Making Quote Optimisation: data and feature specification

> Generated from the blueprint `fintech/market-making-quote-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Market-Making Quote Optimisation · **Domain:** fintech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Market-Making Quote Optimisation": Quote bid and ask prices that earn spread while controlling inventory and adverse selection. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Replay ignores queue position effects.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Queue position and size | estimated position in queue at best price | Fill probability | Estimate from own order events |   |   |   |
| Short-term trade imbalance | signed volume over last 100 ms | Toxicity predictor | Use exchange-timestamp ordering |   |   |   |
| Inventory skew | quote shift proportional to inventory | Risk control | Cap by hard limits |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Adverse selection | Fill toxicity features (trade imbalance, queue position) | Spread alone | Capturing spread against informed flow loses money |
| Inventory | Inventory-aware skewing of quotes | Symmetric quotes | Inventory risk dominates PnL variance |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Long-horizon price predictions | not actionable at quote horizon |
| News sentiment | too slow for quote decisions |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Queue position and size inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: estimate from own order events. |
| Short-term trade imbalance inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: use exchange-timestamp ordering. |
| Inventory skew inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: cap by hard limits. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: market_making_quote_optimization_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: queue_position_and_size, type: double, nullable: false }
    - { name: short_term_trade_imbalance, type: double, nullable: false }
    - { name: inventory_skew, type: double, nullable: false }
sla:
  freshness_p95: 5 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Queue position and size and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Short-term trade imbalance against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 5 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Queue position and size, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE market_making_quote_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  queue_position_and_size            DOUBLE PRECISION,
  short_term_trade_imbalance         DOUBLE PRECISION,
  inventory_skew                     DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE market_making_quote_decisions (
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
CREATE TABLE market_making_quote_labels (
  decision_id    UUID        NOT NULL REFERENCES market_making_quote_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. For this use case, "Market-Making Quote Optimisation": Quote bid and ask prices that earn spread while controlling inventory and adverse selection. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Markets, execution and backtesting | Trading models forecast returns, volatility or the cost of trading. Orders move prices (market impact), the gap between expected and achieved price is slippage, and a strategy's apparent performance in history is easily inflated by look-ahead bias, survivorship bias and trying many variants (overfitting the backtest). | Evaluation must respect time, include transaction costs and treat any number from a backtest as an upper bound. |
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Queue position and size | Estimated position in queue at best price. Fill probability. | Leakage risk to design against: Estimate from own order events. |
| A signal-versus-noise trap in this use case: Adverse selection | The true signal is fill toxicity features (trade imbalance, queue position); the common noise is spread alone. | Capturing spread against informed flow loses money. |

**Ask the experts**

- [ ] What exactly does "Quote update under 1 ms" mean in practice for market-making quote optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Queue position and size" and "Short-term trade imbalance", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "PnL per unit risk" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: replay ignores queue position effects, and who can confirm the cut-off times and splits?
- [ ] How often does "Exchange sends stale data" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Limit order book | The list of buy and sell orders at each price for a security, which defines the market's liquidity. |
| Market making | Quoting both buy and sell prices continuously to earn the spread while managing inventory risk. |
| Inventory risk | The risk a market maker carries from holding a position whose price may move against it. |
| Bid-ask spread | The difference between the highest price buyers offer and the lowest price sellers ask; a cost of trading. |
| Market regime | A period with distinct statistical behaviour, such as calm, trending or crisis conditions. |
| Spoofing | Placing orders with no intention to execute them to mislead other traders, a form of market abuse. |
| Policy | The rule that maps a situation to an action. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| p99 latency | The time within which 99% of requests complete. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
