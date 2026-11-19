# Accessibility: Alt Text & Content Adaptation: use-case brief

> Generated from the blueprint `edtech/accessibility-alt-text-and-captioning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Accessibility: Alt Text & Content Adaptation · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Generate high-quality alt text for educational images, diagrams and equations and adapt content for learners with disabilities. The system has to run interactively, within a few seconds, inside these limits: WCAG compliance, Accurate STEM diagram descriptions and Human review for exams.

**Why it is hard.** The obvious approach is generic captions, and it fails because a graph needs its trend described not "a chart". The second trap is in "Accuracy": the real signal is verify numbers and relationships, while teams usually reach for fluent descriptions.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $14.1K a month. A mistake is expensive in the way learner feedback measures it.

**What success looks like.** Offline: Human-rated description usefulness and Numeric accuracy. Online: Accessibility issue backlog and Learner feedback. The launch is judged on "Accessibility issue backlog" while "Learner feedback" must not get worse.

## Objective, loss and constraints

**Business objective.** Generate high-quality alt text for educational images, diagrams and equations and adapt content for learners with disabilities.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{image,context})+\lambda\,\mathrm{Hallucination}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| \text{image,context} | The image and surrounding page text the description is generated from. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Hallucination} | Penalty for describing things that are not in the image. |

**Hard constraints**

- WCAG compliance
- Accurate STEM diagram descriptions
- Human review for exams
- Multilingual

## The approach in one paragraph

Start with manual alt text by instructors. Then earn the move to diagram-aware captioning with OCR and chart parsing, structured descriptions and human review for assessments, and only if it beats the baseline on Human-rated description usefulness and Numeric accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Diagram type classifier | Chart, circuit, geometry. Description template. Guard against: taxonomy. |
| Add OCR and equation parse | Text and math in image. Content. Guard against: oCR quality. |
| Add Description factuality | Consistency with data/tables. Safety. Guard against: source data. |
| Run it as one pipeline | Content images (CMS), Diagram classifier (CNN), OCR and chart parser (vision), Description generator (VLM), Factuality check (data consistency) and Publish (LMS), with Accessibility reviewer off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle complex diagrams (circuits) mis-described | Specialist templates and mandatory review. |

**Deliberately not doing**

- Image file name: none.
- Image size: weak.

**How the approach is proven**

Prove it offline on Human-rated description usefulness and Numeric accuracy using time-ordered splits, then online on "Accessibility issue backlog" with "Learner feedback" as the guardrail. Watch for: Evaluated on photos not diagrams and Judging fluency not accuracy.

## Baseline and production design

- **Baseline (build this first):** Manual alt text by instructors.
- **Production design:** Diagram-aware captioning with OCR and chart parsing, structured descriptions and human review for assessments.

## Why AI, and why this kind

**Why AI.** Generate high-quality alt text for educational images, diagrams and equations and adapt content for learners with disabilities. The evidence that separates good from bad outcomes (Diagram type classifier, OCR and equation parse, Description factuality) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "generic captions" are what teams reach for first, and they fail because A graph needs its trend described not "a chart". Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Diagram-aware captioning with OCR and chart parsing, structured descriptions and human review for assessments.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Diagram type classifier, OCR and equation parse, Description factuality and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual alt text by instructors | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Diagram-aware captioning with OCR and chart parsing, structured descriptions and human review for assessments | chosen | Meets the 2500 ms envelope at $1.57 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Accessibility issue backlog) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluated on photos not diagrams.
- Evaluation trap: Judging fluency not accuracy.
- Complex diagrams (circuits) mis-described: learners misled.
- Exam images reveal answers in alt text: descriptions of exam images reveal the answers to sighted and unsighted learners alike.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
