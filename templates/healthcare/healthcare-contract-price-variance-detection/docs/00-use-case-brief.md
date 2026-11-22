# Healthcare Contract-Based Price Variance Detection: use-case brief

> Generated from the blueprint `healthcare/healthcare-contract-price-variance-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract-Based Price Variance Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find differences between contracted and invoiced or paid prices after accounting for units, tiers, rebates, freight, taxes and amendments, and quantify the recoverable amount for finance to validate. The system has to run as a scheduled batch job, inside these limits: A deterministic calculation gives the expected price and anomaly prioritisation only ranks the residual, Finance validates every recovery and dispute and the system does not claim a recovery and Units, tiers, rebates, freight and tax are modelled explicitly.

**Why it is hard.** The obvious approach is a model estimate of the price, and it fails because the expected price is defined by contract not learned. The second trap is in "Components": the real signal is unit conversion, tier, rebate, freight and tax modelled, while teams usually reach for headline price compare.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.9K a month. A mistake is expensive in the way time to dispute resolution measures it.

**What success looks like.** Offline: Variance-detection precision and recall on audited invoices, Recoverable-amount error against realised recoveries and Cause-classification accuracy. Online: Recovered amount, Time to dispute resolution and Share of variance explained automatically. The launch is judged on "Recovered amount" while "Time to dispute resolution" must not get worse.

## Objective, loss and constraints

**Business objective.** Find differences between contracted and invoiced or paid prices after accounting for units, tiers, rebates, freight, taxes and amendments, and quantify the recoverable amount for finance to validate.

**Training objective.** `\mathcal{L}=-\sum_i w_i\,[\,y_i\log p_i+(1-y_i)\log(1-p_i)\,]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_i | A weight that scales how much a particular example, class or term counts in the loss. (one value per example i) |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_i | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per example i) |

**Hard constraints**

- A deterministic calculation gives the expected price and anomaly prioritisation only ranks the residual
- Finance validates every recovery and dispute and the system does not claim a recovery
- Units, tiers, rebates, freight and tax are modelled explicitly
- Contract versions are effective-dated
- Item matching uses catalogue identifiers first
- Evaluates 2M invoice records nightly

## The approach in one paragraph

Start with spreadsheet comparison of invoice prices against the contract price list. Then earn the move to an effective-dated price engine that computes the expected invoiced price with units, tiers, rebates, freight and tax, an item crosswalk with identifier-first matching, a variance-cause classifier and an anomaly ranker for residual cases, and only if it beats the baseline on Variance-detection precision and recall on audited invoices and Recoverable-amount error against realised recoveries after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Contract price at invoice date | Effective-dated scheduled price for the item and tier. The expected price. Guard against: version at invoice date. |
| Add Tier and rebate position | Cumulative volume against tier thresholds and rebates earned. Explains legitimate differences. Guard against: cumulative at invoice date. |
| Add Freight and tax adjustments | Computed components. Separates add-ons from price. Guard against: rules. |
| Run it as one pipeline | Invoice and contract intake (ERP and contract extracts), Item crosswalk matcher (identifier-first rules), Expected price engine (deterministic calculator), Variance cause classifier (gradient boosting), Residual anomaly ranker (isolation forest) and Finance validation (human), with Dispute outcome and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle contract price schedule revised | Effective-dated versions. |

**Deliberately not doing**

- Invoice layout: style.
- Buyer identity: not a cause.
- Supplier sales representative: personal.

**How the approach is proven**

Prove it offline on Variance-detection precision and recall on audited invoices, Recoverable-amount error against realised recoveries and Cause-classification accuracy using time-ordered splits, then online on "Recovered amount" with "Time to dispute resolution" as the guardrail. Watch for: Treating all variance as recoverable, Ignoring credit memos and Using description similarity to match items.

## Baseline and production design

- **Baseline (build this first):** Spreadsheet comparison of invoice prices against the contract price list.
- **Production design:** An effective-dated price engine that computes the expected invoiced price with units, tiers, rebates, freight and tax, an item crosswalk with identifier-first matching, a variance-cause classifier and an anomaly ranker for residual cases.

## Why AI, and why this kind

**Why AI.** Find differences between contracted and invoiced or paid prices after accounting for units, tiers, rebates, freight, taxes and amendments, and quantify the recoverable amount for finance to validate. The evidence that separates good from bad outcomes (Contract price at invoice date, Tier and rebate position, Freight and tax adjustments) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A model estimate of the price" are what teams reach for first, and they fail because the expected price is defined by contract not learned. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: An effective-dated price engine that computes the expected invoiced price with units, tiers, rebates, freight and tax, an item crosswalk with identifier-first matching, a variance-cause classifier and an anomaly ranker for residual cases.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Contract price at invoice date, Tier and rebate position, Freight and tax adjustments and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Spreadsheet comparison of invoice prices against the contract price list | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An effective-dated price engine that computes the expected invoiced price with units, tiers, rebates, freight and tax, an item crosswalk with identifier-first matching, a variance-cause classifier and an anomaly ranker for residual cases | chosen | Meets the run-window envelope at $0.042 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Recovered amount) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating all variance as recoverable.
- Evaluation trap: Ignoring credit memos.
- Contract price schedule revised: past invoices look wrong.
- Supplier credit memo: variance is already corrected.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
