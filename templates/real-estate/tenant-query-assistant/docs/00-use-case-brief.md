# Property Manager Assistant for Tenant Queries: use-case brief

> Generated from the blueprint `real-estate/tenant-query-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Property Manager Assistant for Tenant Queries · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer tenants' questions about leases, rules, payments and repairs from the manager's documents and systems and escalate what needs a person. The system has to run interactively, within a few seconds, inside these limits: Every answer cites the lease clause or policy it comes from, No legal advice is given and Account and payment data are shown only to the verified tenant.

**Why it is hard.** The obvious approach is the model's general knowledge of tenancy, and it fails because general rules differ by place and lease, and a wrong rule causes disputes. The second trap is in "Identity": the real signal is context verified for this tenant and this unit, while teams usually reach for open access to any account on request.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $791.1K a month. A mistake is expensive in the way response time measures it.

**What success looks like.** Offline: Citation validity and Escalation F1. Online: Deflection rate and Response time. The launch is judged on "Deflection rate" while "Response time" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer tenants' questions about leases, rules, payments and repairs from the manager's documents and systems and escalate what needs a person.

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

- Every answer cites the lease clause or policy it comes from
- No legal advice is given
- Account and payment data are shown only to the verified tenant
- Disputes and complaints are escalated to a person

## The approach in one paragraph

Start with fAQ page and an inbox, because it is the current process. Then earn the move to retrieval over leases and policies, typed tools for balance and tickets, verifier and escalation, and only if it beats the baseline on Citation validity and Escalation F1 after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Citation validity | Share of answers whose cited clause actually supports the statement. The core measure of trustworthy answers. Guard against: a citation can exist and still not support the claim, so check entailment. |
| Add Escalation precision | Share of escalations that a manager agrees needed a person. Shows whether the assistant escalates the right cases. Guard against: over-refusal hurts resolution, so track both. |
| Add Resolution rate | Share of conversations solved without a person and not reopened in 7 days. The value delivered. Guard against: a resolved flag without a reopening check overstates success. |
| Run it as one pipeline | Message intake (app and chat), Identity resolver (auth), Retriever (hybrid search), Typed tools (ledger and tickets), Answer composer (LLM) and Verifier (entailment), with Escalation off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle legal threat | Detect legal threats and escalate to a manager with no automated reply. |

**Deliberately not doing**

- Message length: Style of the tenant and not the difficulty of the query.
- Emoji: A style marker with no link to the right answer.
- Time sent: Weakly related to the topic or urgency.

**How the approach is proven**

Prove it offline on Citation validity and Escalation F1 using time-ordered splits, then online on "Deflection rate" with "Response time" as the guardrail. Watch for: A test set of easy, common questions hides failures on unusual ones and Lease variants between buildings mean a test on one lease overstates accuracy on others.

## Baseline and production design

- **Baseline (build this first):** FAQ page and an inbox, because it is the current process.
- **Production design:** Retrieval over leases and policies, typed tools for balance and tickets, verifier and escalation.

## Why AI, and why this kind

**Why AI.** Answer tenants' questions about leases, rules, payments and repairs from the manager's documents and systems and escalate what needs a person. The evidence that separates good from bad outcomes (Citation validity, Escalation precision, Resolution rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the model's general knowledge of tenancy" are what teams reach for first, and they fail because general rules differ by place and lease, and a wrong rule causes disputes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Retrieval over leases and policies, typed tools for balance and tickets, verifier and escalation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Citation validity, Escalation precision, Resolution rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: FAQ page and an inbox, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Retrieval over leases and policies, typed tools for balance and tickets, verifier and escalation | chosen | Meets the 2500 ms envelope at $8.79 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Deflection rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: A test set of easy, common questions hides failures on unusual ones.
- Evaluation trap: Lease variants between buildings mean a test on one lease overstates accuracy on others.
- Legal threat: a tenant writes about a legal dispute and the assistant tries to answer.
- Wrong unit: the question concerns a different unit from the one the tenant is verified for.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
