# B2B SaaS Churn Prediction: use-case brief

> Generated from the blueprint `saas/b2b-saas-churn-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** B2B SaaS Churn Prediction · **Domain:** saas · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict account-level churn and contraction 90 days ahead and recommend the intervention that actually retains revenue. The system has to run as a scheduled batch job, inside these limits: Contract renewal cycles, Few accounts relative to users and Explainable to CSMs.

**Why it is hard.** The obvious approach is user-level churn, and it fails because accounts churn when the champion or admin leaves, not when one user does. The second trap is in "Action": the real signal is uplift on CSM interventions, while teams usually reach for churn probability only.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way net revenue retention measures it.

**What success looks like.** Offline: Time-dependent AUC and calibration and Uplift on CSM-treated accounts. Online: Gross revenue retention and Net revenue retention. The launch is judged on "Gross revenue retention" while "Net revenue retention" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict account-level churn and contraction 90 days ahead and recommend the intervention that actually retains revenue.

**Training objective.** `\mathcal{L}=-\sum_i\left[\delta_i\log h(t_i)-H(t_i)\right]\ \text{(account-level survival)}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \delta_i | Event indicator: 1 if the account churned, 0 if still active at the end of observation. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| h | The hazard: the chance of churn at time t given the account is still active. |
| t_i | The time the account churned or was last observed. |
| H | The cumulative hazard up to time t_i. |

**Hard constraints**

- Contract renewal cycles
- Few accounts relative to users
- Explainable to CSMs
- Weekly refresh

## The approach in one paragraph

Start with rule-based health score from usage thresholds. Then earn the move to discrete-time survival GBDT on account-level features with champion-change detection and an uplift layer for CSM playbooks, and only if it beats the baseline on Time-dependent AUC and calibration and Uplift on CSM-treated accounts after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Admin and champion activity | Logins and configuration changes by admins. Ownership. Guard against: role mapping. |
| Add Seat utilisation trend | Active seats over licensed seats, 90-day slope. Shelfware risk. Guard against: billing data as-of. |
| Add Support-ticket sentiment and escalations | Rate and severity of tickets. Dissatisfaction. Guard against: matured tickets. |
| Run it as one pipeline | Product and billing events (warehouse), Account feature builder (dbt and Spark), Churn hazard model (GBDT), Uplift selector (T-learner), CSM worklist (CRM), CSM outreach (human) and Renewal outcomes (labels). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle champion leaves the customer | Contact-graph monitoring and champion-change features. |

**Deliberately not doing**

- Number of logins total: scale with account size.
- Company logo or industry text: weak.

**How the approach is proven**

Prove it offline on Time-dependent AUC and calibration and Uplift on CSM-treated accounts using time-ordered splits, then online on "Gross revenue retention" with "Net revenue retention" as the guardrail. Watch for: Features computed after the renewal conversation started and Treating all churn as preventable.

## Baseline and production design

- **Baseline (build this first):** Rule-based health score from usage thresholds.
- **Production design:** Discrete-time survival GBDT on account-level features with champion-change detection and an uplift layer for CSM playbooks.

## Why AI, and why this kind

**Why AI.** Predict account-level churn and contraction 90 days ahead and recommend the intervention that actually retains revenue. The evidence that separates good from bad outcomes (Admin and champion activity, Seat utilisation trend, Support-ticket sentiment and escalations) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "user-level churn" are what teams reach for first, and they fail because accounts churn when the champion or admin leaves, not when one user does. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Discrete-time survival GBDT on account-level features with champion-change detection and an uplift layer for CSM playbooks.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Admin and champion activity, Seat utilisation trend, Support-ticket sentiment and escalations and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based health score from usage thresholds | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Discrete-time survival GBDT on account-level features with champion-change detection and an uplift layer for CSM playbooks | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Gross revenue retention) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Features computed after the renewal conversation started.
- Evaluation trap: Treating all churn as preventable.
- Champion leaves the customer: usage looks fine until the renewal blows up.
- Price increase announced: churn spike unrelated to usage.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
