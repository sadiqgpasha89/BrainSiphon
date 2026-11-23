# Emergency Call Taker Assist: data and feature specification

> Generated from the blueprint `public-safety/emergency-call-taker-assist` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Emergency Call Taker Assist · **Domain:** public-safety · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Emergency Call Taker Assist": Listen to emergency calls in real time and show call takers a structured list of what has been said and which questions remain, so critical details are captured faster while the call taker decides every action. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Automatic priority setting.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Incident type cues | words and phrases indicating fire, injury or crime | Protocol selection | From speech and text |   |   |   |
| Location mentions | places and landmarks said by the caller | Location prompt | From the transcript |   |   |   |
| Missing protocol questions | required questions not yet asked | Prompt | From the protocol |   |   |   |
| Distress and urgency cues | breathing, shouting and keywords | Attention flag | From audio and text |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Role | A prompt list for the call taker | An automatic classifier that sets priority | Emergencies need human judgement and accountability |
| Label | Fields confirmed by call takers | Transcripts alone | Transcripts contain errors and no outcome |
| Language | Accents, stress and background noise in test data | Clean studio audio | Real calls are noisy and urgent |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Caller name | personal data |
| Call length | weak link |
| Phone model | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Incident type cues inputs | Emergency communications | Computer-aided dispatch (CAD) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: from speech and text. |
| Location mentions inputs | Operations and investigations leadership | Records management and evidence systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the transcript. |
| Missing protocol questions inputs | Chief data and ethics officer | Court case management | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: from the protocol. |
| Distress and urgency cues inputs | Emergency communications | Computer-aided dispatch (CAD) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from audio and text. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: emergency_call_taker_assist_inputs.v1
owner: emergency-communications@example.com
system_of_record: Computer-aided dispatch (CAD)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: incident_type_cues, type: double, nullable: false }
    - { name: location_mentions, type: double, nullable: false }
    - { name: missing_protocol_questions, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Incident type cues and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Location mentions against Computer-aided dispatch (CAD)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Incident type cues, traces back to Computer-aided dispatch (CAD); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon Reviews 2023 | https://amazon-reviews-2023.github.io/ | Research terms on the project page | Hundreds of millions of product reviews with item metadata across categories | Very large; consumer-review language and bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE emergency_call_taker_assist_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE emergency_call_taker_assist_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES emergency_call_taker_assist_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON emergency_call_taker_assist_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE emergency_call_taker_assist_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Public safety covers emergency calls, dispatch, disaster response, road safety, physical security and the courts. Seconds matter, errors cost lives or liberty, and the data describes people at their worst moments, so systems support trained professionals and are built with strict limits on identification, profiling and secondary use. For this use case, "Emergency Call Taker Assist": Listen to emergency calls in real time and show call takers a structured list of what has been said and which questions remain, so critical details are captured faster while the call taker decides every action. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Emergency calls are time-critical and noisy | Callers are distressed, speak different languages and describe locations poorly. Call-takers must capture the nature, location and risk fast, and every second before dispatch counts. | Tools should assist capture and triage, with the call-taker retaining authority to dispatch. |
| Dispatch is a resource allocation problem | Units differ in capability, position and availability, and demand is uneven across place and time. Good dispatch balances fast response with coverage for the next call. | Sending the nearest unit each time can leave an area uncovered, so coverage must be modelled. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Incident type cues | Words and phrases indicating fire, injury or crime. Protocol selection. | Leakage risk to design against: From speech and text. |
| A signal-versus-noise trap in this use case: Role | The true signal is a prompt list for the call taker; the common noise is an automatic classifier that sets priority. | Emergencies need human judgement and accountability. |

**Ask the experts**

- [ ] What exactly does "Prompts appear within 2 s of speech" mean in practice for emergency call taker assist: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Incident type cues" and "Location mentions", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to capture the address" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: automatic priority setting, and who can confirm the cut-off times and splits?
- [ ] How often does "Heavy accent" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| CAD | Computer-aided dispatch: the system used to record calls and assign units. |
| PSAP | Public safety answering point: the centre that answers emergency calls. |
| Call-taker | The person who answers an emergency call. |
| NG911 | Next-generation emergency calling over IP networks. |
| Triage | Sorting incidents by urgency. |
| Response time | The time from call to arrival of help. |
| Dispatch protocol | A scripted set of questions that decides the response level. |
| ANI and ALI | Caller number and location information delivered with a call. |
| Human in the loop | A person reviews or approves the system's output. |
| Victim support | Services that help people harmed by crime. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Word error rate (WER) | Errors in recognised speech divided by the number of reference words. |
| CTC loss | A loss that aligns a signal such as audio or a line image to its text without frame labels. |
| Structured output | Constraining a model to produce valid JSON or SQL against a schema. |
| Latency budget | The time allowed for a response, split across retrieval, generation and checks. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| p99 latency | The time within which 99% of requests complete. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
