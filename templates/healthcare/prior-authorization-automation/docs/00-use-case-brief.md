# Prior Authorization Automation: use-case brief

> Generated from the blueprint `healthcare/prior-authorization-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Prior Authorization Automation · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assemble clinical evidence against payer policies to auto-approve straightforward prior authorisation requests and speed up the rest. The system has to run interactively, within a few seconds, inside these limits: Payer policy versions change monthly, Evidence citations required and Humans decide denials.

**Why it is hard.** The obvious approach is generic reasoning from memory, and it fails because policies are specific; guesses create wrongful denials. The second trap is in "Denials": the real signal is only humans may deny, while teams usually reach for auto-denial.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $20.5K a month. A mistake is expensive in the way turnaround time measures it.

**What success looks like.** Offline: Criteria-level accuracy and Approval precision at 99%. Online: Auto-approval rate and Turnaround time. The launch is judged on "Auto-approval rate" while "Turnaround time" must not get worse.

## Objective, loss and constraints

**Business objective.** Assemble clinical evidence against payer policies to auto-approve straightforward prior authorisation requests and speed up the rest.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{policy},\text{chart})+\lambda\,\mathrm{PolicyViolation}`

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
| \text{policy} | The insurer's coverage policy. |
| \text{chart} | The patient's clinical record. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{PolicyViolation} | Penalty when the generated decision or letter contradicts the policy. |

**Hard constraints**

- Payer policy versions change monthly
- Evidence citations required
- Humans decide denials
- Turnaround under 24 hours

## The approach in one paragraph

Start with manual review by nurses against PDF policies. Then earn the move to policy-to-checklist compiler, chart evidence retriever, LLM criteria checker with citations and human-in-the-loop for uncertain or denial recommendations, and only if it beats the baseline on Criteria-level accuracy and Approval precision at 99% after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Criteria coverage | Share of policy criteria with chart evidence. Decision basis. Guard against: evidence retrieval accuracy. |
| Add Policy version match | Policy in force at request date. Correctness. Guard against: effective-date lookup. |
| Add Approval confidence | Calibrated probability criteria met. Routing. Guard against: calibrated per payer. |
| Run it as one pipeline | Request intake (payer portal or fax OCR), Policy retriever (versioned policy store), Evidence retriever (chart FHIR), Criteria checker (LLM with citations) and Decision router (confidence policy), with Nurse reviewer and Outcome feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle policy PDF format changes | Policy-ingestion monitors and diff alerts. |

**Deliberately not doing**

- Physician specialty prestige: none.
- Request channel: none.

**How the approach is proven**

Prove it offline on Criteria-level accuracy and Approval precision at 99% using time-ordered splits, then online on "Auto-approval rate" with "Turnaround time" as the guardrail. Watch for: Training on historical approvals biased by prior reviewers and Evaluating without policy-version control.

## Baseline and production design

- **Baseline (build this first):** Manual review by nurses against PDF policies.
- **Production design:** Policy-to-checklist compiler, chart evidence retriever, LLM criteria checker with citations and human-in-the-loop for uncertain or denial recommendations.

## Why AI, and why this kind

**Why AI.** Assemble clinical evidence against payer policies to auto-approve straightforward prior authorisation requests and speed up the rest. The evidence that separates good from bad outcomes (Criteria coverage, Policy version match, Approval confidence) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "generic reasoning from memory" are what teams reach for first, and they fail because policies are specific; guesses create wrongful denials. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Policy-to-checklist compiler, chart evidence retriever, LLM criteria checker with citations and human-in-the-loop for uncertain or denial recommendations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Criteria coverage, Policy version match, Approval confidence and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual review by nurses against PDF policies | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Policy-to-checklist compiler, chart evidence retriever, LLM criteria checker with citations and human-in-the-loop for uncertain or denial recommendations | chosen | Meets the 2500 ms envelope at $11.41 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Auto-approval rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on historical approvals biased by prior reviewers.
- Evaluation trap: Evaluating without policy-version control.
- Policy PDF format changes: parser breaks and checklists go stale.
- Missing chart documents: false unmet criteria.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
