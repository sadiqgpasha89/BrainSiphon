# Contract Intelligence & Obligation Extraction: use-case brief

> Generated from the blueprint `supply-chain/contract-intelligence-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Contract Intelligence & Obligation Extraction · **Domain:** supply-chain · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Extract clauses, obligations, prices and renewal dates from supplier and logistics contracts and answer questions with citations. The system has to run interactively, within a few seconds, inside these limits: Citations to page and clause, Confidential data stays private and Version history.

**Why it is hard.** The obvious approach is page-level chunking, and it fails because obligations span cross-references. The second trap is in "Review": the real signal is high-risk clause flags go to counsel, while teams usually reach for auto-approval.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $20.6K a month. A mistake is expensive in the way missed renewal incidents measures it.

**What success looks like.** Offline: Clause-level F1 and Citation accuracy. Online: Time to answer contract questions and Missed renewal incidents. The launch is judged on "Time to answer contract questions" while "Missed renewal incidents" must not get worse.

## Objective, loss and constraints

**Business objective.** Extract clauses, obligations, prices and renewal dates from supplier and logistics contracts and answer questions with citations.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{clauses})+\lambda\,\mathrm{ClauseMiss}`

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
| \text{clauses} | The contract clauses the model reads. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ClauseMiss} | Penalty for failing to report a relevant clause. |

**Hard constraints**

- Citations to page and clause
- Confidential data stays private
- Version history
- Lawyer review for high-risk clauses

## The approach in one paragraph

Start with keyword search over PDFs. Then earn the move to layout-aware parsing, clause-level index, LLM extraction into a schema with citations, and a lawyer-in-the-loop for risk clauses, and only if it beats the baseline on Clause-level F1 and Citation accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Clause recall | Share of ground-truth clauses retrieved. Completeness. Guard against: annotated set. |
| Add Cross-reference resolution | Linked defined terms. Correctness. Guard against: parser. |
| Add Renewal and notice date extraction | Normalised dates. Operational value. Guard against: date format handling. |
| Run it as one pipeline | Contract repository (CLM), Layout parser (document AI), Clause indexer (hybrid search), Extraction LLM (schema output), Citation verifier (span check) and Obligation tracker (calendar), with Counsel review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle amendments override base terms | Document-family versioning and precedence rules. |

**Deliberately not doing**

- Contract title: uninformative.
- Law firm footer: none.

**How the approach is proven**

Prove it offline on Clause-level F1 and Citation accuracy using time-ordered splits, then online on "Time to answer contract questions" with "Missed renewal incidents" as the guardrail. Watch for: Test contracts of a single template and Counting extraction without verifying citations.

## Baseline and production design

- **Baseline (build this first):** Keyword search over PDFs.
- **Production design:** Layout-aware parsing, clause-level index, LLM extraction into a schema with citations, and a lawyer-in-the-loop for risk clauses.

## Why AI, and why this kind

**Why AI.** Extract clauses, obligations, prices and renewal dates from supplier and logistics contracts and answer questions with citations. The evidence that separates good from bad outcomes (Clause recall, Cross-reference resolution, Renewal and notice date extraction) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "page-level chunking" are what teams reach for first, and they fail because obligations span cross-references. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Layout-aware parsing, clause-level index, LLM extraction into a schema with citations, and a lawyer-in-the-loop for risk clauses.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Clause recall, Cross-reference resolution, Renewal and notice date extraction and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword search over PDFs | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Layout-aware parsing, clause-level index, LLM extraction into a schema with citations, and a lawyer-in-the-loop for risk clauses | chosen | Meets the 2500 ms envelope at $11.42 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to answer contract questions) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test contracts of a single template.
- Evaluation trap: Counting extraction without verifying citations.
- Amendments override base terms: outdated clause cited.
- Scanned contracts with poor OCR: missed obligations.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
