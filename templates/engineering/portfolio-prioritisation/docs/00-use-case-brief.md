# Portfolio Prioritisation: use-case brief

> Generated from the blueprint `engineering/portfolio-prioritisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Portfolio Prioritisation · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank and balance projects in a portfolio by value, risk, capacity use and strategic fit with scenarios, so leaders choose which to fund, delay or stop. The system has to run as a scheduled batch job, inside these limits: Leaders decide, Criteria and weights set and published by governance and Scenarios for budget and capacity limits.

**Why it is hard.** The obvious approach is hidden model weights, and it fails because prioritisation must be explainable. The second trap is in "Constraint": the real signal is capacity and budget, while teams usually reach for value only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way projects stopped late measures it.

**What success looks like.** Offline: Ranking stability, Constraint satisfaction and Benefit forecast accuracy. Online: Portfolio value delivered, Projects stopped late and Capacity overload. The launch is judged on "Portfolio value delivered" while "Projects stopped late" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank and balance projects in a portfolio by value, risk, capacity use and strategic fit with scenarios, so leaders choose which to fund, delay or stop.

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

- Leaders decide
- Criteria and weights set and published by governance
- Scenarios for budget and capacity limits
- Quarterly review of 300 projects
- Assumptions shown

## The approach in one paragraph

Start with annual portfolio reviews with scoring spreadsheets, because they are the usual practice. Then earn the move to an optimiser and what-if tool that applies published criteria, tests capacity scenarios and shows trade-offs and sensitivity for the portfolio board, and only if it beats the baseline on Ranking stability and Constraint satisfaction after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Expected value | Benefit and return estimates. Core. Guard against: from business cases. |
| Add Risk level | Risk exposure. Core. Guard against: from project risk data. |
| Add Capacity demand | People and equipment needs. Constraint. Guard against: from resource plans. |
| Run it as one pipeline | Criteria scoring (rules), Capacity check (resource data), Portfolio optimiser (solver), Scenario view (dashboard) and Board decision (portfolio board), with Business case data and Outcome review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle inflated benefits | Benefit realisation tracking. |

**Deliberately not doing**

- Sponsor name: personal data.
- Project nickname: irrelevant.
- Slide template: an artefact.

**How the approach is proven**

Prove it offline on Ranking stability, Constraint satisfaction and Benefit forecast accuracy using time-ordered splits, then online on "Portfolio value delivered" with "Projects stopped late" as the guardrail. Watch for: Hidden weights, Value without capacity and Automatic funding.

## Baseline and production design

- **Baseline (build this first):** Annual portfolio reviews with scoring spreadsheets, because they are the usual practice.
- **Production design:** An optimiser and what-if tool that applies published criteria, tests capacity scenarios and shows trade-offs and sensitivity for the portfolio board.

## Why AI, and why this kind

**Why AI.** Rank and balance projects in a portfolio by value, risk, capacity use and strategic fit with scenarios, so leaders choose which to fund, delay or stop. The evidence that separates good from bad outcomes (Expected value, Risk level, Capacity demand) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "hidden model weights" are what teams reach for first, and they fail because prioritisation must be explainable. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: An optimiser and what-if tool that applies published criteria, tests capacity scenarios and shows trade-offs and sensitivity for the portfolio board.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Expected value, Risk level, Capacity demand and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Annual portfolio reviews with scoring spreadsheets, because they are the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An optimiser and what-if tool that applies published criteria, tests capacity scenarios and shows trade-offs and sensitivity for the portfolio board | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Portfolio value delivered) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Hidden weights.
- Evaluation trap: Value without capacity.
- Inflated benefits: sponsors overstate value.
- Interdependence: projects depend on each other.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
