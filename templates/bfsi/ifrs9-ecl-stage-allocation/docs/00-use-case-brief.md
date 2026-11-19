# IFRS 9 Expected Credit Loss Staging: use-case brief

> Generated from the blueprint `bfsi/ifrs9-ecl-stage-allocation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** IFRS 9 Expected Credit Loss Staging · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Allocate each exposure to IFRS 9 stage 1, 2 or 3 and estimate lifetime expected loss so provisions respond to deteriorating credit without whipsaw. The system has to run as a scheduled batch job, inside these limits: Staging rules must be explainable to the auditor, Monthly close under 4 hours and Forward-looking scenarios from the economics team.

**Why it is hard.** The obvious approach is staging by current PD alone, and it fails because a high-risk loan priced at origination for that risk has not deteriorated. The second trap is in "Stability": the real signal is hysteresis between stage 1 and 2 to avoid flip-flop, while teams usually reach for a single threshold evaluated monthly.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way late stage-3 recognitions measures it.

**What success looks like.** Offline: Calibration of PD by stage and Stability of stage migration matrix. Online: Provision volatility relative to credit losses and Late stage-3 recognitions. The launch is judged on "Provision volatility relative to credit losses" while "Late stage-3 recognitions" must not get worse.

## Objective, loss and constraints

**Business objective.** Allocate each exposure to IFRS 9 stage 1, 2 or 3 and estimate lifetime expected loss so provisions respond to deteriorating credit without whipsaw.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Brier}(\hat{p},y)+\mu\,\mathrm{Calibration}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Brier} | Brier score: the mean squared difference between predicted probability and the 0/1 outcome. |
| \mu | The model's predicted mean (expected value) of the outcome. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Staging rules must be explainable to the auditor
- Monthly close under 4 hours
- Forward-looking scenarios from the economics team
- Stable stage migration, no oscillation month to month

## The approach in one paragraph

Start with rule-based staging on days past due and a PD ratio threshold, because it is simple and the auditors know it. Then earn the move to behavioural PD models with origination PD held, monotone gradient boosting, hysteresis rules on stage migration and a scenario engine that weights macro paths, and only if it beats the baseline on Calibration of PD by stage and Stability of stage migration matrix after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Lifetime PD ratio | Current lifetime PD divided by lifetime PD at origination. The standard relative test for stage 2. Guard against: the origination PD must be preserved, not re-estimated. |
| Add Days past due flag | Payment more than 30 days overdue. The backstop for stage 2. Guard against: counted on contractual due dates, not posting dates. |
| Add Watchlist and forbearance | Internal flags for credit concern or concession. Qualitative indicators of increase. Guard against: flags must have effective dates to avoid leakage. |
| Run it as one pipeline | Exposure data mart (nightly loads), Origination PD vault (immutable snapshot store), Lifetime PD model (monotone gradient boosting), Scenario engine (macroeconomic paths), Stage allocator (rules with hysteresis), ECL calculator (batch Spark) and Finance reconciliation (GL feed). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle model change at quarter end | Parallel run, bridge analysis and an approved overlay for transitions. |

**Deliberately not doing**

- Customer tenure: weak link once behaviour is observed.
- Number of products: proxy for relationship, not for risk.
- Branch code: administrative noise.

**How the approach is proven**

Prove it offline on Calibration of PD by stage and Stability of stage migration matrix using time-ordered splits, then online on "Provision volatility relative to credit losses" with "Late stage-3 recognitions" as the guardrail. Watch for: Random split ignores economic cycles and Calibrating on benign years understates stage 2.

## Baseline and production design

- **Baseline (build this first):** Rule-based staging on days past due and a PD ratio threshold, because it is simple and the auditors know it.
- **Production design:** Behavioural PD models with origination PD held, monotone gradient boosting, hysteresis rules on stage migration and a scenario engine that weights macro paths.

## Why AI, and why this kind

**Why AI.** Allocate each exposure to IFRS 9 stage 1, 2 or 3 and estimate lifetime expected loss so provisions respond to deteriorating credit without whipsaw. The evidence that separates good from bad outcomes (Lifetime PD ratio, Days past due flag, Watchlist and forbearance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "staging by current PD alone" are what teams reach for first, and they fail because A high-risk loan priced at origination for that risk has not deteriorated. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Behavioural PD models with origination PD held, monotone gradient boosting, hysteresis rules on stage migration and a scenario engine that weights macro paths.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Lifetime PD ratio, Days past due flag, Watchlist and forbearance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based staging on days past due and a PD ratio threshold, because it is simple and the auditors know it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Behavioural PD models with origination PD held, monotone gradient boosting, hysteresis rules on stage migration and a scenario engine that weights macro paths | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Provision volatility relative to credit losses) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Random split ignores economic cycles.
- Evaluation trap: Calibrating on benign years understates stage 2.
- Model change at quarter end: provisions jump for modelling reasons.
- Missing origination PD for legacy loans: the relative test cannot be computed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
