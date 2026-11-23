# Intraday Imbalance Risk Prediction: use-case brief

> Generated from the blueprint `energy/intraday-imbalance-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Intraday Imbalance Risk Prediction · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict the system imbalance direction and price risk for coming settlement periods so balancing responsible parties adjust positions before penalties hit. The system has to run interactively, within a few seconds, inside these limits: Direction forecast for the next 8 periods, Calibrated probability of a penalty price and Update every 5 minutes.

**Why it is hard.** The obvious approach is forecast errors alone, and it fails because the cost is what the market charges. The second trap is in "Timing": the real signal is features known before gate closure, while teams usually reach for data available after the fact.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 20.0K at peak, at an estimated $13.0K a month. A mistake is expensive in the way alerts acted on measures it.

**What success looks like.** Offline: Direction accuracy by period, Calibration of penalty probability and Alert precision at the cost threshold. Online: Imbalance cost, Alerts acted on and Position adjustment value. The launch is judged on "Imbalance cost" while "Alerts acted on" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict the system imbalance direction and price risk for coming settlement periods so balancing responsible parties adjust positions before penalties hit.

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

- Direction forecast for the next 8 periods
- Calibrated probability of a penalty price
- Update every 5 minutes
- Alerts only above a cost threshold
- 20 market zones

## The approach in one paragraph

Start with persistence of the last observed imbalance direction, because it is the simple benchmark. Then earn the move to a calibrated classifier and quantile model on live system signals with strict time-of-availability features and cost-aware alerts for trading desks, and only if it beats the baseline on Direction accuracy by period and Calibration of penalty probability after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around System frequency and area control error | Measured frequency deviation and error. Direction signal. Guard against: live. |
| Add Renewable forecast revisions | Change in wind and solar forecasts. Position error. Guard against: from forecasts. |
| Add Recent imbalance prices | Prices in the last periods. Persistence. Guard against: from settlement. |
| Run it as one pipeline | Live system data intake (market feeds), Feature build with availability checks (stream processing), Direction classifier (gradient boosting), Price quantile model (quantile regression), Cost-aware alert (rules), Trader display (trading console) and Outcome tracking (settlement). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle market rule change | Versioned data and a re-fit. |

**Deliberately not doing**

- Trader name: irrelevant.
- Report format: an artefact.
- Weather station id: an identifier.

**How the approach is proven**

Prove it offline on Direction accuracy by period, Calibration of penalty probability and Alert precision at the cost threshold using time-ordered splits, then online on "Imbalance cost" with "Alerts acted on" as the guardrail. Watch for: Using data after gate closure, Alerting with no cost threshold and Forecast error as the label.

## Baseline and production design

- **Baseline (build this first):** Persistence of the last observed imbalance direction, because it is the simple benchmark.
- **Production design:** A calibrated classifier and quantile model on live system signals with strict time-of-availability features and cost-aware alerts for trading desks.

## Why AI, and why this kind

**Why AI.** Predict the system imbalance direction and price risk for coming settlement periods so balancing responsible parties adjust positions before penalties hit. The evidence that separates good from bad outcomes (System frequency and area control error, Renewable forecast revisions, Recent imbalance prices) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "forecast errors alone" are what teams reach for first, and they fail because the cost is what the market charges. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A calibrated classifier and quantile model on live system signals with strict time-of-availability features and cost-aware alerts for trading desks.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among System frequency and area control error, Renewable forecast revisions, Recent imbalance prices and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Persistence of the last observed imbalance direction, because it is the simple benchmark | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibrated classifier and quantile model on live system signals with strict time-of-availability features and cost-aware alerts for trading desks | chosen | Meets the 2500 ms envelope at $0.0015 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Imbalance cost) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using data after gate closure.
- Evaluation trap: Alerting with no cost threshold.
- Market rule change: imbalance pricing is revised.
- Late data: the live feed lags.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
