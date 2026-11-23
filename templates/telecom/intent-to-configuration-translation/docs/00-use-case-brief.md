# Intent-to-Configuration Translation: use-case brief

> Generated from the blueprint `telecom/intent-to-configuration-translation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Intent-to-Configuration Translation · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Translate an engineer's plain-language network intent into validated vendor configuration through a typed intermediate model, so routine changes are faster and never skip validation. The system has to run interactively, within a few seconds, inside these limits: The model produces an intent record never raw device commands, Configuration rendered by deterministic templates and checked by a validator and Human approval before any push to the live network.

**Why it is hard.** The obvious approach is free text turned straight into commands, and it fails because free text can hide a destructive command. The second trap is in "Validation": the real signal is syntax, policy and simulation checks before approval, while teams usually reach for a reviewer reading the diff alone.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $23.7K a month. A mistake is expensive in the way post-change defects measures it.

**What success looks like.** Offline: Intent extraction accuracy on reviewed requests, Validator catch rate on seeded bad intents and Dry-run diff correctness. Online: Lead time for routine changes, Post-change defects and Share of changes through the typed path. The launch is judged on "Lead time for routine changes" while "Post-change defects" must not get worse.

## Objective, loss and constraints

**Business objective.** Translate an engineer's plain-language network intent into validated vendor configuration through a typed intermediate model, so routine changes are faster and never skip validation.

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

- The model produces an intent record never raw device commands
- Configuration rendered by deterministic templates and checked by a validator
- Human approval before any push to the live network
- Dry-run diff available within 15 s

## The approach in one paragraph

Start with a form-based change builder with fixed fields per template, because it gives the safest path and a baseline for time saved. Then earn the move to a planner that extracts a typed intent from the request, template rendering and policy validation in code, a digital-twin test and an approval step, with the model never touching device credentials, and only if it beats the baseline on Intent extraction accuracy on reviewed requests and Validator catch rate on seeded bad intents after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Schema conformance | Whether the intent fits the typed schema without free-form fields. Gate against bad output. Guard against: schema versions with the platform. |
| Add Policy check result | Pass or fail of the guardrail rules for the target. Blocks unsafe intents. Guard against: rules owned by network security. |
| Add Diff size | Lines of configuration changed against running config. Reviewer effort and risk. Guard against: compute against live state. |
| Run it as one pipeline | Request intake (chat or ticket), Intent extraction (LLM with schema output), Schema and policy validation (rule engine), Config rendering (deterministic templates), Twin simulation (network digital twin) and Approval and push (orchestrator), with Audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle ambiguous request | Ask a clarifying question before any rendering. |

**Deliberately not doing**

- Engineer writing style: not intent.
- Time of request: weak link.
- Prompt length: an input artefact.

**How the approach is proven**

Prove it offline on Intent extraction accuracy on reviewed requests, Validator catch rate on seeded bad intents and Dry-run diff correctness using time-ordered splits, then online on "Lead time for routine changes" with "Post-change defects" as the guardrail. Watch for: Letting the model write commands, Skipping the twin and Measuring speed without defect rate.

## Baseline and production design

- **Baseline (build this first):** A form-based change builder with fixed fields per template, because it gives the safest path and a baseline for time saved.
- **Production design:** A planner that extracts a typed intent from the request, template rendering and policy validation in code, a digital-twin test and an approval step, with the model never touching device credentials.

## Why AI, and why this kind

**Why AI.** Translate an engineer's plain-language network intent into validated vendor configuration through a typed intermediate model, so routine changes are faster and never skip validation. The evidence that separates good from bad outcomes (Schema conformance, Policy check result, Diff size) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free text turned straight into commands" are what teams reach for first, and they fail because free text can hide a destructive command. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A planner that extracts a typed intent from the request, template rendering and policy validation in code, a digital-twin test and an approval step, with the model never touching device credentials.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Schema conformance, Policy check result, Diff size and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A form-based change builder with fixed fields per template, because it gives the safest path and a baseline for time saved | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A planner that extracts a typed intent from the request, template rendering and policy validation in code, a digital-twin test and an approval step, with the model never touching device credentials | chosen | Meets the 2500 ms envelope at $5.26 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Lead time for routine changes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Letting the model write commands.
- Evaluation trap: Skipping the twin.
- Ambiguous request: two plausible targets.
- Intent outside the schema: request needs a new template.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
