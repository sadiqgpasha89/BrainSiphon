# Microservice Root-Cause Analysis: use-case brief

> Generated from the blueprint `saas/microservice-root-cause-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Microservice Root-Cause Analysis · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Localise the root cause service or change in a microservice incident using traces, metrics and topology, cutting time to diagnosis. The system has to run interactively, within a few seconds, inside these limits: Dependency graph changes constantly, Partial telemetry and Explainability for on-call.

**Why it is hard.** The obvious approach is correlation of anomalies, and it fails because everything downstream of the root also looks anomalous. The second trap is in "Changes": the real signal is include deploys and config changes, while teams usually reach for metrics only.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 1.0K at peak, at an estimated $7.4K a month. A mistake is expensive in the way incident duration measures it.

**What success looks like.** Offline: Top-3 root cause accuracy on past incidents and Time to localise. Online: Mean time to diagnose and Incident duration. The launch is judged on "Mean time to diagnose" while "Incident duration" must not get worse.

## Objective, loss and constraints

**Business objective.** Localise the root cause service or change in a microservice incident using traces, metrics and topology, cutting time to diagnosis.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\text{root cause},p)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \text{root cause} | The label: which service or component caused the incident. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Dependency graph changes constantly
- Partial telemetry
- Explainability for on-call
- Minutes to answer

## The approach in one paragraph

Start with on-call engineers following dashboards. Then earn the move to topology-aware causal ranking with trace-based error origin analysis and change correlation, summarised by an LLM with evidence links, and only if it beats the baseline on Top-3 root cause accuracy on past incidents and Time to localise after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Anomaly onset ordering | Earliest anomaly in the call graph. Root candidate. Guard against: clock sync. |
| Add Trace error propagation | Where errors originate in traces. Origin. Guard against: trace sampling. |
| Add Recent change proximity | Change near the candidate. Cause. Guard against: change feed. |
| Run it as one pipeline | Alerts and telemetry (observability stack), Topology builder (service graph), Anomaly onset detector (time series), Causal ranker (graph model), Change correlator (deploy feed), LLM summary with evidence (incident channel) and On-call engineer (human). |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle sampling drops the failing traces | Tail-based sampling for errors. |

**Deliberately not doing**

- Service name: none.
- Alert count: volume.

**How the approach is proven**

Prove it offline on Top-3 root cause accuracy on past incidents and Time to localise using time-ordered splits, then online on "Mean time to diagnose" with "Incident duration" as the guardrail. Watch for: Evaluation on injected faults only and Postmortem labels subjective.

## Baseline and production design

- **Baseline (build this first):** On-call engineers following dashboards.
- **Production design:** Topology-aware causal ranking with trace-based error origin analysis and change correlation, summarised by an LLM with evidence links.

## Why AI, and why this kind

**Why AI.** Localise the root cause service or change in a microservice incident using traces, metrics and topology, cutting time to diagnosis. The evidence that separates good from bad outcomes (Anomaly onset ordering, Trace error propagation, Recent change proximity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "correlation of anomalies" are what teams reach for first, and they fail because everything downstream of the root also looks anomalous. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Topology-aware causal ranking with trace-based error origin analysis and change correlation, summarised by an LLM with evidence links.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Anomaly onset ordering, Trace error propagation, Recent change proximity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: On-call engineers following dashboards | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Topology-aware causal ranking with trace-based error origin analysis and change correlation, summarised by an LLM with evidence links | chosen | Meets the 2500 ms envelope at $0.017 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mean time to diagnose) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluation on injected faults only.
- Evaluation trap: Postmortem labels subjective.
- Sampling drops the failing traces: sampling discards the failing traces so the origin of the error is hidden.
- Cascading failure with retries: symptoms point at healthy services.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
