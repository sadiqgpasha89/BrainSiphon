# Search Ads Keyword & Copy Generation: data and feature specification

> Generated from the blueprint `adtech/search-ads-keyword-generation-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Search Ads Keyword & Copy Generation · **Domain:** adtech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Search Ads Keyword & Copy Generation": Generate keyword sets, match types and ad copy for search campaigns from a landing page and goal, with quality and policy controls. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on volume without conversions.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Search volume and CPC estimates | planner data | Economics | Source |   |   |   |
| Keyword-page relevance | semantic similarity | Quality | Embeddings |   |   |   |
| Historical query performance | search-term reports | Learning | Window |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Grounding | Keywords derived from the page and search-term data | Free generation | Ungrounded keywords waste spend |
| Negatives | Negative-keyword suggestions are as important as positives | Positive keywords only | Irrelevant queries drain budgets |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Keyword count | quantity not quality |
| Landing page footer | boilerplate |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Search volume and CPC estimates inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: source. |
| Keyword-page relevance inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: embeddings. |
| Historical query performance inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: window. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: search_ads_keyword_generation_llm_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: search_volume_and_cpc_estimates, type: double, nullable: false }
    - { name: keyword_page_relevance, type: double, nullable: false }
    - { name: historical_query_performance, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Search volume and CPC estimates and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Keyword-page relevance against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Search volume and CPC estimates, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| RACE reading comprehension | https://www.cs.cmu.edu/~glai1/data/race/ | Research use (see the page) | About 28,000 passages and 100,000 exam questions from English exams for Chinese students | Exam questions, one population. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Spider text-to-SQL | https://yale-lily.github.io/spider | CC BY-SA 4.0 (see the site) | 10,000 questions with SQL over 200 databases for cross-domain text-to-SQL | Clean academic schemas, simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE search_ads_keyword_generation_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE search_ads_keyword_generation_steps (
  task_id TEXT NOT NULL REFERENCES search_ads_keyword_generation_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE search_ads_keyword_generation_approvals (
  task_id TEXT NOT NULL REFERENCES search_ads_keyword_generation_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Search Ads Keyword & Copy Generation": Generate keyword sets, match types and ad copy for search campaigns from a landing page and goal, with quality and policy controls. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Creative, brand safety and ad quality | The ad itself (image, video, copy) affects performance, and unsafe or non-compliant placements harm brands. Generative tools produce variants, and moderation checks copy against policy and context. | Optimising click rate alone rewards clickbait; guardrails for quality, compliance and brand suitability are part of the objective. |
| Forecasting inventory and spend | Publishers forecast available impressions for guaranteed deals; advertisers forecast spend and returns across channels; delivery systems must neither over- nor under-deliver. Seasonality, events and policy changes dominate. | Guaranteed contracts create penalties for under-delivery, so forecasts are used at conservative quantiles. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Search volume and CPC estimates | Planner data. Economics. | Leakage risk to design against: Source. |
| A signal-versus-noise trap in this use case: Grounding | The true signal is keywords derived from the page and search-term data; the common noise is free generation. | Ungrounded keywords waste spend. |

**Ask the experts**

- [ ] What exactly does "Keyword relevance and negative keywords" mean in practice for search ads keyword & copy generation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Search volume and CPC estimates" and "Keyword-page relevance", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to launch" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on volume without conversions, and who can confirm the cut-off times and splits?
- [ ] How often does "Trademark keywords of competitors" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Quality score | A platform's estimate of an ad's relevance and landing-page quality that affects its price and rank. |
| Landing page | The page a user reaches after clicking an ad, whose quality affects conversion and cost. |
| ROAS | Return on ad spend: revenue generated per currency unit of advertising. |
| Retargeting | Showing ads to people who have already visited a site or product. |
| Delayed conversion | A purchase or install that happens hours or days after the click, so recent labels are incomplete. |
| Fine-tuning / SFT | Further training a language model on examples of the desired behaviour. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
| Guardrail metric | A metric that must not get worse when optimising the main objective. |
| Token cost | The price of a model call, proportional to input and output tokens. |
