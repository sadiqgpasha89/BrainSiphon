# IT Helpdesk Chat Agent: use-case brief

> Generated from the blueprint `it-ops/it-helpdesk-chat-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** IT Helpdesk Chat Agent · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer common employee IT questions and guide troubleshooting from approved knowledge articles, creating a ticket with context and handing over to a human when the issue is not resolved. The system has to run interactively, within a few seconds, inside these limits: Answers cite knowledge articles, Identity verified before account actions and Handover to a human within 2 turns when unsure.

**Why it is hard.** The obvious approach is model memory, and it fails because procedures and policies change. The second trap is in "Role": the real signal is resolve common issues and escalate, while teams usually reach for resolve everything.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $128.2K a month. A mistake is expensive in the way ticket volume measures it.

**What success looks like.** Offline: Resolution accuracy, Answer faithfulness and Handover precision. Online: Chat resolution rate, Ticket volume and Employee satisfaction. The launch is judged on "Chat resolution rate" while "Ticket volume" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer common employee IT questions and guide troubleshooting from approved knowledge articles, creating a ticket with context and handing over to a human when the issue is not resolved.

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

- Answers cite knowledge articles
- Identity verified before account actions
- Handover to a human within 2 turns when unsure
- Personal data minimised in transcripts
- 200K chats per month

## The approach in one paragraph

Start with a static FAQ and a ticket form, because they are the common starting point. Then earn the move to a grounded chat agent with article retrieval, device context and guided steps that creates complete tickets and hands over with the transcript when unresolved, and only if it beats the baseline on Resolution accuracy and Answer faithfulness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Intent and category | What the employee needs. Routing. Guard against: from classification. |
| Add Article match | The best knowledge article. Grounding. Guard against: from retrieval. |
| Add Device and application context | Device type and software. Filtering. Guard against: from the asset record. |
| Run it as one pipeline | Chat intake (messaging channel), Identity check (SSO), Intent and retrieval (classifier and search), Guided answer (LLM with citations), Ticket on failure (ITSM) and Outcome survey (chat), with Human handover off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle ambiguous problem | Ask one clarifying question. |

**Deliberately not doing**

- Employee name: personal data.
- Chat length: weak link.
- Time of day: weak link.

**How the approach is proven**

Prove it offline on Resolution accuracy, Answer faithfulness and Handover precision using time-ordered splits, then online on "Chat resolution rate" with "Ticket volume" as the guardrail. Watch for: Closing by timeout, Answers without sources and Unverified account actions.

## Baseline and production design

- **Baseline (build this first):** A static FAQ and a ticket form, because they are the common starting point.
- **Production design:** A grounded chat agent with article retrieval, device context and guided steps that creates complete tickets and hands over with the transcript when unresolved.

## Why AI, and why this kind

**Why AI.** Answer common employee IT questions and guide troubleshooting from approved knowledge articles, creating a ticket with context and handing over to a human when the issue is not resolved. The evidence that separates good from bad outcomes (Intent and category, Article match, Device and application context) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory" are what teams reach for first, and they fail because procedures and policies change. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A grounded chat agent with article retrieval, device context and guided steps that creates complete tickets and hands over with the transcript when unresolved.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Intent and category, Article match, Device and application context and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A static FAQ and a ticket form, because they are the common starting point | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A grounded chat agent with article retrieval, device context and guided steps that creates complete tickets and hands over with the transcript when unresolved | chosen | Meets the 2500 ms envelope at $4.75 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Chat resolution rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Closing by timeout.
- Evaluation trap: Answers without sources.
- Ambiguous problem: the description fits several issues.
- Outdated article: the fix no longer works.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
