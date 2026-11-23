# Engineering Change Impact Agent: use-case brief

> Generated from the blueprint `manufacturing/engineering-change-impact-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Engineering Change Impact Agent · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** For an engineering change request, find the affected parts, assemblies, routings, suppliers and open orders, and draft an impact assessment so change boards decide faster. The system has to run interactively, within a few seconds, inside these limits: Impacted items come from the PLM and ERP structure not from text guesses, The agent has read-only access and The board approves the change.

**Why it is hard.** The obvious approach is keyword search on part names, and it fails because names miss indirect impacts. The second trap is in "Scope": the real signal is direct and indirect impacts with the reason, while teams usually reach for a flat list.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.9K a month. A mistake is expensive in the way post-release change surprises measures it.

**What success looks like.** Offline: Impacted item recall on audited changes, Cost estimate error and Assessment faithfulness. Online: Time to assess a change, Post-release change surprises and Obsolete stock created. The launch is judged on "Time to assess a change" while "Post-release change surprises" must not get worse.

## Objective, loss and constraints

**Business objective.** For an engineering change request, find the affected parts, assemblies, routings, suppliers and open orders, and draft an impact assessment so change boards decide faster.

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

- Impacted items come from the PLM and ERP structure not from text guesses
- The agent has read-only access
- The board approves the change
- Impact assessment within 10 minutes
- 3K change requests per month

## The approach in one paragraph

Start with a manual where-used report by engineers with a checklist, because it is the standard practice. Then earn the move to a graph query agent that expands where-used across PLM and ERP, estimates stock, order, supplier and qualification impacts and drafts the board paper with citations, and only if it beats the baseline on Impacted item recall on audited changes and Cost estimate error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Where-used depth | Number of assemblies and products using the part. Breadth of impact. Guard against: from the BOM. |
| Add Open order and stock exposure | Stock and open orders of old versions. Cost. Guard against: from ERP. |
| Add Supplier and tooling dependency | Tooling and supplier changes needed. Lead time. Guard against: from purchasing. |
| Run it as one pipeline | Change request intake (PLM), Structure expansion (graph queries), Impact enrichment (ERP and purchasing tools), Risk and cost estimate (rules and model), Draft assessment (LLM with citations) and Decision capture (PLM), with Board review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle incomplete structure data | State the gap and request a data fix. |

**Deliberately not doing**

- Requester name: irrelevant.
- Change title wording: not impact.
- Attachment names: irrelevant.

**How the approach is proven**

Prove it offline on Impacted item recall on audited changes, Cost estimate error and Assessment faithfulness using time-ordered splits, then online on "Time to assess a change" with "Post-release change surprises" as the guardrail. Watch for: Keyword search for impact, Flat impact lists and Ignoring effectivity.

## Baseline and production design

- **Baseline (build this first):** A manual where-used report by engineers with a checklist, because it is the standard practice.
- **Production design:** A graph query agent that expands where-used across PLM and ERP, estimates stock, order, supplier and qualification impacts and drafts the board paper with citations.

## Why AI, and why this kind

**Why AI.** For an engineering change request, find the affected parts, assemblies, routings, suppliers and open orders, and draft an impact assessment so change boards decide faster. The evidence that separates good from bad outcomes (Where-used depth, Open order and stock exposure, Supplier and tooling dependency) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "keyword search on part names" are what teams reach for first, and they fail because names miss indirect impacts. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A graph query agent that expands where-used across PLM and ERP, estimates stock, order, supplier and qualification impacts and drafts the board paper with citations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Where-used depth, Open order and stock exposure, Supplier and tooling dependency and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A manual where-used report by engineers with a checklist, because it is the standard practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A graph query agent that expands where-used across PLM and ERP, estimates stock, order, supplier and qualification impacts and drafts the board paper with citations | chosen | Meets the 2500 ms envelope at $5.10 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to assess a change) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Keyword search for impact.
- Evaluation trap: Flat impact lists.
- Incomplete structure data: where-used misses some products.
- Phased changes: effectivity dates differ.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
