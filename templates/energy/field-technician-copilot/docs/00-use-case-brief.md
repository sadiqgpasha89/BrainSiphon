# Field Technician Copilot: use-case brief

> Generated from the blueprint `energy/field-technician-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Field Technician Copilot · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer technician questions on site about equipment, procedures and safety steps from controlled manuals and past work orders, in the technician's language, without altering any record. The system has to run interactively, within a few seconds, inside these limits: Safety steps shown verbatim from controlled documents, The assistant cannot issue a switching or isolation instruction and Works with intermittent connectivity.

**Why it is hard.** The obvious approach is model memory, and it fails because a wrong step can injure someone. The second trap is in "Safety": the real signal is verbatim safety steps, while teams usually reach for paraphrase.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $210.5K a month. A mistake is expensive in the way first-time fix rate measures it.

**What success looks like.** Offline: Answer faithfulness on audited questions, Retrieval accuracy and Verbatim step accuracy. Online: Calls to the helpdesk, First-time fix rate and Time to find a procedure. The launch is judged on "Calls to the helpdesk" while "First-time fix rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer technician questions on site about equipment, procedures and safety steps from controlled manuals and past work orders, in the technician's language, without altering any record.

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

- Safety steps shown verbatim from controlled documents
- The assistant cannot issue a switching or isolation instruction
- Works with intermittent connectivity
- Citations with revision numbers
- Answer within 4 s

## The approach in one paragraph

Start with paper manuals and a search box on the document site, because they are the current tools. Then earn the move to an offline-capable retrieval assistant with asset context, verbatim safety steps, photo and voice input and a feedback path to document owners, and only if it beats the baseline on Answer faithfulness on audited questions and Retrieval accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Equipment identification | Asset type and model. Retrieves the right manual. Guard against: from the work order. |
| Add Document revision | Current or superseded. Prevents old steps. Guard against: from document control. |
| Add Question intent | Procedure, parts or history. Routing. Guard against: classified. |
| Run it as one pipeline | Question intake (mobile app), Asset context (work order lookup), Retrieval (hybrid search), Answer with citation (LLM with controlled content) and Safety step insertion (document store), with Feedback to owners and Usage review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle no connectivity | Cached manuals and sync. |

**Deliberately not doing**

- Technician name: irrelevant.
- Device model: irrelevant.
- Time of day: irrelevant.

**How the approach is proven**

Prove it offline on Answer faithfulness on audited questions, Retrieval accuracy and Verbatim step accuracy using time-ordered splits, then online on "Calls to the helpdesk" with "First-time fix rate" as the guardrail. Watch for: Paraphrased safety steps, Missing revision control and Open-domain chat.

## Baseline and production design

- **Baseline (build this first):** Paper manuals and a search box on the document site, because they are the current tools.
- **Production design:** An offline-capable retrieval assistant with asset context, verbatim safety steps, photo and voice input and a feedback path to document owners.

## Why AI, and why this kind

**Why AI.** Answer technician questions on site about equipment, procedures and safety steps from controlled manuals and past work orders, in the technician's language, without altering any record. The evidence that separates good from bad outcomes (Equipment identification, Document revision, Question intent) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory" are what teams reach for first, and they fail because A wrong step can injure someone. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: An offline-capable retrieval assistant with asset context, verbatim safety steps, photo and voice input and a feedback path to document owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Equipment identification, Document revision, Question intent and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Paper manuals and a search box on the document site, because they are the current tools | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An offline-capable retrieval assistant with asset context, verbatim safety steps, photo and voice input and a feedback path to document owners | chosen | Meets the 2500 ms envelope at $4.68 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Calls to the helpdesk) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Paraphrased safety steps.
- Evaluation trap: Missing revision control.
- No connectivity: the technician is underground.
- Outdated manual: the cache holds an old revision.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
