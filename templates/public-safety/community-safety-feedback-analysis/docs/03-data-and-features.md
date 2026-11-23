# Community Safety Feedback Analysis: data and feature specification

> Generated from the blueprint `public-safety/community-safety-feedback-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Community Safety Feedback Analysis · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Community Safety Feedback Analysis": Group and summarise residents' safety concerns from surveys, meetings and reports by theme and area with quotes linked to the source, so priorities reflect community voices. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Single summaries.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Theme assignment | which theme a comment belongs to | Grouping | From clustering |   |   |   |
| Area aggregate | counts by area | Priority | Aggregated |   |   |   |
| Duplicate and campaign detection | near-identical comments | Weighting | From similarity |   |   |   |
| Sentiment and stance | support, concern or neutral | Position | From the classifier |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Method | Transparent themes with counts and examples | A single summary | A summary can hide minority views |
| Fairness | Equal weight to each respondent | Weighting by volume | Organised groups can flood channels |
| Privacy | Redacted comments | Named analysis | Names deter participation |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Respondent name | personal data |
| Comment length | weak link |
| Channel alone | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Theme assignment inputs | Emergency communications | Computer-aided dispatch (CAD) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from clustering. |
| Area aggregate inputs | Operations and investigations leadership | Records management and evidence systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: aggregated. |
| Duplicate and campaign detection inputs | Chief data and ethics officer | Court case management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from similarity. |
| Sentiment and stance inputs | Emergency communications | Computer-aided dispatch (CAD) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the classifier. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: community_safety_feedback_analysis_inputs.v1
owner: emergency-communications@example.com
system_of_record: Computer-aided dispatch (CAD)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: theme_assignment, type: double, nullable: false }
    - { name: area_aggregate, type: double, nullable: false }
    - { name: duplicate_and_campaign_detection, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Theme assignment and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Area aggregate against Computer-aided dispatch (CAD)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Theme assignment, traces back to Computer-aided dispatch (CAD); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| IBM Project CodeNet | https://github.com/IBM/Project_CodeNet | CDLA-Permissive 2.0 (see the repository) | 14 million code submissions across 55 languages with problem and verdict metadata | Competitive-programming style, not course assignments. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RACE reading comprehension | https://www.cs.cmu.edu/~glai1/data/race/ | Research use (see the page) | About 28,000 passages and 100,000 exam questions from English exams for Chinese students | Exam questions, one population. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE community_safety_feedback_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE community_safety_feedback_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES community_safety_feedback_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON community_safety_feedback_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE community_safety_feedback_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Public safety covers emergency calls, dispatch, disaster response, road safety, physical security and the courts. Seconds matter, errors cost lives or liberty, and the data describes people at their worst moments, so systems support trained professionals and are built with strict limits on identification, profiling and secondary use. For this use case, "Community Safety Feedback Analysis": Group and summarise residents' safety concerns from surveys, meetings and reports by theme and area with quotes linked to the source, so priorities reflect community voices. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Records are sensitive and need strict retention | Incident, victim and witness records are among the most sensitive data a state holds. Access is logged, retention limits are enforced and data is shared only as the law allows. | Aggregated and de-identified data should be used for analytics wherever possible. |
| Emergency calls are time-critical and noisy | Callers are distressed, speak different languages and describe locations poorly. Call-takers must capture the nature, location and risk fast, and every second before dispatch counts. | Tools should assist capture and triage, with the call-taker retaining authority to dispatch. |
| Road safety depends on exposure and context | Crash risk depends on road design, speed, traffic, weather and user mix, and crashes are rare events. Analysis works at the location and segment level and avoids singling out drivers. | Targeting individuals from location history raises privacy and fairness concerns. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Theme assignment | Which theme a comment belongs to. Grouping. | Leakage risk to design against: From clustering. |
| A signal-versus-noise trap in this use case: Method | The true signal is transparent themes with counts and examples; the common noise is a single summary. | A summary can hide minority views. |

**Ask the experts**

- [ ] What exactly does "Every theme links to example comments" mean in practice for community safety feedback analysis: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Theme assignment" and "Area aggregate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Analysis time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: single summaries, and who can confirm the cut-off times and splits?
- [ ] How often does "Campaign flood" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Redaction | Removing sensitive text from a document. |
| Flood extent | The area covered by floodwater. |
| Vision Zero | A strategy to eliminate road deaths and serious injuries. |
| Victim support | Services that help people harmed by crime. |
| Triage | Sorting incidents by urgency. |
| Response time | The time from call to arrival of help. |
| Station coverage | How well stations can reach an area in the target time. |
| Evacuation | Moving people out of a danger zone. |
| Hazard | A source of potential harm. |
| Damage assessment | Estimating the harm after a disaster. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| Abstention | Declining to answer because the evidence is missing. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
