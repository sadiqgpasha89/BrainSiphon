# Drug-Drug Interaction & Adverse-Event Prediction: use-case brief

> Generated from the blueprint `healthcare/drug-drug-interaction-and-adverse-event-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Drug-Drug Interaction & Adverse-Event Prediction · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Warn prescribers of clinically significant interactions and predicted adverse events in real time while minimising alert fatigue. The system has to run in under 100 milliseconds, inside these limits: 30 ms in the order-entry flow, Alert override rate monitored and Knowledge-base versioning.

**Why it is hard.** The obvious approach is generic pairwise interaction lists, and it fails because most generic alerts are overridden as irrelevant. The second trap is in "Severity": the real signal is severity-tiered alerting, while teams usually reach for all interactions equal.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 625 at peak, at an estimated $3.8K a month. A mistake is expensive in the way alert override rate measures it.

**What success looks like.** Offline: AUROC on held-out interaction pairs and Alert precision at severe tier. Online: Preventable adverse drug events and Alert override rate. The launch is judged on "Preventable adverse drug events" while "Alert override rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Warn prescribers of clinically significant interactions and predicted adverse events in real time while minimising alert fatigue.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y_{ij},\sigma(z_i^\top R z_j))+\lambda\,\mathrm{SeverityWeight}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_{ij} | Whether drugs i and j interact: y_{ij} is 1 if they do. |
| \sigma | Sigmoid function: turns the score into a probability. |
| z_i^\top | The learned embedding of a drug: z_i for drug i and z_j for drug j. |
| R | A relation matrix that turns a pair of drug embeddings into an interaction score. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{SeverityWeight} | Weight that makes dangerous interactions count more than mild ones. |

**Hard constraints**

- 30 ms in the order-entry flow
- Alert override rate monitored
- Knowledge-base versioning
- Patient-specific context

## The approach in one paragraph

Start with commercial DDI database with severity tiers. Then earn the move to knowledge-graph link-prediction model combined with patient-context GBDT, tiered alerts and override-feedback learning, and only if it beats the baseline on AUROC on held-out interaction pairs and Alert precision at severe tier after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Interaction knowledge-graph embedding | Link-prediction score between drugs. Novel interactions. Guard against: training on known pairs only. |
| Add Renal and hepatic function context | EGFR and liver labs. Dose-related risk. Guard against: latest result before order. |
| Add Polypharmacy count | Number of concurrent active meds. Risk multiplier. Guard against: active medication list. |
| Run it as one pipeline | Order entry hook (CPOE), Medication list service (FHIR), Interaction scorer (KG embedding), Context risk model (GBDT), Alert tiering (severity rules) and Prescriber display (inline alert), with Override feedback off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new drug approvals | Rapid ingestion path from labels and curated updates. |

**Deliberately not doing**

- Prescriber specialty alone: not mechanism.
- Order entry time: none.

**How the approach is proven**

Prove it offline on AUROC on held-out interaction pairs and Alert precision at severe tier using time-ordered splits, then online on "Preventable adverse drug events" with "Alert override rate" as the guardrail. Watch for: Held-out pairs share drugs with train pairs and Labels from literature, not real-world outcomes.

## Baseline and production design

- **Baseline (build this first):** Commercial DDI database with severity tiers.
- **Production design:** Knowledge-graph link-prediction model combined with patient-context GBDT, tiered alerts and override-feedback learning.

## Why AI, and why this kind

**Why AI.** Warn prescribers of clinically significant interactions and predicted adverse events in real time while minimising alert fatigue. The evidence that separates good from bad outcomes (Interaction knowledge-graph embedding, Renal and hepatic function context, Polypharmacy count) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "generic pairwise interaction lists" are what teams reach for first, and they fail because most generic alerts are overridden as irrelevant. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Knowledge-graph link-prediction model combined with patient-context GBDT, tiered alerts and override-feedback learning.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Interaction knowledge-graph embedding, Renal and hepatic function context, Polypharmacy count and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Commercial DDI database with severity tiers | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Knowledge-graph link-prediction model combined with patient-context GBDT, tiered alerts and override-feedback learning | chosen | Meets the 80 ms envelope at $0.014 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Preventable adverse drug events) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Held-out pairs share drugs with train pairs.
- Evaluation trap: Labels from literature, not real-world outcomes.
- New drug approvals: unknown to graph.
- Alert override culture: clinicians click through.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
