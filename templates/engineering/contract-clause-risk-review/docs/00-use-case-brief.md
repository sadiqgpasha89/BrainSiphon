# Contract Clause Risk Review: use-case brief

> Generated from the blueprint `engineering/contract-clause-risk-review` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Contract Clause Risk Review · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Read tender and contract documents, extract clauses on liability, payment, delay and change, compare them with company positions and flag risks with citations for legal counsel to decide. The system has to run interactively, within a few seconds, inside these limits: Every flag cites clause and page, Legal counsel decides every position and Contract data kept in segregated workspaces.

**Why it is hard.** The obvious approach is model memory of law, and it fails because law and terms vary by jurisdiction. The second trap is in "Role": the real signal is highlight and compare, while teams usually reach for advise on legal outcomes.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $12.4K a month. A mistake is expensive in the way missed risky clauses measures it.

**What success looks like.** Offline: Clause extraction accuracy, Deviation recall and Citation faithfulness. Online: Contract review time, Missed risky clauses and Negotiation cycles. The launch is judged on "Contract review time" while "Missed risky clauses" must not get worse.

## Objective, loss and constraints

**Business objective.** Read tender and contract documents, extract clauses on liability, payment, delay and change, compare them with company positions and flag risks with citations for legal counsel to decide.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Every flag cites clause and page
- Legal counsel decides every position
- Contract data kept in segregated workspaces
- Review within 30 minutes for a 500-page contract
- No legal advice to third parties

## The approach in one paragraph

Start with lawyers and commercial managers reading the full contract, because it is the standard approach. Then earn the move to a clause extraction and comparison tool that finds high-risk deviations against the playbook with citations and drafts suggested fallback wording for counsel, and only if it beats the baseline on Clause extraction accuracy and Deviation recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Clause type and text | Liability, payment or delay clause. Core. Guard against: from extraction. |
| Add Playbook position | Accepted and fallback positions. Core. Guard against: from the legal playbook. |
| Add Deviation severity | Distance from the position. Priority. Guard against: from comparison. |
| Run it as one pipeline | Contract intake (document system), Clause extraction (NLP), Playbook comparison (rules and LLM), Risk ranking (model) and Position record (contract system), with Citation report and Legal review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle non-standard drafting | Low-confidence flags. |

**Deliberately not doing**

- Counsel name: personal data.
- Document layout: an artefact.
- Client logo: irrelevant.

**How the approach is proven**

Prove it offline on Clause extraction accuracy, Deviation recall and Citation faithfulness using time-ordered splits, then online on "Contract review time" with "Missed risky clauses" as the guardrail. Watch for: Model memory of law, Silent passes and Legal advice by the model.

## Baseline and production design

- **Baseline (build this first):** Lawyers and commercial managers reading the full contract, because it is the standard approach.
- **Production design:** A clause extraction and comparison tool that finds high-risk deviations against the playbook with citations and drafts suggested fallback wording for counsel.

## Why AI, and why this kind

**Why AI.** Read tender and contract documents, extract clauses on liability, payment, delay and change, compare them with company positions and flag risks with citations for legal counsel to decide. The evidence that separates good from bad outcomes (Clause type and text, Playbook position, Deviation severity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory of law" are what teams reach for first, and they fail because law and terms vary by jurisdiction. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A clause extraction and comparison tool that finds high-risk deviations against the playbook with citations and drafts suggested fallback wording for counsel.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Clause type and text, Playbook position, Deviation severity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Lawyers and commercial managers reading the full contract, because it is the standard approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A clause extraction and comparison tool that finds high-risk deviations against the playbook with citations and drafts suggested fallback wording for counsel | chosen | Meets the 2500 ms envelope at $0.461 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Contract review time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Model memory of law.
- Evaluation trap: Silent passes.
- Non-standard drafting: clauses use unusual wording.
- Cross-references: meaning depends on other clauses.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
