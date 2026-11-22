# Clinical Communication Workload Optimization: use-case brief

> Generated from the blueprint `healthcare/clinical-communication-workload-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Communication Workload Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Reduce avoidable message overload by finding duplicates, bundling and routing improvements and by forecasting workload, while making sure urgent information still reaches an accountable recipient. The system has to run as a scheduled batch job, inside these limits: Clinically significant alerts are never suppressed without approved rules and a safety validation, Recommendations are proposals that a governance group approves before any notification rule changes and Urgent and safety-critical categories are excluded from reduction.

**Why it is hard.** The obvious approach is all messages eligible, and it fails because reduction must not touch critical alerts. The second trap is in "Evidence": the real signal is volume removed and categories touched shown, while teams usually reach for percent reduction only.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way urgent messages reaching accountable recipients measures it.

**What success looks like.** Offline: Safety-exclusion violations in proposals (must be zero), Duplicate-cluster precision on audited samples and Forecast error by team. Online: Message volume per clinician per shift, Urgent messages reaching accountable recipients and Share of proposals approved by governance. The launch is judged on "Message volume per clinician per shift" while "Urgent messages reaching accountable recipients" must not get worse.

## Objective, loss and constraints

**Business objective.** Reduce avoidable message overload by finding duplicates, bundling and routing improvements and by forecasting workload, while making sure urgent information still reaches an accountable recipient.

**Training objective.** `\min\;\sum_g \text{load}_g+\mu\sum_k \text{missed urgent}_k\quad\text{s.t. approved policy and safety constraints}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_g | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \text{load}_g | The weighted message load on team g after bundling and routing changes. |
| \mu | A large penalty weight on any missed urgent message relative to load. |
| \text{missed urgent}_k | The count of urgent or safety-critical messages that would not reach an accountable recipient under proposal k; it must stay at zero. |

**Hard constraints**

- Clinically significant alerts are never suppressed without approved rules and a safety validation
- Recommendations are proposals that a governance group approves before any notification rule changes
- Urgent and safety-critical categories are excluded from reduction
- Every recommendation shows the volume it removes and the categories it touches
- Analyses 40M messages per quarter
- Staff-level data is aggregated

## The approach in one paragraph

Start with a committee reviews complaints about message overload each year. Then earn the move to clustering of near-duplicate messages, ranking of low-value notification categories, a workload forecast and a constrained optimiser for bundling and routing assignment that treats approved safety exclusions as hard constraints, and only if it beats the baseline on Safety-exclusion violations in proposals (must be zero) and Duplicate-cluster precision on audited samples after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Duplicate cluster size | Messages in a cluster of near-identical content to the same group. Shows avoidable load. Guard against: message text and metadata. |
| Add Acknowledgement rate by category | Share of messages acknowledged and acted on. Low value messages stand out. Guard against: earlier periods. |
| Add Team workload | Messages per staff member per shift. Overload measure. Guard against: roster and message data. |
| Run it as one pipeline | Message and policy intake (warehouse extracts), Duplicate clusterer (embeddings and clustering), Category value ranker (acknowledgement analytics), Workload forecaster (time-series model) and Bundling and routing optimizer (constrained solver), with Governance review and safety validation and Outcome and audit log off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle duplicate that is a legitimate repeat | Urgency exclusion and a repeat rule. |

**Deliberately not doing**

- Message length: not value.
- Sender identity: not a value factor.
- Time of day alone: confounded.

**How the approach is proven**

Prove it offline on Safety-exclusion violations in proposals (must be zero), Duplicate-cluster precision on audited samples and Forecast error by team using time-ordered splits, then online on "Message volume per clinician per shift" with "Urgent messages reaching accountable recipients" as the guardrail. Watch for: Optimising volume while ignoring urgent categories, Suppressing without approval and Clustering across unrelated patients.

## Baseline and production design

- **Baseline (build this first):** A committee reviews complaints about message overload each year.
- **Production design:** Clustering of near-duplicate messages, ranking of low-value notification categories, a workload forecast and a constrained optimiser for bundling and routing assignment that treats approved safety exclusions as hard constraints.

## Why AI, and why this kind

**Why AI.** Reduce avoidable message overload by finding duplicates, bundling and routing improvements and by forecasting workload, while making sure urgent information still reaches an accountable recipient. The evidence that separates good from bad outcomes (Duplicate cluster size, Acknowledgement rate by category, Team workload) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "all messages eligible" are what teams reach for first, and they fail because reduction must not touch critical alerts. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Clustering of near-duplicate messages, ranking of low-value notification categories, a workload forecast and a constrained optimiser for bundling and routing assignment that treats approved safety exclusions as hard constraints.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Duplicate cluster size, Acknowledgement rate by category, Team workload and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A committee reviews complaints about message overload each year | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Clustering of near-duplicate messages, ranking of low-value notification categories, a workload forecast and a constrained optimiser for bundling and routing assignment that treats approved safety exclusions as hard constraints | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Message volume per clinician per shift) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Optimising volume while ignoring urgent categories.
- Evaluation trap: Suppressing without approval.
- Duplicate that is a legitimate repeat: the second message is a reminder of an urgent item.
- Seasonal surge: forecast is low.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
