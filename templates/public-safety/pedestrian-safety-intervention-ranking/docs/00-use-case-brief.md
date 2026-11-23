# Pedestrian Safety Intervention Ranking: use-case brief

> Generated from the blueprint `public-safety/pedestrian-safety-intervention-ranking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pedestrian Safety Intervention Ranking · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank crossings and streets for safety treatments by estimated crash risk reduction per cost, so budgets go to the interventions that save most lives. The system has to run as a scheduled batch job, inside these limits: Benefit-cost ranking with uncertainty, Equity weighting for areas with less safe infrastructure and Engineers and communities review lists.

**Why it is hard.** The obvious approach is crash counts only, and it fails because counts ignore exposure and treatment effect. The second trap is in "Equity": the real signal is equity weights shown separately, while teams usually reach for hidden weights.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.7K a month. A mistake is expensive in the way equity of treated areas measures it.

**What success looks like.** Offline: Calibration of risk, Ranking stability and Treatment effect checks in follow-up. Online: Serious injuries per budget, Equity of treated areas and Sites treated per year. The launch is judged on "Serious injuries per budget" while "Equity of treated areas" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank crossings and streets for safety treatments by estimated crash risk reduction per cost, so budgets go to the interventions that save most lives.

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

- Benefit-cost ranking with uncertainty
- Equity weighting for areas with less safe infrastructure
- Engineers and communities review lists
- Annual run for 100K sites

## The approach in one paragraph

Start with treat sites with the most crashes in the last three years, because it is the simple rule. Then earn the move to a crash risk model with treatment effects and cost, equity views and a ranked list for engineers with uncertainty ranges, and only if it beats the baseline on Calibration of risk and Ranking stability after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pedestrian exposure | Pedestrian volumes. Exposure. Guard against: from counts. |
| Add Vehicle speed and volume | Speeds and flows. Hazard. Guard against: from counts. |
| Add Crash history by severity | Recorded crashes. Prior. Guard against: from crash records. |
| Run it as one pipeline | Crash, count and road data (road safety records), Risk model (regression), Treatment effect library (research database), Benefit-cost ranking (optimiser), Equity view (rules) and Outcome study (before after), with Engineer and community review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle low exposure data | Estimated exposure with flags. |

**Deliberately not doing**

- Reporting officer: irrelevant.
- Street name: an identifier.
- Photo name: an artefact.

**How the approach is proven**

Prove it offline on Calibration of risk, Ranking stability and Treatment effect checks in follow-up using time-ordered splits, then online on "Serious injuries per budget" with "Equity of treated areas" as the guardrail. Watch for: Crash counts as the objective, Hidden equity weights and Assumed treatment effects.

## Baseline and production design

- **Baseline (build this first):** Treat sites with the most crashes in the last three years, because it is the simple rule.
- **Production design:** A crash risk model with treatment effects and cost, equity views and a ranked list for engineers with uncertainty ranges.

## Why AI, and why this kind

**Why AI.** Rank crossings and streets for safety treatments by estimated crash risk reduction per cost, so budgets go to the interventions that save most lives. The evidence that separates good from bad outcomes (Pedestrian exposure, Vehicle speed and volume, Crash history by severity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "crash counts only" are what teams reach for first, and they fail because counts ignore exposure and treatment effect. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A crash risk model with treatment effects and cost, equity views and a ranked list for engineers with uncertainty ranges.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pedestrian exposure, Vehicle speed and volume, Crash history by severity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Treat sites with the most crashes in the last three years, because it is the simple rule | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A crash risk model with treatment effects and cost, equity views and a ranked list for engineers with uncertainty ranges | chosen | Meets the run-window envelope at $0.092 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Serious injuries per budget) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Crash counts as the objective.
- Evaluation trap: Hidden equity weights.
- Low exposure data: pedestrian counts are missing.
- New design: few evaluations exist.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
