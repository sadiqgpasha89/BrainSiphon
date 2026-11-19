# Carrier Selection & Tendering: use-case brief

> Generated from the blueprint `supply-chain/carrier-selection-and-tendering` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Carrier Selection & Tendering · **Domain:** supply-chain · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose which carrier to tender each load to, using acceptance probability, cost and service history to cut failed tenders. The system has to run interactively, within a few seconds, inside these limits: Contract allocations, Tender time limits and Service-level agreements.

**Why it is hard.** The obvious approach is following routing guide order, and it fails because guide order ignores current capacity. The second trap is in "Cost": the real signal is expected cost including failed-tender fallback, while teams usually reach for lowest contracted rate.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $3.6K a month. A mistake is expensive in the way spot spend share measures it.

**What success looks like.** Offline: Tender acceptance AUC and calibration and Simulated cost per load. Online: First-tender acceptance rate and Spot spend share. The launch is judged on "First-tender acceptance rate" while "Spot spend share" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose which carrier to tender each load to, using acceptance probability, cost and service history to cut failed tenders.

**Training objective.** `\min_a\;c_a+\lambda\,(1-p^{\text{accept}}_a)\,c^{\text{fail}}+\mu\,\text{service risk}_a`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_a | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| c_a | The cost of carrier a: c_a and c^fail the cost if the shipment fails. |
| \lambda | Weight on the risk of rejection: how strongly it counts against the main objective. |
| p^{\text{accept}}_a | The probability that carrier a accepts the load. |
| \mu | Weight on service risk: how strongly it counts against the main objective. |
| \text{service risk}_a | The risk of poor service by carrier a. |

**Hard constraints**

- Contract allocations
- Tender time limits
- Service-level agreements
- Fair distribution

## The approach in one paragraph

Start with routing guide waterfall in contract order. Then earn the move to acceptance-aware ranking with multi-armed bandit exploration for new carriers, respecting contract allocations, and only if it beats the baseline on Tender acceptance AUC and calibration and Simulated cost per load after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Carrier acceptance probability | Model per carrier-lane-day. Tender success. Guard against: history. |
| Add Carrier on-time performance | Rolling OTP. Service. Guard against: matured. |
| Add Capacity signals | Carrier posted capacity. Availability. Guard against: real-time. |
| Run it as one pipeline | Load creation (TMS), Candidate carriers (routing guide), Acceptance and OTP models (GBDT), Tender optimiser (expected-cost ranker), Tender API (carrier portals), Transport planner (human) and Outcome logs (TMS). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle carrier changes bid behaviour after rate update | Fast retraining and drift alerts. |

**Deliberately not doing**

- Carrier name: encoded in history.
- Load number: none.

**How the approach is proven**

Prove it offline on Tender acceptance AUC and calibration and Simulated cost per load using time-ordered splits, then online on "First-tender acceptance rate" with "Spot spend share" as the guardrail. Watch for: Logs only contain chosen carriers and Ignoring service impact of cheaper carriers.

## Baseline and production design

- **Baseline (build this first):** Routing guide waterfall in contract order.
- **Production design:** Acceptance-aware ranking with multi-armed bandit exploration for new carriers, respecting contract allocations.

## Why AI, and why this kind

**Why AI.** Choose which carrier to tender each load to, using acceptance probability, cost and service history to cut failed tenders. The evidence that separates good from bad outcomes (Carrier acceptance probability, Carrier on-time performance, Capacity signals) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "following routing guide order" are what teams reach for first, and they fail because guide order ignores current capacity. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Acceptance-aware ranking with multi-armed bandit exploration for new carriers, respecting contract allocations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Carrier acceptance probability, Carrier on-time performance, Capacity signals and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Routing guide waterfall in contract order | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Acceptance-aware ranking with multi-armed bandit exploration for new carriers, respecting contract allocations | chosen | Meets the 2500 ms envelope at $0.134 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (First-tender acceptance rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Logs only contain chosen carriers.
- Evaluation trap: Ignoring service impact of cheaper carriers.
- Carrier changes bid behaviour after rate update: acceptance model stale.
- Contract allocation breaches: awarding too many loads to one carrier breaches contract allocations and triggers penalties.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
