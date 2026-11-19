# Freight Fraud & Cargo Theft Detection: use-case brief

> Generated from the blueprint `supply-chain/freight-fraud-and-cargo-theft-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Freight Fraud & Cargo Theft Detection · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect fictitious pickups, identity-theft carriers and strategic cargo theft before loads are tendered or while in transit. The system has to run as a scheduled batch job, inside these limits: Decision before tender in seconds, Carrier onboarding checks and Legal evidence.

**Why it is hard.** The obvious approach is single registration checks, and it fails because fraudsters cloned dormant legitimate carriers. The second trap is in "Behaviour": the real signal is pickup and route anomalies against lane norms, while teams usually reach for static watch lists.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.7K a month. A mistake is expensive in the way carrier onboarding time measures it.

**What success looks like.** Offline: Precision at security desk capacity and Detection lead time. Online: Cargo loss value and Carrier onboarding time. The launch is judged on "Cargo loss value" while "Carrier onboarding time" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect fictitious pickups, identity-theft carriers and strategic cargo theft before loads are tendered or while in transit.

**Training objective.** `\mathcal{L}=\mathrm{FL}(y,p)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Decision before tender in seconds
- Carrier onboarding checks
- Legal evidence
- Low friction for legitimate carriers

## The approach in one paragraph

Start with watch lists plus manual carrier vetting. Then earn the move to graph features and GBDT at tender time plus streaming route-deviation detection with automatic escalation, and only if it beats the baseline on Precision at security desk capacity and Detection lead time after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Contact-detail change velocity | Changes to phone, email and bank in 30 days. Takeover marker. Guard against: event-time snapshots. |
| Add Carrier-network overlap | Shared contacts with flagged carriers. Ring signal. Guard against: graph as-of. |
| Add Route and dwell deviation | Deviation from planned route and unscheduled stops. In-transit theft. Guard against: gPS quality. |
| Run it as one pipeline | Tender request (TMS), Carrier identity graph (graph DB), Fraud model (GBDT), Tender gate (policy), GPS stream monitor (Flink), Security desk (human) and Incident outcomes (labels). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle legitimate carrier updates bank details | Out-of-band verification workflow and risk tiering. |

**Deliberately not doing**

- Carrier name length: none.
- Truck colour: none.

**How the approach is proven**

Prove it offline on Precision at security desk capacity and Detection lead time using time-ordered splits, then online on "Cargo loss value" with "Carrier onboarding time" as the guardrail. Watch for: Few labelled thefts with bias to detected cases and Features computed after incident reports.

## Baseline and production design

- **Baseline (build this first):** Watch lists plus manual carrier vetting.
- **Production design:** Graph features and GBDT at tender time plus streaming route-deviation detection with automatic escalation.

## Why AI, and why this kind

**Why AI.** Detect fictitious pickups, identity-theft carriers and strategic cargo theft before loads are tendered or while in transit. The evidence that separates good from bad outcomes (Contact-detail change velocity, Carrier-network overlap, Route and dwell deviation) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single registration checks" are what teams reach for first, and they fail because fraudsters cloned dormant legitimate carriers. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Graph features and GBDT at tender time plus streaming route-deviation detection with automatic escalation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Contact-detail change velocity, Carrier-network overlap, Route and dwell deviation and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Watch lists plus manual carrier vetting | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Graph features and GBDT at tender time plus streaming route-deviation detection with automatic escalation | chosen | Meets the run-window envelope at $0.184 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cargo loss value) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Few labelled thefts with bias to detected cases.
- Evaluation trap: Features computed after incident reports.
- Legitimate carrier updates bank details: false takeover alarm.
- GPS jamming by thieves: jammers blank the tracker so the load disappears from the map just when theft happens.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
