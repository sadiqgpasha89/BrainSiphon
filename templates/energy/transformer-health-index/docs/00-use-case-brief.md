# Transformer Health Index: use-case brief

> Generated from the blueprint `energy/transformer-health-index` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Transformer Health Index · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Combine age, loading, oil tests and maintenance history into an explainable health index per transformer so replacement and refurbishment are planned in the right order. The system has to run as a scheduled batch job, inside these limits: Index with the top contributing factors, Calibrated failure probability within 5 years and Engineers can override with notes.

**Why it is hard.** The obvious approach is age alone, and it fails because age is a weak guide to condition. The second trap is in "Output": the real signal is a ranked list with reasons, while teams usually reach for a single score.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.8K a month. A mistake is expensive in the way replacement cost measures it.

**What success looks like.** Offline: Calibration of five-year probability, Rank accuracy against failures and Agreement with engineers. Online: In-service failures, Replacement cost and Planned versus emergency replacements. The launch is judged on "In-service failures" while "Replacement cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Combine age, loading, oil tests and maintenance history into an explainable health index per transformer so replacement and refurbishment are planned in the right order.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Index with the top contributing factors
- Calibrated failure probability within 5 years
- Engineers can override with notes
- Quarterly refresh for 300K transformers

## The approach in one paragraph

Start with an age-based replacement list, because many utilities start there. Then earn the move to a survival or gradient boosting model on condition and loading data with calibrated probabilities and consequence weighting, plus explanations and engineer overrides tracked, and only if it beats the baseline on Calibration of five-year probability and Rank accuracy against failures after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Oil test results | Dissolved gas and moisture values. Condition. Guard against: from lab tests. |
| Add Loading history | Peak and average loading ratio. Thermal ageing. Guard against: from SCADA. |
| Add Age and manufacturer family | Years in service and family. Prior. Guard against: from the register. |
| Run it as one pipeline | Condition data extraction (asset and lab systems), Feature build (aggregated histories), Failure probability model (survival analysis), Consequence weighting (rules), Ranked list (asset management tool) and Outcome tracking (annual), with Engineer review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing oil tests | Staleness flags and wider intervals. |

**Deliberately not doing**

- Asset tag: an identifier.
- Inspector name: irrelevant.
- Photo count: an artefact.

**How the approach is proven**

Prove it offline on Calibration of five-year probability, Rank accuracy against failures and Agreement with engineers using time-ordered splits, then online on "In-service failures" with "Replacement cost" as the guardrail. Watch for: Age-only ranking, Probability without consequence and Unexplained scores.

## Baseline and production design

- **Baseline (build this first):** An age-based replacement list, because many utilities start there.
- **Production design:** A survival or gradient boosting model on condition and loading data with calibrated probabilities and consequence weighting, plus explanations and engineer overrides tracked.

## Why AI, and why this kind

**Why AI.** Combine age, loading, oil tests and maintenance history into an explainable health index per transformer so replacement and refurbishment are planned in the right order. The evidence that separates good from bad outcomes (Oil test results, Loading history, Age and manufacturer family) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "age alone" are what teams reach for first, and they fail because age is a weak guide to condition. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A survival or gradient boosting model on condition and loading data with calibrated probabilities and consequence weighting, plus explanations and engineer overrides tracked.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Oil test results, Loading history, Age and manufacturer family and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: An age-based replacement list, because many utilities start there | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A survival or gradient boosting model on condition and loading data with calibrated probabilities and consequence weighting, plus explanations and engineer overrides tracked | chosen | Meets the run-window envelope at $0.039 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (In-service failures) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Age-only ranking.
- Evaluation trap: Probability without consequence.
- Missing oil tests: tests are years old.
- Rare failure: too few failures for the family.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
