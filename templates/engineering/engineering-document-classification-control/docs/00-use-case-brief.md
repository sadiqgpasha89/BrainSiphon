# Engineering Document Classification and Control: use-case brief

> Generated from the blueprint `engineering/engineering-document-classification-control` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Engineering Document Classification and Control · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify incoming project documents by type, discipline and revision, check metadata against naming rules and route them to the right reviewers and folders. The system has to run as a scheduled batch job, inside these limits: Low-confidence items go to document controllers, Controlled revisions never overwritten and Metadata checked against naming standards.

**Why it is hard.** The obvious approach is file names, and it fails because names are inconsistent. The second trap is in "Control": the real signal is document controller approval for controlled sets, while teams usually reach for automatic release.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.9K a month. A mistake is expensive in the way misfiled documents measures it.

**What success looks like.** Offline: Classification accuracy, Revision extraction accuracy and Misfile rate. Online: Document handling time, Misfiled documents and Rework from wrong revisions. The launch is judged on "Document handling time" while "Misfiled documents" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify incoming project documents by type, discipline and revision, check metadata against naming rules and route them to the right reviewers and folders.

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

- Low-confidence items go to document controllers
- Controlled revisions never overwritten
- Metadata checked against naming standards
- Classification of 50K documents per month
- Audit trail for every move

## The approach in one paragraph

Start with document controllers sorting and renaming files by hand, because it is the usual process. Then earn the move to a classification and metadata service with confidence routing and rule checks that proposes filing and reviewer lists and leaves controlled releases to document controllers, and only if it beats the baseline on Classification accuracy and Revision extraction accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Title block and header text | Document number and revision. Core. Guard against: from extraction. |
| Add Content type | Drawing, report, calculation or certificate. Core. Guard against: from a classifier. |
| Add Discipline | Structural, mechanical or electrical. Routing. Guard against: from classification. |
| Run it as one pipeline | Document intake (transmittal), Text and layout extraction (OCR), Type and discipline classifier (transformer), Naming and revision check (rules), Routing proposal (workflow) and Controller approval (document system), with Audit log off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing title block | Controller queue. |

**Deliberately not doing**

- Sender name: personal data.
- File size: weak link.
- Email subject wording: weak link.

**How the approach is proven**

Prove it offline on Classification accuracy, Revision extraction accuracy and Misfile rate using time-ordered splits, then online on "Document handling time" with "Misfiled documents" as the guardrail. Watch for: File name as label, Automatic release and Overwriting controlled revisions.

## Baseline and production design

- **Baseline (build this first):** Document controllers sorting and renaming files by hand, because it is the usual process.
- **Production design:** A classification and metadata service with confidence routing and rule checks that proposes filing and reviewer lists and leaves controlled releases to document controllers.

## Why AI, and why this kind

**Why AI.** Classify incoming project documents by type, discipline and revision, check metadata against naming rules and route them to the right reviewers and folders. The evidence that separates good from bad outcomes (Title block and header text, Content type, Discipline) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "file names" are what teams reach for first, and they fail because names are inconsistent. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A classification and metadata service with confidence routing and rule checks that proposes filing and reviewer lists and leaves controlled releases to document controllers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Title block and header text, Content type, Discipline and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Document controllers sorting and renaming files by hand, because it is the usual process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A classification and metadata service with confidence routing and rule checks that proposes filing and reviewer lists and leaves controlled releases to document controllers | chosen | Meets the run-window envelope at $0.105 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Document handling time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: File name as label.
- Evaluation trap: Automatic release.
- Missing title block: metadata cannot be read.
- Revision clash: two documents claim the same revision.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
