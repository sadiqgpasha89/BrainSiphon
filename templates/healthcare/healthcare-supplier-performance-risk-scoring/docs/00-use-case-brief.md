# Healthcare Supplier Performance & Risk Scoring: use-case brief

> Generated from the blueprint `healthcare/healthcare-supplier-performance-risk-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Supplier Performance & Risk Scoring · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict supplier delivery, quality, continuity and financial or operational risks that could disrupt care operations, with an explainable scorecard that separates observed facts from external signals. The system has to run as a scheduled batch job, inside these limits: Observed facts and external signals are shown separately, Supplier decisions need procurement and clinical value review and Scores show the evidence and the dimension.

**Why it is hard.** The obvious approach is one blended score, and it fails because a supplier can be reliable but financially fragile. The second trap is in "Facts": the real signal is observed deliveries and incidents, while teams usually reach for press sentiment.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way critical-item stockouts measures it.

**What success looks like.** Offline: PR-AUC and precision at the review capacity by dimension, Calibration of risk probabilities and Lead time of correct risk flags before disruption. Online: Disruption events avoided or mitigated, Critical-item stockouts and Share of high-risk suppliers with a mitigation plan. The launch is judged on "Disruption events avoided or mitigated" while "Critical-item stockouts" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict supplier delivery, quality, continuity and financial or operational risks that could disrupt care operations, with an explainable scorecard that separates observed facts from external signals.

**Training objective.** `\mathcal{L}=-\sum_i w_i\,[\,y_i\log p_i+(1-y_i)\log(1-p_i)\,]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_i | A weight that scales how much a particular example, class or term counts in the loss. (one value per example i) |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_i | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per example i) |

**Hard constraints**

- Observed facts and external signals are shown separately
- Supplier decisions need procurement and clinical value review
- Scores show the evidence and the dimension
- Critical-item exposure joins supplier risk to clinical criticality
- Scores 8K suppliers weekly and on events
- External data used only under licence

## The approach in one paragraph

Start with annual vendor scorecard from delivery and quality reports. Then earn the move to explainable gradient-boosted classification and trend forecasting per risk dimension combined with a rules-based criticality overlay and a scorecard that labels each input as an observed fact or an external signal, and only if it beats the baseline on PR-AUC and precision at the review capacity by dimension and Calibration of risk probabilities after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around On-time-in-full rate trend | Trailing on-time-in-full against target and its slope. Direct delivery performance. Guard against: receipts as logged. |
| Add Quality incident rate | Incidents and recalls per volume. Safety signal. Guard against: incidents as recorded. |
| Add Single-source exposure | Share of critical items with no qualified alternative. Continuity risk. Guard against: item qualification tables. |
| Run it as one pipeline | Delivery and quality intake (ERP and receiving extracts), External risk feed loader (licensed APIs), Risk feature builder (point-in-time features), Supplier risk model (gradient boosting with calibration) and Criticality overlay (item criticality rules), with Procurement and clinical value review and Mitigation outcome and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle supplier merger | Supplier hierarchy with lineage. |

**Deliberately not doing**

- Supplier marketing material: not evidence.
- Social media volume: noisy.
- Account manager opinion: unsystematic.

**How the approach is proven**

Prove it offline on PR-AUC and precision at the review capacity by dimension, Calibration of risk probabilities and Lead time of correct risk flags before disruption using time-ordered splits, then online on "Disruption events avoided or mitigated" with "Critical-item stockouts" as the guardrail. Watch for: Mixing facts with unverified external signals, Weighting by spend not criticality and Evaluating without a time split.

## Baseline and production design

- **Baseline (build this first):** Annual vendor scorecard from delivery and quality reports.
- **Production design:** Explainable gradient-boosted classification and trend forecasting per risk dimension combined with a rules-based criticality overlay and a scorecard that labels each input as an observed fact or an external signal.

## Why AI, and why this kind

**Why AI.** Predict supplier delivery, quality, continuity and financial or operational risks that could disrupt care operations, with an explainable scorecard that separates observed facts from external signals. The evidence that separates good from bad outcomes (On-time-in-full rate trend, Quality incident rate, Single-source exposure) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one blended score" are what teams reach for first, and they fail because A supplier can be reliable but financially fragile. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Explainable gradient-boosted classification and trend forecasting per risk dimension combined with a rules-based criticality overlay and a scorecard that labels each input as an observed fact or an external signal.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among On-time-in-full rate trend, Quality incident rate, Single-source exposure and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Annual vendor scorecard from delivery and quality reports | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Explainable gradient-boosted classification and trend forecasting per risk dimension combined with a rules-based criticality overlay and a scorecard that labels each input as an observed fact or an external signal | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Disruption events avoided or mitigated) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Mixing facts with unverified external signals.
- Evaluation trap: Weighting by spend not criticality.
- Supplier merger: history is split.
- Recall event: risk jumps immediately.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
