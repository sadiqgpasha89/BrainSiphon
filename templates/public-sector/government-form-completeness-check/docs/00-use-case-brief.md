# Government Form Completeness Check: use-case brief

> Generated from the blueprint `public-sector/government-form-completeness-check` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Government Form Completeness Check · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Check submitted forms and attachments for missing fields, wrong documents and unreadable scans at the time of submission so applicants fix problems before a caseworker sees them. The system has to run interactively, within a few seconds, inside these limits: The check explains each problem in plain language, No decision on the application and Works on scans and photos.

**Why it is hard.** The obvious approach is a gatekeeper, and it fails because rejecting people for form errors excludes the most vulnerable. The second trap is in "Label": the real signal is cases that were returned for missing items, while teams usually reach for staff opinions.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $12.4K a month. A mistake is expensive in the way time to a complete case measures it.

**What success looks like.** Offline: Agreement with staff completeness checks, Fix suggestion usefulness and Return rate by group. Online: Returned applications, Time to a complete case and Applicant drop-off. The launch is judged on "Returned applications" while "Time to a complete case" must not get worse.

## Objective, loss and constraints

**Business objective.** Check submitted forms and attachments for missing fields, wrong documents and unreadable scans at the time of submission so applicants fix problems before a caseworker sees them.

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

- The check explains each problem in plain language
- No decision on the application
- Works on scans and photos
- Applicant can submit anyway with a note
- 2M submissions per year

## The approach in one paragraph

Start with required-field validation in the form and manual checks by staff, because it is the current process. Then earn the move to a document classifier and extraction check with plain-language fixes, an option to submit with a note and monitoring that returns by group do not diverge, and only if it beats the baseline on Agreement with staff completeness checks and Fix suggestion usefulness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Required field presence | Missing or malformed fields. Completeness. Guard against: from the form schema. |
| Add Document type match | Whether the attachment is the requested type. Correctness. Guard against: from the classifier. |
| Add Image quality | Legibility of scans and photos. Readability. Guard against: from the image. |
| Run it as one pipeline | Form and attachment intake (portal), Field validation (rules), Document classification (model), Image quality check (vision model), Fix suggestions (templates), Submission with note (case system) and Return-rate monitoring (monthly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle unusual document | Allow submission with a flag and staff review. |

**Deliberately not doing**

- Applicant name: irrelevant and private.
- Submission time: irrelevant.
- Browser type: irrelevant.

**How the approach is proven**

Prove it offline on Agreement with staff completeness checks, Fix suggestion usefulness and Return rate by group using time-ordered splits, then online on "Returned applications" with "Time to a complete case" as the guardrail. Watch for: Blocking submissions, One format only and No group monitoring.

## Baseline and production design

- **Baseline (build this first):** Required-field validation in the form and manual checks by staff, because it is the current process.
- **Production design:** A document classifier and extraction check with plain-language fixes, an option to submit with a note and monitoring that returns by group do not diverge.

## Why AI, and why this kind

**Why AI.** Check submitted forms and attachments for missing fields, wrong documents and unreadable scans at the time of submission so applicants fix problems before a caseworker sees them. The evidence that separates good from bad outcomes (Required field presence, Document type match, Image quality) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A gatekeeper" are what teams reach for first, and they fail because rejecting people for form errors excludes the most vulnerable. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A document classifier and extraction check with plain-language fixes, an option to submit with a note and monitoring that returns by group do not diverge.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Required field presence, Document type match, Image quality and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Required-field validation in the form and manual checks by staff, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A document classifier and extraction check with plain-language fixes, an option to submit with a note and monitoring that returns by group do not diverge | chosen | Meets the 2500 ms envelope at $0.275 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Returned applications) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Blocking submissions.
- Evaluation trap: One format only.
- Unusual document: a valid proof is not recognised.
- Poor photo: the scan is blurry.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
