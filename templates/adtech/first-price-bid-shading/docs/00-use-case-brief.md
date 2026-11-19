# First-Price Auction Bid Shading: use-case brief

> Generated from the blueprint `adtech/first-price-bid-shading` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** First-Price Auction Bid Shading · **Domain:** adtech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Shade bids below private value in first-price auctions to retain surplus while preserving win rate. The system has to run in under 10 milliseconds, inside these limits: Per-request latency under 1 ms, Win-price feedback only on wins (or sometimes losses) and Per-exchange differences.

**Why it is hard.** The obvious approach is regress on winning prices only, and it fails because winners-only data biases the landscape low. The second trap is in "Segmentation": the real signal is segment-specific shading functions, while teams usually reach for one global shading factor.

**Scale and stakes.** At 10 million users this is about 120.0M model-touching events a day, 1.4K requests per second on average and 11.1K at peak, at an estimated $5.4K a month. A mistake is expensive in the way surplus uplift measures it.

**What success looks like.** Offline: Surplus per impression in replay and Win-price likelihood. Online: Cost per won impression at equal win rate and Surplus uplift. The launch is judged on "Cost per won impression at equal win rate" while "Surplus uplift" must not get worse.

## Objective, loss and constraints

**Business objective.** Shade bids below private value in first-price auctions to retain surplus while preserving win rate.

**Training objective.** `\max_b\;(v-b)\cdot\Pr(\text{win}\mid b,x)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_b | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| v | The value of winning the impression to the advertiser. |
| b | The bid actually submitted, shaded below value v to avoid overpaying in a first-price auction. |
| \Pr | Probability of the event written inside the brackets. |
| \text{win} | The event that the bid wins the auction; its probability given bid b and context x is what the model learns. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| x | The input features describing one example (what the model sees). |

**Hard constraints**

- Per-request latency under 1 ms
- Win-price feedback only on wins (or sometimes losses)
- Per-exchange differences
- Stability

## The approach in one paragraph

Start with bid a fixed fraction (0.8) of value. Then earn the move to censored distribution model of clearing price (e.g. mixture density network) with optimisation of expected surplus per request, and only if it beats the baseline on Surplus per impression in replay and Win-price likelihood after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Predicted clearing price | Distribution quantiles of the market price. Shading. Guard against: exchange feedback. |
| Add Value estimate | Expected impression value. Upper bound. Guard against: calibrated. |
| Add Competition intensity | Recent win rate at multipliers. Aggressiveness. Guard against: windowed. |
| Run it as one pipeline | Bid request (exchange), Value model (pCVR times value), Clearing-price model (MDN), Shade optimiser (analytic solve), Floor and cap rules (constraints) and Bid response (OpenRTB), with Outcome feedback off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle exchange hides losing bid information | Exploration bids and sampling of losses where available. |

**Deliberately not doing**

- Bid request ID: none.
- Page URL query strings: high-cardinality.

**How the approach is proven**

Prove it offline on Surplus per impression in replay and Win-price likelihood using time-ordered splits, then online on "Cost per won impression at equal win rate" with "Surplus uplift" as the guardrail. Watch for: Training on win prices only and Replay assumes competitors do not react.

## Baseline and production design

- **Baseline (build this first):** Bid a fixed fraction (0.8) of value.
- **Production design:** Censored distribution model of clearing price (e.g. mixture density network) with optimisation of expected surplus per request.

## Why AI, and why this kind

**Why AI.** Shade bids below private value in first-price auctions to retain surplus while preserving win rate. The evidence that separates good from bad outcomes (Predicted clearing price, Value estimate, Competition intensity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "regress on winning prices only" are what teams reach for first, and they fail because winners-only data biases the landscape low. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Censored distribution model of clearing price (e.g. mixture density network) with optimisation of expected surplus per request.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Predicted clearing price, Value estimate, Competition intensity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Bid a fixed fraction (0.8) of value | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Censored distribution model of clearing price (e.g. mixture density network) with optimisation of expected surplus per request | chosen | Meets the 8 ms envelope at $0.0015 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cost per won impression at equal win rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on win prices only.
- Evaluation trap: Replay assumes competitors do not react.
- Exchange hides losing bid information: model cannot learn the upper tail.
- Competitors adapt to shading: clearing prices drift quickly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
