# Personalised Onboarding Paths: data and feature specification

> Generated from the blueprint `saas/personalized-onboarding-paths` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Personalised Onboarding Paths · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Personalised Onboarding Paths": Tailor onboarding steps and templates to each new user or team to reach first value faster. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Rewarding checklist completion.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Declared role and goal | survey answers | Personalisation | Consent |   |   |   |
| Early action sequence | first-session actions | Intent | Window |   |   |   |
| Template similarity to successful teams | embedding similarity | Recommendation | Data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Goal | Optimise time to value and activation | Checklist completion | Completed steps may not equal value |
| Context | Role and use-case conditioning | One-size onboarding | Needs differ widely |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Referrer | weak |
| Browser | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Declared role and goal inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: consent. |
| Early action sequence inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: window. |
| Template similarity to successful teams inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: personalized_onboarding_paths_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: declared_role_and_goal, type: double, nullable: false }
    - { name: early_action_sequence, type: double, nullable: false }
    - { name: template_similarity_to_successful_teams, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Declared role and goal and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Early action sequence against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Declared role and goal, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE personalized_onboarding_paths_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  declared_role_and_goal             DOUBLE PRECISION,
  early_action_sequence              DOUBLE PRECISION,
  template_similarity_to_successful_teams DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE personalized_onboarding_paths_decisions (
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
CREATE TABLE personalized_onboarding_paths_labels (
  decision_id    UUID        NOT NULL REFERENCES personalized_onboarding_paths_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Personalised Onboarding Paths": Tailor onboarding steps and templates to each new user or team to reach first value faster. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Product-led growth, pricing and experimentation | Many products grow by letting users try before they buy. Activation (reaching first value), usage depth and team spread predict conversion; pricing and packaging decide who pays for what. A/B tests with few accounts and long horizons need variance reduction and sequential methods. | Underpowered experiments and peeking produce false wins, so experimentation platforms enforce rules about duration and metrics. |
| What success means for the business | Docs teams track time to first successful API call, support tickets caused by documentation and search success. An assistant that deflects tickets but sends developers wrong limits or versions moves cost from the support team to the developer's incident. | Measure outcomes for developers, not only answer quality, and decide upfront what the assistant must never answer (billing, security advice, legal terms). |
| Exploration, cold start and diversity | New items and users have no history and are never shown without deliberate exploration; recommenders also need diversity and fairness constraints so long-tail items and sellers get exposure. Bandit methods manage the explore-exploit trade-off. | Coverage and new-item exposure are product metrics, not afterthoughts. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Declared role and goal | Survey answers. Personalisation. | Leakage risk to design against: Consent. |
| A signal-versus-noise trap in this use case: Goal | The true signal is optimise time to value and activation; the common noise is checklist completion. | Completed steps may not equal value. |

**Ask the experts**

- [ ] What exactly does "Quick decisions per step" mean in practice for personalised onboarding paths: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Declared role and goal" and "Early action sequence", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to first value" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: rewarding checklist completion, and who can confirm the cut-off times and splits?
- [ ] How often does "Cold-start users with no context" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Activation | A user reaching the first moment of real value in a product. |
| Time to first successful call | How long a new developer takes to make a working API request, a common docs-quality metric. |
| Sequential testing | Statistical methods that allow results to be checked repeatedly without inflating false positives. |
| In-app copilot | An assistant inside a product that answers questions and can take actions on the user's behalf. |
| Embedding | A vector representing the meaning of text, used for similarity search that tolerates different wording. |
| NRR / GRR | Net and gross revenue retention: how much of last period's revenue remains, with or without expansion. |
| Churn | Customers or revenue lost over a period; logo churn counts accounts, revenue churn counts money. |
| PQL / MQL | Product-qualified and marketing-qualified leads: prospects identified from product usage or marketing activity. |
| Pipeline | The set of open sales opportunities and their stages and expected values. |
| CUPED | A method that reduces experiment variance by adjusting for pre-experiment behaviour. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| Sequence model (SASRec) | A transformer that predicts the next item from a user's recent history. |
| Collaborative filtering | Recommending items liked by users similar to you. |
| Policy | The rule that maps a situation to an action. |
| Reward | The number the system tries to maximise over time. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
| Exploration / exploitation | Trying new actions to learn versus using the best known one. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
