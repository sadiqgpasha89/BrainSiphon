# Private Wealth Client Attrition Early Warning: use-case brief

> Generated from the blueprint `bfsi/private-wealth-client-attrition` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Private Wealth Client Attrition Early Warning · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify high-net-worth clients likely to move assets away in the next 6 months so the relationship team can act. The system has to run as a scheduled batch job, inside these limits: Rank only, no automatic action, Explainable reasons and Advisor capacity 50 calls a week.

**Why it is hard.** The obvious approach is account closure flag, and it fails because clients thin accounts before leaving. The second trap is in "Advisor": the real signal is advisor changes and departures, while teams usually reach for client attributes only.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.7K a month. A mistake is expensive in the way save rate of called clients measures it.

**What success looks like.** Offline: PR-AUC and Calibration. Online: Assets retained and Save rate of called clients. The launch is judged on "Assets retained" while "Save rate of called clients" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify high-net-worth clients likely to move assets away in the next 6 months so the relationship team can act.

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

- Rank only, no automatic action
- Explainable reasons
- Advisor capacity 50 calls a week
- Data from internal systems only

## The approach in one paragraph

Start with rule list on outflows and contact gaps, because relationship managers use it. Then earn the move to gradient boosting with survival framing on outflow, advisor and performance features, calibrated and ranked by assets at risk, and only if it beats the baseline on PR-AUC and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Net outflow 90d share | Outflows over assets for 90 days. Leading indicator. Guard against: seasonal tax payments. |
| Add Contact gap | Days since the last advisor contact. Neglect. Guard against: contacts logged late. |
| Add Performance gap | Client return versus benchmark and peer. Dissatisfaction. Guard against: mandate mismatch. |
| Run it as one pipeline | Client and account data (wealth platform), Event feed (CRM), Feature builder (Spark), Attrition model (boosting), Value ranker (rules), RM call list (CRM) and Outcome capture (warehouse). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle planned large withdrawal | Allow advisors to record planned withdrawals and exclude them from attrition signals. |

**Deliberately not doing**

- Client birthday: irrelevant.
- Account opening channel: cohort.
- Email domain: weak.

**How the approach is proven**

Prove it offline on PR-AUC and Calibration using time-ordered splits, then online on "Assets retained" with "Save rate of called clients" as the guardrail. Watch for: Retention actions change labels and Random split leaks households.

## Baseline and production design

- **Baseline (build this first):** Rule list on outflows and contact gaps, because relationship managers use it.
- **Production design:** Gradient boosting with survival framing on outflow, advisor and performance features, calibrated and ranked by assets at risk.

## Why AI, and why this kind

**Why AI.** Identify high-net-worth clients likely to move assets away in the next 6 months so the relationship team can act. The evidence that separates good from bad outcomes (Net outflow 90d share, Contact gap, Performance gap) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "account closure flag" are what teams reach for first, and they fail because clients thin accounts before leaving. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting with survival framing on outflow, advisor and performance features, calibrated and ranked by assets at risk.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Net outflow 90d share, Contact gap, Performance gap and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule list on outflows and contact gaps, because relationship managers use it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting with survival framing on outflow, advisor and performance features, calibrated and ranked by assets at risk | chosen | Meets the run-window envelope at $0.186 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Assets retained) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Retention actions change labels.
- Evaluation trap: Random split leaks households.
- Planned large withdrawal: a client withdraws money for a house purchase and the model reads it as leaving.
- Advisor departure: when an advisor leaves, their clients leave as a group.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
