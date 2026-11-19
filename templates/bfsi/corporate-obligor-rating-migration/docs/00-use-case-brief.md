# Corporate Obligor Rating Migration Prediction: use-case brief

> Generated from the blueprint `bfsi/corporate-obligor-rating-migration` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Corporate Obligor Rating Migration Prediction · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict the probability that a corporate borrower's internal rating moves up or down within 12 months to guide limits, pricing and watchlists. The system has to run as a scheduled batch job, inside these limits: Ratings remain explainable and monotone in key drivers, Credit committee override recorded and Quarterly refresh.

**Why it is hard.** The obvious approach is unordered multi-class classification, and it fails because missing a one-notch move is far less costly than missing a five-notch drop. The second trap is in "Through the cycle": the real signal is migration conditional on the cycle phase, while teams usually reach for averaging migration across years.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.7K a month. A mistake is expensive in the way expected loss variance measures it.

**What success looks like.** Offline: Ranked probability score and Calibration by rating class. Online: Share of downgrades flagged at least one quarter early and Expected loss variance. The launch is judged on "Share of downgrades flagged at least one quarter early" while "Expected loss variance" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict the probability that a corporate borrower's internal rating moves up or down within 12 months to guide limits, pricing and watchlists.

**Training objective.** `\mathcal{L}=\mathrm{OrdinalCE}(\hat{y},y)+\lambda\,\mathrm{Calibration}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{OrdinalCE} | Ordinal cross-entropy: cross-entropy that treats classes as ordered, so predicting far from the true grade costs more than predicting next to it. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Ratings remain explainable and monotone in key drivers
- Credit committee override recorded
- Quarterly refresh
- Aligned to the regulatory rating scale

## The approach in one paragraph

Start with historical transition matrix by rating class and sector, because it is the standard reference and is interpretable. Then earn the move to ordinal gradient boosting with monotone constraints and macro covariates, calibrated per rating class, with reason codes and an override workflow, and only if it beats the baseline on Ranked probability score and Calibration by rating class after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Rating age and prior moves | Months since last review and number of changes in 24 months. Stale ratings drift. Guard against: review dates may be late. |
| Add Margin and coverage trend | Change in EBITDA margin and interest cover over 2 years. Operating stress precedes downgrades. Guard against: use contractual definitions. |
| Add Sector stress index | Sector default rate and credit spread level. Sector shocks affect all firms. Guard against: index must be as at the date. |
| Run it as one pipeline | Rating history store (credit risk warehouse), Financial spread feed (spreading system), Feature builder (Spark), Migration model (ordinal boosting) and Calibrator (isotonic per class), with Review queue and Back-test archive off the critical path. |
| Optimise the right thing | The objective weighs ordinal cross-entropy: cross-entropy that treats classes as ordered, so predicting far from the true grade costs more than predicting next to it, so the model is trained on the cost of the decision and not on a generic score. |
| Handle merger or demerger | Use a legal-entity graph and restart features on the new entity. |

**Deliberately not doing**

- Company name length: no information.
- Region of head office: weak, proxies for sector mix.
- Number of directors: no stable link to credit migration.

**How the approach is proven**

Prove it offline on Ranked probability score and Calibration by rating class using time-ordered splits, then online on "Share of downgrades flagged at least one quarter early" with "Expected loss variance" as the guardrail. Watch for: Pooling cycles in a random split understates downturn risk and Overrides in history hide the model's own errors.

## Baseline and production design

- **Baseline (build this first):** Historical transition matrix by rating class and sector, because it is the standard reference and is interpretable.
- **Production design:** Ordinal gradient boosting with monotone constraints and macro covariates, calibrated per rating class, with reason codes and an override workflow.

## Why AI, and why this kind

**Why AI.** Predict the probability that a corporate borrower's internal rating moves up or down within 12 months to guide limits, pricing and watchlists. The evidence that separates good from bad outcomes (Rating age and prior moves, Margin and coverage trend, Sector stress index) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "unordered multi-class classification" are what teams reach for first, and they fail because missing a one-notch move is far less costly than missing a five-notch drop. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Ordinal gradient boosting with monotone constraints and macro covariates, calibrated per rating class, with reason codes and an override workflow.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Rating age and prior moves, Margin and coverage trend, Sector stress index and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Historical transition matrix by rating class and sector, because it is the standard reference and is interpretable | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Ordinal gradient boosting with monotone constraints and macro covariates, calibrated per rating class, with reason codes and an override workflow | chosen | Meets the run-window envelope at $0.192 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Share of downgrades flagged at least one quarter early) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Pooling cycles in a random split understates downturn risk.
- Evaluation trap: Overrides in history hide the model's own errors.
- Merger or demerger: the entity changes and history no longer applies.
- Rating policy change: the scale or criteria change mid-sample.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
