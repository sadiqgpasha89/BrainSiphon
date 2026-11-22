# Healthcare Contract Redlining Copilot: use-case brief

> Generated from the blueprint `healthcare/healthcare-contract-redlining-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Redlining Copilot · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Suggest changes to contract clauses against approved legal playbooks and explain the rationale, the negotiation trade-offs and the unresolved legal questions, so counsel can review proposed redlines faster. The system has to run interactively, within a few seconds, inside these limits: Legal review and explicit approval are required for every proposed change, Suggestions come only from approved playbook language and cite it and No unsupported legal advice and unresolved questions are listed.

**Why it is hard.** The obvious approach is freshly invented clause text, and it fails because invented text has no legal approval. The second trap is in "Rationale": the real signal is cites the playbook rule and the deviation, while teams usually reach for confident explanation.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $20.6K a month. A mistake is expensive in the way playbook adherence in signed contracts measures it.

**What success looks like.** Offline: Approved-language adherence of suggested text, Counsel acceptance rate and edit distance after review and Unsupported-legal-claim rate. Online: Counsel review time per contract, Playbook adherence in signed contracts and Cycle time to signature. The launch is judged on "Counsel review time per contract" while "Playbook adherence in signed contracts" must not get worse.

## Objective, loss and constraints

**Business objective.** Suggest changes to contract clauses against approved legal playbooks and explain the rationale, the negotiation trade-offs and the unresolved legal questions, so counsel can review proposed redlines faster.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{clause},\text{playbook})+\lambda\,\mathrm{PolicyViolation}`

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
| \text{clause} | The contract clause being reviewed. |
| \text{playbook} | The approved playbook language and fallback positions retrieved for the clause. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{PolicyViolation} | A penalty when a draft, task or tool call breaks a permission, approval gate or citation rule. |

**Hard constraints**

- Legal review and explicit approval are required for every proposed change
- Suggestions come only from approved playbook language and cite it
- No unsupported legal advice and unresolved questions are listed
- The copilot never sends a draft externally
- Documents are untrusted input
- Latency under 30 seconds for a clause suggestion

## The approach in one paragraph

Start with counsel edits clauses manually using a playbook document. Then earn the move to retrieval of the matching playbook clause and fallback ladder, an LLM that proposes minimal tracked changes with a rationale and citations, a structured-diff validator that blocks text not found in approved language and a counsel approval workflow, and only if it beats the baseline on Approved-language adherence of suggested text and Counsel acceptance rate and edit distance after review after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Playbook match | Retrieved playbook clause and fallback levels for the issue. Grounds the redline. Guard against: playbook version. |
| Add Deviation severity | Classified severity of the clause deviation. Prioritises the work. Guard against: classifier calibration. |
| Add Acceptance history | Rate at which similar redlines were approved. Helps ranking. Guard against: past approved redlines. |
| Run it as one pipeline | Draft and playbook intake (contract system), Clause segmenter and classifier (transformer), Playbook retriever (vector and keyword index), Redline drafter (LLM with structured diff), Approved-language and policy guard (diff validator) and Accepted and rejected redline log (contract system), with Counsel review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle no playbook clause exists | Abstain and escalate with a request for guidance. |

**Deliberately not doing**

- Writing fluency: style.
- Model confidence phrases: not calibrated.
- Counterparty identity: not legal merit.

**How the approach is proven**

Prove it offline on Approved-language adherence of suggested text, Counsel acceptance rate and edit distance after review and Unsupported-legal-claim rate using time-ordered splits, then online on "Counsel review time per contract" with "Playbook adherence in signed contracts" as the guardrail. Watch for: Measuring fluency not approval, Allowing invented clause text and Skipping adversarial draft tests.

## Baseline and production design

- **Baseline (build this first):** Counsel edits clauses manually using a playbook document.
- **Production design:** Retrieval of the matching playbook clause and fallback ladder, an LLM that proposes minimal tracked changes with a rationale and citations, a structured-diff validator that blocks text not found in approved language and a counsel approval workflow.

## Why AI, and why this kind

**Why AI.** Suggest changes to contract clauses against approved legal playbooks and explain the rationale, the negotiation trade-offs and the unresolved legal questions, so counsel can review proposed redlines faster. The evidence that separates good from bad outcomes (Playbook match, Deviation severity, Acceptance history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "freshly invented clause text" are what teams reach for first, and they fail because invented text has no legal approval. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Retrieval of the matching playbook clause and fallback ladder, an LLM that proposes minimal tracked changes with a rationale and citations, a structured-diff validator that blocks text not found in approved language and a counsel approval workflow.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Playbook match, Deviation severity, Acceptance history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Counsel edits clauses manually using a playbook document | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Retrieval of the matching playbook clause and fallback ladder, an LLM that proposes minimal tracked changes with a rationale and citations, a structured-diff validator that blocks text not found in approved language and a counsel approval workflow | chosen | Meets the 2500 ms envelope at $11.46 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Counsel review time per contract) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Measuring fluency not approval.
- Evaluation trap: Allowing invented clause text.
- No playbook clause exists: the model improvises.
- Cross-references between clauses: a change breaks another clause.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
