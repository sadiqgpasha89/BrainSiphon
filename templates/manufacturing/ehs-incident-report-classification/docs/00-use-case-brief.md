# EHS Incident Report Classification: use-case brief

> Generated from the blueprint `manufacturing/ehs-incident-report-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** EHS Incident Report Classification · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify safety incident and near-miss reports by type, severity and cause category so EHS teams find systemic hazards faster. The system has to run interactively, within a few seconds, inside these limits: Severe incidents routed to a person immediately, Report text redacted of names before analytics and Multilingual support.

**Why it is hard.** The obvious approach is free categories, and it fails because reporting must match standards. The second trap is in "Severity": the real signal is potential severity not just actual harm, while teams usually reach for actual outcome only.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $12.3K a month. A mistake is expensive in the way systemic hazards identified measures it.

**What success looks like.** Offline: Recall for high-potential reports at fixed precision, Category accuracy by language and Redaction recall. Online: Time to route severe reports, Systemic hazards identified and Reporting rate. The launch is judged on "Time to route severe reports" while "Systemic hazards identified" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify safety incident and near-miss reports by type, severity and cause category so EHS teams find systemic hazards faster.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Severe incidents routed to a person immediately
- Report text redacted of names before analytics
- Multilingual support
- 8K reports per month

## The approach in one paragraph

Start with keyword rules by hazard category, because eHS teams use similar lists. Then earn the move to a multilingual classifier for category and potential severity with a rule layer for mandatory escalations, redaction before storage and trend dashboards by hazard and area, and only if it beats the baseline on Recall for high-potential reports at fixed precision and Category accuracy by language after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Hazard and energy source terms | Named hazards such as pressure, height or moving parts. Category evidence. Guard against: maintain a lexicon. |
| Add Potential severity cues | Phrases indicating what could have happened. Severity. Guard against: reviewed labels. |
| Add Work activity | Task and equipment. Context. Guard against: from the report form. |
| Run it as one pipeline | Redaction (pattern and model), Rule layer for mandatory cases (rule engine), Classifier (multilingual transformer) and Trend analytics (BI), with Report intake, Routing and queue and Review sample off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle underreported incidents | Show reporting rates by area and encourage reporting. |

**Deliberately not doing**

- Reporter name: privacy risk.
- Report length: not severity.
- Language of the report: needs per-language handling.

**How the approach is proven**

Prove it offline on Recall for high-potential reports at fixed precision, Category accuracy by language and Redaction recall using time-ordered splits, then online on "Time to route severe reports" with "Systemic hazards identified" as the guardrail. Watch for: Classifying by outcome only, Named analytics and No rule layer for mandatory cases.

## Baseline and production design

- **Baseline (build this first):** Keyword rules by hazard category, because EHS teams use similar lists.
- **Production design:** A multilingual classifier for category and potential severity with a rule layer for mandatory escalations, redaction before storage and trend dashboards by hazard and area.

## Why AI, and why this kind

**Why AI.** Classify safety incident and near-miss reports by type, severity and cause category so EHS teams find systemic hazards faster. The evidence that separates good from bad outcomes (Hazard and energy source terms, Potential severity cues, Work activity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free categories" are what teams reach for first, and they fail because reporting must match standards. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A multilingual classifier for category and potential severity with a rule layer for mandatory escalations, redaction before storage and trend dashboards by hazard and area.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Hazard and energy source terms, Potential severity cues, Work activity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword rules by hazard category, because EHS teams use similar lists | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A multilingual classifier for category and potential severity with a rule layer for mandatory escalations, redaction before storage and trend dashboards by hazard and area | chosen | Meets the 2500 ms envelope at $0.455 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to route severe reports) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Classifying by outcome only.
- Evaluation trap: Named analytics.
- Underreported incidents: reports are missing.
- Ambiguous text: classes overlap.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
