# Macroeconomic Scenario Generation for Stress Tests: data and feature specification

> Generated from the blueprint `bfsi/macro-scenario-generation-for-stress-tests` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Macroeconomic Scenario Generation for Stress Tests · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Macroeconomic Scenario Generation for Stress Tests": Generate internally consistent macroeconomic paths for stress testing, translating a narrative (for example a property crash) into variables used by credit and market models. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fitting on 2010-2019 gives mild shocks.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| VAR impulse responses | estimated responses of variables to a shock to one variable | Preserves co-movement | Short histories give unstable estimates |   |   |   |
| Historical analogues | paths from past crises matched on shock type | Anchors severity | Few crises exist per country |   |   |   |
| Regime indicator | probability of expansion or contraction state | Changes response magnitudes | Regime labelling is subjective |   |   |   |
| Narrative-to-shock mapping | LLM-proposed shock sizes verified against analogues | Speeds drafting | Must be validated by economists |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Coherence | Joint movement of variables consistent with historical relationships | Independent shocks to each variable | Independent shocks create combinations that never occur |
| Severity | Plausible but severe, calibrated to historical depth | Arbitrary large shocks | Implausible severity is rejected by the board and supervisors |
| Narrative | A scenario narrative translated to variables with traceability | A black-box path generator | Reviewers need to see why unemployment peaks at 11% |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Daily market noise | irrelevant for quarterly paths |
| Social sentiment | too noisy for macro drivers |
| Forecaster consensus stale values | already priced into baselines |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| VAR impulse responses inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: short histories give unstable estimates. |
| Historical analogues inputs | Risk data office | General ledger and risk data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: few crises exist per country. |
| Regime indicator inputs | Operations | Customer master and KYC repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: regime labelling is subjective. |
| Narrative-to-shock mapping inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: must be validated by economists. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: macro_scenario_generation_for_stress_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: var_impulse_responses, type: double, nullable: false }
    - { name: historical_analogues, type: double, nullable: false }
    - { name: regime_indicator, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on VAR impulse responses and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Historical analogues against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as VAR impulse responses, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE macro_scenario_generation_for_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE macro_scenario_generation_for_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES macro_scenario_generation_for_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON macro_scenario_generation_for_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE macro_scenario_generation_for_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Macroeconomic Scenario Generation for Stress Tests": Generate internally consistent macroeconomic paths for stress testing, translating a narrative (for example a property crash) into variables used by credit and market models. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Expected credit loss, IFRS 9 staging and provisions | Banks hold provisions against expected credit losses: twelve-month loss for performing loans (stage 1), lifetime loss once credit risk has increased significantly (stage 2) and for impaired loans (stage 3). Probability of default, loss given default and exposure at default are combined across scenarios, and a stage change can move provisions sharply. | A model that is slightly wrong near a stage boundary can move reported profit, so stability, hysteresis and explainability matter as much as discrimination. |
| Treasury, liquidity and interest-rate risk | The treasury funds the bank, keeps enough liquid assets to survive outflows and manages how net interest income reacts to rates. Key ideas are intraday liquidity, deposit run-off, behavioural assumptions for deposits and prepayments, and the liquidity coverage and net stable funding rules. | Forecast errors here are measured in buffers held and funding costs paid, and the tail (a run, a rate shock) matters more than the average. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: VAR impulse responses | Estimated responses of variables to a shock to one variable. Preserves co-movement. | Leakage risk to design against: Short histories give unstable estimates. |
| A signal-versus-noise trap in this use case: Coherence | The true signal is joint movement of variables consistent with historical relationships; the common noise is independent shocks to each variable. | Independent shocks create combinations that never occur. |

**Ask the experts**

- [ ] What exactly does "Paths must be internally coherent (GDP, unemployment, rates, house prices)" mean in practice for macroeconomic scenario generation for stress tests: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "VAR impulse responses" and "Historical analogues", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to produce a scenario set" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: fitting on 2010-2019 gives mild shocks, and who can confirm the cut-off times and splits?
- [ ] How often does "Structural break" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Four-eyes principle | A control requiring a second person to approve a sensitive action. |
| LCR | Liquidity coverage ratio: high-quality liquid assets divided by expected 30-day stressed net outflows. |
| DTI | Debt-to-income: total monthly debt payments divided by monthly income, a standard affordability measure. |
| Covenant | A condition in a loan agreement, such as a maximum leverage ratio, that the borrower must keep to; a breach lets the lender act. |
| Spreading | Entering a borrower's financial statements into standard lines so ratios can be compared across firms. |
| PD, LGD, EAD | Probability of default, loss given default and exposure at default: the three inputs to expected credit loss. |
| RWA | Risk-weighted assets: exposures scaled by regulatory risk weights, used to compute capital requirements. |
| CET1 | Common equity tier 1: the highest-quality regulatory capital, held as a ratio of risk-weighted assets. |
| NII | Net interest income: interest earned on assets minus interest paid on liabilities. |
| Deposit beta | How much of a change in the policy rate the bank passes on to depositors. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Hidden Markov model | A model in which a hidden state switches over time and generates the observations. |
| Context window | The maximum amount of text a model can read at once. |
| Fine-tuning / SFT | Further training a language model on examples of the desired behaviour. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
