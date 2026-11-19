# Credit Card Offer Personalisation: data and feature specification

> Generated from the blueprint `fintech/credit-card-offer-personalization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Credit Card Offer Personalisation · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Credit Card Offer Personalisation": Show each customer the card or reward offer with the highest expected lifetime value subject to eligibility and risk policy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on clicks ignores approval outcome.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Pre-approval probability | model score for approval of this offer | Avoids dead-end clicks | Compute with current bureau pull date |   |   |   |
| Spend category affinity | share of spend in offer's reward category | Reward relevance | Trailing 6 months excluding offer period |   |   |   |
| Expected profit margin | model-based NPV of acquiring this customer | Business value | Uses forward-looking estimates with lag |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Value | Expected profit (approval, usage, risk) not click-through | Maximising clicks | Clicks on cards that decline or default lose money |
| Eligibility | Eligibility computed before ranking | Rank then filter | Showing ineligible offers frustrates users and violates policy |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Browsing dwell time | high variance and gameable |
| Device brand | proxy for income with fairness risk |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Pre-approval probability inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: compute with current bureau pull date. |
| Spend category affinity inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: trailing 6 months excluding offer period. |
| Expected profit margin inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: uses forward-looking estimates with lag. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: credit_card_offer_personalization_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: pre_approval_probability, type: double, nullable: false }
    - { name: spend_category_affinity, type: double, nullable: false }
    - { name: expected_profit_margin, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Pre-approval probability and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Spend category affinity against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Pre-approval probability, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MovieLens datasets | https://grouplens.org/datasets/movielens/ | GroupLens research terms (see the page) | Explicit ratings from 100K to 25M with timestamps, the standard recommender benchmark | Explicit ratings are not implicit clicks; film domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE credit_card_offer_impressions (
  impression_id  UUID PRIMARY KEY,
  user_id        TEXT        NOT NULL,
  shown_at       TIMESTAMPTZ NOT NULL,
  surface        TEXT        NOT NULL,
  item_id        TEXT        NOT NULL,
  rank           SMALLINT    NOT NULL,
  score          REAL,
  propensity     REAL        NOT NULL,   -- probability the policy showed this item at this rank
  source         TEXT        NOT NULL,   -- ann | co-visit | trending | business-rule | exploration
  model_version  TEXT        NOT NULL,
  experiment_arm TEXT
) PARTITION BY RANGE (shown_at);

CREATE TABLE credit_card_offer_feedback (
  impression_id  UUID        NOT NULL REFERENCES credit_card_offer_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE credit_card_offer_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. For this use case, "Credit Card Offer Personalisation": Show each customer the card or reward offer with the highest expected lifetime value subject to eligibility and risk policy. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Expected loss, provisioning and regulation | Lenders estimate probability of default (PD), loss given default (LGD) and exposure at default (EAD); expected loss is their product. Accounting rules such as IFRS 9 and CECL require provisions for expected losses over the life of a loan, and fair-lending laws restrict which features can drive decisions and require explanations for rejections. | Models are governed: they need monotonic, explainable behaviour, validation by an independent team and a documented reason for every adverse decision. |
| Selection bias in lending data | You only observe repayment for applicants you approved. Rejected applicants have no outcome, so models trained on approved customers can be wrong for the people they would reject. Techniques such as reject inference and random approval experiments try to correct it. | A scorecard that looks accurate on past approvals can fail on the new applicants a policy change lets in. |
| Exploration, cold start and diversity | New items and users have no history and are never shown without deliberate exploration; recommenders also need diversity and fairness constraints so long-tail items and sellers get exposure. Bandit methods manage the explore-exploit trade-off. | Coverage and new-item exposure are product metrics, not afterthoughts. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Pre-approval probability | Model score for approval of this offer. Avoids dead-end clicks. | Leakage risk to design against: Compute with current bureau pull date. |
| A signal-versus-noise trap in this use case: Value | The true signal is expected profit (approval, usage, risk) not click-through; the common noise is maximising clicks. | Clicks on cards that decline or default lose money. |

**Ask the experts**

- [ ] What exactly does "Pre-approval eligibility filters" mean in practice for credit card offer personalisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Pre-approval probability" and "Spend category affinity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Booked accounts per impression" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on clicks ignores approval outcome, and who can confirm the cut-off times and splits?
- [ ] How often does "Rate change invalidates offers" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Credit limit | The maximum balance a customer may carry on a revolving account. |
| PD / LGD / EAD | Probability of default, loss given default and exposure at default: the three components of expected credit loss. |
| IFRS 9 / CECL | Accounting standards that require banks to book provisions for expected future credit losses. |
| Days past due (DPD) | How many days a payment is overdue; 30, 60 and 90 DPD are common delinquency buckets. |
| Vintage | A group of loans originated in the same period, tracked together over time to compare performance. |
| Charge-off | Writing a loan off as a loss after prolonged non-payment. |
| Adverse action notice | A required explanation to an applicant who was declined or offered worse terms, listing the main reasons. |
| Fair lending | Laws that prohibit credit decisions that discriminate on protected characteristics, directly or through proxies. |
| Roll rate | The share of accounts that move from one delinquency bucket to the next, such as 30 to 60 days. |
| Underwriting | The process of deciding whether to lend or insure and on what terms. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| Popularity bias | The tendency to recommend already-popular items. |
| Position bias | Higher slots get more attention regardless of relevance. |
| Interleaving | An online test mixing two rankers' results in one list to see which gets more clicks. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Platt scaling | Calibrating scores with a logistic curve. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| MRR | Mean reciprocal rank: the average of one over the rank of the first relevant item. |
