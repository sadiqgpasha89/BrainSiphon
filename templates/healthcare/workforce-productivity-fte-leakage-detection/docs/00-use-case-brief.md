# Workforce Productivity & FTE Leakage Detection: use-case brief

> Generated from the blueprint `healthcare/workforce-productivity-fte-leakage-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Workforce Productivity & FTE Leakage Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect unexplained variance between staffed hours, workload, service volume and approved budgets, and queue it as an investigation lead with an estimated financial exposure and no allegation attached. The system has to run as a scheduled batch job, inside these limits: Variance is normalised for case mix, acuity and local operating conditions before it is flagged, Findings are investigation leads and never allegations of misconduct and Flags are at cost-centre and unit level and never rank individual employees.

**Why it is hard.** The obvious approach is raw hours per patient, and it fails because a sicker unit looks wasteful when it is simply busier. The second trap is in "Data quality": the real signal is missing-punch and mapping gates before analysis, while teams usually reach for flagging every gap as leakage.

**Scale and stakes.** At 10 million users this is about 90.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $1.6K a month. A mistake is expensive in the way time to close an investigation measures it.

**What success looks like.** Offline: Precision of investigation leads at a review budget, Exposure estimate error against closed investigations and Data-defect share of flags. Online: Recovered or explained exposure, Time to close an investigation and Share of leads closed as data defects. The launch is judged on "Recovered or explained exposure" while "Time to close an investigation" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect unexplained variance between staffed hours, workload, service volume and approved budgets, and queue it as an investigation lead with an estimated financial exposure and no allegation attached.

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

- Variance is normalised for case mix, acuity and local operating conditions before it is flagged
- Findings are investigation leads and never allegations of misconduct
- Flags are at cost-centre and unit level and never rank individual employees
- Data-quality gates run before any anomaly model
- Approved productivity definitions are versioned and every alert cites its definition
- Nightly run over 90K records of cost-centre by day

## The approach in one paragraph

Start with static threshold on hours per patient-day against budget. Then earn the move to normalised KPI layer with robust seasonal baselines and a multivariate anomaly model on variance components, a data-quality gate in front and a variance-decomposition explainer behind it, and only if it beats the baseline on Precision of investigation leads at a review budget and Exposure estimate error against closed investigations after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Hours per workload unit | Worked hours divided by acuity-weighted workload. The core productivity ratio after normalisation. Guard against: use the settled workload for the period. |
| Add Variance decomposition | Volume effect, mix effect, rate effect and unexplained residual. Shows where exposure actually lives. Guard against: decomposition must reconcile to the ledger. |
| Add Budget-to-actual drift | Cumulative FTE variance over rolling periods. Persistent drift matters more than single-day noise. Guard against: use closed periods for scoring. |
| Run it as one pipeline | Payroll and volume intake (SFTP extracts), Data-quality gate (validation rules), KPI normaliser (case-mix adjusted metrics), Variance anomaly model (robust seasonal baseline with isolation forest) and Exposure and evidence builder (decomposition), with Finance and operations review and Investigation log and feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle unit changes service mix | Baseline reset on a declared service change with a short burn-in flagged as low confidence. |

**Deliberately not doing**

- Overtime alone: reflects coverage decisions as well as leakage.
- Individual punch patterns: privacy-sensitive and attributes intent.
- Single-day outliers: usually data or event artefacts.

**How the approach is proven**

Prove it offline on Precision of investigation leads at a review budget, Exposure estimate error against closed investigations and Data-defect share of flags using time-ordered splits, then online on "Recovered or explained exposure" with "Time to close an investigation" as the guardrail. Watch for: Calling a data gap a leakage finding, Scoring on unnormalised hours and Reporting individual-level flags.

## Baseline and production design

- **Baseline (build this first):** Static threshold on hours per patient-day against budget.
- **Production design:** Normalised KPI layer with robust seasonal baselines and a multivariate anomaly model on variance components, a data-quality gate in front and a variance-decomposition explainer behind it.

## Why AI, and why this kind

**Why AI.** Detect unexplained variance between staffed hours, workload, service volume and approved budgets, and queue it as an investigation lead with an estimated financial exposure and no allegation attached. The evidence that separates good from bad outcomes (Hours per workload unit, Variance decomposition, Budget-to-actual drift) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw hours per patient" are what teams reach for first, and they fail because A sicker unit looks wasteful when it is simply busier. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Normalised KPI layer with robust seasonal baselines and a multivariate anomaly model on variance components, a data-quality gate in front and a variance-decomposition explainer behind it.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Hours per workload unit, Variance decomposition, Budget-to-actual drift and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static threshold on hours per patient-day against budget | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Normalised KPI layer with robust seasonal baselines and a multivariate anomaly model on variance components, a data-quality gate in front and a variance-decomposition explainer behind it | chosen | Meets the run-window envelope at $0.599 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Recovered or explained exposure) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Calling a data gap a leakage finding.
- Evaluation trap: Scoring on unnormalised hours.
- Unit changes service mix: the baseline no longer applies.
- Payroll system migration: mapping gaps look like leakage.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
