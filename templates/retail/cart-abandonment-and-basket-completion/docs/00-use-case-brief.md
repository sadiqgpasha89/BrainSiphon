# Cart Abandonment & Basket Completion: use-case brief

> Generated from the blueprint `retail/cart-abandonment-and-basket-completion` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cart Abandonment & Basket Completion · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict abandonment in-session and trigger the least intrusive intervention (shipping clarity, saved cart, add-ons) that lifts completed checkouts. The system has to run in under 100 milliseconds, inside these limits: Interventions must not discount unnecessarily, 50 ms per page and Respect cookie consent.

**Why it is hard.** The obvious approach is abandonment propensity, and it fails because discounting buyers who would have purchased burns margin. The second trap is in "Friction": the real signal is shipping cost reveal, payment errors and form friction, while teams usually reach for page-view counts.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 625 at peak, at an estimated $12.4K a month. A mistake is expensive in the way margin per recovered cart measures it.

**What success looks like.** Offline: Qini and AUUC and Intervention calibration. Online: Checkout completion rate and Margin per recovered cart. The launch is judged on "Checkout completion rate" while "Margin per recovered cart" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict abandonment in-session and trigger the least intrusive intervention (shipping clarity, saved cart, add-ons) that lifts completed checkouts.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\;\text{and uplift: }\tau(x)=\mathbb{E}[Y(1)-Y(0)\mid x]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \tau | Uplift: the causal effect of the reminder or offer on completing the purchase. |
| x | The shopper's features. |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| Y | The outcome: Y(1) with the intervention and Y(0) without. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |

**Hard constraints**

- Interventions must not discount unnecessarily
- 50 ms per page
- Respect cookie consent
- Cap messages per user

## The approach in one paragraph

Start with exit-intent popup with a fixed discount. Then earn the move to real-time propensity model with uplift-based intervention selection and a margin-aware discount budget, and only if it beats the baseline on Qini and AUUC and Intervention calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Shipping-cost shock | Shipping fee as a share of cart value at reveal. Top abandonment reason. Guard against: compute at the reveal event. |
| Add Payment error count | Declines and validation errors in-session. Friction. Guard against: count before intervention. |
| Add Return-visit pattern | Number of cart revisits in 48 hours. Intent. Guard against: session stitching consent. |
| Run it as one pipeline | Session events (web SDK), Session feature builder (Flink), Abandonment scorer (GBDT), Uplift selector (T-learner), Intervention service (UI messaging), Experiment holdout (A/B platform) and Order outcomes (Kafka). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle payment provider outage looks like abandonment | Error-rate feature and suppression during incidents. |

**Deliberately not doing**

- Number of pages viewed: confounded with browsing.
- Referrer domain: channel artefact.

**How the approach is proven**

Prove it offline on Qini and AUUC and Intervention calibration using time-ordered splits, then online on "Checkout completion rate" with "Margin per recovered cart" as the guardrail. Watch for: Non-random past interventions and Counting recovered carts that would have converted anyway.

## Baseline and production design

- **Baseline (build this first):** Exit-intent popup with a fixed discount.
- **Production design:** Real-time propensity model with uplift-based intervention selection and a margin-aware discount budget.

## Why AI, and why this kind

**Why AI.** Predict abandonment in-session and trigger the least intrusive intervention (shipping clarity, saved cart, add-ons) that lifts completed checkouts. The evidence that separates good from bad outcomes (Shipping-cost shock, Payment error count, Return-visit pattern) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "abandonment propensity" are what teams reach for first, and they fail because discounting buyers who would have purchased burns margin. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Real-time propensity model with uplift-based intervention selection and a margin-aware discount budget.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Shipping-cost shock, Payment error count, Return-visit pattern and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Exit-intent popup with a fixed discount | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Real-time propensity model with uplift-based intervention selection and a margin-aware discount budget | chosen | Meets the 80 ms envelope at $0.046 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Checkout completion rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Non-random past interventions.
- Evaluation trap: Counting recovered carts that would have converted anyway.
- Payment provider outage looks like abandonment: spurious interventions.
- Discount arbitrage by repeat abandoners: users learn to abandon carts deliberately to trigger discounts, leaking margin.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
