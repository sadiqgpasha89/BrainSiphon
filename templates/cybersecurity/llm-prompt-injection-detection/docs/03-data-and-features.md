# LLM Prompt-Injection & Jailbreak Detection: data and feature specification

> Generated from the blueprint `cybersecurity/llm-prompt-injection-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** LLM Prompt-Injection & Jailbreak Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "LLM Prompt-Injection & Jailbreak Detection": Detect direct and indirect prompt injection and jailbreaks in LLM application inputs and retrieved content before they reach the model or tools. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Static public jailbreak datasets.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Instruction-likeness of untrusted content | classifier on imperative text in data | Indirect injection | Segmentation |   |   |   |
| Policy violation attempt score | jailbreak taxonomy classifier | Direct attack | Red-team data |   |   |   |
| Tool-call privilege anomaly | call outside user's intent | Exploitation | Intent model |   |   |   |
| Untrusted-source provenance | per-chunk tag: user, retrieved document, email, web page or tool output | Indirect injection | Provenance must be attached at retrieval, not inferred later |   |   |   |
| Outbound-call policy violations | tool calls whose arguments or destinations fall outside the allow-list for the user intent | Exploitation after a successful injection | Allow-lists must derive from the user request, never from model output |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Layers | Layered defences: input classifier, privilege separation, output checks | Prompt-only defences | Classifiers alone are routinely bypassed |
| Indirect | Treat retrieved and tool content as untrusted | Filtering user input only | Most severe attacks arrive in documents and web pages |
| Isolation | Spotlighting untrusted context with random delimiters and a deterministic policy engine on every outbound tool call | A better classifier as the only defence | Adversarial suffixes, base64 and homoglyph encodings and multi-turn crescendo attacks keep bypassing standalone classifiers |
| Exfiltration | Blocking markdown image and link exfiltration and unauthorised API arguments in outbound calls | Scanning only the final text reply | An injected instruction can leak data through a rendered image URL or a tool argument with no visibly malicious text |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Prompt length | weak |
| Language | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Instruction-likeness of untrusted content inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: segmentation. |
| Policy violation attempt score inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: red-team data. |
| Tool-call privilege anomaly inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: intent model. |
| Untrusted-source provenance inputs | Detection engineering | SIEM and security data lake | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: provenance must be attached at retrieval, not inferred later. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: llm_prompt_injection_detection_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: instruction_likeness_of_untrusted, type: double, nullable: false }
    - { name: policy_violation_attempt_score, type: double, nullable: false }
    - { name: tool_call_privilege_anomaly, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Instruction-likeness of untrusted content and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Policy violation attempt score against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Instruction-likeness of untrusted content, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCI Phishing Websites | https://archive.ics.uci.edu/dataset/327/phishing+websites | CC BY 4.0 (see the UCI page) | 11,000 websites with URL and page features and a phishing label | Static features from one period; attackers adapt. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE llm_prompt_injection_detection_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE llm_prompt_injection_detection_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES llm_prompt_injection_detection_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON llm_prompt_injection_detection_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE llm_prompt_injection_detection_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "LLM Prompt-Injection & Jailbreak Detection": Detect direct and indirect prompt injection and jailbreaks in LLM application inputs and retrieved content before they reach the model or tools. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Securing AI systems themselves | Machine-learning models can be attacked: adversarial inputs, data poisoning, model extraction, prompt injection and over-permissioned agents. Defences include robustness training, rate limits and monitoring, input and output filters, and strict tool permissions. | Any model that reads untrusted input or can take actions needs its own threat model and tests. |
| Untrusted data and prompt injection | Attackers control some fields that end up in logs, such as file names, user agents, command lines and email subjects. An LLM reading them can be tricked into following instructions hidden in them. The defence is structural: least-privilege typed tools, allow-lists, approval gates for any response action, and treating all tool output as data. | A filter for suspicious phrases is only an alarm. Safety must hold even when the model is fooled. |
| Evidence and context | Decisions rest on logs (process, authentication, network, DNS), threat intelligence about addresses and files, asset criticality, and identity context such as whether a user is travelling. Logs have retention limits, clock differences and gaps, and the same behaviour can be malicious or benign depending on context, for example encoded PowerShell from a document versus from a management agent. | An agent that cannot get the deciding evidence must say so and escalate, not infer. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Instruction-likeness of untrusted content | Classifier on imperative text in data. Indirect injection. | Leakage risk to design against: Segmentation. |
| A signal-versus-noise trap in this use case: Layers | The true signal is layered defences: input classifier, privilege separation, output checks; the common noise is prompt-only defences. | Classifiers alone are routinely bypassed. |

**Ask the experts**

- [ ] What exactly does "Added latency under 30 ms" mean in practice for llm prompt-injection & jailbreak detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Instruction-likeness of untrusted content" and "Policy violation attempt score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Successful injection incidents" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: static public jailbreak datasets, and who can confirm the cut-off times and splits?
- [ ] How often does "Attack encoded in base64 or another language" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prompt injection | Text planted in data that an LLM reads which tries to make it follow the attacker's instructions. |
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| Benign true positive | A correct detection of activity that is authorised, such as a scheduled scan or administrator task. |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| Exfiltration | Stealing data out of the network, sometimes hidden inside DNS or web traffic. |
| Least privilege | Giving a system only the access it needs, so a compromised or fooled agent can do little harm. |
| SIEM | Security information and event management: a platform that collects, correlates and searches security logs. |
| EDR | Endpoint detection and response: software on devices that records activity and can isolate a host. |
| SOAR | Security orchestration, automation and response: tools that run scripted playbooks for alerts. |
| IOC | Indicator of compromise: an observable such as an IP address, file hash or domain linked to malicious activity. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Context window | The maximum amount of text a model can read at once. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
| Paraphrase robustness | A model giving the same answer to differently worded versions of the same text. |
