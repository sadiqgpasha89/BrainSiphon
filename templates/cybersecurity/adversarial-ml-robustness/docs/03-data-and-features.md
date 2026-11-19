# Adversarial Robustness for Deployed Models: data and feature specification

> Generated from the blueprint `cybersecurity/adversarial-ml-robustness` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Adversarial Robustness for Deployed Models · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Adversarial Robustness for Deployed Models": Measure and improve robustness of production classifiers (fraud, malware, vision) to evasion, poisoning and extraction attacks. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Non-adaptive attacks only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Robust accuracy under constrained attack | accuracy under domain attack | Resilience | Attack realism |   |   |   |
| Decision margin distribution | margins on validation | Fragility | Calibration |   |   |   |
| Poisoning sensitivity | effect of injected samples | Training risk | Simulation |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Threat model | Constraints realistic to the domain (valid emails, valid files) | Pixel Lp-ball attacks on tabular models | Unrealistic attacks mislead robustness estimates |
| Evaluation | Adaptive attacks | Fixed benchmark attacks | Defences fail against adaptive attackers |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Clean accuracy alone | hides vulnerability |
| Model size | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Robust accuracy under constrained attack inputs | Detection engineering | SIEM and security data lake | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: attack realism. |
| Decision margin distribution inputs | Security data platform | Asset inventory (CMDB) and identity directory | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: calibration. |
| Poisoning sensitivity inputs | Identity and access team | Case and ticketing system (SOAR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: simulation. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: adversarial_ml_robustness_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: robust_accuracy_under_constrained_attack, type: double, nullable: false }
    - { name: decision_margin_distribution, type: double, nullable: false }
    - { name: poisoning_sensitivity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Robust accuracy under constrained attack and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Decision margin distribution against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Robust accuracy under constrained attack, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Machine Learning Repository | https://archive.ics.uci.edu/ | Per-dataset licences (see the site) | A long-standing archive of small and medium datasets across domains | Small and old; good for code, weak for realism. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCR Time Series Archive | https://www.cs.ucr.edu/~eamonn/time_series_data_2018/ | Research use with citation (see the page) | 128 labelled time-series classification datasets | Short curated series. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE adversarial_ml_robustness_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE adversarial_ml_robustness_detections (
  frame_id TEXT NOT NULL REFERENCES adversarial_ml_robustness_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE adversarial_ml_robustness_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Adversarial Robustness for Deployed Models": Measure and improve robustness of production classifiers (fraud, malware, vision) to evasion, poisoning and extraction attacks. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Securing AI systems themselves | Machine-learning models can be attacked: adversarial inputs, data poisoning, model extraction, prompt injection and over-permissioned agents. Defences include robustness training, rate limits and monitoring, input and output filters, and strict tool permissions. | Any model that reads untrusted input or can take actions needs its own threat model and tests. |
| ATT&CK and attacker behaviour | MITRE ATT&CK catalogues attacker tactics and techniques, such as PowerShell execution (T1059.001), valid accounts (T1078), brute force (T1110), application-layer command and control (T1071) and exfiltration over alternative protocols (T1048). Analysts reason about behaviour chains, not isolated indicators. | Use technique names so verdicts are comparable and testable, and build replay cases from real technique telemetry. |
| The SOC workflow and its tools | Detections come from a SIEM (collects and correlates logs), EDR (monitors endpoints) and other sensors. Analysts triage the alert, investigate by querying logs and context, and escalate or close it; responders contain and remediate. SOAR tools automate fixed playbooks. Teams measure mean time to detect and respond, and the queue never empties. | The agent has to fit this process, speak its vocabulary and leave an audit trail analysts and auditors can follow. |
| Shortcuts, domain shift and evaluation across sites | Vision models readily learn cues unrelated to the task: scanner markings, backgrounds, lighting, text overlays. Performance then collapses on a new device or site. Evaluation must hold out entire sites or cameras, and operating thresholds must be re-validated where they are deployed. | Split by physical item or patient, and always test on a site the model has not seen. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Robust accuracy under constrained attack | Accuracy under domain attack. Resilience. | Leakage risk to design against: Attack realism. |
| A signal-versus-noise trap in this use case: Threat model | The true signal is constraints realistic to the domain (valid emails, valid files); the common noise is pixel Lp-ball attacks on tabular models. | Unrealistic attacks mislead robustness estimates. |

**Ask the experts**

- [ ] What exactly does "Utility-robustness trade-off" mean in practice for adversarial robustness for deployed models: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Robust accuracy under constrained attack" and "Decision margin distribution", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Evasion incidents" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: non-adaptive attacks only, and who can confirm the cut-off times and splits?
- [ ] How often does "Attacker adapts to the deployed defence" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Adversarial example | An input altered slightly on purpose to make a model misclassify it. |
| SIEM | Security information and event management: a platform that collects, correlates and searches security logs. |
| EDR | Endpoint detection and response: software on devices that records activity and can isolate a host. |
| SOAR | Security orchestration, automation and response: tools that run scripted playbooks for alerts. |
| IOC | Indicator of compromise: an observable such as an IP address, file hash or domain linked to malicious activity. |
| TTP | Tactics, techniques and procedures: how an attacker operates, more durable than a single indicator. |
| MITRE ATT&CK | A public knowledge base of adversary tactics and techniques used to describe and label detections. |
| C2 / beaconing | Command and control traffic, often a compromised host contacting an attacker's server at regular intervals. |
| Lateral movement | An attacker moving from one compromised system to others inside the network. |
| Exfiltration | Stealing data out of the network, sometimes hidden inside DNS or web traffic. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Data augmentation | Creating altered copies of training images (flips, brightness) so the model becomes robust. |
| Shortcut learning | A model using an easy but irrelevant cue that happens to correlate with the label. |
| Test-time augmentation | Averaging predictions over several altered versions of the input. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
