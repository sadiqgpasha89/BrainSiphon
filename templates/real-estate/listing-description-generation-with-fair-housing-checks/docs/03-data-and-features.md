# Listing Description Generation with Fair-Housing Checks: data and feature specification

> Generated from the blueprint `real-estate/listing-description-generation-with-fair-housing-checks` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Listing Description Generation with Fair-Housing Checks · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Listing Description Generation with Fair-Housing Checks": Draft accurate listing descriptions from structured facts and photos and block language that could breach fair-housing rules. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on past listings copies the biased language those listings contain.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Fact match rate | share of claims in the description that equal a field in the record | The direct measure of invented content | Match on meaning and not on string, because the same fact is worded many ways |   |   |   |
| Prohibited phrase score | classifier probability that a sentence steers by a protected characteristic | Catches coded language that phrase lists miss | Needs labelled examples from complaints and must be reviewed by counsel |   |   |   |
| Agent edit rate | share of generated words that the agent changed before publishing | A quality signal from the people who know the property | Edits reflect habit as well as quality, so read it by agent |   |   |   |
| Coverage | share of the record's key features such as beds, parking and outdoor space that appear | Completeness of the description | Depends on what the agent considers key, so weight by market |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Facts | A description assembled from verified fields in the record | Features the model thinks are likely for this kind of home | A false pool, view or school claim is a legal issue and a broken promise to a buyer |
| Compliance | A classifier for steering and discriminatory phrasing, backed by phrase lists | General style or toxicity filters | Subtle steering, such as describing who would fit a neighbourhood, passes ordinary filters and breaches fair-housing rules |
| Tone | Plain, accurate language with measured claims | Superlatives and hype | Hype triggers complaints and regulator attention, and it erodes trust in the listing |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Length | A style choice that does not indicate accuracy or compliance |
| Emoji count | Style preference of the portal and not a quality signal |
| Neighbourhood adjectives | Words such as quiet, exclusive or family-friendly are subjective and the main route to steering |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Fact match rate inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: match on meaning and not on string, because the same fact is worded many ways. |
| Prohibited phrase score inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: needs labelled examples from complaints and must be reviewed by counsel. |
| Agent edit rate inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: edits reflect habit as well as quality, so read it by agent. |
| Coverage inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: depends on what the agent considers key, so weight by market. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: listing_description_generation_with_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: fact_match_rate, type: double, nullable: false }
    - { name: prohibited_phrase_score, type: double, nullable: false }
    - { name: agent_edit_rate, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Fact match rate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Prohibited phrase score against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Fact match rate, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| RACE reading comprehension | https://www.cs.cmu.edu/~glai1/data/race/ | Research use (see the page) | About 28,000 passages and 100,000 exam questions from English exams for Chinese students | Exam questions, one population. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE listing_description_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE listing_description_steps (
  task_id TEXT NOT NULL REFERENCES listing_description_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE listing_description_approvals (
  task_id TEXT NOT NULL REFERENCES listing_description_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Listing Description Generation with Fair-Housing Checks": Draft accurate listing descriptions from structured facts and photos and block language that could breach fair-housing rules. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Fair housing and non-discrimination | Housing law in many countries prohibits discrimination by race, religion, sex, disability, family status and similar attributes, in advertising, screening, pricing and lending. Proxies such as postcode, language or school-district descriptions can create unlawful steering even if no protected attribute is used. | Every real-estate model that ranks, prices, screens or describes must be tested for disparate outcomes and for proxies, and the test is part of the product. |
| Listing, search and the buyer funnel | A buyer discovers listings on portals, saves and shares them, enquires, views, makes an offer and goes through a mortgage and a closing. Agents hold the listing relationship, and the portal sees search and engagement behaviour but rarely the final sale. | Engagement is a proxy; the outcome you care about (a sale, a lease) is rare, delayed and often outside the portal's data. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Fact match rate | Share of claims in the description that equal a field in the record. The direct measure of invented content. | Leakage risk to design against: Match on meaning and not on string, because the same fact is worded many ways. |
| A signal-versus-noise trap in this use case: Facts | The true signal is a description assembled from verified fields in the record; the common noise is features the model thinks are likely for this kind of home. | A false pool, view or school claim is a legal issue and a broken promise to a buyer. |

**Ask the experts**

- [ ] What exactly does "Every factual claim must come from the verified property record and nowhere else" mean in practice for listing description generation with fair-housing checks: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Fact match rate" and "Prohibited phrase score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Listing quality" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on past listings copies the biased language those listings contain, and who can confirm the cut-off times and splits?
- [ ] How often does "Missing facts" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Steering | Guiding people toward or away from neighbourhoods based on protected characteristics. |
| Fair housing | Laws prohibiting discrimination in selling, renting, advertising and financing housing. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| Days on market | The number of days a listing takes to go under contract. |
| Redlining | Denying or worsening services in certain areas based on the demographics of the area. |
| Asking rent | The rent advertised for a unit, which is usually higher than the rent actually signed. |
| Fine-tuning / SFT | Further training a language model on examples of the desired behaviour. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
