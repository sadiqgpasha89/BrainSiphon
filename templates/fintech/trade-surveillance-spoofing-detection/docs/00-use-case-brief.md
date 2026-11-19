# Trade Surveillance: Spoofing & Layering Detection: use-case brief

> Generated from the blueprint `fintech/trade-surveillance-spoofing-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Trade Surveillance: Spoofing & Layering Detection · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect order-book manipulation patterns (spoofing, layering, wash trades) in near real time for regulators and venues. The system has to run in under 100 milliseconds, inside these limits: Sub-100ms detection of live patterns, Evidence preserved at message level and Low false positives against legitimate market makers.

**Why it is hard.** The obvious approach is order cancel ratio alone, and it fails because market makers have high cancel ratios legitimately. The second trap is in "Intent": the real signal is order-to-trade ratio conditioned on same-side execution, while teams usually reach for raw message counts.

**Scale and stakes.** At 10 million users this is about 90.0M model-touching events a day, 1.0K requests per second on average and 6.3K at peak, at an estimated $5.9K a month. A mistake is expensive in the way analyst review time measures it.

**What success looks like.** Offline: Recall on historical enforcement cases and False-positive rate per million messages. Online: Cases opened per month and Analyst review time. The launch is judged on "Cases opened per month" while "Analyst review time" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect order-book manipulation patterns (spoofing, layering, wash trades) in near real time for regulators and venues.

**Training objective.** `\mathcal{L}=\mathrm{FL}(p,y)+\lambda\,\mathrm{TemporalSmoothness}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{TemporalSmoothness} | Penalty when scores for neighbouring moments in the order-book sequence jump around. |

**Hard constraints**

- Sub-100ms detection of live patterns
- Evidence preserved at message level
- Low false positives against legitimate market makers
- Venue audit

## The approach in one paragraph

Start with rule thresholds on cancel ratios and order lifetimes. Then earn the move to sequence model (temporal convolution) over order-book events plus GBDT on behavioural features, with rule-based hard evidence extraction, and only if it beats the baseline on Recall on historical enforcement cases and False-positive rate per million messages after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Opposite-side execution after cancel | Execution on side B within 500 ms of cancelling side A. Spoof signature. Guard against: use exchange sequence numbers. |
| Add Large-order fleeting time | Lifetime of large resting orders. Layering signal. Guard against: normalise by instrument liquidity. |
| Add Price impact of cancelled orders | Quote move caused by the resting order. Manipulative effect. Guard against: counterfactual using same-time books. |
| Run it as one pipeline | Order-book event feed (exchange multicast), Sequence builder (per-trader state), Pattern detector (TCN), Evidence extractor (message-level replay), Alert router (compliance) and Regulatory referral (case management), with Compliance review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle venue sends corrected sequence numbers | Sequence repair and reorder buffer. |

**Deliberately not doing**

- Trading volume per day: trader size, not behaviour.
- Account tenure: not an intent signal.

**How the approach is proven**

Prove it offline on Recall on historical enforcement cases and False-positive rate per million messages using time-ordered splits, then online on "Cases opened per month" with "Analyst review time" as the guardrail. Watch for: Few labelled cases drawn from enforcement bias and Test period overlaps market-structure changes.

## Baseline and production design

- **Baseline (build this first):** Rule thresholds on cancel ratios and order lifetimes.
- **Production design:** Sequence model (temporal convolution) over order-book events plus GBDT on behavioural features, with rule-based hard evidence extraction.

## Why AI, and why this kind

**Why AI.** Detect order-book manipulation patterns (spoofing, layering, wash trades) in near real time for regulators and venues. The evidence that separates good from bad outcomes (Opposite-side execution after cancel, Large-order fleeting time, Price impact of cancelled orders) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "order cancel ratio alone" are what teams reach for first, and they fail because market makers have high cancel ratios legitimately. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Sequence model (temporal convolution) over order-book events plus GBDT on behavioural features, with rule-based hard evidence extraction.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Opposite-side execution after cancel, Large-order fleeting time, Price impact of cancelled orders and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule thresholds on cancel ratios and order lifetimes | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Sequence model (temporal convolution) over order-book events plus GBDT on behavioural features, with rule-based hard evidence extraction | chosen | Meets the 80 ms envelope at $0.0022 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cases opened per month) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Few labelled cases drawn from enforcement bias.
- Evaluation trap: Test period overlaps market-structure changes.
- Venue sends corrected sequence numbers: patterns misaligned.
- Legitimate liquidity provider flagged: false positive storm.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
