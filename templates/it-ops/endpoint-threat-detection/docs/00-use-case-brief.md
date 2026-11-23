# Endpoint Threat Detection: use-case brief

> Generated from the blueprint `it-ops/endpoint-threat-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Endpoint Threat Detection · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect malicious behaviour on devices from process, file and network events and alert analysts with the process tree, using device and process signals and not employee activity profiles. The system has to run interactively, within a few seconds, inside these limits: Detection within 60 s of the behaviour, Containment only after analyst or pre-approved policy and Device-level signals only.

**Why it is hard.** The obvious approach is detection rule hits, and it fails because rules include benign tools. The second trap is in "Scope": the real signal is process and file behaviour, while teams usually reach for employee browsing or content.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.8K a month. A mistake is expensive in the way dwell time measures it.

**What success looks like.** Offline: Detection on red team replays, False alert rate and Time to detect. Online: Incidents detected, Dwell time and Analyst false alert time. The launch is judged on "Incidents detected" while "Dwell time" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect malicious behaviour on devices from process, file and network events and alert analysts with the process tree, using device and process signals and not employee activity profiles.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Detection within 60 s of the behaviour
- Containment only after analyst or pre-approved policy
- Device-level signals only
- False alerts under 1 per 1,000 devices per day
- 100K devices

## The approach in one paragraph

Start with signature antivirus and static rules, because they are the standard controls. Then earn the move to a behaviour model on endpoint telemetry with device-role baselines, analyst alerts with process trees and pre-approved isolation for high-confidence cases, and only if it beats the baseline on Detection on red team replays and False alert rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Process lineage anomaly | Unusual parent and child processes. Core. Guard against: from endpoint events. |
| Add Persistence and credential access behaviour | Registry and credential store access. Core. Guard against: from endpoint events. |
| Add Network destination reputation | Rarity and reputation of destinations. Support. Guard against: from threat feeds. |
| Run it as one pipeline | Endpoint event stream (agents), Process tree building (stream processing), Behaviour model (graph and sequence model), Alert tiering (rules), Isolation by policy (endpoint platform) and Detection tuning (monthly), with Analyst review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle admin tools | Role-based baselines and allow-lists. |

**Deliberately not doing**

- Employee name: personal data.
- Hostname: an identifier.
- Browser history: privacy-invasive.

**How the approach is proven**

Prove it offline on Detection on red team replays, False alert rate and Time to detect using time-ordered splits, then online on "Incidents detected" with "Dwell time" as the guardrail. Watch for: Content monitoring, Rule hits as labels and Automatic wipes.

## Baseline and production design

- **Baseline (build this first):** Signature antivirus and static rules, because they are the standard controls.
- **Production design:** A behaviour model on endpoint telemetry with device-role baselines, analyst alerts with process trees and pre-approved isolation for high-confidence cases.

## Why AI, and why this kind

**Why AI.** Detect malicious behaviour on devices from process, file and network events and alert analysts with the process tree, using device and process signals and not employee activity profiles. The evidence that separates good from bad outcomes (Process lineage anomaly, Persistence and credential access behaviour, Network destination reputation) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "detection rule hits" are what teams reach for first, and they fail because rules include benign tools. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A behaviour model on endpoint telemetry with device-role baselines, analyst alerts with process trees and pre-approved isolation for high-confidence cases.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Process lineage anomaly, Persistence and credential access behaviour, Network destination reputation and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Signature antivirus and static rules, because they are the standard controls | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A behaviour model on endpoint telemetry with device-role baselines, analyst alerts with process trees and pre-approved isolation for high-confidence cases | chosen | Meets the 2500 ms envelope at $0.042 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Incidents detected) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Content monitoring.
- Evaluation trap: Rule hits as labels.
- Admin tools: legitimate scripts look malicious.
- Offline device: telemetry is delayed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
