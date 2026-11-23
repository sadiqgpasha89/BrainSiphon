# BIM Clash Prioritisation: use-case brief

> Generated from the blueprint `engineering/bim-clash-prioritisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** BIM Clash Prioritisation · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank model clashes between disciplines by real impact and likely fix owner so coordination meetings resolve the important ones first and ignore harmless overlaps. The system has to run as a scheduled batch job, inside these limits: Every clash stays in the register, Critical clashes flagged within 1 day of the model update and Coordinators decide.

**Why it is hard.** The obvious approach is clashes marked resolved, and it fails because many are closed without change. The second trap is in "Priority": the real signal is impact on cost, schedule and safety, while teams usually reach for overlap volume.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way rework from clashes measures it.

**What success looks like.** Offline: Rank accuracy against rework outcomes, Grouping quality and Critical recall. Online: Clashes resolved before construction, Rework from clashes and Meeting time. The launch is judged on "Clashes resolved before construction" while "Rework from clashes" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank model clashes between disciplines by real impact and likely fix owner so coordination meetings resolve the important ones first and ignore harmless overlaps.

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

- Every clash stays in the register
- Critical clashes flagged within 1 day of the model update
- Coordinators decide
- Owner suggestion shown with evidence
- 100K clashes per project

## The approach in one paragraph

Start with batches of clashes grouped by location and reviewed in weekly meetings, because it is the usual process. Then earn the move to a ranking model on clash features that groups related clashes, estimates impact and the owner and feeds the coordination meeting with a short prioritised list, and only if it beats the baseline on Rank accuracy against rework outcomes and Grouping quality after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Element types in clash | Systems involved. Core. Guard against: from the model. |
| Add Clash depth and tolerance context | Penetration and allowances. Severity. Guard against: from geometry. |
| Add Space and access criticality | Impact on maintenance and egress. Impact. Guard against: from the model. |
| Run it as one pipeline | Model federation (BIM platform), Clash finding (geometry engine), Grouping (clustering), Impact ranking (learned ranker), Owner suggestion (rules), Coordination meeting (BIM coordinators) and Resolution tracking (issue tracker). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle model lag | Model freshness flags. |

**Deliberately not doing**

- Modeller name: personal data.
- Clash id: an identifier.
- Model file name: an artefact.

**How the approach is proven**

Prove it offline on Rank accuracy against rework outcomes, Grouping quality and Critical recall using time-ordered splits, then online on "Clashes resolved before construction" with "Rework from clashes" as the guardrail. Watch for: Overlap volume as severity, Closed as resolved and Automatic assignment.

## Baseline and production design

- **Baseline (build this first):** Batches of clashes grouped by location and reviewed in weekly meetings, because it is the usual process.
- **Production design:** A ranking model on clash features that groups related clashes, estimates impact and the owner and feeds the coordination meeting with a short prioritised list.

## Why AI, and why this kind

**Why AI.** Rank model clashes between disciplines by real impact and likely fix owner so coordination meetings resolve the important ones first and ignore harmless overlaps. The evidence that separates good from bad outcomes (Element types in clash, Clash depth and tolerance context, Space and access criticality) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "clashes marked resolved" are what teams reach for first, and they fail because many are closed without change. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A ranking model on clash features that groups related clashes, estimates impact and the owner and feeds the coordination meeting with a short prioritised list.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Element types in clash, Clash depth and tolerance context, Space and access criticality and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Batches of clashes grouped by location and reviewed in weekly meetings, because it is the usual process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A ranking model on clash features that groups related clashes, estimates impact and the owner and feeds the coordination meeting with a short prioritised list | chosen | Meets the run-window envelope at $0.038 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Clashes resolved before construction) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Overlap volume as severity.
- Evaluation trap: Closed as resolved.
- Model lag: one discipline model is outdated.
- Soft clash: clearance zones overlap.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
