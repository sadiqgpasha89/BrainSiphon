# Caseworker Case Summarisation Assistant: use-case brief

> Generated from the blueprint `public-sector/caseworker-case-summarisation-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Caseworker Case Summarisation Assistant · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Summarise long case histories for caseworkers with links to the source notes so they prepare faster for visits, with no recommendation about outcomes for the person. The system has to run interactively, within a few seconds, inside these limits: Every statement links to a source note, No risk scores or recommendations about the person and Caseworker verifies before relying on it.

**Why it is hard.** The obvious approach is a decision aid about people, and it fails because predictions about individuals in care carry serious risks. The second trap is in "Evidence": the real signal is a link to the note for each statement, while teams usually reach for a free summary.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.9K a month. A mistake is expensive in the way missed actions measures it.

**What success looks like.** Offline: Faithfulness of statements to notes, Omission rate of key facts and Action item recall. Online: Preparation time, Missed actions and Caseworker satisfaction. The launch is judged on "Preparation time" while "Missed actions" must not get worse.

## Objective, loss and constraints

**Business objective.** Summarise long case histories for caseworkers with links to the source notes so they prepare faster for visits, with no recommendation about outcomes for the person.

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

- Every statement links to a source note
- No risk scores or recommendations about the person
- Caseworker verifies before relying on it
- Access follows case permissions
- Summary within 20 s

## The approach in one paragraph

Start with reading the whole file before each visit, because it is the current practice. Then earn the move to a summariser with source links, a timeline view and an open-actions list for the caseworker, run only within the permissions of the user and logged, and only if it beats the baseline on Faithfulness of statements to notes and Omission rate of key facts after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Note date and author | When and who wrote the note. Provenance. Guard against: from the case system. |
| Add Topic of the note | Housing, health or safety. Grouping. Guard against: classified. |
| Add Time since last contact | Days since the last contact. Orientation. Guard against: from the case system. |
| Run it as one pipeline | Permission check (access control), Timeline and action extraction (LLM), Summary with source links (LLM with citations) and Access logging (audit store), with Case notes retrieval, Caseworker review and Quality review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing notes | State the gaps. |

**Deliberately not doing**

- Person name: irrelevant for the model.
- Worker name: irrelevant.
- Note length: weak link.

**How the approach is proven**

Prove it offline on Faithfulness of statements to notes, Omission rate of key facts and Action item recall using time-ordered splits, then online on "Preparation time" with "Missed actions" as the guardrail. Watch for: Predictions about the person, Summaries without sources and Wide access.

## Baseline and production design

- **Baseline (build this first):** Reading the whole file before each visit, because it is the current practice.
- **Production design:** A summariser with source links, a timeline view and an open-actions list for the caseworker, run only within the permissions of the user and logged.

## Why AI, and why this kind

**Why AI.** Summarise long case histories for caseworkers with links to the source notes so they prepare faster for visits, with no recommendation about outcomes for the person. The evidence that separates good from bad outcomes (Note date and author, Topic of the note, Time since last contact) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A decision aid about people" are what teams reach for first, and they fail because predictions about individuals in care carry serious risks. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A summariser with source links, a timeline view and an open-actions list for the caseworker, run only within the permissions of the user and logged.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Note date and author, Topic of the note, Time since last contact and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Reading the whole file before each visit, because it is the current practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A summariser with source links, a timeline view and an open-actions list for the caseworker, run only within the permissions of the user and logged | chosen | Meets the 2500 ms envelope at $5.10 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Preparation time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Predictions about the person.
- Evaluation trap: Summaries without sources.
- Missing notes: the file is incomplete.
- Conflicting notes: records disagree.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
