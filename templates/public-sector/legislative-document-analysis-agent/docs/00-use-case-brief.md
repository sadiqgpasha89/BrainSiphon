# Legislative Document Analysis Agent: use-case brief

> Generated from the blueprint `public-sector/legislative-document-analysis-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Legislative Document Analysis Agent · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Help policy analysts compare bill texts, amendments and existing law with citations so they find conflicts, cross-references and definitions quickly. The system has to run interactively, within a few seconds, inside these limits: Every statement cites section and version, The agent is read-only and Analysts verify before advice goes to officials.

**Why it is hard.** The obvious approach is model memory, and it fails because wrong citations mislead advice. The second trap is in "Role": the real signal is a search and comparison aid, while teams usually reach for legal advice.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.9K a month. A mistake is expensive in the way missed conflicts measures it.

**What success looks like.** Offline: Citation accuracy, Cross-reference recall and Answer faithfulness. Online: Analysis time, Missed conflicts and Corrections to advice notes. The launch is judged on "Analysis time" while "Missed conflicts" must not get worse.

## Objective, loss and constraints

**Business objective.** Help policy analysts compare bill texts, amendments and existing law with citations so they find conflicts, cross-references and definitions quickly.

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

- Every statement cites section and version
- The agent is read-only
- Analysts verify before advice goes to officials
- Version history preserved
- Answer within 10 s

## The approach in one paragraph

Start with analysts searching PDFs and comparing documents by hand, because it is the current process. Then earn the move to a structured parse of legal text with retrieval and diff tools, an agent that answers with citations and a review step before advice is shared, and only if it beats the baseline on Citation accuracy and Cross-reference recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Section cross-references | Links between sections. Impact. Guard against: from the parser. |
| Add Definition conflicts | The same term defined differently. Risk. Guard against: from definitions. |
| Add Amendment diff | Changes between versions. Change. Guard against: from version control. |
| Run it as one pipeline | Legal text ingestion (legislative databases), Structure parsing (section parser), Index and diff tools (search and version store), Question answering (LLM with citations) and Advice note (document system), with Analyst review and Feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle unofficial text | Source checks. |

**Deliberately not doing**

- Author name: irrelevant.
- Document formatting: an artefact.
- Page numbers: an artefact.

**How the approach is proven**

Prove it offline on Citation accuracy, Cross-reference recall and Answer faithfulness using time-ordered splits, then online on "Analysis time" with "Missed conflicts" as the guardrail. Watch for: Legal advice by the agent, Unversioned text and Uncited statements.

## Baseline and production design

- **Baseline (build this first):** Analysts searching PDFs and comparing documents by hand, because it is the current process.
- **Production design:** A structured parse of legal text with retrieval and diff tools, an agent that answers with citations and a review step before advice is shared.

## Why AI, and why this kind

**Why AI.** Help policy analysts compare bill texts, amendments and existing law with citations so they find conflicts, cross-references and definitions quickly. The evidence that separates good from bad outcomes (Section cross-references, Definition conflicts, Amendment diff) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory" are what teams reach for first, and they fail because wrong citations mislead advice. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A structured parse of legal text with retrieval and diff tools, an agent that answers with citations and a review step before advice is shared.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Section cross-references, Definition conflicts, Amendment diff and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Analysts searching PDFs and comparing documents by hand, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A structured parse of legal text with retrieval and diff tools, an agent that answers with citations and a review step before advice is shared | chosen | Meets the 2500 ms envelope at $5.10 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Analysis time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Legal advice by the agent.
- Evaluation trap: Unversioned text.
- Unofficial text: the version is not authoritative.
- Cross-jurisdiction rules: references are unclear.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
