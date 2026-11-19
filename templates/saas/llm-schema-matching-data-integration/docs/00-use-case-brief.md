# Schema Matching & Data Integration with LLMs: use-case brief

> Generated from the blueprint `saas/llm-schema-matching-data-integration` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Schema Matching & Data Integration with LLMs · **Domain:** saas · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Map columns between customer data sources and the product's canonical schema, generating validated transformations. The system has to run as a scheduled batch job, inside these limits: Thousands of source systems, Mapping correctness and Transformation testing.

**Why it is hard.** The obvious approach is name similarity only, and it fails because same name can mean different things. The second trap is in "Transform": the real signal is generate and test transformation code, while teams usually reach for free-form mapping text.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.9K a month. A mistake is expensive in the way data errors after integration measures it.

**What success looks like.** Offline: Mapping accuracy on labelled schemas and Validation pass rate. Online: Integration setup time and Data errors after integration. The launch is judged on "Integration setup time" while "Data errors after integration" must not get worse.

## Objective, loss and constraints

**Business objective.** Map columns between customer data sources and the product's canonical schema, generating validated transformations.

**Training objective.** `\mathcal{L}=\mathrm{InfoNCE}(\text{column},\text{target field})+\lambda\,\mathrm{ValidationFailure}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{InfoNCE} | Contrastive loss that pulls true matching pairs together and pushes non-matching pairs apart. |
| \text{column} | The embedding of a source column. |
| \text{target field} | The embedding of the matching field in the target schema. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ValidationFailure} | Penalty when mapped data fails validation checks such as type or range. |

**Hard constraints**

- Thousands of source systems
- Mapping correctness
- Transformation testing
- Human approval

## The approach in one paragraph

Start with manual mapping spreadsheets. Then earn the move to embedding candidate retrieval, LLM mapping proposals, execution-based validation on samples and human approval with learned corrections, and only if it beats the baseline on Mapping accuracy on labelled schemas and Validation pass rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Column name and description similarity | Embedding similarity. Candidates. Guard against: descriptions. |
| Add Value-distribution match | Type and distribution compatibility. Verification. Guard against: sampling. |
| Add Constraint checks | Uniqueness, nullability, referential. Correctness. Guard against: rules. |
| Run it as one pipeline | Source schema and samples (connector), Candidate retriever (embeddings), Mapping LLM (structured output), Validation runner (sandbox SQL), Approval UI (human) and Pipeline deploy (ELT), with Correction feedback off the critical path. |
| Optimise the right thing | The objective weighs contrastive loss that pulls true matching pairs together and pushes non-matching pairs apart, so the model is trained on the cost of the decision and not on a generic score. |
| Handle ambiguous columns (date meaning order vs ship) | Semantic validation on sample values and required confirmation. |

**Deliberately not doing**

- Column position: arbitrary.
- Table creation date: none.

**How the approach is proven**

Prove it offline on Mapping accuracy on labelled schemas and Validation pass rate using time-ordered splits, then online on "Integration setup time" with "Data errors after integration" as the guardrail. Watch for: Evaluating with clean schemas and Accepting proposals without execution.

## Baseline and production design

- **Baseline (build this first):** Manual mapping spreadsheets.
- **Production design:** Embedding candidate retrieval, LLM mapping proposals, execution-based validation on samples and human approval with learned corrections.

## Why AI, and why this kind

**Why AI.** Map columns between customer data sources and the product's canonical schema, generating validated transformations. The evidence that separates good from bad outcomes (Column name and description similarity, Value-distribution match, Constraint checks) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "name similarity only" are what teams reach for first, and they fail because same name can mean different things. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Embedding candidate retrieval, LLM mapping proposals, execution-based validation on samples and human approval with learned corrections.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Column name and description similarity, Value-distribution match, Constraint checks and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual mapping spreadsheets | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Embedding candidate retrieval, LLM mapping proposals, execution-based validation on samples and human approval with learned corrections | chosen | Meets the run-window envelope at $2.06 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Integration setup time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating with clean schemas.
- Evaluation trap: Accepting proposals without execution.
- Ambiguous columns (date meaning order vs ship): wrong mapping silently.
- PII columns mapped to the wrong target: a personal-data column mapped to the wrong target field creates a privacy risk downstream.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
