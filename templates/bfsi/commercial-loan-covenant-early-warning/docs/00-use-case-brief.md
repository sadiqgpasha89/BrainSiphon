# Commercial Loan Covenant Breach Early Warning: use-case brief

> Generated from the blueprint `bfsi/commercial-loan-covenant-early-warning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Commercial Loan Covenant Breach Early Warning · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which corporate borrowers will breach a financial covenant in the next two quarters so relationship managers act before the breach. The system has to run as a scheduled batch job, inside these limits: Predictions explainable to credit officers line by line, Quarterly cycle after statements arrive and No use of data the bank is not permitted to use for monitoring.

**Why it is hard.** The obvious approach is level of leverage or coverage alone, and it fails because a firm at 3.9x against a 4.0x limit is riskier than one at 4.5x against 6.0x. The second trap is in "Reporting lag": the real signal is using the as-at date the figures were known to the bank, while teams usually reach for using period-end dates for figures that arrived weeks later.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.8K a month. A mistake is expensive in the way share of watchlist cases that needed action measures it.

**What success looks like.** Offline: PR-AUC at the watchlist size and Lead time of correct warnings. Online: Breaches caught at least one quarter early and Share of watchlist cases that needed action. The launch is judged on "Breaches caught at least one quarter early" while "Share of watchlist cases that needed action" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which corporate borrowers will breach a financial covenant in the next two quarters so relationship managers act before the breach.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Predictions explainable to credit officers line by line
- Quarterly cycle after statements arrive
- No use of data the bank is not permitted to use for monitoring
- Full lineage for audit

## The approach in one paragraph

Start with rule-based watchlist on headroom under 15% plus two negative quarters, because credit officers already use it. Then earn the move to gradient boosting on headroom, trend and account-behaviour features with monotone constraints, calibrated per sector band, with a reason list for each flag, and only if it beats the baseline on PR-AUC at the watchlist size and Lead time of correct warnings after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Covenant headroom and slope | Current ratio minus threshold, plus 4-quarter linear trend. Shrinking headroom precedes breach. Guard against: use as-reported contractual definitions only. |
| Add Revenue momentum | Quarter-on-quarter revenue growth from management accounts. Earnings fall before ratios break. Guard against: management accounts arrive late and are sometimes restated. |
| Add Liquidity cushion | Undrawn committed lines plus cash divided by next-12-month debt service. Liquidity gaps push ratios. Guard against: facility availability must be as at the date, not current. |
| Run it as one pipeline | Financial statement store (spreading system and warehouse), Covenant definition service (contract-derived formulas), Feature builder (Spark point-in-time), Breach model (gradient boosting), Watchlist ranker (rules plus capacity cap), Credit officer workbench (review UI) and Outcome store (lakehouse). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle waiver or amendment before breach | Treat amendments as an event with its own label and exclude from negatives. |

**Deliberately not doing**

- Sector label alone: too coarse, a sector spans healthy and weak firms.
- Relationship age: weak link to near-term covenant stress.
- Number of facilities: mixes size and complexity, no causal link.

**How the approach is proven**

Prove it offline on PR-AUC at the watchlist size and Lead time of correct warnings using time-ordered splits, then online on "Breaches caught at least one quarter early" with "Share of watchlist cases that needed action" as the guardrail. Watch for: Using final accounts instead of as-reported ones inflates accuracy and Random split leaks the same borrower across quarters.

## Baseline and production design

- **Baseline (build this first):** Rule-based watchlist on headroom under 15% plus two negative quarters, because credit officers already use it.
- **Production design:** Gradient boosting on headroom, trend and account-behaviour features with monotone constraints, calibrated per sector band, with a reason list for each flag.

## Why AI, and why this kind

**Why AI.** Predict which corporate borrowers will breach a financial covenant in the next two quarters so relationship managers act before the breach. The evidence that separates good from bad outcomes (Covenant headroom and slope, Revenue momentum, Liquidity cushion) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "level of leverage or coverage alone" are what teams reach for first, and they fail because A firm at 3.9x against a 4.0x limit is riskier than one at 4.5x against 6.0x. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting on headroom, trend and account-behaviour features with monotone constraints, calibrated per sector band, with a reason list for each flag.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Covenant headroom and slope, Revenue momentum, Liquidity cushion and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based watchlist on headroom under 15% plus two negative quarters, because credit officers already use it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on headroom, trend and account-behaviour features with monotone constraints, calibrated per sector band, with a reason list for each flag | chosen | Meets the run-window envelope at $0.197 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Breaches caught at least one quarter early) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using final accounts instead of as-reported ones inflates accuracy.
- Evaluation trap: Random split leaks the same borrower across quarters.
- Waiver or amendment before breach: breach never occurs because terms were changed.
- Restated accounts: historical ratios change after the fact.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
