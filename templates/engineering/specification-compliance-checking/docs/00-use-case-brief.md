# Specification Compliance Checking: use-case brief

> Generated from the blueprint `engineering/specification-compliance-checking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Specification Compliance Checking · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Check submitted designs and product data against specification clauses and codes and list clauses that are met, unmet or unclear, with citations for reviewers to decide. The system has to run as a scheduled batch job, inside these limits: Each finding cites the clause and the source evidence, Reviewers decide compliance and Unclear items never marked compliant.

**Why it is hard.** The obvious approach is a compliance pass, and it fails because compliance is a professional judgement. The second trap is in "Source": the real signal is current code and specification editions, while teams usually reach for model memory.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $2.1K a month. A mistake is expensive in the way non-compliance found late measures it.

**What success looks like.** Offline: Extraction accuracy, Unmet item recall and Citation faithfulness. Online: Review time, Non-compliance found late and Resubmission rate. The launch is judged on "Review time" while "Non-compliance found late" must not get worse.

## Objective, loss and constraints

**Business objective.** Check submitted designs and product data against specification clauses and codes and list clauses that are met, unmet or unclear, with citations for reviewers to decide.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Each finding cites the clause and the source evidence
- Reviewers decide compliance
- Unclear items never marked compliant
- Review within 1 hour for 500 documents
- Code editions tracked

## The approach in one paragraph

Start with reviewers reading specifications and submissions side by side, because it is the standard practice. Then earn the move to a checker that extracts requirements and evidence, compares them with units and editions and produces a cited table of met, unmet and unclear items, and only if it beats the baseline on Extraction accuracy and Unmet item recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Clause requirement | The numeric or textual requirement. Core. Guard against: from the specification. |
| Add Evidence extraction | Values in the submission. Core. Guard against: from documents. |
| Add Edition and jurisdiction | Code version in force. Applicability. Guard against: from project data. |
| Run it as one pipeline | Specification and submission intake (document system), Requirement and value extraction (NLP and tables), Unit normalisation (rules), Comparison (rules and LLM) and Cited result table (report), with Reviewer decision and Feedback off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle ambiguous clause | Mark unclear and ask the reviewer. |

**Deliberately not doing**

- Submitter name: personal data.
- Document layout: an artefact.
- Company logo: irrelevant.

**How the approach is proven**

Prove it offline on Extraction accuracy, Unmet item recall and Citation faithfulness using time-ordered splits, then online on "Review time" with "Non-compliance found late" as the guardrail. Watch for: Silent compliance passes, Model memory of codes and Assumed compliant.

## Baseline and production design

- **Baseline (build this first):** Reviewers reading specifications and submissions side by side, because it is the standard practice.
- **Production design:** A checker that extracts requirements and evidence, compares them with units and editions and produces a cited table of met, unmet and unclear items.

## Why AI, and why this kind

**Why AI.** Check submitted designs and product data against specification clauses and codes and list clauses that are met, unmet or unclear, with citations for reviewers to decide. The evidence that separates good from bad outcomes (Clause requirement, Evidence extraction, Edition and jurisdiction) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A compliance pass" are what teams reach for first, and they fail because compliance is a professional judgement. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A checker that extracts requirements and evidence, compares them with units and editions and produces a cited table of met, unmet and unclear items.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Clause requirement, Evidence extraction, Edition and jurisdiction and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Reviewers reading specifications and submissions side by side, because it is the standard practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A checker that extracts requirements and evidence, compares them with units and editions and produces a cited table of met, unmet and unclear items | chosen | Meets the run-window envelope at $0.077 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Review time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Silent compliance passes.
- Evaluation trap: Model memory of codes.
- Ambiguous clause: the wording has several readings.
- Unit conversion: values use mixed units.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
