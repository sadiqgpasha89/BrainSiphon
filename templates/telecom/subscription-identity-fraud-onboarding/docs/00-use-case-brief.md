# Subscription & Identity Fraud at Onboarding: use-case brief

> Generated from the blueprint `telecom/subscription-identity-fraud-onboarding` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Subscription & Identity Fraud at Onboarding · **Domain:** telecom · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score new subscription and device-financing applications for identity and bust-out fraud so fraudsters are stopped at the door and genuine customers onboard quickly. The system has to run in under 100 milliseconds, inside these limits: Decision within 80 ms, Document and identity checks follow the local KYC rules and Decline reasons available for appeals.

**Why it is hard.** The obvious approach is early cancellations, and it fails because many early cancellations are genuine. The second trap is in "Linkage": the real signal is shared devices, addresses and numbers across applications, while teams usually reach for single application view.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $3.6K a month. A mistake is expensive in the way genuine approval rate measures it.

**What success looks like.** Offline: Recall at fixed approval rate, Calibration by segment and Disparity checks across groups. Online: Fraud loss at onboarding, Genuine approval rate and Review queue volume. The launch is judged on "Fraud loss at onboarding" while "Genuine approval rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Score new subscription and device-financing applications for identity and bust-out fraud so fraudsters are stopped at the door and genuine customers onboard quickly.

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

- Decision within 80 ms
- Document and identity checks follow the local KYC rules
- Decline reasons available for appeals
- No protected attributes
- 400K applications per day

## The approach in one paragraph

Start with rules on identity mismatches and blacklists, because they catch obvious fraud and are explainable. Then earn the move to gradient boosting on application and linkage graph features, scored from an online feature store with a calibrated probability and reason codes, plus a manual review queue, and only if it beats the baseline on Recall at fixed approval rate and Calibration by segment after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Identity attribute reuse | Number of applications sharing the phone, address or device. Ring signal. Guard against: use hashed identifiers. |
| Add Device and channel risk | Device reputation and emulator indicators. Automation signal. Guard against: per channel. |
| Add Credit bureau inconsistency | Mismatch between declared and bureau data. Synthetic identity sign. Guard against: use official data. |
| Run it as one pipeline | Application intake (digital and retail channels), Identity and bureau checks (vendor APIs), Linkage features (graph store), Risk model (gradient boosting), Decision and reasons (policy engine) and Outcome labels (monthly join), with Manual review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle thin-file genuine customer | Offer alternatives such as a deposit or a lower tier. |

**Deliberately not doing**

- Applicant name: irrelevant and private.
- Email domain alone: weak link.
- Application time alone: weak link.

**How the approach is proven**

Prove it offline on Recall at fixed approval rate, Calibration by segment and Disparity checks across groups using time-ordered splits, then online on "Fraud loss at onboarding" with "Genuine approval rate" as the guardrail. Watch for: Evaluating on early cancellations, Ignoring linkage and Fixed thresholds across all segments.

## Baseline and production design

- **Baseline (build this first):** Rules on identity mismatches and blacklists, because they catch obvious fraud and are explainable.
- **Production design:** Gradient boosting on application and linkage graph features, scored from an online feature store with a calibrated probability and reason codes, plus a manual review queue.

## Why AI, and why this kind

**Why AI.** Score new subscription and device-financing applications for identity and bust-out fraud so fraudsters are stopped at the door and genuine customers onboard quickly. The evidence that separates good from bad outcomes (Identity attribute reuse, Device and channel risk, Credit bureau inconsistency) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "early cancellations" are what teams reach for first, and they fail because many early cancellations are genuine. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Gradient boosting on application and linkage graph features, scored from an online feature store with a calibrated probability and reason codes, plus a manual review queue.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Identity attribute reuse, Device and channel risk, Credit bureau inconsistency and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rules on identity mismatches and blacklists, because they catch obvious fraud and are explainable | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on application and linkage graph features, scored from an online feature store with a calibrated probability and reason codes, plus a manual review queue | chosen | Meets the 80 ms envelope at $0.798 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fraud loss at onboarding) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on early cancellations.
- Evaluation trap: Ignoring linkage.
- Thin-file genuine customer: very few signals are available.
- Ring adapts: fresh identities.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
