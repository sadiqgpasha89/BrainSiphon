# Source-Code Plagiarism Detection: use-case brief

> Generated from the blueprint `edtech/code-plagiarism-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Source-Code Plagiarism Detection · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect collusion and copying in programming assignments robustly to renaming and restructuring, with evidence for review. The system has to run as a scheduled batch job, inside these limits: Common starter code, Obfuscation and Fair investigations.

**Why it is hard.** The obvious approach is token or text similarity, and it fails because renaming defeats text similarity. The second trap is in "Baseline": the real signal is remove starter code and common solutions, while teams usually reach for raw similarity.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.9K a month. A mistake is expensive in the way instructor review time measures it.

**What success looks like.** Offline: Precision and recall on seeded and adjudicated cases and Evidence quality. Online: Confirmed cases per flagged and Instructor review time. The launch is judged on "Confirmed cases per flagged" while "Instructor review time" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect collusion and copying in programming assignments robustly to renaming and restructuring, with evidence for review.

**Training objective.** `\mathcal{L}=\mathrm{Triplet}(\text{same logic})+\lambda\,\mathrm{BCE}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Triplet} | Triplet loss: requires an anchor to be closer to a matching example than to a non-matching one by a margin. |
| \text{same logic} | The pairing label: 1 if two programs implement the same logic, even with renamed variables or reordered code. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy on whether a pair is plagiarised. |

**Hard constraints**

- Common starter code
- Obfuscation
- Fair investigations
- Scale to large courses

## The approach in one paragraph

Start with mOSS-style winnowing token fingerprints. Then earn the move to aST and data-flow embeddings with rarity weighting, starter-code removal and instructor-facing evidence diffs, and only if it beats the baseline on Precision and recall on seeded and adjudicated cases and Evidence quality after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around AST subtree similarity | Normalised AST matches. Copying. Guard against: normalisation. |
| Add Rare-structure overlap | Shared unusual constructs. Collusion. Guard against: corpus statistics. |
| Add Submission-time proximity | Timing of similar submissions. Collusion. Guard against: timestamps. |
| Run it as one pipeline | Submissions (LMS), Starter-code remover (diff), AST normaliser (parser), Similarity model (code embeddings) and Rarity weighting (corpus stats), with Instructor review and Case outcomes off the critical path. |
| Optimise the right thing | The objective weighs triplet loss: requires an anchor to be closer to a matching example than to a non-matching one by a margin, so the model is trained on the cost of the decision and not on a generic score. |
| Handle highly constrained tiny assignments | Problem-level baselines and rarity weighting. |

**Deliberately not doing**

- Variable names: easily changed.
- Comments: easily changed.

**How the approach is proven**

Prove it offline on Precision and recall on seeded and adjudicated cases and Evidence quality using time-ordered splits, then online on "Confirmed cases per flagged" with "Instructor review time" as the guardrail. Watch for: Seeded plagiarism too simple and Ignoring common solutions.

## Baseline and production design

- **Baseline (build this first):** MOSS-style winnowing token fingerprints.
- **Production design:** AST and data-flow embeddings with rarity weighting, starter-code removal and instructor-facing evidence diffs.

## Why AI, and why this kind

**Why AI.** Detect collusion and copying in programming assignments robustly to renaming and restructuring, with evidence for review. The evidence that separates good from bad outcomes (AST subtree similarity, Rare-structure overlap, Submission-time proximity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "token or text similarity" are what teams reach for first, and they fail because renaming defeats text similarity. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: AST and data-flow embeddings with rarity weighting, starter-code removal and instructor-facing evidence diffs.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among AST subtree similarity, Rare-structure overlap, Submission-time proximity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: MOSS-style winnowing token fingerprints | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| AST and data-flow embeddings with rarity weighting, starter-code removal and instructor-facing evidence diffs | chosen | Meets the run-window envelope at $0.415 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Confirmed cases per flagged) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Seeded plagiarism too simple.
- Evaluation trap: Ignoring common solutions.
- Highly constrained tiny assignments: many unavoidable matches.
- AI-generated solutions similar across students: false collusion flags.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
