# Session-Based Next-Item Recommendation: use-case brief

> Generated from the blueprint `retail/session-based-next-item-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Session-Based Next-Item Recommendation · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** A shopper opens a product page and clicks through four or five items. They may be logged out, on a first visit, or unwilling to be tracked across sites, so the only information is what they have done in the last few minutes. The shelf below the product should show what they are likely to want next, and it should change after every click: a browser looking at three sofas wants a fourth sofa or a cushion, a buyer who just added a charger wants a cable. The system keeps a small state per session, scores it within 50 milliseconds and returns a ranked list that has already been filtered for stock and business rules.

**Why it is hard.** Order matters, and a bag-of-items method throws it away, so it cannot tell browsing from buying. Offline evaluation is easy to fool: a random session split lets one day's sale popularity sit on both sides, uniform random negatives make ranking look easier than it is, and a hit rate alone ignores whether the whole catalogue is ever shown. The click data are polluted by crawlers that walk the catalogue in id order and produce transitions that look as strong as real shoppers. And the recommendation is only worth anything if the item can be bought: a top-ranked product that is out of stock sends the shopper away.

**Scale and stakes.** With 10 million registered and 3 million daily active users the system handles about 36 million recommendation requests a day, 417 per second on average and 2,500 at peak, provisioned for 3,750 with seven L4 or L40S class GPUs. It costs roughly $15.4K a month, or $0.014 per thousand requests. The money is on the other side: click-through and add-to-cart on this shelf are a meaningful share of revenue on a large catalogue, and a worse list quietly lowers both without ever raising an error.

**What success looks like.** Offline, hit rate at 20 and mean reciprocal rank on a time-split, leave-last-out evaluation, with catalogue coverage reported next to them so a popularity-only model does not win. Online, the launch is judged on click-through on the recommendations, with add-to-cart rate as the guardrail that shows the clicks are real interest. The response comes back inside 50 ms, works with a single click of history, and respects the privacy constraint of no cross-site tracking.

## Objective, loss and constraints

**Business objective.** Recommend the next item for anonymous or logged-in sessions in real time, using only in-session behaviour when history is absent.

**Training objective.** `\mathcal{L}=-\sum_t\log\frac{e^{s(h_t,i_{t+1})}}{\sum_j e^{s(h_t,j)}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| e^{s(h_t,i_{t+1})} | Euler's number (about 2.718), the base of the exponential function. |

**Hard constraints**

- Works for anonymous users
- State updated per click
- 50 ms
- Privacy-friendly (no cross-site tracking)

## The approach in one paragraph

Begin with item-to-item co-visitation counts, which are fast, explainable and strong on short sessions, and make the sequence model earn its place. A causal transformer encodes the last 20 interactions into a vector, an approximate nearest-neighbour index retrieves candidates, and a business re-ranker applies stock, margin and diversity before the shopper sees anything. The whole thing is judged on a time-split that preserves what the system could have known, with coverage reported beside accuracy.

**Moves**

| Move | Detail |
|---|---|
| Clean the clicks before counting them | Filter bots and crawlers first, using request patterns and sequential-id walks, because every statistic below is built from the same events and a crawler can create transitions as strong as real behaviour. |
| Encode order, not just membership | Encode the last 20 interactions with a causal transformer, add dwell time and scroll depth after bot filtering, a session-theme share computed from the prefix only, and transition recency decayed by event time. |
| Train against hard negatives | Use sampled softmax with popularity-corrected negatives, since uniform negatives are too easy, and evaluate on leave-last-out with the training cut-off before the test window. |
| Retrieve fast, re-rank for business | Look up candidates with an HNSW index on the session vector, then re-rank by live stock, margin, diversity and any promotions, backfilling from the next candidates whenever an item is filtered out. |
| Handle the short and the cold session on purpose | With one click, fall back to category-level transitions plus popularity within the category, and switch to the sequence model as soon as there are enough interactions to carry a signal. |
| Keep popularity fresh | Feed near-real-time popularity features and an index refresh from the click stream so a flash sale appears in candidates within minutes. |

**Deliberately not doing**

- Use the session identifier or the total clicks in a session: the identifier is arbitrary and the click total is confounded with browsing style.
- Use raw click counts per item as a signal: they are dominated by crawlers and promotions, not genuine interest.
- Evaluate with random session splits or uniform random negatives: both flatter the model and hide the popularity shift that real traffic brings.
- Track shoppers across sites: the privacy constraint rules it out, and in-session behaviour is enough for this problem.

**How the approach is proven**

Offline, beat co-visitation counts on hit rate at 20 and mean reciprocal rank on a time-split, with catalogue coverage at least as good, and read the worst-performing categories by hand. Online, run an experiment with sessions randomly assigned and measure click-through on recommendations and add-to-cart rate, plus a stock-bounce check on the displayed list, widening only while add-to-cart moves with click-through.

## Baseline and production design

- **Baseline (build this first):** Item-to-item co-visitation counts.
- **Production design:** Causal transformer (SASRec-style) with in-memory session state, ANN lookup and business re-rank; retrained daily.

## Why AI, and why this kind

**Why AI.** Recommend the next item for anonymous or logged-in sessions in real time, using only in-session behaviour when history is absent. The evidence that separates good from bad outcomes (Last-k item embeddings, Dwell and scroll depth, Session goal inference) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "bag-of-items co-occurrence that ignores click order" are what teams reach for first, and they fail because order distinguishes browsing from buying intent. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Causal transformer (SASRec-style) with in-memory session state, ANN lookup and business re-rank; retrained daily.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Last-k item embeddings, Dwell and scroll depth, Session goal inference and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Item-to-item co-visitation counts | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Causal transformer (SASRec-style) with in-memory session state, ANN lookup and business re-rank; retrained daily | chosen | Meets the 80 ms envelope at $0.014 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Click-through on recommendations) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Bot traffic generates random or sequential-id sessions that pollute transition statistics and degrade recommendations for everyone.
- A sale changes item popularity within minutes, and candidate sets built from yesterday's data become stale.
- A session with a single click has no prefix to learn from, so a sequence model produces confident nonsense.
- The top candidate is out of stock when displayed, shoppers bounce, and the model is blamed for it.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
