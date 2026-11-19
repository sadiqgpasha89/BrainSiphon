# Customer Support Agent Copilot: use-case brief

> Generated from the blueprint `saas/customer-support-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Customer Support Agent Copilot · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Draft grounded replies, summarise threads and surface relevant articles and past tickets so support agents resolve faster with consistent quality. The system has to run interactively, within a few seconds, inside these limits: Answers grounded in KB and account data, PII controls and Tone consistency.

**Why it is hard.** The obvious approach is model memory, and it fails because product details change monthly. The second trap is in "Control": the real signal is agent edits and approves, while teams usually reach for auto-send.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $74.2K a month. A mistake is expensive in the way first-contact resolution measures it.

**What success looks like.** Offline: Citation support rate and Draft acceptance without major edit. Online: Handle time and First-contact resolution. The launch is judged on "Handle time" while "First-contact resolution" must not get worse.

## Objective, loss and constraints

**Business objective.** Draft grounded replies, summarise threads and surface relevant articles and past tickets so support agents resolve faster with consistent quality.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{ticket,KB})+\lambda\,\mathrm{PolicyViolation}`

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
| \text{ticket,KB} | The customer's ticket and the knowledge-base articles. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{PolicyViolation} | Penalty when a suggested reply breaks support policy. |

**Hard constraints**

- Answers grounded in KB and account data
- PII controls
- Tone consistency
- Agent in control

## The approach in one paragraph

Start with macros and canned responses. Then earn the move to rAG drafting with account-context tools, citation verification, tone controls and agent feedback loop, and only if it beats the baseline on Citation support rate and Draft acceptance without major edit after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around KB citation coverage | Share of statements cited. Faithfulness. Guard against: verification. |
| Add Resolution similarity | Similar past ticket resolved with this answer. Precedent. Guard against: retrieval. |
| Add Agent edit distance | Edits to the draft. Quality. Guard against: logging. |
| Run it as one pipeline | Ticket thread (helpdesk), Context fetcher (account tools), Retriever (hybrid KB search), Draft LLM (grounded) and Citation and policy check (verifier), with Agent review and Edit and CSAT feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle product release changes behaviour | Release-triggered KB refresh and doc versioning. |

**Deliberately not doing**

- Ticket greeting text: cosmetic.
- Draft length: weak.

**How the approach is proven**

Prove it offline on Citation support rate and Draft acceptance without major edit using time-ordered splits, then online on "Handle time" with "First-contact resolution" as the guardrail. Watch for: Judging fluency; ignoring correctness and Using resolved tickets with wrong answers as truth.

## Baseline and production design

- **Baseline (build this first):** Macros and canned responses.
- **Production design:** RAG drafting with account-context tools, citation verification, tone controls and agent feedback loop.

## Why AI, and why this kind

**Why AI.** Draft grounded replies, summarise threads and surface relevant articles and past tickets so support agents resolve faster with consistent quality. The evidence that separates good from bad outcomes (KB citation coverage, Resolution similarity, Agent edit distance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory" are what teams reach for first, and they fail because product details change monthly. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: RAG drafting with account-context tools, citation verification, tone controls and agent feedback loop.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among KB citation coverage, Resolution similarity, Agent edit distance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Macros and canned responses | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| RAG drafting with account-context tools, citation verification, tone controls and agent feedback loop | chosen | Meets the 2500 ms envelope at $4.12 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Handle time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Judging fluency; ignoring correctness.
- Evaluation trap: Using resolved tickets with wrong answers as truth.
- Product release changes behaviour: drafts cite outdated docs.
- Prompt injection in customer email: draft follows attacker text.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
