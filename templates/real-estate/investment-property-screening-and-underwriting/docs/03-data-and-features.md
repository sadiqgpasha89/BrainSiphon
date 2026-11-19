# Investment Property Screening & Underwriting: data and feature specification

> Generated from the blueprint `real-estate/investment-property-screening-and-underwriting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Investment Property Screening & Underwriting · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Investment Property Screening & Underwriting": Screen listed investment properties against the fund's criteria and draft an underwriting summary with cash-flow assumptions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Past deals are those the team chose to pursue, so the data is biased toward what they already liked.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Yield vs target | going-in cap rate minus the fund's target cap rate | A direct test of mandate fit | Cap rates are computed on estimated income, so mark the income source |   |   |   |
| Rent gap | passing rent minus market rent as a share of market rent | Shows upside from marking rents to market | Market rents are estimates, so use an interval |   |   |   |
| Capex need | estimated capital spend per square metre from condition, age and survey notes | Capital needs reduce returns and are often hidden | Estimates are rough, so keep a contingency band |   |   |   |
| Debt service cover | net operating income divided by annual debt service at current rates | Shows whether the deal survives financing | Rates change, so recompute when rates move |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Fit | Mandate fit checked first on sector, size, location and return target | Analysing every property in full | Analyst time is limited and most listings fail the mandate on the first page |
| Cash flow | Net operating income rebuilt from the lease and cost documents | The asking figures in the offering memorandum | Seller figures flatter income and understate costs, so they must be rebuilt |
| Sensitivity | A range of returns under changing rent, vacancy and exit yield | A single point return | Assumptions drive the answer, and a point estimate hides how fragile it is |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Broker enthusiasm | Marketing language that does not tell the analyst about the property |
| Photo count | Reflects the brochure and not the investment |
| Deal name | A label chosen by the seller or broker with no link to returns |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Yield vs target inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: cap rates are computed on estimated income, so mark the income source. |
| Rent gap inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: market rents are estimates, so use an interval. |
| Capex need inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: estimates are rough, so keep a contingency band. |
| Debt service cover inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: rates change, so recompute when rates move. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: investment_property_screening_and_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: yield_vs_target, type: double, nullable: false }
    - { name: rent_gap, type: double, nullable: false }
    - { name: capex_need, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Yield vs target and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Rent gap against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Yield vs target, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Machine Learning Repository | https://archive.ics.uci.edu/ | Per-dataset licences (see the site) | A long-standing archive of small and medium datasets across domains | Small and old; good for code, weak for realism. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE investment_property_screening_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE investment_property_screening_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES investment_property_screening_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON investment_property_screening_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE investment_property_screening_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Investment Property Screening & Underwriting": Screen listed investment properties against the fund's criteria and draft an underwriting summary with cash-flow assumptions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Commercial real estate: leases, rent roll and income | Commercial properties earn rent under long, negotiated leases with options, breaks, indexation and incentives. The rent roll lists each tenant, rent and expiry, net operating income is rent minus operating costs, and value is set by income and the cap rate investors accept. | Lease terms are the data, and most of them are in documents, so extraction quality directly limits forecasting and valuation. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Fair housing and non-discrimination | Housing law in many countries prohibits discrimination by race, religion, sex, disability, family status and similar attributes, in advertising, screening, pricing and lending. Proxies such as postcode, language or school-district descriptions can create unlawful steering even if no protected attribute is used. | Every real-estate model that ranks, prices, screens or describes must be tested for disparate outcomes and for proxies, and the test is part of the product. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Yield vs target | Going-in cap rate minus the fund's target cap rate. A direct test of mandate fit. | Leakage risk to design against: Cap rates are computed on estimated income, so mark the income source. |
| A signal-versus-noise trap in this use case: Fit | The true signal is mandate fit checked first on sector, size, location and return target; the common noise is analysing every property in full. | Analyst time is limited and most listings fail the mandate on the first page. |

**Ask the experts**

- [ ] What exactly does "Every assumption such as rent growth, vacancy and exit yield is stated and editable" mean in practice for investment property screening & underwriting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Yield vs target" and "Rent gap", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Deals screened per analyst" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: past deals are those the team chose to pursue, so the data is biased toward what they already liked, and who can confirm the cut-off times and splits?
- [ ] How often does "Missing rent roll" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| DSCR | Debt service coverage ratio: net operating income divided by debt payments. |
| Cap-ex | Capital expenditure on improving or replacing building components, as distinct from routine repairs. |
| NOI | Net operating income: rental income minus operating expenses, before debt service and tax. |
| Days on market | The number of days a listing takes to go under contract. |
| Rent roll | A schedule of each tenant, unit, rent and lease expiry for a property. |
| Asking rent | The rent advertised for a unit, which is usually higher than the rent actually signed. |
| Data room | A secure online repository of documents shared during a property sale or due diligence. |
| Absorption | The rate at which available space or new units are leased or sold over time. |
| LTV | Loan-to-value ratio: loan amount divided by property value. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| Fine-tuning / SFT | Further training a language model on examples of the desired behaviour. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
