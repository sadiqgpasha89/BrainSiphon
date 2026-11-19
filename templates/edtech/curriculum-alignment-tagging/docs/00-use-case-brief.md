# Curriculum Standards Alignment & Tagging: use-case brief

> Generated from the blueprint `edtech/curriculum-alignment-tagging` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Curriculum Standards Alignment & Tagging · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Tag content and assessments with curriculum standards and skills automatically, enabling precise search and gap analysis. The system has to run as a scheduled batch job, inside these limits: Many frameworks and versions, Multi-label hierarchy and Teacher review.

**Why it is hard.** The obvious approach is flat tagging, and it fails because hierarchy handles large label spaces. The second trap is in "Versions": the real signal is crosswalks between standard versions, while teams usually reach for re-tag from scratch.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.9K a month. A mistake is expensive in the way search success measures it.

**What success looks like.** Offline: Precision and recall at k per level and Reviewer acceptance. Online: Tagging cost per item and Search success. The launch is judged on "Tagging cost per item" while "Search success" must not get worse.

## Objective, loss and constraints

**Business objective.** Tag content and assessments with curriculum standards and skills automatically, enabling precise search and gap analysis.

**Training objective.** `\mathcal{L}=\sum_k\mathrm{BCE}(y_k,p_k)+\lambda\,\mathrm{HierarchyConsistency}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_k | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_k | The label for tag k: 1 if the content matches standard k. |
| p_k | The predicted probability for tag k. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{HierarchyConsistency} | Penalty when a child standard is tagged without its parent in the curriculum hierarchy. |

**Hard constraints**

- Many frameworks and versions
- Multi-label hierarchy
- Teacher review
- Frequent updates

## The approach in one paragraph

Start with manual tagging by curriculum specialists. Then earn the move to bi-encoder retrieval over standards with cross-encoder re-ranking and hierarchy-aware decoding, reviewer-in-the-loop, and only if it beats the baseline on Precision and recall at k per level and Reviewer acceptance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Content-standard semantic similarity | Embedding similarity. Candidates. Guard against: domain tuning. |
| Add Verb and cognitive level | Action verb taxonomy. Level match. Guard against: extraction. |
| Add Existing tag co-occurrence | Related tags. Consistency. Guard against: data. |
| Run it as one pipeline | Content intake (CMS), Text extraction (parsers), Candidate retrieval (bi-encoder), Re-ranker (cross-encoder), Hierarchy resolver (decoding) and Tag store (metadata), with Specialist review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new standards version published | Crosswalk tables and bulk re-mapping. |

**Deliberately not doing**

- Content title only: insufficient.
- Author: none.

**How the approach is proven**

Prove it offline on Precision and recall at k per level and Reviewer acceptance using time-ordered splits, then online on "Tagging cost per item" with "Search success" as the guardrail. Watch for: Test content similar to training and Ignoring version differences.

## Baseline and production design

- **Baseline (build this first):** Manual tagging by curriculum specialists.
- **Production design:** Bi-encoder retrieval over standards with cross-encoder re-ranking and hierarchy-aware decoding, reviewer-in-the-loop.

## Why AI, and why this kind

**Why AI.** Tag content and assessments with curriculum standards and skills automatically, enabling precise search and gap analysis. The evidence that separates good from bad outcomes (Content-standard semantic similarity, Verb and cognitive level, Existing tag co-occurrence) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "flat tagging" are what teams reach for first, and they fail because hierarchy handles large label spaces. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Bi-encoder retrieval over standards with cross-encoder re-ranking and hierarchy-aware decoding, reviewer-in-the-loop.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Content-standard semantic similarity, Verb and cognitive level, Existing tag co-occurrence and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual tagging by curriculum specialists | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Bi-encoder retrieval over standards with cross-encoder re-ranking and hierarchy-aware decoding, reviewer-in-the-loop | chosen | Meets the run-window envelope at $0.413 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Tagging cost per item) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test content similar to training.
- Evaluation trap: Ignoring version differences.
- New standards version published: old tags orphaned.
- Content spanning multiple subjects: single-label assumption fails.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
