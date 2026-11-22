# Clinical Handoff Quality Assessment: use-case brief

> Generated from the blueprint `healthcare/clinical-handoff-quality-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Handoff Quality Assessment · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Check whether handoff records contain the structured elements an approved checklist requires and are internally consistent, and give the reviewer a completeness checklist with missing-field flags, contradictions and exact source text. The system has to run interactively, within a few seconds, inside these limits: The clinician validates the content and the tool never makes a clinical decision or finalises a note, Deterministic checks apply the approved checklist and extraction only fills the fields and Every flag cites the exact source text.

**Why it is hard.** The obvious approach is model opinion of quality, and it fails because quality means the required elements are present. The second trap is in "Extraction": the real signal is fields extracted with source quotes, while teams usually reach for summary of the note.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $12.4K a month. A mistake is expensive in the way reviewer time per handoff measures it.

**What success looks like.** Offline: Field-level F1 with quote accuracy, Missing-element recall on audited handoffs and False contradiction rate. Online: Handoffs meeting the checklist, Reviewer time per handoff and Handoff-related communication events. The launch is judged on "Handoffs meeting the checklist" while "Reviewer time per handoff" must not get worse.

## Objective, loss and constraints

**Business objective.** Check whether handoff records contain the structured elements an approved checklist requires and are internally consistent, and give the reviewer a completeness checklist with missing-field flags, contradictions and exact source text.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{note})`

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
| \text{note} | The handoff note text, with its structured observations, from which the checklist fields are extracted. |

**Hard constraints**

- The clinician validates the content and the tool never makes a clinical decision or finalises a note
- Deterministic checks apply the approved checklist and extraction only fills the fields
- Every flag cites the exact source text
- The tool never edits the record
- Contradictions are prompts for review and not conclusions
- Reviews 200K handoffs per day within 2 seconds

## The approach in one paragraph

Start with a supervisor reads a sample of handoff notes against the checklist. Then earn the move to an NLP and LLM extractor that fills checklist fields with cited source text, a deterministic validator against the approved checklist and structured observations, and a reviewer panel that shows missing fields and contradictions, and only if it beats the baseline on Field-level F1 with quote accuracy and Missing-element recall on audited handoffs after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Element presence | Whether each required checklist element appears. Primary completeness signal. Guard against: extracted fields. |
| Add Structured-versus-narrative consistency | Agreement of narrative statements with structured observations. Finds contradictions. Guard against: record snapshot. |
| Add Extraction confidence | Calibrated confidence for each extracted field. Routes uncertain items to review. Guard against: held-out notes. |
| Run it as one pipeline | Handoff note intake (read-only EHR integration), Section and field extractor (LLM with schema and quotes), Checklist validator (deterministic rules), Consistency checker (rules against structured data) and Quote verifier (citation verifier), with Clinician review and Feedback and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle abbreviation-heavy note | Local lexicon and a confidence gate. |

**Deliberately not doing**

- Note length: not quality.
- Author writing style: not completeness.
- Time of entry: process artefact.

**How the approach is proven**

Prove it offline on Field-level F1 with quote accuracy, Missing-element recall on audited handoffs and False contradiction rate using time-ordered splits, then online on "Handoffs meeting the checklist" with "Reviewer time per handoff" as the guardrail. Watch for: Letting the model grade quality, Flagging without quotes and Writing into the record.

## Baseline and production design

- **Baseline (build this first):** A supervisor reads a sample of handoff notes against the checklist.
- **Production design:** An NLP and LLM extractor that fills checklist fields with cited source text, a deterministic validator against the approved checklist and structured observations, and a reviewer panel that shows missing fields and contradictions.

## Why AI, and why this kind

**Why AI.** Check whether handoff records contain the structured elements an approved checklist requires and are internally consistent, and give the reviewer a completeness checklist with missing-field flags, contradictions and exact source text. The evidence that separates good from bad outcomes (Element presence, Structured-versus-narrative consistency, Extraction confidence) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model opinion of quality" are what teams reach for first, and they fail because quality means the required elements are present. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: An NLP and LLM extractor that fills checklist fields with cited source text, a deterministic validator against the approved checklist and structured observations, and a reviewer panel that shows missing fields and contradictions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Element presence, Structured-versus-narrative consistency, Extraction confidence and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A supervisor reads a sample of handoff notes against the checklist | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An NLP and LLM extractor that fills checklist fields with cited source text, a deterministic validator against the approved checklist and structured observations, and a reviewer panel that shows missing fields and contradictions | chosen | Meets the 2500 ms envelope at $6.89 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Handoffs meeting the checklist) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Letting the model grade quality.
- Evaluation trap: Flagging without quotes.
- Abbreviation-heavy note: extraction misses a field.
- Unit-specific checklist: wrong template applied.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
