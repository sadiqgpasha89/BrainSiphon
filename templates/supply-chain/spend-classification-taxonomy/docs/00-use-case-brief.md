# Spend Classification & Taxonomy Mapping: use-case brief

> Generated from the blueprint `supply-chain/spend-classification-taxonomy` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Spend Classification & Taxonomy Mapping · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify invoice and PO lines into a unified category taxonomy to unlock spend visibility and savings analysis. The system has to run as a scheduled batch job, inside these limits: 5-level taxonomy (UNSPSC), Multiple languages and Millions of lines.

**Why it is hard.** The obvious approach is flat classifier, and it fails because hierarchy gives partial credit and safe fallbacks. The second trap is in "Feedback": the real signal is analyst corrections as labels, while teams usually reach for static training set.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way analyst hours saved measures it.

**What success looks like.** Offline: Level-3 accuracy and macro-F1 and Coverage at 95% precision. Online: Spend classified automatically and Analyst hours saved. The launch is judged on "Spend classified automatically" while "Analyst hours saved" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify invoice and PO lines into a unified category taxonomy to unlock spend visibility and savings analysis.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{L1}}+\mathrm{CE}_{\text{L2}}+\mathrm{CE}_{\text{L3}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{L1}} | Cross-entropy for classifying a spend line into the category at one level of the taxonomy: L1 is the top level, L2 the middle level and L3 the most detailed. |

**Hard constraints**

- 5-level taxonomy (UNSPSC)
- Multiple languages
- Millions of lines
- Active learning from analysts

## The approach in one paragraph

Start with keyword rules and supplier-to-category lookup. Then earn the move to hierarchical transformer with supplier priors, confidence-based review queue and continual learning from corrections, and only if it beats the baseline on Level-3 accuracy and macro-F1 and Coverage at 95% precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Line description embedding | Text embedding. Category. Guard against: language handling. |
| Add Supplier primary category | Supplier industry. Prior. Guard against: supplier master. |
| Add Unit price and UoM | Price per unit. Disambiguation. Guard against: currency conversion. |
| Run it as one pipeline | Spend data ingestion (ERP), Cleaner (normalisation), Hierarchical classifier (transformer), Supplier prior merge (Bayesian), Taxonomy store (MDM) and Savings analytics (BI), with Analyst review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for classifying a spend line into the category at one level of the taxonomy: L1 is the top level, L2 the middle level and L3 the most detailed, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new category emerges | Open-set detection and taxonomy proposals. |

**Deliberately not doing**

- Invoice number: none.
- Cost centre code: org structure.

**How the approach is proven**

Prove it offline on Level-3 accuracy and macro-F1 and Coverage at 95% precision using time-ordered splits, then online on "Spend classified automatically" with "Analyst hours saved" as the guardrail. Watch for: Training labels from earlier rule-based mappings and Ignoring class imbalance.

## Baseline and production design

- **Baseline (build this first):** Keyword rules and supplier-to-category lookup.
- **Production design:** Hierarchical transformer with supplier priors, confidence-based review queue and continual learning from corrections.

## Why AI, and why this kind

**Why AI.** Classify invoice and PO lines into a unified category taxonomy to unlock spend visibility and savings analysis. The evidence that separates good from bad outcomes (Line description embedding, Supplier primary category, Unit price and UoM) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "flat classifier" are what teams reach for first, and they fail because hierarchy gives partial credit and safe fallbacks. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Hierarchical transformer with supplier priors, confidence-based review queue and continual learning from corrections.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Line description embedding, Supplier primary category, Unit price and UoM and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword rules and supplier-to-category lookup | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hierarchical transformer with supplier priors, confidence-based review queue and continual learning from corrections | chosen | Meets the run-window envelope at $0.207 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Spend classified automatically) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training labels from earlier rule-based mappings.
- Evaluation trap: Ignoring class imbalance.
- New category emerges: forced into wrong class.
- Generic descriptions ("services"): unpredictable class.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
