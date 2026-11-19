# Account Takeover Detection: use-case brief

> Generated from the blueprint `fintech/account-takeover-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Account Takeover Detection · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect credential-stuffing and session-hijack logins in real time and step up authentication without adding friction for real users. The system has to run in under 100 milliseconds, inside these limits: Added login latency under 60 ms, Step-up rate under 2% of sessions and GDPR-compliant device signals.

**Why it is hard.** The obvious approach is iP reputation alone, and it fails because residential proxies make IP reputation near-useless. The second trap is in "Sequence": the real signal is login followed by immediate payee or address change, while teams usually reach for isolated login anomaly.

**Scale and stakes.** At 10 million users this is about 12.0M model-touching events a day, 139 requests per second on average and 833 at peak, at an estimated $4.0K a month. A mistake is expensive in the way login success rate for good users measures it.

**What success looks like.** Offline: PR-AUC on confirmed ATO and Step-up rate at fixed recall. Online: ATO loss per 10k logins and Login success rate for good users. The launch is judged on "ATO loss per 10k logins" while "Login success rate for good users" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect credential-stuffing and session-hijack logins in real time and step up authentication without adding friction for real users.

**Training objective.** `\mathcal{L}=\sum_i w_{y_i}\,\mathrm{CE}(p_i,y_i)+\mu\,\mathrm{Brier}(p)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_{y_i} | A class weight: w_{y_i} is larger for the rare takeover class so it is not ignored. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| p_i | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per example i) |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \mu | Weight on the Brier (calibration) term: how strongly it counts against the main objective. |
| \mathrm{Brier} | Brier score: the mean squared difference between predicted probability and the 0/1 outcome. |

**Hard constraints**

- Added login latency under 60 ms
- Step-up rate under 2% of sessions
- GDPR-compliant device signals
- Explainable challenges

## The approach in one paragraph

Start with rule scorecard with velocity and device-novelty thresholds. Then earn the move to gradient-boosted model on session and sequence features with an LSTM over the last 20 events, served in-process in the auth service, and only if it beats the baseline on PR-AUC on confirmed ATO and Step-up rate at fixed recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Device novelty vs history | Hamming distance of device fingerprint to the account's top-3 devices. Takeovers come from unfamiliar devices. Guard against: fingerprint salt rotation must not create fake novelty. |
| Add Impossible travel score | Geodesic speed between consecutive logins. Physical constraint is hard to fake. Guard against: use IP geolocation confidence not raw coordinates. |
| Add Login failure burst | Failed attempts against the account in 15 minutes. Credential stuffing signature. Guard against: count attempts before the success only. |
| Run it as one pipeline | Login event gateway (auth service), Session feature cache (Redis), Sequence encoder (ONNX LSTM), ATO scorer (LightGBM), Step-up policy (risk-based MFA rules) and Outcome labels (user reports and reversals), with Recovery queue off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle corporate VPN rollout | Cohort-level baseline shift detector with automatic dampening. |

**Deliberately not doing**

- Browser user-agent string: trivially spoofed, use TLS and canvas entropy features.
- Time-of-day of login: confounded with timezone, use deviation from the user's own pattern.

**How the approach is proven**

Prove it offline on PR-AUC on confirmed ATO and Step-up rate at fixed recall using time-ordered splits, then online on "ATO loss per 10k logins" with "Login success rate for good users" as the guardrail. Watch for: Labels come only from users who reported fraud and Training on post-takeover sessions leaks attacker behaviour.

## Baseline and production design

- **Baseline (build this first):** Rule scorecard with velocity and device-novelty thresholds.
- **Production design:** Gradient-boosted model on session and sequence features with an LSTM over the last 20 events, served in-process in the auth service.

## Why AI, and why this kind

**Why AI.** Detect credential-stuffing and session-hijack logins in real time and step up authentication without adding friction for real users. The evidence that separates good from bad outcomes (Device novelty vs history, Impossible travel score, Login failure burst) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "IP reputation alone" are what teams reach for first, and they fail because residential proxies make IP reputation near-useless. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient-boosted model on session and sequence features with an LSTM over the last 20 events, served in-process in the auth service.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Device novelty vs history, Impossible travel score, Login failure burst and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule scorecard with velocity and device-novelty thresholds | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient-boosted model on session and sequence features with an LSTM over the last 20 events, served in-process in the auth service | chosen | Meets the 80 ms envelope at $0.011 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (ATO loss per 10k logins) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels come only from users who reported fraud.
- Evaluation trap: Training on post-takeover sessions leaks attacker behaviour.
- Corporate VPN rollout: thousands of users appear to travel together.
- Mobile OS update changes fingerprint: mass false novelty.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
