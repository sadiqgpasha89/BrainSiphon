# Court Document Classification and Redaction: use-case brief

> Generated from the blueprint `public-safety/court-document-classification-redaction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Court Document Classification and Redaction · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify filings by type and suggest redactions of personal data required by court rules so clerks process documents faster and releases comply. The system has to run as a scheduled batch job, inside these limits: Clerks review all redactions before release, Sealed material is never released and Recall of required personal data above 99% on test sets.

**Why it is hard.** The obvious approach is over-redaction, and it fails because missed redactions harm people and over-redaction hurts open justice. The second trap is in "Authority": the real signal is the clerk and the rules, while teams usually reach for the model.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $2.6K a month. A mistake is expensive in the way redaction errors after release measures it.

**What success looks like.** Offline: Recall of required redactions, Over-redaction rate and Classification accuracy. Online: Clerk time per filing, Redaction errors after release and Filing turnaround. The launch is judged on "Clerk time per filing" while "Redaction errors after release" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify filings by type and suggest redactions of personal data required by court rules so clerks process documents faster and releases comply.

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

- Clerks review all redactions before release
- Sealed material is never released
- Recall of required personal data above 99% on test sets
- Original retained
- 3M filings per year

## The approach in one paragraph

Start with clerks reviewing and marking every document by hand, because it is the current process. Then earn the move to a document classifier with suggested redactions and rule citations in a clerk review tool, a block on sealed material and a full log, and only if it beats the baseline on Recall of required redactions and Over-redaction rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Document type | Motion, order or exhibit. Routing. Guard against: from the classifier. |
| Add Personal data entities | Names, IDs and birthdates. Redaction. Guard against: from NER. |
| Add Sealed or restricted flags | Case and document flags. Block. Guard against: from case system. |
| Run it as one pipeline | Filing intake (e-filing), Classification (model), Personal data detection (NER), Rule matching (rule base) and Release gate (case system), with Clerk review and Audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle scans and handwriting | Manual review flags. |

**Deliberately not doing**

- Lawyer name: irrelevant.
- Filing date alone: weak link.
- File name: an artefact.

**How the approach is proven**

Prove it offline on Recall of required redactions, Over-redaction rate and Classification accuracy using time-ordered splits, then online on "Clerk time per filing" with "Redaction errors after release" as the guardrail. Watch for: Redaction with no rule cited, Releasing without a gate and Automatic release.

## Baseline and production design

- **Baseline (build this first):** Clerks reviewing and marking every document by hand, because it is the current process.
- **Production design:** A document classifier with suggested redactions and rule citations in a clerk review tool, a block on sealed material and a full log.

## Why AI, and why this kind

**Why AI.** Classify filings by type and suggest redactions of personal data required by court rules so clerks process documents faster and releases comply. The evidence that separates good from bad outcomes (Document type, Personal data entities, Sealed or restricted flags) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "over-redaction" are what teams reach for first, and they fail because missed redactions harm people and over-redaction hurts open justice. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A document classifier with suggested redactions and rule citations in a clerk review tool, a block on sealed material and a full log.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Document type, Personal data entities, Sealed or restricted flags and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Clerks reviewing and marking every document by hand, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A document classifier with suggested redactions and rule citations in a clerk review tool, a block on sealed material and a full log | chosen | Meets the run-window envelope at $0.029 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Clerk time per filing) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Redaction with no rule cited.
- Evaluation trap: Releasing without a gate.
- Scans and handwriting: text is hard to read.
- Rule change: redaction rules are updated.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
