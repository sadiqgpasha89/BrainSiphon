# Vendor Access Policy Violation Detection: use-case brief

> Generated from the blueprint `healthcare/vendor-access-policy-violation-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vendor Access Policy Violation Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect access attempts that conflict with approved hours, locations, credentials, visit purpose or restricted-area rules, with an evidence timeline, a severity and an escalation path for security staff. The system has to run as a scheduled batch job, inside these limits: A deterministic policy engine decides violations and anomaly models are supplemental only, Security personnel review and respond and the system takes no sanction or denial itself and Every violation shows the rule, the event timeline and the authorisation in force.

**Why it is hard.** The obvious approach is a learned violation classifier, and it fails because violations are defined by policy not by pattern. The second trap is in "Evidence": the real signal is timeline of access, authorisation and credential state, while teams usually reach for single event.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 69 at peak, at an estimated $1.8K a month. A mistake is expensive in the way violations reaching restricted areas measures it.

**What success looks like.** Offline: Rule precision and recall against security-confirmed violations, Alert latency at the 95th percentile and Severity ranking agreement with reviewers. Online: Confirmed violations resolved within SLA, Violations reaching restricted areas and False-alert share. The launch is judged on "Confirmed violations resolved within SLA" while "Violations reaching restricted areas" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect access attempts that conflict with approved hours, locations, credentials, visit purpose or restricted-area rules, with an evidence timeline, a severity and an escalation path for security staff.

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

- A deterministic policy engine decides violations and anomaly models are supplemental only
- Security personnel review and respond and the system takes no sanction or denial itself
- Every violation shows the rule, the event timeline and the authorisation in force
- Events are correlated by time and credential state
- Latency under 5 minutes from event to alert for restricted areas
- Retention and privacy limits apply to access logs

## The approach in one paragraph

Start with nightly report of access events outside the scheduled window. Then earn the move to deterministic policy engine with event correlation and credential-state lookups, severity scoring by zone, and a supplementary anomaly ranker for the unmatched residual, producing a violation record with timeline and escalation, and only if it beats the baseline on Rule precision and recall against security-confirmed violations and Alert latency at the 95th percentile after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Authorisation mismatch | Access outside the approved window, area or purpose. Direct violation. Guard against: authorisations as at the event. |
| Add Credential state at event time | Whether required credentials were valid. Invalid credentials make access non-compliant. Guard against: point-in-time status. |
| Add Restricted-area sensitivity | Zone risk class. Severity weighting. Guard against: from the zone register. |
| Run it as one pipeline | Access and authorisation intake (event stream), Policy rule engine (versioned access rules), Event correlator (timeline builder) and Residual anomaly ranker (isolation forest), with Severity and escalation rules, Security review and Case outcome and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle clock skew between systems | Time synchronisation checks and tolerance windows. |

**Deliberately not doing**

- Vendor revenue: irrelevant.
- Badge reader brand: artefact.
- Representative identity: privacy.

**How the approach is proven**

Prove it offline on Rule precision and recall against security-confirmed violations, Alert latency at the 95th percentile and Severity ranking agreement with reviewers using time-ordered splits, then online on "Confirmed violations resolved within SLA" with "Violations reaching restricted areas" as the guardrail. Watch for: Letting an anomaly model define a violation, Comparing events without time alignment and Ignoring late authorisations.

## Baseline and production design

- **Baseline (build this first):** Nightly report of access events outside the scheduled window.
- **Production design:** Deterministic policy engine with event correlation and credential-state lookups, severity scoring by zone, and a supplementary anomaly ranker for the unmatched residual, producing a violation record with timeline and escalation.

## Why AI, and why this kind

**Why AI.** Detect access attempts that conflict with approved hours, locations, credentials, visit purpose or restricted-area rules, with an evidence timeline, a severity and an escalation path for security staff. The evidence that separates good from bad outcomes (Authorisation mismatch, Credential state at event time, Restricted-area sensitivity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A learned violation classifier" are what teams reach for first, and they fail because violations are defined by policy not by pattern. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Deterministic policy engine with event correlation and credential-state lookups, severity scoring by zone, and a supplementary anomaly ranker for the unmatched residual, producing a violation record with timeline and escalation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Authorisation mismatch, Credential state at event time, Restricted-area sensitivity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Nightly report of access events outside the scheduled window | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Deterministic policy engine with event correlation and credential-state lookups, severity scoring by zone, and a supplementary anomaly ranker for the unmatched residual, producing a violation record with timeline and escalation | chosen | Meets the run-window envelope at $0.0098 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Confirmed violations resolved within SLA) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Letting an anomaly model define a violation.
- Evaluation trap: Comparing events without time alignment.
- Clock skew between systems: events look out of order.
- Authorisation entered late: access looks unauthorised.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
