# Customs HS-Code Classification: use-case brief

> Generated from the blueprint `supply-chain/customs-hs-code-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Customs HS-Code Classification · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify goods into Harmonised System codes from descriptions and invoices to accelerate clearance and avoid duties disputes. The system has to run in under 100 milliseconds, inside these limits: 6-10 digit codes by country, Tariff updates annually and Explainability for brokers.

**Why it is hard.** The obvious approach is flat 10,000-way classification, and it fails because hierarchy gives graceful degradation to the correct heading. The second trap is in "Rules": the real signal is apply legal notes and general rules of interpretation, while teams usually reach for pure text similarity.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $12.3K a month. A mistake is expensive in the way duty adjustments from audits measures it.

**What success looks like.** Offline: Top-1 accuracy at 6 and 8 digits and Calibration for auto-accept. Online: Auto-classification rate and Duty adjustments from audits. The launch is judged on "Auto-classification rate" while "Duty adjustments from audits" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify goods into Harmonised System codes from descriptions and invoices to accelerate clearance and avoid duties disputes.

**Training objective.** `\mathcal{L}=\sum_{\ell}\mathrm{CE}_{\ell}+\lambda\,\mathrm{HierarchyConsistency}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{\ell} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{CE}_{\ell} | Cross-entropy for predicting the code at hierarchy level l (chapter, heading, subheading). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{HierarchyConsistency} | Penalty when a predicted detailed code does not belong under the predicted higher-level code. |

**Hard constraints**

- 6-10 digit codes by country
- Tariff updates annually
- Explainability for brokers
- Penalties for misclassification

## The approach in one paragraph

Start with keyword lookup tables used by brokers. Then earn the move to hierarchical transformer with attribute extraction, rule-based tariff-note checks and broker review for low confidence, and only if it beats the baseline on Top-1 accuracy at 6 and 8 digits and Calibration for auto-accept after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Hierarchical code probabilities | Per-level probabilities. Routing. Guard against: calibration. |
| Add Material and function attributes | Extracted attributes. Determines heading. Guard against: extractor accuracy. |
| Add Tariff note rule hits | Matched legal notes. Compliance. Guard against: version. |
| Run it as one pipeline | Invoice or product description (API), Attribute extractor (NER), Hierarchical classifier (transformer), Tariff rule checker (legal notes) and Declaration builder (customs system), with Broker review and Ruling feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle annual HS revision changes code structure | Versioned tariff schedules and correspondence tables. |

**Deliberately not doing**

- Invoice number: none.
- Seller name: encoded in prior shipments.

**How the approach is proven**

Prove it offline on Top-1 accuracy at 6 and 8 digits and Calibration for auto-accept using time-ordered splits, then online on "Auto-classification rate" with "Duty adjustments from audits" as the guardrail. Watch for: Training on past broker mistakes and Ignoring tariff version differences.

## Baseline and production design

- **Baseline (build this first):** Keyword lookup tables used by brokers.
- **Production design:** Hierarchical transformer with attribute extraction, rule-based tariff-note checks and broker review for low confidence.

## Why AI, and why this kind

**Why AI.** Classify goods into Harmonised System codes from descriptions and invoices to accelerate clearance and avoid duties disputes. The evidence that separates good from bad outcomes (Hierarchical code probabilities, Material and function attributes, Tariff note rule hits) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "flat 10,000-way classification" are what teams reach for first, and they fail because hierarchy gives graceful degradation to the correct heading. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Hierarchical transformer with attribute extraction, rule-based tariff-note checks and broker review for low confidence.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Hierarchical code probabilities, Material and function attributes, Tariff note rule hits and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword lookup tables used by brokers | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hierarchical transformer with attribute extraction, rule-based tariff-note checks and broker review for low confidence | chosen | Meets the 80 ms envelope at $0.272 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Auto-classification rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on past broker mistakes.
- Evaluation trap: Ignoring tariff version differences.
- Annual HS revision changes code structure: codes are renumbered each revision so stale mappings produce wrong classifications.
- Vague descriptions (parts): generic part descriptions fit many headings and the model picks a confident wrong one.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
