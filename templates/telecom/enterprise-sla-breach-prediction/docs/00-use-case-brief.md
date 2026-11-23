# Enterprise SLA Breach Prediction: use-case brief

> Generated from the blueprint `telecom/enterprise-sla-breach-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Enterprise SLA Breach Prediction · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which enterprise services are likely to breach their SLA in the current period and trigger early action, so credits and churn fall. The system has to run interactively, within a few seconds, inside these limits: Per-contract SLA definitions applied exactly, Alerts to the account team with reasons and No automatic credits.

**Why it is hard.** The obvious approach is a generic availability figure, and it fails because contracts differ in measurement and exclusions. The second trap is in "Horizon": the real signal is probability of a breach by period end given the budget used, while teams usually reach for end-of-period outcomes only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $4.0K a month. A mistake is expensive in the way breaches avoided measures it.

**What success looks like.** Offline: Precision and recall of breaches, Lead time and Calibration by contract class. Online: SLA credits paid, Breaches avoided and Enterprise churn. The launch is judged on "SLA credits paid" while "Breaches avoided" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which enterprise services are likely to breach their SLA in the current period and trigger early action, so credits and churn fall.

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

- Per-contract SLA definitions applied exactly
- Alerts to the account team with reasons
- No automatic credits
- Hourly scoring of 200K enterprise services

## The approach in one paragraph

Start with alert when SLA budget consumed passes fixed thresholds, because many teams already do this. Then earn the move to a model for the probability of a breach by period end using budget use, path health and planned work, with a ranked list and suggested actions by account team, and only if it beats the baseline on Precision and recall of breaches and Lead time after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around SLA budget consumed | Minutes of downtime used against the allowed budget. Primary signal. Guard against: contract rules applied. |
| Add Incident rate on the path | Incidents on the service path in 30 days. Reliability trend. Guard against: from fault records. |
| Add Maintenance planned | Scheduled work that counts against the SLA. Future budget use. Guard against: from change calendars. |
| Run it as one pipeline | Service impact and budget (SLA engine), Path and incident features (lakehouse), Breach model (gradient boosting), Planned work join (change calendar), Ranked alerts (account console), Action tracking (ticketing) and Outcome tracking (monthly). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle disputed outage | Mark disputed minutes and show both views. |

**Deliberately not doing**

- Account manager: irrelevant.
- Customer logo: irrelevant.
- Contract number: an identifier.

**How the approach is proven**

Prove it offline on Precision and recall of breaches, Lead time and Calibration by contract class using time-ordered splits, then online on "SLA credits paid" with "Breaches avoided" as the guardrail. Watch for: Using one SLA formula, Scoring at period end only and Automatic credits.

## Baseline and production design

- **Baseline (build this first):** Alert when SLA budget consumed passes fixed thresholds, because many teams already do this.
- **Production design:** A model for the probability of a breach by period end using budget use, path health and planned work, with a ranked list and suggested actions by account team.

## Why AI, and why this kind

**Why AI.** Predict which enterprise services are likely to breach their SLA in the current period and trigger early action, so credits and churn fall. The evidence that separates good from bad outcomes (SLA budget consumed, Incident rate on the path, Maintenance planned) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A generic availability figure" are what teams reach for first, and they fail because contracts differ in measurement and exclusions. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A model for the probability of a breach by period end using budget use, path health and planned work, with a ranked list and suggested actions by account team.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among SLA budget consumed, Incident rate on the path, Maintenance planned and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Alert when SLA budget consumed passes fixed thresholds, because many teams already do this | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A model for the probability of a breach by period end using budget use, path health and planned work, with a ranked list and suggested actions by account team | chosen | Meets the 2500 ms envelope at $0.045 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (SLA credits paid) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using one SLA formula.
- Evaluation trap: Scoring at period end only.
- Disputed outage: sLA exclusion is unclear.
- New service: the new service has no breach history.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
