# Tariff Recommendation: use-case brief

> Generated from the blueprint `energy/tariff-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Tariff Recommendation · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend the tariff that would have cost each customer the least on their own usage, and tell them how confident the saving is, so plans fit how people actually use energy. The system has to run as a scheduled batch job, inside these limits: Recommendation based on the customer's own usage and consent, Savings shown with a range and The cheapest plan is shown even when it is not the utility's most profitable.

**Why it is hard.** The obvious approach is an average household, and it fails because usage shapes differ widely. The second trap is in "Honesty": the real signal is the cheapest plan with the range of savings, while teams usually reach for the highest margin plan.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.6K a month. A mistake is expensive in the way complaints about advice measures it.

**What success looks like.** Offline: Savings forecast error, Range coverage and Rule compliance on audits. Online: Customer savings realised, Complaints about advice and Plan switch satisfaction. The launch is judged on "Customer savings realised" while "Complaints about advice" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend the tariff that would have cost each customer the least on their own usage, and tell them how confident the saving is, so plans fit how people actually use energy.

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

- Recommendation based on the customer's own usage and consent
- Savings shown with a range
- The cheapest plan is shown even when it is not the utility's most profitable
- Regulator rules followed
- 3M accounts

## The approach in one paragraph

Start with a tariff comparison from a typical household profile, because it is the common web calculator. Then earn the move to a tariff replay engine on the customer's own intervals with sensitivity ranges, eligibility checks and a clear explanation of the trade-offs, and only if it beats the baseline on Savings forecast error and Range coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Replayed annual cost | Cost of past usage under each tariff. Core signal. Guard against: from interval data. |
| Add Usage shape stability | How much the pattern varies by year. Reliability. Guard against: from history. |
| Add Planned changes | Solar, EV or heat pump plans. Future shape. Guard against: from the customer. |
| Run it as one pipeline | Usage and eligibility lookup (MDM and CIS), Tariff replay (rating engine), Sensitivity range (scenarios), Eligibility and rules check (rules), Recommendation text (templated explanation), Customer or agent view (portal) and Outcome tracking (annual). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle short history | Wide ranges and a low confidence note. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Marketing segment: weak link.
- Home size alone: weak link.

**How the approach is proven**

Prove it offline on Savings forecast error, Range coverage and Rule compliance on audits using time-ordered splits, then online on "Customer savings realised" with "Complaints about advice" as the guardrail. Watch for: Typical household assumptions, Margin-led recommendations and Single-point savings.

## Baseline and production design

- **Baseline (build this first):** A tariff comparison from a typical household profile, because it is the common web calculator.
- **Production design:** A tariff replay engine on the customer's own intervals with sensitivity ranges, eligibility checks and a clear explanation of the trade-offs.

## Why AI, and why this kind

**Why AI.** Recommend the tariff that would have cost each customer the least on their own usage, and tell them how confident the saving is, so plans fit how people actually use energy. The evidence that separates good from bad outcomes (Replayed annual cost, Usage shape stability, Planned changes) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "an average household" are what teams reach for first, and they fail because usage shapes differ widely. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A tariff replay engine on the customer's own intervals with sensitivity ranges, eligibility checks and a clear explanation of the trade-offs.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Replayed annual cost, Usage shape stability, Planned changes and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A tariff comparison from a typical household profile, because it is the common web calculator | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A tariff replay engine on the customer's own intervals with sensitivity ranges, eligibility checks and a clear explanation of the trade-offs | chosen | Meets the run-window envelope at $0.091 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Customer savings realised) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Typical household assumptions.
- Evaluation trap: Margin-led recommendations.
- Short history: less than a year of data.
- New tariff: no rating history.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
