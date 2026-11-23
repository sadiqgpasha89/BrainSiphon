# Postpaid Credit Risk at Point of Sale: use-case brief

> Generated from the blueprint `telecom/postpaid-credit-risk-point-of-sale` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Postpaid Credit Risk at Point of Sale · **Domain:** telecom · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Decide on credit limits and deposits for postpaid and device-financing applicants at the point of sale with explainable, fair credit risk scores. The system has to run in under 100 milliseconds, inside these limits: Decision within 80 ms, Adverse-action reasons for declines and No use of protected attributes or close proxies.

**Why it is hard.** The obvious approach is early late payments, and it fails because short delays are common and benign. The second trap is in "Population": the real signal is accepted and declined applicants with reject inference, while teams usually reach for accepted customers only.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $3.6K a month. A mistake is expensive in the way approval rate measures it.

**What success looks like.** Offline: AUC and KS by segment, Calibration and Disparity metrics by group. Online: Bad debt rate, Approval rate and Appeals upheld. The launch is judged on "Bad debt rate" while "Approval rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Decide on credit limits and deposits for postpaid and device-financing applicants at the point of sale with explainable, fair credit risk scores.

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

- Decision within 80 ms
- Adverse-action reasons for declines
- No use of protected attributes or close proxies
- Model governance sign-off for each release
- 300K applications per day

## The approach in one paragraph

Start with a bureau score cut-off with fixed deposit tiers, because it is transparent and the incumbent approach. Then earn the move to gradient boosting with monotonic constraints and reason codes, a limit and deposit policy, reject-inference training and a monitoring pack for fairness and stability, and only if it beats the baseline on AUC and KS by segment and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Bureau score and trade lines | Score and delinquency history. Core risk signal. Guard against: official sources. |
| Add Existing relationship | Tenure and payment record with the operator. Strong behavioural signal. Guard against: own data. |
| Add Application consistency | Declared versus bureau data. Fraud and risk. Guard against: use match quality. |
| Run it as one pipeline | Application and bureau pull (credit APIs), Feature build (online feature store), Risk model (gradient boosting), Policy and deposit tiers (rule engine), Decision and reasons (POS channel), Performance tracking (monthly) and Fairness and drift monitor (governance report). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle thin-file applicant | Alternative data with consent and a smaller initial limit. |

**Deliberately not doing**

- Applicant name: irrelevant and private.
- Application time alone: weak link.
- Store brand alone: weak link.

**How the approach is proven**

Prove it offline on AUC and KS by segment, Calibration and Disparity metrics by group using time-ordered splits, then online on "Bad debt rate" with "Approval rate" as the guardrail. Watch for: Training only on accepted applicants, Skipping fairness tests and Using protected proxies.

## Baseline and production design

- **Baseline (build this first):** A bureau score cut-off with fixed deposit tiers, because it is transparent and the incumbent approach.
- **Production design:** Gradient boosting with monotonic constraints and reason codes, a limit and deposit policy, reject-inference training and a monitoring pack for fairness and stability.

## Why AI, and why this kind

**Why AI.** Decide on credit limits and deposits for postpaid and device-financing applicants at the point of sale with explainable, fair credit risk scores. The evidence that separates good from bad outcomes (Bureau score and trade lines, Existing relationship, Application consistency) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "early late payments" are what teams reach for first, and they fail because short delays are common and benign. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting with monotonic constraints and reason codes, a limit and deposit policy, reject-inference training and a monitoring pack for fairness and stability.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Bureau score and trade lines, Existing relationship, Application consistency and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A bureau score cut-off with fixed deposit tiers, because it is transparent and the incumbent approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting with monotonic constraints and reason codes, a limit and deposit policy, reject-inference training and a monitoring pack for fairness and stability | chosen | Meets the 80 ms envelope at $0.797 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Bad debt rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training only on accepted applicants.
- Evaluation trap: Skipping fairness tests.
- Thin-file applicant: no bureau history.
- Bureau outage: the bureau returns no score at all.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
