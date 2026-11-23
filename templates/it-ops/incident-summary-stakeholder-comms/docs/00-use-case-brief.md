# Incident Summary and Stakeholder Communication: use-case brief

> Generated from the blueprint `it-ops/incident-summary-stakeholder-comms` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Incident Summary and Stakeholder Communication · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Draft status updates and executive summaries from the incident timeline in plain language for the communications lead to review and send on a fixed cadence. The system has to run interactively, within a few seconds, inside these limits: The communications lead approves every external update, Updates cite the timeline entries and Update drafted within 2 minutes of a request.

**Why it is hard.** The obvious approach is chat speculation, and it fails because early theories are often wrong. The second trap is in "Audience": the real signal is separate technical, executive and customer versions, while teams usually reach for one message.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.7K a month. A mistake is expensive in the way update cadence adherence measures it.

**What success looks like.** Offline: Fact faithfulness, Unconfirmed claim detection and Editor change rate. Online: Time to first update, Update cadence adherence and Customer complaints about communication. The launch is judged on "Time to first update" while "Update cadence adherence" must not get worse.

## Objective, loss and constraints

**Business objective.** Draft status updates and executive summaries from the incident timeline in plain language for the communications lead to review and send on a fixed cadence.

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

- The communications lead approves every external update
- Updates cite the timeline entries
- Update drafted within 2 minutes of a request
- No unconfirmed causes stated as fact
- 5K incident updates per year

## The approach in one paragraph

Start with incident commanders writing updates by hand during the incident, because it is the usual practice. Then earn the move to a drafting assistant that builds audience-specific updates from confirmed timeline entries, flags unconfirmed statements and queues drafts for the communications lead, and only if it beats the baseline on Fact faithfulness and Unconfirmed claim detection after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Timeline events | Confirmed actions and findings. Content. Guard against: from the incident record. |
| Add Impact scope | Affected services and customers. Content. Guard against: from monitoring. |
| Add Severity and status | Severity and phase. Tone and cadence. Guard against: from the ITSM record. |
| Run it as one pipeline | Update request (incident channel), Timeline and impact retrieval (ITSM and monitoring), Draft by audience (LLM with citations), Unconfirmed claim check (rules), Publication (status page) and Update log (record store), with Lead review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle conflicting facts | List the conflict and ask the commander. |

**Deliberately not doing**

- Responder name: personal data.
- Chat length: weak link.
- Time of day: irrelevant.

**How the approach is proven**

Prove it offline on Fact faithfulness, Unconfirmed claim detection and Editor change rate using time-ordered splits, then online on "Time to first update" with "Update cadence adherence" as the guardrail. Watch for: Posting without approval, Speculation as fact and One message for all readers.

## Baseline and production design

- **Baseline (build this first):** Incident commanders writing updates by hand during the incident, because it is the usual practice.
- **Production design:** A drafting assistant that builds audience-specific updates from confirmed timeline entries, flags unconfirmed statements and queues drafts for the communications lead.

## Why AI, and why this kind

**Why AI.** Draft status updates and executive summaries from the incident timeline in plain language for the communications lead to review and send on a fixed cadence. The evidence that separates good from bad outcomes (Timeline events, Impact scope, Severity and status) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "chat speculation" are what teams reach for first, and they fail because early theories are often wrong. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A drafting assistant that builds audience-specific updates from confirmed timeline entries, flags unconfirmed statements and queues drafts for the communications lead.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Timeline events, Impact scope, Severity and status and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Incident commanders writing updates by hand during the incident, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A drafting assistant that builds audience-specific updates from confirmed timeline entries, flags unconfirmed statements and queues drafts for the communications lead | chosen | Meets the 2500 ms envelope at $5.08 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to first update) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Posting without approval.
- Evaluation trap: Speculation as fact.
- Conflicting facts: sources disagree on impact.
- Sensitive detail: a security incident should not be described.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
