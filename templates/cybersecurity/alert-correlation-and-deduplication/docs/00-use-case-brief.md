# Alert Correlation & Deduplication: use-case brief

> Generated from the blueprint `cybersecurity/alert-correlation-and-deduplication` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Alert Correlation & Deduplication · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Group related alerts into incidents and deduplicate repeats, cutting analyst queue size by an order of magnitude. The system has to run in under 100 milliseconds, inside these limits: Streaming grouping within seconds, Explainable groupings and Cross-tool alerts.

**Why it is hard.** The obvious approach is exact string deduplication, and it fails because alerts differ in text but share a host and process. The second trap is in "Chains": the real signal is kill-chain stage awareness, while teams usually reach for flat grouping.

**Scale and stakes.** At 10 million users this is about 1500.0M model-touching events a day, 17.4K requests per second on average and 104.2K at peak, at an estimated $109.2K a month. A mistake is expensive in the way analyst handling time measures it.

**What success looks like.** Offline: Cluster purity vs analyst groupings and Reduction in queue size. Online: Alerts per incident and Analyst handling time. The launch is judged on "Alerts per incident" while "Analyst handling time" must not get worse.

## Objective, loss and constraints

**Business objective.** Group related alerts into incidents and deduplicate repeats, cutting analyst queue size by an order of magnitude.

**Training objective.** `\mathcal{L}=\mathrm{Triplet}(\text{alert pairs})+\lambda\,\mathrm{ClusterPurity}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Triplet} | Triplet loss: requires an anchor to be closer to a matching example than to a non-matching one by a margin. |
| \text{alert pairs} | Pairs of alerts labelled as belonging to the same incident or not; triplet loss pulls related alerts together. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ClusterPurity} | Penalty when a cluster of alerts mixes alerts from different incidents. |

**Hard constraints**

- Streaming grouping within seconds
- Explainable groupings
- Cross-tool alerts
- No cross-customer leakage

## The approach in one paragraph

Start with time-window grouping by source IP. Then earn the move to streaming entity-resolution with learned pair similarity and incremental clustering into incidents with kill-chain annotations, and only if it beats the baseline on Cluster purity vs analyst groupings and Reduction in queue size after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Shared entity overlap | Host, user, IP overlap. Incident link. Guard against: entity resolution. |
| Add Temporal proximity | Time gap. Same incident. Guard against: window. |
| Add Technique adjacency | ATT&CK stage ordering. Chain. Guard against: mapping. |
| Run it as one pipeline | Alert stream (Kafka), Entity resolver (identity mapping), Pair similarity model (GBDT), Incremental clusterer (streaming) and Incident builder (case system), with Analyst and Merge or split feedback off the critical path. |
| Optimise the right thing | The objective weighs triplet loss: requires an anchor to be closer to a matching example than to a non-matching one by a margin, so the model is trained on the cost of the decision and not on a generic score. |
| Handle shared service account links unrelated alerts | Entity weight down for high-degree shared accounts. |

**Deliberately not doing**

- Alert ID: none.
- Vendor name: none.

**How the approach is proven**

Prove it offline on Cluster purity vs analyst groupings and Reduction in queue size using time-ordered splits, then online on "Alerts per incident" with "Analyst handling time" as the guardrail. Watch for: Analyst groupings inconsistent and Evaluating on pre-grouped data.

## Baseline and production design

- **Baseline (build this first):** Time-window grouping by source IP.
- **Production design:** Streaming entity-resolution with learned pair similarity and incremental clustering into incidents with kill-chain annotations.

## Why AI, and why this kind

**Why AI.** Group related alerts into incidents and deduplicate repeats, cutting analyst queue size by an order of magnitude. The evidence that separates good from bad outcomes (Shared entity overlap, Temporal proximity, Technique adjacency) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "exact string deduplication" are what teams reach for first, and they fail because alerts differ in text but share a host and process. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Streaming entity-resolution with learned pair similarity and incremental clustering into incidents with kill-chain annotations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Shared entity overlap, Temporal proximity, Technique adjacency and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Time-window grouping by source IP | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Streaming entity-resolution with learned pair similarity and incremental clustering into incidents with kill-chain annotations | chosen | Meets the 80 ms envelope at $0.0024 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Alerts per incident) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Analyst groupings inconsistent.
- Evaluation trap: Evaluating on pre-grouped data.
- Shared service account links unrelated alerts: giant incidents.
- Clock skew between tools: clock skew between tools reorders alerts so incident timelines and groupings are wrong.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
