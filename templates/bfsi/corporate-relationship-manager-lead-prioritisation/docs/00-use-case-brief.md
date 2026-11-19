# Corporate Relationship Manager Lead Prioritisation: use-case brief

> Generated from the blueprint `bfsi/corporate-relationship-manager-lead-prioritisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Corporate Relationship Manager Lead Prioritisation · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank corporate clients and prospects for relationship-manager outreach by the likelihood and value of a product need. The system has to run as a scheduled batch job, inside these limits: The reason for each ranking can be explained in plain terms to the manager, Output sized to a capacity of 30 calls a week per manager and Clients under conflict-of-interest restrictions never appear.

**Why it is hard.** The obvious approach is the products a client already holds, and it fails because holdings show the past and not the next need. The second trap is in "Value": the real signal is expected revenue of the opportunity, while teams usually reach for the probability of a need alone.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.8K a month. A mistake is expensive in the way win rate measures it.

**What success looks like.** Offline: NDCG and Hit rate. Online: Pipeline created and Win rate. The launch is judged on "Pipeline created" while "Win rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank corporate clients and prospects for relationship-manager outreach by the likelihood and value of a product need.

**Training objective.** `\mathcal{L}=\mathrm{BPR}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BPR} | Bayesian personalised ranking loss: trains the model to score items a user chose above items they did not. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- The reason for each ranking can be explained in plain terms to the manager
- Output sized to a capacity of 30 calls a week per manager
- Clients under conflict-of-interest restrictions never appear
- Refreshed weekly with the latest events

## The approach in one paragraph

Start with rM judgement and a periodic target list, because it is common. Then earn the move to a ranker over triggers and gaps with expected value and a short explanation per lead, and only if it beats the baseline on NDCG and Hit rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Cash and debt events | Upcoming debt maturities and large payments from the client's own accounts. A direct trigger for financing and treasury needs. Guard against: access depends on the client's accounts with the bank. |
| Add News and filings | Acquisition, expansion or leadership news in public sources. An external trigger. Guard against: noisy, so verify the source. |
| Add Product gap | Products held by similar clients that this client does not hold. Cross-sell potential. Guard against: fit depends on size and sector. |
| Run it as one pipeline | Client data (CRM and transaction banking), Trigger detection (stream and news), Lead ranker (learning to rank), Value model (boosting), RM list (CRM), Outcome capture (warehouse) and Monitor (dashboard). |
| Optimise the right thing | The objective weighs bayesian personalised ranking loss: trains the model to score items a user chose above items they did not, so the model is trained on the cost of the decision and not on a generic score. |
| Handle conflict wall | Apply a compliance filter before ranking so restricted clients never appear. |

**Deliberately not doing**

- Company name: A label with no information on need.
- RM: The manager's identity biases the ranking towards past activity.
- Email opens: Weak and often automated.

**How the approach is proven**

Prove it offline on NDCG and Hit rate using time-ordered splits, then online on "Pipeline created" with "Win rate" as the guardrail. Watch for: Past calls were not random, so outcomes reflect who was called and not who needed a product and Weak outcome data, since closed deals are few and slow.

## Baseline and production design

- **Baseline (build this first):** RM judgement and a periodic target list, because it is common.
- **Production design:** A ranker over triggers and gaps with expected value and a short explanation per lead.

## Why AI, and why this kind

**Why AI.** Rank corporate clients and prospects for relationship-manager outreach by the likelihood and value of a product need. The evidence that separates good from bad outcomes (Cash and debt events, News and filings, Product gap) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the products a client already holds" are what teams reach for first, and they fail because holdings show the past and not the next need. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: A ranker over triggers and gaps with expected value and a short explanation per lead.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Cash and debt events, News and filings, Product gap and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: RM judgement and a periodic target list, because it is common | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A ranker over triggers and gaps with expected value and a short explanation per lead | chosen | Meets the run-window envelope at $0.098 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Pipeline created) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Past calls were not random, so outcomes reflect who was called and not who needed a product.
- Evaluation trap: Weak outcome data, since closed deals are few and slow.
- Conflict wall: a client is on a restricted list and must not be contacted.
- Stale CRM: the CRM holds stale contacts so a lead goes to the wrong person.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
