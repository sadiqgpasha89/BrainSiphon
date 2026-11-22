# Contract vs Purchase Order Compliance Detection: use-case brief

> Generated from the blueprint `healthcare/contract-purchase-order-compliance-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Contract vs Purchase Order Compliance Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect purchase orders that violate contracted price, supplier, volume, term, approval or purchasing-channel conditions by extracting contract terms and testing each order line against them. The system has to run as a scheduled batch job, inside these limits: Contract terms are extracted with page and clause provenance and a human validates each contract once, Deterministic compliance rules test each line and the contract or procurement owner validates interpretation and the disposition of exceptions and Amendments and effective dates are versioned.

**Why it is hard.** The obvious approach is free-text reading at check time, and it fails because rules need stable structured terms. The second trap is in "Amendments": the real signal is effective-dated amendments and supersession, while teams usually reach for the base contract only.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.9K a month. A mistake is expensive in the way recovered price variance measures it.

**What success looks like.** Offline: Field-level F1 of extracted contract terms, Exception precision and recall against audited orders and Exposure error against resolved variances. Online: Compliant spend share, Recovered price variance and Time to resolve an exception. The launch is judged on "Compliant spend share" while "Recovered price variance" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect purchase orders that violate contracted price, supplier, volume, term, approval or purchasing-channel conditions by extracting contract terms and testing each order line against them.

**Training objective.** `\mathcal{L}=-\sum_i\log p_\theta(y_i\mid x_i)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| x_i | The input features describing one example (what the model sees). (one value per example i) |

**Hard constraints**

- Contract terms are extracted with page and clause provenance and a human validates each contract once
- Deterministic compliance rules test each line and the contract or procurement owner validates interpretation and the disposition of exceptions
- Amendments and effective dates are versioned
- Item matching uses catalogue identifiers before fuzzy text
- Evaluates 1.5M order lines per day
- Estimated exposure is a modelled figure and not a recovery claim

## The approach in one paragraph

Start with a quarterly sample audit of purchase orders against contracts. Then earn the move to layout-aware contract term extraction with human validation, an effective-dated term store, catalogue-first item matching and a deterministic line-by-line compliance engine that produces a clause-to-transaction match, variance and exposure, and only if it beats the baseline on Field-level F1 of extracted contract terms and Exception precision and recall against audited orders after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Price variance to schedule | Order price minus contracted price for the item and tier. The main compliance test. Guard against: contract version at order date. |
| Add Channel and supplier match | Whether supplier and channel match the contract. Off-contract buying. Guard against: contract scope tables. |
| Add Volume tier position | Cumulative volume against tier thresholds. Tiered prices depend on it. Guard against: cumulative at order date. |
| Run it as one pipeline | Contract and PO intake (document OCR and ERP extracts), Contract term extractor (document AI with spans), Item matcher for catalogue identifiers (rules and fuzzy lookups), Compliance rule engine (versioned rules) and Exposure and evidence builder (variance calculator), with Contract and procurement review and Exception outcome and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle contract amended retroactively | Effective-dated amendments and a restatement run. |

**Deliberately not doing**

- Buyer name: not a compliance driver.
- Order free-text note: noisy.
- Order entry time: process artefact.

**How the approach is proven**

Prove it offline on Field-level F1 of extracted contract terms, Exception precision and recall against audited orders and Exposure error against resolved variances using time-ordered splits, then online on "Compliant spend share" with "Recovered price variance" as the guardrail. Watch for: Checking orders against superseded terms, Fuzzy item matches without a threshold and Treating exposure as a guaranteed recovery.

## Baseline and production design

- **Baseline (build this first):** A quarterly sample audit of purchase orders against contracts.
- **Production design:** Layout-aware contract term extraction with human validation, an effective-dated term store, catalogue-first item matching and a deterministic line-by-line compliance engine that produces a clause-to-transaction match, variance and exposure.

## Why AI, and why this kind

**Why AI.** Detect purchase orders that violate contracted price, supplier, volume, term, approval or purchasing-channel conditions by extracting contract terms and testing each order line against them. The evidence that separates good from bad outcomes (Price variance to schedule, Channel and supplier match, Volume tier position) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free-text reading at check time" are what teams reach for first, and they fail because rules need stable structured terms. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Layout-aware contract term extraction with human validation, an effective-dated term store, catalogue-first item matching and a deterministic line-by-line compliance engine that produces a clause-to-transaction match, variance and exposure.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Price variance to schedule, Channel and supplier match, Volume tier position and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A quarterly sample audit of purchase orders against contracts | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Layout-aware contract term extraction with human validation, an effective-dated term store, catalogue-first item matching and a deterministic line-by-line compliance engine that produces a clause-to-transaction match, variance and exposure | chosen | Meets the run-window envelope at $0.043 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Compliant spend share) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Checking orders against superseded terms.
- Evaluation trap: Fuzzy item matches without a threshold.
- Contract amended retroactively: past orders become non-compliant.
- Bundled prices: line-level rules do not apply.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
