# Provider Directory Accuracy Prediction: use-case brief

> Generated from the blueprint `healthcare/provider-directory-accuracy-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Directory Accuracy Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which provider directory fields such as location, specialty, affiliation, accepting-patients status and contact details are stale or inconsistent, so a health system can target attestation outreach where errors are most likely. The system has to run as a scheduled batch job, inside these limits: Outputs are field-level accuracy risks and never replace attestation, The provider or data steward validates corrections before publication and Claims and encounter signals are used only where lawful and minimised.

**Why it is hard.** The obvious approach is whole-record flag, and it fails because a single wrong phone number differs from a closed practice. The second trap is in "Evidence": the real signal is independent signals such as scheduling and attestation, while teams usually reach for one feed compared with itself.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.6K a month. A mistake is expensive in the way attestation response rate measures it.

**What success looks like.** Offline: PR-AUC and precision at the outreach capacity by field, Calibration by field and Share of high-risk fields confirmed wrong in audit. Online: Directory error rate in secret-shopper audits, Attestation response rate and Patient complaints about wrong directory data. The launch is judged on "Directory error rate in secret-shopper audits" while "Attestation response rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which provider directory fields such as location, specialty, affiliation, accepting-patients status and contact details are stale or inconsistent, so a health system can target attestation outreach where errors are most likely.

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

- Outputs are field-level accuracy risks and never replace attestation
- The provider or data steward validates corrections before publication
- Claims and encounter signals are used only where lawful and minimised
- Freshness is scored per field with its source date
- Scores 400K provider-location records nightly
- Outreach capacity is a stated budget

## The approach in one paragraph

Start with a rule that flags fields not verified in the last 90 days. Then earn the move to field-level gradient-boosted accuracy models fed by freshness, cross-source disagreement and activity features, an identity reconciliation layer for provider and location records and a capacity-aware outreach ranker, and only if it beats the baseline on PR-AUC and precision at the outreach capacity by field and Calibration by field after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Field age since verification | Days since the field was last confirmed from a trusted source. Stale fields are more likely wrong. Guard against: use verification events. |
| Add Cross-source disagreement | Disagreement between directory, scheduling and credentialing for the field. Disagreement is a strong signal. Guard against: use the snapshot at scoring. |
| Add Activity mismatch | Absence of appointments or claims at a listed location. Suggests the location is inactive. Guard against: use a lagged window. |
| Run it as one pipeline | Directory and source intake (batch feeds), Identity reconciliation for provider and location (rules and fuzzy lookups), Field feature builder (freshness and disagreement), Accuracy risk model (gradient boosting by field) and Outreach ranker with capacity (ranking), with Data steward review and Verification outcomes and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle provider moves practice | Location lifecycle states with an end date. |

**Deliberately not doing**

- Provider popularity: does not relate to accuracy.
- Directory page traffic: reflects marketing.
- Provider age: protected and irrelevant.

**How the approach is proven**

Prove it offline on PR-AUC and precision at the outreach capacity by field, Calibration by field and Share of high-risk fields confirmed wrong in audit using time-ordered splits, then online on "Directory error rate in secret-shopper audits" with "Attestation response rate" as the guardrail. Watch for: Training on records where change implies error, Evaluating on the whole record instead of the field and Ignoring feed outages.

## Baseline and production design

- **Baseline (build this first):** A rule that flags fields not verified in the last 90 days.
- **Production design:** Field-level gradient-boosted accuracy models fed by freshness, cross-source disagreement and activity features, an identity reconciliation layer for provider and location records and a capacity-aware outreach ranker.

## Why AI, and why this kind

**Why AI.** Predict which provider directory fields such as location, specialty, affiliation, accepting-patients status and contact details are stale or inconsistent, so a health system can target attestation outreach where errors are most likely. The evidence that separates good from bad outcomes (Field age since verification, Cross-source disagreement, Activity mismatch) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "whole-record flag" are what teams reach for first, and they fail because A single wrong phone number differs from a closed practice. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Field-level gradient-boosted accuracy models fed by freshness, cross-source disagreement and activity features, an identity reconciliation layer for provider and location records and a capacity-aware outreach ranker.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Field age since verification, Cross-source disagreement, Activity mismatch and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A rule that flags fields not verified in the last 90 days | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Field-level gradient-boosted accuracy models fed by freshness, cross-source disagreement and activity features, an identity reconciliation layer for provider and location records and a capacity-aware outreach ranker | chosen | Meets the run-window envelope at $0.091 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Directory error rate in secret-shopper audits) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on records where change implies error.
- Evaluation trap: Evaluating on the whole record instead of the field.
- Provider moves practice: old and new location both appear active.
- Telehealth only provider: no physical activity is expected.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
