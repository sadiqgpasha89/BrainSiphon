# Peer Grouping for Collaborative Learning: use-case brief

> Generated from the blueprint `edtech/peer-grouping-collaborative-learning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Peer Grouping for Collaborative Learning · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Form study groups and pair students to maximise learning and inclusion using skills, schedules and interaction history. The system has to run as a scheduled batch job, inside these limits: Group-size limits, Avoid isolating students and Schedule compatibility.

**Why it is hard.** The obvious approach is homogeneous ability grouping, and it fails because mixed-skill groups benefit both with scaffolding. The second trap is in "Inclusion": the real signal is avoid pairing patterns that isolate students, while teams usually reach for optimise average score only.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.6K a month. A mistake is expensive in the way peer-reported collaboration quality measures it.

**What success looks like.** Offline: Simulated group value and balance and Teacher acceptance rate. Online: Group task outcomes and Peer-reported collaboration quality. The launch is judged on "Group task outcomes" while "Peer-reported collaboration quality" must not get worse.

## Objective, loss and constraints

**Business objective.** Form study groups and pair students to maximise learning and inclusion using skills, schedules and interaction history.

**Training objective.** `\max\;\sum_g \text{group value}(g)\ \text{s.t. size and schedule constraints}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \sum_g | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \text{group value} | How good group g is for learning, for example the balance of skills and compatible schedules. |
| g | Index over the groups of students. |

**Hard constraints**

- Group-size limits
- Avoid isolating students
- Schedule compatibility
- Teacher control

## The approach in one paragraph

Start with random or alphabetical grouping. Then earn the move to constrained group optimisation (ILP) over complementarity and schedule fit with fairness constraints and teacher adjustments, and only if it beats the baseline on Simulated group value and balance and Teacher acceptance rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Skill complementarity | Difference in mastery profile. Peer benefit. Guard against: kT. |
| Add Schedule overlap | Shared availability. Feasibility. Guard against: calendar. |
| Add Prior collaboration outcomes | Past group success. History. Guard against: data. |
| Run it as one pipeline | Student profiles (LMS), Compatibility scorer (GBDT), Group optimiser (ILP), Fairness checks (constraints), Group formation (LMS) and Outcome tracking (analytics), with Teacher adjustment off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle absent students break groups | Substitution rules and rebalancing. |

**Deliberately not doing**

- Student name: none.
- Seat position: weak.

**How the approach is proven**

Prove it offline on Simulated group value and balance and Teacher acceptance rate using time-ordered splits, then online on "Group task outcomes" with "Peer-reported collaboration quality" as the guardrail. Watch for: Optimising averages and No collaboration outcome data.

## Baseline and production design

- **Baseline (build this first):** Random or alphabetical grouping.
- **Production design:** Constrained group optimisation (ILP) over complementarity and schedule fit with fairness constraints and teacher adjustments.

## Why AI, and why this kind

**Why AI.** Form study groups and pair students to maximise learning and inclusion using skills, schedules and interaction history. The evidence that separates good from bad outcomes (Skill complementarity, Schedule overlap, Prior collaboration outcomes) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "homogeneous ability grouping" are what teams reach for first, and they fail because mixed-skill groups benefit both with scaffolding. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Constrained group optimisation (ILP) over complementarity and schedule fit with fairness constraints and teacher adjustments.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Skill complementarity, Schedule overlap, Prior collaboration outcomes and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Random or alphabetical grouping | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Constrained group optimisation (ILP) over complementarity and schedule fit with fairness constraints and teacher adjustments | chosen | Meets the run-window envelope at $1.80 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Group task outcomes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Optimising averages.
- Evaluation trap: No collaboration outcome data.
- Absent students break groups: groups too small.
- Group conflict: learning stalls.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
