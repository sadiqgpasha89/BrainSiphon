# Device Posture & Vulnerability Risk Scoring: use-case brief

> Generated from the blueprint `cybersecurity/device-posture-risk-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Device Posture & Vulnerability Risk Scoring · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score every managed device's security posture and likelihood of compromise to drive remediation and access policy. The system has to run as a scheduled batch job, inside these limits: Millions of devices, Heterogeneous agents and Explainable remediation.

**Why it is hard.** The obvious approach is compliance checklist score, and it fails because compliant devices still get compromised. The second trap is in "Actionability": the real signal is rank remediations by risk reduction, while teams usually reach for flat list of findings.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way time to remediate high-risk devices measures it.

**What success looks like.** Offline: AUC for compromise and Remediation leverage. Online: Incidents per 1000 devices and Time to remediate high-risk devices. The launch is judged on "Incidents per 1000 devices" while "Time to remediate high-risk devices" must not get worse.

## Objective, loss and constraints

**Business objective.** Score every managed device's security posture and likelihood of compromise to drive remediation and access policy.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{compromise},p)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{compromise} | The label: 1 if the device was later found to be compromised, 0 if not. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |

**Hard constraints**

- Millions of devices
- Heterogeneous agents
- Explainable remediation
- Privacy

## The approach in one paragraph

Start with compliance checklist score. Then earn the move to gradient-boosted posture model trained on incident outcomes with SHAP-driven remediation ranking, and only if it beats the baseline on AUC for compromise and Remediation leverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Unpatched exploited vulnerabilities | Count of KEV-listed vulns. Exploit risk. Guard against: scan freshness. |
| Add Security tooling health | EDR and disk-encryption status. Defences. Guard against: agent state. |
| Add User behaviour risk | Risky downloads, admin use. Exposure. Guard against: telemetry. |
| Run it as one pipeline | Device telemetry (agents), Feature builder (Spark), Posture model (GBDT), Remediation ranker (SHAP and rules), Policy integration (conditional access), IT ops (human) and Incident outcomes (labels). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle agent outage makes devices look unprotected | Agent-health separation and freshness flags. |

**Deliberately not doing**

- Device name: none.
- OS build only: confounded.

**How the approach is proven**

Prove it offline on AUC for compromise and Remediation leverage using time-ordered splits, then online on "Incidents per 1000 devices" with "Time to remediate high-risk devices" as the guardrail. Watch for: Labels reflect detection capability not true compromise and Using post-incident posture data.

## Baseline and production design

- **Baseline (build this first):** Compliance checklist score.
- **Production design:** Gradient-boosted posture model trained on incident outcomes with SHAP-driven remediation ranking.

## Why AI, and why this kind

**Why AI.** Score every managed device's security posture and likelihood of compromise to drive remediation and access policy. The evidence that separates good from bad outcomes (Unpatched exploited vulnerabilities, Security tooling health, User behaviour risk) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "compliance checklist score" are what teams reach for first, and they fail because compliant devices still get compromised. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient-boosted posture model trained on incident outcomes with SHAP-driven remediation ranking.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Unpatched exploited vulnerabilities, Security tooling health, User behaviour risk and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Compliance checklist score | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient-boosted posture model trained on incident outcomes with SHAP-driven remediation ranking | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Incidents per 1000 devices) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels reflect detection capability not true compromise.
- Evaluation trap: Using post-incident posture data.
- Agent outage makes devices look unprotected: mass false risk.
- Rare incidents give few labels: compromise labels are very rare so the model is unstable and overfits noisy proxies.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
