# Cross-Border Payment FX & Fee Pricing: data and feature specification

> Generated from the blueprint `fintech/cross-border-fx-pricing-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cross-Border Payment FX & Fee Pricing · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Cross-Border Payment FX & Fee Pricing": Price FX markup and fees per corridor and customer segment to maximise revenue subject to conversion and fairness constraints. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Observational price-conversion data confounded.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Corridor price elasticity | log-log demand response from randomised price tests | Optimisation input | Use randomised cells only |   |   |   |
| Quote-to-convert funnel | conversion by price band for similar customers | Demand curve | Condition on amount and device |   |   |   |
| Liquidity cost estimate | real-time spread plus hedge cost | Cost term | Use cost at quote time |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Elasticity | Price elasticity per corridor estimated causally | Correlating price with conversion | Price correlates with segment quality |
| Cost | Live cost of liquidity (spread, hedging) in the margin | Fixed markup | Static markups lose money in volatile windows |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer nationality | fairness risk, replaced by corridor |
| Session duration | funnel artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Corridor price elasticity inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: use randomised cells only. |
| Quote-to-convert funnel inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: condition on amount and device. |
| Liquidity cost estimate inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: use cost at quote time. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: cross_border_fx_pricing_optimization_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: corridor_price_elasticity, type: double, nullable: false }
    - { name: quote_to_convert_funnel, type: double, nullable: false }
    - { name: liquidity_cost_estimate, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Corridor price elasticity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Quote-to-convert funnel against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Corridor price elasticity, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE cross_border_fx_pricing_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  corridor_price_elasticity          DOUBLE PRECISION,
  quote_to_convert_funnel            DOUBLE PRECISION,
  liquidity_cost_estimate            DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE cross_border_fx_pricing_decisions (
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
CREATE TABLE cross_border_fx_pricing_labels (
  decision_id    UUID        NOT NULL REFERENCES cross_border_fx_pricing_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Cross-Border Payment FX & Fee Pricing": Price FX markup and fees per corridor and customer segment to maximise revenue subject to conversion and fairness constraints. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Insurance: claims, pricing and fraud | Insurers price risk from the expected frequency and severity of claims, collect premiums and pay claims. A loss ratio compares claims paid with premium earned. Claims data are heavy-tailed with many zeros, and fraud ranges from exaggerated claims to organised rings. | Models predict skewed targets (Poisson or Tweedie losses), must avoid unfair discrimination, and claims outcomes take months to settle. |
| Expected loss, provisioning and regulation | Lenders estimate probability of default (PD), loss given default (LGD) and exposure at default (EAD); expected loss is their product. Accounting rules such as IFRS 9 and CECL require provisions for expected losses over the life of a loan, and fair-lending laws restrict which features can drive decisions and require explanations for rejections. | Models are governed: they need monotonic, explainable behaviour, validation by an independent team and a documented reason for every adverse decision. |
| Markets, execution and backtesting | Trading models forecast returns, volatility or the cost of trading. Orders move prices (market impact), the gap between expected and achieved price is slippage, and a strategy's apparent performance in history is easily inflated by look-ahead bias, survivorship bias and trying many variants (overfitting the backtest). | Evaluation must respect time, include transaction costs and treat any number from a backtest as an upper bound. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Corridor price elasticity | Log-log demand response from randomised price tests. Optimisation input. | Leakage risk to design against: Use randomised cells only. |
| A signal-versus-noise trap in this use case: Elasticity | The true signal is price elasticity per corridor estimated causally; the common noise is correlating price with conversion. | Price correlates with segment quality. |

**Ask the experts**

- [ ] What exactly does "Price transparency regulations" mean in practice for cross-border payment fx & fee pricing: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Corridor price elasticity" and "Quote-to-convert funnel", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Revenue per transaction" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: observational price-conversion data confounded, and who can confirm the cut-off times and splits?
- [ ] How often does "Volatility spike" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| FX spread | The margin a bank adds to the market exchange rate when converting currency. |
| Adverse action notice | A required explanation to an applicant who was declined or offered worse terms, listing the main reasons. |
| Fair lending | Laws that prohibit credit decisions that discriminate on protected characteristics, directly or through proxies. |
| BNPL | Buy now, pay later: short-term instalment credit offered at checkout, often with limited underwriting. |
| Premium | The price a policyholder pays for insurance cover. |
| Frequency / severity | How often claims occur and how large each one is; their product is expected loss. |
| Telematics | Data from vehicles or devices, such as speed and braking, used to price insurance by behaviour. |
| Reconciliation | Matching records between two systems, for example bank statements and ledger entries, and investigating differences. |
| ISO 20022 | A global standard for financial messages with rich structured data used by modern payment systems. |
| Interchange | The fee that a merchant's bank pays the card issuer on each card transaction. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Policy | The rule that maps a situation to an action. |
| Guardrail metric | A metric that must not get worse when optimising the main objective. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
