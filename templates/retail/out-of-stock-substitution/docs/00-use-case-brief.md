# Out-of-Stock Substitution Recommendations: use-case brief

> Generated from the blueprint `retail/out-of-stock-substitution` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Out-of-Stock Substitution Recommendations · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Offer the best in-stock substitute when a grocery or retail item is unavailable, preserving the order and customer trust. The system has to run in under 100 milliseconds, inside these limits: Dietary and allergy constraints, Price tolerance and Real-time stock.

**Why it is hard.** The obvious approach is content similarity only, and it fails because similar items are often rejected because of brand loyalty. The second trap is in "Constraints": the real signal is hard rules for allergens and diet, while teams usually reach for soft similarity.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $12.3K a month. A mistake is expensive in the way refunds due to substitutions measures it.

**What success looks like.** Offline: Top-1 acceptance prediction and Constraint violation rate. Online: Substitution acceptance rate and Refunds due to substitutions. The launch is judged on "Substitution acceptance rate" while "Refunds due to substitutions" must not get worse.

## Objective, loss and constraints

**Business objective.** Offer the best in-stock substitute when a grocery or retail item is unavailable, preserving the order and customer trust.

**Training objective.** `\mathcal{L}=\mathrm{BPR}(u,i,j)+\lambda\,\mathrm{AcceptanceCalibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BPR} | Bayesian personalised ranking loss: trains the model to score items a user chose above items they did not. |
| u | A shopper. |
| i | The substitute the shopper accepted. |
| j | A substitute the shopper did not accept. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{AcceptanceCalibration} | Penalty when predicted acceptance rates do not match how often shoppers accept substitutes. |

**Hard constraints**

- Dietary and allergy constraints
- Price tolerance
- Real-time stock
- Pickers need instant decisions

## The approach in one paragraph

Start with same-category cheapest in-stock item. Then earn the move to pairwise ranker trained on substitution outcomes with constraint filters and real-time stock-aware candidate generation, and only if it beats the baseline on Top-1 acceptance prediction and Constraint violation rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Historic substitution acceptance | Acceptance rate for the item pair. Direct signal. Guard against: matured pairs. |
| Add Price delta and unit size delta | Relative price and size difference. Tolerance. Guard against: normalised units. |
| Add User substitution tolerance | Personal acceptance history. Personalisation. Guard against: excludes the current order. |
| Run it as one pipeline | Stock event (inventory stream), Candidate generator (similarity index), Constraint filter (allergen and diet rules), Acceptance ranker (GBDT), Picker app (UI), Customer approval (app prompt) and Outcome logging (Kafka). |
| Optimise the right thing | The objective weighs bayesian personalised ranking loss: trains the model to score items a user chose above items they did not, so the model is trained on the cost of the decision and not on a generic score. |
| Handle inventory data inaccurate | Stock confidence score and fallback list. |

**Deliberately not doing**

- Item popularity: picks popular not suitable.
- Picker ID: personal habit.

**How the approach is proven**

Prove it offline on Top-1 acceptance prediction and Constraint violation rate using time-ordered splits, then online on "Substitution acceptance rate" with "Refunds due to substitutions" as the guardrail. Watch for: Acceptance logged only for offered items and Safety constraints not tested separately.

## Baseline and production design

- **Baseline (build this first):** Same-category cheapest in-stock item.
- **Production design:** Pairwise ranker trained on substitution outcomes with constraint filters and real-time stock-aware candidate generation.

## Why AI, and why this kind

**Why AI.** Offer the best in-stock substitute when a grocery or retail item is unavailable, preserving the order and customer trust. The evidence that separates good from bad outcomes (Historic substitution acceptance, Price delta and unit size delta, User substitution tolerance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "content similarity only" are what teams reach for first, and they fail because similar items are often rejected because of brand loyalty. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Pairwise ranker trained on substitution outcomes with constraint filters and real-time stock-aware candidate generation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Historic substitution acceptance, Price delta and unit size delta, User substitution tolerance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Same-category cheapest in-stock item | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Pairwise ranker trained on substitution outcomes with constraint filters and real-time stock-aware candidate generation | chosen | Meets the 80 ms envelope at $0.137 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Substitution acceptance rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Acceptance logged only for offered items.
- Evaluation trap: Safety constraints not tested separately.
- Inventory data inaccurate: substitute also missing.
- Allergen data missing for new product: unsafe candidate.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
