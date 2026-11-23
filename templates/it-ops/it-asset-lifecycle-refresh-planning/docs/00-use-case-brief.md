# IT Asset Lifecycle and Refresh Planning: use-case brief

> Generated from the blueprint `it-ops/it-asset-lifecycle-refresh-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** IT Asset Lifecycle and Refresh Planning · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast device and server refresh needs from age, failure risk and support dates and plan purchases and disposal across the year within budget. The system has to run as a scheduled batch job, inside these limits: Refresh plans within the approved budget, Data wiped and certified at disposal and Finance approves purchases.

**Why it is hard.** The obvious approach is age only, and it fails because some old devices are fine and some new ones fail. The second trap is in "Disposal": the real signal is certified wipe and recycling, while teams usually reach for unlogged disposal.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way unsupported assets measures it.

**What success looks like.** Offline: Failure prediction accuracy, Budget fit and Plan coverage of end-of-support assets. Online: Unplanned device failures, Unsupported assets and Refresh cost. The launch is judged on "Unplanned device failures" while "Unsupported assets" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast device and server refresh needs from age, failure risk and support dates and plan purchases and disposal across the year within budget.

**Training objective.** `\mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Refresh plans within the approved budget
- Data wiped and certified at disposal
- Finance approves purchases
- Scenarios by budget level
- 300K assets

## The approach in one paragraph

Start with fixed refresh cycles by device age, because they are the common policy. Then earn the move to a planning model that combines risk, support dates and use to schedule refresh waves, with budget scenarios and certified disposal tracking, and only if it beats the baseline on Failure prediction accuracy and Budget fit after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Failure risk | Predicted failure probability. Core. Guard against: from device models. |
| Add Vendor support end dates | End of support. Constraint. Guard against: from vendors. |
| Add Utilisation and role needs | Workload needs. Fit. Guard against: from monitoring. |
| Run it as one pipeline | Asset data (CMDB), Risk and support join (analytics), Refresh scoring (model), Budget scenario planning (optimiser), Finance approval (workflow), Procurement and wipe (ITSM) and Outcome tracking (quarterly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle supply delay | Buffers and phased waves. |

**Deliberately not doing**

- Employee name: personal data.
- Asset tag: an identifier.
- Vendor brand: weak link.

**How the approach is proven**

Prove it offline on Failure prediction accuracy, Budget fit and Plan coverage of end-of-support assets using time-ordered splits, then online on "Unplanned device failures" with "Unsupported assets" as the guardrail. Watch for: Age-only cycles, Unlogged disposal and Single plan.

## Baseline and production design

- **Baseline (build this first):** Fixed refresh cycles by device age, because they are the common policy.
- **Production design:** A planning model that combines risk, support dates and use to schedule refresh waves, with budget scenarios and certified disposal tracking.

## Why AI, and why this kind

**Why AI.** Forecast device and server refresh needs from age, failure risk and support dates and plan purchases and disposal across the year within budget. The evidence that separates good from bad outcomes (Failure risk, Vendor support end dates, Utilisation and role needs) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "age only" are what teams reach for first, and they fail because some old devices are fine and some new ones fail. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A planning model that combines risk, support dates and use to schedule refresh waves, with budget scenarios and certified disposal tracking.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Failure risk, Vendor support end dates, Utilisation and role needs and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed refresh cycles by device age, because they are the common policy | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A planning model that combines risk, support dates and use to schedule refresh waves, with budget scenarios and certified disposal tracking | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unplanned device failures) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Age-only cycles.
- Evaluation trap: Unlogged disposal.
- Supply delay: devices arrive late.
- Remote workers: devices are hard to collect.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
