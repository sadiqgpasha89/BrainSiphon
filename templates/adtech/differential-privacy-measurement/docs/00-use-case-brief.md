# Differentially Private Ad Measurement: use-case brief

> Generated from the blueprint `adtech/differential-privacy-measurement` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Differentially Private Ad Measurement · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Provide campaign reach and conversion reporting with formal differential-privacy guarantees and useful accuracy. The system has to run as a scheduled batch job, inside these limits: Epsilon budget accounting, Utility for small campaigns and Consistent repeated queries.

**Why it is hard.** The obvious approach is one-off noise per report, and it fails because repeated queries leak through averaging. The second trap is in "Utility": the real signal is hierarchical noise with post-processing, while teams usually reach for naive Laplace on each cell.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way privacy incidents measures it.

**What success looks like.** Offline: Relative error of aggregates at fixed epsilon and Privacy audit via attack simulation. Online: Usable metrics coverage and Privacy incidents. The launch is judged on "Usable metrics coverage" while "Privacy incidents" must not get worse.

## Objective, loss and constraints

**Business objective.** Provide campaign reach and conversion reporting with formal differential-privacy guarantees and useful accuracy.

**Training objective.** `\Pr[M(D)\in S]\le e^{\varepsilon}\Pr[M(D')\in S]+\delta`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \Pr | Probability of the event written inside the brackets. |
| M | The randomised measurement mechanism that adds noise to the result. |
| D | A dataset; D' is the same dataset with one person's data changed or removed. |
| S | Any set of possible outputs of the mechanism. |
| e^{\varepsilon} | Euler's number (about 2.718), the base of the exponential function. |
| \delta | A small probability that the privacy guarantee fails. |

**Hard constraints**

- Epsilon budget accounting
- Utility for small campaigns
- Consistent repeated queries
- Auditable noise

## The approach in one paragraph

Start with k-anonymity thresholds with suppression. Then earn the move to hierarchical DP mechanisms with contribution bounding, a privacy accountant and consistency post-processing, and only if it beats the baseline on Relative error of aggregates at fixed epsilon and Privacy audit via attack simulation after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Sensitivity bound | Per-user contribution cap. Noise scale. Guard against: clipping. |
| Add Epsilon allocation | Budget by metric and level. Utility. Guard against: policy. |
| Add Post-processing consistency | Non-negativity and hierarchy constraints. Quality. Guard against: consistency. |
| Run it as one pipeline | Event data (secure store), Contribution bounding (clipping), DP mechanism (noise addition), Privacy accountant (budget ledger) and Consistency post-processor (optimisation), with Report API and Privacy review off the critical path. |
| Optimise the right thing | The objective weighs probability of the event written inside the brackets, so the model is trained on the cost of the decision and not on a generic score. |
| Handle analysts re-query with tiny variations | Query caching and budget enforcement. |

**Deliberately not doing**

- Raw per-user rows: not released.
- Exact small counts: privacy risk.

**How the approach is proven**

Prove it offline on Relative error of aggregates at fixed epsilon and Privacy audit via attack simulation using time-ordered splits, then online on "Usable metrics coverage" with "Privacy incidents" as the guardrail. Watch for: Evaluating utility without privacy composition and Ignoring heavy-user clipping bias.

## Baseline and production design

- **Baseline (build this first):** k-anonymity thresholds with suppression.
- **Production design:** Hierarchical DP mechanisms with contribution bounding, a privacy accountant and consistency post-processing.

## Why AI, and why this kind

**Why AI.** Provide campaign reach and conversion reporting with formal differential-privacy guarantees and useful accuracy. The evidence that separates good from bad outcomes (Sensitivity bound, Epsilon allocation, Post-processing consistency) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one-off noise per report" are what teams reach for first, and they fail because repeated queries leak through averaging. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Hierarchical DP mechanisms with contribution bounding, a privacy accountant and consistency post-processing.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Sensitivity bound, Epsilon allocation, Post-processing consistency and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: k-anonymity thresholds with suppression | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hierarchical DP mechanisms with contribution bounding, a privacy accountant and consistency post-processing | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Usable metrics coverage) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating utility without privacy composition.
- Evaluation trap: Ignoring heavy-user clipping bias.
- Analysts re-query with tiny variations: budget exhausted or leakage.
- Heavy users dominate sensitivity: a few heavy users dominate sensitivity so noise must be set very high and utility collapses.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
