# Experimentation: CUPED & Sequential Testing: use-case brief

> Generated from the blueprint `retail/experimentation-cuped-sequential-testing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Experimentation: CUPED & Sequential Testing · **Domain:** retail · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Speed up online experiments with variance reduction and valid always-on sequential testing so teams ship decisions faster without false positives. The system has to run as a scheduled batch job, inside these limits: Type-I error control, Many concurrent experiments and Metric definitions governed.

**Why it is hard.** The obvious approach is running longer, and it fails because longer tests delay decisions and still have noisy tails. The second trap is in "Peeking": the real signal is always-valid p-values (mSPRT), while teams usually reach for repeated t-tests while peeking.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way win-rate vs holdout outcomes measures it.

**What success looks like.** Offline: False-positive rate on A/A tests and Variance reduction percentage. Online: Time to decision and Win-rate vs holdout outcomes. The launch is judged on "Time to decision" while "Win-rate vs holdout outcomes" must not get worse.

## Objective, loss and constraints

**Business objective.** Speed up online experiments with variance reduction and valid always-on sequential testing so teams ship decisions faster without false positives.

**Training objective.** `\hat\tau_{\text{CUPED}}=\bar Y_1-\bar Y_0-\theta(\bar X_1-\bar X_0),\quad\theta=\frac{\mathrm{Cov}(Y,X)}{\mathrm{Var}(X)}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \hat{\tau}_{\text{CUPED}} | The variance-reduced estimate of the treatment effect. |
| \bar{Y}_1 | The average outcome of the group named in the subscript. |
| \theta | The CUPED coefficient: how much of the outcome's variation is explained by the pre-experiment covariate, computed as Cov(Y,X)/Var(X). |
| \bar{X}_1 | The average of the covariate X. |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| \mathrm{Cov} | Covariance: how two quantities vary together. |
| Y | The outcome during the experiment. |
| X | The pre-experiment covariate (for example last month's spend) used to reduce noise. |
| \mathrm{Var} | Variance: how widely a quantity varies around its mean. |

**Hard constraints**

- Type-I error control
- Many concurrent experiments
- Metric definitions governed
- Auditability of decisions

## The approach in one paragraph

Start with fixed-horizon t-test on mean metrics. Then earn the move to automated analysis service with CUPED, SRM checks, mSPRT sequential monitoring, multiple-testing control and ratio-metric delta method, and only if it beats the baseline on False-positive rate on A/A tests and Variance reduction percentage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pre-period metric covariate | User metric in 28 days before assignment. CUPED covariate. Guard against: strictly pre-assignment. |
| Add Sample-ratio mismatch statistic | Chi-square on arm sizes. Data quality. Guard against: per-experiment automatic check. |
| Add Novelty decay curve | Effect by exposure day. Effect durability. Guard against: cohort exposure start. |
| Run it as one pipeline | Assignment logs (experiment platform), Metric computation (Spark), Variance reduction (CUPED service), Sequential tester (always-valid inference), SRM and quality checks (validators) and Decision dashboard (experiment UI), with Learnings archive off the critical path. |
| Optimise the right thing | The objective weighs the variance-reduced estimate of the treatment effect, so the model is trained on the cost of the decision and not on a generic score. |
| Handle interference between treatment and control (marketplace) | Cluster or switchback randomisation. |

**Deliberately not doing**

- Post-exposure covariates: bias the effect.
- Unplanned subgroup analyses: false discoveries.

**How the approach is proven**

Prove it offline on False-positive rate on A/A tests and Variance reduction percentage using time-ordered splits, then online on "Time to decision" with "Win-rate vs holdout outcomes" as the guardrail. Watch for: Using post-treatment covariates and Ignoring SRM warnings.

## Baseline and production design

- **Baseline (build this first):** Fixed-horizon t-test on mean metrics.
- **Production design:** Automated analysis service with CUPED, SRM checks, mSPRT sequential monitoring, multiple-testing control and ratio-metric delta method.

## Why AI, and why this kind

**Why AI.** Speed up online experiments with variance reduction and valid always-on sequential testing so teams ship decisions faster without false positives. The evidence that separates good from bad outcomes (Pre-period metric covariate, Sample-ratio mismatch statistic, Novelty decay curve) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "running longer" are what teams reach for first, and they fail because longer tests delay decisions and still have noisy tails. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Automated analysis service with CUPED, SRM checks, mSPRT sequential monitoring, multiple-testing control and ratio-metric delta method.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pre-period metric covariate, Sample-ratio mismatch statistic, Novelty decay curve and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed-horizon t-test on mean metrics | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Automated analysis service with CUPED, SRM checks, mSPRT sequential monitoring, multiple-testing control and ratio-metric delta method | chosen | Meets the run-window envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to decision) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using post-treatment covariates.
- Evaluation trap: Ignoring SRM warnings.
- Interference between treatment and control (marketplace): treated sellers or buyers affect control through shared inventory, biasing the measured effect.
- Metric definition drift: inconsistent decisions.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
