# ED Triage Acuity Assistant: data and feature specification

> Generated from the blueprint `healthcare/emergency-department-triage-nlp` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** ED Triage Acuity Assistant · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "ED Triage Acuity Assistant": Suggest ESI acuity levels from triage notes, vitals and history to reduce under-triage and variability between nurses. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels reflect nurse biases.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Vital-sign abnormality count | number of out-of-range vitals | Acuity | Age-adjusted ranges |   |   |   |
| Chief-complaint risk phrases | embeddings of complaint text | Red-flag symptoms | De-identified notes |   |   |   |
| Arrival mode | ambulance vs walk-in | Acuity prior | Recorded at arrival |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Asymmetry | Under-triage penalised more than over-triage | Symmetric loss | Missing a critical patient is far costlier |
| Inputs | Structured vitals plus chief complaint text | Free text alone | Vitals carry objective deterioration signals |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Triage nurse ID | personal bias |
| Time to triage | operational |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Vital-sign abnormality count inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: age-adjusted ranges. |
| Chief-complaint risk phrases inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: de-identified notes. |
| Arrival mode inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: recorded at arrival. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: emergency_department_triage_nlp_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: vital_sign_abnormality_count, type: double, nullable: false }
    - { name: chief_complaint_risk_phrases, type: double, nullable: false }
    - { name: arrival_mode, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Vital-sign abnormality count and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Chief-complaint risk phrases against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Vital-sign abnormality count, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE emergency_department_triage_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE emergency_department_triage_fields (
  document_id TEXT NOT NULL REFERENCES emergency_department_triage_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE emergency_department_triage_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "ED Triage Acuity Assistant": Suggest ESI acuity levels from triage notes, vitals and history to reduce under-triage and variability between nurses. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Vital-sign abnormality count | Number of out-of-range vitals. Acuity. | Leakage risk to design against: Age-adjusted ranges. |
| A signal-versus-noise trap in this use case: Asymmetry | The true signal is under-triage penalised more than over-triage; the common noise is symmetric loss. | Missing a critical patient is far costlier. |

**Ask the experts**

- [ ] What exactly does "Asymmetric cost (under-triage is worse)" mean in practice for ed triage acuity assistant: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Vital-sign abnormality count" and "Chief-complaint risk phrases", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Under-triage events" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels reflect nurse biases, and who can confirm the cut-off times and splits?
- [ ] How often does "Atypical presentation in women or elderly" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Triage | Sorting patients by urgency to decide who is seen first. |
| Ordinal triage scale | A graded urgency scale in which being wrong by two levels is worse than by one. |
| Vital signs | Routine measurements of heart rate, blood pressure, breathing rate, temperature and oxygen saturation. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Sepsis | Life-threatening organ dysfunction caused by a dysregulated response to infection. |
| SOFA | Sequential Organ Failure Assessment, a score from 0 to 24 summarising the function of six organ systems; a rise of 2 or more signals sepsis. |
| qSOFA | A bedside screen scoring breathing rate of 22 or more, systolic pressure of 100 or less and altered mentation. |
| SIRS | Systemic inflammatory response syndrome: two or more of abnormal temperature, heart rate above 90, breathing rate above 20 or abnormal white cell count. |
| MAP | Mean arterial pressure, the average blood pressure during a heartbeat cycle; below 65 mmHg suggests poor organ perfusion. |
| Lactate | A blood marker of tissue oxygen shortage; above 2 mmol/L is abnormal and above 4 mmol/L is serious. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
