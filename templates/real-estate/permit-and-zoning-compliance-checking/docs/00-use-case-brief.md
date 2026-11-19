# Permit & Zoning Compliance Checking: use-case brief

> Generated from the blueprint `real-estate/permit-and-zoning-compliance-checking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Permit & Zoning Compliance Checking · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Check building plans and applications against zoning and code rules and give applicants and officers cited findings. The system has to run interactively, within a few seconds, inside these limits: Findings are based on the official code text and nothing else, The permit officer makes every decision and Every finding cites the code section and the plan sheet.

**Why it is hard.** The obvious approach is free-text summaries of the code, and it fails because a structured check can be audited and tested, while a summary hides how a conclusion was reached. The second trap is in "Version": the real signal is the code version in force on the application date, while teams usually reach for the latest code.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $46.9K a month. A mistake is expensive in the way rework cycles measures it.

**What success looks like.** Offline: Rule accuracy and Finding precision. Online: Review time and Rework cycles. The launch is judged on "Review time" while "Rework cycles" must not get worse.

## Objective, loss and constraints

**Business objective.** Check building plans and applications against zoning and code rules and give applicants and officers cited findings.

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

- Findings are based on the official code text and nothing else
- The permit officer makes every decision
- Every finding cites the code section and the plan sheet
- Rules versioned so an application is checked against the code in force at submission

## The approach in one paragraph

Start with officers check manually against checklists, because it is the norm. Then earn the move to structured code rules, plan measurement extraction and an LLM for narrative requirements with cited findings, and only if it beats the baseline on Rule accuracy and Finding precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Rule check accuracy | Share of rule checks that match an expert's verdict on a labelled set. The core quality measure. Guard against: rules interact, so test combinations. |
| Add Citation validity | Share of findings whose cited section supports the finding. Trust depends on correct citations. Guard against: a real section can still be the wrong one, so check support. |
| Add Measurement extraction | Accuracy of dimensions, areas and heights read from the plans. Inputs to the rule checks. Guard against: scales and units vary, so validate against stated figures. |
| Run it as one pipeline | Application intake (portal), Plan reader (vision and OCR), Rule engine (rules), Narrative checker (LLM), Findings drafter (LLM) and Record (system), with Officer review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle ambiguous code | Escalate ambiguous clauses to the officer with both readings. |

**Deliberately not doing**

- Applicant name: Does not affect whether a plan complies.
- Format: The file format of the application, which has no bearing on compliance.
- Length: A long application is not more or less compliant.

**How the approach is proven**

Prove it offline on Rule accuracy and Finding precision using time-ordered splits, then online on "Review time" with "Rework cycles" as the guardrail. Watch for: Easy applications are over-represented in the data, so unusual cases fail in use and Code updates mean a test set from last year does not reflect today's rules.

## Baseline and production design

- **Baseline (build this first):** Officers check manually against checklists, because it is the norm.
- **Production design:** Structured code rules, plan measurement extraction and an LLM for narrative requirements with cited findings.

## Why AI, and why this kind

**Why AI.** Check building plans and applications against zoning and code rules and give applicants and officers cited findings. The evidence that separates good from bad outcomes (Rule check accuracy, Citation validity, Measurement extraction) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free-text summaries of the code" are what teams reach for first, and they fail because A structured check can be audited and tested, while a summary hides how a conclusion was reached. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Structured code rules, plan measurement extraction and an LLM for narrative requirements with cited findings.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Rule check accuracy, Citation validity, Measurement extraction and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Officers check manually against checklists, because it is the norm | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Structured code rules, plan measurement extraction and an LLM for narrative requirements with cited findings | chosen | Meets the 2500 ms envelope at $5.21 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Review time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Easy applications are over-represented in the data, so unusual cases fail in use.
- Evaluation trap: Code updates mean a test set from last year does not reflect today's rules.
- Ambiguous code: the code text is ambiguous and can be read two ways.
- Amendments: amendments change the code after the application is filed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
