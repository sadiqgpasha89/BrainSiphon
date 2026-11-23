# Issue Triage and Labelling: use-case brief

> Generated from the blueprint `devtools/issue-triage-labelling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Issue Triage and Labelling · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify new issues by type, component and priority and suggest the owner so reports reach the right team fast. The system has to run interactively, within a few seconds, inside these limits: Suggested labels with confidence, Security issues routed privately and at once and Maintainers can override.

**Why it is hard.** The obvious approach is reporter labels, and it fails because reporters choose wrongly. The second trap is in "Safety": the real signal is security and data loss issues escalated, while teams usually reach for normal queue only.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.2K a month. A mistake is expensive in the way misrouted issues measures it.

**What success looks like.** Offline: Label accuracy, Security recall and Owner accuracy. Online: Time to first response, Misrouted issues and Maintainer triage time. The launch is judged on "Time to first response" while "Misrouted issues" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify new issues by type, component and priority and suggest the owner so reports reach the right team fast.

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

- Suggested labels with confidence
- Security issues routed privately and at once
- Maintainers can override
- Triage within 30 s
- 500K issues per year

## The approach in one paragraph

Start with maintainers reading and labelling each issue by hand, because it is the current practice. Then earn the move to a classifier and retrieval service for labels, component and owner suggestions with a rule layer for security terms and a maintainer override loop, and only if it beats the baseline on Label accuracy and Security recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Issue text and stack traces | Description and errors. Component. Guard against: from the report. |
| Add Affected version and platform | Version metadata. Routing. Guard against: from the report. |
| Add Similar past issues | Closed issues with similar text. Owner hint. Guard against: from the tracker. |
| Run it as one pipeline | Issue intake (tracker), Text and trace parsing (NLP), Label classifier (transformer), Security rule layer (rules), Owner suggestion (ownership data) and Accuracy tracking (monthly), with Maintainer review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle vague report | Ask for details automatically. |

**Deliberately not doing**

- Reporter name: personal data.
- Issue number: an identifier.
- Time of day: irrelevant.

**How the approach is proven**

Prove it offline on Label accuracy, Security recall and Owner accuracy using time-ordered splits, then online on "Time to first response" with "Misrouted issues" as the guardrail. Watch for: Reporter labels as truth, Automatic closing and No security rule layer.

## Baseline and production design

- **Baseline (build this first):** Maintainers reading and labelling each issue by hand, because it is the current practice.
- **Production design:** A classifier and retrieval service for labels, component and owner suggestions with a rule layer for security terms and a maintainer override loop.

## Why AI, and why this kind

**Why AI.** Classify new issues by type, component and priority and suggest the owner so reports reach the right team fast. The evidence that separates good from bad outcomes (Issue text and stack traces, Affected version and platform, Similar past issues) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "reporter labels" are what teams reach for first, and they fail because reporters choose wrongly. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A classifier and retrieval service for labels, component and owner suggestions with a rule layer for security terms and a maintainer override loop.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Issue text and stack traces, Affected version and platform, Similar past issues and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Maintainers reading and labelling each issue by hand, because it is the current practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A classifier and retrieval service for labels, component and owner suggestions with a rule layer for security terms and a maintainer override loop | chosen | Meets the 2500 ms envelope at $0.680 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to first response) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Reporter labels as truth.
- Evaluation trap: Automatic closing.
- Vague report: the text lacks detail.
- Multiple problems: one issue has several bugs.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
