# Cross-Dock Door & Wave Scheduling: use-case brief

> Generated from the blueprint `supply-chain/cross-dock-scheduling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cross-Dock Door & Wave Scheduling · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assign inbound and outbound trucks to doors and sequence handling to minimise dwell and labour in cross-dock facilities. The system has to run as a scheduled batch job, inside these limits: Door capacity, Truck arrival uncertainty and Labour shifts.

**Why it is hard.** The obvious approach is planned arrivals as truth, and it fails because trucks arrive early and late. The second trap is in "Flow": the real signal is minimise goods travel between doors, while teams usually reach for minimise door count.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.6K a month. A mistake is expensive in the way cross-dock labour hours per pallet measures it.

**What success looks like.** Offline: Simulated dwell time and ETA error. Online: Truck dwell hours and Cross-dock labour hours per pallet. The launch is judged on "Truck dwell hours" while "Cross-dock labour hours per pallet" must not get worse.

## Objective, loss and constraints

**Business objective.** Assign inbound and outbound trucks to doors and sequence handling to minimise dwell and labour in cross-dock facilities.

**Training objective.** `\min\;\sum_{t}\text{dwell}_t+\lambda\,\text{walking}+\mu\,\text{lateness}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_{t} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \text{dwell}_t | How long freight waits at the dock in period t. |
| \lambda | Weight on walking distance: how strongly it counts against the main objective. |
| \text{walking} | The distance workers walk moving freight. |
| \mu | Weight on lateness: how strongly it counts against the main objective. |
| \text{lateness} | How late outbound trucks depart. |

**Hard constraints**

- Door capacity
- Truck arrival uncertainty
- Labour shifts
- Departure deadlines

## The approach in one paragraph

Start with first-come-first-served door assignment. Then earn the move to stochastic door-assignment MIP with ETA model, rolling-horizon re-optimisation and dock-yard visibility, and only if it beats the baseline on Simulated dwell time and ETA error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Truck arrival ETA distribution | Predicted arrival with uncertainty. Planning. Guard against: telematics. |
| Add Inbound-outbound flow matrix | Volume between lanes. Door assignment. Guard against: plan. |
| Add Labour availability | Workers per shift. Capacity. Guard against: roster. |
| Run it as one pipeline | Appointments and ETAs (yard system), ETA model (GBDT), Door assignment (stochastic MIP), Work scheduler (labour planner), Dock supervisor (human), Execution logs (WMS) and Dwell metrics (KPI). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle truck arrives hours late | Rolling replan and buffer doors. |

**Deliberately not doing**

- Truck plate: none.
- Carrier logo: none.

**How the approach is proven**

Prove it offline on Simulated dwell time and ETA error using time-ordered splits, then online on "Truck dwell hours" with "Cross-dock labour hours per pallet" as the guardrail. Watch for: Planning with perfect arrival knowledge and Ignoring ASN errors.

## Baseline and production design

- **Baseline (build this first):** First-come-first-served door assignment.
- **Production design:** Stochastic door-assignment MIP with ETA model, rolling-horizon re-optimisation and dock-yard visibility.

## Why AI, and why this kind

**Why AI.** Assign inbound and outbound trucks to doors and sequence handling to minimise dwell and labour in cross-dock facilities. The evidence that separates good from bad outcomes (Truck arrival ETA distribution, Inbound-outbound flow matrix, Labour availability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "planned arrivals as truth" are what teams reach for first, and they fail because trucks arrive early and late. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Stochastic door-assignment MIP with ETA model, rolling-horizon re-optimisation and dock-yard visibility.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Truck arrival ETA distribution, Inbound-outbound flow matrix, Labour availability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: First-come-first-served door assignment | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Stochastic door-assignment MIP with ETA model, rolling-horizon re-optimisation and dock-yard visibility | chosen | Meets the run-window envelope at $0.360 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Truck dwell hours) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Planning with perfect arrival knowledge.
- Evaluation trap: Ignoring ASN errors.
- Truck arrives hours late: schedule cascade.
- Load content differs from ASN: wrong lane assignment.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
