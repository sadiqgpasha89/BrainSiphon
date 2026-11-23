# AI-Assisted Design Review and Professional Sign-Off: use-case brief

> Generated from the blueprint `engineering/ai-design-review-professional-sign-off` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** AI-Assisted Design Review and Professional Sign-Off · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Check design packages for coordination errors, missing information and code issues with an AI reviewer and route a findings list to licensed engineers who review, resolve and sign. The system has to run interactively, within a few seconds, inside these limits: Engineer of record signs every package, Findings cite sheet and clause and AI findings logged with engineer decisions.

**Why it is hard.** The obvious approach is pass or fail the design, and it fails because professional judgement stays with the engineer. The second trap is in "Evidence": the real signal is sheet, clause and measurement, while teams usually reach for general comments.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $127.9K a month. A mistake is expensive in the way review time measures it.

**What success looks like.** Offline: Finding precision and recall on seeded errors, Citation accuracy and Engineer acceptance. Online: Errors found before issue, Review time and Post-issue revisions. The launch is judged on "Errors found before issue" while "Review time" must not get worse.

## Objective, loss and constraints

**Business objective.** Check design packages for coordination errors, missing information and code issues with an AI reviewer and route a findings list to licensed engineers who review, resolve and sign.

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

- Engineer of record signs every package
- Findings cite sheet and clause
- AI findings logged with engineer decisions
- The reviewer never edits controlled drawings
- Review of 500 sheets within 2 hours

## The approach in one paragraph

Start with peer review by senior engineers using checklists, because it is the standard control. Then earn the move to a review assistant that reads the package, lists cited inconsistencies, gaps and code issues and tracks each engineer decision to resolution before release, and only if it beats the baseline on Finding precision and recall on seeded errors and Citation accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Cross-sheet inconsistencies | Values that differ between sheets. Core. Guard against: from extraction. |
| Add Missing information | Required items absent from the package. Core. Guard against: from checklists. |
| Add Code requirement checks | Clause versus design value. Support. Guard against: from the standards library. |
| Run it as one pipeline | Package intake (document system), Sheet and table extraction (vision and NLP), Consistency and gap checks (rules), Code check with citations (LLM and library), Findings list (review tool), Engineer decisions (engineer) and Release gate (document control). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle poor drawings | Quality flags. |

**Deliberately not doing**

- Reviewer name: personal data.
- Sheet layout: an artefact.
- Software brand: weak link.

**How the approach is proven**

Prove it offline on Finding precision and recall on seeded errors, Citation accuracy and Engineer acceptance using time-ordered splits, then online on "Errors found before issue" with "Review time" as the guardrail. Watch for: AI pass or fail, Silent edits and Uncited comments.

## Baseline and production design

- **Baseline (build this first):** Peer review by senior engineers using checklists, because it is the standard control.
- **Production design:** A review assistant that reads the package, lists cited inconsistencies, gaps and code issues and tracks each engineer decision to resolution before release.

## Why AI, and why this kind

**Why AI.** Check design packages for coordination errors, missing information and code issues with an AI reviewer and route a findings list to licensed engineers who review, resolve and sign. The evidence that separates good from bad outcomes (Cross-sheet inconsistencies, Missing information, Code requirement checks) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "pass or fail the design" are what teams reach for first, and they fail because professional judgement stays with the engineer. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A review assistant that reads the package, lists cited inconsistencies, gaps and code issues and tracks each engineer decision to resolution before release.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Cross-sheet inconsistencies, Missing information, Code requirement checks and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Peer review by senior engineers using checklists, because it is the standard control | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A review assistant that reads the package, lists cited inconsistencies, gaps and code issues and tracks each engineer decision to resolution before release | chosen | Meets the 2500 ms envelope at $4.74 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Errors found before issue) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: AI pass or fail.
- Evaluation trap: Silent edits.
- Poor drawings: scans are hard to read.
- Intentional deviation: a design departs from a standard on purpose.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
