# Cloud Cost Anomaly Detection: use-case brief

> Generated from the blueprint `it-ops/cloud-cost-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cloud Cost Anomaly Detection · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect unusual spend by account, service and tag, explain the likely cause and route the alert to the owning team before the monthly bill closes. The system has to run as a scheduled batch job, inside these limits: Alerts within 24 hours of the spend, Each alert names the resource and owner and Budget owners set thresholds.

**Why it is hard.** The obvious approach is month over month totals, and it fails because usage patterns vary through the month. The second trap is in "Action": the real signal is owner alert with cause and resource, while teams usually reach for a finance report.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way waste recovered measures it.

**What success looks like.** Offline: Detection of seeded cost spikes, Cause attribution accuracy and Alert precision. Online: Cost spikes caught before month end, Waste recovered and Time to owner response. The launch is judged on "Cost spikes caught before month end" while "Waste recovered" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect unusual spend by account, service and tag, explain the likely cause and route the alert to the owning team before the monthly bill closes.

**Training objective.** `\mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \\|x\\| | Norm: the length of a vector. The squared norm of a difference is the sum of squared errors. |
| x | The input features describing one example (what the model sees). |
| \mathrm{Dec} | The decoder: the network part that rebuilds the input from its compressed code. |
| \mathrm{Enc} | The encoder: the network part that compresses the input into a short code. |

**Hard constraints**

- Alerts within 24 hours of the spend
- Each alert names the resource and owner
- Budget owners set thresholds
- False alerts under 10 per week
- 2M billing lines per day

## The approach in one paragraph

Start with monthly bill review and budget alerts on total spend, because they are the standard tools. Then earn the move to a daily detector on tagged billing lines with cause attribution that raises alerts with the resource, owner and recent changes to the owning team, and only if it beats the baseline on Detection of seeded cost spikes and Cause attribution accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Spend deviation by service | Residual versus baseline. Core. Guard against: from billing. |
| Add New resource types | Services not used before. Cause. Guard against: from inventory. |
| Add Usage change | Quantity versus unit price change. Cause. Guard against: from billing. |
| Run it as one pipeline | Billing line ingestion (billing export), Tag and owner join (inventory), Baseline and deviation (detector), Cause attribution (rules and model) and Owner alert (chat and ticket), with Owner feedback and Threshold review off the critical path. |
| Optimise the right thing | The objective weighs norm: the length of a vector. The squared norm of a difference is the sum of squared errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle untagged resources | Fallback owner by account. |

**Deliberately not doing**

- Account name: an identifier.
- Invoice number: an identifier.
- Region name alone: weak link.

**How the approach is proven**

Prove it offline on Detection of seeded cost spikes, Cause attribution accuracy and Alert precision using time-ordered splits, then online on "Cost spikes caught before month end" with "Waste recovered" as the guardrail. Watch for: Total-spend budgets only, Monthly review only and Spikes treated as errors.

## Baseline and production design

- **Baseline (build this first):** Monthly bill review and budget alerts on total spend, because they are the standard tools.
- **Production design:** A daily detector on tagged billing lines with cause attribution that raises alerts with the resource, owner and recent changes to the owning team.

## Why AI, and why this kind

**Why AI.** Detect unusual spend by account, service and tag, explain the likely cause and route the alert to the owning team before the monthly bill closes. The evidence that separates good from bad outcomes (Spend deviation by service, New resource types, Usage change) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "month over month totals" are what teams reach for first, and they fail because usage patterns vary through the month. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A daily detector on tagged billing lines with cause attribution that raises alerts with the resource, owner and recent changes to the owning team.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Spend deviation by service, New resource types, Usage change and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Monthly bill review and budget alerts on total spend, because they are the standard tools | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A daily detector on tagged billing lines with cause attribution that raises alerts with the resource, owner and recent changes to the owning team | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cost spikes caught before month end) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Total-spend budgets only.
- Evaluation trap: Monthly review only.
- Untagged resources: the owner is unknown.
- Planned launch: spend rises on purpose.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
