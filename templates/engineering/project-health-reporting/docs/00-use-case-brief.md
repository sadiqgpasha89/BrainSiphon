# Project Health Reporting: use-case brief

> Generated from the blueprint `engineering/project-health-reporting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Project Health Reporting · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Draft weekly project status reports from schedule, cost, risk and issue data with cited figures and a plain narrative for the project manager to edit and send. The system has to run as a scheduled batch job, inside these limits: Every figure links to its source system, Project manager approves before sending and Unconfirmed items marked.

**Why it is hard.** The obvious approach is chat summaries, and it fails because chat can be wrong or stale. The second trap is in "Audience": the real signal is separate client and internal versions, while teams usually reach for one report.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $2.0K a month. A mistake is expensive in the way reporting errors measures it.

**What success looks like.** Offline: Figure accuracy, Citation faithfulness and Manager edit rate. Online: Time to produce reports, Reporting errors and Manager time. The launch is judged on "Time to produce reports" while "Reporting errors" must not get worse.

## Objective, loss and constraints

**Business objective.** Draft weekly project status reports from schedule, cost, risk and issue data with cited figures and a plain narrative for the project manager to edit and send.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| x | The input features describing one example (what the model sees). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Every figure links to its source system
- Project manager approves before sending
- Unconfirmed items marked
- Draft within 10 minutes
- 2,000 projects

## The approach in one paragraph

Start with project managers compiling reports from several tools by hand, because it is the common practice. Then earn the move to a reporting assistant that pulls approved data, drafts audience-specific narratives with source links, flags changes since last week and routes drafts to the manager, and only if it beats the baseline on Figure accuracy and Citation faithfulness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Schedule and cost status | Variance and forecasts. Core. Guard against: from project controls. |
| Add Open risks and issues | Top items. Content. Guard against: from the risk register. |
| Add Milestones | Upcoming and missed. Content. Guard against: from the schedule. |
| Run it as one pipeline | Data pull (project systems), Variance and change calculation (analytics), Draft narrative (LLM with citations), Audience filter (rules) and Distribution (project platform), with Manager review and Feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle data conflicts | List the conflict and ask the manager. |

**Deliberately not doing**

- Author name: personal data.
- Report template: an artefact.
- Time of day: irrelevant.

**How the approach is proven**

Prove it offline on Figure accuracy, Citation faithfulness and Manager edit rate using time-ordered splits, then online on "Time to produce reports" with "Reporting errors" as the guardrail. Watch for: Chat as source, One report for all and Auto-sending.

## Baseline and production design

- **Baseline (build this first):** Project managers compiling reports from several tools by hand, because it is the common practice.
- **Production design:** A reporting assistant that pulls approved data, drafts audience-specific narratives with source links, flags changes since last week and routes drafts to the manager.

## Why AI, and why this kind

**Why AI.** Draft weekly project status reports from schedule, cost, risk and issue data with cited figures and a plain narrative for the project manager to edit and send. The evidence that separates good from bad outcomes (Schedule and cost status, Open risks and issues, Milestones) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "chat summaries" are what teams reach for first, and they fail because chat can be wrong or stale. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A reporting assistant that pulls approved data, drafts audience-specific narratives with source links, flags changes since last week and routes drafts to the manager.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Schedule and cost status, Open risks and issues, Milestones and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Project managers compiling reports from several tools by hand, because it is the common practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A reporting assistant that pulls approved data, drafts audience-specific narratives with source links, flags changes since last week and routes drafts to the manager | chosen | Meets the run-window envelope at $0.111 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to produce reports) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Chat as source.
- Evaluation trap: One report for all.
- Data conflicts: two systems disagree.
- Sensitive issue: a dispute should not appear.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
