# Internal Developer Portal Assistant: use-case brief

> Generated from the blueprint `devtools/developer-portal-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Internal Developer Portal Assistant · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer questions about services, owners, dependencies and standards from the service catalogue and docs, and create tickets or scaffold templates through approved workflows. The system has to run interactively, within a few seconds, inside these limits: Answers come from the service catalogue and docs with links, Write actions only through approved templates and approvals and Access follows catalogue permissions.

**Why it is hard.** The obvious approach is model memory, and it fails because ownership data changes. The second trap is in "Actions": the real signal is approved templates with approval, while teams usually reach for free-form commands.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $87.0K a month. A mistake is expensive in the way time to scaffold a service measures it.

**What success looks like.** Offline: Answer faithfulness, Action policy compliance and Retrieval accuracy. Online: Help channel questions, Time to scaffold a service and Catalogue gaps found. The launch is judged on "Help channel questions" while "Time to scaffold a service" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer questions about services, owners, dependencies and standards from the service catalogue and docs, and create tickets or scaffold templates through approved workflows.

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

- Answers come from the service catalogue and docs with links
- Write actions only through approved templates and approvals
- Access follows catalogue permissions
- Answer within 5 s
- 20K questions per day

## The approach in one paragraph

Start with a portal search and a help channel, because they are the current tools. Then earn the move to a retrieval and workflow assistant over the catalogue with citations and a small set of approved actions that create tickets or scaffold new services after approval, and only if it beats the baseline on Answer faithfulness and Action policy compliance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Catalogue match | The service the question is about. Grounding. Guard against: from the catalogue. |
| Add Ownership and on-call | Owner and rotation. Routing. Guard against: from the portal. |
| Add Template eligibility | Whether a template applies. Action choice. Guard against: from rules. |
| Run it as one pipeline | Question intake (portal chat), Permission check (identity), Catalogue and doc retrieval (hybrid search), Answer with links (LLM with citations), Approved action request (workflow engine) and Approval (owner), with Audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing owner | Flag and ask the platform team. |

**Deliberately not doing**

- Asker name: personal data.
- Chat length: weak link.
- Time of day: irrelevant.

**How the approach is proven**

Prove it offline on Answer faithfulness, Action policy compliance and Retrieval accuracy using time-ordered splits, then online on "Help channel questions" with "Time to scaffold a service" as the guardrail. Watch for: Free-form command execution, Unsourced answers and Ignoring permissions.

## Baseline and production design

- **Baseline (build this first):** A portal search and a help channel, because they are the current tools.
- **Production design:** A retrieval and workflow assistant over the catalogue with citations and a small set of approved actions that create tickets or scaffold new services after approval.

## Why AI, and why this kind

**Why AI.** Answer questions about services, owners, dependencies and standards from the service catalogue and docs, and create tickets or scaffold templates through approved workflows. The evidence that separates good from bad outcomes (Catalogue match, Ownership and on-call, Template eligibility) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory" are what teams reach for first, and they fail because ownership data changes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A retrieval and workflow assistant over the catalogue with citations and a small set of approved actions that create tickets or scaffold new services after approval.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Catalogue match, Ownership and on-call, Template eligibility and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A portal search and a help channel, because they are the current tools | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval and workflow assistant over the catalogue with citations and a small set of approved actions that create tickets or scaffold new services after approval | chosen | Meets the 2500 ms envelope at $4.83 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Help channel questions) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Free-form command execution.
- Evaluation trap: Unsourced answers.
- Missing owner: the catalogue has no owner.
- Duplicate services: two services share a name.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
