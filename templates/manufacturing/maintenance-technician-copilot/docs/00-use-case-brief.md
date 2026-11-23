# Maintenance Technician Copilot: use-case brief

> Generated from the blueprint `manufacturing/maintenance-technician-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Maintenance Technician Copilot · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Give technicians grounded answers from manuals, work-order history and asset data on a phone or tablet, with step-by-step procedures and safety notes, so repairs are faster and more consistent. The system has to run interactively, within a few seconds, inside these limits: Every answer cites the manual page or work order, Safety lockout steps are always shown from the controlled source and The copilot cannot close work orders or change settings.

**Why it is hard.** The obvious approach is general model knowledge, and it fails because wrong torque or voltage values cause injuries. The second trap is in "Safety": the real signal is procedures retrieved from approved lockout documents, while teams usually reach for paraphrased safety steps.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $834.8K a month. A mistake is expensive in the way first-time fix rate measures it.

**What success looks like.** Offline: Citation faithfulness on audited answers, Retrieval hit rate for confirmed fixes and Safety step accuracy. Online: Mean time to repair, First-time fix rate and Expert escalations. The launch is judged on "Mean time to repair" while "First-time fix rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Give technicians grounded answers from manuals, work-order history and asset data on a phone or tablet, with step-by-step procedures and safety notes, so repairs are faster and more consistent.

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

- Every answer cites the manual page or work order
- Safety lockout steps are always shown from the controlled source
- The copilot cannot close work orders or change settings
- Works in poor connectivity with offline manuals
- Answer within 5 s

## The approach in one paragraph

Start with keyword search over manuals and work orders, because it measures how much retrieval alone helps. Then earn the move to a retrieval-grounded copilot with asset-aware search, cited step lists, controlled safety content, photo input for part identification and a feedback button that captures confirmed fixes, and only if it beats the baseline on Citation faithfulness on audited answers and Retrieval hit rate for confirmed fixes after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Asset model match | The exact asset model and revision. Retrieves the right manual. Guard against: from the CMMS. |
| Add Symptom similarity | Match to past work orders with the fix. Suggests precedent. Guard against: confirmed fixes only. |
| Add Manual revision date | Currency of the retrieved document. Avoids old procedures. Guard against: from document control. |
| Run it as one pipeline | Question and photo intake (mobile app), Asset resolution (CMMS lookup), Document and history retrieval (hybrid search), Grounded procedure (LLM with citations), Safety content injection (controlled source) and Fix capture (CMMS), with Technician feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle conflicting manuals | Prefer the latest and flag the conflict to document control. |

**Deliberately not doing**

- Technician chat style: not a diagnostic signal.
- Work-order age: not a fix signal.
- Photo resolution: an artefact.

**How the approach is proven**

Prove it offline on Citation faithfulness on audited answers, Retrieval hit rate for confirmed fixes and Safety step accuracy using time-ordered splits, then online on "Mean time to repair" with "First-time fix rate" as the guardrail. Watch for: Paraphrasing safety steps, No revision control and Learning from open tickets.

## Baseline and production design

- **Baseline (build this first):** Keyword search over manuals and work orders, because it measures how much retrieval alone helps.
- **Production design:** A retrieval-grounded copilot with asset-aware search, cited step lists, controlled safety content, photo input for part identification and a feedback button that captures confirmed fixes.

## Why AI, and why this kind

**Why AI.** Give technicians grounded answers from manuals, work-order history and asset data on a phone or tablet, with step-by-step procedures and safety notes, so repairs are faster and more consistent. The evidence that separates good from bad outcomes (Asset model match, Symptom similarity, Manual revision date) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "general model knowledge" are what teams reach for first, and they fail because wrong torque or voltage values cause injuries. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A retrieval-grounded copilot with asset-aware search, cited step lists, controlled safety content, photo input for part identification and a feedback button that captures confirmed fixes.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Asset model match, Symptom similarity, Manual revision date and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword search over manuals and work orders, because it measures how much retrieval alone helps | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval-grounded copilot with asset-aware search, cited step lists, controlled safety content, photo input for part identification and a feedback button that captures confirmed fixes | chosen | Meets the 2500 ms envelope at $4.64 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mean time to repair) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Paraphrasing safety steps.
- Evaluation trap: No revision control.
- Conflicting manuals: two revisions disagree.
- Missing manual: no document for the asset.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
