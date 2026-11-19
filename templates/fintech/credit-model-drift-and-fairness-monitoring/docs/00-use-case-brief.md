# Credit Model Drift & Fairness Monitoring: use-case brief

> Generated from the blueprint `fintech/credit-model-drift-and-fairness-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Credit Model Drift & Fairness Monitoring · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Continuously monitor credit models for performance decay, population shift and disparate impact, with automated retraining triggers and audit reports. The system has to run as a scheduled batch job, inside these limits: Regulator-grade documentation, Delayed outcomes and Protected-class data governance.

**Why it is hard.** The obvious approach is raw recent default rates, and it fails because recent cohorts have not had time to default. The second trap is in "Drift": the real signal is concept drift (relationship) vs covariate drift (inputs), while teams usually reach for reporting PSI only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way audit finding count measures it.

**What success looks like.** Offline: Metric stability across windows and Detection recall on injected drift. Online: Time to detect degradation and Audit finding count. The launch is judged on "Time to detect degradation" while "Audit finding count" must not get worse.

## Objective, loss and constraints

**Business objective.** Continuously monitor credit models for performance decay, population shift and disparate impact, with automated retraining triggers and audit reports.

**Training objective.** `\mathcal{L}=\mathrm{PSI}(P,Q)=\sum_i(P_i-Q_i)\ln\frac{P_i}{Q_i}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{PSI} | Population stability index: a measure of how much a feature's distribution has drifted from its reference. |
| P | The reference distribution of a score or feature: P_i is the share of customers in bin i at training time. |
| Q | The current distribution: Q_i is the share in bin i today. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \ln | Natural logarithm. |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |

**Hard constraints**

- Regulator-grade documentation
- Delayed outcomes
- Protected-class data governance
- Monthly governance committee

## The approach in one paragraph

Start with monthly PSI and Gini report. Then earn the move to automated monitoring with delay-aware performance estimators, drift decomposition, fairness metrics and champion-challenger triggers, and only if it beats the baseline on Metric stability across windows and Detection recall on injected drift after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Population stability by feature | PSI per feature and score. Input shift. Guard against: reference window fixed by model version. |
| Add Delay-adjusted default estimate | Expected defaults on immature cohorts via survival. Early performance. Guard against: use hazard model not simple rates. |
| Add Adverse-impact ratio | Approval ratio protected vs reference group. Fairness. Guard against: use proxy or surveyed attributes lawfully. |
| Run it as one pipeline | Scored decisions log (lakehouse), Outcome joiner (matured-label job), Drift and fairness metrics (Spark), Delay-aware estimator (survival adjustment), Governance dashboard (BI reports), Model risk committee (human review) and Retrain trigger (pipeline). |
| Optimise the right thing | The objective weighs population stability index: a measure of how much a feature's distribution has drifted from its reference, so the model is trained on the cost of the decision and not on a generic score. |
| Handle policy change shifts population | Policy-version stratification and re-baselining protocol. |

**Deliberately not doing**

- Daily PSI fluctuations: sampling noise.
- Single-feature drift in unused features: no decision impact.

**How the approach is proven**

Prove it offline on Metric stability across windows and Detection recall on injected drift using time-ordered splits, then online on "Time to detect degradation" with "Audit finding count" as the guardrail. Watch for: Using immature cohorts as performance evidence and Comparing across different policy regimes.

## Baseline and production design

- **Baseline (build this first):** Monthly PSI and Gini report.
- **Production design:** Automated monitoring with delay-aware performance estimators, drift decomposition, fairness metrics and champion-challenger triggers.

## Why AI, and why this kind

**Why AI.** Continuously monitor credit models for performance decay, population shift and disparate impact, with automated retraining triggers and audit reports. The evidence that separates good from bad outcomes (Population stability by feature, Delay-adjusted default estimate, Adverse-impact ratio) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw recent default rates" are what teams reach for first, and they fail because recent cohorts have not had time to default. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Automated monitoring with delay-aware performance estimators, drift decomposition, fairness metrics and champion-challenger triggers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Population stability by feature, Delay-adjusted default estimate, Adverse-impact ratio and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Monthly PSI and Gini report | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Automated monitoring with delay-aware performance estimators, drift decomposition, fairness metrics and champion-challenger triggers | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to detect degradation) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using immature cohorts as performance evidence.
- Evaluation trap: Comparing across different policy regimes.
- Policy change shifts population: alerts fire constantly.
- Protected attribute unavailable: fairness unmeasurable.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
