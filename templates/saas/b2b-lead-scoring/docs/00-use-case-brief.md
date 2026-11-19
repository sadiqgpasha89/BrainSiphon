# B2B Lead & Account Scoring: use-case brief

> Generated from the blueprint `saas/b2b-lead-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** B2B Lead & Account Scoring · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score inbound leads and target accounts by likelihood to convert so sales time goes to the best opportunities. The system has to run in under 100 milliseconds, inside these limits: Real-time routing within seconds, Fairness across regions and Explainable factors.

**Why it is hard.** The obvious approach is individual lead clicks, and it fails because buying committees act as a group. The second trap is in "Outcome": the real signal is closed-won revenue not MQL conversion, while teams usually reach for marketing-qualified lead rate.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $3.6K a month. A mistake is expensive in the way closed-won rate measures it.

**What success looks like.** Offline: PR-AUC and lift at top decile and Calibration by region. Online: Pipeline created per SDR hour and Closed-won rate. The launch is judged on "Pipeline created per SDR hour" while "Closed-won rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Score inbound leads and target accounts by likelihood to convert so sales time goes to the best opportunities.

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

- Real-time routing within seconds
- Fairness across regions
- Explainable factors
- Data enrichment latency

## The approach in one paragraph

Start with rule-based lead scoring with points per action. Then earn the move to calibrated GBDT on account-level features, trained on closed-won outcomes with time-based splits, served with enrichment caching, and only if it beats the baseline on PR-AUC and lift at top decile and Calibration by region after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Account intent surge | Multi-contact visits to pricing and docs. Buying signal. Guard against: window. |
| Add Firmographic fit | Size, industry, tech stack match. ICP. Guard against: enrichment. |
| Add Engagement recency and depth | Actions in last 14 days. Interest. Guard against: event windows. |
| Run it as one pipeline | Lead capture (web forms), Enrichment (firmographic APIs), Feature builder (account aggregates), Lead scorer (GBDT), Routing engine (rules), Sales development (human) and Opportunity outcomes (labels). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle enrichment vendor outage | Defined fallback model without enrichment features. |

**Deliberately not doing**

- Lead source label alone: channel artefact.
- Job title raw text: messy.

**How the approach is proven**

Prove it offline on PR-AUC and lift at top decile and Calibration by region using time-ordered splits, then online on "Pipeline created per SDR hour" with "Closed-won rate" as the guardrail. Watch for: Training on MQL conversion not revenue and Features logged after sales contact.

## Baseline and production design

- **Baseline (build this first):** Rule-based lead scoring with points per action.
- **Production design:** Calibrated GBDT on account-level features, trained on closed-won outcomes with time-based splits, served with enrichment caching.

## Why AI, and why this kind

**Why AI.** Score inbound leads and target accounts by likelihood to convert so sales time goes to the best opportunities. The evidence that separates good from bad outcomes (Account intent surge, Firmographic fit, Engagement recency and depth) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "individual lead clicks" are what teams reach for first, and they fail because buying committees act as a group. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Calibrated GBDT on account-level features, trained on closed-won outcomes with time-based splits, served with enrichment caching.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Account intent surge, Firmographic fit, Engagement recency and depth and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based lead scoring with points per action | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Calibrated GBDT on account-level features, trained on closed-won outcomes with time-based splits, served with enrichment caching | chosen | Meets the 80 ms envelope at $0.200 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Pipeline created per SDR hour) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on MQL conversion not revenue.
- Evaluation trap: Features logged after sales contact.
- Enrichment vendor outage: features missing and scores plunge.
- Marketing campaign brings low-quality spike: scores inflate with engagement.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
