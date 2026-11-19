# Learning Outcome Uplift Modelling: use-case brief

> Generated from the blueprint `edtech/learning-outcome-uplift-modeling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Learning Outcome Uplift Modelling · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate which learners benefit from which interventions (tutoring, nudges, resources) to allocate scarce support effectively. The system has to run as a scheduled batch job, inside these limits: Randomised pilots, Ethical allocation and Small samples.

**Why it is hard.** The obvious approach is highest predicted risk, and it fails because the highest risk may not benefit. The second trap is in "Ethics": the real signal is equity-aware allocation, while teams usually reach for pure efficiency.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.6K a month. A mistake is expensive in the way equity metrics measures it.

**What success looks like.** Offline: Qini or policy value on holdout and CI coverage. Online: Learning gain per support hour and Equity metrics. The launch is judged on "Learning gain per support hour" while "Equity metrics" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate which learners benefit from which interventions (tutoring, nudges, resources) to allocate scarce support effectively.

**Training objective.** `\hat\tau(x)=\mathbb{E}[Y(1)-Y(0)\mid x]\ \text{via causal forests}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \hat{\tau} | The estimated causal effect of the intervention for a learner with features x. |
| x | The learner's features. |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| Y | The learning outcome: Y(1) if the learner receives the intervention and Y(0) if not. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |

**Hard constraints**

- Randomised pilots
- Ethical allocation
- Small samples
- Explainability to educators

## The approach in one paragraph

Start with provide support to the lowest-scoring students. Then earn the move to causal forests on randomised pilots with equity constraints and policy-learning for allocation, and only if it beats the baseline on Qini or policy value on holdout and CI coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pre-intervention mastery | Baseline mastery. Heterogeneity. Guard against: window. |
| Add Engagement history | Prior engagement. Responsiveness. Guard against: window. |
| Add Context variables | Class and school context. Moderators. Guard against: data. |
| Run it as one pipeline | Pilot data (randomised trials), Feature builder (Spark), Uplift model (causal forest), Policy learner (allocation), Equity check (constraints), Educator decision (human) and Outcome follow-up (assessments). |
| Optimise the right thing | The objective weighs the estimated causal effect of the intervention for a learner with features x, so the model is trained on the cost of the decision and not on a generic score. |
| Handle small pilots produce noisy effects | Shrinkage and uncertainty-aware allocation. |

**Deliberately not doing**

- Post-intervention variables: collider bias.
- Teacher ID: personal.

**How the approach is proven**

Prove it offline on Qini or policy value on holdout and CI coverage using time-ordered splits, then online on "Learning gain per support hour" with "Equity metrics" as the guardrail. Watch for: Using observational assignment data and Ignoring spillover.

## Baseline and production design

- **Baseline (build this first):** Provide support to the lowest-scoring students.
- **Production design:** Causal forests on randomised pilots with equity constraints and policy-learning for allocation.

## Why AI, and why this kind

**Why AI.** Estimate which learners benefit from which interventions (tutoring, nudges, resources) to allocate scarce support effectively. The evidence that separates good from bad outcomes (Pre-intervention mastery, Engagement history, Context variables) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "highest predicted risk" are what teams reach for first, and they fail because the highest risk may not benefit. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Causal forests on randomised pilots with equity constraints and policy-learning for allocation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pre-intervention mastery, Engagement history, Context variables and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Provide support to the lowest-scoring students | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Causal forests on randomised pilots with equity constraints and policy-learning for allocation | chosen | Meets the run-window envelope at $0.360 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Learning gain per support hour) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using observational assignment data.
- Evaluation trap: Ignoring spillover.
- Small pilots produce noisy effects: unstable allocation.
- Intervention spillover to peers: treated students share help with untreated peers, biasing the estimated effect.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
