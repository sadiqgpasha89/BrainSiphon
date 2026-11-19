# SME Financial Statement Spreading: use-case brief

> Generated from the blueprint `bfsi/sme-financial-statement-spreading` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SME Financial Statement Spreading · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Convert scanned or digital SME financial statements into standard spread lines so ratios and ratings use consistent definitions. The system has to run interactively, within a few seconds, inside these limits: Totals must foot and balance, assets equal liabilities plus equity, Each spread line traces to a statement cell and Handles 12 accounting standards and 6 languages.

**Why it is hard.** The obvious approach is trusting extracted numbers because the text read cleanly, and it fails because oCR confuses 3, 8 and 5 while a balance check catches it. The second trap is in "Mapping": the real signal is mapping to a standard chart of accounts by meaning and position, while teams usually reach for matching label strings.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $14.5K a month. A mistake is expensive in the way rating rework caused by spreading errors measures it.

**What success looks like.** Offline: Cell exact-match accuracy and Share of statements that foot and balance. Online: Analyst minutes per statement and Rating rework caused by spreading errors. The launch is judged on "Analyst minutes per statement" while "Rating rework caused by spreading errors" must not get worse.

## Objective, loss and constraints

**Business objective.** Convert scanned or digital SME financial statements into standard spread lines so ratios and ratings use consistent definitions.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{det}}+\lambda\,\mathrm{CE}(\hat{y},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{det}} | Detection loss: how well objects are found and their boxes placed. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |

**Hard constraints**

- Totals must foot and balance, assets equal liabilities plus equity
- Each spread line traces to a statement cell
- Handles 12 accounting standards and 6 languages
- Under 90 seconds per statement

## The approach in one paragraph

Start with template OCR and manual spreading by an analyst in the credit team, because it is trusted and sets the effort baseline. Then earn the move to table-structure model with layout transformer, line-to-account mapper with a confidence per cell, deterministic foot-and-balance validators and an analyst correction loop, and only if it beats the baseline on Cell exact-match accuracy and Share of statements that foot and balance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Foot check residual | Difference between reported totals and the sum of lines. Residuals show extraction errors. Guard against: rounding in thousands needs a tolerance. |
| Add Label to account similarity | Embedding similarity between a label and the account definitions. Handles synonyms and languages. Guard against: needs per-language calibration. |
| Add Column role classification | Probability a column is current, prior or note. Drives period correctness. Guard against: layout varies by auditor. |
| Run it as one pipeline | Statement intake (email and portal upload), Table detector (layout model), Cell reader (OCR with constrained decoding), Account mapper (embedding classifier), Validator (accounting rules engine) and Spread store (warehouse with lineage), with Analyst correction UI off the critical path. |
| Optimise the right thing | The objective weighs detection loss: how well objects are found and their boxes placed, so the model is trained on the cost of the decision and not on a generic score. |
| Handle handwritten amendments | Flag low-confidence handwriting and route to an analyst. |

**Deliberately not doing**

- Logo and letterhead: irrelevant visual content.
- Auditor name: no relation to the numbers.
- Page background colour: scanner artefact.

**How the approach is proven**

Prove it offline on Cell exact-match accuracy and Share of statements that foot and balance using time-ordered splits, then online on "Analyst minutes per statement" with "Rating rework caused by spreading errors" as the guardrail. Watch for: Clean statements in training hide scanner noise in production and Same-auditor leakage inflates layout accuracy.

## Baseline and production design

- **Baseline (build this first):** Template OCR and manual spreading by an analyst in the credit team, because it is trusted and sets the effort baseline.
- **Production design:** Table-structure model with layout transformer, line-to-account mapper with a confidence per cell, deterministic foot-and-balance validators and an analyst correction loop.

## Why AI, and why this kind

**Why AI.** Convert scanned or digital SME financial statements into standard spread lines so ratios and ratings use consistent definitions. The evidence that separates good from bad outcomes (Foot check residual, Label to account similarity, Column role classification) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "trusting extracted numbers because the text read cleanly" are what teams reach for first, and they fail because OCR confuses 3, 8 and 5 while a balance check catches it. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Table-structure model with layout transformer, line-to-account mapper with a confidence per cell, deterministic foot-and-balance validators and an analyst correction loop.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Foot check residual, Label to account similarity, Column role classification and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Template OCR and manual spreading by an analyst in the credit team, because it is trusted and sets the effort baseline | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Table-structure model with layout transformer, line-to-account mapper with a confidence per cell, deterministic foot-and-balance validators and an analyst correction loop | chosen | Meets the 2500 ms envelope at $1.61 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Analyst minutes per statement) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Clean statements in training hide scanner noise in production.
- Evaluation trap: Same-auditor leakage inflates layout accuracy.
- Handwritten amendments: corrected figures are written on printed statements.
- Consolidated versus entity statements: numbers from the group are spread as the borrower's.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
