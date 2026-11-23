# Order Fallout Resolution Agent: use-case brief

> Generated from the blueprint `telecom/order-fallout-resolution-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Order Fallout Resolution Agent · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Diagnose a fallout order from system errors and order history, apply approved low-risk fixes and prepare a complete handoff for the rest, so human fallout handlers focus on hard cases. The system has to run interactively, within a few seconds, inside these limits: Fixes restricted to an approved catalogue such as resubmit, correct address format or re-trigger a step, Anything that changes price, contract or customer data needs a human and Every fix recorded with before and after state.

**Why it is hard.** The obvious approach is the agent's own guess at the cause, and it fails because guessing wastes handler time. The second trap is in "Fix class": the real signal is reversible fixes with known results, while teams usually reach for open-ended edits.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.8K a month. A mistake is expensive in the way handler time per order measures it.

**What success looks like.** Offline: Fix correctness against handler review, Verified success rate and Handoff completeness rating. Online: Share of fallout resolved without a person, Handler time per order and Repeat fallout. The launch is judged on "Share of fallout resolved without a person" while "Handler time per order" must not get worse.

## Objective, loss and constraints

**Business objective.** Diagnose a fallout order from system errors and order history, apply approved low-risk fixes and prepare a complete handoff for the rest, so human fallout handlers focus on hard cases.

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

- Fixes restricted to an approved catalogue such as resubmit, correct address format or re-trigger a step
- Anything that changes price, contract or customer data needs a human
- Every fix recorded with before and after state
- Triage within 30 s of fallout

## The approach in one paragraph

Start with a rules table mapping error codes to a standard fix or queue, because it is the existing practice and sets the straight-through target. Then earn the move to a tool-using agent with read access to order and system logs and a write catalogue of approved fixes, with a post-fix verification step and a structured handoff to handlers, and only if it beats the baseline on Fix correctness against handler review and Verified success rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Error code and message pattern | Normalised code and text from the failing system. Names the cause. Guard against: maintain a code map per system. |
| Add Past fix success rate | Success rate of each fix for this error class. Chooses the fix. Guard against: only count verified outcomes. |
| Add Order state graph position | The step and dependencies around the failure. Scope of the repair. Guard against: live state. |
| Run it as one pipeline | Fallout event intake (order system), Error classification (rules and LLM), Evidence gathering (read-only tools), Fix selection (agent with a fix catalogue), Fix execution (orchestrator tools), Verification (order state check) and Handoff note (case system). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle unknown error | Escalate with all evidence and add to the code map. |

**Deliberately not doing**

- Handler name: irrelevant.
- Order age alone: not a cause.
- Message sentiment: no link.

**How the approach is proven**

Prove it offline on Fix correctness against handler review, Verified success rate and Handoff completeness rating using time-ordered splits, then online on "Share of fallout resolved without a person" with "Handler time per order" as the guardrail. Watch for: Counting closed tickets as fixed, Open-ended write access and No cap on retries.

## Baseline and production design

- **Baseline (build this first):** A rules table mapping error codes to a standard fix or queue, because it is the existing practice and sets the straight-through target.
- **Production design:** A tool-using agent with read access to order and system logs and a write catalogue of approved fixes, with a post-fix verification step and a structured handoff to handlers.

## Why AI, and why this kind

**Why AI.** Diagnose a fallout order from system errors and order history, apply approved low-risk fixes and prepare a complete handoff for the rest, so human fallout handlers focus on hard cases. The evidence that separates good from bad outcomes (Error code and message pattern, Past fix success rate, Order state graph position) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the agent's own guess at the cause" are what teams reach for first, and they fail because guessing wastes handler time. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A tool-using agent with read access to order and system logs and a write catalogue of approved fixes, with a post-fix verification step and a structured handoff to handlers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Error code and message pattern, Past fix success rate, Order state graph position and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A rules table mapping error codes to a standard fix or queue, because it is the existing practice and sets the straight-through target | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A tool-using agent with read access to order and system logs and a write catalogue of approved fixes, with a post-fix verification step and a structured handoff to handlers | chosen | Meets the 2500 ms envelope at $5.09 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Share of fallout resolved without a person) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Counting closed tickets as fixed.
- Evaluation trap: Open-ended write access.
- Unknown error: no mapped class.
- Fix succeeds but hides a deeper cause: the order falls out again.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
