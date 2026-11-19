# Zero-Trust Adaptive Authentication: use-case brief

> Generated from the blueprint `cybersecurity/zero-trust-adaptive-authentication` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Zero-Trust Adaptive Authentication · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Continuously score session risk and adapt authentication requirements per request using device, user and resource signals. The system has to run in under 100 milliseconds, inside these limits: Decision under 30 ms, Policy transparency and Friction budget.

**Why it is hard.** The obvious approach is login-time only, and it fails because risk changes after login. The second trap is in "Policy": the real signal is mL risk plus explicit policy rules, while teams usually reach for mL decides everything.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $4.3K a month. A mistake is expensive in the way step-up friction measures it.

**What success looks like.** Offline: Compromise detection at fixed step-up rate and Decision latency. Online: Compromised sessions contained and Step-up friction. The launch is judged on "Compromised sessions contained" while "Step-up friction" must not get worse.

## Objective, loss and constraints

**Business objective.** Continuously score session risk and adapt authentication requirements per request using device, user and resource signals.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{FrictionCost}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{FrictionCost} | Penalty for the inconvenience of extra authentication steps imposed on legitimate users. |

**Hard constraints**

- Decision under 30 ms
- Policy transparency
- Friction budget
- Privacy

## The approach in one paragraph

Start with static conditional access rules. Then earn the move to streaming risk engine blending GBDT risk score with policy rules, continuous evaluation and just-in-time step-up, and only if it beats the baseline on Compromise detection at fixed step-up rate and Decision latency after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Device posture score | Patch level, EDR status. Trust. Guard against: agent. |
| Add Resource sensitivity | Application criticality. Stakes. Guard against: catalogue. |
| Add Behavioural drift in session | Action sequence deviation. Hijack. Guard against: session baseline. |
| Run it as one pipeline | Access request (policy enforcement point), Signal collector (device and identity), Risk scorer (GBDT), Policy decision (rules plus risk), Step-up or deny (IdP) and Outcome labels (incidents), with Audit off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle device posture agent crashes | Grace states and posture-staleness handling. |

**Deliberately not doing**

- Screen resolution: weak.
- Browser language: weak.

**How the approach is proven**

Prove it offline on Compromise detection at fixed step-up rate and Decision latency using time-ordered splits, then online on "Compromised sessions contained" with "Step-up friction" as the guardrail. Watch for: Labels from confirmed incidents only and Ignoring friction costs in evaluation.

## Baseline and production design

- **Baseline (build this first):** Static conditional access rules.
- **Production design:** Streaming risk engine blending GBDT risk score with policy rules, continuous evaluation and just-in-time step-up.

## Why AI, and why this kind

**Why AI.** Continuously score session risk and adapt authentication requirements per request using device, user and resource signals. The evidence that separates good from bad outcomes (Device posture score, Resource sensitivity, Behavioural drift in session) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "login-time only" are what teams reach for first, and they fail because risk changes after login. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Streaming risk engine blending GBDT risk score with policy rules, continuous evaluation and just-in-time step-up.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Device posture score, Resource sensitivity, Behavioural drift in session and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static conditional access rules | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Streaming risk engine blending GBDT risk score with policy rules, continuous evaluation and just-in-time step-up | chosen | Meets the 80 ms envelope at $0.0048 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Compromised sessions contained) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels from confirmed incidents only.
- Evaluation trap: Ignoring friction costs in evaluation.
- Device posture agent crashes: healthy devices appear untrusted.
- Executives frequently trigger step-up: pressure to weaken policy.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
