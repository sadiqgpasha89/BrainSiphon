# Conversational Ads & Brand Assistant: data and feature specification

> Generated from the blueprint `adtech/conversational-ads-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Conversational Ads & Brand Assistant · **Domain:** adtech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Conversational Ads & Brand Assistant": Serve interactive brand assistants inside ad units that answer product questions truthfully and hand off to purchase or lead capture. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on friendly prompts.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| KB grounding rate | answers supported by approved sources | Safety | Verification |   |   |   |
| Handoff conversion rate | clicks to purchase | Value | Funnel |   |   |   |
| Safety filter hits | blocked outputs | Risk | Classifier |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Claims | Answers constrained to an approved knowledge base | Open-ended generation | Unapproved claims create legal liability |
| Handoff | Clear paths to purchase | Chat for chat's sake | Conversation without conversion is a cost |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Chat length | not value |
| Response time only | not quality |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| KB grounding rate inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: verification. |
| Handoff conversion rate inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: funnel. |
| Safety filter hits inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: classifier. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: conversational_ads_assistant_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: kb_grounding_rate, type: double, nullable: false }
    - { name: handoff_conversion_rate, type: double, nullable: false }
    - { name: safety_filter_hits, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on KB grounding rate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Handoff conversion rate against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as KB grounding rate, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| KDD Cup 2012 Track 2: ad click prediction | https://www.kaggle.com/c/kddcup2012-track2 | Competition rules; free Kaggle login | Search-ad impressions with query, ad, user and position fields | Old and anonymised, but it records the display position. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE conversational_ads_assistant_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE conversational_ads_assistant_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES conversational_ads_assistant_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON conversational_ads_assistant_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE conversational_ads_assistant_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Conversational Ads & Brand Assistant": Serve interactive brand assistants inside ad units that answer product questions truthfully and hand off to purchase or lead capture. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Creative, brand safety and ad quality | The ad itself (image, video, copy) affects performance, and unsafe or non-compliant placements harm brands. Generative tools produce variants, and moderation checks copy against policy and context. | Optimising click rate alone rewards clickbait; guardrails for quality, compliance and brand suitability are part of the objective. |
| Click quality and invalid traffic | Not every click is a real, interested human. Bots, click farms, accidental taps and misleading creatives produce invalid traffic that inflates click rates and wastes advertiser budget, and industry bodies set standards for filtering it. Very short dwell time after a click is a common signal. | Training on junk clicks teaches the model to reward what causes mistakes, and advertisers punish platforms that bill for them. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: KB grounding rate | Answers supported by approved sources. Safety. | Leakage risk to design against: Verification. |
| A signal-versus-noise trap in this use case: Claims | The true signal is answers constrained to an approved knowledge base; the common noise is open-ended generation. | Unapproved claims create legal liability. |

**Ask the experts**

- [ ] What exactly does "Only approved claims" mean in practice for conversational ads & brand assistant: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "KB grounding rate" and "Handoff conversion rate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Conversion per session" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on friendly prompts, and who can confirm the cut-off times and splits?
- [ ] How often does "User asks about medical or financial advice" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Brand safety | Keeping ads away from content that could harm the advertiser's reputation. |
| Multi-touch attribution (MTA) | Assigning conversion credit across all the ad exposures along a customer's path. |
| Adstock | The lagged, decaying effect of advertising that continues after the ad is seen. |
| Brand lift | The change in awareness, favourability or purchase intent caused by a campaign, measured by surveys. |
| Impression | One instance of an ad being shown to a user; the denominator of click-through rate. |
| CTR | Click-through rate: clicks divided by impressions, typically a few percent or much less. |
| CPM / CPC / CPA | Pricing per thousand impressions, per click or per action such as a purchase or install. |
| eCPM | Effective cost per mille: expected revenue per thousand impressions, used to rank bids of different pricing types. |
| RTB | Real-time bidding: ads sold one impression at a time in an auction that runs while the page loads. |
| SSP | Supply-side platform, the system publishers use to sell their ad space. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Abstention | Declining to answer because the evidence is missing. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
| Guardrail metric | A metric that must not get worse when optimising the main objective. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| Token cost | The price of a model call, proportional to input and output tokens. |
