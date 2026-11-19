# Insurance Claims Fraud Detection: use-case brief

> Generated from the blueprint `fintech/insurance-claims-fraud-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Insurance Claims Fraud Detection · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Triage incoming claims by fraud likelihood to route investigators to the highest recovery opportunities while paying genuine claims fast. The system has to run as a scheduled batch job, inside these limits: Straight-through payment for low-risk claims, Evidence preserved for litigation and Fair claims handling regulations.

**Why it is hard.** The obvious approach is single claim attributes, and it fails because organised fraud lives in the links between claims. The second trap is in "Text": the real signal is narrative inconsistency across statements and reports, while teams usually reach for keyword flags.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.9K a month. A mistake is expensive in the way genuine claim cycle time measures it.

**What success looks like.** Offline: PR-AUC and recovery-weighted gain and Precision at SIU capacity. Online: Fraud recovery per investigator hour and Genuine claim cycle time. The launch is judged on "Fraud recovery per investigator hour" while "Genuine claim cycle time" must not get worse.

## Objective, loss and constraints

**Business objective.** Triage incoming claims by fraud likelihood to route investigators to the highest recovery opportunities while paying genuine claims fast.

**Training objective.** `\mathcal{L}=\mathrm{CE}(y,p)\cdot v(\text{claim amount})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| v | A weight that grows with the claim amount, so errors on large claims cost more. |
| \text{claim amount} | The value of the insurance claim. |

**Hard constraints**

- Straight-through payment for low-risk claims
- Evidence preserved for litigation
- Fair claims handling regulations
- Daily scoring

## The approach in one paragraph

Start with rule-based red-flag scoring. Then earn the move to gBDT on structured features, graph features from claim-entity network, and an LLM-derived narrative inconsistency score, and only if it beats the baseline on PR-AUC and recovery-weighted gain and Precision at SIU capacity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Provider-claimant co-occurrence | Count of past claims where the pair appears together. Collusion marker. Guard against: use claims before the current one. |
| Add Claim-timing anomaly | Days between policy inception and loss. Fraud near inception. Guard against: policy dates from the policy admin system as-of. |
| Add Narrative similarity | Embedding similarity of this loss description to prior flagged claims. Template reuse. Guard against: exclude same-claim documents. |
| Run it as one pipeline | Claim intake (policy admin API), Entity resolution (blocking plus matching), Graph feature job (Spark), Fraud scorer (GBDT), Narrative analyser (LLM with extraction), SIU referral (investigator queue) and Recovery outcomes (labels). |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle catastrophe event (hurricane) floods genuine claims | Event-aware baselines and CAT-mode thresholds. |

**Deliberately not doing**

- Claim number: arbitrary identifier.
- Adjuster ID: memorises staff, not claim risk.

**How the approach is proven**

Prove it offline on PR-AUC and recovery-weighted gain and Precision at SIU capacity using time-ordered splits, then online on "Fraud recovery per investigator hour" with "Genuine claim cycle time" as the guardrail. Watch for: Labels only from investigated claims and Fraud found years later leaks from later closed claims.

## Baseline and production design

- **Baseline (build this first):** Rule-based red-flag scoring.
- **Production design:** GBDT on structured features, graph features from claim-entity network, and an LLM-derived narrative inconsistency score.

## Why AI, and why this kind

**Why AI.** Triage incoming claims by fraud likelihood to route investigators to the highest recovery opportunities while paying genuine claims fast. The evidence that separates good from bad outcomes (Provider-claimant co-occurrence, Claim-timing anomaly, Narrative similarity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single claim attributes" are what teams reach for first, and they fail because organised fraud lives in the links between claims. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: GBDT on structured features, graph features from claim-entity network, and an LLM-derived narrative inconsistency score.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Provider-claimant co-occurrence, Claim-timing anomaly, Narrative similarity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based red-flag scoring | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| GBDT on structured features, graph features from claim-entity network, and an LLM-derived narrative inconsistency score | chosen | Meets the run-window envelope at $0.429 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fraud recovery per investigator hour) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels only from investigated claims.
- Evaluation trap: Fraud found years later leaks from later closed claims.
- Catastrophe event (hurricane) floods genuine claims: volume spike triggers false flags.
- Investigator capacity shrinks: queue overflows.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
