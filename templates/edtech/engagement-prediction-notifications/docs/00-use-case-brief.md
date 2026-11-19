# Learner Engagement Prediction & Notifications: use-case brief

> Generated from the blueprint `edtech/engagement-prediction-notifications` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Learner Engagement Prediction & Notifications · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict lapse risk and send the right reminder at the right time to keep learners practising, without notification fatigue. The system has to run as a scheduled batch job, inside these limits: Frequency caps, Wellbeing considerations for minors and Consent.

**Why it is hard.** The obvious approach is streak pressure, and it fails because aggressive streaks cause anxiety and churn. The second trap is in "Treatment": the real signal is uplift of nudge vs no nudge, while teams usually reach for predict lapse then notify.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way opt-out rate measures it.

**What success looks like.** Offline: Off-policy value estimate and Calibration of lapse hazard. Online: Weekly active practice minutes and Opt-out rate. The launch is judged on "Weekly active practice minutes" while "Opt-out rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict lapse risk and send the right reminder at the right time to keep learners practising, without notification fatigue.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t(\text{practice}_t-\kappa\,\text{optout}_t)\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \gamma^t | Discount factor for later steps. |
| \text{practice}_t | Practice done by the learner at step t. |
| \kappa | How heavily an opt-out is penalised compared with practice. |
| \text{optout}_t | Whether the learner opted out of notifications at step t. |

**Hard constraints**

- Frequency caps
- Wellbeing considerations for minors
- Consent
- Streak design ethics

## The approach in one paragraph

Start with daily reminder at a fixed time. Then earn the move to survival-based lapse model plus contextual bandit for timing and message type with uplift gating, and only if it beats the baseline on Off-policy value estimate and Calibration of lapse hazard after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Lapse hazard | Probability of missing the next 3 days. Targeting. Guard against: survival. |
| Add Preferred study time | Personal time-of-day. Timing. Guard against: history. |
| Add Notification fatigue | Recent notifications and ignores. Cap. Guard against: counters. |
| Run it as one pipeline | Activity events (stream), Lapse features (Flink), Hazard model (GBDT), Timing and message bandit (Thompson), Frequency arbiter (caps), Push service (notification) and Outcomes (events). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle exam week changes study patterns | Calendar and school-term features. |

**Deliberately not doing**

- Device type: weak.
- Account age: confounded.

**How the approach is proven**

Prove it offline on Off-policy value estimate and Calibration of lapse hazard using time-ordered splits, then online on "Weekly active practice minutes" with "Opt-out rate" as the guardrail. Watch for: Optimising opens and No holdouts for uplift.

## Baseline and production design

- **Baseline (build this first):** Daily reminder at a fixed time.
- **Production design:** Survival-based lapse model plus contextual bandit for timing and message type with uplift gating.

## Why AI, and why this kind

**Why AI.** Predict lapse risk and send the right reminder at the right time to keep learners practising, without notification fatigue. The evidence that separates good from bad outcomes (Lapse hazard, Preferred study time, Notification fatigue) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "streak pressure" are what teams reach for first, and they fail because aggressive streaks cause anxiety and churn. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Survival-based lapse model plus contextual bandit for timing and message type with uplift gating.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Lapse hazard, Preferred study time, Notification fatigue and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Daily reminder at a fixed time | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Survival-based lapse model plus contextual bandit for timing and message type with uplift gating | chosen | Meets the run-window envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Weekly active practice minutes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Optimising opens.
- Evaluation trap: No holdouts for uplift.
- Exam week changes study patterns: predictions off.
- Parents manage devices of young learners: notifications go to the wrong person.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
