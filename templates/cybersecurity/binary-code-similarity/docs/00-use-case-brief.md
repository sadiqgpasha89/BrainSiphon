# Binary Code Similarity & Vulnerability Matching: use-case brief

> Generated from the blueprint `cybersecurity/binary-code-similarity` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Binary Code Similarity & Vulnerability Matching · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find known vulnerable functions inside stripped binaries and firmware across compilers and architectures at scale. The system has to run as a scheduled batch job, inside these limits: Cross-architecture matching, Millions of functions and Stripped symbols.

**Why it is hard.** The obvious approach is instruction-sequence matching, and it fails because optimisation level changes instruction sequences. The second trap is in "Patch awareness": the real signal is distinguish patched from vulnerable variants, while teams usually reach for binary similarity score alone.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.9K a month. A mistake is expensive in the way time to SBOM measures it.

**What success looks like.** Offline: Recall@k across architectures and Patched/unpatched discrimination accuracy. Online: Vulnerable components found in firmware and Time to SBOM. The launch is judged on "Vulnerable components found in firmware" while "Time to SBOM" must not get worse.

## Objective, loss and constraints

**Business objective.** Find known vulnerable functions inside stripped binaries and firmware across compilers and architectures at scale.

**Training objective.** `\mathcal{L}=\mathrm{Contrastive}(f_a,f_b)\ \text{(cross-architecture, cross-optimisation)}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Contrastive} | Contrastive loss: pulls similar items together and pushes dissimilar items apart in embedding space. |
| f_a | The embedding of a compiled function: f_a and f_b are two versions of the same function (for example, different architectures or optimisation levels) that should end up close together. |

**Hard constraints**

- Cross-architecture matching
- Millions of functions
- Stripped symbols
- Low false positives for patch decisions

## The approach in one paragraph

Start with exact function hashing and BinDiff. Then earn the move to cFG GNN with instruction-semantic embeddings, ANN retrieval over function corpora and a patch-aware verifier, and only if it beats the baseline on Recall@k across architectures and Patched/unpatched discrimination accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Control-flow-graph embedding | GNN over CFG. Structure. Guard against: disassembly quality. |
| Add Constants and string references | Immediate values and strings. Anchors. Guard against: stripped binaries. |
| Add Patch-diff features | Differences in guard conditions. Patched status. Guard against: reference pairs. |
| Run it as one pipeline | Binary ingestion (firmware or package), Disassembly (Ghidra or IDA), Function embedding (GNN), ANN search (vector index), Patch verifier (diff model), Security engineer (human) and Confirmed matches (labels). |
| Optimise the right thing | The objective weighs contrastive loss: pulls similar items together and pushes dissimilar items apart in embedding space, so the model is trained on the cost of the decision and not on a generic score. |
| Handle heavy obfuscation or virtualisation | Dynamic analysis fallback and confidence thresholds. |

**Deliberately not doing**

- Function address: meaningless.
- Symbol names: stripped.

**How the approach is proven**

Prove it offline on Recall@k across architectures and Patched/unpatched discrimination accuracy using time-ordered splits, then online on "Vulnerable components found in firmware" with "Time to SBOM" as the guardrail. Watch for: Evaluation only on same-compiler pairs and Treating patched variants as true matches.

## Baseline and production design

- **Baseline (build this first):** Exact function hashing and BinDiff.
- **Production design:** CFG GNN with instruction-semantic embeddings, ANN retrieval over function corpora and a patch-aware verifier.

## Why AI, and why this kind

**Why AI.** Find known vulnerable functions inside stripped binaries and firmware across compilers and architectures at scale. The evidence that separates good from bad outcomes (Control-flow-graph embedding, Constants and string references, Patch-diff features) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "instruction-sequence matching" are what teams reach for first, and they fail because optimisation level changes instruction sequences. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: CFG GNN with instruction-semantic embeddings, ANN retrieval over function corpora and a patch-aware verifier.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Control-flow-graph embedding, Constants and string references, Patch-diff features and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Exact function hashing and BinDiff | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| CFG GNN with instruction-semantic embeddings, ANN retrieval over function corpora and a patch-aware verifier | chosen | Meets the run-window envelope at $2.07 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Vulnerable components found in firmware) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluation only on same-compiler pairs.
- Evaluation trap: Treating patched variants as true matches.
- Heavy obfuscation or virtualisation: embeddings fail.
- Compiler version shifts code layout: cross-version recall drops.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
