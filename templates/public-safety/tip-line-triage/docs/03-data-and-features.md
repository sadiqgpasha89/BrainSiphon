# Public Tip Line Triage: data and feature specification

> Generated from the blueprint `public-safety/tip-line-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Tip Line Triage · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Public Tip Line Triage": Classify and route tips and reports from the public by topic and urgency so urgent safety information reaches a person immediately and the rest is queued sensibly. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Scoring named people.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Urgency cue score | threats, locations and timing words | Escalation | From text |   |   |   |
| Topic class | fraud, drugs, safety or other | Routing | Classified |   |   |   |
| Specificity | names, places and times given | Actionability | From extraction |   |   |   |
| Duplicate or related tip | similar earlier tips | Linking | From similarity |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Urgency | Potential imminent harm | Topic only | An urgent tip can be on any topic |
| Privacy | Tipster anonymity protected | Identifiable logs | Tipsters will stop reporting |
| Action | Route to the right unit | A verdict about a person | A tip is an unverified claim |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Tipster name | personal data |
| Channel | weak link |
| Message length | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Urgency cue score inputs | Emergency communications | Computer-aided dispatch (CAD) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from text. |
| Topic class inputs | Operations and investigations leadership | Records management and evidence systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: classified. |
| Specificity inputs | Chief data and ethics officer | Court case management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from extraction. |
| Duplicate or related tip inputs | Emergency communications | Computer-aided dispatch (CAD) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from similarity. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: tip_line_triage_inputs.v1
owner: emergency-communications@example.com
system_of_record: Computer-aided dispatch (CAD)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: urgency_cue_score, type: double, nullable: false }
    - { name: topic_class, type: double, nullable: false }
    - { name: specificity, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Urgency cue score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Topic class against Computer-aided dispatch (CAD)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Urgency cue score, traces back to Computer-aided dispatch (CAD); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Customer Support on Twitter | https://www.kaggle.com/datasets/thoughtvector/customer-support-on-twitter | See the dataset page; free Kaggle login | About 3 million tweets and replies between customers and company support accounts | Public social posts; informal language. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE tip_line_triage_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE tip_line_triage_fields (
  document_id TEXT NOT NULL REFERENCES tip_line_triage_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE tip_line_triage_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Public safety covers emergency calls, dispatch, disaster response, road safety, physical security and the courts. Seconds matter, errors cost lives or liberty, and the data describes people at their worst moments, so systems support trained professionals and are built with strict limits on identification, profiling and secondary use. For this use case, "Public Tip Line Triage": Classify and route tips and reports from the public by topic and urgency so urgent safety information reaches a person immediately and the rest is queued sensibly. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Emergency calls are time-critical and noisy | Callers are distressed, speak different languages and describe locations poorly. Call-takers must capture the nature, location and risk fast, and every second before dispatch counts. | Tools should assist capture and triage, with the call-taker retaining authority to dispatch. |
| Records are sensitive and need strict retention | Incident, victim and witness records are among the most sensitive data a state holds. Access is logged, retention limits are enforced and data is shared only as the law allows. | Aggregated and de-identified data should be used for analytics wherever possible. |
| No individual risk scoring and no face identification | Predicting which person will offend or identifying people by face in public spaces raises severe rights and accuracy concerns, and in some places is restricted by law. Analytics here work on places, events, objects and conditions. | Systems that profile or identify people need explicit legal authority and independent oversight, and are outside these blueprints. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Urgency cue score | Threats, locations and timing words. Escalation. | Leakage risk to design against: From text. |
| A signal-versus-noise trap in this use case: Urgency | The true signal is potential imminent harm; the common noise is topic only. | An urgent tip can be on any topic. |

**Ask the experts**

- [ ] What exactly does "Possible imminent danger goes to a person at once" mean in practice for public tip line triage: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Urgency cue score" and "Topic class", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to urgent tip action" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: scoring named people, and who can confirm the cut-off times and splits?
- [ ] How often does "Coded language" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Triage | Sorting incidents by urgency. |
| CAD | Computer-aided dispatch: the system used to record calls and assign units. |
| Response time | The time from call to arrival of help. |
| Evacuation | Moving people out of a danger zone. |
| Hazard | A source of potential harm. |
| E-discovery | Finding and reviewing electronic documents for a case. |
| Redaction | Removing sensitive text from a document. |
| Human in the loop | A person reviews or approves the system's output. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Near-duplicate | A text that is almost identical to another, such as a forwarded email, which leaks across random splits. |
