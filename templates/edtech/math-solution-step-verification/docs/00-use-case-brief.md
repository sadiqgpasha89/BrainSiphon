# Math Solution Step Verification: use-case brief

> Generated from the blueprint `edtech/math-solution-step-verification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Math Solution Step Verification · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Check each step of a student's mathematical working for validity and pinpoint the first error with an explanation. The system has to run interactively, within a few seconds, inside these limits: Formal correctness, Handwritten and typed input and Equivalent forms.

**Why it is hard.** The obvious approach is lLM judgement of steps, and it fails because lLMs accept plausible but invalid steps. The second trap is in "Localisation": the real signal is first-error localisation, while teams usually reach for final-answer match.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $358.1K a month. A mistake is expensive in the way teacher grading time measures it.

**What success looks like.** Offline: Step-level accuracy and First-error localisation accuracy. Online: Revision rate after feedback and Teacher grading time. The launch is judged on "Revision rate after feedback" while "Teacher grading time" must not get worse.

## Objective, loss and constraints

**Business objective.** Check each step of a student's mathematical working for validity and pinpoint the first error with an explanation.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{step validity}}+\lambda\,\mathrm{ErrorLocalisation}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{step validity}} | Cross-entropy on whether each solution step is valid. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ErrorLocalisation} | Penalty when the model points to the wrong step as the first error. |

**Hard constraints**

- Formal correctness
- Handwritten and typed input
- Equivalent forms
- Fast feedback

## The approach in one paragraph

Start with final-answer matching. Then earn the move to math OCR/parsing to expressions, CAS-based step verification, LLM explanations grounded in the failing rule, and only if it beats the baseline on Step-level accuracy and First-error localisation accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Step equivalence check | CAS equivalence of consecutive steps. Validity. Guard against: parsing. |
| Add Rule-application classifier | Which rule was used. Error type. Guard against: taxonomy. |
| Add Solution-path similarity | Closeness to valid solution paths. Alternative methods. Guard against: graph. |
| Run it as one pipeline | Student work input (photo or keyboard), Math parser (OCR and LaTeX), Step verifier (CAS), Error classifier (model) and Explanation generator (LLM), with Student feedback and Teacher analytics off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy on whether each solution step is valid, so the model is trained on the cost of the decision and not on a generic score. |
| Handle valid alternative method not in reference | Equivalence checking rather than path matching. |

**Deliberately not doing**

- Handwriting style: not content.
- Time per step: weak.

**How the approach is proven**

Prove it offline on Step-level accuracy and First-error localisation accuracy using time-ordered splits, then online on "Revision rate after feedback" with "Teacher grading time" as the guardrail. Watch for: Test problems from training distribution and Judging only final answers.

## Baseline and production design

- **Baseline (build this first):** Final-answer matching.
- **Production design:** Math OCR/parsing to expressions, CAS-based step verification, LLM explanations grounded in the failing rule.

## Why AI, and why this kind

**Why AI.** Check each step of a student's mathematical working for validity and pinpoint the first error with an explanation. The evidence that separates good from bad outcomes (Step equivalence check, Rule-application classifier, Solution-path similarity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "LLM judgement of steps" are what teams reach for first, and they fail because LLMs accept plausible but invalid steps. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Math OCR/parsing to expressions, CAS-based step verification, LLM explanations grounded in the failing rule.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Step equivalence check, Rule-application classifier, Solution-path similarity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Final-answer matching | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Math OCR/parsing to expressions, CAS-based step verification, LLM explanations grounded in the failing rule | chosen | Meets the 2500 ms envelope at $3.98 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Revision rate after feedback) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test problems from training distribution.
- Evaluation trap: Judging only final answers.
- Valid alternative method not in reference: a correct but unconventional method does not match the reference and is marked wrong.
- Handwriting OCR error changes a symbol: false error flagged.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
