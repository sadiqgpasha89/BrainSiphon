# Promotion Uplift & Coupon Targeting: use-case brief

> Generated from the blueprint `retail/promotion-uplift-and-coupon-targeting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Promotion Uplift & Coupon Targeting · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Send coupons only to customers whose purchase probability rises because of the coupon, maximising incremental margin per promotion dollar. The system has to run as a scheduled batch job, inside these limits: Promotion budget, Fairness across loyalty tiers and Coupon abuse prevention.

**Why it is hard.** The obvious approach is purchase propensity, and it fails because high-propensity customers buy without the coupon. The second trap is in "Validation": the real signal is randomised control group in every campaign, while teams usually reach for pre/post comparison.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.6K a month. A mistake is expensive in the way redemption by control group measures it.

**What success looks like.** Offline: Qini coefficient and AUUC and Policy value via doubly-robust estimator. Online: Incremental margin per coupon dollar and Redemption by control group. The launch is judged on "Incremental margin per coupon dollar" while "Redemption by control group" must not get worse.

## Objective, loss and constraints

**Business objective.** Send coupons only to customers whose purchase probability rises because of the coupon, maximising incremental margin per promotion dollar.

**Training objective.** `\mathcal{L}=\sum_i\left(Y_i-\mu_{W_i}(X_i)\right)^2\ \text{(T-learner)};\ \text{policy}=\mathbb{1}[\hat\tau(x)>c]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| Y_i | The observed outcome for customer i. |
| \mu_{W_i} | The model of the outcome for group W (T-learner). |
| X_i | The matrix of input features for all examples. (one value per example i) |
| \text{policy} | The decision rule: give the coupon (1) only when estimated uplift exceeds its cost. |
| \mathbb{1} | Indicator: equals 1 when the condition in the brackets is true and 0 otherwise. |
| \hat{\tau} | The estimated treatment effect (uplift): how much the treatment changes the outcome for this unit or group. |
| x | The input features describing one example (what the model sees). |
| c | The cost of giving the coupon. |

**Hard constraints**

- Promotion budget
- Fairness across loyalty tiers
- Coupon abuse prevention
- Weekly campaigns

## The approach in one paragraph

Start with send to top-propensity decile. Then earn the move to doubly-robust causal forest uplift with budget-constrained assignment, 10% randomised holdout, and incrementality reporting, and only if it beats the baseline on Qini coefficient and AUUC and Policy value via doubly-robust estimator after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Price sensitivity score | Historical response to discount depth. Persuadable indicator. Guard against: randomised promos only. |
| Add Purchase recency gap | Days since last order vs typical cycle. Lapse risk. Guard against: cycle estimate from prior data. |
| Add Category exposure | Share of basket in coupon category. Relevance. Guard against: pre-campaign window. |
| Run it as one pipeline | Customer features (lakehouse), Uplift model (causal forest), Budget optimiser (knapsack), Abuse screening (rules and graph), Campaign dispatch (CRM) and Incremental measurement (holdout), with Marketing review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle coupon leak on forums | Single-use signed codes with redemption limits. |

**Deliberately not doing**

- Email open count: confounded with engagement.
- Customer city: weakly informative.

**How the approach is proven**

Prove it offline on Qini coefficient and AUUC and Policy value via doubly-robust estimator using time-ordered splits, then online on "Incremental margin per coupon dollar" with "Redemption by control group" as the guardrail. Watch for: Training on non-randomised past promotions and Measuring redemption rather than incrementality.

## Baseline and production design

- **Baseline (build this first):** Send to top-propensity decile.
- **Production design:** Doubly-robust causal forest uplift with budget-constrained assignment, 10% randomised holdout, and incrementality reporting.

## Why AI, and why this kind

**Why AI.** Send coupons only to customers whose purchase probability rises because of the coupon, maximising incremental margin per promotion dollar. The evidence that separates good from bad outcomes (Price sensitivity score, Purchase recency gap, Category exposure) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "purchase propensity" are what teams reach for first, and they fail because high-propensity customers buy without the coupon. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Doubly-robust causal forest uplift with budget-constrained assignment, 10% randomised holdout, and incrementality reporting.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Price sensitivity score, Purchase recency gap, Category exposure and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Send to top-propensity decile | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Doubly-robust causal forest uplift with budget-constrained assignment, 10% randomised holdout, and incrementality reporting | chosen | Meets the run-window envelope at $0.061 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Incremental margin per coupon dollar) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on non-randomised past promotions.
- Evaluation trap: Measuring redemption rather than incrementality.
- Coupon leak on forums: untargeted redemption.
- Holdout contamination via shared household: effect underestimated.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
