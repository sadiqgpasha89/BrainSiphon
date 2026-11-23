# Release Notes Generation: use-case brief

> Generated from the blueprint `devtools/release-notes-generation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Release Notes Generation · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Draft release notes from merged pull requests, issues and labels, grouped for customers and for operators, with links to the sources, for the product owner to approve. The system has to run as a scheduled batch job, inside these limits: Every line links to a pull request or issue, Breaking changes and migrations always listed and Product owner approves.

**Why it is hard.** The obvious approach is a summary of commit text, and it fails because commit text can be wrong or internal. The second trap is in "Audience": the real signal is separate customer and operator notes, while teams usually reach for one list.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way support tickets about changes measures it.

**What success looks like.** Offline: Link correctness, Breaking change recall and Editor change rate. Online: Time to publish notes, Support tickets about changes and Missed breaking changes. The launch is judged on "Time to publish notes" while "Support tickets about changes" must not get worse.

## Objective, loss and constraints

**Business objective.** Draft release notes from merged pull requests, issues and labels, grouped for customers and for operators, with links to the sources, for the product owner to approve.

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

- Every line links to a pull request or issue
- Breaking changes and migrations always listed
- Product owner approves
- No internal names or secrets
- Notes for 500 releases per year

## The approach in one paragraph

Start with product owners writing notes by hand from a list of merges, because it is the usual approach. Then earn the move to a drafting pipeline that groups changes by type and audience, writes plain notes with links, runs filters for internal text and routes the draft to the product owner, and only if it beats the baseline on Link correctness and Breaking change recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Merged change list | Pull requests in the release. Content. Guard against: from the code host. |
| Add Labels and change types | Feature, fix or breaking. Grouping. Guard against: from labels. |
| Add Linked issues | The problem each change solves. Wording. Guard against: from the tracker. |
| Run it as one pipeline | Release scope query (code host), Grouping and labelling (rules), Note drafting (LLM), Filter for internal and embargoed text (rules) and Publication (docs site), with Owner review and Feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing labels | Infer with a flag for review. |

**Deliberately not doing**

- Author name: personal data.
- Branch name: an artefact.
- Commit hash: an identifier.

**How the approach is proven**

Prove it offline on Link correctness, Breaking change recall and Editor change rate using time-ordered splits, then online on "Time to publish notes" with "Support tickets about changes" as the guardrail. Watch for: Notes from commit text only, One list for all readers and No embargo filter.

## Baseline and production design

- **Baseline (build this first):** Product owners writing notes by hand from a list of merges, because it is the usual approach.
- **Production design:** A drafting pipeline that groups changes by type and audience, writes plain notes with links, runs filters for internal text and routes the draft to the product owner.

## Why AI, and why this kind

**Why AI.** Draft release notes from merged pull requests, issues and labels, grouped for customers and for operators, with links to the sources, for the product owner to approve. The evidence that separates good from bad outcomes (Merged change list, Labels and change types, Linked issues) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A summary of commit text" are what teams reach for first, and they fail because commit text can be wrong or internal. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A drafting pipeline that groups changes by type and audience, writes plain notes with links, runs filters for internal text and routes the draft to the product owner.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Merged change list, Labels and change types, Linked issues and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Product owners writing notes by hand from a list of merges, because it is the usual approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A drafting pipeline that groups changes by type and audience, writes plain notes with links, runs filters for internal text and routes the draft to the product owner | chosen | Meets the run-window envelope at $0.210 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to publish notes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Notes from commit text only.
- Evaluation trap: One list for all readers.
- Missing labels: changes lack a type.
- Embargoed fix: a security fix must not be described.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
