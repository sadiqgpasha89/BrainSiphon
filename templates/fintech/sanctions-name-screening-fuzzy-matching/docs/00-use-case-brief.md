# Sanctions Name Screening with Fuzzy Matching: use-case brief

> Generated from the blueprint `fintech/sanctions-name-screening-fuzzy-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Sanctions Name Screening with Fuzzy Matching · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Screen payments and customers against sanctions lists with high recall across transliterations while cutting false hits by 60%. The system has to run in under 100 milliseconds, inside these limits: Recall must be near 100% on true listed names, 50 ms per name and List updates live within 15 minutes.

**Why it is hard.** The obvious approach is exact or edit-distance-only matching, and it fails because transliteration variants (Mohammed, Muhammad) defeat edit distance. The second trap is in "Context": the real signal is secondary identifiers such as DOB, country and entity type, while teams usually reach for name similarity alone.

**Scale and stakes.** At 10 million users this is about 12.0M model-touching events a day, 139 requests per second on average and 833 at peak, at an estimated $12.4K a month. A mistake is expensive in the way missed true match incidents measures it.

**What success looks like.** Offline: Recall at fixed review volume and False-hit rate per 1000 screens. Online: Analyst hours per 1000 screens and Missed true match incidents. The launch is judged on "Analyst hours per 1000 screens" while "Missed true match incidents" must not get worse.

## Objective, loss and constraints

**Business objective.** Screen payments and customers against sanctions lists with high recall across transliterations while cutting false hits by 60%.

**Training objective.** `\mathcal{L}=\mathrm{TripletLoss}(a,p,n)+\lambda\,\mathrm{BCE}(\text{match})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{TripletLoss} | Triplet loss: requires an anchor to be closer to a matching example than to a non-matching one by a margin. |
| a | The anchor: a name from the customer or counterparty. |
| p | The positive: a sanctions-list name that truly matches the anchor. |
| n | The negative: a different name that does not match. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{match} | The label: 1 if two names refer to the same entity. |

**Hard constraints**

- Recall must be near 100% on true listed names
- 50 ms per name
- List updates live within 15 minutes
- Explainable matches

## The approach in one paragraph

Start with jaro-Winkler with token-sort and a fixed threshold. Then earn the move to two-stage: candidate generation with n-gram ANN index then a cross-encoder re-ranker trained on adjudicated hits, with calibrated thresholds per list, and only if it beats the baseline on Recall at fixed review volume and False-hit rate per 1000 screens after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Phonetic-embedding similarity | Cosine of character-aware name embeddings. Handles transliteration. Guard against: evaluate on held-out alias families. |
| Add Secondary identifier agreement | DOB, nationality and ID overlap score. Disambiguates common names. Guard against: missing values must be neutral not negative. |
| Add Alias-graph distance | Shortest alias path between the query and list entity. Catches known aliases. Guard against: alias updates versioned by list date. |
| Run it as one pipeline | Screening API (gRPC), Name normaliser (transliteration and cleaning), Candidate generation (n-gram ANN), Cross-encoder reranker (distilled transformer), Threshold policy (per-list calibration) and Adjudication labels (feedback store), with Compliance queue off the critical path. |
| Optimise the right thing | The objective weighs triplet loss: requires an anchor to be closer to a matching example than to a non-matching one by a margin, so the model is trained on the cost of the decision and not on a generic score. |
| Handle list delta with 10k new entries | Incremental index with blue-green swap. |

**Deliberately not doing**

- Name length: length-biased distance artefacts.
- Payment amount: irrelevant for list membership.

**How the approach is proven**

Prove it offline on Recall at fixed review volume and False-hit rate per 1000 screens using time-ordered splits, then online on "Analyst hours per 1000 screens" with "Missed true match incidents" as the guardrail. Watch for: Test set made of synthetic typos only and Threshold tuned on one list and applied to all.

## Baseline and production design

- **Baseline (build this first):** Jaro-Winkler with token-sort and a fixed threshold.
- **Production design:** Two-stage: candidate generation with n-gram ANN index then a cross-encoder re-ranker trained on adjudicated hits, with calibrated thresholds per list.

## Why AI, and why this kind

**Why AI.** Screen payments and customers against sanctions lists with high recall across transliterations while cutting false hits by 60%. The evidence that separates good from bad outcomes (Phonetic-embedding similarity, Secondary identifier agreement, Alias-graph distance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "exact or edit-distance-only matching" are what teams reach for first, and they fail because transliteration variants (Mohammed, Muhammad) defeat edit distance. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Two-stage: candidate generation with n-gram ANN index then a cross-encoder re-ranker trained on adjudicated hits, with calibrated thresholds per list.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Phonetic-embedding similarity, Secondary identifier agreement, Alias-graph distance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Jaro-Winkler with token-sort and a fixed threshold | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Two-stage: candidate generation with n-gram ANN index then a cross-encoder re-ranker trained on adjudicated hits, with calibrated thresholds per list | chosen | Meets the 80 ms envelope at $0.034 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Analyst hours per 1000 screens) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test set made of synthetic typos only.
- Evaluation trap: Threshold tuned on one list and applied to all.
- List delta with 10k new entries: index rebuild stalls.
- Names in unseen scripts: embedding fails.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
