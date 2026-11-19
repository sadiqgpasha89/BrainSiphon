# Collections Propensity & Next-Best-Action: use-case brief

> Generated from the blueprint `fintech/collections-propensity-and-next-best-action` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Collections Propensity & Next-Best-Action · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose the contact channel, time and offer that maximise cure rate per rupee of collection cost while respecting conduct rules. The system has to run as a scheduled batch job, inside these limits: Contact-frequency and time-of-day regulations, Hardship customers excluded and Daily capacity of dialer agents.

**Why it is hard.** The obvious approach is calling the customers most likely to pay anyway, and it fails because self-cure customers waste budget and annoy. The second trap is in "Conduct": the real signal is hard compliance constraints in the optimiser, while teams usually reach for post-hoc filtering of recommendations.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.6K a month. A mistake is expensive in the way complaint rate measures it.

**What success looks like.** Offline: Qini coefficient and Expected cure per contact. Online: Cure rate per collection rupee and Complaint rate. The launch is judged on "Cure rate per collection rupee" while "Complaint rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose the contact channel, time and offer that maximise cure rate per rupee of collection cost while respecting conduct rules.

**Training objective.** `\mathcal{L}=-\sum_i\sum_a \hat\tau_a(x_i)\,\pi(a\mid x_i)+\lambda\,\mathrm{Cost}(\pi)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \hat{\tau}_a | Estimated benefit of action a for customer i, relative to doing nothing. |
| x_i | The input features describing one example (what the model sees). (one value per example i) |
| \pi | The policy: the probability of choosing action a for customer x_i. |
| a | An action (such as call, text or offer) among those available. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Cost} | Cost of the actions the policy takes. |

**Hard constraints**

- Contact-frequency and time-of-day regulations
- Hardship customers excluded
- Daily capacity of dialer agents
- Treat customers fairly

## The approach in one paragraph

Start with propensity-to-pay model sorted by balance. Then earn the move to uplift model (T-learner with GBDT) feeding a constrained assignment optimiser over channels and agent capacity, and only if it beats the baseline on Qini coefficient and Expected cure per contact after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Promise-to-pay reliability | Share of past promises honoured. Strong behavioural predictor. Guard against: promise outcome known only after follow-up date. |
| Add Channel responsiveness | Historic response rate by SMS, call and email. Personal preference. Guard against: exclude responses to the current campaign. |
| Add Days past due and roll rate | Current bucket and transition probabilities. Core delinquency state. Guard against: bucket at as-of date only. |
| Run it as one pipeline | Delinquency snapshot (core banking extract), Uplift scorer (GBDT T-learner), Constraint optimiser (OR-Tools), Compliance filter (conduct rules), Campaign dispatcher (dialer and SMS), Agent desk (human collectors) and Outcome feed (payments and promises). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle hardship flag arrives late | Real-time suppression list check at dispatch. |

**Deliberately not doing**

- Agent name: memorises individual agents, not strategy.
- Phone area code: location proxy with fairness risk.

**How the approach is proven**

Prove it offline on Qini coefficient and Expected cure per contact using time-ordered splits, then online on "Cure rate per collection rupee" with "Complaint rate" as the guardrail. Watch for: Training on all contacted customers without a holdout and Cure measured at different horizons across treatments.

## Baseline and production design

- **Baseline (build this first):** Propensity-to-pay model sorted by balance.
- **Production design:** Uplift model (T-learner with GBDT) feeding a constrained assignment optimiser over channels and agent capacity.

## Why AI, and why this kind

**Why AI.** Choose the contact channel, time and offer that maximise cure rate per rupee of collection cost while respecting conduct rules. The evidence that separates good from bad outcomes (Promise-to-pay reliability, Channel responsiveness, Days past due and roll rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "calling the customers most likely to pay anyway" are what teams reach for first, and they fail because self-cure customers waste budget and annoy. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Uplift model (T-learner with GBDT) feeding a constrained assignment optimiser over channels and agent capacity.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Promise-to-pay reliability, Channel responsiveness, Days past due and roll rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Propensity-to-pay model sorted by balance | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Uplift model (T-learner with GBDT) feeding a constrained assignment optimiser over channels and agent capacity | chosen | Meets the run-window envelope at $0.061 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cure rate per collection rupee) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on all contacted customers without a holdout.
- Evaluation trap: Cure measured at different horizons across treatments.
- Hardship flag arrives late: contact made to protected customer.
- Dialer capacity drops: plan overruns daily cap.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
