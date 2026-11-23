# Network Anomaly Detection: use-case brief

> Generated from the blueprint `it-ops/network-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Network Anomaly Detection · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect abnormal traffic patterns, failing links and unusual flows from flow, device and DNS data, separating performance faults from security events and routing both to the right team. The system has to run interactively, within a few seconds, inside these limits: Detection within 2 minutes, Flow data summarised with no payload inspection and False alerts under 5 per site per week.

**Why it is hard.** The obvious approach is fixed limits, and it fails because load varies by hour and site. The second trap is in "Class": the real signal is performance, misconfiguration or security, while teams usually reach for one anomaly stream.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.7K a month. A mistake is expensive in the way time to isolate faults measures it.

**What success looks like.** Offline: Detection of seeded faults, Fault versus security classification and False alert rate. Online: Network incidents detected early, Time to isolate faults and Alerts per site. The launch is judged on "Network incidents detected early" while "Time to isolate faults" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect abnormal traffic patterns, failing links and unusual flows from flow, device and DNS data, separating performance faults from security events and routing both to the right team.

**Training objective.** `\mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \\|x\\| | Norm: the length of a vector. The squared norm of a difference is the sum of squared errors. |
| x | The input features describing one example (what the model sees). |
| \mathrm{Dec} | The decoder: the network part that rebuilds the input from its compressed code. |
| \mathrm{Enc} | The encoder: the network part that compresses the input into a short code. |

**Hard constraints**

- Detection within 2 minutes
- Flow data summarised with no payload inspection
- False alerts under 5 per site per week
- Operations and security alerts routed separately
- 100B flow records per day

## The approach in one paragraph

Start with static threshold alerts on interface utilisation, because they are the usual setup. Then earn the move to a detector with per-link baselines and flow analytics that classifies anomalies as fault or security, adds topology context and routes to network or security teams, and only if it beats the baseline on Detection of seeded faults and Fault versus security classification after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Link utilisation and error rates | Bandwidth, loss and errors. Core. Guard against: from device telemetry. |
| Add Flow volume and destination rarity | Traffic by pair. Core. Guard against: from flow logs. |
| Add DNS query patterns | Domain rarity and failure rates. Support. Guard against: from DNS logs. |
| Run it as one pipeline | Telemetry and flow ingestion (network collectors), Baseline fit (forecasting), Anomaly scoring (detector), Fault or security classification (rules and model), Routing (ITSM and SIEM) and Baseline refresh (weekly), with Engineer feedback off the critical path. |
| Optimise the right thing | The objective weighs norm: the length of a vector. The squared norm of a difference is the sum of squared errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle planned traffic | Calendar-aware suppression. |

**Deliberately not doing**

- IP address alone: personal data.
- Device name: an identifier.
- Vendor: weak link.

**How the approach is proven**

Prove it offline on Detection of seeded faults, Fault versus security classification and False alert rate using time-ordered splits, then online on "Network incidents detected early" with "Time to isolate faults" as the guardrail. Watch for: Fixed thresholds, Payload capture and One stream for all teams.

## Baseline and production design

- **Baseline (build this first):** Static threshold alerts on interface utilisation, because they are the usual setup.
- **Production design:** A detector with per-link baselines and flow analytics that classifies anomalies as fault or security, adds topology context and routes to network or security teams.

## Why AI, and why this kind

**Why AI.** Detect abnormal traffic patterns, failing links and unusual flows from flow, device and DNS data, separating performance faults from security events and routing both to the right team. The evidence that separates good from bad outcomes (Link utilisation and error rates, Flow volume and destination rarity, DNS query patterns) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fixed limits" are what teams reach for first, and they fail because load varies by hour and site. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A detector with per-link baselines and flow analytics that classifies anomalies as fault or security, adds topology context and routes to network or security teams.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Link utilisation and error rates, Flow volume and destination rarity, DNS query patterns and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static threshold alerts on interface utilisation, because they are the usual setup | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A detector with per-link baselines and flow analytics that classifies anomalies as fault or security, adds topology context and routes to network or security teams | chosen | Meets the 2500 ms envelope at $0.041 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Network incidents detected early) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Fixed thresholds.
- Evaluation trap: Payload capture.
- Planned traffic: backups or migrations spike flows.
- Encrypted traffic: content is hidden.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
