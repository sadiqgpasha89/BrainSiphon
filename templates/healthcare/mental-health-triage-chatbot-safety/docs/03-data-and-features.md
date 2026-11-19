# Mental-Health Support Chatbot with Safety Triage: data and feature specification

> Generated from the blueprint `healthcare/mental-health-triage-chatbot-safety` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Mental-Health Support Chatbot with Safety Triage · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Mental-Health Support Chatbot with Safety Triage": Provide supportive, evidence-based conversations while detecting crisis signals and escalating to humans immediately and safely. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Red-team set written by builders only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Crisis-risk classifier score | calibrated risk of self-harm intent | Escalation trigger | Tune for high recall |   |   |   |
| Conversation risk trajectory | change in risk over the session | Slow-burn crises | Windowed |   |   |   |
| Policy adherence rate | fraction of replies within guidelines | Quality | Red-team sets |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Safety | Separate safety classifier with hard overrides | Relying on the LLM's own judgement | Models can be talked out of safety behaviour |
| Scope | Supportive skills (CBT-style) within guard rails | Open-ended therapy claims | Unvalidated therapy claims risk harm |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Chat sentiment average | not risk |
| Response friendliness rating | not safety |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Crisis-risk classifier score inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: tune for high recall. |
| Conversation risk trajectory inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: windowed. |
| Policy adherence rate inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: red-team sets. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: mental_health_triage_chatbot_safety_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: crisis_risk_classifier_score, type: double, nullable: false }
    - { name: conversation_risk_trajectory, type: double, nullable: false }
    - { name: policy_adherence_rate, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Crisis-risk classifier score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Conversation risk trajectory against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Crisis-risk classifier score, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Customer Support on Twitter | https://www.kaggle.com/datasets/thoughtvector/customer-support-on-twitter | See the dataset page; free Kaggle login | About 3 million tweets and replies between customers and company support accounts | Public social posts; informal language. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Banking77 intent dataset | https://huggingface.co/datasets/PolyAI/banking77 | CC BY 4.0 (see the page) | 13,000 customer banking queries labelled with 77 intents | Short single-turn queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE mental_health_triage_chatbot_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE mental_health_triage_chatbot_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES mental_health_triage_chatbot_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON mental_health_triage_chatbot_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE mental_health_triage_chatbot_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Mental-Health Support Chatbot with Safety Triage": Provide supportive, evidence-based conversations while detecting crisis signals and escalating to humans immediately and safely. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Crisis-risk classifier score | Calibrated risk of self-harm intent. Escalation trigger. | Leakage risk to design against: Tune for high recall. |
| A signal-versus-noise trap in this use case: Safety | The true signal is separate safety classifier with hard overrides; the common noise is relying on the LLM's own judgement. | Models can be talked out of safety behaviour. |

**Ask the experts**

- [ ] What exactly does "Crisis detection recall above 99% on high-risk cases" mean in practice for mental-health support chatbot with safety triage: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Crisis-risk classifier score" and "Conversation risk trajectory", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Appropriate escalation rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: red-team set written by builders only, and who can confirm the cut-off times and splits?
- [ ] How often does "Indirect or coded crisis language" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Mental health crisis | A situation, such as suicidal intent, that needs immediate human escalation rather than automated advice. |
| Triage | Sorting patients by urgency to decide who is seen first. |
| Ordinal triage scale | A graded urgency scale in which being wrong by two levels is worse than by one. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Sensitivity / specificity | The share of true cases caught and the share of healthy cases correctly cleared. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| EMS response time | The time from an emergency call to an ambulance arriving, a key service measure. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Medication adherence | Whether patients take medicines as prescribed. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Abstention | Declining to answer because the evidence is missing. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Token cost | The price of a model call, proportional to input and output tokens. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
| Guardrail metric | A metric that must not get worse when optimising the main objective. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
