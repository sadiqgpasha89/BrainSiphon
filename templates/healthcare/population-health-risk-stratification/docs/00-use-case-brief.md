# Population Health Risk Stratification: use-case brief

> Generated from the blueprint `healthcare/population-health-risk-stratification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Population Health Risk Stratification · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Stratify a health plan population by future cost and avoidable utilisation to target care management where it changes outcomes. The system has to run as a scheduled batch job, inside these limits: Avoid cost-based bias against underserved groups, Monthly refresh and Explainable to care managers.

**Why it is hard.** The obvious approach is predict cost only, and it fails because cost-based labels under-identify groups with less access. The second trap is in "Targeting": the real signal is expected program benefit, while teams usually reach for highest predicted risk.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.6K a month. A mistake is expensive in the way programme cost per outcome measures it.

**What success looks like.** Offline: Calibration and top-decile capture and Fairness gaps in selection. Online: Avoidable admissions in programme vs control and Programme cost per outcome. The launch is judged on "Avoidable admissions in programme vs control" while "Programme cost per outcome" must not get worse.

## Objective, loss and constraints

**Business objective.** Stratify a health plan population by future cost and avoidable utilisation to target care management where it changes outcomes.

**Training objective.** `\mathcal{L}=\mathrm{Tweedie}(y,\hat\mu)+\lambda\,\mathrm{FairnessGap}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Tweedie} | Tweedie deviance: a loss for non-negative outcomes with many zeros and a heavy right tail, such as insurance claims. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \hat{\mu} | The predicted expected cost or utilisation for each patient. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{FairnessGap} | Penalty when predictions differ systematically between demographic groups. |

**Hard constraints**

- Avoid cost-based bias against underserved groups
- Monthly refresh
- Explainable to care managers
- Capacity-limited programmes

## The approach in one paragraph

Start with hCC risk score. Then earn the move to gradient-boosted multi-outcome model with fairness constraints and an uplift model for programme assignment, and only if it beats the baseline on Calibration and top-decile capture and Fairness gaps in selection after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Chronic condition burden | Count and severity of conditions. Need. Guard against: diagnoses by claim date. |
| Add Prior-year utilisation | ED visits and admissions. Utilisation pattern. Guard against: window before target. |
| Add Social-risk indicators | Housing, food insecurity screens. Drivers of avoidable events. Guard against: consent and accuracy. |
| Run it as one pipeline | Claims and EHR lake (warehouse), Feature builder (Spark), Risk models (multi-outcome GBDT), Programme assigner (uplift and capacity), Care manager worklist (human) and Outcomes (claims), with Fairness audit off the critical path. |
| Optimise the right thing | The objective weighs tweedie deviance: a loss for non-negative outcomes with many zeros and a heavy right tail, such as insurance claims, so the model is trained on the cost of the decision and not on a generic score. |
| Handle coding intensity differs across providers | Normalise for documentation intensity. |

**Deliberately not doing**

- Prior-year total spend: encodes access disparities.
- Plan ID: admin.

**How the approach is proven**

Prove it offline on Calibration and top-decile capture and Fairness gaps in selection using time-ordered splits, then online on "Avoidable admissions in programme vs control" with "Programme cost per outcome" as the guardrail. Watch for: Using cost as proxy for need and Training on enrolled patients only.

## Baseline and production design

- **Baseline (build this first):** HCC risk score.
- **Production design:** Gradient-boosted multi-outcome model with fairness constraints and an uplift model for programme assignment.

## Why AI, and why this kind

**Why AI.** Stratify a health plan population by future cost and avoidable utilisation to target care management where it changes outcomes. The evidence that separates good from bad outcomes (Chronic condition burden, Prior-year utilisation, Social-risk indicators) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "predict cost only" are what teams reach for first, and they fail because cost-based labels under-identify groups with less access. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient-boosted multi-outcome model with fairness constraints and an uplift model for programme assignment.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Chronic condition burden, Prior-year utilisation, Social-risk indicators and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: HCC risk score | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient-boosted multi-outcome model with fairness constraints and an uplift model for programme assignment | chosen | Meets the run-window envelope at $1.80 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Avoidable admissions in programme vs control) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using cost as proxy for need.
- Evaluation trap: Training on enrolled patients only.
- Coding intensity differs across providers: risk scores inflated.
- New benefit design: utilisation patterns shift.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
