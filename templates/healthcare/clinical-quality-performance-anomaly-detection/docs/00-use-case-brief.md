# Clinical Quality Performance Anomaly Detection: use-case brief

> Generated from the blueprint `healthcare/clinical-quality-performance-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Quality Performance Anomaly Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect unexpected changes in quality indicators across facilities, units, specialties and time, and tell analysts whether a change is more likely a data problem or a real performance shift before escalating. The system has to run as a scheduled batch job, inside these limits: Data-quality gates run before any performance alarm, Alerts carry baseline comparison and a data-versus-performance classification and A quality analyst validates before any escalation.

**Why it is hard.** The obvious approach is treating every change as performance, and it fails because most apparent shifts are data defects. The second trap is in "Baseline": the real signal is seasonal, case-mix-adjusted baseline, while teams usually reach for a fixed control limit.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way data defects found by the gate measures it.

**What success looks like.** Offline: Detection recall and precision on seeded and adjudicated shifts at the alert budget, Data-versus-performance classification accuracy and Median time to detection. Online: Analyst-confirmed performance shifts caught early, Data defects found by the gate and Alert acknowledgement rate. The launch is judged on "Analyst-confirmed performance shifts caught early" while "Data defects found by the gate" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect unexpected changes in quality indicators across facilities, units, specialties and time, and tell analysts whether a change is more likely a data problem or a real performance shift before escalating.

**Training objective.** `\mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Data-quality gates run before any performance alarm
- Alerts carry baseline comparison and a data-versus-performance classification
- A quality analyst validates before any escalation
- Seasonality, case mix and denominators are handled explicitly
- Alert budget per analyst per week
- Scores 25K indicator-by-unit series nightly

## The approach in one paragraph

Start with control chart with fixed three-sigma limits. Then earn the move to multivariate and seasonal time-series anomaly detection on adjusted indicators with a data-quality gate in front, a data-versus-performance classifier behind it and an analyst triage view with baseline comparison, and only if it beats the baseline on Detection recall and precision on seeded and adjudicated shifts at the alert budget and Data-versus-performance classification accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Adjusted deviation from baseline | Standardised residual after seasonality and case mix. The core anomaly score. Guard against: baseline fit on earlier periods. |
| Add Data completeness at cut-off | Share of expected records present. Separates lag from change. Guard against: at the cut-off. |
| Add Definition change flag | Measure or coding version change in the window. Common source of artefacts. Guard against: version tags. |
| Run it as one pipeline | Indicator and metadata intake (warehouse extracts), Data-quality gate (validation rules), Adjusted baseline builder (seasonal and case-mix model), Anomaly detector (robust residual model with isolation forest) and Data-versus-performance classifier (gradient boosting), with Quality analyst review and Triage outcome and feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle measure specification update | Version-aware baselines and a suppressed alert window. |

**Deliberately not doing**

- Single low-denominator month: noise.
- Unreviewed manual overrides: inconsistent.
- Weekend effects in monthly measures: seasonality.

**How the approach is proven**

Prove it offline on Detection recall and precision on seeded and adjudicated shifts at the alert budget, Data-versus-performance classification accuracy and Median time to detection using time-ordered splits, then online on "Analyst-confirmed performance shifts caught early" with "Data defects found by the gate" as the guardrail. Watch for: Treating data defects as performance, Tuning on seeded anomalies only and Using fixed limits for seasonal measures.

## Baseline and production design

- **Baseline (build this first):** Control chart with fixed three-sigma limits.
- **Production design:** Multivariate and seasonal time-series anomaly detection on adjusted indicators with a data-quality gate in front, a data-versus-performance classifier behind it and an analyst triage view with baseline comparison.

## Why AI, and why this kind

**Why AI.** Detect unexpected changes in quality indicators across facilities, units, specialties and time, and tell analysts whether a change is more likely a data problem or a real performance shift before escalating. The evidence that separates good from bad outcomes (Adjusted deviation from baseline, Data completeness at cut-off, Definition change flag) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "treating every change as performance" are what teams reach for first, and they fail because most apparent shifts are data defects. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Multivariate and seasonal time-series anomaly detection on adjusted indicators with a data-quality gate in front, a data-versus-performance classifier behind it and an analyst triage view with baseline comparison.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Adjusted deviation from baseline, Data completeness at cut-off, Definition change flag and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Control chart with fixed three-sigma limits | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multivariate and seasonal time-series anomaly detection on adjusted indicators with a data-quality gate in front, a data-versus-performance classifier behind it and an analyst triage view with baseline comparison | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Analyst-confirmed performance shifts caught early) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating data defects as performance.
- Evaluation trap: Tuning on seeded anomalies only.
- Measure specification update: step change in every series.
- Late-arriving data: an apparent drop recovers later.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
