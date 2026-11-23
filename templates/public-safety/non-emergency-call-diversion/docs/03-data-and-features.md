# Non-Emergency Call Diversion: data and feature specification

> Generated from the blueprint `public-safety/non-emergency-call-diversion` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Non-Emergency Call Diversion · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Non-Emergency Call Diversion": Identify calls that are not emergencies and offer other channels or services, while ensuring that any doubt goes to a call taker. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Forced diversion.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Emergency keyword and cue score | words and tones suggesting danger | Safety gate | From speech and text |   |   |   |
| Caller request type | information, report or complaint | Route | Classified |   |   |   |
| Service availability | open alternative services | Option | From directories |   |   |   |
| Language and confidence | language and transcript confidence | Reliability | From ASR |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Safety | A very high recall of emergencies | Average accuracy | One missed emergency is unacceptable |
| Choice | The caller can always ask for a person | Forced diversion | Forced diversion harms people who need help |
| Fairness | Equal diversion rates and errors across languages | Only English tested | Errors fall on some communities |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Caller name | personal data |
| Time of day | weak link |
| Phone model | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Emergency keyword and cue score inputs | Emergency communications | Computer-aided dispatch (CAD) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from speech and text. |
| Caller request type inputs | Operations and investigations leadership | Records management and evidence systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: classified. |
| Service availability inputs | Chief data and ethics officer | Court case management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from directories. |
| Language and confidence inputs | Emergency communications | Computer-aided dispatch (CAD) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from ASR. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: non_emergency_call_diversion_inputs.v1
owner: emergency-communications@example.com
system_of_record: Computer-aided dispatch (CAD)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: emergency_keyword_and_cue_score, type: double, nullable: false }
    - { name: caller_request_type, type: double, nullable: false }
    - { name: service_availability, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Emergency keyword and cue score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Caller request type against Computer-aided dispatch (CAD)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Emergency keyword and cue score, traces back to Computer-aided dispatch (CAD); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| FinancialPhraseBank | https://huggingface.co/datasets/takala/financial_phrasebank | CC BY-NC-SA 3.0 (see the page) | About 4,800 financial news sentences labelled positive, neutral or negative | Small and sentence-level; limited to financial news. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon Reviews 2023 | https://amazon-reviews-2023.github.io/ | Research terms on the project page | Hundreds of millions of product reviews with item metadata across categories | Very large; consumer-review language and bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE non_emergency_call_diversion_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE non_emergency_call_diversion_fields (
  document_id TEXT NOT NULL REFERENCES non_emergency_call_diversion_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE non_emergency_call_diversion_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Public safety covers emergency calls, dispatch, disaster response, road safety, physical security and the courts. Seconds matter, errors cost lives or liberty, and the data describes people at their worst moments, so systems support trained professionals and are built with strict limits on identification, profiling and secondary use. For this use case, "Non-Emergency Call Diversion": Identify calls that are not emergencies and offer other channels or services, while ensuring that any doubt goes to a call taker. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Emergency calls are time-critical and noisy | Callers are distressed, speak different languages and describe locations poorly. Call-takers must capture the nature, location and risk fast, and every second before dispatch counts. | Tools should assist capture and triage, with the call-taker retaining authority to dispatch. |
| Road safety depends on exposure and context | Crash risk depends on road design, speed, traffic, weather and user mix, and crashes are rare events. Analysis works at the location and segment level and avoids singling out drivers. | Targeting individuals from location history raises privacy and fairness concerns. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Emergency keyword and cue score | Words and tones suggesting danger. Safety gate. | Leakage risk to design against: From speech and text. |
| A signal-versus-noise trap in this use case: Safety | The true signal is a very high recall of emergencies; the common noise is average accuracy. | One missed emergency is unacceptable. |

**Ask the experts**

- [ ] What exactly does "Any call that might be an emergency stays with a call taker" mean in practice for non-emergency call diversion: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Emergency keyword and cue score" and "Caller request type", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Non-emergency calls to call takers" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: forced diversion, and who can confirm the cut-off times and splits?
- [ ] How often does "Hidden emergency" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| PSAP | Public safety answering point: the centre that answers emergency calls. |
| Call-taker | The person who answers an emergency call. |
| NG911 | Next-generation emergency calling over IP networks. |
| Response time | The time from call to arrival of help. |
| CAD | Computer-aided dispatch: the system used to record calls and assign units. |
| Evacuation | Moving people out of a danger zone. |
| Hazard | A source of potential harm. |
| Victim support | Services that help people harmed by crime. |
| Emergency operations centre | A centre that coordinates the response to major events. |
| Word error rate (WER) | Errors in recognised speech divided by the number of reference words. |
| CTC loss | A loss that aligns a signal such as audio or a line image to its text without frame labels. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
