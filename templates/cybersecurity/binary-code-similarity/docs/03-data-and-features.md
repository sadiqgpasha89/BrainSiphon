# Binary Code Similarity & Vulnerability Matching: data and feature specification

> Generated from the blueprint `cybersecurity/binary-code-similarity` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Binary Code Similarity & Vulnerability Matching · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Binary Code Similarity & Vulnerability Matching": Find known vulnerable functions inside stripped binaries and firmware across compilers and architectures at scale. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluation only on same-compiler pairs.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Control-flow-graph embedding | GNN over CFG | Structure | Disassembly quality |   |   |   |
| Constants and string references | immediate values and strings | Anchors | Stripped binaries |   |   |   |
| Patch-diff features | differences in guard conditions | Patched status | Reference pairs |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Invariance | Semantics-based embeddings invariant to compiler and optimisation | Instruction-sequence matching | Optimisation level changes instruction sequences |
| Patch awareness | Distinguish patched from vulnerable variants | Binary similarity score alone | A patched function is highly similar to the vulnerable one |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Function address | meaningless |
| Symbol names | stripped |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Control-flow-graph embedding inputs | Detection engineering | SIEM and security data lake | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: disassembly quality. |
| Constants and string references inputs | Security data platform | Asset inventory (CMDB) and identity directory | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: stripped binaries. |
| Patch-diff features inputs | Identity and access team | Case and ticketing system (SOAR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: reference pairs. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: binary_code_similarity_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: control_flow_graph_embedding, type: double, nullable: false }
    - { name: constants_and_string_references, type: double, nullable: false }
    - { name: patch_diff_features, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Control-flow-graph embedding and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Constants and string references against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Control-flow-graph embedding, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Web Data Commons product corpus | https://webdatacommons.org/largescaleproductcorpus/ | ODC-BY (see the page) | Millions of product offers from the web with identifiers for product matching | Web-scraped and noisy. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE binary_code_similarity_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE binary_code_similarity_outputs (
  run_id TEXT NOT NULL REFERENCES binary_code_similarity_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE binary_code_similarity_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE binary_code_similarity_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Binary Code Similarity & Vulnerability Matching": Find known vulnerable functions inside stripped binaries and firmware across compilers and architectures at scale. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Software supply chain and code security | Malicious packages, leaked secrets, vulnerable code and insecure configurations enter through dependencies and developer workflows. Static analysis, package metadata and language models scan code, with the usual problem of many false positives. | A tool developers ignore protects nothing, so triage accuracy and fix guidance matter as much as detection. |
| Vulnerability and risk management | Organisations track thousands of software vulnerabilities (CVEs), score their severity, and decide what to patch first. Few are ever exploited; exploit likelihood, asset criticality, exposure and compensating controls decide priority. Attack-path analysis shows how weaknesses chain together. | Prioritising by severity alone creates unmanageable lists; prioritising by exploit evidence and asset value cuts work and risk. |
| Graph learning and its pitfalls | Graph neural networks and graph features (degree, centrality, personalised PageRank, motifs) propagate information along edges. Leakage hides in the split: random edge splits put future or neighbouring information into training; time-based and node-based splits are safer. | Evaluate on whole communities or later periods, and compare with simple hand-built graph features before adding a GNN. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Control-flow-graph embedding | GNN over CFG. Structure. | Leakage risk to design against: Disassembly quality. |
| A signal-versus-noise trap in this use case: Invariance | The true signal is semantics-based embeddings invariant to compiler and optimisation; the common noise is instruction-sequence matching. | Optimisation level changes instruction sequences. |

**Ask the experts**

- [ ] What exactly does "Cross-architecture matching" mean in practice for binary code similarity & vulnerability matching: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Control-flow-graph embedding" and "Constants and string references", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Vulnerable components found in firmware" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluation only on same-compiler pairs, and who can confirm the cut-off times and splits?
- [ ] How often does "Heavy obfuscation or virtualisation" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Fuzzing | Feeding a program many unusual inputs to find crashes and vulnerabilities. |
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| CVE | A public identifier for a disclosed software vulnerability. |
| CVSS | Common Vulnerability Scoring System: a severity score from 0 to 10 that does not measure likelihood of exploitation. |
| Known exploited vulnerability | A vulnerability with evidence of active exploitation, which should be fixed first. |
| SBOM | Software bill of materials: the list of components inside a software product. |
| Benign true positive | A correct detection of activity that is authorised, such as a scheduled scan or administrator task. |
| EPSS | Exploit Prediction Scoring System: a probability that a vulnerability will be exploited in the wild. |
| Secret leakage | Credentials or keys committed into code repositories or logs. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| GraphSAGE | A GNN that samples and aggregates a node's neighbours so it scales to large graphs. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
