# Credential Stuffing Detection: use-case brief

> Generated from the blueprint `cybersecurity/credential-stuffing-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Credential Stuffing Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect automated credential-stuffing attempts on login endpoints and block them while sparing real users who forget passwords. The system has to run in under 100 milliseconds, inside these limits: Login decision within 30 ms, Low friction for real users and Distributed low-and-slow attacks.

**Why it is hard.** The obvious approach is per-account lockouts, and it fails because attackers try each account once from many IPs. The second trap is in "Credentials": the real signal is breached-credential checks (k-anonymity), while teams usually reach for password rules only.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 1.0K at peak, at an estimated $4.0K a month. A mistake is expensive in the way challenge rate for good users measures it.

**What success looks like.** Offline: Detection of stuffing campaigns at fixed false challenges and Blocked attempt precision. Online: Account takeovers from stuffing and Challenge rate for good users. The launch is judged on "Account takeovers from stuffing" while "Challenge rate for good users" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect automated credential-stuffing attempts on login endpoints and block them while sparing real users who forget passwords.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Login decision within 30 ms
- Low friction for real users
- Distributed low-and-slow attacks
- Privacy-safe breach corpora use

## The approach in one paragraph

Start with per-account lockout and per-IP rate limit. Then earn the move to streaming aggregate detectors with per-request GBDT scoring, breach-corpus checks and adaptive challenges, and only if it beats the baseline on Detection of stuffing campaigns at fixed false challenges and Blocked attempt precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Global failure-rate spike | Failed logins per minute vs baseline. Campaign detection. Guard against: baseline. |
| Add Username-spread per fingerprint | Distinct usernames per device fingerprint. Stuffing. Guard against: fingerprint stability. |
| Add Breached-credential match | Hashed password in breach set. Reuse. Guard against: k-anonymity. |
| Run it as one pipeline | Login request (auth service), Aggregate stream features (Flink), Stuffing scorer (GBDT), Breach-check (k-anonymity API), Challenge policy (CAPTCHA or MFA) and Confirmed attacks (labels), with Security review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle password manager mass logins after outage | Cohort baselines and incident feeds. |

**Deliberately not doing**

- IP alone: rotating proxies.
- Time between attempts alone: randomised.

**How the approach is proven**

Prove it offline on Detection of stuffing campaigns at fixed false challenges and Blocked attempt precision using time-ordered splits, then online on "Account takeovers from stuffing" with "Challenge rate for good users" as the guardrail. Watch for: Labels only from detected campaigns and Test traffic without real user failure patterns.

## Baseline and production design

- **Baseline (build this first):** Per-account lockout and per-IP rate limit.
- **Production design:** Streaming aggregate detectors with per-request GBDT scoring, breach-corpus checks and adaptive challenges.

## Why AI, and why this kind

**Why AI.** Detect automated credential-stuffing attempts on login endpoints and block them while sparing real users who forget passwords. The evidence that separates good from bad outcomes (Global failure-rate spike, Username-spread per fingerprint, Breached-credential match) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "per-account lockouts" are what teams reach for first, and they fail because attackers try each account once from many IPs. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Streaming aggregate detectors with per-request GBDT scoring, breach-corpus checks and adaptive challenges.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Global failure-rate spike, Username-spread per fingerprint, Breached-credential match and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Per-account lockout and per-IP rate limit | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Streaming aggregate detectors with per-request GBDT scoring, breach-corpus checks and adaptive challenges | chosen | Meets the 80 ms envelope at $0.0088 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Account takeovers from stuffing) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels only from detected campaigns.
- Evaluation trap: Test traffic without real user failure patterns.
- Password manager mass logins after outage: spikes look like attack.
- Attackers slow down to stay under baseline: detection delayed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
