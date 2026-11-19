# Expansion & Upsell Propensity: use-case brief

> Generated from the blueprint `saas/expansion-and-upsell-propensity` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Expansion & Upsell Propensity · **Domain:** saas · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify accounts ready to expand seats or tiers, and the right product to propose, to prioritise sales effort. The system has to run as a scheduled batch job, inside these limits: Sales capacity, Fairness in territory allocation and Explainable signals.

**Why it is hard.** The obvious approach is static firmographics, and it fails because intent shows in usage walls. The second trap is in "Value": the real signal is expected incremental ARR, while teams usually reach for highest propensity.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way win rate on model-sourced opportunities measures it.

**What success looks like.** Offline: Precision at top-k accounts and Value-weighted lift. Online: Expansion ARR per rep and Win rate on model-sourced opportunities. The launch is judged on "Expansion ARR per rep" while "Win rate on model-sourced opportunities" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify accounts ready to expand seats or tiers, and the right product to propose, to prioritise sales effort.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{ARR potential})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| w | A weight that scales how much a particular example, class or term counts in the loss. |
| \text{ARR potential} | The annual recurring revenue an expansion could add; w grows with it. |

**Hard constraints**

- Sales capacity
- Fairness in territory allocation
- Explainable signals
- Quarterly planning

## The approach in one paragraph

Start with rules for accounts above 90% seat utilisation. Then earn the move to gBDT predicting expansion within 90 days and expected ARR, ranked by value with product-recommendation head, and only if it beats the baseline on Precision at top-k accounts and Value-weighted lift after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Seat utilisation near cap | Active seats over licensed. Need for more. Guard against: billing. |
| Add Gated-feature hits | Attempts to use paid features. Intent. Guard against: paywall events. |
| Add New-team adoption | New departments active. Spread. Guard against: org graph. |
| Run it as one pipeline | Usage and billing events (warehouse), Feature builder (dbt), Expansion model (GBDT), ARR estimator (regression), Priority ranker (expected value), Sales worklist (CRM) and Closed-won outcomes (labels). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle free pilots look like expansion | Contract-state features and pilot flags. |

**Deliberately not doing**

- Marketing email opens: weak.
- Account age: confounded.

**How the approach is proven**

Prove it offline on Precision at top-k accounts and Value-weighted lift using time-ordered splits, then online on "Expansion ARR per rep" with "Win rate on model-sourced opportunities" as the guardrail. Watch for: Using signals recorded after sales engagement and Ignoring capacity limits.

## Baseline and production design

- **Baseline (build this first):** Rules for accounts above 90% seat utilisation.
- **Production design:** GBDT predicting expansion within 90 days and expected ARR, ranked by value with product-recommendation head.

## Why AI, and why this kind

**Why AI.** Identify accounts ready to expand seats or tiers, and the right product to propose, to prioritise sales effort. The evidence that separates good from bad outcomes (Seat utilisation near cap, Gated-feature hits, New-team adoption) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "static firmographics" are what teams reach for first, and they fail because intent shows in usage walls. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: GBDT predicting expansion within 90 days and expected ARR, ranked by value with product-recommendation head.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Seat utilisation near cap, Gated-feature hits, New-team adoption and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rules for accounts above 90% seat utilisation | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| GBDT predicting expansion within 90 days and expected ARR, ranked by value with product-recommendation head | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Expansion ARR per rep) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using signals recorded after sales engagement.
- Evaluation trap: Ignoring capacity limits.
- Free pilots look like expansion: wasted sales calls.
- Procurement freeze at the customer: strong signals but no budget.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
