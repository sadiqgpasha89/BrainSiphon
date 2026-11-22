# Patient Safety Event Root-Cause Discovery: data and feature specification

> Generated from the blueprint `healthcare/patient-safety-event-root-cause-discovery` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patient Safety Event Root-Cause Discovery · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Patient Safety Event Root-Cause Discovery": Find recurring contributing factors and system patterns across de-identified safety events, giving investigators hypotheses and evidence links without asserting causality from correlation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Reporting a correlation as a cause.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Semantic cluster membership | embedding-based cluster of narratives with coherence score | Groups similar events | De-identified text only |   |   |   |
| Temporal concentration | cluster counts by month and unit | Reveals emerging patterns | Event time |   |   |   |
| Process-step co-occurrence | workflow step linked to an event in the graph | Anchors the pattern in a process | Mapped by taxonomy |   |   |   |
| Factor co-occurrence graph | co-occurring contributing factors across events | Reveals compound causes | Only taxonomy-coded factors |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Claim | Candidate contributing factor with evidence | Causal conclusion | Correlation across reports is not cause |
| Taxonomy | Mapping to the approved factor taxonomy | Free topic labels | Investigators need comparable categories |
| Stability | Clusters that persist across resamples and periods | One clustering run | Unstable clusters mislead action |
| People | System and process factors | Named individuals | Blame suppresses reporting |
| Evidence | Linked source reports | Summary only | Reviewers must read the underlying events |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Reporter identity | not a system factor |
| Rare words unique to one report | outliers |
| Report author department | confounds reporting culture with safety |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Semantic cluster membership inputs | Patient safety office | Incident reporting system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: de-identified text only. |
| Temporal concentration inputs | Quality | Root-cause analysis case repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: event time. |
| Process-step co-occurrence inputs | Human factors and clinical engineering | Process and workflow data | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: mapped by taxonomy. |
| Factor co-occurrence graph inputs | Patient safety office | Safety causal taxonomy | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: only taxonomy-coded factors. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: patient_safety_event_root_cause_inputs.v1
owner: patient-safety-office@example.com
system_of_record: Incident reporting system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: semantic_cluster_membership, type: double, nullable: false }
    - { name: temporal_concentration, type: double, nullable: false }
    - { name: process_step_co_occurrence, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Semantic cluster membership and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Temporal concentration against Incident reporting system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Semantic cluster membership, traces back to Incident reporting system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MoleculeNet | https://deepchem.readthedocs.io/en/latest/api_reference/moleculenet.html | MIT licence (see the site) | A benchmark collection of molecular property datasets (toxicity, solubility, binding) | Benchmark splits can be optimistic; use scaffold splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Therapeutics Data Commons | https://tdcommons.ai/ | Per-dataset terms (see the site) | Curated datasets across drug discovery tasks, including drug-drug interaction and ADMET | Heterogeneous quality; read each dataset's notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE patient_safety_event_root_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE patient_safety_event_root_outputs (
  run_id TEXT NOT NULL REFERENCES patient_safety_event_root_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE patient_safety_event_root_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE patient_safety_event_root_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Patient Safety Event Root-Cause Discovery": Find recurring contributing factors and system patterns across de-identified safety events, giving investigators hypotheses and evidence links without asserting causality from correlation. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Entity resolution and transitivity | Resolving duplicates means deciding which records refer to the same real-world entity. Because 'same as' is transitive, one wrong link can merge two large groups, so precision on links matters more than recall and clusters are monitored for abnormal size. | Weight shared attributes by their rarity and cap hubs before clustering. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Semantic cluster membership | Embedding-based cluster of narratives with coherence score. Groups similar events. | Leakage risk to design against: De-identified text only. |
| A signal-versus-noise trap in this use case: Claim | The true signal is candidate contributing factor with evidence; the common noise is causal conclusion. | Correlation across reports is not cause. |

**Ask the experts**

- [ ] What exactly does "Narratives are de-identified before analysis" mean in practice for patient safety event root-cause discovery: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Semantic cluster membership" and "Temporal concentration", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Investigations started from a surfaced pattern" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: reporting a correlation as a cause, and who can confirm the cut-off times and splits?
- [ ] How often does "Reporting culture change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| ADMET | Absorption, distribution, metabolism, excretion and toxicity: properties that decide whether a molecule can be a drug. |
| Docking | Simulating how a molecule fits into a protein's binding site to estimate binding strength. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Mental health crisis | A situation, such as suicidal intent, that needs immediate human escalation rather than automated advice. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Link prediction | Predicting whether an edge exists or will form between two nodes. |
| Distribution shift | A change in the data a model sees compared with training. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Community detection | Finding groups of nodes more densely connected to each other than to the rest. |
| Motif | A small recurring subgraph pattern such as a cycle or a fan-out. |
