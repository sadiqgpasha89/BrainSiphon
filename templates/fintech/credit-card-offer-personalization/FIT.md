# Credit Card Offer Personalisation: how well the starter fits

> Generated from the blueprint `fintech/credit-card-offer-personalization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `recommender` (Next-item ranking from sessions) · **Fit:** adaptable · **Problem type:** `personalised-ranking`

The `recommender` engine implements a neighbouring problem. This use case is `personalised-ranking`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

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

- Replace leave-last-out next-click evaluation with the use case's own relevance signal (purchase, conversion, engagement or profit-weighted outcome) and its time split
- Add user and context features, and a candidate-generation stage if the catalogue is too large to score in full
- Keep the bot and dwell filtering, the time split and the coverage measurement unchanged
- Score "Offer ranking NDCG on profit-weighted conversions" and "Approval-rate calibration" instead of the kit metrics
- Replace the synthetic data (Sessions, items, clicks, dwell time and bots) with data of the shape this use case has; rename every column and keep the generator's trap tests
- Replace the kit's models with the blueprint's: Two-stage: eligibility service then multi-objective ranker (take-up, approval, profit) with explora…

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Personalised ranking: Show each customer the card or reward offer with the highest expected lifetime value subject to eligibility and risk policy | Next-item recommendation from sessions | adapt | The kit implements next-item recommendation from sessions; this use case is personalised ranking. Only the reusable parts carry over (see the modifications) |
| label | A ranked list of items per user and context, judged by the user's later actions | No separate label: for each test session the prefix of clicks is the input and the final click is the target (leave-last-out) | adapt | Define the label this use case really has before writing any code; the kit label does not describe it |
| validation | Time split by user with a ranking evaluation on held-out interactions | Time split by session with a leave-last-out protocol; sessions under three clicks are skipped | adapt | Use the validation method named here, not the kit split, which is built for the kit label |
| metrics | Offer ranking NDCG on profit-weighted conversions; Approval-rate calibration | Hit rate at 20, mean reciprocal rank and catalogue coverage | adapt | Score "Offer ranking NDCG on profit-weighted conversions" and "Approval-rate calibration" instead of the kit metrics |
| data | User, item and context interactions with exposure logs | Anonymous browsing sessions of item clicks, with dwell time and bot traffic | adapt | Replace the synthetic data (Sessions, items, clicks, dwell time and bots) with data of the shape this use case has; rename every column and keep the generator's trap tests |
| model | Baseline: Rules by segment (spend profile, credit tier). Production: Two-stage: eligibility service then multi-objective ranker (take-up, approval, profit) with exploration, serv… | Popularity, co-visitation, ordered transitions and a theme-aware model | adapt | Replace the kit's models with the blueprint's: Two-stage: eligibility service then multi-objective ranker (take-up, approval, profit) with explora… |
| serving | Online decision inside about 100 milliseconds (p99 80 ms) | Offline evaluation only: no retrieval index, session store, re-ranker or latency path | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Feature lookup (online store); Display API (response); Outcome events (attribution) | None. Runs locally on synthetic sessions | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
