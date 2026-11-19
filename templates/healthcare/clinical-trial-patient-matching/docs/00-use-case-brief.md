# Clinical Trial Patient Matching: use-case brief

> Generated from the blueprint `healthcare/clinical-trial-patient-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Trial Patient Matching · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Match patients to eligible trials by reasoning over structured and unstructured records against inclusion and exclusion criteria. The system has to run as a scheduled batch job, inside these limits: Criterion-level explanations, Patient privacy and Recall priority with coordinator review.

**Why it is hard.** The obvious approach is overall eligible score, and it fails because coordinators verify criteria individually. The second trap is in "Temporal": the real signal is time-aware criteria (within 6 months), while teams usually reach for ever-flags.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $1.9K a month. A mistake is expensive in the way enrolment rate measures it.

**What success looks like.** Offline: Criterion-level F1 and Recall of eligible patients. Online: Patients screened per coordinator hour and Enrolment rate. The launch is judged on "Patients screened per coordinator hour" while "Enrolment rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Match patients to eligible trials by reasoning over structured and unstructured records against inclusion and exclusion criteria.

**Training objective.** `\mathcal{L}=\sum_c\mathrm{BCE}(y_c,p_c)\ \text{(criterion-level)}+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_c | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_c | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per channel or segment c) |
| p_c | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per channel or segment c) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Criterion-level explanations
- Patient privacy
- Recall priority with coordinator review
- Trial registry updates daily

## The approach in one paragraph

Start with keyword search over problem lists. Then earn the move to criteria parser to structured logic, retrieval and LLM evidence extraction per criterion, deterministic logic evaluator and coordinator review, and only if it beats the baseline on Criterion-level F1 and Recall of eligible patients after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Criterion evidence link | Chart snippet per criterion. Verification. Guard against: snippet retrieval. |
| Add Temporal window satisfaction | Event date vs criterion window. Correctness. Guard against: date normalisation. |
| Add Unknown-criteria count | Criteria lacking data. Follow-up needed. Guard against: honest unknowns. |
| Run it as one pipeline | Trial registry sync (ClinicalTrials feed), Criteria parser (LLM to logic), Chart retriever (FHIR and notes), Evidence extractor (LLM with citations), Logic evaluator (deterministic) and Enrolment outcomes (feedback), with Coordinator review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle ambiguous criteria wording | Coordinator-approved criterion library. |

**Deliberately not doing**

- Trial sponsor: none.
- Patient age exact decimals: none.

**How the approach is proven**

Prove it offline on Criterion-level F1 and Recall of eligible patients using time-ordered splits, then online on "Patients screened per coordinator hour" with "Enrolment rate" as the guardrail. Watch for: Gold set from a single disease area and Treating unknown as ineligible.

## Baseline and production design

- **Baseline (build this first):** Keyword search over problem lists.
- **Production design:** Criteria parser to structured logic, retrieval and LLM evidence extraction per criterion, deterministic logic evaluator and coordinator review.

## Why AI, and why this kind

**Why AI.** Match patients to eligible trials by reasoning over structured and unstructured records against inclusion and exclusion criteria. The evidence that separates good from bad outcomes (Criterion evidence link, Temporal window satisfaction, Unknown-criteria count) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "overall eligible score" are what teams reach for first, and they fail because coordinators verify criteria individually. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Criteria parser to structured logic, retrieval and LLM evidence extraction per criterion, deterministic logic evaluator and coordinator review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Criterion evidence link, Temporal window satisfaction, Unknown-criteria count and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword search over problem lists | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Criteria parser to structured logic, retrieval and LLM evidence extraction per criterion, deterministic logic evaluator and coordinator review | chosen | Meets the run-window envelope at $1.06 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Patients screened per coordinator hour) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Gold set from a single disease area.
- Evaluation trap: Treating unknown as ineligible.
- Ambiguous criteria wording: inconsistent interpretation.
- Missing outside records: patients wrongly excluded.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
