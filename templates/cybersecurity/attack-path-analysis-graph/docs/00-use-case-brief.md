# Attack Path Analysis on Enterprise Graphs: use-case brief

> Generated from the blueprint `cybersecurity/attack-path-analysis-graph` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Attack Path Analysis on Enterprise Graphs · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Compute and rank the most plausible attack paths from entry points to crown-jewel assets, guiding the smallest set of fixes that break them. The system has to run as a scheduled batch job, inside these limits: Graph of millions of nodes, Continuous updates and Explainable paths.

**Why it is hard.** The obvious approach is fix every finding, and it fails because remediation capacity is limited. The second trap is in "Probability": the real signal is edge exploitability weighted by exploit likelihood, while teams usually reach for reachability only.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.8K a month. A mistake is expensive in the way mean time to break top paths measures it.

**What success looks like.** Offline: Path coverage vs red-team findings and Remediation leverage. Online: Reachable crown-jewel paths and Mean time to break top paths. The launch is judged on "Reachable crown-jewel paths" while "Mean time to break top paths" must not get worse.

## Objective, loss and constraints

**Business objective.** Compute and rank the most plausible attack paths from entry points to crown-jewel assets, guiding the smallest set of fixes that break them.

**Training objective.** `\min_{S}\;|S|\ \text{s.t. every high-probability path from entry to crown jewels is cut by }S`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_{S} | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| S | The set of controls or edges chosen to block attack paths; the objective is to make \|S\|, its size, as small as possible. |

**Hard constraints**

- Graph of millions of nodes
- Continuous updates
- Explainable paths
- Safe (no active exploitation)

## The approach in one paragraph

Start with vulnerability lists per host. Then earn the move to probabilistic attack graph with exploitability-weighted edges and min-cut remediation selection, refreshed continuously from scanners, IAM and network data, and only if it beats the baseline on Path coverage vs red-team findings and Remediation leverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Edge exploit probability | Exploit likelihood for the technique. Path weight. Guard against: vulnerability data. |
| Add Betweenness of nodes | Paths passing through. Choke point. Guard against: graph. |
| Add Crown-jewel proximity | Hops to critical assets. Impact. Guard against: definitions. |
| Run it as one pipeline | Asset IAM and network data (lake), Graph builder (property graph), Exploitability model (GBDT), Path engine (probabilistic search), Remediation optimiser (min-cut), Security engineer (human) and Fix verification (re-scan). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle graph stale after cloud changes | Streaming updates from cloud audit logs. |

**Deliberately not doing**

- Node display name: none.
- Count of vulnerabilities per host: volume not paths.

**How the approach is proven**

Prove it offline on Path coverage vs red-team findings and Remediation leverage using time-ordered splits, then online on "Reachable crown-jewel paths" with "Mean time to break top paths" as the guardrail. Watch for: Validation lacking red-team ground truth and Static graph snapshots.

## Baseline and production design

- **Baseline (build this first):** Vulnerability lists per host.
- **Production design:** Probabilistic attack graph with exploitability-weighted edges and min-cut remediation selection, refreshed continuously from scanners, IAM and network data.

## Why AI, and why this kind

**Why AI.** Compute and rank the most plausible attack paths from entry points to crown-jewel assets, guiding the smallest set of fixes that break them. The evidence that separates good from bad outcomes (Edge exploit probability, Betweenness of nodes, Crown-jewel proximity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fix every finding" are what teams reach for first, and they fail because remediation capacity is limited. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Probabilistic attack graph with exploitability-weighted edges and min-cut remediation selection, refreshed continuously from scanners, IAM and network data.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Edge exploit probability, Betweenness of nodes, Crown-jewel proximity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Vulnerability lists per host | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Probabilistic attack graph with exploitability-weighted edges and min-cut remediation selection, refreshed continuously from scanners, IAM and network data | chosen | Meets the run-window envelope at $0.040 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Reachable crown-jewel paths) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Validation lacking red-team ground truth.
- Evaluation trap: Static graph snapshots.
- Graph stale after cloud changes: paths reported that no longer exist.
- Over-permissive IAM discovered at scale: thousands of paths.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
