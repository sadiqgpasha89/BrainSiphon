# Quality Escape Root-Cause Agent: use-case brief

> Generated from the blueprint `manufacturing/quality-escape-root-cause-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Quality Escape Root-Cause Agent · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** When a defect reaches a customer or a late test, trace the affected lots through genealogy, line data and supplier records, rank likely causes and draft the containment and corrective action plan for the quality engineer. The system has to run interactively, within a few seconds, inside these limits: Containment lists generated from genealogy data and verified by an engineer, The agent has read-only access to plant systems and Hold actions require quality approval.

**Why it is hard.** The obvious approach is a guessed date range, and it fails because a wide guess ships good parts to scrap and a narrow one ships bad parts to customers. The second trap is in "Cause": the real signal is evidence from process, material and tool data, while teams usually reach for a plausible story from the complaint text.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $23.8K a month. A mistake is expensive in the way parts shipped after a known issue measures it.

**What success looks like.** Offline: Containment recall on audited escapes, Cause ranking accuracy against confirmed root causes and Citation faithfulness. Online: Time to containment, Parts shipped after a known issue and Escape recurrence. The launch is judged on "Time to containment" while "Parts shipped after a known issue" must not get worse.

## Objective, loss and constraints

**Business objective.** When a defect reaches a customer or a late test, trace the affected lots through genealogy, line data and supplier records, rank likely causes and draft the containment and corrective action plan for the quality engineer.

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

- Containment lists generated from genealogy data and verified by an engineer
- The agent has read-only access to plant systems
- Hold actions require quality approval
- Every cause is linked to its evidence
- First report within 30 minutes of a complaint

## The approach in one paragraph

Start with a manual eight-discipline report built by quality engineers from MES queries, because it is the current practice and the time benchmark. Then earn the move to an agent with read-only tools for genealogy, process data and supplier records that builds the affected-lot set, ranks cause hypotheses with citations and drafts the containment and corrective-action plan for approval, and only if it beats the baseline on Containment recall on audited escapes and Cause ranking accuracy against confirmed root causes after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Genealogy coverage | Lots linked to the suspect part, material or tool. Defines containment. Guard against: needs complete traceability. |
| Add Process excursion overlap | Alarms and excursions on the affected lots. Cause evidence. Guard against: align by lot and station. |
| Add Supplier lot association | Incoming material lots shared by affected parts. Material cause. Guard against: join by lot. |
| Run it as one pipeline | Complaint intake (quality system), Genealogy trace (MES read tool), Process and supplier evidence (read-only tools), Hypothesis ranking (agent with evidence citations), Containment draft (LLM with templates), Engineer approval (quality console) and Action tracking (corrective action system). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle incomplete genealogy | State the gap and propose a wider containment option. |

**Deliberately not doing**

- Complaint wording: emotional language is not evidence.
- Customer size: not a cause.
- Complaint channel: an artefact.

**How the approach is proven**

Prove it offline on Containment recall on audited escapes, Cause ranking accuracy against confirmed root causes and Citation faithfulness using time-ordered splits, then online on "Time to containment" with "Parts shipped after a known issue" as the guardrail. Watch for: Guessing the affected lots, Giving the agent hold authority and Trusting a plausible story without evidence.

## Baseline and production design

- **Baseline (build this first):** A manual eight-discipline report built by quality engineers from MES queries, because it is the current practice and the time benchmark.
- **Production design:** An agent with read-only tools for genealogy, process data and supplier records that builds the affected-lot set, ranks cause hypotheses with citations and drafts the containment and corrective-action plan for approval.

## Why AI, and why this kind

**Why AI.** When a defect reaches a customer or a late test, trace the affected lots through genealogy, line data and supplier records, rank likely causes and draft the containment and corrective action plan for the quality engineer. The evidence that separates good from bad outcomes (Genealogy coverage, Process excursion overlap, Supplier lot association) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A guessed date range" are what teams reach for first, and they fail because A wide guess ships good parts to scrap and a narrow one ships bad parts to customers. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: An agent with read-only tools for genealogy, process data and supplier records that builds the affected-lot set, ranks cause hypotheses with citations and drafts the containment and corrective-action plan for approval.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Genealogy coverage, Process excursion overlap, Supplier lot association and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A manual eight-discipline report built by quality engineers from MES queries, because it is the current practice and the time benchmark | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An agent with read-only tools for genealogy, process data and supplier records that builds the affected-lot set, ranks cause hypotheses with citations and drafts the containment and corrective-action plan for approval | chosen | Meets the 2500 ms envelope at $5.28 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to containment) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Guessing the affected lots.
- Evaluation trap: Giving the agent hold authority.
- Incomplete genealogy: some lots cannot be linked.
- Multiple causes: two independent excursions overlap.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
