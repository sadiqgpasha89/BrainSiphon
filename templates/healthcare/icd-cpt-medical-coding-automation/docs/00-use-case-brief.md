# Medical Coding Automation (ICD-10 / CPT): use-case brief

> Generated from the blueprint `healthcare/icd-cpt-medical-coding-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Medical Coding Automation (ICD-10 / CPT) · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assign accurate diagnosis and procedure codes from clinical documentation to speed billing and cut denials, with coder oversight. The system has to run as a scheduled batch job, inside these limits: 70,000 ICD-10 codes, Auditable evidence spans and Payer-specific rules.

**Why it is hard.** The obvious approach is document-level predictions, and it fails because auditors need the sentence that justifies each code. The second trap is in "Long tail": the real signal is hierarchical code structure and retrieval for rare codes, while teams usually reach for flat softmax over all codes.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.9K a month. A mistake is expensive in the way days in accounts receivable measures it.

**What success looks like.** Offline: Micro-F1 and macro-F1 on rare codes and Audit-ready evidence precision. Online: First-pass acceptance rate and Days in accounts receivable. The launch is judged on "First-pass acceptance rate" while "Days in accounts receivable" must not get worse.

## Objective, loss and constraints

**Business objective.** Assign accurate diagnosis and procedure codes from clinical documentation to speed billing and cut denials, with coder oversight.

**Training objective.** `\mathcal{L}=\sum_{c}\mathrm{BCE}(y_c,p_c)\ \text{(extreme multi-label)}+\lambda\,\mathrm{HierarchyPenalty}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{c} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_c | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per channel or segment c) |
| p_c | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per channel or segment c) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{HierarchyPenalty} | Penalty when a child code is predicted without its parent in the coding hierarchy. |

**Hard constraints**

- 70,000 ICD-10 codes
- Auditable evidence spans
- Payer-specific rules
- Coder review for low confidence

## The approach in one paragraph

Start with rule-based computer-assisted coding with keyword dictionaries. Then earn the move to long-document transformer with label-attention and code-description retrieval, rules for code-set validity, confidence routing to coders, and only if it beats the baseline on Micro-F1 and macro-F1 on rare codes and Audit-ready evidence precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Evidence span match | Highlighted text span linked to code. Auditability. Guard against: span annotation. |
| Add Code hierarchy consistency | Parent-child and exclusion rules. Validity. Guard against: code-set version as-of date. |
| Add Documentation completeness flags | Missing specificity detected. Denial risk. Guard against: rule library. |
| Run it as one pipeline | Encounter documents (EHR export), Document assembler (section parser), Coding model (long-context transformer), Rules validator (NCCI and code-set) and Claim submission (billing system), with Coder queue and Denial feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle annual code-set update | Versioned code-sets and regression tests at update. |

**Deliberately not doing**

- Billing department code history: leaks previous coding decisions.
- Document length: none.

**How the approach is proven**

Prove it offline on Micro-F1 and macro-F1 on rare codes and Audit-ready evidence precision using time-ordered splits, then online on "First-pass acceptance rate" with "Days in accounts receivable" as the guardrail. Watch for: Silver labels from past coding errors and Evaluating on common codes only.

## Baseline and production design

- **Baseline (build this first):** Rule-based computer-assisted coding with keyword dictionaries.
- **Production design:** Long-document transformer with label-attention and code-description retrieval, rules for code-set validity, confidence routing to coders.

## Why AI, and why this kind

**Why AI.** Assign accurate diagnosis and procedure codes from clinical documentation to speed billing and cut denials, with coder oversight. The evidence that separates good from bad outcomes (Evidence span match, Code hierarchy consistency, Documentation completeness flags) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "document-level predictions" are what teams reach for first, and they fail because auditors need the sentence that justifies each code. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Long-document transformer with label-attention and code-description retrieval, rules for code-set validity, confidence routing to coders.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Evidence span match, Code hierarchy consistency, Documentation completeness flags and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based computer-assisted coding with keyword dictionaries | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Long-document transformer with label-attention and code-description retrieval, rules for code-set validity, confidence routing to coders | chosen | Meets the run-window envelope at $0.424 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (First-pass acceptance rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Silver labels from past coding errors.
- Evaluation trap: Evaluating on common codes only.
- Annual code-set update: invalid or deprecated codes assigned.
- Copy-forward notes carry stale diagnoses: copied-forward text makes the model assign codes for conditions that are no longer present.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
