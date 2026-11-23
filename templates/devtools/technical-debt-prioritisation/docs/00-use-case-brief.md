# Technical Debt Prioritisation: use-case brief

> Generated from the blueprint `devtools/technical-debt-prioritisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Technical Debt Prioritisation · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Combine code metrics, incident history and change frequency to rank debt items by expected cost of delay so teams fix what hurts most, with the engineers deciding the plan. The system has to run as a scheduled batch job, inside these limits: Each item shows its evidence, Cost estimates with ranges and Teams decide the roadmap.

**Why it is hard.** The obvious approach is code smell counts, and it fails because counts do not show business cost. The second trap is in "Evidence": the real signal is linked incidents and change data, while teams usually reach for a debt score.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.9K a month. A mistake is expensive in the way change failure rate measures it.

**What success looks like.** Offline: Agreement with team-led rankings, Cost estimate error and Incident reduction after fixes. Online: Incidents tied to known debt, Change failure rate and Time on rework. The launch is judged on "Incidents tied to known debt" while "Change failure rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Combine code metrics, incident history and change frequency to rank debt items by expected cost of delay so teams fix what hurts most, with the engineers deciding the plan.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Each item shows its evidence
- Cost estimates with ranges
- Teams decide the roadmap
- Quarterly run for 5K services

## The approach in one paragraph

Start with static analysis tools' debt scores and ad hoc team lists, because they are the typical approach. Then earn the move to a ranking of debt items with cost of delay estimates, linked evidence and a proposed fix size, presented to team leads for roadmap planning, and only if it beats the baseline on Agreement with team-led rankings and Cost estimate error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Churn and change failure | Changes per month and failure rate. Cost. Guard against: from version control and CI. |
| Add Incident links | Incidents tied to the code. Cost. Guard against: from the incident tracker. |
| Add Complexity and test coverage | Complexity and coverage. Fragility. Guard against: from analysis. |
| Run it as one pipeline | Metrics and incident data (engineering systems), Evidence join (service catalogue), Cost model (regression), Ranking (rules and model), Ticket creation (issue tracker) and Outcome tracking (quarterly), with Team review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle hidden coupling | Dependency-aware costs. |

**Deliberately not doing**

- Developer name: personal data.
- Repository age alone: weak link.
- File count: weak link.

**How the approach is proven**

Prove it offline on Agreement with team-led rankings, Cost estimate error and Incident reduction after fixes using time-ordered splits, then online on "Incidents tied to known debt" with "Change failure rate" as the guardrail. Watch for: Smell counts as value, Central mandates and Debt scores without evidence.

## Baseline and production design

- **Baseline (build this first):** Static analysis tools' debt scores and ad hoc team lists, because they are the typical approach.
- **Production design:** A ranking of debt items with cost of delay estimates, linked evidence and a proposed fix size, presented to team leads for roadmap planning.

## Why AI, and why this kind

**Why AI.** Combine code metrics, incident history and change frequency to rank debt items by expected cost of delay so teams fix what hurts most, with the engineers deciding the plan. The evidence that separates good from bad outcomes (Churn and change failure, Incident links, Complexity and test coverage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "code smell counts" are what teams reach for first, and they fail because counts do not show business cost. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A ranking of debt items with cost of delay estimates, linked evidence and a proposed fix size, presented to team leads for roadmap planning.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Churn and change failure, Incident links, Complexity and test coverage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static analysis tools' debt scores and ad hoc team lists, because they are the typical approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A ranking of debt items with cost of delay estimates, linked evidence and a proposed fix size, presented to team leads for roadmap planning | chosen | Meets the run-window envelope at $0.105 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Incidents tied to known debt) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Smell counts as value.
- Evaluation trap: Central mandates.
- Hidden coupling: debt in one service hurts another.
- Incident noise: incidents have other causes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
