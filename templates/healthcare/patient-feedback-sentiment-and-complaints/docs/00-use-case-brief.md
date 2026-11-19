# Patient Feedback & Complaint Mining: use-case brief

> Generated from the blueprint `healthcare/patient-feedback-sentiment-and-complaints` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patient Feedback & Complaint Mining · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Mine surveys, reviews and complaints to surface actionable service and safety issues by unit and theme. The system has to run as a scheduled batch job, inside these limits: Anonymisation, Safety-event escalation and Multilingual.

**Why it is hard.** The obvious approach is overall sentiment score, and it fails because leaders need which unit and which issue. The second trap is in "Safety": the real signal is safety-relevant mentions routed immediately, while teams usually reach for aggregates only.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.9K a month. A mistake is expensive in the way patient satisfaction trend measures it.

**What success looks like.** Offline: Topic F1 and aspect sentiment accuracy and Safety-flag recall. Online: Issues resolved and Patient satisfaction trend. The launch is judged on "Issues resolved" while "Patient satisfaction trend" must not get worse.

## Objective, loss and constraints

**Business objective.** Mine surveys, reviews and complaints to surface actionable service and safety issues by unit and theme.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{topic}}+\lambda\,\mathrm{CE}_{\text{sentiment}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{topic}} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |

**Hard constraints**

- Anonymisation
- Safety-event escalation
- Multilingual
- Monthly leadership reporting

## The approach in one paragraph

Start with nPS and star ratings. Then earn the move to topic and aspect-sentiment model with safety flagging and trend alerting, plus LLM-written summaries with citations, and only if it beats the baseline on Topic F1 and aspect sentiment accuracy and Safety-flag recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Topic-level sentiment | Sentiment per theme. Actionability. Guard against: topic model stable. |
| Add Unit attribution | Location entity extraction. Ownership. Guard against: entity linking. |
| Add Severity flags | Harm or safety mention detector. Escalation. Guard against: recall priority. |
| Run it as one pipeline | PII redaction (NER), Topic and sentiment (transformer), Safety flagger (classifier), Trend analyser (time series) and Action tracking (ticketing), with Survey and review feeds and Quality team review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle survey response bias (only extremes respond) | Weighting and complement with passive signals. |

**Deliberately not doing**

- Survey length: none.
- Respondent email: PII.

**How the approach is proven**

Prove it offline on Topic F1 and aspect sentiment accuracy and Safety-flag recall using time-ordered splits, then online on "Issues resolved" with "Patient satisfaction trend" as the guardrail. Watch for: Labels from star ratings only and Test data from one language.

## Baseline and production design

- **Baseline (build this first):** NPS and star ratings.
- **Production design:** Topic and aspect-sentiment model with safety flagging and trend alerting, plus LLM-written summaries with citations.

## Why AI, and why this kind

**Why AI.** Mine surveys, reviews and complaints to surface actionable service and safety issues by unit and theme. The evidence that separates good from bad outcomes (Topic-level sentiment, Unit attribution, Severity flags) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "overall sentiment score" are what teams reach for first, and they fail because leaders need which unit and which issue. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Topic and aspect-sentiment model with safety flagging and trend alerting, plus LLM-written summaries with citations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Topic-level sentiment, Unit attribution, Severity flags and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: NPS and star ratings | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Topic and aspect-sentiment model with safety flagging and trend alerting, plus LLM-written summaries with citations | chosen | Meets the run-window envelope at $0.413 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Issues resolved) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels from star ratings only.
- Evaluation trap: Test data from one language.
- Survey response bias (only extremes respond): only very happy or very unhappy patients respond, skewing the view of service quality.
- Sarcasm and cultural idioms: wrong sentiment.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
