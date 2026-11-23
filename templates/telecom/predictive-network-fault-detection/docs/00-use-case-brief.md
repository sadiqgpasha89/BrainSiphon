# Predictive Network Fault Detection: use-case brief

> Generated from the blueprint `telecom/predictive-network-fault-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Predictive Network Fault Detection · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict element failures and severe degradations hours to days ahead from performance counters and logs so engineers can intervene before customers are affected. The system has to run as a scheduled batch job, inside these limits: Alerts need at least 12 hours of lead time for planned work, Precision above 40% at the chosen threshold to avoid alert fatigue and Per-vendor models must be explainable to engineers.

**Why it is hard.** The obvious approach is any alarm after the fact, and it fails because alarms include false positives and cascading effects. The second trap is in "Window": the real signal is counters over a horizon matched to the failure mechanism, while teams usually reach for one fixed window for all equipment.

**Scale and stakes.** At 10 million users this is about 72.0M model-touching events a day, 833 requests per second on average and 833 at peak, at an estimated $3.5K a month. A mistake is expensive in the way planned versus emergency repairs measures it.

**What success looks like.** Offline: Precision and recall at 12 and 48 hour horizons, Lead time distribution and Calibration by equipment family. Online: Unplanned outage minutes, Planned versus emergency repairs and Alerts closed as no-fault. The launch is judged on "Unplanned outage minutes" while "Planned versus emergency repairs" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict element failures and severe degradations hours to days ahead from performance counters and logs so engineers can intervene before customers are affected.

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

- Alerts need at least 12 hours of lead time for planned work
- Precision above 40% at the chosen threshold to avoid alert fatigue
- Per-vendor models must be explainable to engineers
- Scores for 2M elements refreshed every 6 hours

## The approach in one paragraph

Start with static thresholds on key counters per equipment class, because they are what the NOC already trusts and set the minimum to beat. Then earn the move to gradient boosting per equipment family over peer-normalised counters with survival-style horizons, calibrated risk scores and a per-element explanation shown in the work queue, and only if it beats the baseline on Precision and recall at 12 and 48 hour horizons and Lead time distribution after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Counter drift against peers | Z-score of error and retransmit counters versus similar elements. Early degradation signature. Guard against: peer groups must exclude the failing element. |
| Add Temperature and power trend | Slope of temperature and supply voltage over 7 days. Hardware ageing signal. Guard against: needs sensor calibration per model. |
| Add Software version and recent restart count | Version and number of resets in 30 days. Instability indicator. Guard against: version must be as at prediction time. |
| Run it as one pipeline | Counter ingestion (time-series store), Peer normalisation (batch features), Risk model (gradient boosting), Calibration (isotonic regression), Intervention tracking (ticketing) and Outcome labelling (nightly join), with Work queue ranking off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new equipment type | Fall back to rules and collect labels. |

**Deliberately not doing**

- Element hostname: encodes site not health.
- Technician name on last visit: no causal link.
- Raw alarm count: dominated by chatty devices.

**How the approach is proven**

Prove it offline on Precision and recall at 12 and 48 hour horizons, Lead time distribution and Calibration by equipment family using time-ordered splits, then online on "Unplanned outage minutes" with "Planned versus emergency repairs" as the guardrail. Watch for: Random split across time, Using post-failure counters as features and Mixing vendor counter semantics.

## Baseline and production design

- **Baseline (build this first):** Static thresholds on key counters per equipment class, because they are what the NOC already trusts and set the minimum to beat.
- **Production design:** Gradient boosting per equipment family over peer-normalised counters with survival-style horizons, calibrated risk scores and a per-element explanation shown in the work queue.

## Why AI, and why this kind

**Why AI.** Predict element failures and severe degradations hours to days ahead from performance counters and logs so engineers can intervene before customers are affected. The evidence that separates good from bad outcomes (Counter drift against peers, Temperature and power trend, Software version and recent restart count) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "any alarm after the fact" are what teams reach for first, and they fail because alarms include false positives and cascading effects. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Gradient boosting per equipment family over peer-normalised counters with survival-style horizons, calibrated risk scores and a per-element explanation shown in the work queue.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Counter drift against peers, Temperature and power trend, Software version and recent restart count and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static thresholds on key counters per equipment class, because they are what the NOC already trusts and set the minimum to beat | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting per equipment family over peer-normalised counters with survival-style horizons, calibrated risk scores and a per-element explanation shown in the work queue | chosen | Meets the run-window envelope at $0.0016 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unplanned outage minutes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Random split across time.
- Evaluation trap: Using post-failure counters as features.
- New equipment type: no history exists.
- Intervention hides the label: repaired elements look healthy.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
