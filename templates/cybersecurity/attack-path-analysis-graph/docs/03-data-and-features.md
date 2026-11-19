# Attack Path Analysis on Enterprise Graphs: data and feature specification

> Generated from the blueprint `cybersecurity/attack-path-analysis-graph` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Attack Path Analysis on Enterprise Graphs · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Attack Path Analysis on Enterprise Graphs": Compute and rank the most plausible attack paths from entry points to crown-jewel assets, guiding the smallest set of fixes that break them. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Validation lacking red-team ground truth.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Edge exploit probability | exploit likelihood for the technique | Path weight | Vulnerability data |   |   |   |
| Betweenness of nodes | paths passing through | Choke point | Graph |   |   |   |
| Crown-jewel proximity | hops to critical assets | Impact | Definitions |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Choke points | Minimum cuts that break many paths | Fix every finding | Remediation capacity is limited |
| Probability | Edge exploitability weighted by exploit likelihood | Reachability only | Reachable is not exploitable |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Node display name | none |
| Count of vulnerabilities per host | volume not paths |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Edge exploit probability inputs | Detection engineering | SIEM and security data lake | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: vulnerability data. |
| Betweenness of nodes inputs | Security data platform | Asset inventory (CMDB) and identity directory | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: graph. |
| Crown-jewel proximity inputs | Identity and access team | Case and ticketing system (SOAR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: definitions. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: attack_path_analysis_graph_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: edge_exploit_probability, type: double, nullable: false }
    - { name: betweenness_of_nodes, type: double, nullable: false }
    - { name: crown_jewel_proximity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Edge exploit probability and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Betweenness of nodes against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Edge exploit probability, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| LANL Comprehensive Multi-Source Cyber-Security Events | https://csr.lanl.gov/data/cyber1/ | Research release from Los Alamos National Laboratory (see the page) | 58 days of authentication, process, flow and DNS events with a red-team subset | Anonymised and very large. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE attack_path_analysis_graph_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE attack_path_analysis_graph_outputs (
  run_id TEXT NOT NULL REFERENCES attack_path_analysis_graph_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE attack_path_analysis_graph_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE attack_path_analysis_graph_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Attack Path Analysis on Enterprise Graphs": Compute and rank the most plausible attack paths from entry points to crown-jewel assets, guiding the smallest set of fixes that break them. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Vulnerability and risk management | Organisations track thousands of software vulnerabilities (CVEs), score their severity, and decide what to patch first. Few are ever exploited; exploit likelihood, asset criticality, exposure and compensating controls decide priority. Attack-path analysis shows how weaknesses chain together. | Prioritising by severity alone creates unmanageable lists; prioritising by exploit evidence and asset value cuts work and risk. |
| Software supply chain and code security | Malicious packages, leaked secrets, vulnerable code and insecure configurations enter through dependencies and developer workflows. Static analysis, package metadata and language models scan code, with the usual problem of many false positives. | A tool developers ignore protects nothing, so triage accuracy and fix guidance matter as much as detection. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Edge exploit probability | Exploit likelihood for the technique. Path weight. | Leakage risk to design against: Vulnerability data. |
| A signal-versus-noise trap in this use case: Choke points | The true signal is minimum cuts that break many paths; the common noise is fix every finding. | Remediation capacity is limited. |

**Ask the experts**

- [ ] What exactly does "Graph of millions of nodes" mean in practice for attack path analysis on enterprise graphs: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Edge exploit probability" and "Betweenness of nodes", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Reachable crown-jewel paths" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: validation lacking red-team ground truth, and who can confirm the cut-off times and splits?
- [ ] How often does "Graph stale after cloud changes" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Attack path | A chain of weaknesses and permissions that lets an attacker move from an entry point to a valuable asset. |
| Crown jewels | The assets whose loss would most harm the organisation. |
| Privilege escalation | Gaining higher access rights than intended. |
| IAM | Identity and access management: the systems that decide who can do what. |
| CVE | A public identifier for a disclosed software vulnerability. |
| EPSS | Exploit Prediction Scoring System: a probability that a vulnerability will be exploited in the wild. |
| Known exploited vulnerability | A vulnerability with evidence of active exploitation, which should be fixed first. |
| Fuzzing | Feeding a program many unusual inputs to find crashes and vulnerabilities. |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| Node / edge | The entities in a graph and the relationships between them. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Exploration / exploitation | Trying new actions to learn versus using the best known one. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Heuristic / local search | Fast methods that find good but not provably optimal solutions. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
