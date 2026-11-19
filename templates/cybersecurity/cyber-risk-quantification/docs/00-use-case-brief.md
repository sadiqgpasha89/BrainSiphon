# Cyber Risk Quantification: use-case brief

> Generated from the blueprint `cybersecurity/cyber-risk-quantification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cyber Risk Quantification · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate annualised loss exposure from cyber events by combining threat likelihood, control strength and asset impact, to justify security investments. The system has to run as a scheduled batch job, inside these limits: Sparse loss data, Expert elicitation and Defensible assumptions.

**Why it is hard.** The obvious approach is qualitative heat maps, and it fails because heat maps hide magnitudes and compounding. The second trap is in "Controls": the real signal is control effectiveness estimated from telemetry, while teams usually reach for checklist maturity scores.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.6K a month. A mistake is expensive in the way decision usage by leadership measures it.

**What success looks like.** Offline: Calibration of predicted vs realised losses and Back-test of loss exceedance. Online: Risk reduced per dollar invested and Decision usage by leadership. The launch is judged on "Risk reduced per dollar invested" while "Decision usage by leadership" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate annualised loss exposure from cyber events by combining threat likelihood, control strength and asset impact, to justify security investments.

**Training objective.** `\mathrm{ALE}=\sum_i \lambda_i\,\mathbb{E}[L_i],\quad \lambda_i\sim\mathrm{Poisson},\ L_i\sim\mathrm{LogNormal}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathrm{ALE} | Annualised loss expectancy: the expected yearly financial loss from cyber incidents. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \lambda_i | The expected number of incidents of type i per year (Poisson rate). |
| \mathbb{E} | Expectation of the loss size. |
| L_i | The size of the loss in one incident of type i (log-normal). |
| \mathrm{Poisson} | Poisson likelihood: a probability model for counts of events. |
| \mathrm{LogNormal} | Log-normal likelihood: a probability model for positive values whose logarithm is normally distributed. |

**Hard constraints**

- Sparse loss data
- Expert elicitation
- Defensible assumptions
- Board-level communication

## The approach in one paragraph

Start with qualitative risk matrix. Then earn the move to bayesian frequency-severity model with expert-elicited priors updated from telemetry and incidents, producing loss exceedance curves, and only if it beats the baseline on Calibration of predicted vs realised losses and Back-test of loss exceedance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Control coverage and efficacy | Detection and prevention rates by control. Frequency reduction. Guard against: telemetry. |
| Add Asset value and exposure | Data records and revenue at risk. Severity. Guard against: business data. |
| Add Industry incident frequency | External base rates. Prior. Guard against: source quality. |
| Run it as one pipeline | Asset and control data (GRC), Telemetry-derived efficacy (SIEM metrics), Frequency-severity model (Bayesian), Monte Carlo simulation (loss exceedance), Scenario comparator (investment options), CISO and board (human) and Incident outcomes (calibration). |
| Optimise the right thing | The objective weighs annualised loss expectancy: the expected yearly financial loss from cyber incidents, so the model is trained on the cost of the decision and not on a generic score. |
| Handle black-swan events outside historical data | Scenario analysis and heavy-tailed severity distributions. |

**Deliberately not doing**

- Number of controls: quantity not effectiveness.
- Audit pass count: compliance not risk.

**How the approach is proven**

Prove it offline on Calibration of predicted vs realised losses and Back-test of loss exceedance using time-ordered splits, then online on "Risk reduced per dollar invested" with "Decision usage by leadership" as the guardrail. Watch for: Few incidents to validate and Treating model output as precise.

## Baseline and production design

- **Baseline (build this first):** Qualitative risk matrix.
- **Production design:** Bayesian frequency-severity model with expert-elicited priors updated from telemetry and incidents, producing loss exceedance curves.

## Why AI, and why this kind

**Why AI.** Estimate annualised loss exposure from cyber events by combining threat likelihood, control strength and asset impact, to justify security investments. The evidence that separates good from bad outcomes (Control coverage and efficacy, Asset value and exposure, Industry incident frequency) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "qualitative heat maps" are what teams reach for first, and they fail because heat maps hide magnitudes and compounding. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Bayesian frequency-severity model with expert-elicited priors updated from telemetry and incidents, producing loss exceedance curves.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Control coverage and efficacy, Asset value and exposure, Industry incident frequency and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Qualitative risk matrix | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Bayesian frequency-severity model with expert-elicited priors updated from telemetry and incidents, producing loss exceedance curves | chosen | Meets the run-window envelope at $1.80 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Risk reduced per dollar invested) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Few incidents to validate.
- Evaluation trap: Treating model output as precise.
- Black-swan events outside historical data: tail underestimated.
- Overconfident expert priors: narrow uncertainty.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
