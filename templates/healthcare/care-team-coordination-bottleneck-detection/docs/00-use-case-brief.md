# Care-Team Coordination Bottleneck Detection: use-case brief

> Generated from the blueprint `healthcare/care-team-coordination-bottleneck-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Care-Team Coordination Bottleneck Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify delays in handoffs, referrals, discharges, consults and cross-team coordination, and show process owners the bottleneck stage, the delay drivers and the pathways affected. The system has to run as a scheduled batch job, inside these limits: Process owners validate findings and redesign workflows and the analytics change no workflow, Results are aggregated to pathways, stages and teams and are not used to rate individuals and Service-level definitions are versioned and agreed with owners.

**Why it is hard.** The obvious approach is raw event dump, and it fails because process mining needs consistent cases. The second trap is in "Bottleneck": the real signal is stage waiting time against the service level, while teams usually reach for total case time.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way discharge or referral delays measures it.

**What success looks like.** Offline: Stage-delay detection agreement with process owner review, Event-log completeness and Stability of bottleneck rankings across periods. Online: Cycle time for the target pathways, Discharge or referral delays and Improvement actions completed. The launch is judged on "Cycle time for the target pathways" while "Discharge or referral delays" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify delays in handoffs, referrals, discharges, consults and cross-team coordination, and show process owners the bottleneck stage, the delay drivers and the pathways affected.

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

- Process owners validate findings and redesign workflows and the analytics change no workflow
- Results are aggregated to pathways, stages and teams and are not used to rate individuals
- Service-level definitions are versioned and agreed with owners
- Delay drivers are associations and are labelled as such
- Analyses 30M workflow events per month
- Patient identifiers are pseudonymised for analytics

## The approach in one paragraph

Start with a manager reviews a monthly report of discharge delays. Then earn the move to event-log cleaning and process mining to map pathways, duration models and statistical anomaly detection on stage waiting times, and a driver analysis that uses context features with associations labelled as such, and only if it beats the baseline on Stage-delay detection agreement with process owner review and Event-log completeness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Stage waiting time | Time between handoff and the next action for each stage. The delay measure. Guard against: event timestamps. |
| Add Handoff volume and queue length | Work waiting at the stage. Load context. Guard against: event stream. |
| Add Variant frequency | Share of cases following each path. Reveals rework and detours. Guard against: event log. |
| Run it as one pipeline | Event extraction (warehouse queries), Event log builder (case and activity rules), Process miner (process discovery), Stage delay analyser (duration and anomaly models) and Driver analysis (gradient boosting with attribution), with Process owner review and Findings and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing timestamps | Completeness checks and exclusion rules. |

**Deliberately not doing**

- Case identifier: label.
- Free-text task notes: noisy.
- Task creator: not a bottleneck factor.

**How the approach is proven**

Prove it offline on Stage-delay detection agreement with process owner review, Event-log completeness and Stability of bottleneck rankings across periods using time-ordered splits, then online on "Cycle time for the target pathways" with "Discharge or referral delays" as the guardrail. Watch for: Reading associations as causes, Rating individuals and Mining incomplete event logs.

## Baseline and production design

- **Baseline (build this first):** A manager reviews a monthly report of discharge delays.
- **Production design:** Event-log cleaning and process mining to map pathways, duration models and statistical anomaly detection on stage waiting times, and a driver analysis that uses context features with associations labelled as such.

## Why AI, and why this kind

**Why AI.** Identify delays in handoffs, referrals, discharges, consults and cross-team coordination, and show process owners the bottleneck stage, the delay drivers and the pathways affected. The evidence that separates good from bad outcomes (Stage waiting time, Handoff volume and queue length, Variant frequency) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw event dump" are what teams reach for first, and they fail because process mining needs consistent cases. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Event-log cleaning and process mining to map pathways, duration models and statistical anomaly detection on stage waiting times, and a driver analysis that uses context features with associations labelled as such.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Stage waiting time, Handoff volume and queue length, Variant frequency and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A manager reviews a monthly report of discharge delays | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Event-log cleaning and process mining to map pathways, duration models and statistical anomaly detection on stage waiting times, and a driver analysis that uses context features with associations labelled as such | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cycle time for the target pathways) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Reading associations as causes.
- Evaluation trap: Rating individuals.
- Missing timestamps: stages look shorter or longer.
- Rework loops: cycle time is inflated.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
