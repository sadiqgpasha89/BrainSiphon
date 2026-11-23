# Zoning and Building Code Question Agent: use-case brief

> Generated from the blueprint `public-sector/zoning-code-question-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Zoning and Building Code Question Agent · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer questions about what can be built on a parcel by retrieving the zoning rules, overlays and code with citations, and refer binding determinations to planners. The system has to run interactively, within a few seconds, inside these limits: Answers cite the rule text and the effective date, The agent gives guidance and not a determination and Parcel data from the GIS system.

**Why it is hard.** The obvious approach is model recall, and it fails because rules vary by parcel and change. The second trap is in "Status": the real signal is guidance with a disclaimer and an invitation to request a determination, while teams usually reach for a legal answer.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $23.7K a month. A mistake is expensive in the way wrong-assumption applications measures it.

**What success looks like.** Offline: Answer correctness on audited questions, Citation coverage and Handoff precision. Online: Counter enquiries, Wrong-assumption applications and Time to answer. The launch is judged on "Counter enquiries" while "Wrong-assumption applications" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer questions about what can be built on a parcel by retrieving the zoning rules, overlays and code with citations, and refer binding determinations to planners.

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

- Answers cite the rule text and the effective date
- The agent gives guidance and not a determination
- Parcel data from the GIS system
- Handoff to planners for formal letters
- Response within 5 s

## The approach in one paragraph

Start with planning counter staff searching ordinance PDFs and maps, because it is the current process. Then earn the move to a retrieval agent combining parcel lookups and ordinance retrieval to answer with citations and effective dates, with a clear route to formal determinations, and only if it beats the baseline on Answer correctness on audited questions and Citation coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Parcel zone and overlays | Zone and overlay layers at the parcel. Applicable rules. Guard against: from GIS. |
| Add Ordinance version and date | Effective version. Correctness. Guard against: from the rule store. |
| Add Question type | Uses, setbacks, height or process. Routing. Guard against: classified. |
| Run it as one pipeline | Question and address intake (web and counter), Parcel resolution (GIS), Rule retrieval (ordinance index), Answer with citation (LLM with controlled text) and Determination referral (permit system), with Feedback and Rule coverage review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle ambiguous address | Ask for confirmation and list candidates. |

**Deliberately not doing**

- Resident name: irrelevant and private.
- Address format: an artefact.
- Chat length: an artefact.

**How the approach is proven**

Prove it offline on Answer correctness on audited questions, Citation coverage and Handoff precision using time-ordered splits, then online on "Counter enquiries" with "Wrong-assumption applications" as the guardrail. Watch for: Giving determinations, Uncited answers and Unversioned ordinances.

## Baseline and production design

- **Baseline (build this first):** Planning counter staff searching ordinance PDFs and maps, because it is the current process.
- **Production design:** A retrieval agent combining parcel lookups and ordinance retrieval to answer with citations and effective dates, with a clear route to formal determinations.

## Why AI, and why this kind

**Why AI.** Answer questions about what can be built on a parcel by retrieving the zoning rules, overlays and code with citations, and refer binding determinations to planners. The evidence that separates good from bad outcomes (Parcel zone and overlays, Ordinance version and date, Question type) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model recall" are what teams reach for first, and they fail because rules vary by parcel and change. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A retrieval agent combining parcel lookups and ordinance retrieval to answer with citations and effective dates, with a clear route to formal determinations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Parcel zone and overlays, Ordinance version and date, Question type and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Planning counter staff searching ordinance PDFs and maps, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval agent combining parcel lookups and ordinance retrieval to answer with citations and effective dates, with a clear route to formal determinations | chosen | Meets the 2500 ms envelope at $5.27 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Counter enquiries) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Giving determinations.
- Evaluation trap: Uncited answers.
- Ambiguous address: the parcel cannot be resolved.
- Recent amendment: the new ordinance is not indexed yet.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
