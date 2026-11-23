# Incident Situation Report Agent: use-case brief

> Generated from the blueprint `public-safety/incident-situation-report-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Incident Situation Report Agent · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Compile situation reports for incident commanders from radio logs, dispatch events, field reports and maps, with every statement linked to its source and the time. The system has to run interactively, within a few seconds, inside these limits: Every statement cites a source and time, The agent cannot send orders or alerts and Commanders approve before sharing outside.

**Why it is hard.** The obvious approach is model inference, and it fails because commanders need facts not guesses. The second trap is in "Role": the real signal is compilation and summary, while teams usually reach for decision making.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.9K a month. A mistake is expensive in the way commander corrections measures it.

**What success looks like.** Offline: Statement faithfulness to sources, Omission of critical events and Conflict detection. Online: Time to produce a sitrep, Commander corrections and Briefing accuracy. The launch is judged on "Time to produce a sitrep" while "Commander corrections" must not get worse.

## Objective, loss and constraints

**Business objective.** Compile situation reports for incident commanders from radio logs, dispatch events, field reports and maps, with every statement linked to its source and the time.

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

- Every statement cites a source and time
- The agent cannot send orders or alerts
- Commanders approve before sharing outside
- Report refresh every 10 minutes
- 50 concurrent incidents

## The approach in one paragraph

Start with a human scribe compiling a situation report from radio and phone updates, because it is the current practice. Then earn the move to a retrieval and summarisation agent that builds a time-stamped sitrep with citations and conflict flags and offers it for the commander to edit and approve, and only if it beats the baseline on Statement faithfulness to sources and Omission of critical events after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Event timeline | Ordered events with times. Spine. Guard against: from CAD. |
| Add Resource status | Units and assets by status. Context. Guard against: from CAD. |
| Add Hazard and map layers | Hazard extent and closures. Context. Guard against: from GIS. |
| Run it as one pipeline | Entity and time extraction (NLP), Conflict check (rules), Draft sitrep (LLM with citations) and Distribution (approved channels), with Event and report intake, Commander review and After-action review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle conflicting reports | Show both with times. |

**Deliberately not doing**

- Author name: irrelevant.
- Report length: weak link.
- Formatting: an artefact.

**How the approach is proven**

Prove it offline on Statement faithfulness to sources, Omission of critical events and Conflict detection using time-ordered splits, then online on "Time to produce a sitrep" with "Commander corrections" as the guardrail. Watch for: Uncited statements, Agent-issued orders and Single snapshots.

## Baseline and production design

- **Baseline (build this first):** A human scribe compiling a situation report from radio and phone updates, because it is the current practice.
- **Production design:** A retrieval and summarisation agent that builds a time-stamped sitrep with citations and conflict flags and offers it for the commander to edit and approve.

## Why AI, and why this kind

**Why AI.** Compile situation reports for incident commanders from radio logs, dispatch events, field reports and maps, with every statement linked to its source and the time. The evidence that separates good from bad outcomes (Event timeline, Resource status, Hazard and map layers) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model inference" are what teams reach for first, and they fail because commanders need facts not guesses. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A retrieval and summarisation agent that builds a time-stamped sitrep with citations and conflict flags and offers it for the commander to edit and approve.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Event timeline, Resource status, Hazard and map layers and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A human scribe compiling a situation report from radio and phone updates, because it is the current practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval and summarisation agent that builds a time-stamped sitrep with citations and conflict flags and offers it for the commander to edit and approve | chosen | Meets the 2500 ms envelope at $5.10 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to produce a sitrep) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Uncited statements.
- Evaluation trap: Agent-issued orders.
- Conflicting reports: two sources disagree.
- Radio outage: field updates stop arriving.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
