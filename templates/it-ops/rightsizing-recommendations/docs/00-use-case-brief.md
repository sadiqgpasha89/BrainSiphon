# Rightsizing Recommendations: use-case brief

> Generated from the blueprint `it-ops/rightsizing-recommendations` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Rightsizing Recommendations · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend smaller or different instance types and storage settings from observed utilisation, with the savings and the performance risk, for service owners to approve. The system has to run as a scheduled batch job, inside these limits: Recommendations use peak and percentile usage, Owners approve every change and Savings shown with risk.

**Why it is hard.** The obvious approach is average usage, and it fails because averages miss peaks. The second trap is in "Risk": the real signal is latency headroom and failure domains, while teams usually reach for savings only.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way incidents after rightsizing measures it.

**What success looks like.** Offline: Recommendation safety on replay, Savings accuracy and Owner acceptance. Online: Realised savings, Incidents after rightsizing and Resources oversized. The launch is judged on "Realised savings" while "Incidents after rightsizing" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend smaller or different instance types and storage settings from observed utilisation, with the savings and the performance risk, for service owners to approve.

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

- Recommendations use peak and percentile usage
- Owners approve every change
- Savings shown with risk
- Changes applied through infrastructure code
- 200K resources

## The approach in one paragraph

Start with vendor rightsizing reports reviewed occasionally, because they are the default. Then earn the move to a recommendation engine with percentile and seasonality analysis, risk tiers and automatic pull requests to infrastructure code that owners approve, and only if it beats the baseline on Recommendation safety on replay and Savings accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Utilisation percentiles | P95 and p99 of CPU and memory. Core. Guard against: from monitoring. |
| Add Burst and seasonal pattern | Peaks by period. Risk. Guard against: from time-series. |
| Add Instance catalogue and price | Options and prices. Savings. Guard against: from the provider. |
| Run it as one pipeline | Utilisation collection (monitoring), Percentile and season analysis (analytics), Option pricing (provider catalogue), Risk tier (rules), Pull request (code host), Owner approval (review) and Savings tracking (billing). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle short history | Defer until enough data exists. |

**Deliberately not doing**

- Instance id: an identifier.
- Owner name: personal data.
- Region alone: weak link.

**How the approach is proven**

Prove it offline on Recommendation safety on replay, Savings accuracy and Owner acceptance using time-ordered splits, then online on "Realised savings" with "Incidents after rightsizing" as the guardrail. Watch for: Average utilisation, Console changes and Savings without risk.

## Baseline and production design

- **Baseline (build this first):** Vendor rightsizing reports reviewed occasionally, because they are the default.
- **Production design:** A recommendation engine with percentile and seasonality analysis, risk tiers and automatic pull requests to infrastructure code that owners approve.

## Why AI, and why this kind

**Why AI.** Recommend smaller or different instance types and storage settings from observed utilisation, with the savings and the performance risk, for service owners to approve. The evidence that separates good from bad outcomes (Utilisation percentiles, Burst and seasonal pattern, Instance catalogue and price) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "average usage" are what teams reach for first, and they fail because averages miss peaks. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A recommendation engine with percentile and seasonality analysis, risk tiers and automatic pull requests to infrastructure code that owners approve.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Utilisation percentiles, Burst and seasonal pattern, Instance catalogue and price and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Vendor rightsizing reports reviewed occasionally, because they are the default | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A recommendation engine with percentile and seasonality analysis, risk tiers and automatic pull requests to infrastructure code that owners approve | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Realised savings) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Average utilisation.
- Evaluation trap: Console changes.
- Short history: a new resource lacks history.
- Memory-bound workloads: cPU is low while memory is high.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
