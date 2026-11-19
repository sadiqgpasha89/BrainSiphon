# Policy Lapse & Persistency Prediction: use-case brief

> Generated from the blueprint `bfsi/policy-lapse-and-persistency-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Policy Lapse & Persistency Prediction · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which policies will lapse so retention teams and the actuary can plan interventions and reserves. The system has to run as a scheduled batch job, inside these limits: Retention offers within conduct rules, Monthly scoring and Explainable.

**Why it is hard.** The obvious approach is single yes or no, and it fails because lapse peaks around anniversaries and surrender charges ending. The second trap is in "Cause": the real signal is voluntary, non-payment and lapse due to price change, while teams usually reach for one lapse flag.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way retention cost per saved policy measures it.

**What success looks like.** Offline: Concordance and Calibration by duration. Online: Persistency uplift and Retention cost per saved policy. The launch is judged on "Persistency uplift" while "Retention cost per saved policy" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which policies will lapse so retention teams and the actuary can plan interventions and reserves.

**Training objective.** `\mathcal{L}=-\sum_i\left[\delta_i\log h(t_i\mid x_i)-\int_0^{t_i}h(u\mid x_i)\,du\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \delta_i | Event indicator: 1 if policy i lapsed, 0 if it was still in force at the end of observation (censored). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| h | The hazard: the chance the event happens at time u given that it has not happened yet. |
| t_i | Time step, or token position in a text sequence. (one value per example i) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| x_i | The input features describing one example (what the model sees). (one value per example i) |
| \int_0^{t_i} | Integral: add up a continuously varying quantity over the range shown. |
| u | The time variable of integration, running from 0 up to the observed time. |
| d | The integration variable du: a tiny step in time. |

**Hard constraints**

- Retention offers within conduct rules
- Monthly scoring
- Explainable
- Actuarial assumptions updated yearly

## The approach in one paragraph

Start with persistency tables by product and year, because actuaries use them. Then earn the move to discrete-time hazard boosting with calibrated survival curves and a retention-uplift model for who to contact, and only if it beats the baseline on Concordance and Calibration by duration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Premium shock | Renewal premium change. Price sensitivity. Guard against: known at renewal. |
| Add Missed payment count | Missed or late payments. Distress. Guard against: grace period. |
| Add Surrender charge expiry | Months until the charge ends. Timing. Guard against: contract data. |
| Run it as one pipeline | Policy admin extract (nightly feed), Feature builder (Spark), Lapse model (boosting survival), Uplift ranker (causal model), Campaign lists (CRM), Actuarial feed (reserving system) and Monitor (dashboard). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle regulation limits offers | Apply offer eligibility rules before ranking so the list contains only lawful offers. |

**Deliberately not doing**

- Policy number: arbitrary.
- Agent code: cohort.
- Name: irrelevant.

**How the approach is proven**

Prove it offline on Concordance and Calibration by duration using time-ordered splits, then online on "Persistency uplift" with "Retention cost per saved policy" as the guardrail. Watch for: Contacted customers differ and Ignoring censoring.

## Baseline and production design

- **Baseline (build this first):** Persistency tables by product and year, because actuaries use them.
- **Production design:** Discrete-time hazard boosting with calibrated survival curves and a retention-uplift model for who to contact.

## Why AI, and why this kind

**Why AI.** Predict which policies will lapse so retention teams and the actuary can plan interventions and reserves. The evidence that separates good from bad outcomes (Premium shock, Missed payment count, Surrender charge expiry) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single yes or no" are what teams reach for first, and they fail because lapse peaks around anniversaries and surrender charges ending. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Discrete-time hazard boosting with calibrated survival curves and a retention-uplift model for who to contact.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Premium shock, Missed payment count, Surrender charge expiry and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Persistency tables by product and year, because actuaries use them | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Discrete-time hazard boosting with calibrated survival curves and a retention-uplift model for who to contact | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Persistency uplift) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Contacted customers differ.
- Evaluation trap: Ignoring censoring.
- Regulation limits offers: some retention offers are not allowed for certain customers.
- Product withdrawal: a product is withdrawn and many policies are forced to lapse, which looks like voluntary behaviour.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
