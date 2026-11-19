# Mortgage Prepayment & Default Risk Modelling: use-case brief

> Generated from the blueprint `bfsi/mortgage-prepayment-and-default-risk` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Mortgage Prepayment & Default Risk Modelling · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast monthly prepayment and default for each mortgage so pricing, hedging, provisioning and servicing capacity use the right cash flows. The system has to run as a scheduled batch job, inside these limits: Competing risks, prepayment versus default, modelled jointly, Rate-path scenarios from the treasury curve engine and Monthly run under 3 hours for 4M loans.

**Why it is hard.** The obvious approach is predicting one outcome and discarding the other, and it fails because ignoring prepayment overstates default exposure on loans that would have left. The second trap is in "Rate incentive": the real signal is refinance incentive as current rate minus the market rate available to this borrower, while teams usually reach for using the coupon alone.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way provision movement explained by model drift measures it.

**What success looks like.** Offline: Calibration of cumulative CPR and CDR by vintage and Time-dependent concordance. Online: Forecast error of monthly cash flow and Provision movement explained by model drift. The launch is judged on "Forecast error of monthly cash flow" while "Provision movement explained by model drift" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast monthly prepayment and default for each mortgage so pricing, hedging, provisioning and servicing capacity use the right cash flows.

**Training objective.** `\mathcal{L}=-\sum_i\left[\delta_i\log h(t_i\mid x_i)-\int_0^{t_i}h(u\mid x_i)\,du\right]+\lambda\,\mathrm{Brier}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \delta_i | Event indicator: 1 if loan i ended in default or prepayment (the exit being modelled), 0 if it was still active (censored). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| h | The hazard: the chance the event happens at time u given that it has not happened yet. |
| t_i | Time step, or token position in a text sequence. (one value per example i) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| x_i | The input features describing one example (what the model sees). (one value per example i) |
| \int_0^{t_i} | Integral: add up a continuously varying quantity over the range shown. |
| u | The time variable of integration, running from 0 up to the observed time. |
| d | The integration variable du: a tiny step in time. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Brier} | Brier score: the mean squared difference between predicted probability and the 0/1 outcome. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |

**Hard constraints**

- Competing risks, prepayment versus default, modelled jointly
- Rate-path scenarios from the treasury curve engine
- Monthly run under 3 hours for 4M loans
- Model passes independent validation

## The approach in one paragraph

Start with pool-level CPR and CDR curves by seasoning and rate incentive, because servicers and traders already read them. Then earn the move to loan-level discrete-time competing-risk gradient boosting with macro-scenario covariates, calibrated against pool-level actuals each month, and only if it beats the baseline on Calibration of cumulative CPR and CDR by vintage and Time-dependent concordance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Refinance incentive | Current coupon minus prevailing offer rate for the borrower's LTV and score band. Drives rate-sensitive prepayment. Guard against: market rate must be as at the month, not today. |
| Add Loan seasoning curve | Piecewise hazard by months since origination. Prepayment ramps over the first 30 months. Guard against: vintage and seasoning mix if not stratified. |
| Add Current LTV with house price index | Balance divided by indexed property value using the local HPI. Negative equity blocks refinancing and raises default. Guard against: hPI release lags the decision date. |
| Run it as one pipeline | Loan tape ingest (nightly CDC from the servicing system), Feature builder (Spark with point-in-time tables), Macro scenario service (treasury curve engine), Hazard model (gradient boosting survival), Cash-flow projector (batch Python on Spark) and Model registry (MLflow with signed artefacts), with Validation report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle rate regime never seen in training | Scenario bands, monotone constraints on incentive and an overlay process approved by risk. |

**Deliberately not doing**

- Broker name: proxies for vintage and product, not for behaviour.
- Month-end balance rounding: numerical noise below any decision threshold.
- Application channel: correlates with cohort effects that change every year.

**How the approach is proven**

Prove it offline on Calibration of cumulative CPR and CDR by vintage and Time-dependent concordance using time-ordered splits, then online on "Forecast error of monthly cash flow" with "Provision movement explained by model drift" as the guardrail. Watch for: Random split leaks vintages across train and test and Back-test in a calm rate year hides refinancing waves.

## Baseline and production design

- **Baseline (build this first):** Pool-level CPR and CDR curves by seasoning and rate incentive, because servicers and traders already read them.
- **Production design:** Loan-level discrete-time competing-risk gradient boosting with macro-scenario covariates, calibrated against pool-level actuals each month.

## Why AI, and why this kind

**Why AI.** Forecast monthly prepayment and default for each mortgage so pricing, hedging, provisioning and servicing capacity use the right cash flows. The evidence that separates good from bad outcomes (Refinance incentive, Loan seasoning curve, Current LTV with house price index) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "predicting one outcome and discarding the other" are what teams reach for first, and they fail because ignoring prepayment overstates default exposure on loans that would have left. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Loan-level discrete-time competing-risk gradient boosting with macro-scenario covariates, calibrated against pool-level actuals each month.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Refinance incentive, Loan seasoning curve, Current LTV with house price index and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Pool-level CPR and CDR curves by seasoning and rate incentive, because servicers and traders already read them | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Loan-level discrete-time competing-risk gradient boosting with macro-scenario covariates, calibrated against pool-level actuals each month | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Forecast error of monthly cash flow) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Random split leaks vintages across train and test.
- Evaluation trap: Back-test in a calm rate year hides refinancing waves.
- Rate regime never seen in training: model extrapolates refinancing behaviour badly.
- Forbearance programmes: borrowers pause payments but are not in default.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
