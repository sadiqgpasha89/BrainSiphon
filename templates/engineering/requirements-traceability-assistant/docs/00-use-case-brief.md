# Requirements Traceability Assistant: use-case brief

> Generated from the blueprint `engineering/requirements-traceability-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Requirements Traceability Assistant · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Link requirements to design elements, tests and changes, find gaps and conflicts and propose trace links for engineers to confirm. The system has to run as a scheduled batch job, inside these limits: Links proposed and confirmed by engineers, Gaps shown with the requirement text and Changes show downstream impact.

**Why it is hard.** The obvious approach is text similarity, and it fails because similar text may not mean satisfaction. The second trap is in "Role": the real signal is propose and find gaps, while teams usually reach for declare compliance.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $2.0K a month. A mistake is expensive in the way time to impact analysis measures it.

**What success looks like.** Offline: Link precision at five, Gap detection recall and Engineer acceptance. Online: Untraced requirements, Time to impact analysis and Audit findings. The launch is judged on "Untraced requirements" while "Time to impact analysis" must not get worse.

## Objective, loss and constraints

**Business objective.** Link requirements to design elements, tests and changes, find gaps and conflicts and propose trace links for engineers to confirm.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RankLoss} | Ranking loss: penalises placing a less relevant item above a more relevant one. |

**Hard constraints**

- Links proposed and confirmed by engineers
- Gaps shown with the requirement text
- Changes show downstream impact
- Weekly scan of 100K requirements
- Audit export in standard formats

## The approach in one paragraph

Start with manual traceability matrices in spreadsheets, because they are the common tool. Then earn the move to a linking service that suggests trace links, flags uncovered or conflicting requirements, shows change impact and exports audit-ready traceability, and only if it beats the baseline on Link precision at five and Gap detection recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Text similarity | Requirement and design element text. Candidate. Guard against: from a text model. |
| Add Existing trace links | Confirmed links. Truth. Guard against: from the requirements tool. |
| Add Test coverage | Tests linked to the requirement. Gap. Guard against: from the test system. |
| Run it as one pipeline | Requirement and design extraction (tools), Candidate link search (embeddings), Link ranking (learned ranker), Engineer confirmation (requirements tool) and Change impact view (dashboard), with Gap and conflict report and Audit export off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle vague requirement | Flag for rewriting. |

**Deliberately not doing**

- Author name: personal data.
- Document template: an artefact.
- Requirement id format: an identifier.

**How the approach is proven**

Prove it offline on Link precision at five, Gap detection recall and Engineer acceptance using time-ordered splits, then online on "Untraced requirements" with "Time to impact analysis" as the guardrail. Watch for: Similarity as compliance, Declared compliance and Link counts as quality.

## Baseline and production design

- **Baseline (build this first):** Manual traceability matrices in spreadsheets, because they are the common tool.
- **Production design:** A linking service that suggests trace links, flags uncovered or conflicting requirements, shows change impact and exports audit-ready traceability.

## Why AI, and why this kind

**Why AI.** Link requirements to design elements, tests and changes, find gaps and conflicts and propose trace links for engineers to confirm. The evidence that separates good from bad outcomes (Text similarity, Existing trace links, Test coverage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "text similarity" are what teams reach for first, and they fail because similar text may not mean satisfaction. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A linking service that suggests trace links, flags uncovered or conflicting requirements, shows change impact and exports audit-ready traceability.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Text similarity, Existing trace links, Test coverage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual traceability matrices in spreadsheets, because they are the common tool | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A linking service that suggests trace links, flags uncovered or conflicting requirements, shows change impact and exports audit-ready traceability | chosen | Meets the run-window envelope at $0.111 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Untraced requirements) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Similarity as compliance.
- Evaluation trap: Declared compliance.
- Vague requirement: the text cannot be tested.
- Duplicate requirements: wording differs for the same need.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
