# Course & Career Path Recommendation: use-case brief

> Generated from the blueprint `edtech/course-recommendation-career-paths` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Course & Career Path Recommendation · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend courses and learning paths aligned with learner goals and labour-market skills, balancing interest and career outcomes. The system has to run in under 100 milliseconds, inside these limits: Diversity and fairness, Prerequisites and Up-to-date skills data.

**Why it is hard.** The obvious approach is popularity-based, and it fails because popular courses don't fit individual goals. The second trap is in "Outcomes": the real signal is optimise completion and outcomes, while teams usually reach for clicks.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $12.4K a month. A mistake is expensive in the way career outcome follow-up measures it.

**What success looks like.** Offline: NDCG and completion-weighted hit rate and Fairness gaps. Online: Completion rate and Career outcome follow-up. The launch is judged on "Completion rate" while "Career outcome follow-up" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend courses and learning paths aligned with learner goals and labour-market skills, balancing interest and career outcomes.

**Training objective.** `\mathcal{L}=\mathrm{BPR}+\lambda\,\mathrm{GoalAlignment}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BPR} | Bayesian personalised ranking loss: trains the model to score items a user chose above items they did not. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GoalAlignment} | Penalty when recommended courses do not move the learner toward their stated career goal. |

**Hard constraints**

- Diversity and fairness
- Prerequisites
- Up-to-date skills data
- Explainable

## The approach in one paragraph

Start with collaborative filtering on enrolments. Then earn the move to goal-aware two-tower retrieval with a skills knowledge graph, completion-aware ranking and explanations referencing skill gaps, and only if it beats the baseline on NDCG and completion-weighted hit rate and Fairness gaps after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Skill-gap vector | Target role skills minus current skills. Direction. Guard against: skills graph. |
| Add Course completion likelihood | Predicted completion for learner. Realism. Guard against: calibration. |
| Add Market demand for skill | Job-posting trends. Value. Guard against: data freshness. |
| Run it as one pipeline | Learner profile (feature store), Skills graph lookup (graph store), Candidate retrieval (two-tower), Ranker (GBDT), Prerequisite filter (rules), Recommendation API (app) and Enrolment and completion logs (events). |
| Optimise the right thing | The objective weighs bayesian personalised ranking loss: trains the model to score items a user chose above items they did not, so the model is trained on the cost of the decision and not on a generic score. |
| Handle skills taxonomy changes | Taxonomy versioning and mapping. |

**Deliberately not doing**

- Course title popularity: rich-get-richer.
- Learner device: weak.

**How the approach is proven**

Prove it offline on NDCG and completion-weighted hit rate and Fairness gaps using time-ordered splits, then online on "Completion rate" with "Career outcome follow-up" as the guardrail. Watch for: Training on enrolments that reflect past recommendations and Ignoring fairness drift.

## Baseline and production design

- **Baseline (build this first):** Collaborative filtering on enrolments.
- **Production design:** Goal-aware two-tower retrieval with a skills knowledge graph, completion-aware ranking and explanations referencing skill gaps.

## Why AI, and why this kind

**Why AI.** Recommend courses and learning paths aligned with learner goals and labour-market skills, balancing interest and career outcomes. The evidence that separates good from bad outcomes (Skill-gap vector, Course completion likelihood, Market demand for skill) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "popularity-based" are what teams reach for first, and they fail because popular courses don't fit individual goals. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Goal-aware two-tower retrieval with a skills knowledge graph, completion-aware ranking and explanations referencing skill gaps.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Skill-gap vector, Course completion likelihood, Market demand for skill and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Collaborative filtering on enrolments | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Goal-aware two-tower retrieval with a skills knowledge graph, completion-aware ranking and explanations referencing skill gaps | chosen | Meets the 80 ms envelope at $0.069 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Completion rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on enrolments that reflect past recommendations.
- Evaluation trap: Ignoring fairness drift.
- Skills taxonomy changes: embeddings misaligned.
- Gender-stereotyped recommendations: unfair career steering.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
