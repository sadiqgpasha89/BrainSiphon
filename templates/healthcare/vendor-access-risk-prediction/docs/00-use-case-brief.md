# Vendor Access Risk Prediction: use-case brief

> Generated from the blueprint `healthcare/vendor-access-risk-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vendor Access Risk Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify unusual vendor access patterns, such as unexpected location, time or frequency and policy deviations, so security staff can review with explainable context and no automatic accusation. The system has to run as a scheduled batch job, inside these limits: A strict allow-list and policy rules decide violations and anomaly models are supplemental, No automatic accusation or punitive action and security staff investigate and Alerts explain which pattern was unusual and the baseline.

**Why it is hard.** The obvious approach is anomaly score as the finding, and it fails because a policy breach is a fact not a probability. The second trap is in "Baseline": the real signal is per-vendor and per-zone behaviour baseline, while teams usually reach for global thresholds.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way reviewer time per alert measures it.

**What success looks like.** Offline: Precision and recall of confirmed review findings at the alert budget, Rule-versus-model agreement and Explanation usefulness rating from reviewers. Online: Confirmed policy exceptions found, Reviewer time per alert and False-alarm rate. The launch is judged on "Confirmed policy exceptions found" while "Reviewer time per alert" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify unusual vendor access patterns, such as unexpected location, time or frequency and policy deviations, so security staff can review with explainable context and no automatic accusation.

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

- A strict allow-list and policy rules decide violations and anomaly models are supplemental
- No automatic accusation or punitive action and security staff investigate
- Alerts explain which pattern was unusual and the baseline
- Privacy, retention and labour-policy safeguards apply to access data
- Per-reviewer alert budget
- Scores 3M access events nightly

## The approach in one paragraph

Start with report of vendor access outside scheduled hours. Then earn the move to a policy allow-list and rule engine for hard violations, a temporal and graph-based anomaly model over per-vendor baselines for the rest, and a reviewer view that shows the baseline, the unusual pattern and the authorisation context, and only if it beats the baseline on Precision and recall of confirmed review findings at the alert budget and Rule-versus-model agreement after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Time and zone deviation | Distance of a visit from the vendor's usual time and zones. The primary behavioural signal. Guard against: baselines from earlier periods. |
| Add Frequency change | Change in visit rate against the vendor baseline. Detects drift in activity. Guard against: trailing windows. |
| Add Access path novelty | Whether the sequence of zones is new for the vendor. Graph path anomaly. Guard against: past paths only. |
| Run it as one pipeline | Access event intake (access control stream), Policy and allow-list rules (role-based policy rules), Baseline builder (per-vendor profiles), Sequence and graph anomaly detector (isolation forest with graph paths) and Explanation builder (rule trace and baseline view), with Security reviewer and Case outcome and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new vendor | Peer-group baseline with low confidence. |

**Deliberately not doing**

- Vendor company name: irrelevant to behaviour.
- Individual representative demographics: protected.
- Badge reader brand: hardware artefact.

**How the approach is proven**

Prove it offline on Precision and recall of confirmed review findings at the alert budget, Rule-versus-model agreement and Explanation usefulness rating from reviewers using time-ordered splits, then online on "Confirmed policy exceptions found" with "Reviewer time per alert" as the guardrail. Watch for: Training on investigated cases only, Treating anomalies as violations and Ignoring planned work context.

## Baseline and production design

- **Baseline (build this first):** Report of vendor access outside scheduled hours.
- **Production design:** A policy allow-list and rule engine for hard violations, a temporal and graph-based anomaly model over per-vendor baselines for the rest, and a reviewer view that shows the baseline, the unusual pattern and the authorisation context.

## Why AI, and why this kind

**Why AI.** Identify unusual vendor access patterns, such as unexpected location, time or frequency and policy deviations, so security staff can review with explainable context and no automatic accusation. The evidence that separates good from bad outcomes (Time and zone deviation, Frequency change, Access path novelty) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "anomaly score as the finding" are what teams reach for first, and they fail because A policy breach is a fact not a probability. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A policy allow-list and rule engine for hard violations, a temporal and graph-based anomaly model over per-vendor baselines for the rest, and a reviewer view that shows the baseline, the unusual pattern and the authorisation context.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Time and zone deviation, Frequency change, Access path novelty and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Report of vendor access outside scheduled hours | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A policy allow-list and rule engine for hard violations, a temporal and graph-based anomaly model over per-vendor baselines for the rest, and a reviewer view that shows the baseline, the unusual pattern and the authorisation context | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Confirmed policy exceptions found) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on investigated cases only.
- Evaluation trap: Treating anomalies as violations.
- New vendor: no baseline.
- Emergency repair outside normal hours: pattern is legitimate.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
