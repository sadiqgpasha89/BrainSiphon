# Maintenance Window Scheduling: use-case brief

> Generated from the blueprint `it-ops/maintenance-window-scheduling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Maintenance Window Scheduling · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose maintenance windows that minimise user impact by combining traffic forecasts, change calendars and dependencies, and propose them to service owners for approval. The system has to run as a scheduled batch job, inside these limits: Windows avoid freeze periods and peak traffic, Owners approve each window and Dependencies scheduled in order.

**Why it is hard.** The obvious approach is earliest slot, and it fails because the earliest slot may be at peak. The second trap is in "Constraint": the real signal is dependency order and freezes, while teams usually reach for independent scheduling.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way change conflicts measures it.

**What success looks like.** Offline: Impact in backtests, Conflict detection and Owner acceptance. Online: User impact during maintenance, Change conflicts and Overrun rate. The launch is judged on "User impact during maintenance" while "Change conflicts" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose maintenance windows that minimise user impact by combining traffic forecasts, change calendars and dependencies, and propose them to service owners for approval.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Windows avoid freeze periods and peak traffic
- Owners approve each window
- Dependencies scheduled in order
- Proposal within 1 hour of a request
- 20K maintenance events per year

## The approach in one paragraph

Start with owners choosing weekend nights by habit, because it is the usual practice. Then earn the move to a scheduler that scores candidate windows by forecast impact and conflicts, orders dependent work and proposes slots with notices for approval, and only if it beats the baseline on Impact in backtests and Conflict detection after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Traffic forecast by hour | Expected load. Impact. Guard against: from capacity forecasts. |
| Add Change calendar | Other planned changes. Conflicts. Guard against: from ITSM. |
| Add Dependency graph | Upstream and downstream services. Order. Guard against: from the CMDB. |
| Run it as one pipeline | Request intake (ITSM), Traffic forecast lookup (forecasts), Conflict and dependency check (rules), Window scoring (optimiser), Proposal to owner (workflow) and Notification (chat), with Outcome review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle global user base | Rolling windows by region. |

**Deliberately not doing**

- Requester name: personal data.
- Change number: an identifier.
- Team name: weak link.

**How the approach is proven**

Prove it offline on Impact in backtests, Conflict detection and Owner acceptance using time-ordered splits, then online on "User impact during maintenance" with "Change conflicts" as the guardrail. Watch for: Habit-based windows, Earliest slot booking and Ignoring dependency order.

## Baseline and production design

- **Baseline (build this first):** Owners choosing weekend nights by habit, because it is the usual practice.
- **Production design:** A scheduler that scores candidate windows by forecast impact and conflicts, orders dependent work and proposes slots with notices for approval.

## Why AI, and why this kind

**Why AI.** Choose maintenance windows that minimise user impact by combining traffic forecasts, change calendars and dependencies, and propose them to service owners for approval. The evidence that separates good from bad outcomes (Traffic forecast by hour, Change calendar, Dependency graph) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "earliest slot" are what teams reach for first, and they fail because the earliest slot may be at peak. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A scheduler that scores candidate windows by forecast impact and conflicts, orders dependent work and proposes slots with notices for approval.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Traffic forecast by hour, Change calendar, Dependency graph and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Owners choosing weekend nights by habit, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A scheduler that scores candidate windows by forecast impact and conflicts, orders dependent work and proposes slots with notices for approval | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (User impact during maintenance) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Habit-based windows.
- Evaluation trap: Earliest slot booking.
- Global user base: no quiet hour exists.
- Overrun: maintenance exceeds its window.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
