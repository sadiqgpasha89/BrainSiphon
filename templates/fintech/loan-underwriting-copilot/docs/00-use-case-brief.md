# Loan Underwriting Copilot: use-case brief

> Generated from the blueprint `fintech/loan-underwriting-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Loan Underwriting Copilot · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Reduce commercial loan underwriting from days to hours by extracting financials, spreading statements and drafting credit memos with evidence links. The system has to run interactively, within a few seconds, inside these limits: All numbers traceable to a source page, Underwriter signs the final memo and Tenant isolation per bank.

**Why it is hard.** The obvious approach is model-reported figures taken at face value, and it fails because balance sheets must balance; a failed identity exposes OCR errors. The second trap is in "Retrieval": the real signal is section-aware chunking with table preservation, while teams usually reach for fixed 512-token chunks.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $52.1K a month. A mistake is expensive in the way underwriter edits per memo measures it.

**What success looks like.** Offline: Field-level extraction F1 and Memo factual-support rate. Online: Time to decision and Underwriter edits per memo. The launch is judged on "Time to decision" while "Underwriter edits per memo" must not get worse.

## Objective, loss and constraints

**Business objective.** Reduce commercial loan underwriting from days to hours by extracting financials, spreading statements and drafting credit memos with evidence links.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{docs})+\lambda\,\mathrm{NumericMismatch}`

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
| \text{docs} | The applicant's documents the assistant reads. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{NumericMismatch} | Penalty when a number in the output differs from the number in the source document. |

**Hard constraints**

- All numbers traceable to a source page
- Underwriter signs the final memo
- Tenant isolation per bank
- Documents up to 300 pages

## The approach in one paragraph

Start with rule-based extraction templates plus analyst spreadsheets. Then earn the move to document-AI layout parser, hybrid retrieval, planner LLM with calculator and spreadsheet tools, deterministic ratio engine, and a verifier for citations, and only if it beats the baseline on Field-level extraction F1 and Memo factual-support rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Spread reconciliation delta | Assets minus liabilities minus equity from extracted values. Catches extraction errors. Guard against: run after normalising units and currency. |
| Add DSCR computation trace | Formula plus cell references used. Auditable credit metric. Guard against: never let the LLM do arithmetic, use a calculator tool. |
| Add Covenant clause retrieval | Clause text matched to covenant taxonomy. Contract risk drivers. Guard against: pin to the executed version of the agreement. |
| Run it as one pipeline | Document intake (object store plus OCR), Layout parser (table-aware document AI), Retriever (hybrid BM25 plus vectors), Underwriting agent (LLM with calculator tool), Ratio verifier (deterministic engine) and Decision log (audit trail), with Credit memo review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle scanned statements with merged cells | Table-structure confidence gate and mandatory human spot-check. |

**Deliberately not doing**

- Narrative sentiment of the CEO letter: low predictive value and easy to game.
- Boilerplate risk factors: identical across filings, no discriminative content.

**How the approach is proven**

Prove it offline on Field-level extraction F1 and Memo factual-support rate using time-ordered splits, then online on "Time to decision" with "Underwriter edits per memo" as the guardrail. Watch for: Evaluating on clean PDFs only and Counting fluent memos as correct without numeric audit.

## Baseline and production design

- **Baseline (build this first):** Rule-based extraction templates plus analyst spreadsheets.
- **Production design:** Document-AI layout parser, hybrid retrieval, planner LLM with calculator and spreadsheet tools, deterministic ratio engine, and a verifier for citations.

## Why AI, and why this kind

**Why AI.** Reduce commercial loan underwriting from days to hours by extracting financials, spreading statements and drafting credit memos with evidence links. The evidence that separates good from bad outcomes (Spread reconciliation delta, DSCR computation trace, Covenant clause retrieval) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model-reported figures taken at face value" are what teams reach for first, and they fail because balance sheets must balance; a failed identity exposes OCR errors. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Document-AI layout parser, hybrid retrieval, planner LLM with calculator and spreadsheet tools, deterministic ratio engine, and a verifier for citations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Spread reconciliation delta, DSCR computation trace, Covenant clause retrieval and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based extraction templates plus analyst spreadsheets | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Document-AI layout parser, hybrid retrieval, planner LLM with calculator and spreadsheet tools, deterministic ratio engine, and a verifier for citations | chosen | Meets the 2500 ms envelope at $11.58 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to decision) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on clean PDFs only.
- Evaluation trap: Counting fluent memos as correct without numeric audit.
- Scanned statements with merged cells: wrong columns shift every ratio.
- Restated financials: agent mixes versions.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
