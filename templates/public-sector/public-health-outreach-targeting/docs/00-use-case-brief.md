# Public Health Outreach Targeting: use-case brief

> Generated from the blueprint `public-sector/public-health-outreach-targeting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Health Outreach Targeting · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose neighbourhoods and channels for vaccination and screening outreach by estimated gaps in uptake and barriers, so services reach people who are least served, using area-level data. The system has to run as a scheduled batch job, inside these limits: Area-level targeting with no individual profiling, Consent respected for any contact and Community partners review plans.

**Why it is hard.** The obvious approach is raising the average uptake, and it fails because the average can rise while gaps widen. The second trap is in "Level": the real signal is neighbourhood and service access data, while teams usually reach for individual risk scores.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.7K a month. A mistake is expensive in the way coverage in underserved areas measures it.

**What success looks like.** Offline: Effect on uptake in randomised comparisons, Calibration and Equity gap change. Online: Uptake gap, Coverage in underserved areas and Cost per additional person reached. The launch is judged on "Uptake gap" while "Coverage in underserved areas" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose neighbourhoods and channels for vaccination and screening outreach by estimated gaps in uptake and barriers, so services reach people who are least served, using area-level data.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Area-level targeting with no individual profiling
- Consent respected for any contact
- Community partners review plans
- Equity gap tracked as the main metric
- 5K neighbourhoods

## The approach in one paragraph

Start with mass mailings to all eligible residents, because it is the standard approach. Then earn the move to an area-level model of gaps and barriers with a rollout that includes randomised comparisons and community review of the plan, and only if it beats the baseline on Effect on uptake in randomised comparisons and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Uptake gap against target | Gap in coverage. Need. Guard against: from registers. |
| Add Access barriers | Travel time to services and opening hours. Barrier. Guard against: from GIS. |
| Add Language and community channels | Languages and trusted channels. Channel fit. Guard against: from community data. |
| Run it as one pipeline | Coverage and service data (registers), Barrier data join (GIS), Gap and effect model (gradient boosting), Channel selection (rules), Outreach delivery (service teams) and Equity evaluation (quarterly), with Community review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle small areas | Aggregation and suppression. |

**Deliberately not doing**

- Resident name: personal data.
- Postcode text alone: a proxy for protected groups.
- Clinic name: an identifier.

**How the approach is proven**

Prove it offline on Effect on uptake in randomised comparisons, Calibration and Equity gap change using time-ordered splits, then online on "Uptake gap" with "Coverage in underserved areas" as the guardrail. Watch for: Individual profiling, Average uptake as the metric and Assumed effects.

## Baseline and production design

- **Baseline (build this first):** Mass mailings to all eligible residents, because it is the standard approach.
- **Production design:** An area-level model of gaps and barriers with a rollout that includes randomised comparisons and community review of the plan.

## Why AI, and why this kind

**Why AI.** Choose neighbourhoods and channels for vaccination and screening outreach by estimated gaps in uptake and barriers, so services reach people who are least served, using area-level data. The evidence that separates good from bad outcomes (Uptake gap against target, Access barriers, Language and community channels) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raising the average uptake" are what teams reach for first, and they fail because the average can rise while gaps widen. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: An area-level model of gaps and barriers with a rollout that includes randomised comparisons and community review of the plan.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Uptake gap against target, Access barriers, Language and community channels and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Mass mailings to all eligible residents, because it is the standard approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An area-level model of gaps and barriers with a rollout that includes randomised comparisons and community review of the plan | chosen | Meets the run-window envelope at $0.092 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Uptake gap) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Individual profiling.
- Evaluation trap: Average uptake as the metric.
- Small areas: counts are too small.
- Trust gaps: the message is not trusted.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
