# First-Attempt Delivery Failure Prediction: use-case brief

> Generated from the blueprint `supply-chain/first-attempt-delivery-failure-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** First-Attempt Delivery Failure Prediction · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which deliveries will fail on the first attempt and intervene (confirm availability, safe-place, locker) to cut costly re-deliveries. The system has to run in under 100 milliseconds, inside these limits: Customer consent for messages, Real-time before route lock and Explainable.

**Why it is hard.** The obvious approach is prediction only, and it fails because a prediction without a cheap fix creates no value. The second trap is in "Context": the real signal is address-level history (access, concierge), while teams usually reach for customer-level only.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $3.7K a month. A mistake is expensive in the way cost per redelivery avoided measures it.

**What success looks like.** Offline: AUC and calibration and Uplift on failure rate. Online: First-attempt success rate and Cost per redelivery avoided. The launch is judged on "First-attempt success rate" while "Cost per redelivery avoided" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which deliveries will fail on the first attempt and intervene (confirm availability, safe-place, locker) to cut costly re-deliveries.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\cdot c_{\text{redelivery}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| c_{\text{redelivery}} | The cost of a redelivery attempt; the loss weights failures by it. |

**Hard constraints**

- Customer consent for messages
- Real-time before route lock
- Explainable
- Low false interventions

## The approach in one paragraph

Start with send reminder to all customers. Then earn the move to gBDT with address embeddings and uplift-based intervention selection, integrated with routing for safe-place or locker redirection, and only if it beats the baseline on AUC and calibration and Uplift on failure rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Address delivery history | Past first-attempt success at the address. Access. Guard against: matured. |
| Add Time-window vs customer availability | Predicted at-home probability. Failure. Guard against: preferences. |
| Add Delivery instructions quality | Structured instruction present. Access info. Guard against: parsing. |
| Run it as one pipeline | Out-for-delivery list (OMS), Address features (feature store), Failure model (GBDT), Intervention selector (uplift), Messaging service (SMS), Route adjustment (dispatcher) and Delivery outcome (POD). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new housing development | Geospatial neighbours as prior. |

**Deliberately not doing**

- Order number: none.
- Courier name: personal.

**How the approach is proven**

Prove it offline on AUC and calibration and Uplift on failure rate using time-ordered splits, then online on "First-attempt success rate" with "Cost per redelivery avoided" as the guardrail. Watch for: Interventions not randomised and Counting rescheduled deliveries as failures.

## Baseline and production design

- **Baseline (build this first):** Send reminder to all customers.
- **Production design:** GBDT with address embeddings and uplift-based intervention selection, integrated with routing for safe-place or locker redirection.

## Why AI, and why this kind

**Why AI.** Predict which deliveries will fail on the first attempt and intervene (confirm availability, safe-place, locker) to cut costly re-deliveries. The evidence that separates good from bad outcomes (Address delivery history, Time-window vs customer availability, Delivery instructions quality) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "prediction only" are what teams reach for first, and they fail because A prediction without a cheap fix creates no value. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: GBDT with address embeddings and uplift-based intervention selection, integrated with routing for safe-place or locker redirection.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Address delivery history, Time-window vs customer availability, Delivery instructions quality and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Send reminder to all customers | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| GBDT with address embeddings and uplift-based intervention selection, integrated with routing for safe-place or locker redirection | chosen | Meets the 80 ms envelope at $0.021 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (First-attempt success rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Interventions not randomised.
- Evaluation trap: Counting rescheduled deliveries as failures.
- New housing development: no address history.
- Message fatigue: customers ignore.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
