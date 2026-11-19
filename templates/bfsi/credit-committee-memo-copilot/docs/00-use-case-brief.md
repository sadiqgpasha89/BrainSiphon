# Credit Committee Memo Drafting Copilot: use-case brief

> Generated from the blueprint `bfsi/credit-committee-memo-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Credit Committee Memo Drafting Copilot · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Draft the credit memo for a corporate facility from the bank's own sources, with every number and claim cited, so analysts spend their time on judgment. The system has to run interactively, within a few seconds, inside these limits: Every figure and claim cites an internal source, No external data not licensed for credit use and The analyst signs the memo and owns it.

**Why it is hard.** The obvious approach is fluent narrative from the model's general knowledge, and it fails because fluent unsupported text passes casual review and fails at committee. The second trap is in "Numbers": the real signal is figures pulled from the spreading system through typed tools, while teams usually reach for numbers typed from model memory.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $642.4K a month. A mistake is expensive in the way committee rework requests per memo measures it.

**What success looks like.** Offline: Citation validity rate and Figure exact-match rate. Online: Analyst hours per memo and Committee rework requests per memo. The launch is judged on "Analyst hours per memo" while "Committee rework requests per memo" must not get worse.

## Objective, loss and constraints

**Business objective.** Draft the credit memo for a corporate facility from the bank's own sources, with every number and claim cited, so analysts spend their time on judgment.

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

- Every figure and claim cites an internal source
- No external data not licensed for credit use
- The analyst signs the memo and owns it
- Prompts, retrievals and drafts retained for model risk review

## The approach in one paragraph

Start with a fixed memo template filled by analysts from the spreading system, because it is the current process and defines the quality bar. Then earn the move to planner-executor agent with typed read tools on the spreading system, document store and news feed, retrieval over prior memos and policy, a citation verifier and an analyst approval step, and only if it beats the baseline on Citation validity rate and Figure exact-match rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Citation coverage | Share of sentences with at least one valid source link. Unsupported sentences are the main risk. Guard against: links must be checked against the retrieved text, not just present. |
| Add Figure match rate | Share of numbers in the draft equal to the spreading system value. Numbers must be exact. Guard against: rounding rules differ by section. |
| Add Section completeness | Required template sections filled versus required. Committees reject incomplete memos. Guard against: a filled section can still be empty of substance. |
| Run it as one pipeline | Request intake (workflow tool), Source retriever (hybrid search over filings and prior memos), Figure tool (typed API on the spreading system), Memo drafter (LLM with structured output) and Citation verifier (entailment checker plus number matcher), with Analyst review and Memo audit store off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle contradictory sources | Show both with dates and ask the analyst to resolve instead of choosing silently. |

**Deliberately not doing**

- Draft length: longer drafts are not better, committees prefer concise memos.
- Model self-reported confidence: not calibrated for factual correctness.
- Style similarity to old memos: copies old weaknesses along with the form.

**How the approach is proven**

Prove it offline on Citation validity rate and Figure exact-match rate using time-ordered splits, then online on "Analyst hours per memo" with "Committee rework requests per memo" as the guardrail. Watch for: Evaluating on memos the retriever has seen inflates grounding and Edit distance rewards agreeable drafts.

## Baseline and production design

- **Baseline (build this first):** A fixed memo template filled by analysts from the spreading system, because it is the current process and defines the quality bar.
- **Production design:** Planner-executor agent with typed read tools on the spreading system, document store and news feed, retrieval over prior memos and policy, a citation verifier and an analyst approval step.

## Why AI, and why this kind

**Why AI.** Draft the credit memo for a corporate facility from the bank's own sources, with every number and claim cited, so analysts spend their time on judgment. The evidence that separates good from bad outcomes (Citation coverage, Figure match rate, Section completeness) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fluent narrative from the model's general knowledge" are what teams reach for first, and they fail because fluent unsupported text passes casual review and fails at committee. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Planner-executor agent with typed read tools on the spreading system, document store and news feed, retrieval over prior memos and policy, a citation verifier and an analyst approval step.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Citation coverage, Figure match rate, Section completeness and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A fixed memo template filled by analysts from the spreading system, because it is the current process and defines the quality bar | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Planner-executor agent with typed read tools on the spreading system, document store and news feed, retrieval over prior memos and policy, a citation verifier and an analyst approval step | chosen | Meets the 2500 ms envelope at $23.79 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Analyst hours per memo) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on memos the retriever has seen inflates grounding.
- Evaluation trap: Edit distance rewards agreeable drafts.
- Contradictory sources: filings and management accounts disagree.
- Confidential deal information: memo includes data from a restricted side of the bank.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
