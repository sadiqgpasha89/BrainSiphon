# Network Data Privacy & Retention Compliance Copilot: use-case brief

> Generated from the blueprint `telecom/network-data-privacy-retention-compliance-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Network Data Privacy & Retention Compliance Copilot · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer privacy and retention questions about network and subscriber data, map datasets to rules and flag gaps, so engineers and legal teams make consistent decisions. The system has to run interactively, within a few seconds, inside these limits: Answers cite the policy clause and the data catalogue entry, The copilot advises and never changes retention settings and Legal reviews all interpretations of new rules.

**Why it is hard.** The obvious approach is model memory of privacy law, and it fails because rules differ by country and change. The second trap is in "Scope": the real signal is datasets mapped to purposes and retention classes, while teams usually reach for general privacy advice.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $20.5K a month. A mistake is expensive in the way datasets with overdue retention measures it.

**What success looks like.** Offline: Citation faithfulness, Gap detection recall on seeded issues and Routing accuracy. Online: Time to answer privacy questions, Datasets with overdue retention and Escalations to legal. The launch is judged on "Time to answer privacy questions" while "Datasets with overdue retention" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer privacy and retention questions about network and subscriber data, map datasets to rules and flag gaps, so engineers and legal teams make consistent decisions.

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

- Answers cite the policy clause and the data catalogue entry
- The copilot advises and never changes retention settings
- Legal reviews all interpretations of new rules
- Response within 10 s

## The approach in one paragraph

Start with keyword search over policy documents, because it shows how much retrieval saves. Then earn the move to a retrieval-grounded assistant over the policy library and data catalogue with structured findings, owner routing for unresolved questions and a log for audit, and only if it beats the baseline on Citation faithfulness and Gap detection recall on seeded issues after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Dataset classification | Sensitivity and retention class from the catalogue. Maps rules. Guard against: needs catalogue coverage. |
| Add Purpose match | Whether a use case matches an approved purpose. Basis for allowing a use. Guard against: purpose register. |
| Add Retention timer status | Age of data against the retention class. Finds overdue data. Guard against: from storage metadata. |
| Run it as one pipeline | Question intake (chat and ticket), Policy and catalogue retrieval (hybrid search), Mapping and gap check (rules), Grounded answer (LLM with citations), Owner routing (case system), Decision log (lakehouse) and Policy update sync (nightly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle conflicting rules | Show both and route to legal. |

**Deliberately not doing**

- Question phrasing: not substance.
- Requester seniority: not relevant to rules.
- Document formatting: an artefact.

**How the approach is proven**

Prove it offline on Citation faithfulness, Gap detection recall on seeded issues and Routing accuracy using time-ordered splits, then online on "Time to answer privacy questions" with "Datasets with overdue retention" as the guardrail. Watch for: Treating the answer as legal advice, No catalogue link and Stale policies.

## Baseline and production design

- **Baseline (build this first):** Keyword search over policy documents, because it shows how much retrieval saves.
- **Production design:** A retrieval-grounded assistant over the policy library and data catalogue with structured findings, owner routing for unresolved questions and a log for audit.

## Why AI, and why this kind

**Why AI.** Answer privacy and retention questions about network and subscriber data, map datasets to rules and flag gaps, so engineers and legal teams make consistent decisions. The evidence that separates good from bad outcomes (Dataset classification, Purpose match, Retention timer status) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory of privacy law" are what teams reach for first, and they fail because rules differ by country and change. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A retrieval-grounded assistant over the policy library and data catalogue with structured findings, owner routing for unresolved questions and a log for audit.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Dataset classification, Purpose match, Retention timer status and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword search over policy documents, because it shows how much retrieval saves | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval-grounded assistant over the policy library and data catalogue with structured findings, owner routing for unresolved questions and a log for audit | chosen | Meets the 2500 ms envelope at $11.40 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to answer privacy questions) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating the answer as legal advice.
- Evaluation trap: No catalogue link.
- Conflicting rules: two regions differ.
- Missing catalogue entry: the dataset is unknown.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
