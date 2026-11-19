# Supply-Chain Digital Twin & Scenario Simulation: use-case brief

> Generated from the blueprint `supply-chain/supply-chain-digital-twin-simulation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Supply-Chain Digital Twin & Scenario Simulation · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Maintain a calibrated simulation of the end-to-end network to test policies and disruption responses before applying them. The system has to run as a scheduled batch job, inside these limits: Calibration to observed KPIs, Simulate months in minutes and Scenario library.

**Why it is hard.** The obvious approach is use averages, and it fails because averages remove the variability that causes failures. The second trap is in "Validation": the real signal is back-test against known disruptions, while teams usually reach for face-validity review.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.6K a month. A mistake is expensive in the way realised vs simulated improvements measures it.

**What success looks like.** Offline: KPI reproduction error and Back-test of disruption responses. Online: Policy decisions informed and Realised vs simulated improvements. The launch is judged on "Policy decisions informed" while "Realised vs simulated improvements" must not get worse.

## Objective, loss and constraints

**Business objective.** Maintain a calibrated simulation of the end-to-end network to test policies and disruption responses before applying them.

**Training objective.** `\min_\theta\;\mathrm{Distance}\!\left(S_\theta,\ S_{\text{observed}}\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_\theta | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \mathrm{Distance} | A measure of how far the simulation's behaviour is from the real system's. |
| S_\theta | A summary of system behaviour: S_theta from the simulator with parameters theta and S_observed from real data. |

**Hard constraints**

- Calibration to observed KPIs
- Simulate months in minutes
- Scenario library
- Governance

## The approach in one paragraph

Start with spreadsheet scenario models. Then earn the move to agent-based and discrete-event simulation calibrated with Bayesian inference, with surrogate models for fast policy search, and only if it beats the baseline on KPI reproduction error and Back-test of disruption responses after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Calibrated lead-time distributions | Fitted per lane. Realism. Guard against: data quality. |
| Add Policy parameters | Order-up-to levels and rules. What-if. Guard against: config. |
| Add Disruption scenario library | Catalogued events. Stress tests. Guard against: curated. |
| Run it as one pipeline | Network data (lake), Calibrator (Bayesian inference), Simulator (discrete-event), Surrogate model (neural surrogate), Policy search (optimisation) and Realised KPIs (back-test), with Executive review off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle structural change in network (new DC) | Structural-change flags and recalibration. |

**Deliberately not doing**

- Single-day anomalies: outliers.
- Planner opinion: subjective.

**How the approach is proven**

Prove it offline on KPI reproduction error and Back-test of disruption responses using time-ordered splits, then online on "Policy decisions informed" with "Realised vs simulated improvements" as the guardrail. Watch for: Calibration and validation on same period and Ignoring behavioural responses.

## Baseline and production design

- **Baseline (build this first):** Spreadsheet scenario models.
- **Production design:** Agent-based and discrete-event simulation calibrated with Bayesian inference, with surrogate models for fast policy search.

## Why AI, and why this kind

**Why AI.** Maintain a calibrated simulation of the end-to-end network to test policies and disruption responses before applying them. The evidence that separates good from bad outcomes (Calibrated lead-time distributions, Policy parameters, Disruption scenario library) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "use averages" are what teams reach for first, and they fail because averages remove the variability that causes failures. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Agent-based and discrete-event simulation calibrated with Bayesian inference, with surrogate models for fast policy search.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Calibrated lead-time distributions, Policy parameters, Disruption scenario library and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Spreadsheet scenario models | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Agent-based and discrete-event simulation calibrated with Bayesian inference, with surrogate models for fast policy search | chosen | Meets the run-window envelope at $1.80 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Policy decisions informed) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Calibration and validation on same period.
- Evaluation trap: Ignoring behavioural responses.
- Structural change in network (new DC): calibration invalid.
- Optimistic assumptions in scenarios: policy fails in reality.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
