# Engineering Drawing Digitisation: use-case brief

> Generated from the blueprint `engineering/engineering-drawing-digitisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Engineering Drawing Digitisation · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Convert scanned drawings and pipe and instrument diagrams into structured data on symbols, lines, tags and title block fields, with quality checks for engineers to confirm. The system has to run as a scheduled batch job, inside these limits: Every extracted item links back to its place on the drawing, Low-confidence items queued for review and Symbol recall above 97%.

**Why it is hard.** The obvious approach is raw OCR output, and it fails because oCR misreads symbols and tags. The second trap is in "Review": the real signal is checks by connectivity and tag consistency, while teams usually reach for visual spot checks.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $2.0K a month. A mistake is expensive in the way review corrections measures it.

**What success looks like.** Offline: Symbol recall and precision, Connectivity accuracy and Tag accuracy. Online: Time to digitise, Review corrections and Errors found in later use. The launch is judged on "Time to digitise" while "Review corrections" must not get worse.

## Objective, loss and constraints

**Business objective.** Convert scanned drawings and pipe and instrument diagrams into structured data on symbols, lines, tags and title block fields, with quality checks for engineers to confirm.

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

- Every extracted item links back to its place on the drawing
- Low-confidence items queued for review
- Symbol recall above 97%
- Processing of 1M sheets
- Controlled originals unchanged

## The approach in one paragraph

Start with manual redrawing and data entry by drafters, because it is the usual practice. Then earn the move to a vision pipeline that detects symbols, traces connectivity, reads tags and checks consistency, with a review tool and export to engineering data models, and only if it beats the baseline on Symbol recall and precision and Connectivity accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Symbol detections | Symbol classes and positions. Core. Guard against: from a vision model. |
| Add Line connectivity | Pipes and signal lines connecting symbols. Core. Guard against: from line tracing. |
| Add Tag text | Equipment tags and notes. Core. Guard against: from OCR. |
| Run it as one pipeline | Scan intake (document system), Cleaning and deskew (image tools), Symbol and line detection (vision model), Tag OCR (OCR), Consistency checks (rules) and Export (engineering data model), with Reviewer correction off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle poor scan | Quality flags and manual review. |

**Deliberately not doing**

- Drawer name: personal data.
- Scan resolution: an artefact.
- Paper size: weak link.

**How the approach is proven**

Prove it offline on Symbol recall and precision, Connectivity accuracy and Tag accuracy using time-ordered splits, then online on "Time to digitise" with "Review corrections" as the guardrail. Watch for: Raw OCR as truth, Images without data and Spot checks only.

## Baseline and production design

- **Baseline (build this first):** Manual redrawing and data entry by drafters, because it is the usual practice.
- **Production design:** A vision pipeline that detects symbols, traces connectivity, reads tags and checks consistency, with a review tool and export to engineering data models.

## Why AI, and why this kind

**Why AI.** Convert scanned drawings and pipe and instrument diagrams into structured data on symbols, lines, tags and title block fields, with quality checks for engineers to confirm. The evidence that separates good from bad outcomes (Symbol detections, Line connectivity, Tag text) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw OCR output" are what teams reach for first, and they fail because OCR misreads symbols and tags. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A vision pipeline that detects symbols, traces connectivity, reads tags and checks consistency, with a review tool and export to engineering data models.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Symbol detections, Line connectivity, Tag text and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual redrawing and data entry by drafters, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A vision pipeline that detects symbols, traces connectivity, reads tags and checks consistency, with a review tool and export to engineering data models | chosen | Meets the run-window envelope at $0.073 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to digitise) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Raw OCR as truth.
- Evaluation trap: Images without data.
- Poor scan: faded or stained drawings.
- Legacy symbols: old standards use other symbols.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
