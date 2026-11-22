# Healthcare Contract Obligation & Deadline Intelligence: use-case brief

> Generated from the blueprint `healthcare/healthcare-contract-obligation-deadline-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Obligation & Deadline Intelligence · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Extract obligations, owners, milestones, notice periods, service levels, renewal windows, penalties and dependencies from agreements into a cited obligation register, and draft follow-up tasks for owners to confirm. The system has to run interactively, within a few seconds, inside these limits: The contract owner confirms obligations and assignments before workflow activation, Every obligation cites its clause and page and Dates use deterministic calendar rules for notice and renewal windows.

**Why it is hard.** The obvious approach is free-text summary, and it fails because operations needs owner, date and evidence. The second trap is in "Dates": the real signal is deterministic notice and renewal calculation, while teams usually reach for model arithmetic on dates.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $20.6K a month. A mistake is expensive in the way notice windows met measures it.

**What success looks like.** Offline: Field-level F1 for obligations and dates with citation accuracy, Task-proposal acceptance rate and Missed-deadline rate on audited contracts. Online: Obligations with a confirmed owner, Notice windows met and Contract manager time per contract. The launch is judged on "Obligations with a confirmed owner" while "Notice windows met" must not get worse.

## Objective, loss and constraints

**Business objective.** Extract obligations, owners, milestones, notice periods, service levels, renewal windows, penalties and dependencies from agreements into a cited obligation register, and draft follow-up tasks for owners to confirm.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{clause})+\lambda\,\mathrm{PolicyViolation}`

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
| \text{clause} | The contract clause text from which the obligation is extracted. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{PolicyViolation} | A penalty when a draft, task or tool call breaks a permission, approval gate or citation rule. |

**Hard constraints**

- The contract owner confirms obligations and assignments before workflow activation
- Every obligation cites its clause and page
- Dates use deterministic calendar rules for notice and renewal windows
- The agent only drafts tasks and never changes a contract or sends notices
- Tool permissions are least privilege
- Documents are untrusted input

## The approach in one paragraph

Start with a spreadsheet of key dates kept by the contract manager. Then earn the move to layout-aware clause extraction into an obligation schema with citations, deterministic date and notice calculators, an LLM agent that drafts tasks and owner suggestions through typed tools and a confirmation workflow that blocks activation until the owner approves, and only if it beats the baseline on Field-level F1 for obligations and dates with citation accuracy and Task-proposal acceptance rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Obligation extraction confidence | Calibrated confidence for each field. Routes review. Guard against: held-out contract groups. |
| Add Notice window | Computed latest action date for the clause. Prevents missed rights. Guard against: rule-computed. |
| Add Owner suggestion match | Similarity of obligation to a team's responsibilities in the directory. Speeds routing. Guard against: directory as at assignment. |
| Run it as one pipeline | Contract intake and parsing (OCR and clause segmentation), Obligation extractor (LLM with schema and citations), Date and notice calculator (deterministic calendar rules), Task drafting agent (typed task tools), Permission and policy guard (tool allow-list) and Contract owner confirmation (human), with Obligation register and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle ambiguous deadline wording | Show both and route to the owner. |

**Deliberately not doing**

- Contract title: not obligation content.
- Counterparty size: not an obligation property.
- Paragraph position: layout.

**How the approach is proven**

Prove it offline on Field-level F1 for obligations and dates with citation accuracy, Task-proposal acceptance rate and Missed-deadline rate on audited contracts using time-ordered splits, then online on "Obligations with a confirmed owner" with "Notice windows met" as the guardrail. Watch for: Letting the model compute dates, Auto-activating tasks and Scoring extraction without checking citations.

## Baseline and production design

- **Baseline (build this first):** A spreadsheet of key dates kept by the contract manager.
- **Production design:** Layout-aware clause extraction into an obligation schema with citations, deterministic date and notice calculators, an LLM agent that drafts tasks and owner suggestions through typed tools and a confirmation workflow that blocks activation until the owner approves.

## Why AI, and why this kind

**Why AI.** Extract obligations, owners, milestones, notice periods, service levels, renewal windows, penalties and dependencies from agreements into a cited obligation register, and draft follow-up tasks for owners to confirm. The evidence that separates good from bad outcomes (Obligation extraction confidence, Notice window, Owner suggestion match) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free-text summary" are what teams reach for first, and they fail because operations needs owner, date and evidence. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Layout-aware clause extraction into an obligation schema with citations, deterministic date and notice calculators, an LLM agent that drafts tasks and owner suggestions through typed tools and a confirmation workflow that blocks activation until the owner approves.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Obligation extraction confidence, Notice window, Owner suggestion match and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A spreadsheet of key dates kept by the contract manager | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Layout-aware clause extraction into an obligation schema with citations, deterministic date and notice calculators, an LLM agent that drafts tasks and owner suggestions through typed tools and a confirmation workflow that blocks activation until the owner approves | chosen | Meets the 2500 ms envelope at $11.44 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Obligations with a confirmed owner) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Letting the model compute dates.
- Evaluation trap: Auto-activating tasks.
- Ambiguous deadline wording: multiple readings.
- Amendment changes an obligation: register is stale.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
