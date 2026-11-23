# Rework Prediction: use-case brief

> Generated from the blueprint `engineering/rework-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Rework Prediction · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which work packages are likely to need rework from design quality, inspection results and conditions so teams add checks before work is built. The system has to run as a scheduled batch job, inside these limits: Alerts at least 1 week before work starts, Work package level only and Quality managers decide on extra checks.

**Why it is hard.** The obvious approach is reports of delay, and it fails because delays have many causes. The second trap is in "Level": the real signal is work package and design item, while teams usually reach for individual crews.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way rework hours measures it.

**What success looks like.** Offline: Calibration, Recall at review capacity and Lead time. Online: Rework cost, Rework hours and Late discovered defects. The launch is judged on "Rework cost" while "Rework hours" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which work packages are likely to need rework from design quality, inspection results and conditions so teams add checks before work is built.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Alerts at least 1 week before work starts
- Work package level only
- Quality managers decide on extra checks
- Calibrated probabilities
- 100K work packages

## The approach in one paragraph

Start with lessons learned meetings after work is done, because they are the usual practice. Then earn the move to a model that scores work packages for rework risk using design and inspection signals and triggers pre-work reviews for the highest risks, and only if it beats the baseline on Calibration and Recall at review capacity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Design maturity | Open clashes and late revisions. Core. Guard against: from the model and register. |
| Add Inspection history | Past findings in similar work. Core. Guard against: from the quality system. |
| Add Conditions and complexity | Weather, access and congestion. Risk. Guard against: from site data. |
| Run it as one pipeline | Work package and quality data (project systems), Feature build (batch), Rework model (gradient boosting), Calibration (isotonic fit), Risk list (quality dashboard) and Outcome tracking (monthly), with Pre-work review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new work type | Similar work analogues. |

**Deliberately not doing**

- Worker name: personal data.
- Work package description wording: weak link.
- Report date: an artefact.

**How the approach is proven**

Prove it offline on Calibration, Recall at review capacity and Lead time using time-ordered splits, then online on "Rework cost" with "Rework hours" as the guardrail. Watch for: Crew ranking, Delay as rework and Penalties.

## Baseline and production design

- **Baseline (build this first):** Lessons learned meetings after work is done, because they are the usual practice.
- **Production design:** A model that scores work packages for rework risk using design and inspection signals and triggers pre-work reviews for the highest risks.

## Why AI, and why this kind

**Why AI.** Predict which work packages are likely to need rework from design quality, inspection results and conditions so teams add checks before work is built. The evidence that separates good from bad outcomes (Design maturity, Inspection history, Conditions and complexity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "reports of delay" are what teams reach for first, and they fail because delays have many causes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A model that scores work packages for rework risk using design and inspection signals and triggers pre-work reviews for the highest risks.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Design maturity, Inspection history, Conditions and complexity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Lessons learned meetings after work is done, because they are the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A model that scores work packages for rework risk using design and inspection signals and triggers pre-work reviews for the highest risks | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Rework cost) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Crew ranking.
- Evaluation trap: Delay as rework.
- New work type: there is no history.
- Underreporting: rework is not recorded.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
