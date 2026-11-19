# Free-Trial & Promo Abuse Detection: use-case brief

> Generated from the blueprint `saas/free-trial-abuse-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Free-Trial & Promo Abuse Detection · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect repeat trials, referral fraud and credit farming at signup to protect revenue without blocking genuine users. The system has to run in under 100 milliseconds, inside these limits: Decision at signup within 50 ms, Low friction and Privacy.

**Why it is hard.** The obvious approach is per-account checks, and it fails because abusers create many accounts. The second trap is in "Economics": the real signal is cost-aware friction by trial value, while teams usually reach for block all suspicious.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $3.6K a month. A mistake is expensive in the way conversion rate of genuine trials measures it.

**What success looks like.** Offline: Precision at fixed block rate and Trial-abuse detection recall. Online: Trial abuse rate and Conversion rate of genuine trials. The launch is judged on "Trial abuse rate" while "Conversion rate of genuine trials" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect repeat trials, referral fraud and credit farming at signup to protect revenue without blocking genuine users.

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

- Decision at signup within 50 ms
- Low friction
- Privacy
- Appeals

## The approach in one paragraph

Start with block disposable emails and duplicate cards. Then earn the move to real-time GBDT with identity graph features and cost-aware friction (verification, card-required trial), and only if it beats the baseline on Precision at fixed block rate and Trial-abuse detection recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Device and payment linkage count | Accounts sharing device or card. Repeat trials. Guard against: hashing. |
| Add Disposable email indicator | Domain reputation. Fake accounts. Guard against: lists. |
| Add Referral graph anomalies | Reciprocal and cyclical referrals. Referral fraud. Guard against: graph. |
| Run it as one pipeline | Signup request (API), Identity graph lookup (graph store), Abuse model (GBDT), Friction policy (verification step), Account decisions (billing) and Abuse labels (outcomes), with Fraud review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle families or teams share a device | Business email and workspace signals. |

**Deliberately not doing**

- Signup hour: weak.
- Browser language: weak.

**How the approach is proven**

Prove it offline on Precision at fixed block rate and Trial-abuse detection recall using time-ordered splits, then online on "Trial abuse rate" with "Conversion rate of genuine trials" as the guardrail. Watch for: Labels only from caught abuse and Ignoring conversion cost.

## Baseline and production design

- **Baseline (build this first):** Block disposable emails and duplicate cards.
- **Production design:** Real-time GBDT with identity graph features and cost-aware friction (verification, card-required trial).

## Why AI, and why this kind

**Why AI.** Detect repeat trials, referral fraud and credit farming at signup to protect revenue without blocking genuine users. The evidence that separates good from bad outcomes (Device and payment linkage count, Disposable email indicator, Referral graph anomalies) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "per-account checks" are what teams reach for first, and they fail because abusers create many accounts. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Real-time GBDT with identity graph features and cost-aware friction (verification, card-required trial).

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Device and payment linkage count, Disposable email indicator, Referral graph anomalies and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Block disposable emails and duplicate cards | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Real-time GBDT with identity graph features and cost-aware friction (verification, card-required trial) | chosen | Meets the 80 ms envelope at $0.133 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Trial abuse rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels only from caught abuse.
- Evaluation trap: Ignoring conversion cost.
- Families or teams share a device: false repeat-trial flags.
- Abusers rotate virtual cards: payment linkage weakens.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
