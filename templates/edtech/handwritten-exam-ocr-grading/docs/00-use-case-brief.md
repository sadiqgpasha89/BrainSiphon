# Handwritten Exam OCR & Grading Assistance: use-case brief

> Generated from the blueprint `edtech/handwritten-exam-ocr-grading` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Handwritten Exam OCR & Grading Assistance · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Digitise handwritten exam scripts and assist graders by locating answers, reading text and pre-scoring objective parts. The system has to run interactively, within a few seconds, inside these limits: Handwriting diversity, Strict accuracy for marks and Grader review.

**Why it is hard.** The obvious approach is silent auto-grading, and it fails because oCR errors change marks. The second trap is in "Layout": the real signal is answer-region detection and question mapping, while teams usually reach for full-page OCR.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $15.1K a month. A mistake is expensive in the way re-mark rate measures it.

**What success looks like.** Offline: Word error rate by writer group and Marks agreement with graders. Online: Grading turnaround and Re-mark rate. The launch is judged on "Grading turnaround" while "Re-mark rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Digitise handwritten exam scripts and assist graders by locating answers, reading text and pre-scoring objective parts.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{CTC}}+\lambda\,\mathcal{L}_{\text{layout}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{CTC}} | Connectionist temporal classification loss: aligns a signal such as audio or a line image with its text without frame-by-frame labels. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathcal{L}_{\text{layout}} | Layout loss: how well the page regions (answer boxes, question numbers) are found. |

**Hard constraints**

- Handwriting diversity
- Strict accuracy for marks
- Grader review
- Privacy of student scripts

## The approach in one paragraph

Start with manual grading of paper scripts. Then earn the move to layout-aware handwriting recognition with calibrated confidences, auto-marking for objective items, grader UI with highlights, and only if it beats the baseline on Word error rate by writer group and Marks agreement with graders after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Region-to-question mapping | Layout model confidence. Correct association. Guard against: template. |
| Add OCR confidence per word | Calibrated confidence. Review routing. Guard against: calibration. |
| Add Pre-score agreement | Auto-score vs grader. Quality. Guard against: sample. |
| Run it as one pipeline | Script scanning (scanner), Layout detection (detector), Handwriting OCR (transformer), Auto-marker (rules), Confidence router (review policy), Grader UI (human) and Marks export (SIS). |
| Optimise the right thing | The objective weighs connectionist temporal classification loss: aligns a signal such as audio or a line image with its text without frame-by-frame labels, so the model is trained on the cost of the decision and not on a generic score. |
| Handle cross-outs and overwrites | Strike-through detection and low-confidence routing. |

**Deliberately not doing**

- Paper colour: scan.
- Pen colour: scan.

**How the approach is proven**

Prove it offline on Word error rate by writer group and Marks agreement with graders using time-ordered splits, then online on "Grading turnaround" with "Re-mark rate" as the guardrail. Watch for: Test handwriting from few writers and Not testing messy scans.

## Baseline and production design

- **Baseline (build this first):** Manual grading of paper scripts.
- **Production design:** Layout-aware handwriting recognition with calibrated confidences, auto-marking for objective items, grader UI with highlights.

## Why AI, and why this kind

**Why AI.** Digitise handwritten exam scripts and assist graders by locating answers, reading text and pre-scoring objective parts. The evidence that separates good from bad outcomes (Region-to-question mapping, OCR confidence per word, Pre-score agreement) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "silent auto-grading" are what teams reach for first, and they fail because OCR errors change marks. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Layout-aware handwriting recognition with calibrated confidences, auto-marking for objective items, grader UI with highlights.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Region-to-question mapping, OCR confidence per word, Pre-score agreement and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual grading of paper scripts | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Layout-aware handwriting recognition with calibrated confidences, auto-marking for objective items, grader UI with highlights | chosen | Meets the 2500 ms envelope at $3.35 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Grading turnaround) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test handwriting from few writers.
- Evaluation trap: Not testing messy scans.
- Cross-outs and overwrites: oCR reads the wrong answer.
- Scripts scanned crooked or with missing pages: answers mapped wrongly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
