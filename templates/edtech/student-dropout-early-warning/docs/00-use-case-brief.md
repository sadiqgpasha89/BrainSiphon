# Student Dropout & Attrition Early Warning: use-case brief

> Generated from the blueprint `edtech/student-dropout-early-warning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Student Dropout & Attrition Early Warning · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify learners at risk of dropping out weeks ahead and trigger supportive interventions that actually help. The system has to run as a scheduled batch job, inside these limits: Equity (avoid labelling disadvantaged students), Explainable to advisors and Intervention capacity.

**Why it is hard.** The obvious approach is risk score only, and it fails because advisors need which action helps whom. The second trap is in "Fairness": the real signal is audit subgroup performance and impact, while teams usually reach for maximise AUC.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way advisor contacts per saved student measures it.

**What success looks like.** Offline: Time-dependent AUC and calibration and Subgroup error parity. Online: Retention rate in treated vs control and Advisor contacts per saved student. The launch is judged on "Retention rate in treated vs control" while "Advisor contacts per saved student" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify learners at risk of dropping out weeks ahead and trigger supportive interventions that actually help.

**Training objective.** `\mathcal{L}=-\sum_i\left[\delta_i\log h(t_i)-H(t_i)\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \delta_i | Event indicator: 1 if student i dropped out during observation, 0 if still enrolled (censored). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| h | The hazard: the chance of dropping out at time t given the student is still enrolled. |
| t_i | The time at which student i dropped out or was last observed. |
| H | The cumulative hazard: the accumulated risk of dropping out up to time t_i. |

**Hard constraints**

- Equity (avoid labelling disadvantaged students)
- Explainable to advisors
- Intervention capacity
- Privacy

## The approach in one paragraph

Start with rule-based alerts on missed deadlines. Then earn the move to discrete-time survival model with fairness audits and an uplift layer to match students to interventions within advisor capacity, and only if it beats the baseline on Time-dependent AUC and calibration and Subgroup error parity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Engagement decay | Trend in logins and submissions. Disengagement. Guard against: window. |
| Add Assessment trajectory | Grade trends. Struggle. Guard against: as-of. |
| Add Support-contact history | Advisor contacts. Context. Guard against: consent. |
| Run it as one pipeline | LMS and SIS data (lake), Feature builder (Spark), Dropout hazard model (GBDT survival), Uplift allocator (T-learner), Advisor worklist (human), Outreach tracking (CRM) and Retention outcomes (labels). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle term break creates apparent disengagement | Calendar-aware features. |

**Deliberately not doing**

- Demographic proxies: fairness risk.
- Student ID: none.

**How the approach is proven**

Prove it offline on Time-dependent AUC and calibration and Subgroup error parity using time-ordered splits, then online on "Retention rate in treated vs control" with "Advisor contacts per saved student" as the guardrail. Watch for: Interventions confound labels and Using demographic proxies.

## Baseline and production design

- **Baseline (build this first):** Rule-based alerts on missed deadlines.
- **Production design:** Discrete-time survival model with fairness audits and an uplift layer to match students to interventions within advisor capacity.

## Why AI, and why this kind

**Why AI.** Identify learners at risk of dropping out weeks ahead and trigger supportive interventions that actually help. The evidence that separates good from bad outcomes (Engagement decay, Assessment trajectory, Support-contact history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "risk score only" are what teams reach for first, and they fail because advisors need which action helps whom. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Discrete-time survival model with fairness audits and an uplift layer to match students to interventions within advisor capacity.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Engagement decay, Assessment trajectory, Support-contact history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based alerts on missed deadlines | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Discrete-time survival model with fairness audits and an uplift layer to match students to interventions within advisor capacity | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Retention rate in treated vs control) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Interventions confound labels.
- Evaluation trap: Using demographic proxies.
- Term break creates apparent disengagement: holiday breaks look like disengagement and trigger a wave of false warnings.
- Intervention creates stigma when visible to peers: visible outreach labels students and creates stigma that harms rather than helps.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
