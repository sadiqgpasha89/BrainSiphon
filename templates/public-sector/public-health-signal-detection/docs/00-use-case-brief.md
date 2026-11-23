# Public Health Signal Detection: use-case brief

> Generated from the blueprint `public-sector/public-health-signal-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Health Signal Detection · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect early rises in illness from aggregated syndromic, wastewater and lab data so public health teams investigate sooner, without individual-level tracking. The system has to run interactively, within a few seconds, inside these limits: Aggregated data above a minimum count, Alerts reviewed by epidemiologists and Each alert states the data source.

**Why it is hard.** The obvious approach is raw counts, and it fails because reporting changes and seasons shift counts. The second trap is in "Privacy": the real signal is small-cell suppression, while teams usually reach for individual records.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 20.0K at peak, at an estimated $16.7K a month. A mistake is expensive in the way outbreaks investigated early measures it.

**What success looks like.** Offline: Detection delay on past outbreaks, False alert rate and Recall of confirmed events. Online: Days to detection, Outbreaks investigated early and Alert workload. The launch is judged on "Days to detection" while "Outbreaks investigated early" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect early rises in illness from aggregated syndromic, wastewater and lab data so public health teams investigate sooner, without individual-level tracking.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Aggregated data above a minimum count
- Alerts reviewed by epidemiologists
- Each alert states the data source
- No individual identification
- 300 regions

## The approach in one paragraph

Start with weekly counts compared with thresholds and epidemiologist review, because it is the standard surveillance. Then earn the move to a multi-source detection with reporting-lag correction, spatial clustering and a ranked alert list with context for epidemiologists, and only if it beats the baseline on Detection delay on past outbreaks and False alert rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Syndromic counts | Visits and calls for symptoms. Early signal. Guard against: aggregated. |
| Add Wastewater concentration | Viral load in sewage. Early signal. Guard against: from labs. |
| Add Lab positivity | Share of positive tests. Confirmation. Guard against: from labs. |
| Run it as one pipeline | Aggregated data intake (health data feeds), Small-cell suppression (privacy rules), Baseline model (time-series model), Anomaly detection (scan statistics) and Alert ranking (rules), with Epidemiologist review and Outcome review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle reporting change | Source flags and baselines reset. |

**Deliberately not doing**

- Facility name: an identifier.
- Clinician name: irrelevant.
- Report format: an artefact.

**How the approach is proven**

Prove it offline on Detection delay on past outbreaks, False alert rate and Recall of confirmed events using time-ordered splits, then online on "Days to detection" with "Outbreaks investigated early" as the guardrail. Watch for: Individual-level tracking, Raw count thresholds and Public alarms from raw alerts.

## Baseline and production design

- **Baseline (build this first):** Weekly counts compared with thresholds and epidemiologist review, because it is the standard surveillance.
- **Production design:** A multi-source detection with reporting-lag correction, spatial clustering and a ranked alert list with context for epidemiologists.

## Why AI, and why this kind

**Why AI.** Detect early rises in illness from aggregated syndromic, wastewater and lab data so public health teams investigate sooner, without individual-level tracking. The evidence that separates good from bad outcomes (Syndromic counts, Wastewater concentration, Lab positivity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw counts" are what teams reach for first, and they fail because reporting changes and seasons shift counts. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A multi-source detection with reporting-lag correction, spatial clustering and a ranked alert list with context for epidemiologists.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Syndromic counts, Wastewater concentration, Lab positivity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Weekly counts compared with thresholds and epidemiologist review, because it is the standard surveillance | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A multi-source detection with reporting-lag correction, spatial clustering and a ranked alert list with context for epidemiologists | chosen | Meets the 2500 ms envelope at $0.0019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Days to detection) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Individual-level tracking.
- Evaluation trap: Raw count thresholds.
- Reporting change: a lab changes its reporting.
- Outbreak in a small area: counts are small.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
