# Rent Delinquency Prediction: use-case brief

> Generated from the blueprint `real-estate/rent-delinquency-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Rent Delinquency Prediction · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which tenants will miss rent in the next month so property managers can reach out early with payment plans. The system has to run as a scheduled batch job, inside these limits: Outreach is supportive and offers help, never a threat, No eviction or legal decision is taken from a score and Each score shows the factors behind it.

**Why it is hard.** The obvious approach is the late-payment flag itself, and it fails because by the time rent is late the manager has lost the chance to offer a plan. The second trap is in "Cause": the real signal is signs of distress such as a job change, a rent increase and an open dispute, while teams usually reach for past lateness alone.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way payment plans accepted measures it.

**What success looks like.** Offline: PR-AUC and Calibration. Online: Rent collected on time and Payment plans accepted. The launch is judged on "Rent collected on time" while "Payment plans accepted" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which tenants will miss rent in the next month so property managers can reach out early with payment plans.

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

- Outreach is supportive and offers help, never a threat
- No eviction or legal decision is taken from a score
- Each score shows the factors behind it
- Refreshed weekly so managers act before the due date

## The approach in one paragraph

Start with late fees history flag, because managers already use it. Then earn the move to gradient boosting on timing, burden and engagement with calibrated risk and a care workflow, and only if it beats the baseline on PR-AUC and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Payment timing drift | Change in days between the due date and payment over the last 4 months. A growing lag is the earliest sign of stress. Guard against: autopay hides it, so analyse autopay tenants through a different signal. |
| Add Portal activity | Visits to the payment page without a payment in the 10 days before the due date. Shows intent and difficulty. Guard against: noisy, and depends on how often tenants log in. |
| Add Rent burden change | Percentage rent increase minus any change in verified income. A sharp rise in burden predicts missed rent. Guard against: income data are often missing, so mark unknown explicitly. |
| Run it as one pipeline | Ledger and portal data (property system), Feature builder (Spark), Delinquency model (boosting), Care list (rules), Outreach tool (comms), Outcome feed (warehouse) and Monitor (dashboard). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle payday timing | Use each tenant's pay cycle when computing timing features. |

**Deliberately not doing**

- Unit number: An arbitrary label that can proxy for building quality or floor.
- Name: Irrelevant to payment behaviour and a route to bias.
- Lease start day: Weakly tied to payment dates and not to difficulty paying.

**How the approach is proven**

Prove it offline on PR-AUC and Calibration using time-ordered splits, then online on "Rent collected on time" with "Payment plans accepted" as the guardrail. Watch for: Outreach changes outcomes, so a tenant helped by a plan looks like a false alarm and Autopay hides risk until a card fails, which distorts the timing signal.

## Baseline and production design

- **Baseline (build this first):** Late fees history flag, because managers already use it.
- **Production design:** Gradient boosting on timing, burden and engagement with calibrated risk and a care workflow.

## Why AI, and why this kind

**Why AI.** Predict which tenants will miss rent in the next month so property managers can reach out early with payment plans. The evidence that separates good from bad outcomes (Payment timing drift, Portal activity, Rent burden change) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the late-payment flag itself" are what teams reach for first, and they fail because by the time rent is late the manager has lost the chance to offer a plan. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting on timing, burden and engagement with calibrated risk and a care workflow.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Payment timing drift, Portal activity, Rent burden change and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Late fees history flag, because managers already use it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on timing, burden and engagement with calibrated risk and a care workflow | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Rent collected on time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Outreach changes outcomes, so a tenant helped by a plan looks like a false alarm.
- Evaluation trap: Autopay hides risk until a card fails, which distorts the timing signal.
- Payday timing: tenants are paid on different cycles and look late against a common due date.
- Rent assistance pending: a payment is delayed while a rent assistance application is processed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
