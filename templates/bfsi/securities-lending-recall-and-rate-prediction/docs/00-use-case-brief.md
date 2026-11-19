# Securities Lending Recall & Rate Prediction: use-case brief

> Generated from the blueprint `bfsi/securities-lending-recall-and-rate-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Securities Lending Recall & Rate Prediction · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict lending demand, fee rates and recall risk per security so the lending desk prices loans and holds back what it expects to need. The system has to run as a scheduled batch job, inside these limits: Beneficial owner restrictions respected, Daily run before market open and Explainable to the desk.

**Why it is hard.** The obvious approach is past fee alone, and it fails because fees follow shorting demand that is visible earlier in utilisation. The second trap is in "Recall": the real signal is probability that the owner sells or needs the security, while teams usually reach for average recall rate.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way failed returns due to recalls measures it.

**What success looks like.** Offline: Fee MAE on specials and Recall PR-AUC. Online: Lending revenue and Failed returns due to recalls. The launch is judged on "Lending revenue" while "Failed returns due to recalls" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict lending demand, fee rates and recall risk per security so the lending desk prices loans and holds back what it expects to need.

**Training objective.** `\mathcal{L}=\mathrm{Huber}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y_{\text{recall}})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Beneficial owner restrictions respected
- Daily run before market open
- Explainable to the desk
- Regulatory borrowing limits

## The approach in one paragraph

Start with last-week fee and utilisation by security, because the desk already works that way. Then earn the move to gradient boosting for fee and recall probability with event features and owner-level models, producing price suggestions and hold-back inventory, and only if it beats the baseline on Fee MAE on specials and Recall PR-AUC after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Utilisation trend | Change in the share of lendable inventory on loan. Demand proxy. Guard against: data lags by a day. |
| Add Corporate event proximity | Days to dividends, votes and index rebalances. Spikes in demand and recalls. Guard against: event dates change. |
| Add Short interest | Reported short interest versus float. Indicates demand. Guard against: delayed publication. |
| Run it as one pipeline | Inventory and loan data (lending platform), Market data (vendor feeds), Feature builder (Spark), Fee and recall models (gradient boosting), Price suggester (rules) and Desk screen (trading UI), with Outcome archive off the critical path. |
| Optimise the right thing | The objective weighs huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training, so the model is trained on the cost of the decision and not on a generic score. |
| Handle short squeeze | Regime flag and cap on suggested pricing. |

**Deliberately not doing**

- Trader name: irrelevant.
- Ticker string: arbitrary.
- Loan ID: arbitrary.

**How the approach is proven**

Prove it offline on Fee MAE on specials and Recall PR-AUC using time-ordered splits, then online on "Lending revenue" with "Failed returns due to recalls" as the guardrail. Watch for: Survivorship in security lists and Event dates known only after the fact.

## Baseline and production design

- **Baseline (build this first):** Last-week fee and utilisation by security, because the desk already works that way.
- **Production design:** Gradient boosting for fee and recall probability with event features and owner-level models, producing price suggestions and hold-back inventory.

## Why AI, and why this kind

**Why AI.** Predict lending demand, fee rates and recall risk per security so the lending desk prices loans and holds back what it expects to need. The evidence that separates good from bad outcomes (Utilisation trend, Corporate event proximity, Short interest) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "past fee alone" are what teams reach for first, and they fail because fees follow shorting demand that is visible earlier in utilisation. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting for fee and recall probability with event features and owner-level models, producing price suggestions and hold-back inventory.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Utilisation trend, Corporate event proximity, Short interest and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Last-week fee and utilisation by security, because the desk already works that way | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting for fee and recall probability with event features and owner-level models, producing price suggestions and hold-back inventory | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Lending revenue) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Survivorship in security lists.
- Evaluation trap: Event dates known only after the fact.
- Short squeeze: fees spike far beyond history.
- Restricted securities: securities under borrowing restrictions are suggested for lending and the loan fails at the lender.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
