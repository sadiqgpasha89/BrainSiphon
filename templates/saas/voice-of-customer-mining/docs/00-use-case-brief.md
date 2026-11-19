# Voice-of-Customer Mining: use-case brief

> Generated from the blueprint `saas/voice-of-customer-mining` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Voice-of-Customer Mining · **Domain:** saas · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Turn tickets, reviews, calls and surveys into ranked themes, sentiment and feature requests tied to revenue impact. The system has to run as a scheduled batch job, inside these limits: Multi-source dedup, PII handling and Theme stability.

**Why it is hard.** The obvious approach is count mentions, and it fails because loud small customers can dominate. The second trap is in "Stability": the real signal is stable taxonomy with drift handling, while teams usually reach for re-clustering each time.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way time to detect emerging issues measures it.

**What success looks like.** Offline: Topic coherence and labelling accuracy and Sentiment F1. Online: Roadmap decisions informed and Time to detect emerging issues. The launch is judged on "Roadmap decisions informed" while "Time to detect emerging issues" must not get worse.

## Objective, loss and constraints

**Business objective.** Turn tickets, reviews, calls and surveys into ranked themes, sentiment and feature requests tied to revenue impact.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{topic}}+\lambda\,\mathrm{CE}_{\text{sentiment}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{topic}} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |

**Hard constraints**

- Multi-source dedup
- PII handling
- Theme stability
- Revenue weighting

## The approach in one paragraph

Start with manual tagging and spreadsheets. Then earn the move to embedding-based topic taxonomy with LLM labelling, aspect sentiment and revenue-weighted prioritisation, and only if it beats the baseline on Topic coherence and labelling accuracy and Sentiment F1 after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Theme volume trend | Mentions over time. Emerging issues. Guard against: taxonomy. |
| Add Revenue-weighted impact | ARR of accounts mentioning. Priority. Guard against: cRM join. |
| Add Sentiment by theme | Aspect-based sentiment. Severity. Guard against: model. |
| Run it as one pipeline | Sources (ticketing surveys calls), PII redaction (NER), Topic assignment (embeddings), Aspect sentiment (transformer), Revenue weighting (CRM join), Product manager dashboard (BI) and Roadmap decisions (human). |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle taxonomy drift as product changes | Versioned taxonomy and mapping tables. |

**Deliberately not doing**

- Text length: weak.
- Channel: bias.

**How the approach is proven**

Prove it offline on Topic coherence and labelling accuracy and Sentiment F1 using time-ordered splits, then online on "Roadmap decisions informed" with "Time to detect emerging issues" as the guardrail. Watch for: Mention counts as importance and Evaluating topics without human review.

## Baseline and production design

- **Baseline (build this first):** Manual tagging and spreadsheets.
- **Production design:** Embedding-based topic taxonomy with LLM labelling, aspect sentiment and revenue-weighted prioritisation.

## Why AI, and why this kind

**Why AI.** Turn tickets, reviews, calls and surveys into ranked themes, sentiment and feature requests tied to revenue impact. The evidence that separates good from bad outcomes (Theme volume trend, Revenue-weighted impact, Sentiment by theme) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "count mentions" are what teams reach for first, and they fail because loud small customers can dominate. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Embedding-based topic taxonomy with LLM labelling, aspect sentiment and revenue-weighted prioritisation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Theme volume trend, Revenue-weighted impact, Sentiment by theme and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual tagging and spreadsheets | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Embedding-based topic taxonomy with LLM labelling, aspect sentiment and revenue-weighted prioritisation | chosen | Meets the run-window envelope at $0.207 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Roadmap decisions informed) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Mention counts as importance.
- Evaluation trap: Evaluating topics without human review.
- Taxonomy drift as product changes: themes drift as the product changes, so trend lines break and comparisons become meaningless.
- One loud customer submits hundreds of tickets: a single noisy customer inflates a theme and distorts the priority ranking.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
