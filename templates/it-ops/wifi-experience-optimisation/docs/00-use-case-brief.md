# Wi-Fi Experience Optimisation: use-case brief

> Generated from the blueprint `it-ops/wifi-experience-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Wi-Fi Experience Optimisation · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Tune channel, power and access point placement recommendations from client experience data so wireless issues fall, using access point and client-class aggregates and not named users. The system has to run interactively, within a few seconds, inside these limits: Client data aggregated by access point and device class, Changes applied in staged groups and Rollback on experience regression.

**Why it is hard.** The obvious approach is signal strength alone, and it fails because strong signal can still be congested. The second trap is in "Level": the real signal is access point and area, while teams usually reach for named users.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.7K a month. A mistake is expensive in the way connection success rate measures it.

**What success looks like.** Offline: Experience metric accuracy, Gains in staged tests and Rollback frequency. Online: Wi-Fi tickets, Connection success rate and Throughput at peak. The launch is judged on "Wi-Fi tickets" while "Connection success rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Tune channel, power and access point placement recommendations from client experience data so wireless issues fall, using access point and client-class aggregates and not named users.

**Training objective.** `\mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Client data aggregated by access point and device class
- Changes applied in staged groups
- Rollback on experience regression
- Recommendations weekly for 10K access points
- Network team approves

## The approach in one paragraph

Start with periodic site surveys and automatic radio management, because they are the standard tools. Then earn the move to a recommendation engine on aggregated client experience that proposes channel, power and placement changes, tests them in groups and reports the effect, and only if it beats the baseline on Experience metric accuracy and Gains in staged tests after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Client connection failures | Failed associations and roams. Core. Guard against: from controllers. |
| Add Channel utilisation and interference | Airtime use. Core. Guard against: from access points. |
| Add Client density | Clients per access point. Load. Guard against: from controllers. |
| Run it as one pipeline | Controller telemetry (wireless controllers), Aggregation to access point (batch), Experience model (gradient boosting), Change proposal (optimiser), Staged rollout (controller) and Experience check (analytics), with Review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle event days | Event schedules. |

**Deliberately not doing**

- User name: personal data.
- Device MAC address: personal data.
- SSID label: weak link.

**How the approach is proven**

Prove it offline on Experience metric accuracy, Gains in staged tests and Rollback frequency using time-ordered splits, then online on "Wi-Fi tickets" with "Connection success rate" as the guardrail. Watch for: Signal strength as the target, Per-user tracking and Network-wide changes.

## Baseline and production design

- **Baseline (build this first):** Periodic site surveys and automatic radio management, because they are the standard tools.
- **Production design:** A recommendation engine on aggregated client experience that proposes channel, power and placement changes, tests them in groups and reports the effect.

## Why AI, and why this kind

**Why AI.** Tune channel, power and access point placement recommendations from client experience data so wireless issues fall, using access point and client-class aggregates and not named users. The evidence that separates good from bad outcomes (Client connection failures, Channel utilisation and interference, Client density) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "signal strength alone" are what teams reach for first, and they fail because strong signal can still be congested. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A recommendation engine on aggregated client experience that proposes channel, power and placement changes, tests them in groups and reports the effect.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Client connection failures, Channel utilisation and interference, Client density and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Periodic site surveys and automatic radio management, because they are the standard tools | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A recommendation engine on aggregated client experience that proposes channel, power and placement changes, tests them in groups and reports the effect | chosen | Meets the 2500 ms envelope at $0.041 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Wi-Fi tickets) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Signal strength as the target.
- Evaluation trap: Per-user tracking.
- Event days: density spikes in one area.
- Interference from neighbours: outside networks cause issues.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
