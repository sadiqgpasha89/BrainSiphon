# Customer Service Ticket Routing & Draft Replies: use-case brief

> Generated from the blueprint `retail/customer-service-ticket-routing-and-response` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Customer Service Ticket Routing & Draft Replies · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Route tickets to the right queue, detect urgency and draft policy-correct replies so agents resolve contacts faster. The system has to run interactively, within a few seconds, inside these limits: Policy-accurate refunds, PII masked and Agent final approval.

**Why it is hard.** The obvious approach is text-only classification, and it fails because intent depends on the order's state (shipped, delivered). The second trap is in "Replies": the real signal is policy-grounded drafts with order data, while teams usually reach for generic empathetic text.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $93.1K a month. A mistake is expensive in the way first-contact resolution measures it.

**What success looks like.** Offline: Routing accuracy and Draft acceptance without edit. Online: Handle time and First-contact resolution. The launch is judged on "Handle time" while "First-contact resolution" must not get worse.

## Objective, loss and constraints

**Business objective.** Route tickets to the right queue, detect urgency and draft policy-correct replies so agents resolve contacts faster.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{route}}+\lambda\left(-\sum_t\log p_\theta(y_t\mid y_{<t},x)\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{route}} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| x | The input features describing one example (what the model sees). |

**Hard constraints**

- Policy-accurate refunds
- PII masked
- Agent final approval
- p95 under 4 s

## The approach in one paragraph

Start with keyword routing and macro responses. Then earn the move to fine-tuned intent router with order-context features and an LLM drafting layer grounded on policy retrieval and order APIs with agent approval, and only if it beats the baseline on Routing accuracy and Draft acceptance without edit after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Order-state context | Status, delivery, refund eligibility. Determines resolution. Guard against: fetch live. |
| Add Urgency indicators | Repeat contacts, SLA age, sentiment. Priority. Guard against: contact graph. |
| Add Policy match | Retrieved policy clause for the intent. Correctness. Guard against: version control of policies. |
| Run it as one pipeline | Ticket intake (helpdesk webhook), Context enrichment (order APIs), Intent and urgency model (fine-tuned encoder), Policy retriever (hybrid search) and Reply drafter (LLM), with Agent review and Resolution feedback off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle refund policy changes mid-week | Policy versioning and retrieval by effective date. |

**Deliberately not doing**

- Ticket subject length: no signal.
- Customer greeting style: cosmetic.

**How the approach is proven**

Prove it offline on Routing accuracy and Draft acceptance without edit using time-ordered splits, then online on "Handle time" with "First-contact resolution" as the guardrail. Watch for: Measuring CSAT from biased respondents and Drafts judged without policy check.

## Baseline and production design

- **Baseline (build this first):** Keyword routing and macro responses.
- **Production design:** Fine-tuned intent router with order-context features and an LLM drafting layer grounded on policy retrieval and order APIs with agent approval.

## Why AI, and why this kind

**Why AI.** Route tickets to the right queue, detect urgency and draft policy-correct replies so agents resolve contacts faster. The evidence that separates good from bad outcomes (Order-state context, Urgency indicators, Policy match) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "text-only classification" are what teams reach for first, and they fail because intent depends on the order's state (shipped, delivered). Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Fine-tuned intent router with order-context features and an LLM drafting layer grounded on policy retrieval and order APIs with agent approval.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Order-state context, Urgency indicators, Policy match and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword routing and macro responses | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Fine-tuned intent router with order-context features and an LLM drafting layer grounded on policy retrieval and order APIs with agent approval | chosen | Meets the 2500 ms envelope at $3.45 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Handle time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Measuring CSAT from biased respondents.
- Evaluation trap: Drafts judged without policy check.
- Refund policy changes mid-week: drafts cite old rules.
- Abusive customer messages: model mirrors tone.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
