# Project Risk Register Assistant: use-case brief

> Generated from the blueprint `engineering/project-risk-register-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Project Risk Register Assistant · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Suggest risks from project documents, past projects and lessons learned, check the register for gaps and duplicates and help owners write clear risks with causes, effects and actions. The system has to run interactively, within a few seconds, inside these limits: Owners confirm every risk, Suggestions cite their source and Duplicates flagged.

**Why it is hard.** The obvious approach is generic lists, and it fails because generic lists miss project risks. The second trap is in "Role": the real signal is suggest and check quality, while teams usually reach for set ratings.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.3K a month. A mistake is expensive in the way register quality measures it.

**What success looks like.** Offline: Suggestion acceptance, Duplicate detection and Coverage of audited risks. Online: Risks realised that were not in the register, Register quality and Workshop time. The launch is judged on "Risks realised that were not in the register" while "Register quality" must not get worse.

## Objective, loss and constraints

**Business objective.** Suggest risks from project documents, past projects and lessons learned, check the register for gaps and duplicates and help owners write clear risks with causes, effects and actions.

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

- Owners confirm every risk
- Suggestions cite their source
- Duplicates flagged
- Suggestions within 1 minute
- 100K register entries

## The approach in one paragraph

Start with risk workshops and spreadsheets, because they are the usual approach. Then earn the move to an assistant that suggests risks and mitigations from similar projects, checks wording and coverage and keeps owners in control of ratings and actions, and only if it beats the baseline on Suggestion acceptance and Duplicate detection after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Project scope and stage | Type and phase. Context. Guard against: from project data. |
| Add Similar past risks | Risks in similar projects. Suggestion. Guard against: from past registers. |
| Add Register gaps | Areas with no risks. Coverage. Guard against: from register analysis. |
| Run it as one pipeline | Project data intake (project systems), Similar project search (embeddings), Risk suggestion (LLM with citations), Quality and duplicate check (rules) and Action tracking (project tool), with Owner review and Register review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle unique project | Structured prompts for workshops. |

**Deliberately not doing**

- Owner name: personal data.
- Risk id: an identifier.
- Date: weak link.

**How the approach is proven**

Prove it offline on Suggestion acceptance, Duplicate detection and Coverage of audited risks using time-ordered splits, then online on "Risks realised that were not in the register" with "Register quality" as the guardrail. Watch for: Generic risk lists, Model-set ratings and Vague risk titles.

## Baseline and production design

- **Baseline (build this first):** Risk workshops and spreadsheets, because they are the usual approach.
- **Production design:** An assistant that suggests risks and mitigations from similar projects, checks wording and coverage and keeps owners in control of ratings and actions.

## Why AI, and why this kind

**Why AI.** Suggest risks from project documents, past projects and lessons learned, check the register for gaps and duplicates and help owners write clear risks with causes, effects and actions. The evidence that separates good from bad outcomes (Project scope and stage, Similar past risks, Register gaps) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "generic lists" are what teams reach for first, and they fail because generic lists miss project risks. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: An assistant that suggests risks and mitigations from similar projects, checks wording and coverage and keeps owners in control of ratings and actions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Project scope and stage, Similar past risks, Register gaps and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Risk workshops and spreadsheets, because they are the usual approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An assistant that suggests risks and mitigations from similar projects, checks wording and coverage and keeps owners in control of ratings and actions | chosen | Meets the 2500 ms envelope at $0.682 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Risks realised that were not in the register) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Generic risk lists.
- Evaluation trap: Model-set ratings.
- Unique project: no similar projects exist.
- Risk inflation: too many risks are added.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
