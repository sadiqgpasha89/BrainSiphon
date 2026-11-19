# IRT Item Calibration & Computerised Adaptive Testing: use-case brief

> Generated from the blueprint `edtech/irt-calibration-and-adaptive-testing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** IRT Item Calibration & Computerised Adaptive Testing · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Calibrate item parameters from response data and run adaptive tests that estimate ability precisely with fewer questions. The system has to run in under 100 milliseconds, inside these limits: Test security and item exposure control, Fairness (DIF) and Real-time item selection.

**Why it is hard.** The obvious approach is random or fixed forms, and it fails because adaptive tests need 40-60% fewer items. The second trap is in "Fairness": the real signal is differential item functioning analysis, while teams usually reach for overall accuracy.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 625 at peak, at an estimated $3.7K a month. A mistake is expensive in the way score validity evidence measures it.

**What success looks like.** Offline: Standard error of ability at test length and Item fit statistics. Online: Test length for target precision and Score validity evidence. The launch is judged on "Test length for target precision" while "Score validity evidence" must not get worse.

## Objective, loss and constraints

**Business objective.** Calibrate item parameters from response data and run adaptive tests that estimate ability precisely with fewer questions.

**Training objective.** `\mathcal{L}=-\sum_{i,j}\left[y_{ij}\log P_{ij}+(1-y_{ij})\log(1-P_{ij})\right],\ P_{ij}=c_j+\frac{1-c_j}{1+e^{-a_j(\theta_i-b_j)}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{i,j} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| y_{ij} | The observed answer: 1 if student i got item j correct, 0 if not. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| P_{ij} | The probability that student i answers item j correctly under the item response model. |
| c_j | The guessing parameter of item j: the chance of a correct answer by luck. |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| e^{-a_j(\theta_i-b_j)} | Euler's number, base of the logistic curve. |

**Hard constraints**

- Test security and item exposure control
- Fairness (DIF)
- Real-time item selection
- Psychometric defensibility

## The approach in one paragraph

Start with fixed-form tests scored by number correct. Then earn the move to 3PL/GPCM calibration with Bayesian estimation, CAT with content balancing and exposure control, and DIF monitoring for all items, and only if it beats the baseline on Standard error of ability at test length and Item fit statistics after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Item information at current ability | Fisher information of item. Selection. Guard against: ability estimate precision. |
| Add Item exposure rate | Share of test-takers seeing the item. Security. Guard against: sympson-Hetter control. |
| Add DIF statistic by group | Mantel-Haenszel or IRT-based. Fairness. Guard against: group definitions. |
| Run it as one pipeline | Response data (test platform), Item calibration (Bayesian IRT), Ability estimator (EAP), Item selector (max-information with constraints), Exposure controller (Sympson-Hetter) and DIF monitor (analysis), with Score reporter off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle items leaked online | Exposure monitoring and rapid item retirement. |

**Deliberately not doing**

- Test-taker ID: none.
- Item position effects: calibrate separately.

**How the approach is proven**

Prove it offline on Standard error of ability at test length and Item fit statistics using time-ordered splits, then online on "Test length for target precision" with "Score validity evidence" as the guardrail. Watch for: Calibrating on self-selected samples and Ignoring DIF.

## Baseline and production design

- **Baseline (build this first):** Fixed-form tests scored by number correct.
- **Production design:** 3PL/GPCM calibration with Bayesian estimation, CAT with content balancing and exposure control, and DIF monitoring for all items.

## Why AI, and why this kind

**Why AI.** Calibrate item parameters from response data and run adaptive tests that estimate ability precisely with fewer questions. The evidence that separates good from bad outcomes (Item information at current ability, Item exposure rate, DIF statistic by group) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "random or fixed forms" are what teams reach for first, and they fail because adaptive tests need 40-60% fewer items. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: 3PL/GPCM calibration with Bayesian estimation, CAT with content balancing and exposure control, and DIF monitoring for all items.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Item information at current ability, Item exposure rate, DIF statistic by group and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed-form tests scored by number correct | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| 3PL/GPCM calibration with Bayesian estimation, CAT with content balancing and exposure control, and DIF monitoring for all items | chosen | Meets the 80 ms envelope at $0.014 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Test length for target precision) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Calibrating on self-selected samples.
- Evaluation trap: Ignoring DIF.
- Items leaked online: item parameters drift and scores inflate.
- Small calibration samples for new items: unstable parameters.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
