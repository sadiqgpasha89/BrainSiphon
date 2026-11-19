# Credit Default Survival Modeling: use-case brief

> Generated from the blueprint `fintech/credit-default-survival-modeling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Credit Default Survival Modeling · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate time-to-default curves per borrower to set provisions, pricing and limits under IFRS 9 / CECL. The system has to run as a scheduled batch job, inside these limits: Regulatory explainability and monotonic constraints, Monthly portfolio refresh in under 2 hours and Stable under macro regime change.

**Why it is hard.** The obvious approach is dropping open accounts or treating them as non-default, and it fails because dropping open loans biases default rates downward by 20-40%. The second trap is in "Macro": the real signal is macro covariates as scenario inputs for stress tests, while teams usually reach for fitting on the last 3 benign years.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way capital held versus regulatory minimum measures it.

**What success looks like.** Offline: Time-dependent AUC at 12 and 24 months and Calibration of cumulative default by vintage. Online: Provision accuracy versus realised loss and Capital held versus regulatory minimum. The launch is judged on "Provision accuracy versus realised loss" while "Capital held versus regulatory minimum" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate time-to-default curves per borrower to set provisions, pricing and limits under IFRS 9 / CECL.

**Training objective.** `\mathcal{L}=-\sum_i\left[\delta_i\log h(t_i\mid x_i)-\int_0^{t_i}h(u\mid x_i)\,du\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \delta_i | Event indicator: 1 if borrower i defaulted, 0 if still performing at the end of observation (censored). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| h | The hazard: the chance of default at time u given the borrower has not defaulted yet. |
| t_i | The time at which borrower i defaulted or was last observed. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| x_i | The borrower's features. |
| \int_0^{t_i} | Integral: add up a continuously varying quantity over the range shown. |
| u | The time variable of integration. |
| d | The integration variable du: a tiny step in time. |

**Hard constraints**

- Regulatory explainability and monotonic constraints
- Monthly portfolio refresh in under 2 hours
- Stable under macro regime change
- Full lineage for auditors

## The approach in one paragraph

Start with cox proportional hazards with monotone-binned features, because regulators already trust it. Then earn the move to discrete-time gradient-boosted hazard model with monotone constraints, calibrated per vintage, plus a macro scenario overlay, and only if it beats the baseline on Time-dependent AUC at 12 and 24 months and Calibration of cumulative default by vintage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Months-on-book hazard shape | Baseline hazard as piecewise-constant by account age. Default risk peaks at known seasoning points. Guard against: vintage effects mix with age if not stratified. |
| Add Utilisation trend 6m | Slope of revolving utilisation over 6 months. Distress shows as creeping utilisation. Guard against: use statement-date values, never month-end after the fact. |
| Add Payment-to-minimum ratio | Payment divided by minimum due, 3-month rolling. Minimum-only payers default earlier. Guard against: delinquency flags computed after default leak the label. |
| Run it as one pipeline | Loan tape ingestion (Spark on lakehouse), Vintage feature builder (point-in-time SQL), Hazard model (XGBoost monotone), Macro scenario overlay (CECL scenario engine) and Provision publisher (idempotent tables), with Model risk review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle policy change mid-vintage | Add policy-version as a stratifier and monitor vintage curves. |

**Deliberately not doing**

- Raw ZIP code: proxy for protected classes and unstable, use regional macro features instead.
- Marketing channel of acquisition: correlates with vintage, not with repayment behaviour.

**How the approach is proven**

Prove it offline on Time-dependent AUC at 12 and 24 months and Calibration of cumulative default by vintage using time-ordered splits, then online on "Provision accuracy versus realised loss" with "Capital held versus regulatory minimum" as the guardrail. Watch for: Using current delinquency status instead of status as-of observation time and Ignoring left truncation of older vintages.

## Baseline and production design

- **Baseline (build this first):** Cox proportional hazards with monotone-binned features, because regulators already trust it.
- **Production design:** Discrete-time gradient-boosted hazard model with monotone constraints, calibrated per vintage, plus a macro scenario overlay.

## Why AI, and why this kind

**Why AI.** Estimate time-to-default curves per borrower to set provisions, pricing and limits under IFRS 9 / CECL. The evidence that separates good from bad outcomes (Months-on-book hazard shape, Utilisation trend 6m, Payment-to-minimum ratio) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "dropping open accounts or treating them as non-default" are what teams reach for first, and they fail because dropping open loans biases default rates downward by 20-40%. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Discrete-time gradient-boosted hazard model with monotone constraints, calibrated per vintage, plus a macro scenario overlay.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Months-on-book hazard shape, Utilisation trend 6m, Payment-to-minimum ratio and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Cox proportional hazards with monotone-binned features, because regulators already trust it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Discrete-time gradient-boosted hazard model with monotone constraints, calibrated per vintage, plus a macro scenario overlay | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Provision accuracy versus realised loss) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using current delinquency status instead of status as-of observation time.
- Evaluation trap: Ignoring left truncation of older vintages.
- Policy change mid-vintage: approvals shift so the hazard baseline moves.
- Moratorium or forbearance: defaults suppressed artificially.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
