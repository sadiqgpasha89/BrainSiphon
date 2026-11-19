# Claims Triage & Straight-Through Processing: data and feature specification

> Generated from the blueprint `bfsi/claims-triage-and-straight-through-processing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Claims Triage & Straight-Through Processing · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Claims Triage & Straight-Through Processing": Route each insurance claim to straight-through payment, standard handling or a specialist based on complexity and risk. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels come from past routing decisions, so the model learns the old process and its biases.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| First notice text | encoder embedding of the claim description mapped to complexity classes | Describes what happened in the customer's words | Language varies, so test across channels |   |   |   |
| Coverage check | policy in force on the loss date and the peril covered, as binary flags | Eligibility decides whether a claim is payable at all | Data quality issues in policy records cause false denials |   |   |   |
| Claimant history | number of claims by the claimant in the last 3 years | Patterns of repeated claims | Fair-use rules limit how it can be used |   |   |   |
| Reserve estimate | initial reserve set by claim type and loss description | A first estimate of severity | Initial reserves are rough, so treat it as a prior |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Complexity | Expected handling effort and severity of the loss | The claim amount alone | A small claim can be complex, such as disputed liability, and a large one can be simple |
| Safety | Straight-through only for low-risk, low-value claims | Maximising accuracy at any value | A wrongly paid claim is costly and hard to recover, so errors in this class must be rare |
| Fraud | A separate fraud score alongside the complexity score | Using complexity as a proxy for fraud | Mixed signals send honest complex claims to a fraud team and let simple fraud pass |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Handler | The handler who first opens the claim has no bearing on its complexity |
| Day filed | Weak relation to complexity once the type is known |
| Channel | Reflects customer cohort and not the claim, so it risks unfair treatment |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| First notice text inputs | Core banking IT | Core banking or policy administration system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: language varies, so test across channels. |
| Coverage check inputs | Risk data office | General ledger and risk data warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: data quality issues in policy records cause false denials. |
| Claimant history inputs | Operations | Customer master and KYC repository | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: fair-use rules limit how it can be used. |
| Reserve estimate inputs | Core banking IT | Core banking or policy administration system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: initial reserves are rough, so treat it as a prior. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: claims_triage_and_straight_through_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: first_notice_text, type: double, nullable: false }
    - { name: coverage_check, type: double, nullable: false }
    - { name: claimant_history, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on First notice text and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Coverage check against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as First notice text, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Porto Seguro Safe Driver Prediction | https://www.kaggle.com/c/porto-seguro-safe-driver-prediction | Competition rules; free Kaggle login | 600K insurance policies with anonymised features and a claim-filed label | Anonymised features limit domain feature work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Diabetes 130-US Hospitals (UCI) | https://archive.ics.uci.edu/dataset/296/diabetes+130-us+hospitals+for+years+1999-2008 | CC BY 4.0 (see the UCI page) | 100K inpatient encounters with a 30-day readmission outcome | Old data and coarse features. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| French Motor Third-Party Liability Claims | https://www.openml.org/d/41214 | Open licence on OpenML; see the dataset page | About 678,000 policies with exposure, claim counts and risk characteristics, the standard example for frequency modelling | One line of business in one country; no claim text, no payments over time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE claims_triage_and_straight_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE claims_triage_and_straight_fields (
  document_id TEXT NOT NULL REFERENCES claims_triage_and_straight_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE claims_triage_and_straight_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Claims Triage & Straight-Through Processing": Route each insurance claim to straight-through payment, standard handling or a specialist based on complexity and risk. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Conduct, fairness and customer outcomes | Regulators expect firms to treat customers fairly, identify vulnerable customers and handle complaints properly. Models that route, price or decline must be tested for disparate outcomes, and customers need a route to human review and redress. | A model that raises efficiency but worsens outcomes for one group is a conduct failure, not a success. |
| Insurance: pricing, underwriting, claims and reserving | An insurer collects premiums, underwrites risks, pays claims and holds reserves for claims not yet settled. Underwriting selects and prices risk, claims handling pays and investigates, and actuaries estimate ultimate cost from development triangles using methods such as chain-ladder. | Labels arrive years later for long-tail lines, and the same data feed serves pricing, claims and reserving teams with different definitions. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: First notice text | Encoder embedding of the claim description mapped to complexity classes. Describes what happened in the customer's words. | Leakage risk to design against: Language varies, so test across channels. |
| A signal-versus-noise trap in this use case: Complexity | The true signal is expected handling effort and severity of the loss; the common noise is the claim amount alone. | A small claim can be complex, such as disputed liability, and a large one can be simple. |

**Ask the experts**

- [ ] What exactly does "Automatic payment only for claims below a set value and risk limit" mean in practice for claims triage & straight-through processing: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "First notice text" and "Coverage check", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "STP share" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels come from past routing decisions, so the model learns the old process and its biases, and who can confirm the cut-off times and splits?
- [ ] How often does "Catastrophe surge" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Straight-through processing | Handling a transaction or claim end to end without manual touch. |
| IBNR | Incurred but not reported: claims that have happened but have not yet been reported or fully known. |
| Mis-selling | Selling a product that does not suit the client or by misleading them about it. |
| Chain-ladder | An actuarial method that projects ultimate claims from the development of past claims in a triangle. |
| Loss triangle | A table of claims by accident period and development period, used to estimate unpaid claims. |
| Subrogation | The insurer's right to recover a paid claim from the party that caused the loss. |
| Catastrophe model | A simulation of hazard, exposure and vulnerability that estimates insured losses from events such as storms or earthquakes. |
| Payment integrity | Making sure claims are paid correctly, with the right codes, amounts and no duplicates. |
| Unbundling | Billing separately for services that should be billed as one procedure. |
| Deposit beta | How much of a change in the policy rate the bank passes on to depositors. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
