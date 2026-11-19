# Customer Account Health Scoring: use-case brief

> Generated from the blueprint `saas/account-health-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Customer Account Health Scoring · **Domain:** saas · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Combine usage, support, billing and relationship signals into an interpretable health score that CSMs trust and act on. The system has to run as a scheduled batch job, inside these limits: Explainable drivers, Stable week to week and Segment-specific baselines.

**Why it is hard.** The obvious approach is weights set by committee, and it fails because unvalidated health scores drift into noise. The second trap is in "Segments": the real signal is segment-specific baselines (SMB, enterprise), while teams usually reach for one global scoring.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way cSM actions per score alert measures it.

**What success looks like.** Offline: AUC and calibration on renewals and Score stability week to week. Online: Renewal rate of healthy vs unhealthy and CSM actions per score alert. The launch is judged on "Renewal rate of healthy vs unhealthy" while "CSM actions per score alert" must not get worse.

## Objective, loss and constraints

**Business objective.** Combine usage, support, billing and relationship signals into an interpretable health score that CSMs trust and act on.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{retain},p)+\lambda\,\mathrm{MonotonicityPenalty}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{retain} | The label: 1 if the account renewed. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{MonotonicityPenalty} | Penalty when the health score falls even though a positive signal, such as more usage, increased. |

**Hard constraints**

- Explainable drivers
- Stable week to week
- Segment-specific baselines
- Data from 5+ systems

## The approach in one paragraph

Start with weighted checklist score. Then earn the move to monotone GBDT trained on renewal outcomes, with SHAP driver explanations and segment calibration, and only if it beats the baseline on AUC and calibration on renewals and Score stability week to week after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Product adoption breadth | Share of core features used. Value realisation. Guard against: feature definitions. |
| Add Time to value | Days from contract to first key outcome. Onboarding quality. Guard against: event definitions. |
| Add Executive engagement | Sponsor meetings and QBRs held. Relationship. Guard against: cRM. |
| Run it as one pipeline | Source system sync (ELT), Feature mart (dbt), Health model (monotone GBDT), Driver explainer (SHAP), Score publisher (CRM), CSM playbook (human) and Renewal outcomes (labels). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle product telemetry gap after instrumentation change | Telemetry-completeness checks and data-quality flags. |

**Deliberately not doing**

- Total contract value: scale not health.
- CSM name: personal.

**How the approach is proven**

Prove it offline on AUC and calibration on renewals and Score stability week to week using time-ordered splits, then online on "Renewal rate of healthy vs unhealthy" with "CSM actions per score alert" as the guardrail. Watch for: Weights set by hand never validated and Leakage from renewal-related activity.

## Baseline and production design

- **Baseline (build this first):** Weighted checklist score.
- **Production design:** Monotone GBDT trained on renewal outcomes, with SHAP driver explanations and segment calibration.

## Why AI, and why this kind

**Why AI.** Combine usage, support, billing and relationship signals into an interpretable health score that CSMs trust and act on. The evidence that separates good from bad outcomes (Product adoption breadth, Time to value, Executive engagement) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "weights set by committee" are what teams reach for first, and they fail because unvalidated health scores drift into noise. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Monotone GBDT trained on renewal outcomes, with SHAP driver explanations and segment calibration.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Product adoption breadth, Time to value, Executive engagement and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Weighted checklist score | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Monotone GBDT trained on renewal outcomes, with SHAP driver explanations and segment calibration | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Renewal rate of healthy vs unhealthy) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Weights set by hand never validated.
- Evaluation trap: Leakage from renewal-related activity.
- Product telemetry gap after instrumentation change: scores drop for healthy accounts.
- Accounts on multi-year contracts have no renewal signal: model underfits.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
