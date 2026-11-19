# Buyer Lead Scoring & Routing: use-case brief

> Generated from the blueprint `real-estate/buyer-lead-scoring-and-routing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Buyer Lead Scoring & Routing · **Domain:** real-estate · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score portal enquiries by likelihood to transact and route them to the agent best placed to convert them quickly. The system has to run in under 100 milliseconds, inside these limits: Scoring and routing finish within 80 ms of the enquiry, Leads are distributed fairly among agents and teams within stated rules and No protected attributes or proxies in scoring or routing.

**Why it is hard.** The obvious approach is form fields the buyer chose to fill in, and it fails because forms are optional, and the people who fill them are not the ones most likely to buy. The second trap is in "Match": the real signal is agent fit by area expertise, price band and language, while teams usually reach for round-robin assignment.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $3.7K a month. A mistake is expensive in the way time to first contact measures it.

**What success looks like.** Offline: PR-AUC and Calibration. Online: Lead-to-viewing rate and Time to first contact. The launch is judged on "Lead-to-viewing rate" while "Time to first contact" must not get worse.

## Objective, loss and constraints

**Business objective.** Score portal enquiries by likelihood to transact and route them to the agent best placed to convert them quickly.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Scoring and routing finish within 80 ms of the enquiry
- Leads are distributed fairly among agents and teams within stated rules
- No protected attributes or proxies in scoring or routing
- Buyers who opt out of contact are never routed

## The approach in one paragraph

Start with round-robin routing, because it is simple and fair. Then earn the move to gradient boosting on intent and readiness with an assignment optimiser balancing fit and fairness, and only if it beats the baseline on PR-AUC and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Viewing depth | Number of distinct listings viewed and the share viewed more than once in 7 days. Repeat viewing of similar homes signals real intent. Guard against: bots inflate views, so filter them before computing. |
| Add Finance readiness | Pre-approval flag and stated budget relative to the viewed prices. A pre-approved buyer is far more likely to transact. Guard against: self-reported readiness is unreliable, so prefer a verified flag. |
| Add Agent response time | Median minutes from enquiry to first contact over the last 30 days. Predicts whether a lead gets a fast reply. Guard against: agents can game it by sending empty acknowledgements. |
| Run it as one pipeline | Enquiry intake (portal), Bot filter (rules), Lead scoring (boosting), Agent matching (optimiser), Notification (push), CRM sync (CRM) and Outcome feed (warehouse). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle bot enquiries | Filter by bot signals and exclude them from training labels. |

**Deliberately not doing**

- Name: Irrelevant to intent and a direct route to bias.
- Email domain: Mostly a proxy for employer or income and not for intent to buy.
- Device: A proxy for income and age that adds no information about readiness.

**How the approach is proven**

Prove it offline on PR-AUC and Calibration using time-ordered splits, then online on "Lead-to-viewing rate" with "Time to first contact" as the guardrail. Watch for: Outcomes are observed only for leads that were contacted, so the model cannot learn from the rest and Agent quality confounds results, since a strong agent converts weak leads and flatters the score.

## Baseline and production design

- **Baseline (build this first):** Round-robin routing, because it is simple and fair.
- **Production design:** Gradient boosting on intent and readiness with an assignment optimiser balancing fit and fairness.

## Why AI, and why this kind

**Why AI.** Score portal enquiries by likelihood to transact and route them to the agent best placed to convert them quickly. The evidence that separates good from bad outcomes (Viewing depth, Finance readiness, Agent response time) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "form fields the buyer chose to fill in" are what teams reach for first, and they fail because forms are optional, and the people who fill them are not the ones most likely to buy. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting on intent and readiness with an assignment optimiser balancing fit and fairness.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Viewing depth, Finance readiness, Agent response time and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Round-robin routing, because it is simple and fair | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on intent and readiness with an assignment optimiser balancing fit and fairness | chosen | Meets the 80 ms envelope at $0.083 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Lead-to-viewing rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Outcomes are observed only for leads that were contacted, so the model cannot learn from the rest.
- Evaluation trap: Agent quality confounds results, since a strong agent converts weak leads and flatters the score.
- Bot enquiries: bots send fake enquiries that waste agent time and distort the model.
- Multiple enquiries: the same buyer sends several enquiries and is counted as many leads.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
