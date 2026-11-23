# Grounded Citizen Service Assistant: use-case brief

> Generated from the blueprint `public-sector/grounded-citizen-service-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Grounded Citizen Service Assistant · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer residents' questions about services, eligibility rules, fees and deadlines from official pages and forms, cite the source and hand over to a person for any case-specific decision. The system has to run interactively, within a few seconds, inside these limits: Answers come only from published official sources with a date, The assistant never decides eligibility or accepts evidence and Handoff to a person on request or low confidence.

**Why it is hard.** The obvious approach is model memory, and it fails because out-of-date rules mislead residents. The second trap is in "Scope": the real signal is general guidance and next steps, while teams usually reach for personal decisions.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $23.7K a month. A mistake is expensive in the way call volume measures it.

**What success looks like.** Offline: Answer faithfulness on audited questions, Handoff precision and Language parity. Online: Resolved contacts without staff, Call volume and Resident satisfaction by language. The launch is judged on "Resolved contacts without staff" while "Call volume" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer residents' questions about services, eligibility rules, fees and deadlines from official pages and forms, cite the source and hand over to a person for any case-specific decision.

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

- Answers come only from published official sources with a date
- The assistant never decides eligibility or accepts evidence
- Handoff to a person on request or low confidence
- Works in the top 10 local languages
- Answer within 4 s

## The approach in one paragraph

Start with a search box and a static FAQ page, because they are the current channels. Then earn the move to a retrieval-grounded assistant over official content with citations and dates, multilingual answers, accessible output and a warm handoff to staff with a short summary, and only if it beats the baseline on Answer faithfulness on audited questions and Handoff precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Source freshness | Age of the page behind the answer. Trust. Guard against: from the CMS. |
| Add Question intent | Information, status, form help or complaint. Routing. Guard against: classified. |
| Add Language and accessibility need | Language and format requested. Adaptation. Guard against: from the session. |
| Run it as one pipeline | Question intake (web chat and messaging), Language detection (classifier), Hybrid retrieval (official content index), Answer with citation (LLM with controlled content), Confidence check (rules), Staff handoff (contact centre) and Quality sampling (weekly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle outdated page | Freshness checks and review dates. |

**Deliberately not doing**

- Resident name: irrelevant and private.
- Device model: irrelevant.
- Chat length: an artefact.

**How the approach is proven**

Prove it offline on Answer faithfulness on audited questions, Handoff precision and Language parity using time-ordered splits, then online on "Resolved contacts without staff" with "Call volume" as the guardrail. Watch for: Answering eligibility questions, Undated sources and English-only service.

## Baseline and production design

- **Baseline (build this first):** A search box and a static FAQ page, because they are the current channels.
- **Production design:** A retrieval-grounded assistant over official content with citations and dates, multilingual answers, accessible output and a warm handoff to staff with a short summary.

## Why AI, and why this kind

**Why AI.** Answer residents' questions about services, eligibility rules, fees and deadlines from official pages and forms, cite the source and hand over to a person for any case-specific decision. The evidence that separates good from bad outcomes (Source freshness, Question intent, Language and accessibility need) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory" are what teams reach for first, and they fail because out-of-date rules mislead residents. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A retrieval-grounded assistant over official content with citations and dates, multilingual answers, accessible output and a warm handoff to staff with a short summary.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Source freshness, Question intent, Language and accessibility need and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A search box and a static FAQ page, because they are the current channels | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval-grounded assistant over official content with citations and dates, multilingual answers, accessible output and a warm handoff to staff with a short summary | chosen | Meets the 2500 ms envelope at $5.27 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Resolved contacts without staff) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Answering eligibility questions.
- Evaluation trap: Undated sources.
- Outdated page: the source changed.
- Case-specific question: the resident asks if they qualify.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
