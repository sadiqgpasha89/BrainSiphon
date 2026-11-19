# Contact-Centre Call QA & Summarisation: use-case brief

> Generated from the blueprint `bfsi/contact-centre-call-qa-and-summarisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Contact-Centre Call QA & Summarisation · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Transcribe, summarise and score calls against the quality and compliance checklist so supervisors review the right calls and agents spend less time on notes. The system has to run interactively, within a few seconds, inside these limits: The summary is faithful to the transcript and adds nothing, Mandatory disclosures are detected with the exact span and Customer account and card data redacted from transcripts and summaries.

**Why it is hard.** The obvious approach is a 2 percent random sample reviewed by people, and it fails because a sample misses the rare breach, and the one missed call is the one a regulator finds. The second trap is in "Checklist": the real signal is specific checklist items marked with the spans that support them, while teams usually reach for one overall quality score.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $599.1K a month. A mistake is expensive in the way after-call work time measures it.

**What success looks like.** Offline: Item F1 and Summary faithfulness. Online: QA coverage and After-call work time. The launch is judged on "QA coverage" while "After-call work time" must not get worse.

## Objective, loss and constraints

**Business objective.** Transcribe, summarise and score calls against the quality and compliance checklist so supervisors review the right calls and agents spend less time on notes.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{CE}(\hat{y},y)`

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
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |

**Hard constraints**

- The summary is faithful to the transcript and adds nothing
- Mandatory disclosures are detected with the exact span
- Customer account and card data redacted from transcripts and summaries
- Supervisors see the evidence for every score

## The approach in one paragraph

Start with random sampling of calls scored by supervisors, because that is the standard. Then earn the move to aSR with redaction, a checklist classifier with evidence spans, a summary generator with a faithfulness check and a risk-based review list, and only if it beats the baseline on Item F1 and Summary faithfulness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Disclosure detection | Detected spans for each required statement, with confidence. Compliance depends on required statements being made. Guard against: speech recognition errors cause misses, so use fuzzy matching. |
| Add Summary faithfulness | Share of summary claims supported by the transcript. The main quality check. Guard against: needs an entailment check, not only overlap. |
| Add Sentiment shift | Change in sentiment between the first and last minute of the call. Highlights escalation and unresolved complaints. Guard against: weak and noisy, so use with other signals. |
| Run it as one pipeline | Call recording (telephony platform), Speech to text (ASR service), PII redaction (NER), Checklist scorer (encoder classifier), Summariser (LLM) and CRM note (CRM), with Supervisor queue off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle noisy audio | Gate on transcript confidence and send low-confidence calls to a human. |

**Deliberately not doing**

- Call length: Weakly related to quality once the topic is known.
- Agent accent: Not a quality measure and scoring on it is unfair.
- Hold music: An audio artefact and not a speech signal.

**How the approach is proven**

Prove it offline on Item F1 and Summary faithfulness using time-ordered splits, then online on "QA coverage" with "After-call work time" as the guardrail. Watch for: Supervisor labels are inconsistent between reviewers, so the ceiling is lower than it appears and Speech recognition tested on clean audio overstates accuracy on real calls.

## Baseline and production design

- **Baseline (build this first):** Random sampling of calls scored by supervisors, because that is the standard.
- **Production design:** ASR with redaction, a checklist classifier with evidence spans, a summary generator with a faithfulness check and a risk-based review list.

## Why AI, and why this kind

**Why AI.** Transcribe, summarise and score calls against the quality and compliance checklist so supervisors review the right calls and agents spend less time on notes. The evidence that separates good from bad outcomes (Disclosure detection, Summary faithfulness, Sentiment shift) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A 2 percent random sample reviewed by people" are what teams reach for first, and they fail because A sample misses the rare breach, and the one missed call is the one a regulator finds. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: ASR with redaction, a checklist classifier with evidence spans, a summary generator with a faithfulness check and a risk-based review list.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Disclosure detection, Summary faithfulness, Sentiment shift and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Random sampling of calls scored by supervisors, because that is the standard | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| ASR with redaction, a checklist classifier with evidence spans, a summary generator with a faithfulness check and a risk-based review list | chosen | Meets the 2500 ms envelope at $6.66 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (QA coverage) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Supervisor labels are inconsistent between reviewers, so the ceiling is lower than it appears.
- Evaluation trap: Speech recognition tested on clean audio overstates accuracy on real calls.
- Noisy audio: a poor recording gives a bad transcript and wrong scores.
- Dialects and languages: accuracy is lower for some dialects and languages and those callers get worse scoring.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
