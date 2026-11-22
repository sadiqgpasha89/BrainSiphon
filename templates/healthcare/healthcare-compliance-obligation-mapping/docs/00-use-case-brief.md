# Healthcare Compliance Obligation Mapping: use-case brief

> Generated from the blueprint `healthcare/healthcare-compliance-obligation-mapping` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Compliance Obligation Mapping · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Map regulatory obligations to the policies, controls, procedures, systems, owners, facilities and evidence that address them, and show uncovered obligations, conflicting policies and evidence gaps in a traceable obligation graph. The system has to run as a scheduled batch job, inside these limits: Legal or compliance experts confirm every mapping and every applicability decision, Each edge cites the source span and policy or control reference and Extraction runs from approved sources only.

**Why it is hard.** The obvious approach is similarity list, and it fails because auditors need a defensible link. The second trap is in "Coverage": the real signal is uncovered requirements listed, while teams usually reach for assumed coverage.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $2.4K a month. A mistake is expensive in the way uncovered obligations found before audit measures it.

**What success looks like.** Offline: Recall at ten of confirmed mappings, Edge precision after expert review and Uncovered-obligation detection recall. Online: Mappings confirmed per expert hour, Uncovered obligations found before audit and Policy conflicts resolved. The launch is judged on "Mappings confirmed per expert hour" while "Uncovered obligations found before audit" must not get worse.

## Objective, loss and constraints

**Business objective.** Map regulatory obligations to the policies, controls, procedures, systems, owners, facilities and evidence that address them, and show uncovered obligations, conflicting policies and evidence gaps in a traceable obligation graph.

**Training objective.** `\mathcal{L}=-\sum_{(r,c)}\log\frac{e^{s(r,c)/\tau}}{\sum_{c'}e^{s(r,c')/\tau}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{(r,c)} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| e^{s(r,c)/\tau} | Euler's number (about 2.718), the base of the exponential function. |

**Hard constraints**

- Legal or compliance experts confirm every mapping and every applicability decision
- Each edge cites the source span and policy or control reference
- Extraction runs from approved sources only
- Unmapped obligations are shown and never inferred as covered
- Maps 40K requirements against 12K policy and control statements
- Edges are versioned with the source version

## The approach in one paragraph

Start with a compliance analyst keeps a crosswalk spreadsheet by hand. Then earn the move to citation-grounded extraction of obligations, candidate-edge retrieval and cross-encoder ranking, a graph store with versioned edges, rule checks for conflicts and coverage, and a reviewer workbench, and only if it beats the baseline on Recall at ten of confirmed mappings and Edge precision after expert review after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Semantic match score | Similarity between requirement text and policy or control statement. Proposes candidate edges. Guard against: embedding and cross-encoder. |
| Add Terminology and scope overlap | Shared defined terms, facility types and service lines. Reduces false links. Guard against: extracted metadata. |
| Add Existing confirmed edges | Previously confirmed mappings for similar requirements. Supervises ranking. Guard against: earlier mapping rounds. |
| Run it as one pipeline | Source and policy intake (approved stores), Obligation extractor (document AI with spans), Candidate edge retriever (embedding search), Mapping ranker (cross-encoder), Obligation graph builder (graph store) and Compliance expert confirmation (human), with Graph versioning and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle requirement split across several clauses | Requirement grouping and a review prompt. |

**Deliberately not doing**

- Policy title: not content.
- Requirement numbering style: layout.
- Document author: not coverage.

**How the approach is proven**

Prove it offline on Recall at ten of confirmed mappings, Edge precision after expert review and Uncovered-obligation detection recall using time-ordered splits, then online on "Mappings confirmed per expert hour" with "Uncovered obligations found before audit" as the guardrail. Watch for: Treating similarity as coverage, Mapping to retired policies and Skipping expert confirmation.

## Baseline and production design

- **Baseline (build this first):** A compliance analyst keeps a crosswalk spreadsheet by hand.
- **Production design:** Citation-grounded extraction of obligations, candidate-edge retrieval and cross-encoder ranking, a graph store with versioned edges, rule checks for conflicts and coverage, and a reviewer workbench.

## Why AI, and why this kind

**Why AI.** Map regulatory obligations to the policies, controls, procedures, systems, owners, facilities and evidence that address them, and show uncovered obligations, conflicting policies and evidence gaps in a traceable obligation graph. The evidence that separates good from bad outcomes (Semantic match score, Terminology and scope overlap, Existing confirmed edges) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "similarity list" are what teams reach for first, and they fail because auditors need a defensible link. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Citation-grounded extraction of obligations, candidate-edge retrieval and cross-encoder ranking, a graph store with versioned edges, rule checks for conflicts and coverage, and a reviewer workbench.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Semantic match score, Terminology and scope overlap, Existing confirmed edges and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A compliance analyst keeps a crosswalk spreadsheet by hand | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Citation-grounded extraction of obligations, candidate-edge retrieval and cross-encoder ranking, a graph store with versioned edges, rule checks for conflicts and coverage, and a reviewer workbench | chosen | Meets the run-window envelope at $0.540 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mappings confirmed per expert hour) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating similarity as coverage.
- Evaluation trap: Mapping to retired policies.
- Requirement split across several clauses: the mapping is partial.
- Policy retired: edges point to nothing.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
