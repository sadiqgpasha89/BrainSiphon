# Fraud Ring Detection via Community Detection: use-case brief

> Generated from the blueprint `fintech/fraud-ring-detection-community` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fraud Ring Detection via Community Detection · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find coordinated fraud rings across accounts, devices and merchants for batch takedown rather than one-at-a-time blocking. The system has to run as a scheduled batch job, inside these limits: Ring decisions need human sign-off, Graph of 1B edges and Weekly full run plus daily incremental.

**Why it is hard.** The obvious approach is individual account anomaly scores, and it fails because coordinated actors keep each account just under thresholds. The second trap is in "Scale": the real signal is incremental community updates, while teams usually reach for rebuilding the full graph daily.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 104 at peak, at an estimated $1.8K a month. A mistake is expensive in the way repeat-fraud rate after takedown measures it.

**What success looks like.** Offline: Ring-level precision and recall and Normalised mutual information on labelled rings. Online: Accounts removed per ring and Repeat-fraud rate after takedown. The launch is judged on "Accounts removed per ring" while "Repeat-fraud rate after takedown" must not get worse.

## Objective, loss and constraints

**Business objective.** Find coordinated fraud rings across accounts, devices and merchants for batch takedown rather than one-at-a-time blocking.

**Training objective.** `\mathcal{L}=-\sum_{(u,v)\in E}\log\sigma(z_u^\top z_v)-\sum_{(u,w)\notin E}\log\sigma(-z_u^\top z_w)+\lambda\,\mathrm{Modularity}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{(u,v)\in E} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \sigma | Sigmoid function: turns the similarity of two embeddings into a probability that the accounts are linked. |
| z_u^\top | The embedding of an account: z_u for account u. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Modularity} | Penalty that rewards dense groups of connected accounts, so rings form clusters. |

**Hard constraints**

- Ring decisions need human sign-off
- Graph of 1B edges
- Weekly full run plus daily incremental
- Low collateral damage

## The approach in one paragraph

Start with connected components on shared device or card edges. Then earn the move to leiden community detection on a weighted heterogeneous graph with GNN node scores, ring-level classifier, and incremental updates via streaming edges, and only if it beats the baseline on Ring-level precision and recall and Normalised mutual information on labelled rings after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Shared-resource density | Share of accounts in a cluster sharing devices or payment instruments. Ring cohesion. Guard against: resource IDs hashed at event time. |
| Add Temporal co-burst | Correlation of activity bursts among cluster members. Scripted behaviour. Guard against: bin windows before labels. |
| Add Cluster age and growth | Rate of new accounts joining the cluster. Rings grow in waves. Guard against: snapshot cluster membership per day. |
| Run it as one pipeline | Edge extractor (Spark), Graph builder (GraphFrames), Community detection (Leiden on GPU), Ring classifier (GBDT), Ring dossier builder (evidence summary) and Outcome labels (confirmed rings), with Takedown review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle corporate NAT merges unrelated users | Edge down-weighting for high-degree shared resources. |

**Deliberately not doing**

- Cluster size alone: large benign communities exist (families, offices).
- Edge weights from raw amounts: dominated by whales.

**How the approach is proven**

Prove it offline on Ring-level precision and recall and Normalised mutual information on labelled rings using time-ordered splits, then online on "Accounts removed per ring" with "Repeat-fraud rate after takedown" as the guardrail. Watch for: Evaluating on rings found by the same heuristic and Time leakage via edges created after the label date.

## Baseline and production design

- **Baseline (build this first):** Connected components on shared device or card edges.
- **Production design:** Leiden community detection on a weighted heterogeneous graph with GNN node scores, ring-level classifier, and incremental updates via streaming edges.

## Why AI, and why this kind

**Why AI.** Find coordinated fraud rings across accounts, devices and merchants for batch takedown rather than one-at-a-time blocking. The evidence that separates good from bad outcomes (Shared-resource density, Temporal co-burst, Cluster age and growth) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "individual account anomaly scores" are what teams reach for first, and they fail because coordinated actors keep each account just under thresholds. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Leiden community detection on a weighted heterogeneous graph with GNN node scores, ring-level classifier, and incremental updates via streaming edges.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Shared-resource density, Temporal co-burst, Cluster age and growth and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Connected components on shared device or card edges | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Leiden community detection on a weighted heterogeneous graph with GNN node scores, ring-level classifier, and incremental updates via streaming edges | chosen | Meets the run-window envelope at $0.0068 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Accounts removed per ring) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on rings found by the same heuristic.
- Evaluation trap: Time leakage via edges created after the label date.
- Corporate NAT merges unrelated users: giant false component.
- Fraud actors split rings after takedown: detection decays.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
