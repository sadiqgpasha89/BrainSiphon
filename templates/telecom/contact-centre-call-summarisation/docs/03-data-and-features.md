# Contact-Centre Call Summarisation & Wrap-up: data and feature specification

> Generated from the blueprint `telecom/contact-centre-call-summarisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Contact-Centre Call Summarisation & Wrap-up · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Contact-Centre Call Summarisation & Wrap-up": Produce an accurate summary, reason code and next action for each care contact so agents spend less time on wrap-up and records are consistent. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Scoring on fluency.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Transcript coverage | share of audio transcribed with confidence | Quality gate | Low confidence needs review |   |   |   |
| Reason code agreement | agreement between predicted and agent-coded reasons | Training signal | Use corrected codes |   |   |   |
| Commitment detection | promises such as callbacks made in the call | Follow-up tasks | Verify with the agent |   |   |   |
| Sentiment shift | change in tone across the call | Escalation hint | Not for agent scoring |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Faithfulness | A summary that only states what was said | A fluent invention | Invented promises create liabilities |
| Structure | Fixed fields for reason, resolution and follow-up | A free paragraph | Structured fields feed analytics |
| Privacy | Redacted sensitive tokens before the model | Raw transcript to the model | Card numbers and passwords leak |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Call length | not quality |
| Agent name | irrelevant |
| Background noise level | an audio artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Transcript coverage inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: low confidence needs review. |
| Reason code agreement inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: use corrected codes. |
| Commitment detection inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: verify with the agent. |
| Sentiment shift inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: not for agent scoring. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: contact_centre_call_summarisation_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: transcript_coverage, type: double, nullable: false }
    - { name: reason_code_agreement, type: double, nullable: false }
    - { name: commitment_detection, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Transcript coverage and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Reason code agreement against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Transcript coverage, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| GoEmotions | https://github.com/google-research/google-research/tree/master/goemotions | Apache 2.0 (see the repository) | 58,000 Reddit comments labelled with 27 emotion categories | Reddit language; label subjectivity. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon Reviews 2023 | https://amazon-reviews-2023.github.io/ | Research terms on the project page | Hundreds of millions of product reviews with item metadata across categories | Very large; consumer-review language and bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE contact_centre_call_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE contact_centre_call_fields (
  document_id TEXT NOT NULL REFERENCES contact_centre_call_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE contact_centre_call_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Contact-Centre Call Summarisation & Wrap-up": Produce an accurate summary, reason code and next action for each care contact so agents spend less time on wrap-up and records are consistent. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Network quality is not customer experience | Customers feel video stalls, call quality, slow pages and failed activations, which depend on the end-to-end path and the device and not just on cell KPIs. Care contacts and surveys lag the experience by days. | Optimising network KPIs alone can leave the customers who complain unchanged. |
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Transcript coverage | Share of audio transcribed with confidence. Quality gate. | Leakage risk to design against: Low confidence needs review. |
| A signal-versus-noise trap in this use case: Faithfulness | The true signal is a summary that only states what was said; the common noise is a fluent invention. | Invented promises create liabilities. |

**Ask the experts**

- [ ] What exactly does "Summary generated from the transcript and customer record only" mean in practice for contact-centre call summarisation & wrap-up: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Transcript coverage" and "Reason code agreement", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "After-call work time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: scoring on fluency, and who can confirm the cut-off times and splits?
- [ ] How often does "Accent and noise" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| CDR | Call detail record: a record of a call or data session used for billing and analytics. |
| QoS | Quality of service: measurable network performance such as latency, loss and throughput. |
| SLA | Service level agreement: the availability or performance a provider commits to. |
| VoLTE | Voice over LTE: voice calls carried over the 4G data network. |
| RAN | Radio access network: the cell sites and radio equipment that connect devices to the network. |
| BSS | Business support systems: customer-facing systems such as ordering, billing and customer management. |
| Churn | The share of subscribers who leave in a period. |
| QoE | Quality of experience: how good a service feels to the user, such as video smoothness. |
| SIM swap | Moving a number to a new SIM, a step abused in account takeover. |
| Provisioning | Configuring the network and systems so a purchased service works. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Paraphrase robustness | A model giving the same answer to differently worded versions of the same text. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
