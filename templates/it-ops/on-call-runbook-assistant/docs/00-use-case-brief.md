# On-Call Runbook Assistant: use-case brief

> Generated from the blueprint `it-ops/on-call-runbook-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** On-Call Runbook Assistant · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find the right runbook for an alert, summarise the steps in context and answer questions during an incident, with links to the source and no actions taken without approval. The system has to run interactively, within a few seconds, inside these limits: Answers cite the runbook version and section, Runbook steps shown, not executed and Retrieval within 3 s.

**Why it is hard.** The obvious approach is model memory, and it fails because procedures change. The second trap is in "Role": the real signal is guide the responder, while teams usually reach for execute steps.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $87.0K a month. A mistake is expensive in the way escalations from missing procedures measures it.

**What success looks like.** Offline: Retrieval accuracy, Answer faithfulness and Stale runbook detection. Online: Time to find a runbook, Escalations from missing procedures and Runbook coverage. The launch is judged on "Time to find a runbook" while "Escalations from missing procedures" must not get worse.

## Objective, loss and constraints

**Business objective.** Find the right runbook for an alert, summarise the steps in context and answer questions during an incident, with links to the source and no actions taken without approval.

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

- Answers cite the runbook version and section
- Runbook steps shown, not executed
- Retrieval within 3 s
- Stale runbooks flagged
- 100K runbook pages

## The approach in one paragraph

Start with searching a wiki by keywords during the incident, because it is the current method. Then earn the move to a retrieval assistant over versioned runbooks with alert-based lookup, condition checks and freshness warnings that feeds back missing or wrong steps to owners, and only if it beats the baseline on Retrieval accuracy and Answer faithfulness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Alert and service match | Runbooks linked to the alert. Retrieval. Guard against: from the catalogue. |
| Add Runbook freshness | Last review date. Trust. Guard against: from the doc system. |
| Add Step applicability | Environment and version conditions. Filtering. Guard against: from runbook metadata. |
| Run it as one pipeline | Alert context (alert pipeline), Runbook retrieval (hybrid search), Applicability filter (metadata rules), Step summary with links (LLM with citations) and Responder questions (chat), with Gap report to owner and Freshness review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle no runbook | Escalate and suggest a new runbook draft. |

**Deliberately not doing**

- Responder name: personal data.
- Page length: weak link.
- Chat history length: weak link.

**How the approach is proven**

Prove it offline on Retrieval accuracy, Answer faithfulness and Stale runbook detection using time-ordered splits, then online on "Time to find a runbook" with "Escalations from missing procedures" as the guardrail. Watch for: Model memory of procedures, Execution without approval and Unversioned runbooks.

## Baseline and production design

- **Baseline (build this first):** Searching a wiki by keywords during the incident, because it is the current method.
- **Production design:** A retrieval assistant over versioned runbooks with alert-based lookup, condition checks and freshness warnings that feeds back missing or wrong steps to owners.

## Why AI, and why this kind

**Why AI.** Find the right runbook for an alert, summarise the steps in context and answer questions during an incident, with links to the source and no actions taken without approval. The evidence that separates good from bad outcomes (Alert and service match, Runbook freshness, Step applicability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory" are what teams reach for first, and they fail because procedures change. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A retrieval assistant over versioned runbooks with alert-based lookup, condition checks and freshness warnings that feeds back missing or wrong steps to owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Alert and service match, Runbook freshness, Step applicability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Searching a wiki by keywords during the incident, because it is the current method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval assistant over versioned runbooks with alert-based lookup, condition checks and freshness warnings that feeds back missing or wrong steps to owners | chosen | Meets the 2500 ms envelope at $4.83 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to find a runbook) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Model memory of procedures.
- Evaluation trap: Execution without approval.
- No runbook: the alert has no linked procedure.
- Conflicting runbooks: two runbooks give different steps.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
