# Number Porting Validation & Exceptions: use-case brief

> Generated from the blueprint `telecom/number-porting-validation-exceptions` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Number Porting Validation & Exceptions · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict and explain porting request rejections and exceptions before submission so more ports complete on the first attempt. The system has to run interactively, within a few seconds, inside these limits: Validation within 3 s of the request, Reasons mapped to the porting authority's rejection codes and No automatic cancellation of a customer request.

**Why it is hard.** The obvious approach is ports that took long, and it fails because delay and rejection have different fixes. The second trap is in "Check": the real signal is pre-validation of the data the donor will check, while teams usually reach for waiting for the donor's rejection.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $3.6K a month. A mistake is expensive in the way days to complete a port measures it.

**What success looks like.** Offline: Rejection prediction AUC and precision, Reason code accuracy and First-attempt success rate. Online: First-attempt port success, Days to complete a port and Port-related care contacts. The launch is judged on "First-attempt port success" while "Days to complete a port" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict and explain porting request rejections and exceptions before submission so more ports complete on the first attempt.

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

- Validation within 3 s of the request
- Reasons mapped to the porting authority's rejection codes
- No automatic cancellation of a customer request
- Handles 300K porting requests per day

## The approach in one paragraph

Start with static field-format validation, because it catches simple data errors cheaply. Then earn the move to gradient boosting over validation features with reason codes mapped to rejection classes and a guidance message for the agent or customer before submission, and only if it beats the baseline on Rejection prediction AUC and precision and Reason code accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Identifier match score | Match of name, account and number against the donor's record format. Most rejections are mismatches. Guard against: compare formats not raw values. |
| Add Pending order on the number | Open orders or locks on the number. Blocks the port. Guard against: from order and number systems. |
| Add Contract and balance flags | Whether notice or balance checks apply. Rejection reason. Guard against: use policy fields. |
| Run it as one pipeline | Port request intake (order channel), Field and format validation (rule engine), Rejection risk model (gradient boosting), Reason mapping (code table), Guidance to requester (UI message), Submission to porting hub (porting API) and Outcome capture (nightly join). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new donor operator | Use a pooled prior and monitor closely. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Time of day: weak link.
- Request channel alone: weak link.

**How the approach is proven**

Prove it offline on Rejection prediction AUC and precision, Reason code accuracy and First-attempt success rate using time-ordered splits, then online on "First-attempt port success" with "Days to complete a port" as the guardrail. Watch for: Evaluating without reason codes, Treating delay as rejection and Differential service by value.

## Baseline and production design

- **Baseline (build this first):** Static field-format validation, because it catches simple data errors cheaply.
- **Production design:** Gradient boosting over validation features with reason codes mapped to rejection classes and a guidance message for the agent or customer before submission.

## Why AI, and why this kind

**Why AI.** Predict and explain porting request rejections and exceptions before submission so more ports complete on the first attempt. The evidence that separates good from bad outcomes (Identifier match score, Pending order on the number, Contract and balance flags) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "ports that took long" are what teams reach for first, and they fail because delay and rejection have different fixes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting over validation features with reason codes mapped to rejection classes and a guidance message for the agent or customer before submission.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Identifier match score, Pending order on the number, Contract and balance flags and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static field-format validation, because it catches simple data errors cheaply | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting over validation features with reason codes mapped to rejection classes and a guidance message for the agent or customer before submission | chosen | Meets the 2500 ms envelope at $0.796 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (First-attempt port success) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating without reason codes.
- Evaluation trap: Treating delay as rejection.
- New donor operator: no rejection history.
- Rule change at the porting authority: validation becomes wrong.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
