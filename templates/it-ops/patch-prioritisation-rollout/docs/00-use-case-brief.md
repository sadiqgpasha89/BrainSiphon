# Patch Prioritisation and Rollout Planning: use-case brief

> Generated from the blueprint `it-ops/patch-prioritisation-rollout` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patch Prioritisation and Rollout Planning · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Prioritise patches by exploit risk, exposure and business criticality and plan staged rollouts with test rings, for change approvers to confirm. The system has to run as a scheduled batch job, inside these limits: Actively exploited vulnerabilities patched within 7 days, Staged rings with health gates and Approvers confirm each wave.

**Why it is hard.** The obvious approach is cVSS score alone, and it fails because many high scores are not exploited. The second trap is in "Rollout": the real signal is rings with health checks, while teams usually reach for all at once.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way failed patch rollouts measures it.

**What success looks like.** Offline: Priority accuracy against exploitation, Ring failure rate and Time to patch critical items. Online: Time to patch exploited flaws, Failed patch rollouts and Exposed unpatched systems. The launch is judged on "Time to patch exploited flaws" while "Failed patch rollouts" must not get worse.

## Objective, loss and constraints

**Business objective.** Prioritise patches by exploit risk, exposure and business criticality and plan staged rollouts with test rings, for change approvers to confirm.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RankLoss} | Ranking loss: penalises placing a less relevant item above a more relevant one. |

**Hard constraints**

- Actively exploited vulnerabilities patched within 7 days
- Staged rings with health gates
- Approvers confirm each wave
- Rollback plan for every wave
- 100K systems

## The approach in one paragraph

Start with monthly patch cycles by severity band, because they are the standard cadence. Then earn the move to a prioritisation model with exposure and exploit data, ring-based rollout plans, health gates and change records for each wave, and only if it beats the baseline on Priority accuracy against exploitation and Ring failure rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Exploit status | Known exploitation. Urgency. Guard against: from threat feeds. |
| Add Exposure | Internet-facing or internal. Impact. Guard against: from the CMDB. |
| Add System criticality | Service tier. Impact. Guard against: from the catalogue. |
| Run it as one pipeline | Patch and vulnerability intake (scanners), Exposure join (CMDB), Priority model (gradient boosting), Ring plan (planner), Change approval (ITSM) and Rollout with health gates (patch tool), with Compliance reporting off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle unpatchable system | Compensating controls. |

**Deliberately not doing**

- Patch vendor name: weak link.
- Hostname: an identifier.
- Owner name: personal data.

**How the approach is proven**

Prove it offline on Priority accuracy against exploitation, Ring failure rate and Time to patch critical items using time-ordered splits, then online on "Time to patch exploited flaws" with "Failed patch rollouts" as the guardrail. Watch for: CVSS-only priority, All-at-once rollouts and Automatic installs without approval.

## Baseline and production design

- **Baseline (build this first):** Monthly patch cycles by severity band, because they are the standard cadence.
- **Production design:** A prioritisation model with exposure and exploit data, ring-based rollout plans, health gates and change records for each wave.

## Why AI, and why this kind

**Why AI.** Prioritise patches by exploit risk, exposure and business criticality and plan staged rollouts with test rings, for change approvers to confirm. The evidence that separates good from bad outcomes (Exploit status, Exposure, System criticality) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "CVSS score alone" are what teams reach for first, and they fail because many high scores are not exploited. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A prioritisation model with exposure and exploit data, ring-based rollout plans, health gates and change records for each wave.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Exploit status, Exposure, System criticality and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Monthly patch cycles by severity band, because they are the standard cadence | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A prioritisation model with exposure and exploit data, ring-based rollout plans, health gates and change records for each wave | chosen | Meets the run-window envelope at $0.038 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to patch exploited flaws) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: CVSS-only priority.
- Evaluation trap: All-at-once rollouts.
- Unpatchable system: a legacy system cannot take the patch.
- Failed ring: a patch breaks a ring.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
