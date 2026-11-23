# Policy Microsimulation Assistant: data and feature specification

> Generated from the blueprint `public-sector/policy-microsimulation-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Policy Microsimulation Assistant · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Policy Microsimulation Assistant": Run microsimulation of tax and benefit changes on synthetic or aggregated populations and explain who gains and loses, with the assumptions and uncertainty shown. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Typical-household averages.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Policy parameter change | thresholds, rates and rules changed | Scenario | From the policy team |   |   |   |
| Population weights | survey weights to the population | Representativeness | From statistics |   |   |   |
| Behavioural response assumptions | elasticities used | Uncertainty | From literature and ranges |   |   |   |
| Take-up assumptions | share of eligible who claim | Uncertainty | From admin data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Output | Distributional effects with ranges | A single average | Averages hide who gains and loses |
| Trust | Reproducible runs with versioned assumptions | A black box | Policy debates need checkable numbers |
| Role | Support for analysts | Predicting behaviour | Behavioural responses are uncertain |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Analyst name | irrelevant |
| Run label | an artefact |
| Chart style | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Policy parameter change inputs | Digital service delivery | Case management and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the policy team. |
| Population weights inputs | Programme and policy owners | Tax, benefits and licensing systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from statistics. |
| Behavioural response assumptions inputs | City operations | GIS and asset management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from literature and ranges. |
| Take-up assumptions inputs | Digital service delivery | Case management and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from admin data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: policy_microsimulation_assistant_inputs.v1
owner: digital-service-delivery@example.com
system_of_record: Case management and CRM
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: policy_parameter_change, type: double, nullable: false }
    - { name: population_weights, type: double, nullable: false }
    - { name: behavioural_response_assumptions, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Policy parameter change and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Population weights against Case management and CRM
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Policy parameter change, traces back to Case management and CRM; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE policy_microsimulation_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE policy_microsimulation_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES policy_microsimulation_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON policy_microsimulation_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE policy_microsimulation_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Public sector and smart city systems decide on people's entitlements, services and shared infrastructure, so every decision must be lawful, explainable and open to appeal. Data is spread across agencies, equity matters as much as efficiency, and caseworkers and officials remain accountable for decisions about individuals. For this use case, "Policy Microsimulation Assistant": Run microsimulation of tax and benefit changes on synthetic or aggregated populations and explain who gains and loses, with the assumptions and uncertainty shown. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Planning relies on forecasts with uncertainty | Housing, schools, transport and services are planned from population, demand and land-use forecasts that carry wide uncertainty, so scenarios matter more than single numbers. | A single forecast presented as certain can lock in the wrong capacity. |
| Decisions about people need a legal basis and an appeal | Benefits, permits, tax and enforcement decisions follow statute and policy, and citizens can challenge them. Automated systems support officials and cannot replace the reasoning a decision must record. | A model that cannot give reasons that match the law cannot be used for the final decision. |
| Equity and fairness are measured across groups | Services affect different neighbourhoods, languages and groups differently, and historical data can embed past exclusion. Public bodies often have a legal equality duty. | Average accuracy hides differences, so outcomes should be checked across groups and areas. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Policy parameter change | Thresholds, rates and rules changed. Scenario. | Leakage risk to design against: From the policy team. |
| A signal-versus-noise trap in this use case: Output | The true signal is distributional effects with ranges; the common noise is a single average. | Averages hide who gains and loses. |

**Ask the experts**

- [ ] What exactly does "Models run on synthetic or aggregated populations" mean in practice for policy microsimulation assistant: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Policy parameter change" and "Population weights", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Analysis turnaround" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: typical-household averages, and who can confirm the cut-off times and splits?
- [ ] How often does "Rule complexity" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Policy simulation | Testing how a policy change would affect people and budgets. |
| Eligibility | The rules that decide whether someone qualifies for a benefit or service. |
| Entitlement | A benefit or service a person has a right to. |
| Digital twin | A model of a city or asset kept current with real data. |
| Open data | Data published for anyone to reuse. |
| Welfare | Government support for people with low income or other need. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
