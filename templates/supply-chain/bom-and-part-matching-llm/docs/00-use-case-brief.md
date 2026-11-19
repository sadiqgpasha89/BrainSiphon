# BOM Parsing & Part Matching with LLMs: use-case brief

> Generated from the blueprint `supply-chain/bom-and-part-matching-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** BOM Parsing & Part Matching with LLMs · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Normalise bills of materials and match parts to approved suppliers and alternatives to speed sourcing and cut errors. The system has to run as a scheduled batch job, inside these limits: Parametric correctness (a 10k resistor is not 1k), Traceability and Millions of parts.

**Why it is hard.** The obvious approach is semantic similarity only, and it fails because embedding similarity confuses near values. The second trap is in "Verification": the real signal is deterministic checks of electrical or mechanical parameters, while teams usually reach for trusting LLM matches.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $1.9K a month. A mistake is expensive in the way mismatch incidents measures it.

**What success looks like.** Offline: Match precision at 99% and Parameter extraction accuracy. Online: BOM processing time and Mismatch incidents. The launch is judged on "BOM processing time" while "Mismatch incidents" must not get worse.

## Objective, loss and constraints

**Business objective.** Normalise bills of materials and match parts to approved suppliers and alternatives to speed sourcing and cut errors.

**Training objective.** `\mathcal{L}=\mathrm{InfoNCE}(\text{part},\text{catalogue part})+\lambda\,\mathrm{SchemaViolation}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{InfoNCE} | Contrastive loss that pulls true matching pairs together and pushes non-matching pairs apart. |
| \text{part} | The embedding of a part description from the bill of materials. |
| \text{catalogue part} | The embedding of the matching catalogue part. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{SchemaViolation} | Penalty when the matched part fails catalogue rules such as unit or category. |

**Hard constraints**

- Parametric correctness (a 10k resistor is not 1k)
- Traceability
- Millions of parts
- Engineer sign-off

## The approach in one paragraph

Start with exact MPN matching and manual lookup. Then earn the move to retrieval with domain-tuned embeddings, LLM parameter extraction into schema, deterministic parametric validators and engineer approval, and only if it beats the baseline on Match precision at 99% and Parameter extraction accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Parameter equality checks | Numeric tolerance comparisons. Correctness. Guard against: unit normalisation. |
| Add Manufacturer part number match | Exact MPN with cross-reference. Identity. Guard against: catalogue. |
| Add Embedding similarity of descriptions | Text embedding score. Candidates. Guard against: domain tuning. |
| Run it as one pipeline | BOM upload (PLM), Parser and normaliser (schema extraction), Candidate retrieval (vector plus keyword), Matching LLM (structured output), Parametric validator (rules) and Engineer approval (human), with Sourcing feedback off the critical path. |
| Optimise the right thing | The objective weighs contrastive loss that pulls true matching pairs together and pushes non-matching pairs apart, so the model is trained on the cost of the decision and not on a generic score. |
| Handle unit ambiguity (mm vs inch) | Unit normalisation and unit-conflict blocks. |

**Deliberately not doing**

- Line item position: none.
- Engineer initials: none.

**How the approach is proven**

Prove it offline on Match precision at 99% and Parameter extraction accuracy using time-ordered splits, then online on "BOM processing time" with "Mismatch incidents" as the guardrail. Watch for: Test BOMs cleaner than production and Exact-match labels only.

## Baseline and production design

- **Baseline (build this first):** Exact MPN matching and manual lookup.
- **Production design:** Retrieval with domain-tuned embeddings, LLM parameter extraction into schema, deterministic parametric validators and engineer approval.

## Why AI, and why this kind

**Why AI.** Normalise bills of materials and match parts to approved suppliers and alternatives to speed sourcing and cut errors. The evidence that separates good from bad outcomes (Parameter equality checks, Manufacturer part number match, Embedding similarity of descriptions) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "semantic similarity only" are what teams reach for first, and they fail because embedding similarity confuses near values. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Retrieval with domain-tuned embeddings, LLM parameter extraction into schema, deterministic parametric validators and engineer approval.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Parameter equality checks, Manufacturer part number match, Embedding similarity of descriptions and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Exact MPN matching and manual lookup | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Retrieval with domain-tuned embeddings, LLM parameter extraction into schema, deterministic parametric validators and engineer approval | chosen | Meets the run-window envelope at $1.04 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (BOM processing time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test BOMs cleaner than production.
- Evaluation trap: Exact-match labels only.
- Unit ambiguity (mm vs inch): wrong dimension accepted.
- Obsolete part numbers: matches to discontinued parts.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
