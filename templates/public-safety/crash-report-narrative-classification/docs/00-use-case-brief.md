# Crash Report Narrative Classification: use-case brief

> Generated from the blueprint `public-safety/crash-report-narrative-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Crash Report Narrative Classification · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify crash report narratives into contributing factors and scenarios so engineers and policy teams study causes beyond the coded fields. The system has to run as a scheduled batch job, inside these limits: Multi-label factors with confidence, Names and plates removed before analysis and Sample audited by safety analysts.

**Why it is hard.** The obvious approach is officer checkboxes, and it fails because checkboxes are inconsistent. The second trap is in "Privacy": the real signal is redacted narratives, while teams usually reach for named narratives.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.9K a month. A mistake is expensive in the way causes found outside codes measures it.

**What success looks like.** Offline: Factor accuracy by class, Redaction recall and Agreement with analysts. Online: Time to study a pattern, Causes found outside codes and Treatment targeting. The launch is judged on "Time to study a pattern" while "Causes found outside codes" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify crash report narratives into contributing factors and scenarios so engineers and policy teams study causes beyond the coded fields.

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

- Multi-label factors with confidence
- Names and plates removed before analysis
- Sample audited by safety analysts
- Quarterly run for 500K reports

## The approach in one paragraph

Start with analysts reading narratives for sample studies, because it is the current method. Then earn the move to a multi-label classifier with redaction and analyst review samples, producing factor counts by location and scenario for safety engineers, and only if it beats the baseline on Factor accuracy by class and Redaction recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Narrative text | Description of the crash. Factors. Guard against: from the report. |
| Add Coded fields | Road, weather and vehicle types. Context. Guard against: from the form. |
| Add Location context | Junction type and speed limit. Context. Guard against: from GIS. |
| Run it as one pipeline | Redaction (pattern and model), Factor classifier (transformer), Confidence filter (rules) and Re-labelling (annual), with Report intake, Analyst sample review and Pattern reports off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle vague narrative | Abstain and flag. |

**Deliberately not doing**

- Officer name: irrelevant.
- Driver name: personal data.
- Report length: weak link.

**How the approach is proven**

Prove it offline on Factor accuracy by class, Redaction recall and Agreement with analysts using time-ordered splits, then online on "Time to study a pattern" with "Causes found outside codes" as the guardrail. Watch for: Checkbox-only labels, Named analysis and Blame framing.

## Baseline and production design

- **Baseline (build this first):** Analysts reading narratives for sample studies, because it is the current method.
- **Production design:** A multi-label classifier with redaction and analyst review samples, producing factor counts by location and scenario for safety engineers.

## Why AI, and why this kind

**Why AI.** Classify crash report narratives into contributing factors and scenarios so engineers and policy teams study causes beyond the coded fields. The evidence that separates good from bad outcomes (Narrative text, Coded fields, Location context) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "officer checkboxes" are what teams reach for first, and they fail because checkboxes are inconsistent. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A multi-label classifier with redaction and analyst review samples, producing factor counts by location and scenario for safety engineers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Narrative text, Coded fields, Location context and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Analysts reading narratives for sample studies, because it is the current method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A multi-label classifier with redaction and analyst review samples, producing factor counts by location and scenario for safety engineers | chosen | Meets the run-window envelope at $0.105 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to study a pattern) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Checkbox-only labels.
- Evaluation trap: Named analysis.
- Vague narrative: the text lacks causes.
- New factor: e-scooter crashes appear.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
