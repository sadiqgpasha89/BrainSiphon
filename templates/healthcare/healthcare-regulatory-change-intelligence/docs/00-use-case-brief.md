# Healthcare Regulatory Change Intelligence: use-case brief

> Generated from the blueprint `healthcare/healthcare-regulatory-change-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Regulatory Change Intelligence · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Monitor approved official publications and identify changes that may apply to the organisation's jurisdiction, facility type and service lines, giving compliance experts cited change summaries, effective dates and a review queue. The system has to run as a scheduled batch job, inside these limits: Compliance or legal experts confirm interpretation and applicability and the system only drafts and ranks, Only approved official sources are ingested and every summary cites source, version and date and Source freshness is tracked and stale sources are flagged.

**Why it is hard.** The obvious approach is open web search, and it fails because unofficial summaries can be wrong or outdated. The second trap is in "Change": the real signal is diff against the prior version of the same source, while teams usually reach for summary of the new text alone.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $2.1K a month. A mistake is expensive in the way relevant changes missed measures it.

**What success looks like.** Offline: Change-detection recall on seeded amendments, Citation precision and unsupported-claim rate and Applicability-candidate recall at the review capacity. Online: Time from publication to review, Relevant changes missed and Reviewer time per change. The launch is judged on "Time from publication to review" while "Relevant changes missed" must not get worse.

## Objective, loss and constraints

**Business objective.** Monitor approved official publications and identify changes that may apply to the organisation's jurisdiction, facility type and service lines, giving compliance experts cited change summaries, effective dates and a review queue.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{source text})+\lambda\,\mathrm{Calibration}`

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
| \text{source text} | The retrieved passages of the approved official sources, at the stated version, that the summary must be grounded in. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Compliance or legal experts confirm interpretation and applicability and the system only drafts and ranks
- Only approved official sources are ingested and every summary cites source, version and date
- Source freshness is tracked and stale sources are flagged
- The system abstains where the text is unclear
- Documents are untrusted input
- Monitors 1.2K sources daily

## The approach in one paragraph

Start with a compliance analyst reads publisher newsletters and a manual tracker. Then earn the move to scheduled ingestion from approved sources into a versioned store, structural and semantic change detection, hybrid retrieval and an LLM that drafts cited change summaries with applicability candidates, routed to expert review, and only if it beats the baseline on Change-detection recall on seeded amendments and Citation precision and unsupported-claim rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Text diff magnitude | Semantic and structural change between versions of a requirement. Separates substantive from editorial changes. Guard against: version pairs. |
| Add Applicability match | Overlap between requirement scope and the organisation's metadata. Ranks the review queue. Guard against: metadata as at review. |
| Add Effective-date proximity | Days to the stated effective date. Sets urgency. Guard against: stated in the source. |
| Run it as one pipeline | Source ingestion (scheduled fetchers), Versioned document store (object store with lineage), Change detector (structural and semantic diff), Applicability candidate ranker (rules with embeddings), Cited summary drafter (LLM) and Citation and source guard (citation verifier), with Compliance expert review and Decision and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle source republished with a new URL | Source identity table with lineage. |

**Deliberately not doing**

- Press coverage volume: not authority.
- Document length: not significance.
- Publication layout: formatting.

**How the approach is proven**

Prove it offline on Change-detection recall on seeded amendments, Citation precision and unsupported-claim rate and Applicability-candidate recall at the review capacity using time-ordered splits, then online on "Time from publication to review" with "Relevant changes missed" as the guardrail. Watch for: Using unofficial sources as authority, Summarising without a prior-version diff and Letting the system decide applicability.

## Baseline and production design

- **Baseline (build this first):** A compliance analyst reads publisher newsletters and a manual tracker.
- **Production design:** Scheduled ingestion from approved sources into a versioned store, structural and semantic change detection, hybrid retrieval and an LLM that drafts cited change summaries with applicability candidates, routed to expert review.

## Why AI, and why this kind

**Why AI.** Monitor approved official publications and identify changes that may apply to the organisation's jurisdiction, facility type and service lines, giving compliance experts cited change summaries, effective dates and a review queue. The evidence that separates good from bad outcomes (Text diff magnitude, Applicability match, Effective-date proximity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "open web search" are what teams reach for first, and they fail because unofficial summaries can be wrong or outdated. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Scheduled ingestion from approved sources into a versioned store, structural and semantic change detection, hybrid retrieval and an LLM that drafts cited change summaries with applicability candidates, routed to expert review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Text diff magnitude, Applicability match, Effective-date proximity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A compliance analyst reads publisher newsletters and a manual tracker | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Scheduled ingestion from approved sources into a versioned store, structural and semantic change detection, hybrid retrieval and an LLM that drafts cited change summaries with applicability candidates, routed to expert review | chosen | Meets the run-window envelope at $1.16 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time from publication to review) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using unofficial sources as authority.
- Evaluation trap: Summarising without a prior-version diff.
- Source republished with a new URL: the change looks like a new document.
- Pending rule not yet effective: applicability is premature.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
