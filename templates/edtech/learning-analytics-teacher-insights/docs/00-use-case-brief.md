# Teacher Dashboard Insights & Alerts: use-case brief

> Generated from the blueprint `edtech/learning-analytics-teacher-insights` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Teacher Dashboard Insights & Alerts · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Summarise class and student learning data into prioritised, actionable insights for teachers, such as who needs help on which concept. The system has to run interactively, within a few seconds, inside these limits: Teacher time budget, Accuracy of insights and Privacy.

**Why it is hard.** The obvious approach is dashboards of raw metrics, and it fails because teachers lack time to interpret raw charts. The second trap is in "Priority": the real signal is rank by expected learning impact, while teams usually reach for rank by anomaly score.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $181.4K a month. A mistake is expensive in the way student outcomes in classes using insights measures it.

**What success looks like.** Offline: Insight precision rated by teachers and Narrative numeric accuracy. Online: Insights acted on and Student outcomes in classes using insights. The launch is judged on "Insights acted on" while "Student outcomes in classes using insights" must not get worse.

## Objective, loss and constraints

**Business objective.** Summarise class and student learning data into prioritised, actionable insights for teachers, such as who needs help on which concept.

**Training objective.** `\mathcal{L}=\mathrm{RankLoss}(\text{insights by teacher action})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{RankLoss} | Ranking loss: penalises placing a less relevant item above a more relevant one. |
| \text{insights by teacher action} | Insights ranked by whether teachers acted on them, so the model learns which insights are useful. |

**Hard constraints**

- Teacher time budget
- Accuracy of insights
- Privacy
- Explainability

## The approach in one paragraph

Start with static dashboards with filters. Then earn the move to insight generation over mastery data with impact ranking, LLM narrative with data citations and feedback-driven ranking, and only if it beats the baseline on Insight precision rated by teachers and Narrative numeric accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Concept-level class mastery gaps | Share below mastery by concept. Reteach target. Guard against: kT. |
| Add At-risk student cluster | Similar struggle patterns. Small-group intervention. Guard against: clustering. |
| Add Insight usefulness score | Teacher acts on insight. Feedback. Guard against: logging. |
| Run it as one pipeline | Learning data (lakehouse), Mastery and clustering (analytics), Insight generator (rules and models), Impact ranker (GBDT), Narrative writer (LLM with citations) and Action logging (feedback), with Teacher view off the critical path. |
| Optimise the right thing | The objective weighs ranking loss: penalises placing a less relevant item above a more relevant one, so the model is trained on the cost of the decision and not on a generic score. |
| Handle small classes produce noisy insights | Minimum-sample rules and uncertainty. |

**Deliberately not doing**

- Raw clicks: noise.
- Login counts: weak.

**How the approach is proven**

Prove it offline on Insight precision rated by teachers and Narrative numeric accuracy using time-ordered splits, then online on "Insights acted on" with "Student outcomes in classes using insights" as the guardrail. Watch for: Rating insights without outcome follow-up and Not testing small classes.

## Baseline and production design

- **Baseline (build this first):** Static dashboards with filters.
- **Production design:** Insight generation over mastery data with impact ranking, LLM narrative with data citations and feedback-driven ranking.

## Why AI, and why this kind

**Why AI.** Summarise class and student learning data into prioritised, actionable insights for teachers, such as who needs help on which concept. The evidence that separates good from bad outcomes (Concept-level class mastery gaps, At-risk student cluster, Insight usefulness score) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "dashboards of raw metrics" are what teams reach for first, and they fail because teachers lack time to interpret raw charts. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Insight generation over mastery data with impact ranking, LLM narrative with data citations and feedback-driven ranking.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Concept-level class mastery gaps, At-risk student cluster, Insight usefulness score and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static dashboards with filters | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Insight generation over mastery data with impact ranking, LLM narrative with data citations and feedback-driven ranking | chosen | Meets the 2500 ms envelope at $4.03 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Insights acted on) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Rating insights without outcome follow-up.
- Evaluation trap: Not testing small classes.
- Small classes produce noisy insights: misleading alerts.
- LLM narrative misstates a statistic: teacher acts on wrong info.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
