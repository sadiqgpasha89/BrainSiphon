# Lease Abstraction & Obligation Extraction: use-case brief

> Generated from the blueprint `real-estate/lease-abstraction-and-obligation-extraction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Lease Abstraction & Obligation Extraction · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Read commercial leases and amendments and extract the dates, rents, options, break clauses and obligations into a structured abstract with page citations. The system has to run interactively, within a few seconds, inside these limits: Every extracted field cites its page and clause so a lawyer can check it, Critical dates and money fields are reviewed by a person before use and Amendments are applied in date order to give the terms in force.

**Why it is hard.** The obvious approach is the original lease read alone, and it fails because the rent in force may be set by the third amendment, and the original shows a figure that stopped applying years ago. The second trap is in "Dates": the real signal is each date extracted with its trigger, such as notice of a break or a rent review, while teams usually reach for any date that appears in the text.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $21.2K a month. A mistake is expensive in the way missed critical dates measures it.

**What success looks like.** Offline: Field accuracy and Critical date recall. Online: Abstract time per lease and Missed critical dates. The launch is judged on "Abstract time per lease" while "Missed critical dates" must not get worse.

## Objective, loss and constraints

**Business objective.** Read commercial leases and amendments and extract the dates, rents, options, break clauses and obligations into a structured abstract with page citations.

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

- Every extracted field cites its page and clause so a lawyer can check it
- Critical dates and money fields are reviewed by a person before use
- Amendments are applied in date order to give the terms in force
- Leases stay inside the owner's tenancy and are never used to train shared models

## The approach in one paragraph

Start with manual abstracting by paralegals, because it is accurate and slow. Then earn the move to layout-aware extraction with an LLM for clause understanding, amendment resolution, citations and a reviewer queue for critical fields, and only if it beats the baseline on Field accuracy and Critical date recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Field confidence | Calibrated probability that the extracted value is correct, per field type. Routes uncertain fields to a reviewer. Guard against: calibrate by field type, as dates and amounts behave differently. |
| Add Cross-document consistency | Difference between the rent in the abstract and the rent in the rent roll. Mismatches expose extraction or rent roll errors. Guard against: the rent roll itself contains errors, so treat a mismatch as a question and not a verdict. |
| Add Clause type classifier | Predicted clause class for each paragraph, such as rent review, break option or repair. Gives structure for field extraction. Guard against: clause wording varies between firms and jurisdictions, so test per template. |
| Run it as one pipeline | Lease upload (data room), Document parser (layout model), Clause extractor (LLM with schema), Amendment resolver (rules), Validator (cross-checks) and Lease database (warehouse), with Reviewer queue off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle scanned old leases | Gate on scan quality, cross-check against the rent roll and send low-confidence fields to review. |

**Deliberately not doing**

- Law firm footer: Boilerplate that repeats on every page and is not part of any term.
- Page numbers: Layout artefacts that are not content and cause false matches.
- Defined-term capitalisation: A drafting style that varies by firm and does not change the meaning.

**How the approach is proven**

Prove it offline on Field accuracy and Critical date recall using time-ordered splits, then online on "Abstract time per lease" with "Missed critical dates" as the guardrail. Watch for: Evaluation on clean, modern leases hides failures on the old scans that dominate real portfolios and Template leakage when similar leases from one firm appear in both training and test.

## Baseline and production design

- **Baseline (build this first):** Manual abstracting by paralegals, because it is accurate and slow.
- **Production design:** Layout-aware extraction with an LLM for clause understanding, amendment resolution, citations and a reviewer queue for critical fields.

## Why AI, and why this kind

**Why AI.** Read commercial leases and amendments and extract the dates, rents, options, break clauses and obligations into a structured abstract with page citations. The evidence that separates good from bad outcomes (Field confidence, Cross-document consistency, Clause type classifier) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the original lease read alone" are what teams reach for first, and they fail because the rent in force may be set by the third amendment, and the original shows a figure that stopped applying years ago. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Layout-aware extraction with an LLM for clause understanding, amendment resolution, citations and a reviewer queue for critical fields.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Field confidence, Cross-document consistency, Clause type classifier and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual abstracting by paralegals, because it is accurate and slow | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Layout-aware extraction with an LLM for clause understanding, amendment resolution, citations and a reviewer queue for critical fields | chosen | Meets the 2500 ms envelope at $11.76 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Abstract time per lease) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluation on clean, modern leases hides failures on the old scans that dominate real portfolios.
- Evaluation trap: Template leakage when similar leases from one firm appear in both training and test.
- Scanned old leases: scanned old leases have poor OCR and dates and rents are misread.
- Side letters: terms are in a side letter that is not in the lease file.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
