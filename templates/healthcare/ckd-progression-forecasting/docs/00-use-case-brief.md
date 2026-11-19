# Chronic Kidney Disease Progression Forecasting: use-case brief

> Generated from the blueprint `healthcare/ckd-progression-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Chronic Kidney Disease Progression Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast eGFR trajectories and kidney failure risk to trigger timely nephrology referral and therapy. The system has to run as a scheduled batch job, inside these limits: Irregular labs, Explainability for clinicians and Fairness across race-free equations.

**Why it is hard.** The obvious approach is mixing legacy equations, and it fails because inconsistent eGFR definitions create artificial drops. The second trap is in "Dynamics": the real signal is joint longitudinal and survival model, while teams usually reach for separate models.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $1.6K a month. A mistake is expensive in the way progression to dialysis measures it.

**What success looks like.** Offline: Time-dependent AUC and calibration and Trajectory RMSE. Online: Timely referrals and Progression to dialysis. The launch is judged on "Timely referrals" while "Progression to dialysis" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast eGFR trajectories and kidney failure risk to trigger timely nephrology referral and therapy.

**Training objective.** `\mathcal{L}=-\sum_i\log p(\text{eGFR}_{i,1:T}\mid x_i)+\lambda\,\mathrm{Survival}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p | The model's probability of the observed series given the patient's features. |
| \text{eGFR}_{i,1:T} | Estimated glomerular filtration rate, a kidney function measure: eGFR_{i,1:T} is patient i's series over T visits. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| x_i | The input features describing one example (what the model sees). (one value per example i) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Survival} | Survival loss for kidney failure events, handling patients not yet failed at the end of follow-up. |

**Hard constraints**

- Irregular labs
- Explainability for clinicians
- Fairness across race-free equations
- Monthly refresh

## The approach in one paragraph

Start with kidney failure risk equation (KFRE). Then earn the move to joint longitudinal-survival deep model with irregular time handling and calibrated 2- and 5-year risk, and only if it beats the baseline on Time-dependent AUC and calibration and Trajectory RMSE after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around eGFR slope | Linear mixed-model slope over 2 years. Progression speed. Guard against: observations before index. |
| Add Albuminuria category | UACR measurement. Strongest risk addition. Guard against: latest before index. |
| Add Blood-pressure control | Fraction of readings in target. Modifiable. Guard against: outpatient only. |
| Run it as one pipeline | Lab and visit data (EHR), Harmoniser (units and equations), Trajectory model (joint model), Risk calibrator (isotonic), Referral rules (thresholds) and Outcomes (dialysis registry), with Nephrology review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle lab assay change | Assay-version metadata and harmonisation. |

**Deliberately not doing**

- Insurance type: proxy.
- Lab ordering clinic: artefact.

**How the approach is proven**

Prove it offline on Time-dependent AUC and calibration and Trajectory RMSE using time-ordered splits, then online on "Timely referrals" with "Progression to dialysis" as the guardrail. Watch for: Informative missingness of labs and Using future labs for baseline slope.

## Baseline and production design

- **Baseline (build this first):** Kidney failure risk equation (KFRE).
- **Production design:** Joint longitudinal-survival deep model with irregular time handling and calibrated 2- and 5-year risk.

## Why AI, and why this kind

**Why AI.** Forecast eGFR trajectories and kidney failure risk to trigger timely nephrology referral and therapy. The evidence that separates good from bad outcomes (eGFR slope, Albuminuria category, Blood-pressure control) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "mixing legacy equations" are what teams reach for first, and they fail because inconsistent eGFR definitions create artificial drops. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Joint longitudinal-survival deep model with irregular time handling and calibrated 2- and 5-year risk.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among eGFR slope, Albuminuria category, Blood-pressure control and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Kidney failure risk equation (KFRE) | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Joint longitudinal-survival deep model with irregular time handling and calibrated 2- and 5-year risk | chosen | Meets the run-window envelope at $0.902 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Timely referrals) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Informative missingness of labs.
- Evaluation trap: Using future labs for baseline slope.
- Lab assay change: step shift in creatinine.
- Acute kidney injury episode: looks like progression.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
