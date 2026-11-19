# SOC Investigation Copilot: data and feature specification

> Generated from the blueprint `cybersecurity/soc-copilot-llm-investigation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SOC Investigation Copilot · **Domain:** cybersecurity · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "SOC Investigation Copilot": Accelerate investigations by letting an agent gather evidence from SIEM, EDR and identity tools and propose verdicts with cited queries. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Replay set includes cases used for prompt tuning.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Evidence link rate | share of claims with log references | Lets an analyst verify a verdict in seconds instead of re-investigating | Check that each link points at a line that really contains the indicator |   |   |   |
| Query success and retry count | tool failures per case | Shows whether the agent can be relied on when backends misbehave | Log every call, failure and retry with the case id |   |   |   |
| Verdict agreement with senior analysts | share of verdicts that match senior analysts reviewing blind | Measures whether verdicts match what experienced analysts would conclude | Reviewers must not see the agent's verdict before deciding |   |   |   |
| Injection success rate | share of poisoned cases where the agent changes its verdict or acts | Tests the defence directly instead of assuming it works | Build the attack set from real log fields and file names, and keep it out of tuning |   |   |   |
| Unsupported escalation rate | cases escalated because evidence was missing, split by cause | Separates honest uncertainty from tool outages and noisy data | Track whether the share rises after a log pipeline change |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Tools | Typed, least-privilege query tools | Free-form shell access | Free-form access enables injection-driven damage |
| Evidence | Every claim linked to a log line | Narrative explanations with no linked evidence | Analysts need to verify quickly |
| Escalation | Escalating to a human when evidence is missing or a tool fails | Writing a fluent guess to fill the gap | A confident wrong benign verdict lets a live attack continue unnoticed |
| Evaluation | Replay of held-out cases with known ground truth and planted attacks on the agent | Analyst satisfaction and demo cases | Cases used for prompt tuning flatter every metric |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Narrative length | not quality |
| Model confidence phrasing | uncalibrated |
| Count of tools called per case | rewards activity rather than correct, well-supported verdicts |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Evidence link rate inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: check that each link points at a line that really contains the indicator. |
| Query success and retry count inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: log every call, failure and retry with the case id. |
| Verdict agreement with senior analysts inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: reviewers must not see the agent's verdict before deciding. |
| Injection success rate inputs | Detection engineering | SIEM and security data lake | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: build the attack set from real log fields and file names, and keep it out of tuning. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: soc_copilot_llm_investigation_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: evidence_link_rate, type: double, nullable: false }
    - { name: query_success_and_retry_count, type: double, nullable: false }
    - { name: verdict_agreement_with_senior_analysts, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Evidence link rate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Query success and retry count against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Evidence link rate, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms in the repository; free to use for training and research, check before redistribution | A large corpus of realistic security logs from a simulated enterprise attack, with the published question set that tells you what the attack contained | One scenario in Splunk format; the questions give ground truth for the attack but not for benign alerts, so you must build the benign cases yourself |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence per the repository; see its LICENSE file | Pre-recorded telemetry for individual attack techniques (PowerShell, credential access, lateral movement) mapped to MITRE ATT&CK, ideal for building case logs | Lab-generated attack telemetry with little benign background; mix it with normal activity before evaluating |
| LANL Comprehensive Multi-Source Cyber-Security Events | https://csr.lanl.gov/data/cyber1/ | Released for research by Los Alamos National Laboratory; see the page for terms | 58 days of authentication, process, network flow and DNS events from an enterprise network with a labelled red-team subset | Anonymised and very large; red-team labels are sparse, so use it to build realistic background and a few labelled attacks |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE soc_copilot_llm_investigation_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE soc_copilot_llm_investigation_steps (
  task_id TEXT NOT NULL REFERENCES soc_copilot_llm_investigation_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE soc_copilot_llm_investigation_approvals (
  task_id TEXT NOT NULL REFERENCES soc_copilot_llm_investigation_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| The SOC workflow and its tools | Detections come from a SIEM (collects and correlates logs), EDR (monitors endpoints) and other sensors. Analysts triage the alert, investigate by querying logs and context, and escalate or close it; responders contain and remediate. SOAR tools automate fixed playbooks. Teams measure mean time to detect and respond, and the queue never empties. | The agent has to fit this process, speak its vocabulary and leave an audit trail analysts and auditors can follow. |
| What an alert verdict means | A true positive is a real malicious event, a false positive is a mistaken detection and a benign true positive is a correct detection of authorised activity, such as a pentest or an administrator's script. Closing an alert as benign without evidence is the most dangerous mistake, because an active attack then goes unnoticed. | Define verdicts with the SOC. Ground truth for evaluation must come from analyst conclusions backed by cited log lines, not satisfaction scores. |
| Evidence and context | Decisions rest on logs (process, authentication, network, DNS), threat intelligence about addresses and files, asset criticality, and identity context such as whether a user is travelling. Logs have retention limits, clock differences and gaps, and the same behaviour can be malicious or benign depending on context, for example encoded PowerShell from a document versus from a management agent. | An agent that cannot get the deciding evidence must say so and escalate, not infer. |
| ATT&CK and attacker behaviour | MITRE ATT&CK catalogues attacker tactics and techniques, such as PowerShell execution (T1059.001), valid accounts (T1078), brute force (T1110), application-layer command and control (T1071) and exfiltration over alternative protocols (T1048). Analysts reason about behaviour chains, not isolated indicators. | Use technique names so verdicts are comparable and testable, and build replay cases from real technique telemetry. |
| Untrusted data and prompt injection | Attackers control some fields that end up in logs, such as file names, user agents, command lines and email subjects. An LLM reading them can be tricked into following instructions hidden in them. The defence is structural: least-privilege typed tools, allow-lists, approval gates for any response action, and treating all tool output as data. | A filter for suspicious phrases is only an alarm. Safety must hold even when the model is fooled. |
| Accountability and governance | SOC decisions can trigger account lockouts, host isolation and breach notifications with legal deadlines. Humans stay accountable, every tool call is logged immutably, and the data may be subject to residency and privacy rules. | Auto-containment is rarely acceptable, and regulators and customers will ask who decided and on what evidence. |

**Ask the experts**

- [ ] Which alert types take most analyst time, and what exact evidence do analysts use to close each one?
- [ ] Which response actions exist, which need approval and who can approve them?
- [ ] Which log sources, retention periods and clock-sync problems affect investigations, and where are the known blind spots?
- [ ] Which closed cases and near misses can form the replay set, and who can supply the analysts' verdicts and cited evidence?
- [ ] What may an AI system see and where may it run: personal data in logs, data residency and approved model providers?

**Glossary**

| Term | Definition |
|---|---|
| SIEM | Security information and event management: a platform that collects, correlates and searches security logs. |
| EDR | Endpoint detection and response: software on devices that records activity and can isolate a host. |
| SOAR | Security orchestration, automation and response: tools that run scripted playbooks for alerts. |
| IOC | Indicator of compromise: an observable such as an IP address, file hash or domain linked to malicious activity. |
| TTP | Tactics, techniques and procedures: how an attacker operates, more durable than a single indicator. |
| MITRE ATT&CK | A public knowledge base of adversary tactics and techniques used to describe and label detections. |
| C2 / beaconing | Command and control traffic, often a compromised host contacting an attacker's server at regular intervals. |
| Lateral movement | An attacker moving from one compromised system to others inside the network. |
| Exfiltration | Stealing data out of the network, sometimes hidden inside DNS or web traffic. |
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| Benign true positive | A correct detection of activity that is authorised, such as a scheduled scan or administrator task. |
| Triage | The first quick assessment of an alert to decide whether it needs investigation. |
| Escalation | Passing a case to a more senior analyst or team because it needs deeper investigation or action. |
| Containment | Actions that limit an attack's spread, such as isolating a host or disabling an account. |
| Threat intelligence | Information about attackers, infrastructure and tools, including reputation of addresses and domains. |
| Impossible travel | Logins for one account from places too far apart to travel between in the elapsed time. |
| Credential stuffing / brute force | Trying many passwords or leaked credential pairs against accounts until one works. |
| DNS tunnelling | Hiding data in DNS queries, often seen as long, random-looking subdomains. |
| MTTD / MTTR | Mean time to detect and mean time to respond, the SOC's headline speed measures. |
| Prompt injection | Text planted in data that an LLM reads which tries to make it follow the attacker's instructions. |
| Least privilege | Giving a system only the access it needs, so a compromised or fooled agent can do little harm. |
