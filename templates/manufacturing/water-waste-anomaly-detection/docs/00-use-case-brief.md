# Water and Waste Stream Anomaly Detection: use-case brief

> Generated from the blueprint `manufacturing/water-waste-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Water and Waste Stream Anomaly Detection · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect abnormal water use, effluent quality and waste volumes by line so leaks, spills and permit exceedances are found early. The system has to run interactively, within a few seconds, inside these limits: Alarm before permit limits are reached, Baselines per production state and Evidence pack for regulators.

**Why it is hard.** The obvious approach is absolute use, and it fails because use rises with output. The second trap is in "Compliance": the real signal is limits from the permit with a margin, while teams usually reach for internal targets only.

**Scale and stakes.** At 10 million users this is about 144.0M model-touching events a day, 1.7K requests per second on average and 10.0K at peak, at an estimated $7.3K a month. A mistake is expensive in the way water per unit measures it.

**What success looks like.** Offline: Detection rate on seeded excursions, False alarms per site-month and Time to detect. Online: Permit exceedances, Water per unit and Waste disposal cost. The launch is judged on "Permit exceedances" while "Water per unit" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect abnormal water use, effluent quality and waste volumes by line so leaks, spills and permit exceedances are found early.

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

- Alarm before permit limits are reached
- Baselines per production state
- Evidence pack for regulators
- Daily review for 200 sites

## The approach in one paragraph

Start with alerts on permit limits and monthly totals, because they are the compliance minimum. Then earn the move to a state-conditioned anomaly model on normalised use with permit margin alerts, meter-level attribution and an evidence export for regulators, and only if it beats the baseline on Detection rate on seeded excursions and False alarms per site-month after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Water per unit produced | Litres per unit by line. Efficiency. Guard against: from meters and production. |
| Add Effluent quality indicators | PH, conductivity and load measures. Compliance. Guard against: from analysers. |
| Add Waste volume by stream | Tonnes by waste class. Disposal cost. Guard against: from scales. |
| Run it as one pipeline | Meter and analyser capture (SCADA), State assignment (MES join), Normalisation (per unit rates), Anomaly detector (state-conditioned model), Permit margin rules (compliance rules), Alert and evidence (EHS console) and Action tracking (ticketing). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle cleaning cycles | Cleaning state excluded or modelled separately. |

**Deliberately not doing**

- Meter name: an identifier.
- Operator name: irrelevant.
- Report format: an artefact.

**How the approach is proven**

Prove it offline on Detection rate on seeded excursions, False alarms per site-month and Time to detect using time-ordered splits, then online on "Permit exceedances" with "Water per unit" as the guardrail. Watch for: Absolute baselines, Alerting at the limit only and Site totals only.

## Baseline and production design

- **Baseline (build this first):** Alerts on permit limits and monthly totals, because they are the compliance minimum.
- **Production design:** A state-conditioned anomaly model on normalised use with permit margin alerts, meter-level attribution and an evidence export for regulators.

## Why AI, and why this kind

**Why AI.** Detect abnormal water use, effluent quality and waste volumes by line so leaks, spills and permit exceedances are found early. The evidence that separates good from bad outcomes (Water per unit produced, Effluent quality indicators, Waste volume by stream) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "absolute use" are what teams reach for first, and they fail because use rises with output. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A state-conditioned anomaly model on normalised use with permit margin alerts, meter-level attribution and an evidence export for regulators.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Water per unit produced, Effluent quality indicators, Waste volume by stream and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Alerts on permit limits and monthly totals, because they are the compliance minimum | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A state-conditioned anomaly model on normalised use with permit margin alerts, meter-level attribution and an evidence export for regulators | chosen | Meets the 2500 ms envelope at $0.0017 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Permit exceedances) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Absolute baselines.
- Evaluation trap: Alerting at the limit only.
- Cleaning cycles: use spikes by design.
- Analyser drift: quality readings drift.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
