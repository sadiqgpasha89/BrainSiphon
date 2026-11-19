# SaaS Account Security Anomaly Detection: use-case brief

> Generated from the blueprint `saas/saas-account-security-anomalies` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SaaS Account Security Anomaly Detection · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect compromised end-user and admin accounts in a multi-tenant SaaS and offer tenants risk signals and automated responses. The system has to run in under 100 milliseconds, inside these limits: Per-tenant privacy, Real-time decisions and Customer-configurable policies.

**Why it is hard.** The obvious approach is global anomaly model, and it fails because normal differs by tenant and role. The second trap is in "Response": the real signal is customer-defined policy actions, while teams usually reach for fixed vendor action.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 1.0K at peak, at an estimated $4.0K a month. A mistake is expensive in the way admin-reported false alerts measures it.

**What success looks like.** Offline: Detection recall at fixed alert rate and Tenant-level precision. Online: Account takeovers detected and Admin-reported false alerts. The launch is judged on "Account takeovers detected" while "Admin-reported false alerts" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect compromised end-user and admin accounts in a multi-tenant SaaS and offer tenants risk signals and automated responses.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Per-tenant privacy
- Real-time decisions
- Customer-configurable policies
- Explainable alerts

## The approach in one paragraph

Start with geo-IP rules and impossible travel. Then earn the move to streaming per-tenant behavioural models with risk scores, tenant policy engine and explanations in the admin console, and only if it beats the baseline on Detection recall at fixed alert rate and Tenant-level precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around New device or location for user | Novelty vs history. Compromise. Guard against: history. |
| Add Sensitive action burst | Exports, permission changes in short time. Takeover. Guard against: window. |
| Add API token creation anomalies | New tokens after login. Persistence. Guard against: event. |
| Run it as one pipeline | Per-user feature state (stream), Risk model (GBDT), Tenant policy engine (rules), Response (revoke or MFA), Admin console (alerts) and Verdicts (labels), with Audit events off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle tenant uses a VPN that changes IP constantly | Tenant-level network profiles. |

**Deliberately not doing**

- Browser version: noisy.
- Login hour: weak.

**How the approach is proven**

Prove it offline on Detection recall at fixed alert rate and Tenant-level precision using time-ordered splits, then online on "Account takeovers detected" with "Admin-reported false alerts" as the guardrail. Watch for: Labels only from reported takeovers and Tenant heterogeneity ignored.

## Baseline and production design

- **Baseline (build this first):** Geo-IP rules and impossible travel.
- **Production design:** Streaming per-tenant behavioural models with risk scores, tenant policy engine and explanations in the admin console.

## Why AI, and why this kind

**Why AI.** Detect compromised end-user and admin accounts in a multi-tenant SaaS and offer tenants risk signals and automated responses. The evidence that separates good from bad outcomes (New device or location for user, Sensitive action burst, API token creation anomalies) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "global anomaly model" are what teams reach for first, and they fail because normal differs by tenant and role. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Streaming per-tenant behavioural models with risk scores, tenant policy engine and explanations in the admin console.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among New device or location for user, Sensitive action burst, API token creation anomalies and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Geo-IP rules and impossible travel | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Streaming per-tenant behavioural models with risk scores, tenant policy engine and explanations in the admin console | chosen | Meets the 80 ms envelope at $0.0088 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Account takeovers detected) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels only from reported takeovers.
- Evaluation trap: Tenant heterogeneity ignored.
- Tenant uses a VPN that changes IP constantly: a tenant-wide VPN rotates IPs constantly and produces a stream of false alarms.
- Cross-tenant model learning could leak: sharing models across tenants could leak one customer's behaviour to another.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
