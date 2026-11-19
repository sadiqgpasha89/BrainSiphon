# Fake & Bulk Account Creation Detection: use-case brief

> Generated from the blueprint `cybersecurity/fake-account-creation-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fake & Bulk Account Creation Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Stop automated and farmed account registrations at signup, protecting downstream trust, promos and abuse systems. The system has to run in under 100 milliseconds, inside these limits: Signup decision within 50 ms, Low friction for genuine users and Disposable-email and SMS farms.

**Why it is hard.** The obvious approach is individual signup scoring, and it fails because farmed accounts each look plausible alone. The second trap is in "Cost": the real signal is raise attacker cost with adaptive friction, while teams usually reach for hard blocks only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.6K a month. A mistake is expensive in the way signup conversion measures it.

**What success looks like.** Offline: Detection recall at fixed friction rate and Cohort-level precision. Online: Fake account share after 30 days and Signup conversion. The launch is judged on "Fake account share after 30 days" while "Signup conversion" must not get worse.

## Objective, loss and constraints

**Business objective.** Stop automated and farmed account registrations at signup, protecting downstream trust, promos and abuse systems.

**Training objective.** `\mathcal{L}=\mathrm{FL}(y,p)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Signup decision within 50 ms
- Low friction for genuine users
- Disposable-email and SMS farms
- Privacy

## The approach in one paragraph

Start with rate limits and disposable-email blocklists. Then earn the move to real-time GBDT with cohort features, graph clustering for farms and risk-based friction (CAPTCHA, phone verification), and only if it beats the baseline on Detection recall at fixed friction rate and Cohort-level precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Email pattern similarity in window | Edit-distance clusters of emails in 1 hour. Scripted creation. Guard against: window before signup. |
| Add Device and IP signup velocity | Signups per fingerprint per day. Farm. Guard against: fingerprint salt. |
| Add Phone number reputation | VoIP and carrier risk. SMS farms. Guard against: vendor data. |
| Run it as one pipeline | Signup API (gateway), Cohort aggregator (Flink), Risk model (GBDT), Graph cluster lookup (graph store), Friction policy (challenge) and Downstream abuse labels (feedback), with Trust and safety review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle marketing campaign causes real signup spikes | Campaign calendar integration and acquisition-source baselines. |

**Deliberately not doing**

- Username length: weak.
- Signup hour: weak.

**How the approach is proven**

Prove it offline on Detection recall at fixed friction rate and Cohort-level precision using time-ordered splits, then online on "Fake account share after 30 days" with "Signup conversion" as the guardrail. Watch for: Labels from accounts later banned (late and biased) and Features computed after account activity.

## Baseline and production design

- **Baseline (build this first):** Rate limits and disposable-email blocklists.
- **Production design:** Real-time GBDT with cohort features, graph clustering for farms and risk-based friction (CAPTCHA, phone verification).

## Why AI, and why this kind

**Why AI.** Stop automated and farmed account registrations at signup, protecting downstream trust, promos and abuse systems. The evidence that separates good from bad outcomes (Email pattern similarity in window, Device and IP signup velocity, Phone number reputation) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "individual signup scoring" are what teams reach for first, and they fail because farmed accounts each look plausible alone. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Real-time GBDT with cohort features, graph clustering for farms and risk-based friction (CAPTCHA, phone verification).

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Email pattern similarity in window, Device and IP signup velocity, Phone number reputation and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rate limits and disposable-email blocklists | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Real-time GBDT with cohort features, graph clustering for farms and risk-based friction (CAPTCHA, phone verification) | chosen | Meets the 80 ms envelope at $0.041 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fake account share after 30 days) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels from accounts later banned (late and biased).
- Evaluation trap: Features computed after account activity.
- Marketing campaign causes real signup spikes: cohort features flag genuine users.
- Attackers use real phones in farms: phone checks pass.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
