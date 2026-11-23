# Reviewer Recommendation: use-case brief

> Generated from the blueprint `devtools/reviewer-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Reviewer Recommendation · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Suggest reviewers for a pull request by code ownership, expertise and current review load so reviews are fast, knowledge spreads and nobody is overloaded. The system has to run interactively, within a few seconds, inside these limits: Suggestions respect ownership files and conflicts, Review load balanced across the team and Authors can choose anyone.

**Why it is hard.** The obvious approach is always the top expert, and it fails because always picking the expert overloads them. The second trap is in "Load": the real signal is open reviews and capacity, while teams usually reach for expertise only.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $3.6K a month. A mistake is expensive in the way review load balance measures it.

**What success looks like.** Offline: Rank accuracy against chosen reviewers, Time to first review and Load spread. Online: Time to first review, Review load balance and Knowledge spread. The launch is judged on "Time to first review" while "Review load balance" must not get worse.

## Objective, loss and constraints

**Business objective.** Suggest reviewers for a pull request by code ownership, expertise and current review load so reviews are fast, knowledge spreads and nobody is overloaded.

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

- Suggestions respect ownership files and conflicts
- Review load balanced across the team
- Authors can choose anyone
- Suggestions within 2 s
- 100K pull requests per month

## The approach in one paragraph

Start with ownership files and authors choosing by habit, because it is the standard flow. Then earn the move to a ranking service that blends ownership and expertise with load and availability, adds one learning reviewer and shows reasons for each suggestion, and only if it beats the baseline on Rank accuracy against chosen reviewers and Time to first review after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around File ownership and expertise | Prior work on the files. Match. Guard against: from version control. |
| Add Open review load | Pending reviews. Balance. Guard against: from the code host. |
| Add Availability | Time zone and leave. Feasibility. Guard against: from calendars. |
| Run it as one pipeline | Pull request event (code host), Ownership and expertise graph (graph store), Availability and load lookup (calendars and code host), Ranker (learned ranker), Suggestion display (pull request UI) and Author choice captured (code host), with Review time tracking off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle single owner | Cross-training suggestions. |

**Deliberately not doing**

- Reviewer name: personal data in the model.
- Seniority title: weak link.
- Photo: irrelevant.

**How the approach is proven**

Prove it offline on Rank accuracy against chosen reviewers, Time to first review and Load spread using time-ordered splits, then online on "Time to first review" with "Review load balance" as the guardrail. Watch for: Always choosing the top expert, Ignoring load and Seniority-only choices.

## Baseline and production design

- **Baseline (build this first):** Ownership files and authors choosing by habit, because it is the standard flow.
- **Production design:** A ranking service that blends ownership and expertise with load and availability, adds one learning reviewer and shows reasons for each suggestion.

## Why AI, and why this kind

**Why AI.** Suggest reviewers for a pull request by code ownership, expertise and current review load so reviews are fast, knowledge spreads and nobody is overloaded. The evidence that separates good from bad outcomes (File ownership and expertise, Open review load, Availability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "always the top expert" are what teams reach for first, and they fail because always picking the expert overloads them. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A ranking service that blends ownership and expertise with load and availability, adds one learning reviewer and shows reasons for each suggestion.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among File ownership and expertise, Open review load, Availability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Ownership files and authors choosing by habit, because it is the standard flow | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A ranking service that blends ownership and expertise with load and availability, adds one learning reviewer and shows reasons for each suggestion | chosen | Meets the 2500 ms envelope at $0.134 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to first review) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Always choosing the top expert.
- Evaluation trap: Ignoring load.
- Single owner: only one person knows the code.
- Time zones: the best reviewer is asleep.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
