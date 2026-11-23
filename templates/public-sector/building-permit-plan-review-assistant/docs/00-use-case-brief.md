# Building Permit Plan Review Assistant: use-case brief

> Generated from the blueprint `public-sector/building-permit-plan-review-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Building Permit Plan Review Assistant · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Pre-check building plans against code and zoning rules and highlight possible issues with references so plan reviewers focus on judgement and applicants fix problems earlier. The system has to run interactively, within a few seconds, inside these limits: Every flag cites the rule and the drawing location, The assistant never approves or rejects and Reviewer decides.

**Why it is hard.** The obvious approach is model recall of code, and it fails because codes differ and change. The second trap is in "Authority": the real signal is the reviewer decides and signs, while teams usually reach for an automatic approval.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $420.1K a month. A mistake is expensive in the way resubmissions measures it.

**What success looks like.** Offline: Flag precision and recall against reviewer findings, Measurement error and Citation accuracy. Online: Review cycle time, Resubmissions and Reviewer time per application. The launch is judged on "Review cycle time" while "Resubmissions" must not get worse.

## Objective, loss and constraints

**Business objective.** Pre-check building plans against code and zoning rules and highlight possible issues with references so plan reviewers focus on judgement and applicants fix problems earlier.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Every flag cites the rule and the drawing location
- The assistant never approves or rejects
- Reviewer decides
- Applicants see the same issues list
- Precheck within 15 minutes
- 100K applications per year

## The approach in one paragraph

Start with manual plan review by examiners using checklists, because it is the current process. Then earn the move to a plan reading pipeline with a rule engine that produces cited flags for reviewers and applicants, with an audit log of rule versions, and only if it beats the baseline on Flag precision and recall against reviewer findings and Measurement error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Dimension and area extraction | Measurements read from plans. Rule inputs. Guard against: from drawing analysis. |
| Add Rule match | Which code section applies. Citation. Guard against: from the rule base. |
| Add Zoning and overlay data | Zone and overlays at the site. Applicable rules. Guard against: from GIS. |
| Run it as one pipeline | Plan intake (permit portal), Drawing parsing (vision and OCR), Measurement extraction (model), Rule check (rule engine), Flag drafting with citation (LLM with controlled text) and Rule version log (audit store), with Reviewer decision off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle hand-drawn plans | Low confidence flags and manual review. |

**Deliberately not doing**

- Applicant name: irrelevant.
- Architect firm: irrelevant for correctness.
- File name: an artefact.

**How the approach is proven**

Prove it offline on Flag precision and recall against reviewer findings, Measurement error and Citation accuracy using time-ordered splits, then online on "Review cycle time" with "Resubmissions" as the guardrail. Watch for: Automatic approval, Uncited flags and Unversioned rules.

## Baseline and production design

- **Baseline (build this first):** Manual plan review by examiners using checklists, because it is the current process.
- **Production design:** A plan reading pipeline with a rule engine that produces cited flags for reviewers and applicants, with an audit log of rule versions.

## Why AI, and why this kind

**Why AI.** Pre-check building plans against code and zoning rules and highlight possible issues with references so plan reviewers focus on judgement and applicants fix problems earlier. The evidence that separates good from bad outcomes (Dimension and area extraction, Rule match, Zoning and overlay data) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model recall of code" are what teams reach for first, and they fail because codes differ and change. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A plan reading pipeline with a rule engine that produces cited flags for reviewers and applicants, with an audit log of rule versions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Dimension and area extraction, Rule match, Zoning and overlay data and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual plan review by examiners using checklists, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A plan reading pipeline with a rule engine that produces cited flags for reviewers and applicants, with an audit log of rule versions | chosen | Meets the 2500 ms envelope at $4.67 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Review cycle time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Automatic approval.
- Evaluation trap: Uncited flags.
- Hand-drawn plans: extraction is unreliable.
- Code update: a rule changes mid-review.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
