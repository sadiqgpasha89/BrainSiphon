# Real-Time Bidding Bid Optimisation: use-case brief

> Generated from the blueprint `adtech/real-time-bidding-bid-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Real-Time Bidding Bid Optimisation · **Domain:** adtech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Compute the bid for every impression opportunity that maximises campaign value under budget and KPI constraints within the auction deadline. The system has to run in under 10 milliseconds, inside these limits: Response under 8 ms of a 100 ms exchange timeout, 1M bid requests per second peak and Calibrated probabilities.

**Why it is hard.** The obvious approach is ranking-only models, and it fails because bid = value times probability so miscalibration directly loses money. The second trap is in "Landscape": the real signal is model the win-price distribution per segment, while teams usually reach for fixed bid multipliers.

**Scale and stakes.** At 10 million users this is about 120.0M model-touching events a day, 1.4K requests per second on average and 11.1K at peak, at an estimated $5.4K a month. A mistake is expensive in the way return on ad spend measures it.

**What success looks like.** Offline: Log-loss and calibration error and Offline simulated value under budget. Online: Cost per acquisition and Return on ad spend. The launch is judged on "Cost per acquisition" while "Return on ad spend" must not get worse.

## Objective, loss and constraints

**Business objective.** Compute the bid for every impression opportunity that maximises campaign value under budget and KPI constraints within the auction deadline.

**Training objective.** `\max_b\;\mathbb{E}\!\left[(v\cdot p_{\text{conv}}-\text{price})\cdot \mathbb{1}[\text{win}(b)]\right]\ \text{s.t. spend}\le B`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_b | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| v | The value to the advertiser of a conversion. |
| p_{\text{conv}} | The predicted probability that the impression leads to a conversion. |
| \text{price} | The price paid if the auction is won. |
| \mathbb{1} | Indicator: equals 1 when the condition in the brackets is true and 0 otherwise. |
| \text{win} | Whether the bid wins the auction; win(b) is 1 if bid b wins and 0 if it loses. |
| b | The bid: the amount offered for this impression, the thing being optimised. |
| B | The budget: total spend must stay at or below this limit. |

**Hard constraints**

- Response under 8 ms of a 100 ms exchange timeout
- 1M bid requests per second peak
- Calibrated probabilities
- Budget never exceeded
- Campaign budgets paced by a primal-dual or PID controller updated every few seconds
- First-price auctions with bid shading
- In-flight spend reserved across the 50 to 500 ms win-notice delay

## The approach in one paragraph

Start with linear bidding: bid = base value times pCTR times a pacing factor. Then earn the move to calibrated GBDT or DCN pCVR, a learned win-price model and a Lagrangian bid optimiser with a feedback pacing controller. Bids are shaded from a censored clearing-price model and scaled by a campaign multiplier that the pacer updates every few seconds, with in-flight spend reserved until the win notice arrives, and only if it beats the baseline on Log-loss and calibration error and Offline simulated value under budget after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Calibrated pCVR | Predicted conversion probability after isotonic calibration. Value estimate. Guard against: calibrate on delayed-feedback-corrected labels. |
| Add Win-rate curve | Win probability as a function of bid for the segment. Bid landscape. Guard against: censored data below the observed bids. |
| Add Pacing multiplier | Budget remaining relative to the ideal pacing curve. Spend control. Guard against: real-time state. |
| Run it as one pipeline | Bid request listener (Envoy gRPC), Feature assembly (in-process cache), pCTR pCVR model (ONNX CPU), Bid optimiser (Lagrangian formula), Pacing controller (budget service), Bid responder (OpenRTB) and Win and loss logs (Kafka). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle exchange changes auction type from second to first price | Detect clearing-price shift and retrain win-price model with bid shading. |

**Deliberately not doing**

- Raw user-agent string: high cardinality, sparse and unstable.
- Bid request ID: random identifier.

**How the approach is proven**

Prove it offline on Log-loss and calibration error and Offline simulated value under budget using time-ordered splits, then online on "Cost per acquisition" with "Return on ad spend" as the guardrail. Watch for: Training only on won impressions ignores the censored losing bids and Offline replay cannot reproduce the market response to new bids.

## Baseline and production design

- **Baseline (build this first):** Linear bidding: bid = base value times pCTR times a pacing factor.
- **Production design:** Calibrated GBDT or DCN pCVR, a learned win-price model and a Lagrangian bid optimiser with a feedback pacing controller. Bids are shaded from a censored clearing-price model and scaled by a campaign multiplier that the pacer updates every few seconds, with in-flight spend reserved until the win notice arrives.

## Why AI, and why this kind

**Why AI.** Compute the bid for every impression opportunity that maximises campaign value under budget and KPI constraints within the auction deadline. The evidence that separates good from bad outcomes (Calibrated pCVR, Win-rate curve, Pacing multiplier) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "ranking-only models" are what teams reach for first, and they fail because bid = value times probability so miscalibration directly loses money. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Calibrated GBDT or DCN pCVR, a learned win-price model and a Lagrangian bid optimiser with a feedback pacing controller. Bids are shaded from a censored clearing-price model and scaled by a campaign multiplier that the pacer updates every few seconds, with in-flight spend reserved until the win notice arrives.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Calibrated pCVR, Win-rate curve, Pacing multiplier and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Linear bidding: bid = base value times pCTR times a pacing factor | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Calibrated GBDT or DCN pCVR, a learned win-price model and a Lagrangian bid optimiser with a feedback pacing controller. Bids are shaded from a censored clearing-price model and scaled by a campaign multiplier that the pacer updates every few seconds, with in-flight spend reserved until the win notice arrives | chosen | Meets the 8 ms envelope at $0.0015 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cost per acquisition) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training only on won impressions ignores the censored losing bids.
- Evaluation trap: Offline replay cannot reproduce the market response to new bids.
- Exchange changes auction type from second to first price: bids systematically overpay for weeks.
- Delayed conversions arrive days after the impression: recent traffic looks worse than it is.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
