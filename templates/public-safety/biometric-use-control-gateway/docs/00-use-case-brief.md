# Biometric Use Control Gateway: use-case brief

> Generated from the blueprint `public-safety/biometric-use-control-gateway` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Biometric Use Control Gateway · **Domain:** public-safety · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Enforce the agency policy on biometric tools by blocking face recognition and similar identification in all analytics and agents, logging any attempted use and routing approved exceptions to named legal approvers. The system has to run in under 100 milliseconds, inside these limits: Policy enforced at the gateway outside any model, Face identification is blocked by default and Exceptions need a legal approval recorded.

**Why it is hard.** The obvious approach is developer guidelines, and it fails because guidelines can be ignored. The second trap is in "Scope": the real signal is all analytics, agents and vendor tools, while teams usually reach for only internal systems.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.7K a month. A mistake is expensive in the way exceptions approved measures it.

**What success looks like.** Offline: Policy test coverage, Block rate on seeded identification calls and Latency at p99. Online: Blocked attempts, Exceptions approved and Time to approve valid requests. The launch is judged on "Blocked attempts" while "Exceptions approved" must not get worse.

## Objective, loss and constraints

**Business objective.** Enforce the agency policy on biometric tools by blocking face recognition and similar identification in all analytics and agents, logging any attempted use and routing approved exceptions to named legal approvers.

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

- Policy enforced at the gateway outside any model
- Face identification is blocked by default
- Exceptions need a legal approval recorded
- Every attempt logged
- Decision within 50 ms

## The approach in one paragraph

Start with policy documents and annual compliance reviews, because they are the usual controls. Then earn the move to a policy gateway that classifies requests, blocks identification calls by default, records exceptions with approvals and reports attempts to the oversight board, and only if it beats the baseline on Policy test coverage and Block rate on seeded identification calls after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Request type | Identification, detection or counting. Policy rule. Guard against: from the request. |
| Add Data type | Face, voice, gait or other biometric. Policy rule. Guard against: from the catalogue. |
| Add Approval record | Legal approval id. Exception. Guard against: from the policy store. |
| Run it as one pipeline | Request interception (API gateway), Request classification (rules and model), Policy decision (policy as code), Block or route to approval (gateway) and Immutable log (append-only store), with Anomaly review and Board report off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle vendor embedded feature | Contract and gateway block. |

**Deliberately not doing**

- Developer name: irrelevant.
- Request wording: not policy.
- Team size: irrelevant.

**How the approach is proven**

Prove it offline on Policy test coverage, Block rate on seeded identification calls and Latency at p99 using time-ordered splits, then online on "Blocked attempts" with "Exceptions approved" as the guardrail. Watch for: Guidelines only, Internal-only scope and No logs of attempts.

## Baseline and production design

- **Baseline (build this first):** Policy documents and annual compliance reviews, because they are the usual controls.
- **Production design:** A policy gateway that classifies requests, blocks identification calls by default, records exceptions with approvals and reports attempts to the oversight board.

## Why AI, and why this kind

**Why AI.** Enforce the agency policy on biometric tools by blocking face recognition and similar identification in all analytics and agents, logging any attempted use and routing approved exceptions to named legal approvers. The evidence that separates good from bad outcomes (Request type, Data type, Approval record) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "developer guidelines" are what teams reach for first, and they fail because guidelines can be ignored. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A policy gateway that classifies requests, blocks identification calls by default, records exceptions with approvals and reports attempts to the oversight board.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Request type, Data type, Approval record and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Policy documents and annual compliance reviews, because they are the usual controls | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A policy gateway that classifies requests, blocks identification calls by default, records exceptions with approvals and reports attempts to the oversight board | chosen | Meets the 80 ms envelope at $5.08 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Blocked attempts) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Guidelines only.
- Evaluation trap: Internal-only scope.
- Vendor embedded feature: a tool includes identification.
- Misclassification: a counting call looks like identification.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
