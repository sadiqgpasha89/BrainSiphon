# Wealth Advisor Next-Best-Conversation Copilot: use-case brief

> Generated from the blueprint `bfsi/advisor-next-best-conversation-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Wealth Advisor Next-Best-Conversation Copilot · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Suggest which clients an advisor should contact and why, with a drafted talking-points note built from the client's own records. The system has to run interactively, within a few seconds, inside these limits: Every suggestion cites client data, Advisor decides and sends and Suitability rules checked before any product mention.

**Why it is hard.** The obvious approach is generic contact schedules, and it fails because calls without a reason are ignored. The second trap is in "Suitability": the real signal is product ideas filtered by client profile and rules, while teams usually reach for highest-margin product.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $2.37M a month. A mistake is expensive in the way client assets retained measures it.

**What success looks like.** Offline: NDCG on past advisor actions and Citation validity. Online: Meaningful conversations per advisor-week and Client assets retained. The launch is judged on "Meaningful conversations per advisor-week" while "Client assets retained" must not get worse.

## Objective, loss and constraints

**Business objective.** Suggest which clients an advisor should contact and why, with a drafted talking-points note built from the client's own records.

**Training objective.** `\mathcal{L}=\mathrm{BPR}(\hat{y},y)+\lambda\,\mathrm{CE}(\hat{y},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BPR} | Bayesian personalised ranking loss: trains the model to score items a user chose above items they did not. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |

**Hard constraints**

- Every suggestion cites client data
- Advisor decides and sends
- Suitability rules checked before any product mention
- Client data stays in the bank tenancy

## The approach in one paragraph

Start with a weekly list of clients ranked by assets and days since last contact, because it is what advisors use now. Then earn the move to a ranker over trigger features with a drafting agent that retrieves the client record and policy, writes cited talking points and passes a suitability checker before showing, and only if it beats the baseline on NDCG on past advisor actions and Citation validity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Cash drift | Idle cash above the target for 30 days. Clear reason to call. Guard against: account balances must be fresh. |
| Add Portfolio drift | Deviation from the agreed allocation. Triggers a rebalancing talk. Guard against: mandate definitions differ. |
| Add Maturity ladder | Products maturing in the next 60 days. Time-bound reason. Guard against: missing for some accounts. |
| Run it as one pipeline | Client data hub (CRM and portfolio systems), Trigger detector (rules and stream jobs), Contact ranker (learning-to-rank), Note drafter (LLM with retrieval), Suitability checker (rules plus entailment) and Advisor inbox (CRM), with Feedback log off the critical path. |
| Optimise the right thing | The objective weighs bayesian personalised ranking loss: trains the model to score items a user chose above items they did not, so the model is trained on the cost of the decision and not on a generic score. |
| Handle vulnerable client | Vulnerability flag routes to a specialist note. |

**Deliberately not doing**

- Client last name: irrelevant.
- Advisor tenure: weak.
- Email open rate: weak link to need.

**How the approach is proven**

Prove it offline on NDCG on past advisor actions and Citation validity using time-ordered splits, then online on "Meaningful conversations per advisor-week" with "Client assets retained" as the guardrail. Watch for: Past actions reflect advisor taste and Features computed after the contact.

## Baseline and production design

- **Baseline (build this first):** A weekly list of clients ranked by assets and days since last contact, because it is what advisors use now.
- **Production design:** A ranker over trigger features with a drafting agent that retrieves the client record and policy, writes cited talking points and passes a suitability checker before showing.

## Why AI, and why this kind

**Why AI.** Suggest which clients an advisor should contact and why, with a drafted talking-points note built from the client's own records. The evidence that separates good from bad outcomes (Cash drift, Portfolio drift, Maturity ladder) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "generic contact schedules" are what teams reach for first, and they fail because calls without a reason are ignored. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A ranker over trigger features with a drafting agent that retrieves the client record and policy, writes cited talking points and passes a suitability checker before showing.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Cash drift, Portfolio drift, Maturity ladder and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A weekly list of clients ranked by assets and days since last contact, because it is what advisors use now | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A ranker over trigger features with a drafting agent that retrieves the client record and policy, writes cited talking points and passes a suitability checker before showing | chosen | Meets the 2500 ms envelope at $13.17 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Meaningful conversations per advisor-week) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Past actions reflect advisor taste.
- Evaluation trap: Features computed after the contact.
- Vulnerable client: life event needs a careful approach.
- Conflicting mandates: joint account holders differ.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
