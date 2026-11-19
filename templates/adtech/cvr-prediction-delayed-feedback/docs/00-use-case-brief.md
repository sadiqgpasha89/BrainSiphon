# Conversion Rate Prediction with Delayed Feedback: use-case brief

> Generated from the blueprint `adtech/cvr-prediction-delayed-feedback` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Conversion Rate Prediction with Delayed Feedback · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict conversion probability when conversions arrive minutes to weeks after the click, without biasing toward fast converters. The system has to run in under 100 milliseconds, inside these limits: Fresh model within hours, Attribution-window changes and Long-tail delays.

**Why it is hard.** The obvious approach is labelling unconverted recent clicks as negatives, and it fails because recent negatives are mostly not-yet-converted. The second trap is in "Windows": the real signal is fixed observation window for evaluation labels, while teams usually reach for mixed windows across cohorts.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 4.2K at peak, at an estimated $4.3K a month. A mistake is expensive in the way spend efficiency measures it.

**What success looks like.** Offline: Calibration at matured labels and Log-loss on mature cohorts. Online: Cost per acquisition after full attribution and Spend efficiency. The launch is judged on "Cost per acquisition after full attribution" while "Spend efficiency" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict conversion probability when conversions arrive minutes to weeks after the click, without biasing toward fast converters.

**Training objective.** `\mathcal{L}=-\sum_i\left[y_i\log\left(p_i\,\lambda_i e^{-\lambda_i d_i}\right)+(1-y_i)\log\left(1-p_i+p_i e^{-\lambda_i d_i}\right)\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| y_i | The label so far: 1 if a conversion has already been observed, 0 if not yet (it may still come). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_i | The probability that the click eventually converts. |
| \lambda_i | The rate of the conversion-delay distribution: a larger value means conversions usually happen sooner after the click. |
| e^{-\lambda_i d_i} | Euler's number, base of the exponential delay model. |

**Hard constraints**

- Fresh model within hours
- Attribution-window changes
- Long-tail delays
- Calibration for bidding

## The approach in one paragraph

Start with train on conversions within a fixed 24-hour window. Then earn the move to delayed-feedback model (DFM or ES-DFM) with fake-negative weighting, hourly updates and a calibration head tied to bid optimisation, and only if it beats the baseline on Calibration at matured labels and Log-loss on mature cohorts after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Elapsed time since click | Seconds since click at label time. Delay modelling. Guard against: server clock. |
| Add Product category delay profile | Median delay by vertical. Prior for delay. Guard against: matured cohorts. |
| Add Click quality features | Dwell time on landing page. Intent. Guard against: consent. |
| Run it as one pipeline | Click and conversion streams (Kafka), Label joiner (Flink with delay windows), Delay-aware trainer (GPU incremental), CVR scorer (ONNX), Calibration layer (isotonic), Bidding service (pCVR consumer) and Late-conversion corrections (reprocessing). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle attribution partner changes lookback window | Window version in features and backfill labels. |

**Deliberately not doing**

- Click ID: random.
- Campaign creation date: cohort artefact.

**How the approach is proven**

Prove it offline on Calibration at matured labels and Log-loss on mature cohorts using time-ordered splits, then online on "Cost per acquisition after full attribution" with "Spend efficiency" as the guardrail. Watch for: Evaluating on immature labels and Dropping late conversions from evaluation sets.

## Baseline and production design

- **Baseline (build this first):** Train on conversions within a fixed 24-hour window.
- **Production design:** Delayed-feedback model (DFM or ES-DFM) with fake-negative weighting, hourly updates and a calibration head tied to bid optimisation.

## Why AI, and why this kind

**Why AI.** Predict conversion probability when conversions arrive minutes to weeks after the click, without biasing toward fast converters. The evidence that separates good from bad outcomes (Elapsed time since click, Product category delay profile, Click quality features) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "labelling unconverted recent clicks as negatives" are what teams reach for first, and they fail because recent negatives are mostly not-yet-converted. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Delayed-feedback model (DFM or ES-DFM) with fake-negative weighting, hourly updates and a calibration head tied to bid optimisation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Elapsed time since click, Product category delay profile, Click quality features and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Train on conversions within a fixed 24-hour window | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Delayed-feedback model (DFM or ES-DFM) with fake-negative weighting, hourly updates and a calibration head tied to bid optimisation | chosen | Meets the 80 ms envelope at $0.0024 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cost per acquisition after full attribution) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on immature labels.
- Evaluation trap: Dropping late conversions from evaluation sets.
- Attribution partner changes lookback window: label definition changes silently.
- Tracking outage drops conversion postbacks: model learns that conversion fell.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
