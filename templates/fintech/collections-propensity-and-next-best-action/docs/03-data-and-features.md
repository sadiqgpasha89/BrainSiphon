# Collections Propensity & Next-Best-Action: data and feature specification

> Generated from the blueprint `fintech/collections-propensity-and-next-best-action` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Collections Propensity & Next-Best-Action · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Collections Propensity & Next-Best-Action": Choose the contact channel, time and offer that maximise cure rate per rupee of collection cost while respecting conduct rules. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on all contacted customers without a holdout.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Promise-to-pay reliability | share of past promises honoured | Strong behavioural predictor | Promise outcome known only after follow-up date |   |   |   |
| Channel responsiveness | historic response rate by SMS, call and email | Personal preference | Exclude responses to the current campaign |   |   |   |
| Days past due and roll rate | current bucket and transition probabilities | Core delinquency state | Bucket at as-of date only |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Treatment | Uplift per action rather than raw cure probability | Calling the customers most likely to pay anyway | Self-cure customers waste budget and annoy |
| Conduct | Hard compliance constraints in the optimiser | Post-hoc filtering of recommendations | Filtering after optimisation breaks the objective |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Agent name | memorises individual agents, not strategy |
| Phone area code | location proxy with fairness risk |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Promise-to-pay reliability inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: promise outcome known only after follow-up date. |
| Channel responsiveness inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: exclude responses to the current campaign. |
| Days past due and roll rate inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: bucket at as-of date only. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: collections_propensity_and_next_best_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: promise_to_pay_reliability, type: double, nullable: false }
    - { name: channel_responsiveness, type: double, nullable: false }
    - { name: days_past_due_and_roll_rate, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Promise-to-pay reliability and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Channel responsiveness against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Promise-to-pay reliability, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Porto Seguro Safe Driver Prediction | https://www.kaggle.com/c/porto-seguro-safe-driver-prediction | Competition rules; free Kaggle login | 600K insurance policies with anonymised features and a claim-filed label | Anonymised features limit domain feature work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE collections_propensity_and_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE collections_propensity_and_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES collections_propensity_and_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE collections_propensity_and_assignments (
  plan_id TEXT NOT NULL REFERENCES collections_propensity_and_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE collections_propensity_and_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. For this use case, "Collections Propensity & Next-Best-Action": Choose the contact channel, time and offer that maximise cure rate per rupee of collection cost while respecting conduct rules. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Expected loss, provisioning and regulation | Lenders estimate probability of default (PD), loss given default (LGD) and exposure at default (EAD); expected loss is their product. Accounting rules such as IFRS 9 and CECL require provisions for expected losses over the life of a loan, and fair-lending laws restrict which features can drive decisions and require explanations for rejections. | Models are governed: they need monotonic, explainable behaviour, validation by an independent team and a documented reason for every adverse decision. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Promise-to-pay reliability | Share of past promises honoured. Strong behavioural predictor. | Leakage risk to design against: Promise outcome known only after follow-up date. |
| A signal-versus-noise trap in this use case: Treatment | The true signal is uplift per action rather than raw cure probability; the common noise is calling the customers most likely to pay anyway. | Self-cure customers waste budget and annoy. |

**Ask the experts**

- [ ] What exactly does "Contact-frequency and time-of-day regulations" mean in practice for collections propensity & next-best-action: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Promise-to-pay reliability" and "Channel responsiveness", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Cure rate per collection rupee" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on all contacted customers without a holdout, and who can confirm the cut-off times and splits?
- [ ] How often does "Hardship flag arrives late" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Collections | The process of contacting customers who are behind on payments to recover money, within strict conduct rules. |
| Days past due (DPD) | How many days a payment is overdue; 30, 60 and 90 DPD are common delinquency buckets. |
| Charge-off | Writing a loan off as a loss after prolonged non-payment. |
| Roll rate | The share of accounts that move from one delinquency bucket to the next, such as 30 to 60 days. |
| Adverse action notice | A required explanation to an applicant who was declined or offered worse terms, listing the main reasons. |
| Fair lending | Laws that prohibit credit decisions that discriminate on protected characteristics, directly or through proxies. |
| BNPL | Buy now, pay later: short-term instalment credit offered at checkout, often with limited underwriting. |
| Sanctions screening | Checking customers and payments against lists of sanctioned people, entities and countries. |
| Sharpe ratio | Excess return per unit of risk; a common but easily inflated measure of strategy quality. |
| Look-ahead bias | Using information in a backtest that would not have been available at decision time. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Propensity | The probability with which the logging policy chose the logged action. |
| Reward | The number the system tries to maximise over time. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| p99 latency | The time within which 99% of requests complete. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
