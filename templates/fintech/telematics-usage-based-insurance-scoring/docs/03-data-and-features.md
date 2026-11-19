# Telematics Usage-Based Insurance Scoring: data and feature specification

> Generated from the blueprint `fintech/telematics-usage-based-insurance-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Telematics Usage-Based Insurance Scoring · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Telematics Usage-Based Insurance Scoring": Score driving behaviour from phone and device sensors to offer fair, behaviour-based premiums and reduce claims through feedback. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Short observation windows with no claims yet.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Harsh events per 100km by road class | events normalised by distance and road class | Behaviour not circumstance | Map-match to road class |   |   |   |
| Speed over limit percentage | fraction of distance over posted limit | Risk behaviour | Map speed limits as-of date |   |   |   |
| Phone distraction minutes | touch and motion-based screen use while moving | Strong crash predictor | Respect passenger exclusion |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Events | Harsh braking, speeding and phone-handling per 100 km normalised by road type | Raw event counts | City drivers brake more by necessity |
| Exposure | Time-of-day and road-type exposure features | Mileage alone | Night driving risk differs from daytime |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Absolute top speed | rare, outlier-dominated |
| Trip start location | privacy risk, weak signal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Harsh events per 100km by road class inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: map-match to road class. |
| Speed over limit percentage inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: map speed limits as-of date. |
| Phone distraction minutes inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: respect passenger exclusion. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: telematics_usage_based_insurance_scoring_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: harsh_events_per_100km_by_road_class, type: double, nullable: false }
    - { name: speed_over_limit_percentage, type: double, nullable: false }
    - { name: phone_distraction_minutes, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Harsh events per 100km by road class and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Speed over limit percentage against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Harsh events per 100km by road class, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Porto Seguro Safe Driver Prediction | https://www.kaggle.com/c/porto-seguro-safe-driver-prediction | Competition rules; free Kaggle login | 600K insurance policies with anonymised features and a claim-filed label | Anonymised features limit domain feature work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| French Motor Third-Party Liability Claims | https://www.openml.org/d/41214 | Open licence on OpenML; see the dataset page | About 678,000 policies with exposure, claim counts and risk characteristics, the standard example for frequency modelling | One line of business in one country; no claim text, no payments over time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE telematics_usage_based_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE telematics_usage_based_outputs (
  run_id TEXT NOT NULL REFERENCES telematics_usage_based_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE telematics_usage_based_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE telematics_usage_based_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. For this use case, "Telematics Usage-Based Insurance Scoring": Score driving behaviour from phone and device sensors to offer fair, behaviour-based premiums and reduce claims through feedback. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Selection bias in lending data | You only observe repayment for applicants you approved. Rejected applicants have no outcome, so models trained on approved customers can be wrong for the people they would reject. Techniques such as reject inference and random approval experiments try to correct it. | A scorecard that looks accurate on past approvals can fail on the new applicants a policy change lets in. |
| Expected loss, provisioning and regulation | Lenders estimate probability of default (PD), loss given default (LGD) and exposure at default (EAD); expected loss is their product. Accounting rules such as IFRS 9 and CECL require provisions for expected losses over the life of a loan, and fair-lending laws restrict which features can drive decisions and require explanations for rejections. | Models are governed: they need monotonic, explainable behaviour, validation by an independent team and a documented reason for every adverse decision. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Harsh events per 100km by road class | Events normalised by distance and road class. Behaviour not circumstance. | Leakage risk to design against: Map-match to road class. |
| A signal-versus-noise trap in this use case: Events | The true signal is harsh braking, speeding and phone-handling per 100 km normalised by road type; the common noise is raw event counts. | City drivers brake more by necessity. |

**Ask the experts**

- [ ] What exactly does "Battery impact on phones" mean in practice for telematics usage-based insurance scoring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Harsh events per 100km by road class" and "Speed over limit percentage", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Claim frequency of high-score vs low-score" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: short observation windows with no claims yet, and who can confirm the cut-off times and splits?
- [ ] How often does "Passenger in car misdetected as driver" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Premium | The price a policyholder pays for insurance cover. |
| Frequency / severity | How often claims occur and how large each one is; their product is expected loss. |
| Telematics | Data from vehicles or devices, such as speed and braking, used to price insurance by behaviour. |
| Underwriting | The process of deciding whether to lend or insure and on what terms. |
| Loss ratio | Claims paid divided by premium earned, a core measure of insurance profitability. |
| Fair lending | Laws that prohibit credit decisions that discriminate on protected characteristics, directly or through proxies. |
| FNOL | First notice of loss: the first report of an insured event, where claims triage begins. |
| Subrogation | The insurer's right to recover claim payments from a party responsible for the loss. |
| Credit bureau | A company that collects borrowers' credit histories and sells reports and scores to lenders. |
| Thin file | A customer with little or no credit history, for whom bureau data say little. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Level shift | An abrupt, lasting change in a series' average. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Lag feature | A past value of the series used as a predictor. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
