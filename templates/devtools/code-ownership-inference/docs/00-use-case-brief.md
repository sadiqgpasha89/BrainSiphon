# Code Ownership Inference: use-case brief

> Generated from the blueprint `devtools/code-ownership-inference` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Code Ownership Inference · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Infer likely owners for unowned code and services from contribution history, on-call data and reviews so ownership files are complete, for team leads to confirm. The system has to run as a scheduled batch job, inside these limits: Suggestions confirmed by team leads, Teams not individuals as owners and Ownership files updated by pull request.

**Why it is hard.** The obvious approach is individuals, and it fails because people change roles and leave. The second trap is in "Evidence": the real signal is recent contributions, reviews and on-call, while teams usually reach for authorship only.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way time to find an owner measures it.

**What success looks like.** Offline: Agreement with confirmed owners, Coverage of paths and Review acceptance. Online: Paths with owners, Time to find an owner and Misrouted alerts. The launch is judged on "Paths with owners" while "Time to find an owner" must not get worse.

## Objective, loss and constraints

**Business objective.** Infer likely owners for unowned code and services from contribution history, on-call data and reviews so ownership files are complete, for team leads to confirm.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RankLoss} | Ranking loss: penalises placing a less relevant item above a more relevant one. |

**Hard constraints**

- Suggestions confirmed by team leads
- Teams not individuals as owners
- Ownership files updated by pull request
- Weekly scan of 100K paths

## The approach in one paragraph

Start with ownership files updated by hand and asking in chat, because it is the usual practice. Then earn the move to a ranking of candidate owning teams per path from contribution, on-call and review data with a pull request that updates ownership files after lead confirmation, and only if it beats the baseline on Agreement with confirmed owners and Coverage of paths after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Recent commit share by team | Recent change contributions. Core. Guard against: from version control. |
| Add Review and incident participation | Who reviews and responds. Support. Guard against: from tools. |
| Add On-call mapping | Services on call rotations. Strong evidence. Guard against: from the pager. |
| Run it as one pipeline | Contribution data (version control), Team mapping (directory), On-call lookup (pager system), Owner ranking (learned ranker), Lead confirmation (review tool), Ownership pull request (code host) and Coverage tracking (weekly). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle reorganisation | Directory sync. |

**Deliberately not doing**

- Developer name alone: personal data.
- File age: weak link.
- Commit message: weak link.

**How the approach is proven**

Prove it offline on Agreement with confirmed owners, Coverage of paths and Review acceptance using time-ordered splits, then online on "Paths with owners" with "Time to find an owner" as the guardrail. Watch for: Individual owners, Authorship only and Automatic assignment.

## Baseline and production design

- **Baseline (build this first):** Ownership files updated by hand and asking in chat, because it is the usual practice.
- **Production design:** A ranking of candidate owning teams per path from contribution, on-call and review data with a pull request that updates ownership files after lead confirmation.

## Why AI, and why this kind

**Why AI.** Infer likely owners for unowned code and services from contribution history, on-call data and reviews so ownership files are complete, for team leads to confirm. The evidence that separates good from bad outcomes (Recent commit share by team, Review and incident participation, On-call mapping) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "individuals" are what teams reach for first, and they fail because people change roles and leave. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A ranking of candidate owning teams per path from contribution, on-call and review data with a pull request that updates ownership files after lead confirmation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Recent commit share by team, Review and incident participation, On-call mapping and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Ownership files updated by hand and asking in chat, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A ranking of candidate owning teams per path from contribution, on-call and review data with a pull request that updates ownership files after lead confirmation | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Paths with owners) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Individual owners.
- Evaluation trap: Authorship only.
- Reorganisation: teams are merged or renamed so ownership data goes stale.
- Shared libraries: many teams use the code.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
