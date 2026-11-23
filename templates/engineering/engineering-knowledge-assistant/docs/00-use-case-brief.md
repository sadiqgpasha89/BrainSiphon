# Engineering Knowledge Assistant: use-case brief

> Generated from the blueprint `engineering/engineering-knowledge-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Engineering Knowledge Assistant · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer engineering questions from company standards, past design reports, lessons learned and calculations with citations, respecting project and client access rights. The system has to run interactively, within a few seconds, inside these limits: Every answer cites document, revision and page, Access follows project and client permissions and Superseded documents are labelled.

**Why it is hard.** The obvious approach is model memory, and it fails because standards and designs change. The second trap is in "Access": the real signal is client-segregated indexes, while teams usually reach for one shared index.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $87.0K a month. A mistake is expensive in the way repeated design errors measures it.

**What success looks like.** Offline: Retrieval accuracy, Answer faithfulness and Access violation tests. Online: Time to find information, Repeated design errors and Questions to senior engineers. The launch is judged on "Time to find information" while "Repeated design errors" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer engineering questions from company standards, past design reports, lessons learned and calculations with citations, respecting project and client access rights.

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

- Every answer cites document, revision and page
- Access follows project and client permissions
- Superseded documents are labelled
- Answer within 5 s
- 5M documents indexed

## The approach in one paragraph

Start with folder browsing and keyword search on shared drives, because they are the current tools. Then earn the move to a retrieval assistant over released documents with permission filters, status labels and citations that logs questions and flags gaps for knowledge owners, and only if it beats the baseline on Retrieval accuracy and Answer faithfulness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Document relevance | Semantic and keyword match. Core. Guard against: from hybrid search. |
| Add Document status and revision | Released, draft or superseded. Filter. Guard against: from the document system. |
| Add Access rights | Project and client permissions. Gate. Guard against: from identity. |
| Run it as one pipeline | Question intake (chat), Permission check (identity), Hybrid retrieval (search index), Status filter (document system), Answer with citations (LLM) and Engineer verification (engineer), with Gap report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle superseded standard | Status labels and warnings. |

**Deliberately not doing**

- Asker name: personal data.
- Chat length: weak link.
- File format: an artefact.

**How the approach is proven**

Prove it offline on Retrieval accuracy, Answer faithfulness and Access violation tests using time-ordered splits, then online on "Time to find information" with "Repeated design errors" as the guardrail. Watch for: Model memory of standards, One shared index and Unlabelled superseded files.

## Baseline and production design

- **Baseline (build this first):** Folder browsing and keyword search on shared drives, because they are the current tools.
- **Production design:** A retrieval assistant over released documents with permission filters, status labels and citations that logs questions and flags gaps for knowledge owners.

## Why AI, and why this kind

**Why AI.** Answer engineering questions from company standards, past design reports, lessons learned and calculations with citations, respecting project and client access rights. The evidence that separates good from bad outcomes (Document relevance, Document status and revision, Access rights) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory" are what teams reach for first, and they fail because standards and designs change. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A retrieval assistant over released documents with permission filters, status labels and citations that logs questions and flags gaps for knowledge owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Document relevance, Document status and revision, Access rights and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Folder browsing and keyword search on shared drives, because they are the current tools | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval assistant over released documents with permission filters, status labels and citations that logs questions and flags gaps for knowledge owners | chosen | Meets the 2500 ms envelope at $4.83 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to find information) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Model memory of standards.
- Evaluation trap: One shared index.
- Superseded standard: an old standard appears.
- Cross-client leak risk: similar projects for different clients.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
