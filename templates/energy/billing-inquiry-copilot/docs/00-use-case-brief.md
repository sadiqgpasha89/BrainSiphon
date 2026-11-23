# Billing Inquiry Copilot: use-case brief

> Generated from the blueprint `energy/billing-inquiry-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Billing Inquiry Copilot · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Help contact centre agents explain bills, tariffs and adjustments by retrieving the customer's own billing facts and the controlled policy, with every figure computed by tools. The system has to run interactively, within a few seconds, inside these limits: Answers use the customer's verified account and controlled policy text, Figures computed by tools and The copilot cannot change an account.

**Why it is hard.** The obvious approach is model memory, and it fails because wrong amounts cause complaints and compensation. The second trap is in "Policy": the real signal is controlled policy and regulator rules, while teams usually reach for general knowledge.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $20.5K a month. A mistake is expensive in the way first-contact resolution measures it.

**What success looks like.** Offline: Figure accuracy on audited cases, Citation coverage and Policy faithfulness. Online: Handle time, First-contact resolution and Billing complaints escalated. The launch is judged on "Handle time" while "First-contact resolution" must not get worse.

## Objective, loss and constraints

**Business objective.** Help contact centre agents explain bills, tariffs and adjustments by retrieving the customer's own billing facts and the controlled policy, with every figure computed by tools.

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

- Answers use the customer's verified account and controlled policy text
- Figures computed by tools
- The copilot cannot change an account
- Agent confirms before any promise to the customer
- Response within 4 s

## The approach in one paragraph

Start with agents searching the billing screens and policy wiki by hand, because it is how the work is done today. Then earn the move to a retrieval and calculation assistant that drafts explanations with citations to bill lines and policy sections, with a review step and a log for quality teams, and only if it beats the baseline on Figure accuracy on audited cases and Citation coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Identity verification state | Whether the customer is verified. Access gate. Guard against: from the contact system. |
| Add Bill line items | Charges, credits and estimates. Evidence. Guard against: from billing. |
| Add Tariff and policy version | The rule version that applies. Correct answer. Guard against: from the policy store. |
| Run it as one pipeline | Inquiry intake (contact centre tool), Identity check (authentication), Billing retrieval (governed APIs), Policy retrieval (knowledge index), Explanation draft (LLM with citations) and Quality sampling (weekly), with Agent review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle unverified caller | Block account data and offer the verification path. |

**Deliberately not doing**

- Agent name: irrelevant.
- Call length: not correctness.
- Chat tone: not facts.

**How the approach is proven**

Prove it offline on Figure accuracy on audited cases, Citation coverage and Policy faithfulness using time-ordered splits, then online on "Handle time" with "First-contact resolution" as the guardrail. Watch for: Model-computed amounts, Account changes by the copilot and Answers with no policy version.

## Baseline and production design

- **Baseline (build this first):** Agents searching the billing screens and policy wiki by hand, because it is how the work is done today.
- **Production design:** A retrieval and calculation assistant that drafts explanations with citations to bill lines and policy sections, with a review step and a log for quality teams.

## Why AI, and why this kind

**Why AI.** Help contact centre agents explain bills, tariffs and adjustments by retrieving the customer's own billing facts and the controlled policy, with every figure computed by tools. The evidence that separates good from bad outcomes (Identity verification state, Bill line items, Tariff and policy version) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory" are what teams reach for first, and they fail because wrong amounts cause complaints and compensation. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A retrieval and calculation assistant that drafts explanations with citations to bill lines and policy sections, with a review step and a log for quality teams.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Identity verification state, Bill line items, Tariff and policy version and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Agents searching the billing screens and policy wiki by hand, because it is how the work is done today | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval and calculation assistant that drafts explanations with citations to bill lines and policy sections, with a review step and a log for quality teams | chosen | Meets the 2500 ms envelope at $11.40 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Handle time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Model-computed amounts.
- Evaluation trap: Account changes by the copilot.
- Unverified caller: identity is not confirmed.
- Policy change: the rule changed last week.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
