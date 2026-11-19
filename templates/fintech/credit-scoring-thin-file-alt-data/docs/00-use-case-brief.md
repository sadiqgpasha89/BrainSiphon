# Credit Scoring for Thin-File Borrowers with Alternative Data: use-case brief

> Generated from the blueprint `fintech/credit-scoring-thin-file-alt-data` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Credit Scoring for Thin-File Borrowers with Alternative Data · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Extend fair credit to customers with no bureau history using cash-flow and behavioural data, at default rates equal to prime segments. The system has to run in under 100 milliseconds, inside these limits: ECOA / fair-lending compliance, Consent-based data only and Adverse-action reason codes.

**Why it is hard.** The obvious approach is phone brand or social graph proxies, and it fails because proxy features trigger disparate-impact findings. The second trap is in "Reject inference": the real signal is augment with reject-inference or randomised approvals, while teams usually reach for training only on approved applicants.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $3.6K a month. A mistake is expensive in the way incremental approvals at equal loss measures it.

**What success looks like.** Offline: Gini and KS on out-of-time sample and Approval-rate parity ratios. Online: Bad rate in thin-file cohort and Incremental approvals at equal loss. The launch is judged on "Bad rate in thin-file cohort" while "Incremental approvals at equal loss" must not get worse.

## Objective, loss and constraints

**Business objective.** Extend fair credit to customers with no bureau history using cash-flow and behavioural data, at default rates equal to prime segments.

**Training objective.** `\mathcal{L}=\mathrm{BCE}+\lambda_1\,\mathrm{MonotonicityPenalty}+\lambda_2\,\mathrm{DemographicParity}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \lambda_1 | Weights on the penalties: lambda_1 for monotonicity and lambda_2 for demographic parity. |
| \mathrm{MonotonicityPenalty} | Penalty when predicted risk moves in the wrong direction as a feature improves (for example, risk rising as income rises). |
| \mathrm{DemographicParity} | Demographic parity penalty: grows when positive prediction rates differ between groups. |

**Hard constraints**

- ECOA / fair-lending compliance
- Consent-based data only
- Adverse-action reason codes
- Stable score for 12 months

## The approach in one paragraph

Start with logistic regression on 25 cash-flow features with monotone constraints. Then earn the move to monotone gradient boosting with a fairness-constrained post-processing step and reject-inference via a 2% randomised approval cohort, and only if it beats the baseline on Gini and KS on out-of-time sample and Approval-rate parity ratios after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Inflow volatility 90d | Coefficient of variation of weekly inflows. Stable income repays. Guard against: use only transactions before application date. |
| Add Minimum balance buffer | 10th percentile daily balance over 60 days. Shock-absorbing capacity. Guard against: account-aggregator refresh timing must be as-of. |
| Add Recurring obligation coverage | Rent and utility payment on-time rate. Behavioural analogue of bureau history. Guard against: match recurring payments only with prior-period data. |
| Run it as one pipeline | Application API (consent capture), Account aggregator pull (open banking), Cash-flow feature engine (Flink), Credit scorer (monotone GBDT), Fairness and policy layer (constraints), Underwriter exceptions (review queue) and Repayment outcomes (labels). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle open-banking API outage | Defined fallback scorecard on declared data with higher pricing. |

**Deliberately not doing**

- Device model: proxy for income and protected attributes.
- App install list: invasive, unstable and legally risky.

**How the approach is proven**

Prove it offline on Gini and KS on out-of-time sample and Approval-rate parity ratios using time-ordered splits, then online on "Bad rate in thin-file cohort" with "Incremental approvals at equal loss" as the guardrail. Watch for: Reject inference omitted so scores are overconfident and Out-of-time split skipped despite macro shifts.

## Baseline and production design

- **Baseline (build this first):** Logistic regression on 25 cash-flow features with monotone constraints.
- **Production design:** Monotone gradient boosting with a fairness-constrained post-processing step and reject-inference via a 2% randomised approval cohort.

## Why AI, and why this kind

**Why AI.** Extend fair credit to customers with no bureau history using cash-flow and behavioural data, at default rates equal to prime segments. The evidence that separates good from bad outcomes (Inflow volatility 90d, Minimum balance buffer, Recurring obligation coverage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "phone brand or social graph proxies" are what teams reach for first, and they fail because proxy features trigger disparate-impact findings. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Monotone gradient boosting with a fairness-constrained post-processing step and reject-inference via a 2% randomised approval cohort.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Inflow volatility 90d, Minimum balance buffer, Recurring obligation coverage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Logistic regression on 25 cash-flow features with monotone constraints | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Monotone gradient boosting with a fairness-constrained post-processing step and reject-inference via a 2% randomised approval cohort | chosen | Meets the 80 ms envelope at $0.400 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Bad rate in thin-file cohort) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Reject inference omitted so scores are overconfident.
- Evaluation trap: Out-of-time split skipped despite macro shifts.
- Open-banking API outage: features missing at scoring.
- Gig-economy income seasonality: stability features penalise genuine workers.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
