# Private 5G Network & Slice Provisioning: use-case brief

> Generated from the blueprint `telecom/private-5g-network-slice-provisioning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Private 5G Network & Slice Provisioning · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Turn an enterprise request for a private 5G network or slice into a validated design, resource allocation and activation plan so business customers are live in days, not months. The system has to run interactively, within a few seconds, inside these limits: Design output restricted to approved reference architectures, Resource commitments checked against live capacity and Human engineer approves every customer-facing commitment.

**Why it is hard.** The obvious approach is a request such as fast and reliable, and it fails because vague needs produce designs that miss the SLA. The second trap is in "Capacity": the real signal is live capacity and spectrum headroom, while teams usually reach for static planning sheets.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 2 at peak, at an estimated $20.5K a month. A mistake is expensive in the way quotes revised after delivery measures it.

**What success looks like.** Offline: Design feasibility agreement with engineer review, Capacity check accuracy and Plan completeness. Online: Request to activation time, Quotes revised after delivery and Customer SLA attainment. The launch is judged on "Request to activation time" while "Quotes revised after delivery" must not get worse.

## Objective, loss and constraints

**Business objective.** Turn an enterprise request for a private 5G network or slice into a validated design, resource allocation and activation plan so business customers are live in days, not months.

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

- Design output restricted to approved reference architectures
- Resource commitments checked against live capacity
- Human engineer approves every customer-facing commitment
- Spectrum and licence rules enforced
- Plan generated within 5 minutes of a completed request

## The approach in one paragraph

Start with a design questionnaire and spreadsheet sizing by a solutions engineer, because it is the current process and shows how long it takes. Then earn the move to an agent that gathers requirements into a typed profile, selects an approved reference design, checks feasibility with simulation and capacity tools, drafts the plan and bill of materials, and hands it to an engineer for approval, and only if it beats the baseline on Design feasibility agreement with engineer review and Capacity check accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Target service profile | Required latency, throughput and reliability. Chooses the slice type. Guard against: must be machine-readable. |
| Add Coverage and site fit | Predicted indoor and outdoor coverage at the site. Feasibility. Guard against: needs a site survey input. |
| Add Available capacity | Free radio and core resources in the area. Limits the offer. Guard against: live not planned. |
| Run it as one pipeline | Requirements capture (structured intake and chat), Profile validation (schema checks), Design selection (reference architecture catalogue), Feasibility and capacity (simulation tools), Plan and quote draft (LLM with templates), Engineer approval (review console) and Activation orchestration (orchestrator). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle unrealistic requirement | Flag as infeasible with the nearest feasible profile. |

**Deliberately not doing**

- Customer company size alone: not a technical need.
- Sales region: not a design driver.
- Quote length: an artefact.

**How the approach is proven**

Prove it offline on Design feasibility agreement with engineer review, Capacity check accuracy and Plan completeness using time-ordered splits, then online on "Request to activation time" with "Quotes revised after delivery" as the guardrail. Watch for: Letting the model quote without review, Using planned instead of live capacity and Free-text requirements.

## Baseline and production design

- **Baseline (build this first):** A design questionnaire and spreadsheet sizing by a solutions engineer, because it is the current process and shows how long it takes.
- **Production design:** An agent that gathers requirements into a typed profile, selects an approved reference design, checks feasibility with simulation and capacity tools, drafts the plan and bill of materials, and hands it to an engineer for approval.

## Why AI, and why this kind

**Why AI.** Turn an enterprise request for a private 5G network or slice into a validated design, resource allocation and activation plan so business customers are live in days, not months. The evidence that separates good from bad outcomes (Target service profile, Coverage and site fit, Available capacity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A request such as fast and reliable" are what teams reach for first, and they fail because vague needs produce designs that miss the SLA. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: An agent that gathers requirements into a typed profile, selects an approved reference design, checks feasibility with simulation and capacity tools, drafts the plan and bill of materials, and hands it to an engineer for approval.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Target service profile, Coverage and site fit, Available capacity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A design questionnaire and spreadsheet sizing by a solutions engineer, because it is the current process and shows how long it takes | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An agent that gathers requirements into a typed profile, selects an approved reference design, checks feasibility with simulation and capacity tools, drafts the plan and bill of materials, and hands it to an engineer for approval | chosen | Meets the 2500 ms envelope at $22.79 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Request to activation time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Letting the model quote without review.
- Evaluation trap: Using planned instead of live capacity.
- Unrealistic requirement: latency target beyond physics.
- Coverage uncertainty: indoor propagation is unknown.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
