# Skill Graph Extraction & Job Matching: use-case brief

> Generated from the blueprint `edtech/skill-graph-and-job-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Skill Graph Extraction & Job Matching · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Build a skill graph from courses, resumes and job postings, and match learners to roles with explainable skill overlaps. The system has to run as a scheduled batch job, inside these limits: Taxonomy mapping (ESCO/O*NET), Bias in job data and Privacy of resumes.

**Why it is hard.** The obvious approach is raw keyword overlap, and it fails because synonyms and levels break overlap. The second trap is in "Levels": the real signal is proficiency level not only presence, while teams usually reach for binary skill flags.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way time to match measures it.

**What success looks like.** Offline: Skill extraction F1 and Match NDCG. Online: Placement rate and Time to match. The launch is judged on "Placement rate" while "Time to match" must not get worse.

## Objective, loss and constraints

**Business objective.** Build a skill graph from courses, resumes and job postings, and match learners to roles with explainable skill overlaps.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{NER}}+\lambda\,\mathrm{InfoNCE}(\text{person},\text{role})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{NER}} | Cross-entropy for recognising skill names in text (named-entity recognition). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{InfoNCE} | Contrastive loss that pulls true matching pairs together and pushes non-matching pairs apart. |
| \text{person} | The embedding of a person's skills. |
| \text{role} | The embedding of a job role's required skills. |

**Hard constraints**

- Taxonomy mapping (ESCO/O*NET)
- Bias in job data
- Privacy of resumes
- Fresh skills

## The approach in one paragraph

Start with keyword matching of resumes to postings. Then earn the move to skill NER and entity linking to a taxonomy, proficiency estimation from evidence, graph embeddings for matching with explanations, and only if it beats the baseline on Skill extraction F1 and Match NDCG after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Canonical skill entities | Linked entities. Matching basis. Guard against: linking. |
| Add Proficiency estimate | Evidence-based level. Fit. Guard against: evidence. |
| Add Skill co-occurrence graph | Graph embeddings. Adjacent skills. Guard against: updates. |
| Run it as one pipeline | Documents (resumes, courses, jobs) (ingestion), Skill extractor (NER), Entity linker (taxonomy), Proficiency estimator (model), Matching model (two-tower), Candidate UI (explanations) and Outcome tracking (placements). |
| Optimise the right thing | The objective weighs cross-entropy for recognising skill names in text (named-entity recognition), so the model is trained on the cost of the decision and not on a generic score. |
| Handle emerging skills not in taxonomy | Taxonomy proposal pipeline. |

**Deliberately not doing**

- Resume formatting: noise.
- Names: bias.

**How the approach is proven**

Prove it offline on Skill extraction F1 and Match NDCG using time-ordered splits, then online on "Placement rate" with "Time to match" as the guardrail. Watch for: Evaluating on taxonomy-covered skills only and Using hiring outcomes as truth.

## Baseline and production design

- **Baseline (build this first):** Keyword matching of resumes to postings.
- **Production design:** Skill NER and entity linking to a taxonomy, proficiency estimation from evidence, graph embeddings for matching with explanations.

## Why AI, and why this kind

**Why AI.** Build a skill graph from courses, resumes and job postings, and match learners to roles with explainable skill overlaps. The evidence that separates good from bad outcomes (Canonical skill entities, Proficiency estimate, Skill co-occurrence graph) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw keyword overlap" are what teams reach for first, and they fail because synonyms and levels break overlap. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Skill NER and entity linking to a taxonomy, proficiency estimation from evidence, graph embeddings for matching with explanations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Canonical skill entities, Proficiency estimate, Skill co-occurrence graph and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword matching of resumes to postings | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Skill NER and entity linking to a taxonomy, proficiency estimation from evidence, graph embeddings for matching with explanations | chosen | Meets the run-window envelope at $0.210 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Placement rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on taxonomy-covered skills only.
- Evaluation trap: Using hiring outcomes as truth.
- Emerging skills not in taxonomy: invisible to matching.
- Biased historical hiring data: matching replicates bias.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
