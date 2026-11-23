# Regulatory Filing Copilot: data and feature specification

> Generated from the blueprint `energy/regulatory-filing-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Regulatory Filing Copilot · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Regulatory Filing Copilot": Help regulatory teams assemble rate case and reliability filings by retrieving prior filings, regulator rules and source data, with every number computed by tools and linked to its source. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Model-computed figures.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Data request match | which request a passage answers | Routing | From the request list |   |   |   |
| Calculation lineage | whether a figure traces to inputs | Audit readiness | From the lineage store |   |   |   |
| Prior filing consistency | agreement with earlier answers | Consistency | From prior filings |   |   |   |
| Rule citation | whether the rule is cited | Compliance | From the rule library |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Numbers | Deterministic tools on controlled data | Model arithmetic | Models make unit and arithmetic errors |
| Evidence | A source link per statement | Narrative without references | Regulators need to trace every claim |
| Consistency | Terms and values consistent across filings | Free wording | Differences invite challenge |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Author name | irrelevant |
| Draft length | not quality |
| Template colour | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Data request match inputs | Network operations | SCADA and ADMS (advanced distribution management) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the request list. |
| Calculation lineage inputs | Asset management | Meter data management and billing (CIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the lineage store. |
| Prior filing consistency inputs | Retail and customer operations | Asset management and GIS | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from prior filings. |
| Rule citation inputs | Network operations | SCADA and ADMS (advanced distribution management) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the rule library. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: regulatory_filing_copilot_inputs.v1
owner: network-operations@example.com
system_of_record: SCADA and ADMS (advanced distribution management)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: data_request_match, type: double, nullable: false }
    - { name: calculation_lineage, type: double, nullable: false }
    - { name: prior_filing_consistency, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Data request match and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Calculation lineage against SCADA and ADMS (advanced distribution management)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Data request match, traces back to SCADA and ADMS (advanced distribution management); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Spider text-to-SQL | https://yale-lily.github.io/spider | CC BY-SA 4.0 (see the site) | 10,000 questions with SQL over 200 databases for cross-domain text-to-SQL | Clean academic schemas, simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE regulatory_filing_copilot_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE regulatory_filing_copilot_steps (
  task_id TEXT NOT NULL REFERENCES regulatory_filing_copilot_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE regulatory_filing_copilot_approvals (
  task_id TEXT NOT NULL REFERENCES regulatory_filing_copilot_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Energy and utilities balance supply and demand second by second on physical networks that fail in the field. Weather, asset age and customer behaviour drive the data, outages carry safety and regulatory consequences, and control actions stay with licensed operators and protection systems. For this use case, "Regulatory Filing Copilot": Help regulatory teams assemble rate case and reliability filings by retrieving prior filings, regulator rules and source data, with every number computed by tools and linked to its source. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Operators and protection systems hold control | Grid, gas and water operations are safety-critical and regulated. AI recommends and forecasts, while switching, dispatch and protection stay with licensed operators and certified systems. | A recommendation that cannot be explained or overridden will not be used in a control room. |
| Field crews need practical work orders | Crew scheduling depends on location, skills, parts, access and permits. Plans that ignore these constraints fail on the day. | A model that ranks jobs without capacity and travel produces schedules nobody can run. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Data request match | Which request a passage answers. Routing. | Leakage risk to design against: From the request list. |
| A signal-versus-noise trap in this use case: Numbers | The true signal is deterministic tools on controlled data; the common noise is model arithmetic. | Models make unit and arithmetic errors. |

**Ask the experts**

- [ ] What exactly does "Every number links to a source record and a calculation" mean in practice for regulatory filing copilot: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Data request match" and "Calculation lineage", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Drafting time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: model-computed figures, and who can confirm the cut-off times and splits?
- [ ] How often does "Conflicting prior answers" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Reliability standard | Rules set by a regulator for network reliability. |
| SCADA | Supervisory control and data acquisition: systems that monitor and control the network. |
| SAIDI | System average interruption duration index: average outage minutes per customer. |
| SAIFI | System average interruption frequency index: average number of outages per customer. |
| Feeder | A distribution line that carries power from a substation to customers. |
| State of charge | How full a battery is. |
| Technical loss | Energy lost as heat in lines and equipment. |
| Vegetation management | Trimming trees near lines to prevent faults. |
| Meter data management | The system that stores and validates meter readings. |
| Time-of-use tariff | A price that depends on the time of day. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Faithfulness | Whether an answer is supported by the cited sources. |
