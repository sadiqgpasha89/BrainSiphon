# Dispatch Unit Recommendation: use-case brief

> Generated from the blueprint `public-safety/dispatch-unit-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dispatch Unit Recommendation · **Domain:** public-safety · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Suggest which available units to send to an incident by estimated arrival time, capability and coverage left behind, for the dispatcher to accept or change. The system has to run in under 100 milliseconds, inside these limits: Recommendation within 100 ms, Dispatcher decides every assignment and Capability and jurisdiction rules enforced.

**Why it is hard.** The obvious approach is closest unit always, and it fails because the closest unit may leave an area uncovered. The second trap is in "Rules": the real signal is jurisdiction and capability as hard rules, while teams usually reach for learned preferences.

**Scale and stakes.** At 10 million users this is about 150.0M model-touching events a day, 1.7K requests per second on average and 10.4K at peak, at an estimated $16.4K a month. A mistake is expensive in the way dispatcher overrides measures it.

**What success looks like.** Offline: Arrival time error, Capability rule compliance and Agreement with experienced dispatchers. Online: Time to assignment, Dispatcher overrides and Coverage gaps created. The launch is judged on "Time to assignment" while "Dispatcher overrides" must not get worse.

## Objective, loss and constraints

**Business objective.** Suggest which available units to send to an incident by estimated arrival time, capability and coverage left behind, for the dispatcher to accept or change.

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

- Recommendation within 100 ms
- Dispatcher decides every assignment
- Capability and jurisdiction rules enforced
- Reasons shown for each suggestion
- 1K incidents per hour

## The approach in one paragraph

Start with the closest available unit by straight-line distance or the computer's nearest unit list, because it is the CAD default. Then earn the move to a scoring service that combines predicted arrival, capability and coverage impact into ranked suggestions with reasons, logging each acceptance or override, and only if it beats the baseline on Arrival time error and Capability rule compliance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Estimated travel time | Predicted arrival time. Core. Guard against: from the routing engine. |
| Add Unit capability | Skills and equipment. Constraint. Guard against: from the register. |
| Add Coverage impact | Effect on zone coverage. Trade-off. Guard against: from the coverage model. |
| Run it as one pipeline | Incident and unit state (CAD), Arrival time model (routing engine), Coverage impact (coverage model), Rules filter (rule engine), Ranked suggestions (dispatcher console) and Dispatcher choice logged (CAD), with Override review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle stale unit status | Status freshness checks. |

**Deliberately not doing**

- Dispatcher name: irrelevant.
- Crew name: irrelevant.
- Call text wording: not routing.

**How the approach is proven**

Prove it offline on Arrival time error, Capability rule compliance and Agreement with experienced dispatchers using time-ordered splits, then online on "Time to assignment" with "Dispatcher overrides" as the guardrail. Watch for: Automatic assignment, Closest-unit-only logic and No reasons shown.

## Baseline and production design

- **Baseline (build this first):** The closest available unit by straight-line distance or the computer's nearest unit list, because it is the CAD default.
- **Production design:** A scoring service that combines predicted arrival, capability and coverage impact into ranked suggestions with reasons, logging each acceptance or override.

## Why AI, and why this kind

**Why AI.** Suggest which available units to send to an incident by estimated arrival time, capability and coverage left behind, for the dispatcher to accept or change. The evidence that separates good from bad outcomes (Estimated travel time, Unit capability, Coverage impact) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "closest unit always" are what teams reach for first, and they fail because the closest unit may leave an area uncovered. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A scoring service that combines predicted arrival, capability and coverage impact into ranked suggestions with reasons, logging each acceptance or override.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Estimated travel time, Unit capability, Coverage impact and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: The closest available unit by straight-line distance or the computer's nearest unit list, because it is the CAD default | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A scoring service that combines predicted arrival, capability and coverage impact into ranked suggestions with reasons, logging each acceptance or override | chosen | Meets the 80 ms envelope at $0.0036 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to assignment) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Automatic assignment.
- Evaluation trap: Closest-unit-only logic.
- Stale unit status: the unit has already moved.
- Multi-agency incident: several agencies are needed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
