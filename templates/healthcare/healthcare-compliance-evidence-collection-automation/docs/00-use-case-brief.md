# Healthcare Compliance Evidence Collection Automation: use-case brief

> Generated from the blueprint `healthcare/healthcare-compliance-evidence-collection-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Compliance Evidence Collection Automation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Gather, classify, validate and organise the evidence that audits, accreditation and regulatory reviews require, so control owners attest to a complete, time-stamped binder instead of assembling it by hand. The system has to run as a scheduled batch job, inside these limits: Control owners attest evidence and the agent never fabricates, edits or backfills missing proof, Each item keeps an immutable reference, retrieval time and source system and Freshness is checked against the audit period.

**Why it is hard.** The obvious approach is copied file, and it fails because a copy cannot prove where it came from. The second trap is in "Mapping": the real signal is evidence linked to a specific control requirement, while teams usually reach for folder of documents.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $2.0K a month. A mistake is expensive in the way evidence requests answered first time measures it.

**What success looks like.** Offline: Mapping precision and recall against owner-confirmed links, Freshness-check accuracy and Share of binder items accepted by auditors. Online: Audit preparation hours, Evidence requests answered first time and Exceptions found before the audit. The launch is judged on "Audit preparation hours" while "Evidence requests answered first time" must not get worse.

## Objective, loss and constraints

**Business objective.** Gather, classify, validate and organise the evidence that audits, accreditation and regulatory reviews require, so control owners attest to a complete, time-stamped binder instead of assembling it by hand.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{artifact})+\lambda\,\mathrm{PolicyViolation}`

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
| \text{artifact} | The retrieved document or system report being classified and matched to an evidence requirement. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{PolicyViolation} | A penalty when a draft, task or tool call breaks a permission, approval gate or citation rule. |

**Hard constraints**

- Control owners attest evidence and the agent never fabricates, edits or backfills missing proof
- Each item keeps an immutable reference, retrieval time and source system
- Freshness is checked against the audit period
- Gaps are listed as exceptions and not filled
- Agent permissions are read-only
- Collects for 6K controls per audit cycle

## The approach in one paragraph

Start with control owners email documents to the audit coordinator before an audit. Then earn the move to connectors to approved repositories and report systems, document classification and requirement matching, deterministic freshness and completeness checks, and an agent that assembles the binder with immutable references and routes items for owner attestation, and only if it beats the baseline on Mapping precision and recall against owner-confirmed links and Freshness-check accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Requirement match score | Match between an artifact and the evidence requirement. Primary mapping signal. Guard against: reviewed mappings. |
| Add Evidence age versus period | Evidence date against the audit window. Freshness check. Guard against: document metadata. |
| Add Completeness ratio | Share of requirements with accepted evidence per control. Readiness view. Guard against: binder state. |
| Run it as one pipeline | Requirement and owner intake (control catalogue), Evidence connectors (read-only repository and report APIs), Document classifier and matcher (document AI), Freshness and completeness checker (deterministic rules), Binder assembler agent (typed tools) and Control owner attestation (human), with Immutable binder and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle evidence exists only in a person's mailbox | Exception listed and a manual route. |

**Deliberately not doing**

- File name: unreliable label.
- Folder depth: storage artefact.
- Uploader seniority: not evidence quality.

**How the approach is proven**

Prove it offline on Mapping precision and recall against owner-confirmed links, Freshness-check accuracy and Share of binder items accepted by auditors using time-ordered splits, then online on "Audit preparation hours" with "Evidence requests answered first time" as the guardrail. Watch for: Letting the agent fill missing evidence, Accepting out-of-period documents and Mapping by file name.

## Baseline and production design

- **Baseline (build this first):** Control owners email documents to the audit coordinator before an audit.
- **Production design:** Connectors to approved repositories and report systems, document classification and requirement matching, deterministic freshness and completeness checks, and an agent that assembles the binder with immutable references and routes items for owner attestation.

## Why AI, and why this kind

**Why AI.** Gather, classify, validate and organise the evidence that audits, accreditation and regulatory reviews require, so control owners attest to a complete, time-stamped binder instead of assembling it by hand. The evidence that separates good from bad outcomes (Requirement match score, Evidence age versus period, Completeness ratio) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "copied file" are what teams reach for first, and they fail because A copy cannot prove where it came from. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Connectors to approved repositories and report systems, document classification and requirement matching, deterministic freshness and completeness checks, and an agent that assembles the binder with immutable references and routes items for owner attestation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Requirement match score, Evidence age versus period, Completeness ratio and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Control owners email documents to the audit coordinator before an audit | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Connectors to approved repositories and report systems, document classification and requirement matching, deterministic freshness and completeness checks, and an agent that assembles the binder with immutable references and routes items for owner attestation | chosen | Meets the run-window envelope at $1.11 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Audit preparation hours) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Letting the agent fill missing evidence.
- Evaluation trap: Accepting out-of-period documents.
- Evidence exists only in a person's mailbox: the connector cannot see it.
- Document supersedes an earlier one: wrong version used.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
