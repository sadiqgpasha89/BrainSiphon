# Contractor Bid Evaluation: use-case brief

> Generated from the blueprint `real-estate/contractor-bid-evaluation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Contractor Bid Evaluation · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Compare contractor bids on price, scope coverage, risk and track record to recommend a shortlist. The system has to run interactively, within a few seconds, inside these limits: Evaluation follows procurement rules and published criteria, The scoring method is transparent to bidders on request and A person makes the award decision.

**Why it is hard.** The obvious approach is the lowest price, and it fails because low bids often omit scope that is later claimed as extras. The second trap is in "Track": the real signal is a contractor's delivery record on similar projects, while teams usually reach for the price alone.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $12.3K a month. A mistake is expensive in the way dispute rate measures it.

**What success looks like.** Offline: Overrun prediction and Scope gap recall. Online: Overruns and Dispute rate. The launch is judged on "Overruns" while "Dispute rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Compare contractor bids on price, scope coverage, risk and track record to recommend a shortlist.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{c}-c)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{c} | The predicted cost (or procurement spend) in the same units as the actual cost. |
| c | The actual cost. |

**Hard constraints**

- Evaluation follows procurement rules and published criteria
- The scoring method is transparent to bidders on request
- A person makes the award decision
- Every step is auditable

## The approach in one paragraph

Start with lowest compliant bid, because rules often require it. Then earn the move to scope-gap analysis from bid text, a risk-adjusted cost model and a transparent comparison for the committee, and only if it beats the baseline on Overrun prediction and Scope gap recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Scope gap | Number of bill-of-quantities items missing or priced at zero. Reveals omissions in a low bid. Guard against: parsing errors in the bid documents, so check by hand. |
| Add Past overrun rate | Average percentage cost overrun of the contractor's last ten projects. Reliability evidence. Guard against: data are patchy and project types differ. |
| Add Bid outlier | Z-score of the bid compared with the other bids and the estimate. Flags abnormally low or high bids. Guard against: few bids make the z-score unstable, so use the estimate as well. |
| Run it as one pipeline | Bid intake (procurement system), Parser (NLP), Scope checker (rules), Risk model (boosting), Comparison (BI), Committee (workflow) and Record (system). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle abnormally low bid | Query the bidder on omitted items and compare scope coverage before price. |

**Deliberately not doing**

- Company name: A label that invites bias and has no evidence on performance.
- Bid format: Presentation style that carries no information on capability.
- Brochure: Marketing material that does not predict delivery.

**How the approach is proven**

Prove it offline on Overrun prediction and Scope gap recall using time-ordered splits, then online on "Overruns" with "Dispute rate" as the guardrail. Watch for: Data only on winners, since the performance of unsuccessful bidders is never observed and Few failures make it hard to learn what predicts a failing contractor.

## Baseline and production design

- **Baseline (build this first):** Lowest compliant bid, because rules often require it.
- **Production design:** Scope-gap analysis from bid text, a risk-adjusted cost model and a transparent comparison for the committee.

## Why AI, and why this kind

**Why AI.** Compare contractor bids on price, scope coverage, risk and track record to recommend a shortlist. The evidence that separates good from bad outcomes (Scope gap, Past overrun rate, Bid outlier) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the lowest price" are what teams reach for first, and they fail because low bids often omit scope that is later claimed as extras. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Scope-gap analysis from bid text, a risk-adjusted cost model and a transparent comparison for the committee.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Scope gap, Past overrun rate, Bid outlier and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Lowest compliant bid, because rules often require it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Scope-gap analysis from bid text, a risk-adjusted cost model and a transparent comparison for the committee | chosen | Meets the 2500 ms envelope at $6.82 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Overruns) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Data only on winners, since the performance of unsuccessful bidders is never observed.
- Evaluation trap: Few failures make it hard to learn what predicts a failing contractor.
- Abnormally low bid: an abnormally low bid omits part of the scope.
- Single bidder: only one bidder responds so there is nothing to compare.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
