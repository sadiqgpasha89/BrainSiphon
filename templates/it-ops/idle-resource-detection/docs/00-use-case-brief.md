# Idle Resource Detection: use-case brief

> Generated from the blueprint `it-ops/idle-resource-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Idle Resource Detection · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find unused servers, volumes, snapshots and test environments from activity and ownership data and propose scheduled shutdown or deletion with owner confirmation. The system has to run as a scheduled batch job, inside these limits: Owners confirm before deletion, Resources stopped before deleted and Backups taken before deletion.

**Why it is hard.** The obvious approach is cPU alone, and it fails because some systems are idle until needed. The second trap is in "Action": the real signal is stop, wait, then delete, while teams usually reach for immediate deletion.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way wrongly stopped systems measures it.

**What success looks like.** Offline: Precision of idle proposals, Restore rate after stop and Savings realised. Online: Idle spend, Wrongly stopped systems and Time to clean. The launch is judged on "Idle spend" while "Wrongly stopped systems" must not get worse.

## Objective, loss and constraints

**Business objective.** Find unused servers, volumes, snapshots and test environments from activity and ownership data and propose scheduled shutdown or deletion with owner confirmation.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Owners confirm before deletion
- Resources stopped before deleted
- Backups taken before deletion
- Proposals include last activity
- 1M resources

## The approach in one paragraph

Start with periodic clean-up days led by engineers, because they are the common practice. Then earn the move to a detector that ranks idle candidates with dependency checks, notifies owners with a deadline and schedules stop, snapshot and delete steps through infrastructure code, and only if it beats the baseline on Precision of idle proposals and Restore rate after stop after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Activity over 30 days | Network, CPU and logins. Core. Guard against: from monitoring. |
| Add Tags and ownership | Owner and purpose. Routing. Guard against: from inventory. |
| Add Dependencies | Whether others reference the resource. Risk. Guard against: from the CMDB. |
| Run it as one pipeline | Inventory and activity join (cloud APIs), Idle scoring (model), Dependency check (CMDB), Owner notice (chat), Stop and snapshot (infrastructure code), Delete after wait (approved change) and Savings tracking (billing). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle disaster recovery systems | Tag and allow-list. |

**Deliberately not doing**

- Resource id: an identifier.
- Owner name: personal data.
- Region alone: weak link.

**How the approach is proven**

Prove it offline on Precision of idle proposals, Restore rate after stop and Savings realised using time-ordered splits, then online on "Idle spend" with "Wrongly stopped systems" as the guardrail. Watch for: CPU-only evidence, Deleting without backups and Untagged resources with no owner.

## Baseline and production design

- **Baseline (build this first):** Periodic clean-up days led by engineers, because they are the common practice.
- **Production design:** A detector that ranks idle candidates with dependency checks, notifies owners with a deadline and schedules stop, snapshot and delete steps through infrastructure code.

## Why AI, and why this kind

**Why AI.** Find unused servers, volumes, snapshots and test environments from activity and ownership data and propose scheduled shutdown or deletion with owner confirmation. The evidence that separates good from bad outcomes (Activity over 30 days, Tags and ownership, Dependencies) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "CPU alone" are what teams reach for first, and they fail because some systems are idle until needed. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A detector that ranks idle candidates with dependency checks, notifies owners with a deadline and schedules stop, snapshot and delete steps through infrastructure code.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Activity over 30 days, Tags and ownership, Dependencies and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Periodic clean-up days led by engineers, because they are the common practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A detector that ranks idle candidates with dependency checks, notifies owners with a deadline and schedules stop, snapshot and delete steps through infrastructure code | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Idle spend) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: CPU-only evidence.
- Evaluation trap: Deleting without backups.
- Disaster recovery systems: standby systems look idle but are needed for recovery.
- Batch jobs: resources run rarely.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
