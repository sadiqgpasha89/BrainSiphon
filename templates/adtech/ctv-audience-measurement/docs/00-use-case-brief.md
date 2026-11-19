# Cross-Platform Audience Measurement (TV + Digital): use-case brief

> Generated from the blueprint `adtech/ctv-audience-measurement` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cross-Platform Audience Measurement (TV + Digital) · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate deduplicated reach and frequency across linear TV, CTV and digital by fusing panel and census data. The system has to run as a scheduled batch job, inside these limits: Panel representativeness, Census coverage gaps and Methodology audits.

**Why it is hard.** The obvious approach is trust either source alone, and it fails because panels are small and census is incomplete. The second trap is in "Uncertainty": the real signal is report intervals, while teams usually reach for single-number reach.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.6K a month. A mistake is expensive in the way advertiser adoption measures it.

**What success looks like.** Offline: Held-out panel reach error and Calibration of intervals. Online: Cross-platform reach accuracy vs benchmarks and Advertiser adoption. The launch is judged on "Cross-platform reach accuracy vs benchmarks" while "Advertiser adoption" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate deduplicated reach and frequency across linear TV, CTV and digital by fusing panel and census data.

**Training objective.** `\mathcal{L}=\mathrm{KL}\!\left(P_{\text{panel}}\,\|\,P_{\text{model}}\right)+\lambda\,\mathrm{ConsistencyCensus}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{KL} | Kullback-Leibler divergence: how far one probability distribution is from another (zero when they are identical). |
| P_{\text{panel}} | A distribution of audience over groups: P_panel from the measured panel and P_model from the model. |
| \\|x\\| | Norm: the length of a vector. The squared norm of a difference is the sum of squared errors. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ConsistencyCensus} | Penalty when modelled audience totals disagree with census population totals. |

**Hard constraints**

- Panel representativeness
- Census coverage gaps
- Methodology audits
- Transparent uncertainty

## The approach in one paragraph

Start with sum platform reach with an overlap factor. Then earn the move to bayesian data fusion of panel and census with household-person modelling and published uncertainty, and only if it beats the baseline on Held-out panel reach error and Calibration of intervals after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Panel reach curves | Frequency distributions. Truth anchor. Guard against: sampling. |
| Add Census impression counts | Server-side counts. Scale. Guard against: coverage. |
| Add Overlap model parameters | Cross-platform duplication. Dedup. Guard against: estimation. |
| Run it as one pipeline | Panel data (vendor), Census logs (platforms), Fusion model (Bayesian), Household to person model (ML) and Reach and frequency calculator (simulation), with Reporting and Methodology audit off the critical path. |
| Optimise the right thing | The objective weighs kullback-Leibler divergence: how far one probability distribution is from another (zero when they are identical), so the model is trained on the cost of the decision and not on a generic score. |
| Handle panel attrition changes composition | Reweighting and recruitment tracking. |

**Deliberately not doing**

- Device model: weak.
- App name: none.

**How the approach is proven**

Prove it offline on Held-out panel reach error and Calibration of intervals using time-ordered splits, then online on "Cross-platform reach accuracy vs benchmarks" with "Advertiser adoption" as the guardrail. Watch for: Panel evaluated on itself and Ignoring non-response.

## Baseline and production design

- **Baseline (build this first):** Sum platform reach with an overlap factor.
- **Production design:** Bayesian data fusion of panel and census with household-person modelling and published uncertainty.

## Why AI, and why this kind

**Why AI.** Estimate deduplicated reach and frequency across linear TV, CTV and digital by fusing panel and census data. The evidence that separates good from bad outcomes (Panel reach curves, Census impression counts, Overlap model parameters) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "trust either source alone" are what teams reach for first, and they fail because panels are small and census is incomplete. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Bayesian data fusion of panel and census with household-person modelling and published uncertainty.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Panel reach curves, Census impression counts, Overlap model parameters and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Sum platform reach with an overlap factor | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Bayesian data fusion of panel and census with household-person modelling and published uncertainty | chosen | Meets the run-window envelope at $0.091 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cross-platform reach accuracy vs benchmarks) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Panel evaluated on itself.
- Evaluation trap: Ignoring non-response.
- Panel attrition changes composition: panel members drop out unevenly so the sample composition drifts and biases estimates.
- New streaming platform missing census: a new platform has no census data and its viewing is undercounted in reach.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
