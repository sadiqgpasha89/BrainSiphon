# Care-Team Message Routing & Escalation: data and feature specification

> Generated from the blueprint `healthcare/care-team-message-routing-escalation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Care-Team Message Routing & Escalation · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Care-Team Message Routing & Escalation": Recommend the correct role or team for a message using specialty, location, patient-care relationship, on-call roster and escalation policy, with a fallback route, an acknowledgement timer and a defined escalation chain. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting the model pick the recipient.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Intent class | classified request type such as medication question, result follow-up or logistics | Chooses the policy route | Message text |   |   |   |
| Care-team relationship | roles assigned to the patient and the unit | Finds the accountable role | Assignment records |   |   |   |
| On-call and service hours | who is on call and whether the service is open | Valid recipient at send time | Roster snapshot |   |   |   |
| Acknowledgement history | past acknowledgement times for the target role and queue | Sets the timer | Earlier periods |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Rules | Policy rules and the live roster decide the recipient | Model chooses the recipient | The roster is a fact not a prediction |
| Intent | Classifier labels the request type | Keyword routing | Wording varies widely |
| Fallback | Defined fallback and escalation chain | Single recipient | The first recipient may be unavailable |
| Context | Patient care-team and location context | Message text alone | The right recipient depends on who cares for the patient |
| Correction | Sender can redirect | Locked routing | Wrong routes must be fixable |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Message length | not routing |
| Sender seniority | not a routing factor |
| Channel alone | not intent |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Intent class inputs | Clinical operations | Secure messaging platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: message text. |
| Care-team relationship inputs | Nursing leadership | Care-team assignment records | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: assignment records. |
| On-call and service hours inputs | Clinical informatics | On-call and roster system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: roster snapshot. |
| Acknowledgement history inputs | Patient safety | Routing and escalation policy register | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: earlier periods. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: care_team_message_routing_escalation_inputs.v1
owner: clinical-operations@example.com
system_of_record: Secure messaging platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: intent_class, type: double, nullable: false }
    - { name: care_team_relationship, type: double, nullable: false }
    - { name: on_call_and_service_hours, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Intent class and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Care-team relationship against Secure messaging platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Intent class, traces back to Secure messaging platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Banking77 intent dataset | https://huggingface.co/datasets/PolyAI/banking77 | CC BY 4.0 (see the page) | 13,000 customer banking queries labelled with 77 intents | Short single-turn queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE care_team_message_routing_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE care_team_message_routing_fields (
  document_id TEXT NOT NULL REFERENCES care_team_message_routing_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE care_team_message_routing_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Care-Team Message Routing & Escalation": Recommend the correct role or team for a message using specialty, location, patient-care relationship, on-call roster and escalation policy, with a fallback route, an acknowledgement timer and a defined escalation chain. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Population health, risk and fairness | Health systems stratify patients by risk to allocate care management, and predict readmissions, cost and chronic disease progression. Cost is not need: a model that predicts spending can underserve groups who historically had less access to care. | Choose targets that measure health need, and audit performance across demographic groups. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Intent class | Classified request type such as medication question, result follow-up or logistics. Chooses the policy route. | Leakage risk to design against: Message text. |
| A signal-versus-noise trap in this use case: Rules | The true signal is policy rules and the live roster decide the recipient; the common noise is model chooses the recipient. | The roster is a fact not a prediction. |

**Ask the experts**

- [ ] What exactly does "The sender can correct any routing and the platform keeps every acknowledgement and escalation in an audit trail" mean in practice for care-team message routing & escalation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Intent class" and "Care-team relationship", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to acknowledgement" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: letting the model pick the recipient, and who can confirm the cut-off times and splits?
- [ ] How often does "Roster not yet updated" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Triage | Sorting patients by urgency to decide who is seen first. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Care management | Programmes that give extra support to high-risk patients, which risk models are used to target. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Medication adherence | Whether patients take medicines as prescribed. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
