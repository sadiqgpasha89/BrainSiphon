# Physician Availability & Schedule Conflict Detection: use-case brief

> Generated from the blueprint `healthcare/physician-availability-schedule-conflict-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Physician Availability & Schedule Conflict Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect overlapping clinic, operating room, call, telehealth and multi-facility commitments, including travel-time infeasibility, and propose resolutions with the affected appointments and coverage. The system has to run as a scheduled batch job, inside these limits: The scheduling office confirms every change and any patient communication, Conflicts are found by deterministic temporal and spatial checks and not by a model and Resolutions are proposals that list affected appointments.

**Why it is hard.** The obvious approach is learned conflict classifier, and it fails because conflicts are logical facts. The second trap is in "Travel": the real signal is facility travel times with buffers, while teams usually reach for same-day assumption.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way cancelled or delayed appointments from conflicts measures it.

**What success looks like.** Offline: Conflict detection precision and recall on audited schedules, Severity agreement with the scheduling office and Time from schedule change to detection. Online: Conflicts found before patients are affected, Cancelled or delayed appointments from conflicts and Scheduler time per conflict. The launch is judged on "Conflicts found before patients are affected" while "Cancelled or delayed appointments from conflicts" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect overlapping clinic, operating room, call, telehealth and multi-facility commitments, including travel-time infeasibility, and propose resolutions with the affected appointments and coverage.

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

- The scheduling office confirms every change and any patient communication
- Conflicts are found by deterministic temporal and spatial checks and not by a model
- Resolutions are proposals that list affected appointments
- Travel-time assumptions are shown
- Checks 60K scheduled commitments per day
- Schedules are read-only to the detector

## The approach in one paragraph

Start with schedulers find conflicts when physicians or patients complain. Then earn the move to a temporal and spatial rules engine over merged schedule events with travel-time modelling, event correlation across systems and a severity ranker, producing conflict records with proposed fixes for the scheduling office, and only if it beats the baseline on Conflict detection precision and recall on audited schedules and Severity agreement with the scheduling office after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Overlap duration | Minutes of overlap between commitments. Defines the conflict. Guard against: event times. |
| Add Travel infeasibility margin | Travel time plus buffer against the gap between commitments. Detects impossible moves. Guard against: travel-time table version. |
| Add Privilege and site eligibility | Whether the physician may practise at the site. Invalid assignments. Guard against: privilege register. |
| Run it as one pipeline | Schedule event intake (scheduling feeds), Event normaliser and merger (identity and time rules), Temporal and spatial conflict checker (deterministic rules), Severity ranker (gradient boosting), Fix proposer (rules) and Change and outcome log (scheduling system), with Scheduling office review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle time zone difference between systems | Single time standard on ingest. |

**Deliberately not doing**

- Commitment title: label.
- Entry time: process artefact.
- Physician seniority: not a conflict factor.

**How the approach is proven**

Prove it offline on Conflict detection precision and recall on audited schedules, Severity agreement with the scheduling office and Time from schedule change to detection using time-ordered splits, then online on "Conflicts found before patients are affected" with "Cancelled or delayed appointments from conflicts" as the guardrail. Watch for: Using a model for logical conflicts, Ignoring travel time and Rescheduling without office confirmation.

## Baseline and production design

- **Baseline (build this first):** Schedulers find conflicts when physicians or patients complain.
- **Production design:** A temporal and spatial rules engine over merged schedule events with travel-time modelling, event correlation across systems and a severity ranker, producing conflict records with proposed fixes for the scheduling office.

## Why AI, and why this kind

**Why AI.** Detect overlapping clinic, operating room, call, telehealth and multi-facility commitments, including travel-time infeasibility, and propose resolutions with the affected appointments and coverage. The evidence that separates good from bad outcomes (Overlap duration, Travel infeasibility margin, Privilege and site eligibility) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "learned conflict classifier" are what teams reach for first, and they fail because conflicts are logical facts. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A temporal and spatial rules engine over merged schedule events with travel-time modelling, event correlation across systems and a severity ranker, producing conflict records with proposed fixes for the scheduling office.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Overlap duration, Travel infeasibility margin, Privilege and site eligibility and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Schedulers find conflicts when physicians or patients complain | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A temporal and spatial rules engine over merged schedule events with travel-time modelling, event correlation across systems and a severity ranker, producing conflict records with proposed fixes for the scheduling office | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Conflicts found before patients are affected) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using a model for logical conflicts.
- Evaluation trap: Ignoring travel time.
- Time zone difference between systems: false overlaps.
- Telehealth from a remote site: travel rules do not apply.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
