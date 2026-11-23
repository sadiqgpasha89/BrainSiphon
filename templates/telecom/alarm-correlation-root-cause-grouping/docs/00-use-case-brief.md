# Alarm Correlation & Root-Cause Grouping: use-case brief

> Generated from the blueprint `telecom/alarm-correlation-root-cause-grouping` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Alarm Correlation & Root-Cause Grouping · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Group the alarms raised by one underlying fault across a multi-vendor network and rank the likely root element, so the NOC works one incident instead of thousands of alarms. The system has to run interactively, within a few seconds, inside these limits: Grouping must respect the live topology and service dependencies, A suspected root cause is a ranked suggestion never an automatic action and Late alarms must join an existing incident.

**Why it is hard.** The obvious approach is time proximity alone, and it fails because unrelated faults in the same minute get merged. The second trap is in "Direction": the real signal is upstream elements raise root-cause candidates before downstream symptoms, while teams usually reach for treating all alarms as equals.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $3.8K a month. A mistake is expensive in the way time to first correct diagnosis measures it.

**What success looks like.** Offline: Alarm reduction ratio at a fixed grouping purity, Root cause in top three and Misgrouping rate on confirmed incidents. Online: Tickets per underlying fault, Time to first correct diagnosis and Engineer overrides. The launch is judged on "Tickets per underlying fault" while "Time to first correct diagnosis" must not get worse.

## Objective, loss and constraints

**Business objective.** Group the alarms raised by one underlying fault across a multi-vendor network and rank the likely root element, so the NOC works one incident instead of thousands of alarms.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Grouping must respect the live topology and service dependencies
- A suspected root cause is a ranked suggestion never an automatic action
- Late alarms must join an existing incident
- Handles 5M alarms per day within 800 ms per alarm

## The approach in one paragraph

Start with rule-based correlation on parent and child dependencies and a fixed time window, because it is the incumbent and sets the bar for reduction in alarm volume. Then earn the move to a graph model over the topology with temporal attention on alarm sequences, producing incident groups and a ranked root-cause list, with human feedback on each grouping fed back as labels, and only if it beats the baseline on Alarm reduction ratio at a fixed grouping purity and Root cause in top three after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Topological distance to the alarm cluster | Hop count on the dependency graph. Near the centre suggests the cause. Guard against: topology must be current. |
| Add Alarm onset order | Which alarm in the group fired first within clock tolerance. Cause precedes symptom. Guard against: element clocks drift and need normalising. |
| Add Historical co-occurrence | How often two alarm types appeared together in confirmed incidents. Learns real fault patterns. Guard against: use only confirmed incident labels. |
| Run it as one pipeline | Alarm normalisation (stream processor), Topology graph build (graph store), Candidate grouping (temporal graph model), Root-cause ranking (gradient boosting over graph features), Incident creation (ticketing integration) and Model refresh (weekly retrain), with Engineer feedback off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle flapping link | Debounce and merge flaps into one incident with a count. |

**Deliberately not doing**

- Alarm severity assigned by the vendor: scales differ across vendors.
- Alarm text length: a formatting artefact.
- Element age: weak link to this fault.

**How the approach is proven**

Prove it offline on Alarm reduction ratio at a fixed grouping purity, Root cause in top three and Misgrouping rate on confirmed incidents using time-ordered splits, then online on "Tickets per underlying fault" with "Time to first correct diagnosis" as the guardrail. Watch for: Time-window correlation without topology, Evaluating on closed tickets that were merged by hand and Ignoring clock drift.

## Baseline and production design

- **Baseline (build this first):** Rule-based correlation on parent and child dependencies and a fixed time window, because it is the incumbent and sets the bar for reduction in alarm volume.
- **Production design:** A graph model over the topology with temporal attention on alarm sequences, producing incident groups and a ranked root-cause list, with human feedback on each grouping fed back as labels.

## Why AI, and why this kind

**Why AI.** Group the alarms raised by one underlying fault across a multi-vendor network and rank the likely root element, so the NOC works one incident instead of thousands of alarms. The evidence that separates good from bad outcomes (Topological distance to the alarm cluster, Alarm onset order, Historical co-occurrence) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "time proximity alone" are what teams reach for first, and they fail because unrelated faults in the same minute get merged. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A graph model over the topology with temporal attention on alarm sequences, producing incident groups and a ranked root-cause list, with human feedback on each grouping fed back as labels.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Topological distance to the alarm cluster, Alarm onset order, Historical co-occurrence and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based correlation on parent and child dependencies and a fixed time window, because it is the incumbent and sets the bar for reduction in alarm volume | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A graph model over the topology with temporal attention on alarm sequences, producing incident groups and a ranked root-cause list, with human feedback on each grouping fed back as labels | chosen | Meets the 2500 ms envelope at $0.021 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Tickets per underlying fault) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Time-window correlation without topology.
- Evaluation trap: Evaluating on closed tickets that were merged by hand.
- Flapping link: alarms appear and clear repeatedly.
- Maintenance window: planned work looks like a fault.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
