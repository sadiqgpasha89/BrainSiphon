# Voice Deepfake & Vishing Detection: data and feature specification

> Generated from the blueprint `cybersecurity/voice-deepfake-and-vishing-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Voice Deepfake & Vishing Detection · **Domain:** cybersecurity · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Voice Deepfake & Vishing Detection": Detect synthetic or cloned voices and social-engineering call patterns in contact-centre and enterprise calls in near real time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test deepfakes from the same generators as training.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Spectral artefact score | model on spectral and phase features | Synthesis traces | Codec simulation |   |   |   |
| Social-engineering intent | urgency, secrecy and payment requests | Fraud script | Transcript |   |   |   |
| Caller-ID and call-path anomaly | spoofing indicators | Spoofing | STIR/SHAKEN data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Channel | Train on codec-degraded telephony audio | Studio-quality datasets | Models trained on clean audio fail on phone lines |
| Behaviour | Combine voice artefacts with conversation intent signals | Voice-only classifier | New TTS systems evade artefact detectors quickly |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Call duration | weak |
| Background noise level | channel |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Spectral artefact score inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: codec simulation. |
| Social-engineering intent inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: transcript. |
| Caller-ID and call-path anomaly inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: STIR/SHAKEN data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: voice_deepfake_and_vishing_detection_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: spectral_artefact_score, type: double, nullable: false }
    - { name: social_engineering_intent, type: double, nullable: false }
    - { name: caller_id_and_call_path_anomaly, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Spectral artefact score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Social-engineering intent against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Spectral artefact score, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Mozilla Common Voice | https://commonvoice.mozilla.org/en/datasets | CC0 (see the page) | Crowd-sourced speech recordings with transcripts in many languages | Read speech; accents and noise vary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE voice_deepfake_and_vishing_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  spectral_artefact_score            DOUBLE PRECISION,
  social_engineering_intent          DOUBLE PRECISION,
  caller_id_and_call_path_anomaly    DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE voice_deepfake_and_vishing_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE voice_deepfake_and_vishing_labels (
  decision_id    UUID        NOT NULL REFERENCES voice_deepfake_and_vishing_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Voice Deepfake & Vishing Detection": Detect synthetic or cloned voices and social-engineering call patterns in contact-centre and enterprise calls in near real time. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Email, phishing and social engineering | Phishing and business email compromise exploit people, not software: lookalike domains, urgent payment requests, impersonation. Detection combines URL and content analysis, sender reputation and relationship graphs, and voice or video deepfakes extend the problem. | The highest-cost attacks are rare and well-crafted, so evaluation weights loss amount, not email count. |
| Securing AI systems themselves | Machine-learning models can be attacked: adversarial inputs, data poisoning, model extraction, prompt injection and over-permissioned agents. Defences include robustness training, rate limits and monitoring, input and output filters, and strict tool permissions. | Any model that reads untrusted input or can take actions needs its own threat model and tests. |
| What an alert verdict means | A true positive is a real malicious event, a false positive is a mistaken detection and a benign true positive is a correct detection of authorised activity, such as a pentest or an administrator's script. Closing an alert as benign without evidence is the most dangerous mistake, because an active attack then goes unnoticed. | Define verdicts with the SOC. Ground truth for evaluation must come from analyst conclusions backed by cited log lines, not satisfaction scores. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Spectral artefact score | Model on spectral and phase features. Synthesis traces. | Leakage risk to design against: Codec simulation. |
| A signal-versus-noise trap in this use case: Channel | The true signal is train on codec-degraded telephony audio; the common noise is studio-quality datasets. | Models trained on clean audio fail on phone lines. |

**Ask the experts**

- [ ] What exactly does "Telephony codecs and 8 kHz audio" mean in practice for voice deepfake & vishing detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Spectral artefact score" and "Social-engineering intent", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Vishing losses" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test deepfakes from the same generators as training, and who can confirm the cut-off times and splits?
- [ ] How often does "New TTS model release" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| Benign true positive | A correct detection of activity that is authorised, such as a scheduled scan or administrator task. |
| Prompt injection | Text planted in data that an LLM reads which tries to make it follow the attacker's instructions. |
| NIDS / IDS | Network intrusion detection system: monitors traffic for attacks and policy violations. |
| Ransomware | Malware that encrypts files and demands payment for the key. |
| YARA / Sigma | Rule languages for describing malware patterns (YARA) and log-based detections (Sigma). |
| UEBA | User and entity behaviour analytics: detecting deviations from a person's or device's normal behaviour. |
| Honeypot | A decoy system built to attract and study attackers. |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Robust z-score | A deviation measure using the median and median absolute deviation, which outliers do not distort. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
