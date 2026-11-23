# Control Room Operator Copilot: use-case brief

> Generated from the blueprint `energy/control-room-operator-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Control Room Operator Copilot · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Help control-room operators find procedures, similar past events and switching sheets during an incident by answering from controlled documents and giving the evidence, without issuing or preparing live commands. The system has to run interactively, within a few seconds, inside these limits: Answers come from controlled procedures with revision numbers, The copilot cannot reach any control system and Switching steps shown verbatim never paraphrased.

**Why it is hard.** The obvious approach is model memory, and it fails because a wrong step can cause an outage or injury. The second trap is in "Scope": the real signal is information and recall, while teams usually reach for operational commands.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.9K a month. A mistake is expensive in the way operator escalations for lookups measures it.

**What success looks like.** Offline: Answer faithfulness on audited questions, Retrieval accuracy and Verbatim step accuracy. Online: Time to find a procedure, Operator escalations for lookups and Procedure gaps found. The launch is judged on "Time to find a procedure" while "Operator escalations for lookups" must not get worse.

## Objective, loss and constraints

**Business objective.** Help control-room operators find procedures, similar past events and switching sheets during an incident by answering from controlled documents and giving the evidence, without issuing or preparing live commands.

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

- Answers come from controlled procedures with revision numbers
- The copilot cannot reach any control system
- Switching steps shown verbatim never paraphrased
- Every answer cites its source
- Answer within 5 s

## The approach in one paragraph

Start with keyword search over the procedure library and a shared drive, because that is what operators use now. Then earn the move to a retrieval-grounded assistant over controlled procedures and event history with verbatim switching sheets, revision checks and no connection to control systems, plus a feedback loop to procedure owners, and only if it beats the baseline on Answer faithfulness on audited questions and Retrieval accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Procedure revision status | Whether the document is current. Prevents old steps. Guard against: from document control. |
| Add Event similarity | Similarity to past incidents. Useful context. Guard against: embedding and metadata. |
| Add Question intent | Procedure, equipment data or history. Routing. Guard against: classified. |
| Run it as one pipeline | Question intake (operator console), Role and context check (identity), Hybrid retrieval (procedure index), Answer with citation (LLM with controlled content) and Verbatim step insertion (document store), with Feedback to owners and Usage review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle superseded procedure | Revision checks and cache expiry. |

**Deliberately not doing**

- Operator name: irrelevant.
- Time of day: irrelevant.
- Console model: irrelevant.

**How the approach is proven**

Prove it offline on Answer faithfulness on audited questions, Retrieval accuracy and Verbatim step accuracy using time-ordered splits, then online on "Time to find a procedure" with "Operator escalations for lookups" as the guardrail. Watch for: Paraphrasing switching steps, Any link to control systems and Answers without revision control.

## Baseline and production design

- **Baseline (build this first):** Keyword search over the procedure library and a shared drive, because that is what operators use now.
- **Production design:** A retrieval-grounded assistant over controlled procedures and event history with verbatim switching sheets, revision checks and no connection to control systems, plus a feedback loop to procedure owners.

## Why AI, and why this kind

**Why AI.** Help control-room operators find procedures, similar past events and switching sheets during an incident by answering from controlled documents and giving the evidence, without issuing or preparing live commands. The evidence that separates good from bad outcomes (Procedure revision status, Event similarity, Question intent) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory" are what teams reach for first, and they fail because A wrong step can cause an outage or injury. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A retrieval-grounded assistant over controlled procedures and event history with verbatim switching sheets, revision checks and no connection to control systems, plus a feedback loop to procedure owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Procedure revision status, Event similarity, Question intent and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword search over the procedure library and a shared drive, because that is what operators use now | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval-grounded assistant over controlled procedures and event history with verbatim switching sheets, revision checks and no connection to control systems, plus a feedback loop to procedure owners | chosen | Meets the 2500 ms envelope at $5.10 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to find a procedure) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Paraphrasing switching steps.
- Evaluation trap: Any link to control systems.
- Superseded procedure: an old document is cached.
- Ambiguous equipment name: two substations share a name.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
