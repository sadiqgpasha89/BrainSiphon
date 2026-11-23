# Alert Correlation and Noise Reduction: use-case brief

> Generated from the blueprint `it-ops/alert-correlation-noise-reduction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Alert Correlation and Noise Reduction · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Group duplicate and related alerts into a single incident using topology and timing so on-call engineers receive fewer, clearer pages without missing a real outage. The system has to run interactively, within a few seconds, inside these limits: Suppressed alerts stay visible inside the incident, Critical alerts always page within 60 s and Grouping within 5 s of arrival.

**Why it is hard.** The obvious approach is alerts with similar names, and it fails because similar names can hide unrelated faults. The second trap is in "Safety": the real signal is critical and customer-facing alerts never suppressed, while teams usually reach for maximum noise reduction.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.8K a month. A mistake is expensive in the way time to acknowledge measures it.

**What success looks like.** Offline: Cluster purity, Missed critical alert rate and Alert reduction ratio. Online: Pages per on-call shift, Time to acknowledge and Missed incidents. The launch is judged on "Pages per on-call shift" while "Time to acknowledge" must not get worse.

## Objective, loss and constraints

**Business objective.** Group duplicate and related alerts into a single incident using topology and timing so on-call engineers receive fewer, clearer pages without missing a real outage.

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

- Suppressed alerts stay visible inside the incident
- Critical alerts always page within 60 s
- Grouping within 5 s of arrival
- Operations owners approve suppression rules
- 2M alerts per day

## The approach in one paragraph

Start with static deduplication by alert name and a fixed suppression window, because it is the default in most monitoring tools. Then earn the move to a correlation service that clusters alerts using topology, time and change events, shows the grouped incident with every member alert and routes pages by service ownership, and only if it beats the baseline on Cluster purity and Missed critical alert rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Service topology distance | Dependency path between alerting services. Core. Guard against: from the CMDB and traces. |
| Add Time proximity | Alerts firing within a short window. Core. Guard against: from the alert stream. |
| Add Alert text similarity | Embedding of the alert message. Support. Guard against: from a text model. |
| Run it as one pipeline | Alert stream intake (monitoring tools), Deduplication (rules), Topology and time clustering (graph model), Incident creation (ITSM), Owner routing (service catalogue) and Page decision (policy), with Noise review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing topology | Fall back to time and text signals and flag the gap. |

**Deliberately not doing**

- Alert id: an identifier.
- Monitoring tool name: weak link.
- On-call engineer name: personal data.

**How the approach is proven**

Prove it offline on Cluster purity, Missed critical alert rate and Alert reduction ratio using time-ordered splits, then online on "Pages per on-call shift" with "Time to acknowledge" as the guardrail. Watch for: Name-based deduplication, Silent suppression and Noise reduction as the only goal.

## Baseline and production design

- **Baseline (build this first):** Static deduplication by alert name and a fixed suppression window, because it is the default in most monitoring tools.
- **Production design:** A correlation service that clusters alerts using topology, time and change events, shows the grouped incident with every member alert and routes pages by service ownership.

## Why AI, and why this kind

**Why AI.** Group duplicate and related alerts into a single incident using topology and timing so on-call engineers receive fewer, clearer pages without missing a real outage. The evidence that separates good from bad outcomes (Service topology distance, Time proximity, Alert text similarity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "alerts with similar names" are what teams reach for first, and they fail because similar names can hide unrelated faults. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A correlation service that clusters alerts using topology, time and change events, shows the grouped incident with every member alert and routes pages by service ownership.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Service topology distance, Time proximity, Alert text similarity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static deduplication by alert name and a fixed suppression window, because it is the default in most monitoring tools | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A correlation service that clusters alerts using topology, time and change events, shows the grouped incident with every member alert and routes pages by service ownership | chosen | Meets the 2500 ms envelope at $0.042 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Pages per on-call shift) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Name-based deduplication.
- Evaluation trap: Silent suppression.
- Missing topology: the dependency map is out of date.
- Alert storm: thousands of alerts arrive within a minute.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
