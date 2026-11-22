# Healthcare Contract Negotiation Intelligence: use-case brief

> Generated from the blueprint `healthcare/healthcare-contract-negotiation-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Negotiation Intelligence · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Prepare negotiation briefs using historical terms, approved playbooks, performance, spend, risk and alternative suppliers, giving negotiators evidence-based priorities, fallback positions and draft talking points. The system has to run interactively, within a few seconds, inside these limits: Negotiators and legal approve strategy, The system never fabricates market benchmarks and cites each figure to an approved source and Scenario analysis states its assumptions.

**Why it is hard.** The obvious approach is invented market rate, and it fails because a fabricated benchmark destroys credibility. The second trap is in "Positions": the real signal is fallbacks from the approved playbook, while teams usually reach for free-form positions.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 2 at peak, at an estimated $20.6K a month. A mistake is expensive in the way savings achieved versus brief targets measures it.

**What success looks like.** Offline: Citation precision and unsupported-benchmark rate, Brief usefulness rating by negotiators and Fallback-position accuracy against the playbook. Online: Negotiation preparation time, Savings achieved versus brief targets and Share of briefs with every figure cited. The launch is judged on "Negotiation preparation time" while "Savings achieved versus brief targets" must not get worse.

## Objective, loss and constraints

**Business objective.** Prepare negotiation briefs using historical terms, approved playbooks, performance, spend, risk and alternative suppliers, giving negotiators evidence-based priorities, fallback positions and draft talking points.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{brief inputs})+\lambda\,\mathrm{Calibration}`

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
| \text{brief inputs} | The retrieved contract, playbook, performance and approved benchmark material the brief must be grounded in. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Negotiators and legal approve strategy
- The system never fabricates market benchmarks and cites each figure to an approved source
- Scenario analysis states its assumptions
- Benchmarks are used only under licence and with comparability noted
- Documents are untrusted input
- Draft talking points are labelled as drafts

## The approach in one paragraph

Start with negotiators assemble briefs from past contracts and personal notes. Then earn the move to hybrid retrieval over contract, playbook and benchmark collections, structured analytics for leverage and performance, a scenario engine for trade-offs and an LLM that drafts the brief with citations and refuses to produce unsourced benchmarks, and only if it beats the baseline on Citation precision and unsupported-benchmark rate and Brief usefulness rating by negotiators after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Leverage indicators | Spend share, alternatives and switching cost. Determines bargaining strength. Guard against: latest verified data. |
| Add Performance record | Service level misses and incidents. Supports claims. Guard against: verified records. |
| Add Term deviation from portfolio norms | How far current terms differ from similar contracts. Shows where to push. Guard against: normalised terms. |
| Run it as one pipeline | Portfolio and benchmark intake (contract and warehouse extracts), Hybrid retriever (vector and keyword index), Leverage and performance analytics (warehouse queries), Scenario engine (trade-off simulator), Brief drafter with citations (LLM) and Citation and benchmark guard (citation verifier), with Negotiator and legal review and Outcome capture and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle no approved benchmark exists | Say so and recommend a data request. |

**Deliberately not doing**

- Negotiator seniority: not leverage.
- Supplier public statements: not evidence.
- Brief length: not value.

**How the approach is proven**

Prove it offline on Citation precision and unsupported-benchmark rate, Brief usefulness rating by negotiators and Fallback-position accuracy against the playbook using time-ordered splits, then online on "Negotiation preparation time" with "Savings achieved versus brief targets" as the guardrail. Watch for: Accepting fluent benchmarks without a source, Using stale playbooks and Recommending concessions.

## Baseline and production design

- **Baseline (build this first):** Negotiators assemble briefs from past contracts and personal notes.
- **Production design:** Hybrid retrieval over contract, playbook and benchmark collections, structured analytics for leverage and performance, a scenario engine for trade-offs and an LLM that drafts the brief with citations and refuses to produce unsourced benchmarks.

## Why AI, and why this kind

**Why AI.** Prepare negotiation briefs using historical terms, approved playbooks, performance, spend, risk and alternative suppliers, giving negotiators evidence-based priorities, fallback positions and draft talking points. The evidence that separates good from bad outcomes (Leverage indicators, Performance record, Term deviation from portfolio norms) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "invented market rate" are what teams reach for first, and they fail because A fabricated benchmark destroys credibility. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Hybrid retrieval over contract, playbook and benchmark collections, structured analytics for leverage and performance, a scenario engine for trade-offs and an LLM that drafts the brief with citations and refuses to produce unsourced benchmarks.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Leverage indicators, Performance record, Term deviation from portfolio norms and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Negotiators assemble briefs from past contracts and personal notes | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hybrid retrieval over contract, playbook and benchmark collections, structured analytics for leverage and performance, a scenario engine for trade-offs and an LLM that drafts the brief with citations and refuses to produce unsourced benchmarks | chosen | Meets the 2500 ms envelope at $22.86 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Negotiation preparation time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Accepting fluent benchmarks without a source.
- Evaluation trap: Using stale playbooks.
- No approved benchmark exists: the brief wants a number.
- Supplier changes terms mid-negotiation: the brief is stale.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
