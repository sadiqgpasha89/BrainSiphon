# Digital Employee Experience Monitoring: use-case brief

> Generated from the blueprint `it-ops/digital-experience-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Digital Employee Experience Monitoring · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Measure application responsiveness, logins and meeting quality from device and network data to find group-level problems and fix them, with data aggregated to groups and never used to rank employees. The system has to run as a scheduled batch job, inside these limits: Data aggregated to groups of at least 20, No individual dashboards and Works council agreed data scope.

**Why it is hard.** The obvious approach is individuals, and it fails because individual scores harm trust. The second trap is in "Use": the real signal is fixing causes, while teams usually reach for productivity measurement.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way tickets per user measures it.

**What success looks like.** Offline: Index validity against survey, Cause attribution accuracy and Aggregation privacy checks. Online: Experience index, Tickets per user and Time to fix systemic issues. The launch is judged on "Experience index" while "Tickets per user" must not get worse.

## Objective, loss and constraints

**Business objective.** Measure application responsiveness, logins and meeting quality from device and network data to find group-level problems and fix them, with data aggregated to groups and never used to rank employees.

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

- Data aggregated to groups of at least 20
- No individual dashboards
- Works council agreed data scope
- Insights reviewed by service owners
- 100K devices

## The approach in one paragraph

Start with survey-based satisfaction reports and ticket counts, because they are the usual measures. Then earn the move to a group-level experience index with root cause pointers by site, application and device class, with access limits and a governance review, and only if it beats the baseline on Index validity against survey and Cause attribution accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Application response times | Latency by application and site. Core. Guard against: from agents. |
| Add Login and sign-in failures | Failure rates. Core. Guard against: from identity logs. |
| Add Meeting quality | Call drops and jitter. Core. Guard against: from collaboration tools. |
| Run it as one pipeline | Experience data (device agents), Aggregation to groups (batch), Index computation (analytics), Cause attribution (rules and model), Service owner dashboard (BI) and Fix tracking (ITSM), with Governance review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle small group | Suppress or merge groups. |

**Deliberately not doing**

- Employee name: personal data.
- Application window titles: privacy-invasive.
- Time online: not experience.

**How the approach is proven**

Prove it offline on Index validity against survey, Cause attribution accuracy and Aggregation privacy checks using time-ordered splits, then online on "Experience index" with "Tickets per user" as the guardrail. Watch for: Individual scores, Productivity claims and Window title capture.

## Baseline and production design

- **Baseline (build this first):** Survey-based satisfaction reports and ticket counts, because they are the usual measures.
- **Production design:** A group-level experience index with root cause pointers by site, application and device class, with access limits and a governance review.

## Why AI, and why this kind

**Why AI.** Measure application responsiveness, logins and meeting quality from device and network data to find group-level problems and fix them, with data aggregated to groups and never used to rank employees. The evidence that separates good from bad outcomes (Application response times, Login and sign-in failures, Meeting quality) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "individuals" are what teams reach for first, and they fail because individual scores harm trust. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A group-level experience index with root cause pointers by site, application and device class, with access limits and a governance review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Application response times, Login and sign-in failures, Meeting quality and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Survey-based satisfaction reports and ticket counts, because they are the usual measures | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A group-level experience index with root cause pointers by site, application and device class, with access limits and a governance review | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Experience index) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Individual scores.
- Evaluation trap: Productivity claims.
- Small group: there are too few people.
- Agent gaps: agents are not on all devices.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
