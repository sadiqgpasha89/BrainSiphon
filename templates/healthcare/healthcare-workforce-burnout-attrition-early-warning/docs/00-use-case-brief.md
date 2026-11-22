# Healthcare Workforce Burnout & Attrition Early Warning: use-case brief

> Generated from the blueprint `healthcare/healthcare-workforce-burnout-attrition-early-warning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Workforce Burnout & Attrition Early Warning · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify aggregate working conditions associated with elevated burnout, absence or voluntary attrition risk at team and unit level so leaders can improve those conditions, never to score or manage individuals. The system has to run as a scheduled batch job, inside these limits: Analysis is at team or unit level with a minimum group size and small-cell suppression, No individual risk score is computed or stored and No inference of mental or physical health and no use of protected or sensitive traits.

**Why it is hard.** The obvious approach is individual-level risk scores, and it fails because individual scoring becomes a punitive tool and breaches trust. The second trap is in "Signal": the real signal is operational conditions such as overtime, schedule churn and vacancy load, while teams usually reach for inferred emotional or health state.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.6K a month. A mistake is expensive in the way overtime and schedule-churn reduction after intervention measures it.

**What success looks like.** Offline: Concordance index and time-dependent AUC at 6 and 12 months, Calibration by unit size and Subgroup fairness gap on prediction error. Online: Voluntary attrition rate in supported units, Overtime and schedule-churn reduction after intervention and Pulse-survey trend. The launch is judged on "Voluntary attrition rate in supported units" while "Overtime and schedule-churn reduction after intervention" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify aggregate working conditions associated with elevated burnout, absence or voluntary attrition risk at team and unit level so leaders can improve those conditions, never to score or manage individuals.

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

- Analysis is at team or unit level with a minimum group size and small-cell suppression
- No individual risk score is computed or stored
- No inference of mental or physical health and no use of protected or sensitive traits
- Outputs support working-condition changes and never employment decisions or performance management
- Privacy and works-council review before any rollout
- Fairness assessment across roles and sites

## The approach in one paragraph

Start with quarterly unit turnover rate with a rolling average. Then earn the move to team-level discrete-time survival and classification models on aggregated operational features with strict minimisation, differential-privacy style suppression, fairness assessment and driver explanations, and only if it beats the baseline on Concordance index and time-dependent AUC at 6 and 12 months and Calibration by unit size after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Schedule churn | Share of shifts changed within 72 hours at unit level. Unpredictable schedules are strongly associated with turnover. Guard against: use schedule snapshots prior to the outcome window. |
| Add Overtime load | Unit mean and tail of overtime hours per head. Sustained overtime tracks with fatigue and exits. Guard against: aggregate and lag it. |
| Add Vacancy burden | Open positions relative to budgeted FTE. The remaining team absorbs the gap. Guard against: use the vacancy snapshot. |
| Run it as one pipeline | Aggregated HR and schedule intake (governed extracts), Minimum-size and suppression rules (privacy policy rules), Team-level risk model (discrete-time survival model), Driver explainer (SHAP on aggregates) and Leader dashboard (aggregated reports), with Fairness and privacy review and Intervention feedback and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle a team shrinks below the minimum size | Automatic suppression and merge with a sibling team. |

**Deliberately not doing**

- Age, gender and ethnicity: protected traits with no place in the model.
- Individual sentiment from messages: surveillance and a consent problem.
- Health or leave reasons: sensitive data outside scope.

**How the approach is proven**

Prove it offline on Concordance index and time-dependent AUC at 6 and 12 months, Calibration by unit size and Subgroup fairness gap on prediction error using time-ordered splits, then online on "Voluntary attrition rate in supported units" with "Overtime and schedule-churn reduction after intervention" as the guardrail. Watch for: Evaluating on a random split of employees rather than by period, Treating association as cause and Letting a dashboard reveal a small group.

## Baseline and production design

- **Baseline (build this first):** Quarterly unit turnover rate with a rolling average.
- **Production design:** Team-level discrete-time survival and classification models on aggregated operational features with strict minimisation, differential-privacy style suppression, fairness assessment and driver explanations.

## Why AI, and why this kind

**Why AI.** Identify aggregate working conditions associated with elevated burnout, absence or voluntary attrition risk at team and unit level so leaders can improve those conditions, never to score or manage individuals. The evidence that separates good from bad outcomes (Schedule churn, Overtime load, Vacancy burden) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "individual-level risk scores" are what teams reach for first, and they fail because individual scoring becomes a punitive tool and breaches trust. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Team-level discrete-time survival and classification models on aggregated operational features with strict minimisation, differential-privacy style suppression, fairness assessment and driver explanations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Schedule churn, Overtime load, Vacancy burden and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Quarterly unit turnover rate with a rolling average | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Team-level discrete-time survival and classification models on aggregated operational features with strict minimisation, differential-privacy style suppression, fairness assessment and driver explanations | chosen | Meets the run-window envelope at $0.091 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Voluntary attrition rate in supported units) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on a random split of employees rather than by period.
- Evaluation trap: Treating association as cause.
- A team shrinks below the minimum size: an aggregate could identify a person.
- Reorganisation: team definitions change.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
