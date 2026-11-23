# RFI Triage and Response Drafting: use-case brief

> Generated from the blueprint `engineering/rfi-triage-response-drafting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** RFI Triage and Response Drafting · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify requests for information, find the relevant drawings and specifications and draft a response for the design team to review, tracking time to answer. The system has to run interactively, within a few seconds, inside these limits: Responses cite drawing and specification references, Design team approves every response and Contract deadlines tracked.

**Why it is hard.** The obvious approach is model memory, and it fails because answers must match the contract documents. The second trap is in "Role": the real signal is draft and route, while teams usually reach for answer on behalf of the designer.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $86.9K a month. A mistake is expensive in the way rFIs past contract deadline measures it.

**What success looks like.** Offline: Retrieval accuracy, Draft acceptance and Priority accuracy. Online: RFI response time, RFIs past contract deadline and Schedule delay from RFIs. The launch is judged on "RFI response time" while "RFIs past contract deadline" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify requests for information, find the relevant drawings and specifications and draft a response for the design team to review, tracking time to answer.

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

- Responses cite drawing and specification references
- Design team approves every response
- Contract deadlines tracked
- Triage within 1 minute
- 30K RFIs per year

## The approach in one paragraph

Start with project engineers reading each RFI and searching drawings by hand, because it is the usual process. Then earn the move to a triage and drafting assistant that links RFIs to documents and past answers, ranks by schedule impact and drafts a cited response for the responsible designer, and only if it beats the baseline on Retrieval accuracy and Draft acceptance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around RFI text and sketch | The question and attachments. Core. Guard against: from the RFI system. |
| Add Related documents | Matching drawings and clauses. Evidence. Guard against: from retrieval. |
| Add Schedule link | Activity blocked by the RFI. Priority. Guard against: from the schedule. |
| Run it as one pipeline | RFI intake (project platform), Classification and priority (model), Document retrieval (search), Draft response with citations (LLM), Response issue (project platform) and Cycle time tracking (monthly), with Designer review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle conflicting documents | Show the conflict and escalate. |

**Deliberately not doing**

- Submitter name: personal data.
- RFI number: an identifier.
- Email signature: irrelevant.

**How the approach is proven**

Prove it offline on Retrieval accuracy, Draft acceptance and Priority accuracy using time-ordered splits, then online on "RFI response time" with "RFIs past contract deadline" as the guardrail. Watch for: Answers without citations, Model as designer and Arrival-order handling.

## Baseline and production design

- **Baseline (build this first):** Project engineers reading each RFI and searching drawings by hand, because it is the usual process.
- **Production design:** A triage and drafting assistant that links RFIs to documents and past answers, ranks by schedule impact and drafts a cited response for the responsible designer.

## Why AI, and why this kind

**Why AI.** Classify requests for information, find the relevant drawings and specifications and draft a response for the design team to review, tracking time to answer. The evidence that separates good from bad outcomes (RFI text and sketch, Related documents, Schedule link) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory" are what teams reach for first, and they fail because answers must match the contract documents. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A triage and drafting assistant that links RFIs to documents and past answers, ranks by schedule impact and drafts a cited response for the responsible designer.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among RFI text and sketch, Related documents, Schedule link and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Project engineers reading each RFI and searching drawings by hand, because it is the usual process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A triage and drafting assistant that links RFIs to documents and past answers, ranks by schedule impact and drafts a cited response for the responsible designer | chosen | Meets the 2500 ms envelope at $4.83 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (RFI response time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Answers without citations.
- Evaluation trap: Model as designer.
- Conflicting documents: drawings and specifications disagree.
- Missing information: the RFI lacks detail.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
