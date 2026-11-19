# Earnings-Call Sentiment & ESG Signal Extraction: use-case brief

> Generated from the blueprint `fintech/earnings-call-sentiment-and-esg-signals` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Earnings-Call Sentiment & ESG Signal Extraction · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Convert filings, calls and news into structured, point-in-time signals for research analysts and quant models. The system has to run as a scheduled batch job, inside these limits: Timestamp accuracy to the second, Reproducible model versions and Licence compliance for transcripts.

**Why it is hard.** The obvious approach is absolute sentiment score, and it fails because absolute sentiment is dominated by sector tone. The second trap is in "Timing": the real signal is signal available only after publication timestamp, while teams usually reach for date-level joins.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $4.2K a month. A mistake is expensive in the way portfolio contribution of signals measures it.

**What success looks like.** Offline: Information coefficient of delta signal and Extraction F1. Online: Analyst usage and Portfolio contribution of signals. The launch is judged on "Analyst usage" while "Portfolio contribution of signals" must not get worse.

## Objective, loss and constraints

**Business objective.** Convert filings, calls and news into structured, point-in-time signals for research analysts and quant models.

**Training objective.** `\mathcal{L}=\mathrm{CE}(y,p)+\lambda\,\mathrm{ConsistencyAcrossParaphrase}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ConsistencyAcrossParaphrase} | Penalty when rewording the same sentence changes the predicted sentiment. |

**Hard constraints**

- Timestamp accuracy to the second
- Reproducible model versions
- Licence compliance for transcripts
- Cover 10k issuers

## The approach in one paragraph

Start with loughran-McDonald lexicon sentiment. Then earn the move to fine-tuned financial LLM extracting structured claims per paragraph, with quarter-over-quarter delta features and timestamps in a point-in-time store, and only if it beats the baseline on Information coefficient of delta signal and Extraction F1 after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Guidance language change | Diff of forward-looking statements vs prior call. Early info on outlook. Guard against: align quarters correctly. |
| Add Q&A evasiveness score | Non-answer rate in analyst Q&A. Management caution. Guard against: speaker diarisation must be accurate. |
| Add Topic emphasis shift | Change in share of text on risk topics. ESG risk emphasis. Guard against: topic model frozen per version. |
| Run it as one pipeline | Transcript ingestion (licensed feeds), Speaker diarisation (ASR plus alignment), Claim extractor (fine-tuned LLM), Delta feature builder (versioned diff), Point-in-time store (time-stamped) and Signal tracking (IC monitor), with Analyst API off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle transcript corrected hours later | Versioned transcripts and as-of timestamps. |

**Deliberately not doing**

- Overall positivity: boilerplate optimism by management.
- Transcript length: varies with company style.

**How the approach is proven**

Prove it offline on Information coefficient of delta signal and Extraction F1 using time-ordered splits, then online on "Analyst usage" with "Portfolio contribution of signals" as the guardrail. Watch for: Date-level joins instead of timestamp and Model trained on text that mentions the subsequent price move.

## Baseline and production design

- **Baseline (build this first):** Loughran-McDonald lexicon sentiment.
- **Production design:** Fine-tuned financial LLM extracting structured claims per paragraph, with quarter-over-quarter delta features and timestamps in a point-in-time store.

## Why AI, and why this kind

**Why AI.** Convert filings, calls and news into structured, point-in-time signals for research analysts and quant models. The evidence that separates good from bad outcomes (Guidance language change, Q&A evasiveness score, Topic emphasis shift) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "absolute sentiment score" are what teams reach for first, and they fail because absolute sentiment is dominated by sector tone. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Fine-tuned financial LLM extracting structured claims per paragraph, with quarter-over-quarter delta features and timestamps in a point-in-time store.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Guidance language change, Q&A evasiveness score, Topic emphasis shift and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Loughran-McDonald lexicon sentiment | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Fine-tuned financial LLM extracting structured claims per paragraph, with quarter-over-quarter delta features and timestamps in a point-in-time store | chosen | Meets the run-window envelope at $0.046 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Analyst usage) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Date-level joins instead of timestamp.
- Evaluation trap: Model trained on text that mentions the subsequent price move.
- Transcript corrected hours later: signal changes retroactively.
- Language model update shifts scores: historical comparability breaks.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
