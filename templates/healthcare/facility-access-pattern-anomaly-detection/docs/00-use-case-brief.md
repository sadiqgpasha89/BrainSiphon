# Facility Access Pattern Anomaly Detection: use-case brief

> Generated from the blueprint `healthcare/facility-access-pattern-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Facility Access Pattern Anomaly Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect unusual access patterns across facilities, staff, contractors and authorised visitors, show the affected access path and evidence, and send the case to security triage with hard policy checks run first. The system has to run as a scheduled batch job, inside these limits: Hard policy checks run first and anomaly findings never decide a violation, Security triages and the system never sanctions anyone and Privacy, retention and labour-policy safeguards apply and findings are minimised and role-based.

**Why it is hard.** The obvious approach is anomaly score as a rule breach, and it fails because policy is a fact and anomaly is a hint. The second trap is in "Context": the real signal is shift schedule, role and event calendar, while teams usually reach for raw badge events.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way triage time per alert measures it.

**What success looks like.** Offline: Precision and recall of triaged findings at the alert budget, Path-explanation usefulness rating and Rule-versus-model agreement. Online: Confirmed findings per 1000 alerts, Triage time per alert and Reader and policy issues discovered. The launch is judged on "Confirmed findings per 1000 alerts" while "Triage time per alert" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect unusual access patterns across facilities, staff, contractors and authorised visitors, show the affected access path and evidence, and send the case to security triage with hard policy checks run first.

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

- Hard policy checks run first and anomaly findings never decide a violation
- Security triages and the system never sanctions anyone
- Privacy, retention and labour-policy safeguards apply and findings are minimised and role-based
- Alerts show the access path and the baseline
- Individual-level flags require a documented purpose and review
- Scores 10M access events nightly

## The approach in one paragraph

Start with a report of badge use outside the shift window. Then earn the move to policy checks first, then a sequence and graph anomaly model over role-conditioned baselines to rank residual patterns with path explanations, wrapped in a triage workflow with privacy controls and retention limits, and only if it beats the baseline on Precision and recall of triaged findings at the alert budget and Path-explanation usefulness rating after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Path novelty | Whether the zone sequence is unseen for the identity and role. Detects off-pattern routes. Guard against: past paths. |
| Add Schedule alignment | Access time relative to the rostered shift. Separates normal from off-shift access. Guard against: roster snapshot. |
| Add Role-zone fit | Zones accessed against the role's allowed set. Strong policy signal. Guard against: role as of the event. |
| Run it as one pipeline | Access event intake (access control stream), Policy rule checks (role and zone rules), Context joiner for shifts and roles (feature store), Sequence and graph anomaly model (isolation forest with path features), Explanation builder (path and baseline view) and Security triage (human), with Case and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle reorganisation changes roles | Role versioning and a re-baseline window. |

**Deliberately not doing**

- Employee demographics: protected.
- Badge issue date: not behaviour.
- Reader vendor: artefact.

**How the approach is proven**

Prove it offline on Precision and recall of triaged findings at the alert budget, Path-explanation usefulness rating and Rule-versus-model agreement using time-ordered splits, then online on "Confirmed findings per 1000 alerts" with "Triage time per alert" as the guardrail. Watch for: Treating anomalies as violations, Ignoring shift context and Retaining badge data beyond the stated purpose.

## Baseline and production design

- **Baseline (build this first):** A report of badge use outside the shift window.
- **Production design:** Policy checks first, then a sequence and graph anomaly model over role-conditioned baselines to rank residual patterns with path explanations, wrapped in a triage workflow with privacy controls and retention limits.

## Why AI, and why this kind

**Why AI.** Detect unusual access patterns across facilities, staff, contractors and authorised visitors, show the affected access path and evidence, and send the case to security triage with hard policy checks run first. The evidence that separates good from bad outcomes (Path novelty, Schedule alignment, Role-zone fit) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "anomaly score as a rule breach" are what teams reach for first, and they fail because policy is a fact and anomaly is a hint. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Policy checks first, then a sequence and graph anomaly model over role-conditioned baselines to rank residual patterns with path explanations, wrapped in a triage workflow with privacy controls and retention limits.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Path novelty, Schedule alignment, Role-zone fit and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A report of badge use outside the shift window | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Policy checks first, then a sequence and graph anomaly model over role-conditioned baselines to rank residual patterns with path explanations, wrapped in a triage workflow with privacy controls and retention limits | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Confirmed findings per 1000 alerts) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating anomalies as violations.
- Evaluation trap: Ignoring shift context.
- Reorganisation changes roles: baselines mislead.
- Large event or drill: many unusual paths.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
