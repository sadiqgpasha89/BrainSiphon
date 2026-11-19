# Identity Threat Detection in SSO Logs: use-case brief

> Generated from the blueprint `cybersecurity/identity-threat-detection-sso` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Identity Threat Detection in SSO Logs · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect token theft, MFA fatigue attacks and suspicious sign-ins in identity-provider logs in real time and trigger step-up or session revocation. The system has to run in under 100 milliseconds, inside these limits: Decision during authentication within 50 ms, Step-up friction budget and Privacy.

**Why it is hard.** The obvious approach is per-login anomaly scores, and it fails because token theft shows as a session jump not a bad login. The second trap is in "Calibration": the real signal is risk bands tied to actions, while teams usually reach for raw probabilities.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $4.7K a month. A mistake is expensive in the way step-up rate for legitimate users measures it.

**What success looks like.** Offline: Detection recall at fixed step-up rate and Time to revoke. Online: Account takeovers per 100k users and Step-up rate for legitimate users. The launch is judged on "Account takeovers per 100k users" while "Step-up rate for legitimate users" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect token theft, MFA fatigue attacks and suspicious sign-ins in identity-provider logs in real time and trigger step-up or session revocation.

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

- Decision during authentication within 50 ms
- Step-up friction budget
- Privacy
- Global workforce travel

## The approach in one paragraph

Start with static rules for impossible travel and country blocks. Then earn the move to streaming feature builder with gradient-boosted risk scoring and policy engine for step-up, revoke or block, with user-visible explanations, and only if it beats the baseline on Detection recall at fixed step-up rate and Time to revoke after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Session token reuse across IPs | Same token from distinct networks. Token theft. Guard against: token IDs hashed. |
| Add MFA push storm | Number of denied pushes in 10 minutes. Fatigue attack. Guard against: window. |
| Add Impossible-travel score | Speed between locations. Compromise. Guard against: vPN handling. |
| Run it as one pipeline | IdP log stream (Kafka), Session and device features (Flink), Risk model (GBDT), Policy engine (risk bands), Step-up or revoke (IdP API) and Confirmed compromises (labels), with SOC queue off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle corporate VPN exits change | VPN egress registry and dynamic IP reputation. |

**Deliberately not doing**

- Browser version: noisy.
- Login time of day: confounded by timezone.

**How the approach is proven**

Prove it offline on Detection recall at fixed step-up rate and Time to revoke using time-ordered splits, then online on "Account takeovers per 100k users" with "Step-up rate for legitimate users" as the guardrail. Watch for: Labels from confirmed incidents only and Simulated attacks lacking real token behaviours.

## Baseline and production design

- **Baseline (build this first):** Static rules for impossible travel and country blocks.
- **Production design:** Streaming feature builder with gradient-boosted risk scoring and policy engine for step-up, revoke or block, with user-visible explanations.

## Why AI, and why this kind

**Why AI.** Detect token theft, MFA fatigue attacks and suspicious sign-ins in identity-provider logs in real time and trigger step-up or session revocation. The evidence that separates good from bad outcomes (Session token reuse across IPs, MFA push storm, Impossible-travel score) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "per-login anomaly scores" are what teams reach for first, and they fail because token theft shows as a session jump not a bad login. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Streaming feature builder with gradient-boosted risk scoring and policy engine for step-up, revoke or block, with user-visible explanations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Session token reuse across IPs, MFA push storm, Impossible-travel score and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static rules for impossible travel and country blocks | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Streaming feature builder with gradient-boosted risk scoring and policy engine for step-up, revoke or block, with user-visible explanations | chosen | Meets the 80 ms envelope at $0.0053 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Account takeovers per 100k users) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels from confirmed incidents only.
- Evaluation trap: Simulated attacks lacking real token behaviours.
- Corporate VPN exits change: everyone appears to travel.
- Executive travel to high-risk country: step-up annoys leadership.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
