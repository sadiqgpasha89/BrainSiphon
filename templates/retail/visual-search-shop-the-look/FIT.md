# Visual Search & Shop-the-Look: how well the starter fits

> Generated from the blueprint `retail/visual-search-shop-the-look` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `recommender` (Next-item ranking from sessions) · **Fit:** adaptable · **Problem type:** `search-ranking`

The `recommender` engine implements a neighbouring problem. This use case is `search-ranking`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

## Traps the synthetic data plants

- Counting every click as a human signal
- Treating the session as a bag of items
- Splitting sessions at random
- Choosing a heavy model before measuring headroom

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make before you rely on it

- Add a query: the kit has none, so add query-product retrieval (lexical and semantic) before the ranker and index the catalogue
- Replace next-click labels with graded relevance from human judgements or position-debiased click logs, and evaluate with NDCG on those judgements
- Add multi-objective ranking (relevance, conversion, margin, sponsored or business rules) and a debiasing method for position
- Keep the time split, the bot filtering and the coverage measurement unchanged
- Score "Recall@10 on user-photo query set" and "Attribute accuracy of top results" instead of the kit metrics
- Replace the synthetic data (Sessions, items, clicks, dwell time and bots) with data of the shape this use case has; rename every column and keep the generator's trap tests
- Replace the kit's models with the blueprint's: Detector plus metric-learning embeddings (ViT) with domain-adapted pairs, HNSW/IVF-PQ index sharded…

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Search and query-document ranking: Let shoppers photograph or upload an image and retrieve visually matching sellable items, including per-garment matches in a scene | Next-item recommendation from sessions | adapt | The kit implements next-item recommendation from sessions; this use case is search and query-document ranking. Only the reusable parts carry over (see the modifications) |
| label | Graded relevance of documents or products for a query | No separate label: for each test session the prefix of clicks is the input and the final click is the target (leave-last-out) | adapt | Define the label this use case really has before writing any code; the kit label does not describe it |
| validation | Query-grouped evaluation on human relevance judgements or position-debiased clicks | Time split by session with a leave-last-out protocol; sessions under three clicks are skipped | adapt | Use the validation method named here, not the kit split, which is built for the kit label |
| metrics | Recall@10 on user-photo query set; Attribute accuracy of top results | Hit rate at 20, mean reciprocal rank and catalogue coverage | adapt | Score "Recall@10 on user-photo query set" and "Attribute accuracy of top results" instead of the kit metrics |
| data | Queries, candidates, relevance judgements and click logs | Anonymous browsing sessions of item clicks, with dwell time and bot traffic | adapt | Replace the synthetic data (Sessions, items, clicks, dwell time and bots) with data of the shape this use case has; rename every column and keep the generator's trap tests |
| model | Baseline: Whole-image CNN embeddings with ANN retrieval. Production: Detector plus metric-learning embeddings (ViT) with domain-adapted pairs, HNSW/IVF-PQ index sharded across no… | Popularity, co-visitation, ordered transitions and a theme-aware model | adapt | Replace the kit's models with the blueprint's: Detector plus metric-learning embeddings (ViT) with domain-adapted pairs, HNSW/IVF-PQ index sharded… |
| serving | Online decision inside about 100 milliseconds (p99 80 ms) | Offline evaluation only: no retrieval index, session store, re-ranker or latency path | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Image upload (mobile SDK); ANN search (sharded IVF-PQ) | None. Runs locally on synthetic sessions | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
