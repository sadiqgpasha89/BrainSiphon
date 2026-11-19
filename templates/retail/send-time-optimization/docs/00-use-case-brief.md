# Notification Send-Time & Frequency Optimisation: use-case brief

> Generated from the blueprint `retail/send-time-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Notification Send-Time & Frequency Optimisation · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose when and how often to send push, email and SMS per user to maximise engagement without driving opt-outs. The system has to run as a scheduled batch job, inside these limits: Quiet hours and regulation, Per-channel caps and Opt-out is permanent loss.

**Why it is hard.** The obvious approach is open rate of the next message, and it fails because maximising opens drives fatigue and unsubscribes. The second trap is in "Exploration": the real signal is randomised time slots with bandit exploration, while teams usually reach for fixed per-user best hour from history.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 69 at peak, at an estimated $1.7K a month. A mistake is expensive in the way unsubscribe rate measures it.

**What success looks like.** Offline: Off-policy estimate of engagement and opt-out and Calibration of hazard. Online: Engaged sessions per message and Unsubscribe rate. The launch is judged on "Engaged sessions per message" while "Unsubscribe rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose when and how often to send push, email and SMS per user to maximise engagement without driving opt-outs.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\sum_t \gamma^t\,(r^{\text{engage}}_t-\kappa\,\mathbb{1}_{\text{optout},t})\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \gamma^t | Discount factor for later steps. |
| r^{\text{engage}}_t | Reward for engagement at step t, for example an open or click. |
| \kappa | How heavily an opt-out is penalised compared with engagement. |
| \mathbb{1}_{\text{optout},t} | Indicator that the customer opted out at step t. |

**Hard constraints**

- Quiet hours and regulation
- Per-channel caps
- Opt-out is permanent loss
- 10M users nightly

## The approach in one paragraph

Start with fixed 10 AM local-time sends. Then earn the move to contextual bandit per user with hierarchical shrinkage, opt-out hazard model and frequency-budget optimiser, and only if it beats the baseline on Off-policy estimate of engagement and opt-out and Calibration of hazard after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Hourly engagement profile | Per-user open probability by hour with shrinkage. Timing. Guard against: windowed history before the send. |
| Add Fatigue state | Messages in last 7 days and recent ignores. Saturation. Guard against: rolling count excl. current send. |
| Add Opt-out hazard | Modelled probability of unsubscribe. Cost term. Guard against: calibrated per channel. |
| Run it as one pipeline | Engagement events (Kafka), User feature builder (Spark), Hazard and open models (GBDT), Contextual bandit (Thompson sampling), Budget optimiser (per-user caps), Message scheduler (queue) and Outcome logging (analytics). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle time-zone change when travelling | Device-time-zone signal with last-active time. |

**Deliberately not doing**

- Device type: weak.
- Account age: confounded with fatigue.

**How the approach is proven**

Prove it offline on Off-policy estimate of engagement and opt-out and Calibration of hazard using time-ordered splits, then online on "Engaged sessions per message" with "Unsubscribe rate" as the guardrail. Watch for: Optimising opens inflated by privacy-proxy pre-fetch and Logged policy lacks exploration.

## Baseline and production design

- **Baseline (build this first):** Fixed 10 AM local-time sends.
- **Production design:** Contextual bandit per user with hierarchical shrinkage, opt-out hazard model and frequency-budget optimiser.

## Why AI, and why this kind

**Why AI.** Choose when and how often to send push, email and SMS per user to maximise engagement without driving opt-outs. The evidence that separates good from bad outcomes (Hourly engagement profile, Fatigue state, Opt-out hazard) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "open rate of the next message" are what teams reach for first, and they fail because maximising opens drives fatigue and unsubscribes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Contextual bandit per user with hierarchical shrinkage, opt-out hazard model and frequency-budget optimiser.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Hourly engagement profile, Fatigue state, Opt-out hazard and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed 10 AM local-time sends | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Contextual bandit per user with hierarchical shrinkage, opt-out hazard model and frequency-budget optimiser | chosen | Meets the run-window envelope at $0.0094 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Engaged sessions per message) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Optimising opens inflated by privacy-proxy pre-fetch.
- Evaluation trap: Logged policy lacks exploration.
- Time-zone change when travelling: quiet-hours breach.
- Large campaign collisions: users receive many messages same hour.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
