# Banking Customer Support Assistant: use-case brief

> Generated from the blueprint `fintech/customer-support-chatbot-banking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Banking Customer Support Assistant · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Resolve 60% of banking support contacts end-to-end with a safe assistant, handing over complex or risky intents to humans with full context. The system has to run interactively, within a few seconds, inside these limits: Never state balances without authentication, PII redaction before the model and Regulatory disclosure wording.

**Why it is hard.** The obvious approach is always answering, and it fails because wrong confident answers on money matters create liability. The second trap is in "Actions": the real signal is tool calls with confirmation for state-changing actions, while teams usually reach for free-text promises to fix things.

**Scale and stakes.** At 10 million users this is about 4.5M model-touching events a day, 52 requests per second on average and 313 at peak, at an estimated $535.1K a month. A mistake is expensive in the way escalation quality measures it.

**What success looks like.** Offline: Resolution accuracy on golden conversations and Policy-violation rate. Online: Containment with CSAT parity and Escalation quality. The launch is judged on "Containment with CSAT parity" while "Escalation quality" must not get worse.

## Objective, loss and constraints

**Business objective.** Resolve 60% of banking support contacts end-to-end with a safe assistant, handing over complex or risky intents to humans with full context.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x,\text{KB})+\lambda\,\mathrm{PolicyViolation}`

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
| x | The customer's question. |
| \text{KB} | The knowledge base of approved banking information the chatbot answers from. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{PolicyViolation} | Penalty for answers that break banking policy or give prohibited advice. |

**Hard constraints**

- Never state balances without authentication
- PII redaction before the model
- Regulatory disclosure wording
- p95 under 4 s

## The approach in one paragraph

Start with intent classifier with FAQ retrieval and canned answers. Then earn the move to router plus RAG assistant on a mid-size LLM with authenticated tool calls (balance, card block), policy filter and handoff packager, and only if it beats the baseline on Resolution accuracy on golden conversations and Policy-violation rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Intent confidence margin | Gap between top-2 intent probabilities. Abstain or clarify when ambiguous. Guard against: calibrate on production traffic. |
| Add Auth level of session | Verified level at the time of the request. Gates which tools are allowed. Guard against: re-check on every tool call. |
| Add Knowledge freshness | Document last-updated date in citation. Stale policy answers. Guard against: index with effective dates. |
| Run it as one pipeline | Chat gateway (websocket service), Redaction layer (PII detector), Intent router (fine-tuned classifier), RAG assistant (LLM with tools), Policy and disclosure check (guardrail), Agent handoff (human takeover) and Conversation analytics (eval pipeline). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle customer asks to dispute a transaction | Dispute intents routed to deterministic flow, not generation. |

**Deliberately not doing**

- Chat length: not a quality signal.
- Thumbs-up rate alone: biased toward fast replies, not correct ones.

**How the approach is proven**

Prove it offline on Resolution accuracy on golden conversations and Policy-violation rate using time-ordered splits, then online on "Containment with CSAT parity" with "Escalation quality" as the guardrail. Watch for: Containment counts abandoned chats as resolved and Golden set drawn only from easy intents.

## Baseline and production design

- **Baseline (build this first):** Intent classifier with FAQ retrieval and canned answers.
- **Production design:** Router plus RAG assistant on a mid-size LLM with authenticated tool calls (balance, card block), policy filter and handoff packager.

## Why AI, and why this kind

**Why AI.** Resolve 60% of banking support contacts end-to-end with a safe assistant, handing over complex or risky intents to humans with full context. The evidence that separates good from bad outcomes (Intent confidence margin, Auth level of session, Knowledge freshness) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "always answering" are what teams reach for first, and they fail because wrong confident answers on money matters create liability. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Router plus RAG assistant on a mid-size LLM with authenticated tool calls (balance, card block), policy filter and handoff packager.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Intent confidence margin, Auth level of session, Knowledge freshness and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Intent classifier with FAQ retrieval and canned answers | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Router plus RAG assistant on a mid-size LLM with authenticated tool calls (balance, card block), policy filter and handoff packager | chosen | Meets the 2500 ms envelope at $3.96 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Containment with CSAT parity) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Containment counts abandoned chats as resolved.
- Evaluation trap: Golden set drawn only from easy intents.
- Customer asks to dispute a transaction: model offers wrong process.
- Outage causes ticket surge: lLM costs spike and queue grows.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
