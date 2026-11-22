# Healthcare Value Analysis Committee Decision Intelligence: use-case brief

> Generated from the blueprint `healthcare/healthcare-value-analysis-committee-decision-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Value Analysis Committee Decision Intelligence · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Prepare evidence-based review packets that compare products and services on clinical outcomes, safety, total cost, utilisation, implementation and alternatives, with source citations, uncertainty and conflict-of-interest disclosures. The system has to run interactively, within a few seconds, inside these limits: Committee members decide and generated summaries must cite sources and disclose evidence gaps, Vendor-supplied evidence is labelled and weighed separately and Evidence is graded by an explicit scheme.

**Why it is hard.** The obvious approach is a fluent summary, and it fails because a committee must see the quality of each source. The second trap is in "Vendor material": the real signal is labelled as vendor-supplied, while teams usually reach for mixed with independent evidence.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $20.6K a month. A mistake is expensive in the way decisions deferred for missing evidence measures it.

**What success looks like.** Offline: Citation precision and unsupported-claim rate, Evidence-grade agreement with expert reviewers and Gap-detection recall. Online: Committee preparation time, Decisions deferred for missing evidence and Post-decision realised value versus the packet estimate. The launch is judged on "Committee preparation time" while "Decisions deferred for missing evidence" must not get worse.

## Objective, loss and constraints

**Business objective.** Prepare evidence-based review packets that compare products and services on clinical outcomes, safety, total cost, utilisation, implementation and alternatives, with source citations, uncertainty and conflict-of-interest disclosures.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{evidence})+\lambda\,\mathrm{Calibration}`

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
| \text{evidence} | The retrieved evidence passages and internal analytics the packet must be grounded in. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Committee members decide and generated summaries must cite sources and disclose evidence gaps
- Vendor-supplied evidence is labelled and weighed separately
- Evidence is graded by an explicit scheme
- Conflict-of-interest disclosures are included
- The system abstains where evidence is absent
- Documents are untrusted input

## The approach in one paragraph

Start with a coordinator assembles a packet from vendor dossiers and a literature search. Then earn the move to hybrid retrieval over approved evidence with an evidence-grading rubric, structured internal analytics, multi-criteria comparison and an LLM that drafts the packet strictly from retrieved passages with citations, labelling vendor material and stating gaps, and only if it beats the baseline on Citation precision and unsupported-claim rate and Evidence-grade agreement with expert reviewers after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Evidence grade | Study design and risk-of-bias grade per source. Weights the claims. Guard against: grading scheme version. |
| Add Internal utilisation and cost | Actual use and total cost of ownership. Local relevance. Guard against: period as stated. |
| Add Citation coverage | Share of statements with a supporting source span. Faithfulness. Guard against: checked against retrieved text. |
| Run it as one pipeline | Request and evidence intake (approved repositories), Hybrid retriever (vector and keyword index), Evidence grading (rubric rules), Internal analytics builder (warehouse queries), Packet drafter with citations (LLM) and Citation and policy guard (citation verifier), with Committee review and Decision record and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle evidence is mostly vendor-supplied | Label it and request independent evidence. |

**Deliberately not doing**

- Journal prestige alone: not study quality.
- Number of citations: popularity.
- Vendor presentation length: marketing.

**How the approach is proven**

Prove it offline on Citation precision and unsupported-claim rate, Evidence-grade agreement with expert reviewers and Gap-detection recall using time-ordered splits, then online on "Committee preparation time" with "Decisions deferred for missing evidence" as the guardrail. Watch for: Judging fluency over citations, Mixing vendor and independent evidence and Letting the system recommend a decision.

## Baseline and production design

- **Baseline (build this first):** A coordinator assembles a packet from vendor dossiers and a literature search.
- **Production design:** Hybrid retrieval over approved evidence with an evidence-grading rubric, structured internal analytics, multi-criteria comparison and an LLM that drafts the packet strictly from retrieved passages with citations, labelling vendor material and stating gaps.

## Why AI, and why this kind

**Why AI.** Prepare evidence-based review packets that compare products and services on clinical outcomes, safety, total cost, utilisation, implementation and alternatives, with source citations, uncertainty and conflict-of-interest disclosures. The evidence that separates good from bad outcomes (Evidence grade, Internal utilisation and cost, Citation coverage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A fluent summary" are what teams reach for first, and they fail because A committee must see the quality of each source. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Hybrid retrieval over approved evidence with an evidence-grading rubric, structured internal analytics, multi-criteria comparison and an LLM that drafts the packet strictly from retrieved passages with citations, labelling vendor material and stating gaps.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Evidence grade, Internal utilisation and cost, Citation coverage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A coordinator assembles a packet from vendor dossiers and a literature search | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hybrid retrieval over approved evidence with an evidence-grading rubric, structured internal analytics, multi-criteria comparison and an LLM that drafts the packet strictly from retrieved passages with citations, labelling vendor material and stating gaps | chosen | Meets the 2500 ms envelope at $11.46 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Committee preparation time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Judging fluency over citations.
- Evaluation trap: Mixing vendor and independent evidence.
- Evidence is mostly vendor-supplied: bias is high.
- Conflicting studies: the summary hides it.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
