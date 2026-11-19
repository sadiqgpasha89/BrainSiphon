# Pre-Purchase Return Risk & Prevention: use-case brief

> Generated from the blueprint `retail/pre-purchase-return-risk` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pre-Purchase Return Risk & Prevention · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict the likelihood a specific order line will be returned and use gentle interventions (fit info, alternate size) to prevent avoidable returns. The system has to run in under 100 milliseconds, inside these limits: Do not discourage genuine purchases, Transparent nudges and 50 ms.

**Why it is hard.** The obvious approach is return propensity, and it fails because some returns are unavoidable and some customers keep anyway. The second trap is in "Reason": the real signal is predict returns by reason code (fit, quality, expectation), while teams usually reach for binary return flag.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $12.4K a month. A mistake is expensive in the way avoidable-return rate measures it.

**What success looks like.** Offline: Reason-level AUC and Uplift on return rate. Online: Net revenue after returns and Avoidable-return rate. The launch is judged on "Net revenue after returns" while "Avoidable-return rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict the likelihood a specific order line will be returned and use gentle interventions (fit info, alternate size) to prevent avoidable returns.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{return cost})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| w | A weight that scales how much a particular example, class or term counts in the loss. |
| \text{return cost} | The cost of a return including shipping and handling; w grows with it. |

**Hard constraints**

- Do not discourage genuine purchases
- Transparent nudges
- 50 ms
- Fairness

## The approach in one paragraph

Start with show item-level return-rate badges. Then earn the move to multi-reason GBDT for return risk plus uplift-based nudge selection and size recommendation hook, and only if it beats the baseline on Reason-level AUC and Uplift on return rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Bracketing behaviour | Multiple sizes of same item in cart. Intentional return. Guard against: cart state at time. |
| Add Item return-rate by size | Historic return rate for that item size. Fit risk. Guard against: matured outcomes. |
| Add Reviews mention fit | Share of reviews flagging fit issues. Product expectation. Guard against: review snapshot. |
| Run it as one pipeline | Cart event (web and app), Risk feature fetch (feature store), Return-reason model (multi-class GBDT), Uplift nudge selector (T-learner), Nudge UI (product page), Size recommender (fit service) and Return outcomes (ledger). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle intended bracketing for try-at-home | Cohort rules for try-at-home segment. |

**Deliberately not doing**

- Cart creation hour: none.
- Browser: none.

**How the approach is proven**

Prove it offline on Reason-level AUC and Uplift on return rate using time-ordered splits, then online on "Net revenue after returns" with "Avoidable-return rate" as the guardrail. Watch for: Training on observational nudges and Ignoring conversion cost of nudges.

## Baseline and production design

- **Baseline (build this first):** Show item-level return-rate badges.
- **Production design:** Multi-reason GBDT for return risk plus uplift-based nudge selection and size recommendation hook.

## Why AI, and why this kind

**Why AI.** Predict the likelihood a specific order line will be returned and use gentle interventions (fit info, alternate size) to prevent avoidable returns. The evidence that separates good from bad outcomes (Bracketing behaviour, Item return-rate by size, Reviews mention fit) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "return propensity" are what teams reach for first, and they fail because some returns are unavoidable and some customers keep anyway. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Multi-reason GBDT for return risk plus uplift-based nudge selection and size recommendation hook.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Bracketing behaviour, Item return-rate by size, Reviews mention fit and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Show item-level return-rate badges | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multi-reason GBDT for return risk plus uplift-based nudge selection and size recommendation hook | chosen | Meets the 80 ms envelope at $0.069 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Net revenue after returns) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on observational nudges.
- Evaluation trap: Ignoring conversion cost of nudges.
- Intended bracketing for try-at-home: suppressed incorrectly.
- Nudges reduce sales in some categories: nudges create doubt and lower conversion in categories where returns were fine.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
