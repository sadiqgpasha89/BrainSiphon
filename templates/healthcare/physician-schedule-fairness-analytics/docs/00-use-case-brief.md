# Physician Schedule Fairness Analytics: use-case brief

> Generated from the blueprint `healthcare/physician-schedule-fairness-analytics` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Physician Schedule Fairness Analytics · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Measure how nights, weekends, holidays, call burden, undesirable shifts and workload are distributed across comparable physician groups, and show disparities and what-if adjustments to leaders. The system has to run as a scheduled batch job, inside these limits: Leaders interpret context and approve adjustments and the analytics make no employment decision, Comparisons are within groups defined by leadership and adjusted for FTE and approved exceptions and Sensitive employment and demographic data are restricted and aggregated where small groups could identify a person.

**Why it is hard.** The obvious approach is one pool, and it fails because specialties differ in call burden. The second trap is in "Adjustment": the real signal is fTE and approved exceptions applied, while teams usually reach for raw counts.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way leader time to prepare fairness reviews measures it.

**What success looks like.** Offline: Metric reproducibility against a manual audit, Disparity-detection agreement with leaders and Privacy-rule compliance. Online: Disparity reduced across cycles, Leader time to prepare fairness reviews and Physician-reported fairness. The launch is judged on "Disparity reduced across cycles" while "Leader time to prepare fairness reviews" must not get worse.

## Objective, loss and constraints

**Business objective.** Measure how nights, weekends, holidays, call burden, undesirable shifts and workload are distributed across comparable physician groups, and show disparities and what-if adjustments to leaders.

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

- Leaders interpret context and approve adjustments and the analytics make no employment decision
- Comparisons are within groups defined by leadership and adjusted for FTE and approved exceptions
- Sensitive employment and demographic data are restricted and aggregated where small groups could identify a person
- Metrics are defined and versioned
- Analyses 1.2K physicians per cycle
- Suggestions are what-ifs and never changes to a schedule

## The approach in one paragraph

Start with a scheduler compares call counts in a spreadsheet when a complaint arrives. Then earn the move to defined burden metrics adjusted for FTE and approved exceptions, within-group dispersion and persistence analysis with small-group suppression, and a constrained what-if optimiser for leaders, and only if it beats the baseline on Metric reproducibility against a manual audit and Disparity-detection agreement with leaders after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Burden index | Weighted count of nights, weekends, holidays and call per FTE. Core fairness measure. Guard against: actual schedule. |
| Add Dispersion within group | Spread of the burden index in a comparable group. Shows disparity. Guard against: closed cycles. |
| Add Exception-adjusted share | Burden after approved exceptions. Fair comparison. Guard against: exceptions register. |
| Run it as one pipeline | Schedule and roster intake (warehouse extracts), Burden metric builder (metric definitions), Group comparison and dispersion (descriptive statistics), Small-group suppression (privacy rules) and What-if optimizer (constrained solver), with Leadership review and Decision and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle very small group | Suppression and pooling rules. |

**Deliberately not doing**

- Physician name: not a fairness factor.
- Schedule layout: format.
- Tenure: not defined burden.

**How the approach is proven**

Prove it offline on Metric reproducibility against a manual audit, Disparity-detection agreement with leaders and Privacy-rule compliance using time-ordered splits, then online on "Disparity reduced across cycles" with "Leader time to prepare fairness reviews" as the guardrail. Watch for: Ranking individual physicians, Comparing unlike groups and Rebalancing without leader approval.

## Baseline and production design

- **Baseline (build this first):** A scheduler compares call counts in a spreadsheet when a complaint arrives.
- **Production design:** Defined burden metrics adjusted for FTE and approved exceptions, within-group dispersion and persistence analysis with small-group suppression, and a constrained what-if optimiser for leaders.

## Why AI, and why this kind

**Why AI.** Measure how nights, weekends, holidays, call burden, undesirable shifts and workload are distributed across comparable physician groups, and show disparities and what-if adjustments to leaders. The evidence that separates good from bad outcomes (Burden index, Dispersion within group, Exception-adjusted share) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one pool" are what teams reach for first, and they fail because specialties differ in call burden. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Defined burden metrics adjusted for FTE and approved exceptions, within-group dispersion and persistence analysis with small-group suppression, and a constrained what-if optimiser for leaders.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Burden index, Dispersion within group, Exception-adjusted share and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A scheduler compares call counts in a spreadsheet when a complaint arrives | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Defined burden metrics adjusted for FTE and approved exceptions, within-group dispersion and persistence analysis with small-group suppression, and a constrained what-if optimiser for leaders | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Disparity reduced across cycles) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Ranking individual physicians.
- Evaluation trap: Comparing unlike groups.
- Very small group: individuals are identifiable.
- Approved exception added late: metrics change.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
