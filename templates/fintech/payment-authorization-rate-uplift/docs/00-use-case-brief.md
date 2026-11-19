# Payment Authorization Rate Uplift (Issuer-Side Retry & Tokenisation): use-case brief

> Generated from the blueprint `fintech/payment-authorization-rate-uplift` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Payment Authorization Rate Uplift (Issuer-Side Retry & Tokenisation) · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recover soft-declined payments by predicting when a retry, network token or 3DS step-up will succeed, lifting authorisation rates by 1-3 points. The system has to run in under 100 milliseconds, inside these limits: Retry limits set by card schemes, Never retry hard declines and Customer friction budget.

**Why it is hard.** The obvious approach is treating all declines the same, and it fails because retrying a lost-card decline damages issuer trust. The second trap is in "Timing": the real signal is optimal retry delay depends on reason (insufficient funds vs network), while teams usually reach for immediate blind retries.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 625 at peak, at an estimated $3.7K a month. A mistake is expensive in the way issuer decline-rate trend measures it.

**What success looks like.** Offline: Retry-success AUC and Incremental auths in logged randomised holdout. Online: Recovered revenue and Issuer decline-rate trend. The launch is judged on "Recovered revenue" while "Issuer decline-rate trend" must not get worse.

## Objective, loss and constraints

**Business objective.** Recover soft-declined payments by predicting when a retry, network token or 3DS step-up will succeed, lifting authorisation rates by 1-3 points.

**Training objective.** `\mathcal{L}=\sum_i w_i\,\mathrm{BCE}(y_i,\hat p_i)\quad w_i\propto \text{order value}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_i | A weight that scales how much a particular example, class or term counts in the loss. (one value per example i) |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \hat{p}_i | The model's predicted probability that the payment is authorised. |
| \text{order value} | The value of the order; the weight w_i grows with it, so errors on large orders cost more. |

**Hard constraints**

- Retry limits set by card schemes
- Never retry hard declines
- Customer friction budget
- 80 ms decision

## The approach in one paragraph

Start with fixed retry schedule per decline code. Then earn the move to gBDT predicting retry success per (delay, route) and choosing the best action under a friction budget, with network-token upgrade as an action, and only if it beats the baseline on Retry-success AUC and Incremental auths in logged randomised holdout after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Decline code family | Normalised scheme response code group. Determines retriability. Guard against: map codes per scheme and version. |
| Add Time to payday proximity | Days since typical salary credit for the segment. Funds-availability proxy. Guard against: compute from past cycles not future credits. |
| Add Prior retry outcomes | Success rate of previous retries for this BIN and code. Issuer-specific behaviour. Guard against: exclude the current retry chain. |
| Run it as one pipeline | Decline intake (payment gateway), Decline normaliser (scheme code map), Retry-success model (LightGBM), Action selector (friction budget policy), Retry scheduler (delayed queue), Outcome logging (Kafka) and Experiment holdout (randomised control). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle scheme rule change | Rules-as-config with automated compliance tests. |

**Deliberately not doing**

- Customer email domain: no relation to authorisation outcome.
- Cart item names: high-dimensional, adds little over value and category.

**How the approach is proven**

Prove it offline on Retry-success AUC and Incremental auths in logged randomised holdout using time-ordered splits, then online on "Recovered revenue" with "Issuer decline-rate trend" as the guardrail. Watch for: Observational retry data confounded by who was retried and No holdout so lift is not separable from natural recovery.

## Baseline and production design

- **Baseline (build this first):** Fixed retry schedule per decline code.
- **Production design:** GBDT predicting retry success per (delay, route) and choosing the best action under a friction budget, with network-token upgrade as an action.

## Why AI, and why this kind

**Why AI.** Recover soft-declined payments by predicting when a retry, network token or 3DS step-up will succeed, lifting authorisation rates by 1-3 points. The evidence that separates good from bad outcomes (Decline code family, Time to payday proximity, Prior retry outcomes) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "treating all declines the same" are what teams reach for first, and they fail because retrying a lost-card decline damages issuer trust. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: GBDT predicting retry success per (delay, route) and choosing the best action under a friction budget, with network-token upgrade as an action.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Decline code family, Time to payday proximity, Prior retry outcomes and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed retry schedule per decline code | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| GBDT predicting retry success per (delay, route) and choosing the best action under a friction budget, with network-token upgrade as an action | chosen | Meets the 80 ms envelope at $0.014 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Recovered revenue) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Observational retry data confounded by who was retried.
- Evaluation trap: No holdout so lift is not separable from natural recovery.
- Scheme rule change: retry now violates network limits.
- Seasonal salary peaks: success window shifts.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
