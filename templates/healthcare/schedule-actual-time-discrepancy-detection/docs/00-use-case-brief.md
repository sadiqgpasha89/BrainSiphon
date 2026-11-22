# Schedule vs Actual Time Discrepancy Detection: use-case brief

> Generated from the blueprint `healthcare/schedule-actual-time-discrepancy-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Schedule vs Actual Time Discrepancy Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify missed punches, schedule deviations, unapproved overtime, duplicate time entries and reconciliation exceptions before payroll closes, with a supporting timeline and a documented correction path. The system has to run as a scheduled batch job, inside these limits: Deterministic reconciliation rules run first and anomaly models only rank the rest, The system never infers intent or wrongdoing and describes discrepancies neutrally and Employee or manager correction and documented adjudication precede any payroll change.

**Why it is hard.** The obvious approach is a model that learns what is wrong, and it fails because payroll must explain every exception by a rule. The second trap is in "Language": the real signal is neutral discrepancy with evidence, while teams usually reach for fraud or intent labels.

**Scale and stakes.** At 10 million users this is about 800.0K model-touching events a day, 9 requests per second on average and 9 at peak, at an estimated $1.6K a month. A mistake is expensive in the way post-payment recoveries avoided measures it.

**What success looks like.** Offline: Precision and recall of exceptions against payroll adjudication, Payroll-effect error and Share of exceptions explained by a rule. Online: Corrections before payroll close, Post-payment recoveries avoided and Exception resolution time. The launch is judged on "Corrections before payroll close" while "Post-payment recoveries avoided" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify missed punches, schedule deviations, unapproved overtime, duplicate time entries and reconciliation exceptions before payroll closes, with a supporting timeline and a documented correction path.

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

- Deterministic reconciliation rules run first and anomaly models only rank the rest
- The system never infers intent or wrongdoing and describes discrepancies neutrally
- Employee or manager correction and documented adjudication precede any payroll change
- Badge data is used only where policy and labour agreements permit
- Every exception carries a timeline and the rule or model version
- Nightly run over 800K records of punches

## The approach in one paragraph

Start with payroll rule report of missing and overlapping punches. Then earn the move to deterministic reconciliation rules plus an event-correlation layer and an anomaly ranker on the residual, producing an exception record with a timeline, confidence and estimated pay impact, and only if it beats the baseline on Precision and recall of exceptions against payroll adjudication and Payroll-effect error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Punch-to-schedule delta | Minutes between scheduled and actual start and end. The basic measure of a deviation. Guard against: use punch time not the entry time. |
| Add Edit history | Number and recency of manual edits to a record. Edited records need review before pay. Guard against: use only edits logged before scoring. |
| Add Duplicate signature | Same person with overlapping or near-identical entries. Detects double entry. Guard against: match on pseudonymous ID and time window. |
| Run it as one pipeline | Schedule and punch intake (SFTP and REST extracts), Reconciliation rule engine (versioned rules), Event correlator (timeline builder), Exception ranker (isolation forest on residuals) and Impact estimator (pay-rule calculator), with Manager and payroll review and Adjudication log and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle daylight-saving change | Time-zone aware storage in UTC with local rendering. |

**Deliberately not doing**

- Employee tenure or role seniority: irrelevant to a rule breach and a fairness risk.
- Historic flag count per person: self-reinforcing and punitive.
- Time-clock location: explains process not discrepancy.

**How the approach is proven**

Prove it offline on Precision and recall of exceptions against payroll adjudication, Payroll-effect error and Share of exceptions explained by a rule using time-ordered splits, then online on "Corrections before payroll close" with "Post-payment recoveries avoided" as the guardrail. Watch for: Training on already-corrected data, Labelling dispute outcomes as ground truth and Using badge data outside policy.

## Baseline and production design

- **Baseline (build this first):** Payroll rule report of missing and overlapping punches.
- **Production design:** Deterministic reconciliation rules plus an event-correlation layer and an anomaly ranker on the residual, producing an exception record with a timeline, confidence and estimated pay impact.

## Why AI, and why this kind

**Why AI.** Identify missed punches, schedule deviations, unapproved overtime, duplicate time entries and reconciliation exceptions before payroll closes, with a supporting timeline and a documented correction path. The evidence that separates good from bad outcomes (Punch-to-schedule delta, Edit history, Duplicate signature) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A model that learns what is wrong" are what teams reach for first, and they fail because payroll must explain every exception by a rule. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Deterministic reconciliation rules plus an event-correlation layer and an anomaly ranker on the residual, producing an exception record with a timeline, confidence and estimated pay impact.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Punch-to-schedule delta, Edit history, Duplicate signature and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Payroll rule report of missing and overlapping punches | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Deterministic reconciliation rules plus an event-correlation layer and an anomaly ranker on the residual, producing an exception record with a timeline, confidence and estimated pay impact | chosen | Meets the run-window envelope at $0.068 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Corrections before payroll close) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on already-corrected data.
- Evaluation trap: Labelling dispute outcomes as ground truth.
- Daylight-saving change: shifts appear to overlap or vanish.
- Offline time clock: punches arrive hours late.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
