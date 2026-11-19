# DLP Content Classification: data and feature specification

> Generated from the blueprint `cybersecurity/dlp-content-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** DLP Content Classification · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "DLP Content Classification": Classify sensitive content (PII, source code, financial data) in documents and messages to enforce data-loss policies with low false positives. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on synthetic PII.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Pattern with validation | Luhn-valid card numbers, IBAN checksums | Precision | Validators |   |   |   |
| Document type classifier | contract, resume, source code | Sensitivity | Taxonomy |   |   |   |
| Destination risk | external or personal cloud | Exfiltration | Policy |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Context | Content plus context (destination, user role) | Regex pattern matching | Regex flags every 16-digit number |
| Adaptation | Per-tenant tuning from feedback | Global rules | Sensitivity definitions differ by company |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Document author | weak |
| Last modified time | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Pattern with validation inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: validators. |
| Document type classifier inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: taxonomy. |
| Destination risk inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: policy. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: dlp_content_classification_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: pattern_with_validation, type: double, nullable: false }
    - { name: document_type_classifier, type: double, nullable: false }
    - { name: destination_risk, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Pattern with validation and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Document type classifier against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Pattern with validation, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Jigsaw Toxic Comment Classification | https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge | Competition rules; free Kaggle login | 160K Wikipedia comments labelled for several kinds of toxicity | Wikipedia talk pages; labelling bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE dlp_content_classification_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE dlp_content_classification_detections (
  frame_id TEXT NOT NULL REFERENCES dlp_content_classification_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE dlp_content_classification_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "DLP Content Classification": Classify sensitive content (PII, source code, financial data) in documents and messages to enforce data-loss policies with low false positives. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Evidence and context | Decisions rest on logs (process, authentication, network, DNS), threat intelligence about addresses and files, asset criticality, and identity context such as whether a user is travelling. Logs have retention limits, clock differences and gaps, and the same behaviour can be malicious or benign depending on context, for example encoded PowerShell from a document versus from a management agent. | An agent that cannot get the deciding evidence must say so and escalate, not infer. |
| Untrusted data and prompt injection | Attackers control some fields that end up in logs, such as file names, user agents, command lines and email subjects. An LLM reading them can be tricked into following instructions hidden in them. The defence is structural: least-privilege typed tools, allow-lists, approval gates for any response action, and treating all tool output as data. | A filter for suspicious phrases is only an alarm. Safety must hold even when the model is fooled. |
| Securing AI systems themselves | Machine-learning models can be attacked: adversarial inputs, data poisoning, model extraction, prompt injection and over-permissioned agents. Defences include robustness training, rate limits and monitoring, input and output filters, and strict tool permissions. | Any model that reads untrusted input or can take actions needs its own threat model and tests. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Pattern with validation | Luhn-valid card numbers, IBAN checksums. Precision. | Leakage risk to design against: Validators. |
| A signal-versus-noise trap in this use case: Context | The true signal is content plus context (destination, user role); the common noise is regex pattern matching. | Regex flags every 16-digit number. |

**Ask the experts**

- [ ] What exactly does "Inline latency" mean in practice for dlp content classification: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Pattern with validation" and "Document type classifier", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Prevented leaks" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on synthetic PII, and who can confirm the cut-off times and splits?
- [ ] How often does "Test data in staging environments triggers incidents" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| DLP | Data loss prevention: tools that detect and block sensitive data leaving the organisation. |
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| Exfiltration | Stealing data out of the network, sometimes hidden inside DNS or web traffic. |
| Benign true positive | A correct detection of activity that is authorised, such as a scheduled scan or administrator task. |
| Prompt injection | Text planted in data that an LLM reads which tries to make it follow the attacker's instructions. |
| Secret leakage | Credentials or keys committed into code repositories or logs. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| OCR / text detection | Finding and reading text in images. |
| Sensitivity at fixed specificity | The share of true findings caught when false alarms are held to an agreed level. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| p99 latency | The time within which 99% of requests complete. |
