# Pull Request Review Assistant: use-case brief

> Generated from the blueprint `devtools/pull-request-review-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pull Request Review Assistant · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Comment on pull requests with likely bugs, missing tests and style problems, each backed by evidence from the diff and repository, while human reviewers keep the approval decision. The system has to run interactively, within a few seconds, inside these limits: Every comment cites the lines and the reason, The assistant cannot approve or merge and Comment precision above 70% on audited samples.

**Why it is hard.** The obvious approach is the approver, and it fails because approval carries accountability. The second trap is in "Quality": the real signal is precision of comments that developers act on, while teams usually reach for number of comments.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $210.5K a month. A mistake is expensive in the way review cycle time measures it.

**What success looks like.** Offline: Comment precision on audited samples, Recall of seeded bugs and Acceptance rate. Online: Bugs found before merge, Review cycle time and Comments dismissed as noise. The launch is judged on "Bugs found before merge" while "Review cycle time" must not get worse.

## Objective, loss and constraints

**Business objective.** Comment on pull requests with likely bugs, missing tests and style problems, each backed by evidence from the diff and repository, while human reviewers keep the approval decision.

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

- Every comment cites the lines and the reason
- The assistant cannot approve or merge
- Comment precision above 70% on audited samples
- Review within 3 minutes
- 300K pull requests per month

## The approach in one paragraph

Start with linters and human review, because they are the standard checks. Then earn the move to a review agent that runs analysers, retrieves repository context and posts a few high-confidence comments with evidence, tracking the share that developers accept, and only if it beats the baseline on Comment precision on audited samples and Recall of seeded bugs after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Static analysis findings | Linter and analyser results on the diff. Evidence. Guard against: from CI. |
| Add Changed code risk indicators | Complexity, ownership and churn. Priority. Guard against: from version control. |
| Add Test coverage delta | Coverage change. Gap. Guard against: from CI. |
| Run it as one pipeline | Pull request event (code host), Analyser run (CI), Context retrieval (code index), Comment drafting (LLM), Confidence filter (rules), Comment posting (code host) and Acceptance tracking (aggregated metrics). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle large diff | Prioritise by risk and summarise. |

**Deliberately not doing**

- Author name: personal data.
- Pull request title wording: weak link.
- Time of day: irrelevant.

**How the approach is proven**

Prove it offline on Comment precision on audited samples, Recall of seeded bugs and Acceptance rate using time-ordered splits, then online on "Bugs found before merge" with "Review cycle time" as the guardrail. Watch for: Approving merges, Comment volume as success and Generic advice.

## Baseline and production design

- **Baseline (build this first):** Linters and human review, because they are the standard checks.
- **Production design:** A review agent that runs analysers, retrieves repository context and posts a few high-confidence comments with evidence, tracking the share that developers accept.

## Why AI, and why this kind

**Why AI.** Comment on pull requests with likely bugs, missing tests and style problems, each backed by evidence from the diff and repository, while human reviewers keep the approval decision. The evidence that separates good from bad outcomes (Static analysis findings, Changed code risk indicators, Test coverage delta) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the approver" are what teams reach for first, and they fail because approval carries accountability. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A review agent that runs analysers, retrieves repository context and posts a few high-confidence comments with evidence, tracking the share that developers accept.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Static analysis findings, Changed code risk indicators, Test coverage delta and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Linters and human review, because they are the standard checks | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A review agent that runs analysers, retrieves repository context and posts a few high-confidence comments with evidence, tracking the share that developers accept | chosen | Meets the 2500 ms envelope at $4.68 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Bugs found before merge) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Approving merges.
- Evaluation trap: Comment volume as success.
- Large diff: comments spread thin.
- Wrong advice: the comment is incorrect.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
