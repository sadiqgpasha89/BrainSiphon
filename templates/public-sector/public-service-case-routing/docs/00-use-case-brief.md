# Public Service Case Routing and Priority: use-case brief

> Generated from the blueprint `public-sector/public-service-case-routing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Service Case Routing and Priority · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Route incoming cases to the right team and flag those at risk of missing a legal deadline, so staff time goes to the urgent and complex. The system has to run interactively, within a few seconds, inside these limits: Routing and deadline flags only, Statutory deadlines tracked in rules not in a model and Staff can reassign.

**Why it is hard.** The obvious approach is fastest closure, and it fails because fast closure can mean a worse decision. The second trap is in "Deadline": the real signal is rule-based legal clocks, while teams usually reach for model-predicted urgency.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $12.3K a month. A mistake is expensive in the way reassignments measures it.

**What success looks like.** Offline: First-assignment accuracy, Deadline breach recall and Waiting time gap across groups. Online: Cases past their deadline, Reassignments and Waiting time parity. The launch is judged on "Cases past their deadline" while "Reassignments" must not get worse.

## Objective, loss and constraints

**Business objective.** Route incoming cases to the right team and flag those at risk of missing a legal deadline, so staff time goes to the urgent and complex.

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

- Routing and deadline flags only
- Statutory deadlines tracked in rules not in a model
- Staff can reassign
- Fairness of waiting times monitored
- 1M cases per year

## The approach in one paragraph

Start with first-in first-out queues by case type, because they are the standard process. Then earn the move to a routing model with deadline rules, workload balancing and a parity monitor on waiting times, reviewed by team leads, and only if it beats the baseline on First-assignment accuracy and Deadline breach recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Case type and complexity indicators | Type, parties and documents. Routing. Guard against: from intake. |
| Add Days to statutory deadline | Time left to a legal limit. Priority. Guard against: from rules. |
| Add Team capacity and skills | Open load and specialisms. Feasibility. Guard against: from the team system. |
| Run it as one pipeline | Feature build (case and capacity joins), Routing model (classifier), Deadline rules (rule engine), Assignment (workflow) and Parity and outcome monitoring (monthly), with Case intake and Team lead review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new rule | Versioned rules. |

**Deliberately not doing**

- Applicant name: irrelevant and private.
- Submission channel: weak link.
- Staff name: irrelevant.

**How the approach is proven**

Prove it offline on First-assignment accuracy, Deadline breach recall and Waiting time gap across groups using time-ordered splits, then online on "Cases past their deadline" with "Reassignments" as the guardrail. Watch for: Model-set legal deadlines, Shortest-first queues and No parity monitoring.

## Baseline and production design

- **Baseline (build this first):** First-in first-out queues by case type, because they are the standard process.
- **Production design:** A routing model with deadline rules, workload balancing and a parity monitor on waiting times, reviewed by team leads.

## Why AI, and why this kind

**Why AI.** Route incoming cases to the right team and flag those at risk of missing a legal deadline, so staff time goes to the urgent and complex. The evidence that separates good from bad outcomes (Case type and complexity indicators, Days to statutory deadline, Team capacity and skills) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fastest closure" are what teams reach for first, and they fail because fast closure can mean a worse decision. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A routing model with deadline rules, workload balancing and a parity monitor on waiting times, reviewed by team leads.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Case type and complexity indicators, Days to statutory deadline, Team capacity and skills and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: First-in first-out queues by case type, because they are the standard process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A routing model with deadline rules, workload balancing and a parity monitor on waiting times, reviewed by team leads | chosen | Meets the 2500 ms envelope at $0.455 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cases past their deadline) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Model-set legal deadlines.
- Evaluation trap: Shortest-first queues.
- New rule: a law changes the deadline.
- Skill gap: no team has the skill.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
