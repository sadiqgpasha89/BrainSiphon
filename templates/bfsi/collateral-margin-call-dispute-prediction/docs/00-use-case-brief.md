# Collateral Margin Call Dispute Prediction: use-case brief

> Generated from the blueprint `bfsi/collateral-margin-call-dispute-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Collateral Margin Call Dispute Prediction · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which margin calls a counterparty will dispute so the collateral team resolves valuation differences before the call deadline. The system has to run as a scheduled batch job, inside these limits: Scores ready before the morning call cycle, Explanation per flagged call and Dispute handling follows the legal agreement.

**Why it is hard.** The obvious approach is the size of the call alone, and it fails because large calls are often accepted while small ones with a model difference are disputed. The second trap is in "Timing": the real signal is state known before the call is issued, while teams usually reach for status after the counterparty replies.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way days of unsettled margin measures it.

**What success looks like.** Offline: PR-AUC at team capacity and Calibration by counterparty group. Online: Disputes resolved before deadline and Days of unsettled margin. The launch is judged on "Disputes resolved before deadline" while "Days of unsettled margin" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which margin calls a counterparty will dispute so the collateral team resolves valuation differences before the call deadline.

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

- Scores ready before the morning call cycle
- Explanation per flagged call
- Dispute handling follows the legal agreement
- No client data leaves the bank

## The approach in one paragraph

Start with flag calls above a size threshold from counterparties with prior disputes, because the team already uses it. Then earn the move to gradient boosting on valuation gaps, population mismatch and dispute history, ranked by value at risk with the top reasons shown, and only if it beats the baseline on PR-AUC at team capacity and Calibration by counterparty group after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Valuation gap to counterparty mark | Our mark minus the last agreed mark, scaled by notional. Disagreement predicts dispute. Guard against: marks must be same-day. |
| Add Dispute rate 90d | Disputed calls divided by calls for the agreement. Repeat behaviour. Guard against: window ends the day before. |
| Add Trade population mismatch | Trades present on one side only. Reconciliation issues drive disputes. Guard against: population snapshots must be pre-call. |
| Run it as one pipeline | Call data extract (collateral platform), Mark comparison (valuation service), Feature builder (Spark), Dispute model (gradient boosting), Priority list (rules with capacity) and Outcome capture (warehouse), with Collateral analyst desk off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle month-end volatility | Volatility regime flag and a wider review list. |

**Deliberately not doing**

- Analyst name: irrelevant to the counterparty.
- Call reference number: arbitrary.
- Call time stamp seconds: no signal.

**How the approach is proven**

Prove it offline on PR-AUC at team capacity and Calibration by counterparty group using time-ordered splits, then online on "Disputes resolved before deadline" with "Days of unsettled margin" as the guardrail. Watch for: Features captured after the reply and Counterparty overlap across train and test.

## Baseline and production design

- **Baseline (build this first):** Flag calls above a size threshold from counterparties with prior disputes, because the team already uses it.
- **Production design:** Gradient boosting on valuation gaps, population mismatch and dispute history, ranked by value at risk with the top reasons shown.

## Why AI, and why this kind

**Why AI.** Predict which margin calls a counterparty will dispute so the collateral team resolves valuation differences before the call deadline. The evidence that separates good from bad outcomes (Valuation gap to counterparty mark, Dispute rate 90d, Trade population mismatch) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the size of the call alone" are what teams reach for first, and they fail because large calls are often accepted while small ones with a model difference are disputed. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting on valuation gaps, population mismatch and dispute history, ranked by value at risk with the top reasons shown.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Valuation gap to counterparty mark, Dispute rate 90d, Trade population mismatch and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Flag calls above a size threshold from counterparties with prior disputes, because the team already uses it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on valuation gaps, population mismatch and dispute history, ranked by value at risk with the top reasons shown | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Disputes resolved before deadline) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Features captured after the reply.
- Evaluation trap: Counterparty overlap across train and test.
- Month-end volatility: many marks diverge at once.
- Agreement amendment: threshold changes mid-quarter.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
