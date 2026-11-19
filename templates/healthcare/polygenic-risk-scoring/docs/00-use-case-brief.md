# Polygenic Risk Scoring: use-case brief

> Generated from the blueprint `healthcare/polygenic-risk-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Polygenic Risk Scoring · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Combine genome-wide variant effects into calibrated disease risk scores that are valid across ancestries and actionable for prevention programmes. The system has to run as a scheduled batch job, inside these limits: Ancestry portability, Calibration in absolute risk and Consent and genomic privacy.

**Why it is hard.** The obvious approach is scores trained on European cohorts applied universally, and it fails because accuracy drops 2-5x in under-represented ancestries. The second trap is in "Clinical utility": the real signal is absolute risk with net benefit analysis, while teams usually reach for relative risk percentiles.

**Scale and stakes.** At 10 million users this is about 60 model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.6K a month. A mistake is expensive in the way reclassification net benefit measures it.

**What success looks like.** Offline: Variance explained and AUC by ancestry and Calibration slope. Online: Uptake of preventive screening and Reclassification net benefit. The launch is judged on "Uptake of preventive screening" while "Reclassification net benefit" must not get worse.

## Objective, loss and constraints

**Business objective.** Combine genome-wide variant effects into calibrated disease risk scores that are valid across ancestries and actionable for prevention programmes.

**Training objective.** `\mathcal{L}=\|y-X\beta\|^2+\lambda\sum_j\left(\beta_j^2/\tau_j^2\right)\ \text{(Bayesian shrinkage priors)}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \\|x\\| | Norm: the length of a vector. The squared norm of a difference is the sum of squared errors. |
| y | The measured trait or disease status. |
| X | The genotype matrix: each person's variants. |
| \beta | The effect size of genetic variant j on the trait; the model learns one per variant. |
| \lambda | Strength of the shrinkage penalty. |
| \sum_j | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \tau_j^2 | The prior spread of the effect of variant j: a small value shrinks that variant's effect towards zero. |

**Hard constraints**

- Ancestry portability
- Calibration in absolute risk
- Consent and genomic privacy
- Clinical utility threshold

## The approach in one paragraph

Start with clumping and thresholding PRS. Then earn the move to bayesian PRS with ancestry-specific calibration combined with clinical risk factors into absolute 10-year risk, validated in multiple biobanks, and only if it beats the baseline on Variance explained and AUC by ancestry and Calibration slope after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Shrunk SNP effect sizes | LDpred2 or PRS-CS posterior effects. Reduces noise. Guard against: use external GWAS only. |
| Add Ancestry principal components | Genetic PCs for calibration. Population structure. Guard against: reference panel version. |
| Add Clinical covariates | Age, sex, family history. Combined model. Guard against: documented definitions. |
| Run it as one pipeline | Genotype data (array or sequencing), QC and imputation (pipeline), PRS computation (Bayesian weights), Ancestry calibration (PC-based model), Risk integration (clinical model) and Outcome follow-up (registry), with Genetic counsellor report off the critical path. |
| Optimise the right thing | The objective weighs norm: the length of a vector. The squared norm of a difference is the sum of squared errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle sample overlap between GWAS and target | Strict cohort separation and overlap checks. |

**Deliberately not doing**

- Raw p-value thresholded SNP lists: unstable.
- Self-reported ethnicity alone: inaccurate proxy.

**How the approach is proven**

Prove it offline on Variance explained and AUC by ancestry and Calibration slope using time-ordered splits, then online on "Uptake of preventive screening" with "Reclassification net benefit" as the guardrail. Watch for: Validating in the same biobank used for GWAS and Ignoring ancestry differences.

## Baseline and production design

- **Baseline (build this first):** Clumping and thresholding PRS.
- **Production design:** Bayesian PRS with ancestry-specific calibration combined with clinical risk factors into absolute 10-year risk, validated in multiple biobanks.

## Why AI, and why this kind

**Why AI.** Combine genome-wide variant effects into calibrated disease risk scores that are valid across ancestries and actionable for prevention programmes. The evidence that separates good from bad outcomes (Shrunk SNP effect sizes, Ancestry principal components, Clinical covariates) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "scores trained on European cohorts applied universally" are what teams reach for first, and they fail because accuracy drops 2-5x in under-represented ancestries. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Bayesian PRS with ancestry-specific calibration combined with clinical risk factors into absolute 10-year risk, validated in multiple biobanks.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Shrunk SNP effect sizes, Ancestry principal components, Clinical covariates and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Clumping and thresholding PRS | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Bayesian PRS with ancestry-specific calibration combined with clinical risk factors into absolute 10-year risk, validated in multiple biobanks | chosen | Meets the run-window envelope at $897.48 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Uptake of preventive screening) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Validating in the same biobank used for GWAS.
- Evaluation trap: Ignoring ancestry differences.
- Sample overlap between GWAS and target: inflated performance.
- Imputation panel mismatch: missing variants.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
