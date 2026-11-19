# Real-Time Card & UPI Fraud Detection: use-case brief

> Generated from the blueprint `fintech/real-time-card-upi-fraud-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Real-Time Card & UPI Fraud Detection · **Domain:** fintech · **Latency tier:** sub-10ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Every card and UPI authorisation passes through a decision point where the issuer has about 8 milliseconds to say approve, step up or decline. Behind that decision sit three groups with opposed incentives: fraud losses that the issuer eats, genuine customers who abandon a card the second it is declined at a petrol pump, and an analyst team that can only review a few hundred cases an hour. The model does not decide alone. It produces a calibrated risk that a policy engine turns into one of those three actions, and every decline must carry a reason code a call-centre agent can read out.

**Why it is hard.** Fraud is roughly one in a thousand authorisations, so accuracy and ROC-AUC look excellent for a model that is useless at the operating point. The labels arrive late and biased: a chargeback is filed 30 to 90 days after the transaction, so last week's data looks clean, and only the cases the previous model flagged were ever reviewed. The attackers adapt to whatever you deploy within days, rotating devices and slowing their spend to stay under velocity rules. And the 8 ms budget forbids anything that needs a network round trip that was not planned for, which rules out the most informative feature, the device-and-card graph, unless its embedding is precomputed and cached.

**Scale and stakes.** With 10 million registered and 3 million daily active users, the system scores about 24 million authorisations a day, 277 per second on average and 2,200 per second at peak, and is provisioned for 3,300. The estimated run cost is about $4.2K a month, or $0.006 per thousand decisions, which is small next to the stakes: each extra basis point of fraud on a card book of this size is real money, and each extra 0.1 percentage point of false declines drives genuine customers to a competitor's card and costs more than the fraud it prevented.

**What success looks like.** The agreed operating point is fraud held to a target number of basis points of volume while false declines on genuine transactions stay under 0.3 percent. Offline that means a PR-AUC at 0.5 percent false-positive rate and recall at the analysts' fixed review capacity, never ROC-AUC. The launch is judged on fraud basis points per volume, with the false-decline rate on good customers as the guardrail that must not move. p99 latency stays under 8 ms and availability at 99.99 percent, because a slow fraud service is an outage for the whole payment rail.

## Objective, loss and constraints

**Business objective.** Block fraudulent authorisations inside the payment auth path while keeping false declines under 0.3% of genuine volume.

**Training objective.** `\mathcal{L}=\sum_i w_i\,\mathrm{FL}(p_i)+\lambda\,\mathrm{ECE}(p)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_i | A weight that scales how much a particular example, class or term counts in the loss. (one value per example i) |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| p_i | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per example i) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- p99 under 8 ms inside the auth path
- PCI-DSS scope minimisation
- every decline needs a reason code
- 99.99% availability
- UPI collect and pay risk scoring inside a 15 to 25 ms switch budget
- Decision space is allow, step-up challenge or block, with the 0.3% false-decline ceiling measured across all three

## The approach in one paragraph

Put a calibrated logistic regression on 40 velocity features in front of customers first, because it sets the cost floor, gives reason codes for free and is the model the policy engine can fall back to. Then replace it with LightGBM on about 300 features plus a cached device-card graph embedding only if it wins PR-AUC at 0.5 percent false-positive rate on a time-ordered split and survives a four-week shadow. The model's job is a trustworthy probability; the thresholds that turn it into approve, step up or decline live in config, owned by risk, and change without a retrain.

**Moves**

| Move | Detail |
|---|---|
| Fix the operating point before touching a model | Agree with risk and operations the review capacity per hour and the maximum tolerated false-decline rate, then express the target as recall at that capacity. Every later choice, from features to thresholds, is judged against that one number. |
| Build features that are true at decision time | Card velocity at 1 minute, 1 hour and 24 hours, device-card fan-out, merchant risk drift and the amount against the card's own 90-day median are computed from events strictly before the authorisation, using a point-in-time store. The merchant chargeback rate uses only matured labels. |
| Treat labels as a product with a delay | Train on a window that excludes the last 90 days of unmatured outcomes, impute the survival-aware probability for the gap, and reserve a small random slice of traffic for unbiased review so the model sees fraud the old policy would have approved. |
| Precompute the graph, never query it | The device-and-card graph is embedded offline every few hours and stored as vectors in the feature cache, so the graph contributes a 2.2 ms cached lookup instead of a traversal the 8 ms budget could never afford. |
| Separate score from policy | The scorer returns a calibrated probability and the top reason features. A rules-as-config policy engine maps it to approve, step-up authentication or decline per merchant category and amount band, which lets risk move a threshold during a flash sale without a deploy. |
| Plan the degradation ladder up front | If the feature store is slow the scorer falls back to the logistic baseline on cached features, and if the scorer itself is down the policy engine applies conservative static rules, so the auth path never waits. |

**Deliberately not doing**

- Cardholder name length or raw merchant free text: no causal link to fraud, and they overfit to data-entry quirks. The merchant is represented by MCC plus a learned embedding.
- Issuer country alone as a feature: it mostly proxies for the population, and it produces unfair declines for travellers, which would show up first in the false-decline guardrail.
- A random train-test split: it leaks the same cardholder into both sides. Every evaluation is time-ordered and grouped by card.
- Treating transactions not yet reported as fraud as genuine and training on them: it teaches the model to ignore the attack that is under way right now.

**How the approach is proven**

Offline, compare against the logistic baseline on PR-AUC at 0.5 percent false-positive rate and recall at review capacity, on a time-ordered, card-grouped split, with the unbiased review slice used as the honest test set. Online, run the challenger in shadow for four weeks logging the decision it would have made, then canary on a low-risk merchant category and judge fraud basis points per volume with the false-decline rate on good customers as a hard guardrail. If the guardrail moves, the ramp stops, regardless of how good the fraud number looks.

## Baseline and production design

- **Baseline (build this first):** Calibrated logistic regression on 40 velocity features, because it sets the cost floor and gives instant reason codes.
- **Production design:** LightGBM on 300 features plus a GNN-derived device-card embedding, served via Triton with an in-process feature cache.

## Why AI, and why this kind

**Why AI.** Block fraudulent authorisations inside the payment auth path while keeping false declines under 0.3% of genuine volume. The evidence that separates good from bad outcomes (Card velocity 1m/1h/24h, Device-card fan-out, Merchant risk drift) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "lifetime averages and static account age" are what teams reach for first, and they fail because lifetime aggregates dilute a burst that lasts 90 seconds. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: LightGBM on 300 features plus a GNN-derived device-card embedding, served via Triton with an in-process feature cache.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Card velocity 1m/1h/24h, Device-card fan-out, Merchant risk drift and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Calibrated logistic regression on 40 velocity features, because it sets the cost floor and gives instant reason codes | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| LightGBM on 300 features plus a GNN-derived device-card embedding, served via Triton with an in-process feature cache | chosen | Meets the 8 ms envelope at $0.0058 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fraud basis points per volume) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Selection bias in the labels: confirmed fraud comes only from cases the old model flagged or the customer reported, so a challenger trained on it learns to imitate the old model rather than to find what it missed.
- Label delay: recent weeks look clean because chargebacks have not arrived, and a model trained on them treats this week's attack as genuine behaviour.
- Flash sales and festive shopping spikes make ordinary customers look like a velocity burst, and a wave of false declines on the busiest day of the year is the most visible failure the business can have.
- Mule-device rotation resets device fan-out to zero after every block, so a static device rule decays in days.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
