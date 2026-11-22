# Healthcare Contract Clause Risk Classification: use-case brief

> Generated from the blueprint `healthcare/healthcare-contract-clause-risk-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Clause Risk Classification · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify clauses that deviate from approved playbooks or create legal, financial, privacy, security, operational or clinical-continuity risk, and rank them for counsel review with source spans and the deviation from the fallback language. The system has to run as a scheduled batch job, inside these limits: Legal counsel makes legal determinations and approves changes and the classifier only flags and ranks, Every flag cites the clause span and the playbook position and Deterministic policy checks run beside the model.

**Why it is hard.** The obvious approach is free-form risk opinion, and it fails because counsel needs the rule and the fallback. The second trap is in "Source": the real signal is clause span with section references, while teams usually reach for summary only.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $2.6K a month. A mistake is expensive in the way high-risk clauses found before signature measures it.

**What success looks like.** Offline: Macro-F1 by clause type and risk type, Deviation-detection recall at the reviewer capacity and Span-level agreement with counsel. Online: Counsel review time per agreement, High-risk clauses found before signature and Playbook adherence. The launch is judged on "Counsel review time per agreement" while "High-risk clauses found before signature" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify clauses that deviate from approved playbooks or create legal, financial, privacy, security, operational or clinical-continuity risk, and rank them for counsel review with source spans and the deviation from the fallback language.

**Training objective.** `\mathcal{L}=-\sum_i\log p_\theta(y_i\mid x_i)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| x_i | The input features describing one example (what the model sees). (one value per example i) |

**Hard constraints**

- Legal counsel makes legal determinations and approves changes and the classifier only flags and ranks
- Every flag cites the clause span and the playbook position
- Deterministic policy checks run beside the model
- Classification is by risk type with confidence
- Jurisdiction and policy version are inputs
- Processes 20K agreements in a one-off and 800 new agreements per month

## The approach in one paragraph

Start with a keyword search for liability and indemnity clauses. Then earn the move to document parsing into clauses, a fine-tuned transformer classifier and a retrieval comparison against playbook language, combined with deterministic checks on extracted values such as caps and notice periods, and a ranked reviewer queue, and only if it beats the baseline on Macro-F1 by clause type and risk type and Deviation-detection recall at the reviewer capacity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Playbook deviation score | Semantic and structural distance from approved clause language. Primary risk signal. Guard against: playbook version. |
| Add Clause type and obligation direction | Classified clause family and who carries the obligation. Risk depends on who bears it. Guard against: parsed text. |
| Add Liability and indemnity terms | Caps, exclusions and indemnity scope as extracted values. Financial exposure. Guard against: extracted with provenance. |
| Run it as one pipeline | Document intake and parsing (OCR and clause segmentation), Clause classifier (transformer), Playbook comparator (embedding search), Policy checks on extracted values (deterministic rules) and Risk ranker (gradient boosting), with Legal counsel review and Reviewer feedback and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle scanned contract with poor text | OCR confidence gate and a manual route. |

**Deliberately not doing**

- Contract length: not risk.
- Counterparty brand: not clause risk.
- Formatting and numbering style: layout.

**How the approach is proven**

Prove it offline on Macro-F1 by clause type and risk type, Deviation-detection recall at the reviewer capacity and Span-level agreement with counsel using time-ordered splits, then online on "Counsel review time per agreement" with "High-risk clauses found before signature" as the guardrail. Watch for: Splitting by clause not by contract, Training on negotiated final text only and Treating the model as legal advice.

## Baseline and production design

- **Baseline (build this first):** A keyword search for liability and indemnity clauses.
- **Production design:** Document parsing into clauses, a fine-tuned transformer classifier and a retrieval comparison against playbook language, combined with deterministic checks on extracted values such as caps and notice periods, and a ranked reviewer queue.

## Why AI, and why this kind

**Why AI.** Identify clauses that deviate from approved playbooks or create legal, financial, privacy, security, operational or clinical-continuity risk, and rank them for counsel review with source spans and the deviation from the fallback language. The evidence that separates good from bad outcomes (Playbook deviation score, Clause type and obligation direction, Liability and indemnity terms) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free-form risk opinion" are what teams reach for first, and they fail because counsel needs the rule and the fallback. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Document parsing into clauses, a fine-tuned transformer classifier and a retrieval comparison against playbook language, combined with deterministic checks on extracted values such as caps and notice periods, and a ranked reviewer queue.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Playbook deviation score, Clause type and obligation direction, Liability and indemnity terms and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A keyword search for liability and indemnity clauses | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Document parsing into clauses, a fine-tuned transformer classifier and a retrieval comparison against playbook language, combined with deterministic checks on extracted values such as caps and notice periods, and a ranked reviewer queue | chosen | Meets the run-window envelope at $0.291 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Counsel review time per agreement) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Splitting by clause not by contract.
- Evaluation trap: Training on negotiated final text only.
- Scanned contract with poor text: clauses are mis-segmented.
- Amended clause: the amendment supersedes the base.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
