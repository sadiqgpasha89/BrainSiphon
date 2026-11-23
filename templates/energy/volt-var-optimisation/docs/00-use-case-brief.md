# Volt-VAR Optimisation Advisor: use-case brief

> Generated from the blueprint `energy/volt-var-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Volt-VAR Optimisation Advisor · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend capacitor, regulator and inverter settings that keep voltage in range and reduce losses, as advice to the operator within protection limits. The system has to run interactively, within a few seconds, inside these limits: Voltage limits enforced in a rules layer outside the model, Operator approves each settings change and Recommendation every 5 minutes.

**Why it is hard.** The obvious approach is a learned limit, and it fails because a learned limit can fail in a rare state. The second trap is in "Model": the real signal is a power flow model with learned corrections, while teams usually reach for a pure black box.

**Scale and stakes.** At 10 million users this is about 36.0M model-touching events a day, 417 requests per second on average and 2.5K at peak, at an estimated $6.3K a month. A mistake is expensive in the way technical losses measures it.

**What success looks like.** Offline: Predicted versus measured voltage, Safety clip rate and Loss estimate error. Online: Voltage violations, Technical losses and Device switching count. The launch is judged on "Voltage violations" while "Technical losses" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend capacitor, regulator and inverter settings that keep voltage in range and reduce losses, as advice to the operator within protection limits.

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

- Voltage limits enforced in a rules layer outside the model
- Operator approves each settings change
- Recommendation every 5 minutes
- Simulation test before live use
- 800 feeders

## The approach in one paragraph

Start with fixed capacitor schedules by season and time of day, because they are the standard practice. Then earn the move to a model-predictive advisor on a power flow model with learned load corrections, a safety clip in rules and a human approval step with simulation previews, and only if it beats the baseline on Predicted versus measured voltage and Safety clip rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Measured voltage profile | Voltages along the feeder. Violation risk. Guard against: from meters and sensors. |
| Add Load and DER forecast | Net load and solar output forecast. Look-ahead. Guard against: from the forecasts. |
| Add Device state and wear | Switch counts of capacitors and regulators. Equipment life. Guard against: from device logs. |
| Run it as one pipeline | Telemetry and meter voltages (SCADA and AMI), State estimate (power flow), Load and DER forecast (time-series model), Setting optimiser (constrained solver), Safety clip (rules), Operator advice display (ADMS) and Savings evaluation (matched periods). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle reverse power flow | Inverter setting recommendations and limits. |

**Deliberately not doing**

- Device name: an identifier.
- Operator name: irrelevant.
- Timestamp precision: an artefact.

**How the approach is proven**

Prove it offline on Predicted versus measured voltage, Safety clip rate and Loss estimate error using time-ordered splits, then online on "Voltage violations" with "Technical losses" as the guardrail. Watch for: Learned safety limits, Raw before-and-after savings and Ignoring DER output.

## Baseline and production design

- **Baseline (build this first):** Fixed capacitor schedules by season and time of day, because they are the standard practice.
- **Production design:** A model-predictive advisor on a power flow model with learned load corrections, a safety clip in rules and a human approval step with simulation previews.

## Why AI, and why this kind

**Why AI.** Recommend capacitor, regulator and inverter settings that keep voltage in range and reduce losses, as advice to the operator within protection limits. The evidence that separates good from bad outcomes (Measured voltage profile, Load and DER forecast, Device state and wear) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A learned limit" are what teams reach for first, and they fail because A learned limit can fail in a rare state. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: A model-predictive advisor on a power flow model with learned load corrections, a safety clip in rules and a human approval step with simulation previews.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Measured voltage profile, Load and DER forecast, Device state and wear and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed capacitor schedules by season and time of day, because they are the standard practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A model-predictive advisor on a power flow model with learned load corrections, a safety clip in rules and a human approval step with simulation previews | chosen | Meets the 2500 ms envelope at $0.0059 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Voltage violations) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Learned safety limits.
- Evaluation trap: Raw before-and-after savings.
- Reverse power flow: solar export raises voltage.
- Sensor error: a bad voltage reading misleads the model.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
