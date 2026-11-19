# Contractor Bid Evaluation: data and feature specification

> Generated from the blueprint `real-estate/contractor-bid-evaluation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Contractor Bid Evaluation · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Contractor Bid Evaluation": Compare contractor bids on price, scope coverage, risk and track record to recommend a shortlist. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Data only on winners, since the performance of unsuccessful bidders is never observed.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Scope gap | number of bill-of-quantities items missing or priced at zero | Reveals omissions in a low bid | Parsing errors in the bid documents, so check by hand |   |   |   |
| Past overrun rate | average percentage cost overrun of the contractor's last ten projects | Reliability evidence | Data are patchy and project types differ |   |   |   |
| Bid outlier | z-score of the bid compared with the other bids and the estimate | Flags abnormally low or high bids | Few bids make the z-score unstable, so use the estimate as well |   |   |   |
| Capacity | the contractor's current workload relative to capacity | A contractor stretched across projects delivers late | Data are self-reported |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Scope | Coverage of the full scope of works in each bid | The lowest price | Low bids often omit scope that is later claimed as extras |
| Track | A contractor's delivery record on similar projects | The price alone | Cheap bidders often have a record of delay and claims |
| Risk | Risk-adjusted cost including likely overruns | The bid price as submitted | The cheapest bid can be the most expensive outcome once overruns are included |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Company name | A label that invites bias and has no evidence on performance |
| Bid format | Presentation style that carries no information on capability |
| Brochure | Marketing material that does not predict delivery |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Scope gap inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: parsing errors in the bid documents, so check by hand. |
| Past overrun rate inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: data are patchy and project types differ. |
| Bid outlier inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: few bids make the z-score unstable, so use the estimate as well. |
| Capacity inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: data are self-reported. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: contractor_bid_evaluation_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: scope_gap, type: double, nullable: false }
    - { name: past_overrun_rate, type: double, nullable: false }
    - { name: bid_outlier, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Scope gap and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Past overrun rate against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Scope gap, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| EPSS data and statistics | https://www.first.org/epss/ | Free to use with attribution (see the page) | Daily exploit prediction scores for all CVEs with historical data | Predicts exploitation probability, which you may want to improve on. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE contractor_bid_evaluation_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE contractor_bid_evaluation_fields (
  document_id TEXT NOT NULL REFERENCES contractor_bid_evaluation_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE contractor_bid_evaluation_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Contractor Bid Evaluation": Compare contractor bids on price, scope coverage, risk and track record to recommend a shortlist. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Construction: cost, schedule and site safety | A project moves from design to tender, build and handover, with cost estimates at each stage, a critical path of tasks and a site where safety is the first duty. Overruns come from scope changes, late materials, weather and productivity, and are seen in earned-value indicators. | Early estimates are ranges, not points, and anything that touches site workers needs privacy and union considerations. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Scope gap | Number of bill-of-quantities items missing or priced at zero. Reveals omissions in a low bid. | Leakage risk to design against: Parsing errors in the bid documents, so check by hand. |
| A signal-versus-noise trap in this use case: Scope | The true signal is coverage of the full scope of works in each bid; the common noise is the lowest price. | Low bids often omit scope that is later claimed as extras. |

**Ask the experts**

- [ ] What exactly does "Evaluation follows procurement rules and published criteria" mean in practice for contractor bid evaluation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Scope gap" and "Past overrun rate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Overruns" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: data only on winners, since the performance of unsuccessful bidders is never observed, and who can confirm the cut-off times and splits?
- [ ] How often does "Abnormally low bid" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Bill of quantities | A list of materials and work items with quantities, used for tender and cost control. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| Days on market | The number of days a listing takes to go under contract. |
| Critical path | The longest chain of dependent tasks, which determines the project's earliest completion date. |
| Earned value | A project-control method that compares work completed with the plan and the cost spent. |
| Take-off | Measuring quantities from drawings to estimate materials and cost. |
| Data room | A secure online repository of documents shared during a property sale or due diligence. |
| Amendment | A change to a lease or contract after signing, which overrides the original terms. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
