# Risk-Adjusted Loan Pricing (RAROC): data and feature specification

> Generated from the blueprint `bfsi/risk-adjusted-loan-pricing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Risk-Adjusted Loan Pricing (RAROC) · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Risk-Adjusted Loan Pricing (RAROC)": Recommend the loan rate and fees that meet the hurdle return on capital while winning the deals worth winning. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Truncated quote data biases elasticity.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Quote-to-win curve | logistic model of win versus price gap to the market | Elasticity differs by segment | Quote data is truncated where deals never reached a quote |   |   |   |
| Expected loss and capital | PD times LGD times EAD plus regulatory capital charge | Sets the floor | Risk parameters must be the approved ones |   |   |   |
| Relationship profitability | trailing 12-month income from the client's other products | Justifies concessions | Allocation of shared costs is contested |   |   |   |
| Competitor rate | latest observed competitor offers for the segment | Anchor for the market | Often anecdotal, not systematically collected |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Win model | Probability of winning at each price from past quotes including losses | Using only won deals | Won deals are cheap deals so the curve slopes the wrong way |
| Costs | Funding, expected loss, capital and operating cost per deal | Margin over the base rate | A thin margin may still earn the hurdle if risk is low |
| Relationship | Value of the whole relationship over time | Pricing each product in isolation | Loss leaders on loans pay back through deposits and fees |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Time since last meeting | relationship manager noise |
| Branch | administrative |
| Loan purpose free text | inconsistent categories |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Quote-to-win curve inputs | Core banking IT | Core banking or policy administration system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: quote data is truncated where deals never reached a quote. |
| Expected loss and capital inputs | Risk data office | General ledger and risk data warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: risk parameters must be the approved ones. |
| Relationship profitability inputs | Operations | Customer master and KYC repository | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: allocation of shared costs is contested. |
| Competitor rate inputs | Core banking IT | Core banking or policy administration system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: often anecdotal, not systematically collected. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: risk_adjusted_loan_pricing_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: quote_to_win_curve, type: double, nullable: false }
    - { name: expected_loss_and_capital, type: double, nullable: false }
    - { name: relationship_profitability, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Quote-to-win curve and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Expected loss and capital against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Quote-to-win curve, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | A relational consumer-loan dataset (applications, bureau history, instalments) with a default label | Consumer instalment loans in emerging markets, not mortgages or corporate credit; competition licence limits reuse. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Porto Seguro Safe Driver Prediction | https://www.kaggle.com/c/porto-seguro-safe-driver-prediction | Competition rules; free Kaggle login | 600K insurance policies with anonymised features and a claim-filed label | Anonymised features limit domain feature work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE risk_adjusted_loan_pricing_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  quote_to_win_curve                 DOUBLE PRECISION,
  expected_loss_and_capital          DOUBLE PRECISION,
  relationship_profitability         DOUBLE PRECISION,
  competitor_rate                    DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE risk_adjusted_loan_pricing_decisions (
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
CREATE TABLE risk_adjusted_loan_pricing_labels (
  decision_id    UUID        NOT NULL REFERENCES risk_adjusted_loan_pricing_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Risk-Adjusted Loan Pricing (RAROC)": Recommend the loan rate and fees that meet the hurdle return on capital while winning the deals worth winning. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| How a bank lends: origination, servicing and workout | A loan is originated (application, underwriting, approval, documents), serviced for years (payments, covenants, reviews) and, if the borrower struggles, moved to collections or workout. Each stage has its own data, owner and model: underwriting models see applicants, behaviour models see accounts, early-warning models see covenant and cash-flow signals. | Which stage you are modelling decides the label, the delay before you learn the outcome and which team acts on your score. |
| Capital: risk-weighted assets and the capital ratio | Regulators require banks to hold capital against risk-weighted assets, where each exposure's weight depends on its type, rating and collateral. Reducing RWA by selling, hedging or restructuring frees capital but costs income, so the choice is a trade-off between capital use and return. | Optimisation models must use the regulatory definitions exactly, and a reduction that cannot be executed is not a reduction. |
| Treasury, liquidity and interest-rate risk | The treasury funds the bank, keeps enough liquid assets to survive outflows and manages how net interest income reacts to rates. Key ideas are intraday liquidity, deposit run-off, behavioural assumptions for deposits and prepayments, and the liquidity coverage and net stable funding rules. | Forecast errors here are measured in buffers held and funding costs paid, and the tail (a run, a rate shock) matters more than the average. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Learning from logs: off-policy evaluation | Most business data were generated by an earlier policy. To judge a new policy offline you need the probability with which each logged action was chosen; estimators such as inverse propensity weighting, self-normalised weighting and doubly robust methods correct for the difference, with a bias-variance trade-off. | Never evaluate a new policy only on the rows where it agrees with the old one; log propensities from day one. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Quote-to-win curve | Logistic model of win versus price gap to the market. Elasticity differs by segment. | Leakage risk to design against: Quote data is truncated where deals never reached a quote. |
| A signal-versus-noise trap in this use case: Win model | The true signal is probability of winning at each price from past quotes including losses; the common noise is using only won deals. | Won deals are cheap deals so the curve slopes the wrong way. |

**Ask the experts**

- [ ] What exactly does "Never price below the risk-adjusted floor without approval" mean in practice for risk-adjusted loan pricing (raroc): who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Quote-to-win curve" and "Expected loss and capital", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Portfolio RAROC" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: truncated quote data biases elasticity, and who can confirm the cut-off times and splits?
- [ ] How often does "Market rate shock" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| RAROC | Risk-adjusted return on capital: income minus costs and expected loss, divided by the capital held against the risk. |
| Covenant | A condition in a loan agreement, such as a maximum leverage ratio, that the borrower must keep to; a breach lets the lender act. |
| LCR | Liquidity coverage ratio: high-quality liquid assets divided by expected 30-day stressed net outflows. |
| NSFR | Net stable funding ratio: available stable funding relative to required stable funding over a one-year horizon. |
| NII | Net interest income: interest earned on assets minus interest paid on liabilities. |
| Deposit beta | How much of a change in the policy rate the bank passes on to depositors. |
| Model tier | A classification of a model by its materiality, which sets how deeply it is validated. |
| KYC refresh | Periodic review of a customer's identity and risk information, more often for higher-risk customers. |
| LTV | Loan-to-value: the loan balance divided by the property value; a higher LTV means less equity cushion. |
| DTI | Debt-to-income: total monthly debt payments divided by monthly income, a standard affordability measure. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Platt scaling | Calibrating scores with a logistic curve. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
| Policy | The rule that maps a situation to an action. |
| Regret | The reward lost by not always choosing the best action. |
| Exploration / exploitation | Trying new actions to learn versus using the best known one. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
