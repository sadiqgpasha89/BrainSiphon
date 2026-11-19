# Automated Red-Team Attack Simulation: use-case brief

> Generated from the blueprint `cybersecurity/red-team-attack-simulation-rl` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Automated Red-Team Attack Simulation · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Use RL agents in a safe emulation environment to discover attack paths and test detection coverage continuously. The system has to run as a scheduled batch job, inside these limits: Safe, isolated or production-safe techniques, Detection feedback loop and Reproducibility.

**Why it is hard.** The obvious approach is toy network simulators, and it fails because findings in toys don't transfer. The second trap is in "Purpose": the real signal is measure detection gaps, while teams usually reach for count compromised hosts.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.6K a month. A mistake is expensive in the way time to validate new detections measures it.

**What success looks like.** Offline: Gap discovery rate vs manual team and Coverage of ATT&CK techniques. Online: Detection gaps closed and Time to validate new detections. The launch is judged on "Detection gaps closed" while "Time to validate new detections" must not get worse.

## Objective, loss and constraints

**Business objective.** Use RL agents in a safe emulation environment to discover attack paths and test detection coverage continuously.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\sum_t \gamma^t\,(r_{\text{progress}}-\lambda\,\mathrm{detection}_t)\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \gamma^t | Discount factor for later steps. |
| r_{\text{progress}} | Reward for attack progress: r_progress measures how far the simulated attacker advances. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{detection}_t | Whether the simulated defender detects the attacker at step t. |

**Hard constraints**

- Safe, isolated or production-safe techniques
- Detection feedback loop
- Reproducibility
- Authorised scope only

## The approach in one paragraph

Start with manual red-team engagements twice a year. Then earn the move to rL/planning agents over a digital twin of the environment with ATT&CK-mapped actions, replayed safely against detection stacks, and only if it beats the baseline on Gap discovery rate vs manual team and Coverage of ATT&CK techniques after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Technique success probability | Success per technique and control. Reward. Guard against: environment. |
| Add Detection events triggered | Alerts raised per step. Coverage. Guard against: sIEM feedback. |
| Add Path cost | Steps to target. Efficiency. Guard against: graph. |
| Run it as one pipeline | Environment twin (topology and controls), Attack-technique library (ATT&CK actions), Planner agent (RL policy), Safe emulation (breach-and-attack tool), Security engineer (human) and Gap tracker (detections backlog), with Detection feedback off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle emulated action causes real outage | Isolated range for risky steps and approval for production-safe steps. |

**Deliberately not doing**

- Host display name: none.
- Episode seed: none.

**How the approach is proven**

Prove it offline on Gap discovery rate vs manual team and Coverage of ATT&CK techniques using time-ordered splits, then online on "Detection gaps closed" with "Time to validate new detections" as the guardrail. Watch for: Rewarding unrealistic exploits and Single environment validation.

## Baseline and production design

- **Baseline (build this first):** Manual red-team engagements twice a year.
- **Production design:** RL/planning agents over a digital twin of the environment with ATT&CK-mapped actions, replayed safely against detection stacks.

## Why AI, and why this kind

**Why AI.** Use RL agents in a safe emulation environment to discover attack paths and test detection coverage continuously. The evidence that separates good from bad outcomes (Technique success probability, Detection events triggered, Path cost) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "toy network simulators" are what teams reach for first, and they fail because findings in toys don't transfer. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: RL/planning agents over a digital twin of the environment with ATT&CK-mapped actions, replayed safely against detection stacks.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Technique success probability, Detection events triggered, Path cost and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual red-team engagements twice a year | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| RL/planning agents over a digital twin of the environment with ATT&CK-mapped actions, replayed safely against detection stacks | chosen | Meets the run-window envelope at $1.80 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Detection gaps closed) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Rewarding unrealistic exploits.
- Evaluation trap: Single environment validation.
- Emulated action causes real outage: production impact.
- Agent exploits simulator bugs: unrealistic results.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
