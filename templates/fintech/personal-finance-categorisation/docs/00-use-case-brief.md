# Transaction Categorisation & Merchant Enrichment: use-case brief

> Generated from the blueprint `fintech/personal-finance-categorisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Transaction Categorisation & Merchant Enrichment · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assign accurate spend categories and clean merchant names to every transaction in real time so budgeting and insights are trustworthy. The system has to run in under 100 milliseconds, inside these limits: 99% availability, Under 40 ms per transaction and Multi-lingual messy descriptors.

**Why it is hard.** The obvious approach is classifying raw bank strings, and it fails because strings like AMZN MKTP US*2K4 hide the real merchant. The second trap is in "Feedback": the real signal is user corrections as high-weight labels, while teams usually reach for treating all labels equal.

**Scale and stakes.** At 10 million users this is about 18.0M model-touching events a day, 208 requests per second on average and 1.3K at peak, at an estimated $12.4K a month. A mistake is expensive in the way budget feature engagement measures it.

**What success looks like.** Offline: Macro-F1 across categories and Merchant resolution accuracy. Online: User correction rate and Budget feature engagement. The launch is judged on "User correction rate" while "Budget feature engagement" must not get worse.

## Objective, loss and constraints

**Business objective.** Assign accurate spend categories and clean merchant names to every transaction in real time so budgeting and insights are trustworthy.

**Training objective.** `\mathcal{L}=\mathrm{CE}(y,p)+\lambda\,\mathrm{UserCorrectionConsistency}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{UserCorrectionConsistency} | Penalty when the model ignores categories the user has previously corrected. |

**Hard constraints**

- 99% availability
- Under 40 ms per transaction
- Multi-lingual messy descriptors
- User overrides must stick

## The approach in one paragraph

Start with keyword and MCC rules. Then earn the move to distilled multilingual transformer on normalised descriptors plus user-specific override layer and merchant-entity resolution, and only if it beats the baseline on Macro-F1 across categories and Merchant resolution accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Normalised merchant ID | Resolved merchant from alias dictionary and embedding. Anchors category. Guard against: resolution table versioned. |
| Add Amount-and-cadence pattern | Amount bucket plus recurrence. Separates subscriptions from one-offs. Guard against: compute from user's prior history only. |
| Add MCC from card network | Network category code when available. Strong prior. Guard against: often missing for bank transfers. |
| Run it as one pipeline | Transaction feed (Kafka), Descriptor cleaner (rule normaliser), Merchant resolver (embedding lookup), Category classifier (distilled BERT) and User override layer (per-user rules), with Feedback collector off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new merchant never seen | Open-set threshold routes to nearest-neighbour plus review. |

**Deliberately not doing**

- Transaction ID: random identifier.
- Exact timestamp second: no category information.

**How the approach is proven**

Prove it offline on Macro-F1 across categories and Merchant resolution accuracy using time-ordered splits, then online on "User correction rate" with "Budget feature engagement" as the guardrail. Watch for: Test split by transaction not by merchant and Category taxonomy changes between train and test.

## Baseline and production design

- **Baseline (build this first):** Keyword and MCC rules.
- **Production design:** Distilled multilingual transformer on normalised descriptors plus user-specific override layer and merchant-entity resolution.

## Why AI, and why this kind

**Why AI.** Assign accurate spend categories and clean merchant names to every transaction in real time so budgeting and insights are trustworthy. The evidence that separates good from bad outcomes (Normalised merchant ID, Amount-and-cadence pattern, MCC from card network) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "classifying raw bank strings" are what teams reach for first, and they fail because strings like AMZN MKTP US*2K4 hide the real merchant. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Distilled multilingual transformer on normalised descriptors plus user-specific override layer and merchant-entity resolution.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Normalised merchant ID, Amount-and-cadence pattern, MCC from card network and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword and MCC rules | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Distilled multilingual transformer on normalised descriptors plus user-specific override layer and merchant-entity resolution | chosen | Meets the 80 ms envelope at $0.023 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (User correction rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test split by transaction not by merchant.
- Evaluation trap: Category taxonomy changes between train and test.
- New merchant never seen: classified wrongly with high confidence.
- Bank changes descriptor format: accuracy collapses overnight.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
