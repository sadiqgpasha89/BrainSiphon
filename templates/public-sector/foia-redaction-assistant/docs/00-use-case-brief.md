# Records Request Redaction Assistant: use-case brief

> Generated from the blueprint `public-sector/foia-redaction-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Records Request Redaction Assistant · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Suggest redactions in documents released under public records laws by finding personal data and exempt material, so staff review faster and releases are consistent. The system has to run as a scheduled batch job, inside these limits: Suggested redactions are reviewed by a person, Each redaction cites its legal exemption and Recall of personal data above 99% on test sets.

**Why it is hard.** The obvious approach is over-redaction, and it fails because missed redactions harm people and over-redaction breaches transparency law. The second trap is in "Authority": the real signal is the records officer decides, while teams usually reach for the model deciding.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $2.2K a month. A mistake is expensive in the way releases challenged measures it.

**What success looks like.** Offline: Recall of personal data, Over-redaction rate and Reviewer correction rate. Online: Review time per page, Releases challenged and Redaction errors found after release. The launch is judged on "Review time per page" while "Releases challenged" must not get worse.

## Objective, loss and constraints

**Business objective.** Suggest redactions in documents released under public records laws by finding personal data and exempt material, so staff review faster and releases are consistent.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)`

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
| x | The input features describing one example (what the model sees). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Suggested redactions are reviewed by a person
- Each redaction cites its legal exemption
- Recall of personal data above 99% on test sets
- Original retained securely
- 200K pages per year

## The approach in one paragraph

Start with manual redaction by records officers with black marker tools, because it is the current process. Then earn the move to a detection and suggestion pipeline with exemption citations, a review interface, a second reviewer for sensitive releases and an audit trail, and only if it beats the baseline on Recall of personal data and Over-redaction rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Entity detection | Names, IDs and contact details. Personal data. Guard against: from NER. |
| Add Exemption match | Whether the text fits an exemption. Rationale. Guard against: from rules and model. |
| Add Context cues | Whether a name is public or private. Disambiguation. Guard against: from context. |
| Run it as one pipeline | Document intake (records system), OCR and parsing (document model), Personal data detection (NER) and Exemption suggestion (rules and model), with Officer review, Second review for sensitive cases and Release and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle handwriting | Manual review flags. |

**Deliberately not doing**

- Requester name: irrelevant.
- Page count alone: weak link.
- File name: an artefact.

**How the approach is proven**

Prove it offline on Recall of personal data, Over-redaction rate and Reviewer correction rate using time-ordered splits, then online on "Review time per page" with "Releases challenged" as the guardrail. Watch for: Automatic release, Redaction with no exemption citation and Missed images.

## Baseline and production design

- **Baseline (build this first):** Manual redaction by records officers with black marker tools, because it is the current process.
- **Production design:** A detection and suggestion pipeline with exemption citations, a review interface, a second reviewer for sensitive releases and an audit trail.

## Why AI, and why this kind

**Why AI.** Suggest redactions in documents released under public records laws by finding personal data and exempt material, so staff review faster and releases are consistent. The evidence that separates good from bad outcomes (Entity detection, Exemption match, Context cues) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "over-redaction" are what teams reach for first, and they fail because missed redactions harm people and over-redaction breaches transparency law. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A detection and suggestion pipeline with exemption citations, a review interface, a second reviewer for sensitive releases and an audit trail.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Entity detection, Exemption match, Context cues and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual redaction by records officers with black marker tools, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A detection and suggestion pipeline with exemption citations, a review interface, a second reviewer for sensitive releases and an audit trail | chosen | Meets the run-window envelope at $0.050 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Review time per page) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Automatic release.
- Evaluation trap: Redaction with no exemption citation.
- Handwriting: the text is not recognised.
- Images in documents: faces and IDs appear in images.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
