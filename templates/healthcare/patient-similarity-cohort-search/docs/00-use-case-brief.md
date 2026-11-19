# Patient Similarity & Cohort Search: use-case brief

> Generated from the blueprint `healthcare/patient-similarity-cohort-search` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patient Similarity & Cohort Search · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Let clinicians and researchers find similar patients and build cohorts from structured data and notes using natural-language queries. The system has to run interactively, within a few seconds, inside these limits: Privacy and access control, Query explanations and Cohort definitions reproducible.

**Why it is hard.** The obvious approach is single-table filters, and it fails because single-field cohort filters miss complex phenotypes. The second trap is in "Reproducibility": the real signal is executable cohort definitions from queries, while teams usually reach for ad hoc screens.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $12.3K a month. A mistake is expensive in the way reuse of cohort definitions measures it.

**What success looks like.** Offline: Cohort precision and recall vs manual chart review and Retrieval NDCG. Online: Time to build cohorts and Reuse of cohort definitions. The launch is judged on "Time to build cohorts" while "Reuse of cohort definitions" must not get worse.

## Objective, loss and constraints

**Business objective.** Let clinicians and researchers find similar patients and build cohorts from structured data and notes using natural-language queries.

**Training objective.** `\mathcal{L}=\mathrm{InfoNCE}(z_p,z_{p^+})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{InfoNCE} | Contrastive loss that pulls true matching pairs together and pushes non-matching pairs apart. |
| z_p | The learned embedding of a patient: z_p for the query patient and z_{p+} for a similar patient. |

**Hard constraints**

- Privacy and access control
- Query explanations
- Cohort definitions reproducible
- Fast over 10M patients

## The approach in one paragraph

Start with sQL cohort filters on diagnosis codes. Then earn the move to dual retrieval (structured embeddings plus note semantic search) with an LLM translating questions to validated cohort queries, and only if it beats the baseline on Cohort precision and recall vs manual chart review and Retrieval NDCG after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Longitudinal code embedding | Sequence-based patient embedding. Similarity. Guard against: time window. |
| Add Lab trajectory features | Summary of lab trends. Phenotype. Guard against: units normalised. |
| Add Note-derived phenotypes | Extracted conditions. Coverage. Guard against: negation handling. |
| Run it as one pipeline | Query interface (web UI), Query translator (LLM to SQL and filters), Patient embedding retrieval (ANN), Structured filter engine (OMOP database) and Cohort validator (constraint checks), with Researcher review and Access audit off the critical path. |
| Optimise the right thing | The objective weighs contrastive loss that pulls true matching pairs together and pushes non-matching pairs apart, so the model is trained on the cost of the decision and not on a generic score. |
| Handle natural-language ambiguity | Show executable definition and require confirmation. |

**Deliberately not doing**

- Patient ID: none.
- Encounter count alone: utilisation bias.

**How the approach is proven**

Prove it offline on Cohort precision and recall vs manual chart review and Retrieval NDCG using time-ordered splits, then online on "Time to build cohorts" with "Reuse of cohort definitions" as the guardrail. Watch for: Gold cohorts from one disease and Embeddings trained on the same records used for test.

## Baseline and production design

- **Baseline (build this first):** SQL cohort filters on diagnosis codes.
- **Production design:** Dual retrieval (structured embeddings plus note semantic search) with an LLM translating questions to validated cohort queries.

## Why AI, and why this kind

**Why AI.** Let clinicians and researchers find similar patients and build cohorts from structured data and notes using natural-language queries. The evidence that separates good from bad outcomes (Longitudinal code embedding, Lab trajectory features, Note-derived phenotypes) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single-table filters" are what teams reach for first, and they fail because single-field cohort filters miss complex phenotypes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Dual retrieval (structured embeddings plus note semantic search) with an LLM translating questions to validated cohort queries.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Longitudinal code embedding, Lab trajectory features, Note-derived phenotypes and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: SQL cohort filters on diagnosis codes | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Dual retrieval (structured embeddings plus note semantic search) with an LLM translating questions to validated cohort queries | chosen | Meets the 2500 ms envelope at $2.73 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to build cohorts) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Gold cohorts from one disease.
- Evaluation trap: Embeddings trained on the same records used for test.
- Natural-language ambiguity: wrong cohort definition.
- Rare disease cohort re-identification risk: small cohorts for rare conditions can re-identify individual patients.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
