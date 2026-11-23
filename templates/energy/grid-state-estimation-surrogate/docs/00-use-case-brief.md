# Fast Power Flow Surrogate for Contingency Screening: use-case brief

> Generated from the blueprint `energy/grid-state-estimation-surrogate` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fast Power Flow Surrogate for Contingency Screening · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Screen thousands of network contingencies quickly with a learned power flow surrogate and send the dangerous ones to the full solver so operators see risks sooner. The system has to run interactively, within a few seconds, inside these limits: Surrogate screening within 5 s for 10K contingencies, Recall of dangerous contingencies above 99% and Full solver verifies every flagged case.

**Why it is hard.** The obvious approach is a replacement for the solver, and it fails because operators need certified results for decisions. The second trap is in "Metric": the real signal is recall of dangerous cases at a fixed review budget, while teams usually reach for average error.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $3.9K a month. A mistake is expensive in the way dangerous cases found early measures it.

**What success looks like.** Offline: Recall of dangerous contingencies, Rank error at the top and Speed-up factor. Online: Screening time, Dangerous cases found early and Solver compute cost. The launch is judged on "Screening time" while "Dangerous cases found early" must not get worse.

## Objective, loss and constraints

**Business objective.** Screen thousands of network contingencies quickly with a learned power flow surrogate and send the dangerous ones to the full solver so operators see risks sooner.

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

- Surrogate screening within 5 s for 10K contingencies
- Recall of dangerous contingencies above 99%
- Full solver verifies every flagged case
- Never replaces the certified solver
- 20K buses

## The approach in one paragraph

Start with run the full solver on every contingency with a reduced list based on past experience, because it is the certified approach. Then earn the move to a graph neural surrogate trained on solver outputs that ranks contingencies by risk and routes the top set and uncertain cases to the full solver with an audit trail, and only if it beats the baseline on Recall of dangerous contingencies and Rank error at the top after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Bus injections and topology | Load, generation and switch states. Input state. Guard against: from the state estimator. |
| Add Line loading margin | Distance of each element to its limit. Risk level. Guard against: from the solver. |
| Add Voltage margin | Distance of bus voltages to limits. Risk level. Guard against: from the solver. |
| Run it as one pipeline | State estimate intake (EMS), Contingency list build (rules), Surrogate scoring (graph neural network), Risk ranking (threshold policy), Full solver verification (certified solver) and Operator display (EMS console), with Missed-case review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle unseen topology | Out-of-range detector and full solver fallback. |

**Deliberately not doing**

- Case file name: an artefact.
- Operator name: irrelevant.
- Solver run id: an identifier.

**How the approach is proven**

Prove it offline on Recall of dangerous contingencies, Rank error at the top and Speed-up factor using time-ordered splits, then online on "Screening time" with "Dangerous cases found early" as the guardrail. Watch for: Replacing the certified solver, Average error as the headline and No out-of-range detector.

## Baseline and production design

- **Baseline (build this first):** Run the full solver on every contingency with a reduced list based on past experience, because it is the certified approach.
- **Production design:** A graph neural surrogate trained on solver outputs that ranks contingencies by risk and routes the top set and uncertain cases to the full solver with an audit trail.

## Why AI, and why this kind

**Why AI.** Screen thousands of network contingencies quickly with a learned power flow surrogate and send the dangerous ones to the full solver so operators see risks sooner. The evidence that separates good from bad outcomes (Bus injections and topology, Line loading margin, Voltage margin) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A replacement for the solver" are what teams reach for first, and they fail because operators need certified results for decisions. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A graph neural surrogate trained on solver outputs that ranks contingencies by risk and routes the top set and uncertain cases to the full solver with an audit trail.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Bus injections and topology, Line loading margin, Voltage margin and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Run the full solver on every contingency with a reduced list based on past experience, because it is the certified approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A graph neural surrogate trained on solver outputs that ranks contingencies by risk and routes the top set and uncertain cases to the full solver with an audit trail | chosen | Meets the 2500 ms envelope at $0.022 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Screening time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Replacing the certified solver.
- Evaluation trap: Average error as the headline.
- Unseen topology: an outage state outside training.
- Rare overload: the dangerous case is uncommon.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
