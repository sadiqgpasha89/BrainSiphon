# Sales Call Summarisation & Coaching: use-case brief

> Generated from the blueprint `saas/sales-call-summarization-and-coaching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Sales Call Summarisation & Coaching · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Transcribe calls, extract next steps, objections and competitor mentions and deliver coaching insights, writing back to CRM. The system has to run interactively, within a few seconds, inside these limits: Call consent and legal rules, CRM write-back accuracy and Speaker diarisation.

**Why it is hard.** The obvious approach is free summary only, and it fails because wrong CRM fields corrupt forecasting. The second trap is in "Coaching": the real signal is behavioural metrics tied to outcomes, while teams usually reach for talk-time as quality.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $434.2K a month. A mistake is expensive in the way cRM completeness measures it.

**What success looks like.** Offline: Field-level extraction accuracy and Faithfulness rate. Online: Rep admin time saved and CRM completeness. The launch is judged on "Rep admin time saved" while "CRM completeness" must not get worse.

## Objective, loss and constraints

**Business objective.** Transcribe calls, extract next steps, objections and competitor mentions and deliver coaching insights, writing back to CRM.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{transcript})+\lambda\,\mathrm{UnsupportedFact}`

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
| \text{transcript} | The transcript of the sales call. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{UnsupportedFact} | Penalty for statements in the summary that the call does not support. |

**Hard constraints**

- Call consent and legal rules
- CRM write-back accuracy
- Speaker diarisation
- Coaching fairness

## The approach in one paragraph

Start with manual notes in CRM. Then earn the move to aSR with diarisation, structured extraction with citations, CRM write-back with rep confirmation, and outcome-linked coaching analytics, and only if it beats the baseline on Field-level extraction accuracy and Faithfulness rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Evidence-linked extraction accuracy | Field accuracy with spans. Trust. Guard against: annotations. |
| Add Question and objection patterns | Classified moments. Coaching. Guard against: taxonomy. |
| Add Next-step commitment detection | Commitments extracted. CRM. Guard against: extraction. |
| Run it as one pipeline | Call recording (conferencing), ASR and diarisation (speech model), Extraction LLM (structured output), Evidence verifier (span check), CRM write-back (rep confirmation), Manager coaching view (analytics) and Deal outcomes (labels). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle multiple speakers misattributed | Diarisation confidence and confirmation UI. |

**Deliberately not doing**

- Call length: weak.
- Filler word counts: weak.

**How the approach is proven**

Prove it offline on Field-level extraction accuracy and Faithfulness rate using time-ordered splits, then online on "Rep admin time saved" with "CRM completeness" as the guardrail. Watch for: Evaluating summaries not field accuracy and Coaching signals not tied to outcomes.

## Baseline and production design

- **Baseline (build this first):** Manual notes in CRM.
- **Production design:** ASR with diarisation, structured extraction with citations, CRM write-back with rep confirmation, and outcome-linked coaching analytics.

## Why AI, and why this kind

**Why AI.** Transcribe calls, extract next steps, objections and competitor mentions and deliver coaching insights, writing back to CRM. The evidence that separates good from bad outcomes (Evidence-linked extraction accuracy, Question and objection patterns, Next-step commitment detection) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free summary only" are what teams reach for first, and they fail because wrong CRM fields corrupt forecasting. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: ASR with diarisation, structured extraction with citations, CRM write-back with rep confirmation, and outcome-linked coaching analytics.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Evidence-linked extraction accuracy, Question and objection patterns, Next-step commitment detection and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual notes in CRM | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| ASR with diarisation, structured extraction with citations, CRM write-back with rep confirmation, and outcome-linked coaching analytics | chosen | Meets the 2500 ms envelope at $4.82 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Rep admin time saved) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating summaries not field accuracy.
- Evaluation trap: Coaching signals not tied to outcomes.
- Multiple speakers misattributed: commitments assigned to the wrong party.
- Call in two languages: extraction misses items.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
