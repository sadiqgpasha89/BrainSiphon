# Loan Hardship Case Triage: how well the starter fits

> Generated from the blueprint `bfsi/loan-hardship-case-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `nlp` (Text classification with leakage and drift checks) · **Fit:** adaptable · **Problem type:** `text-classification`

The `nlp` engine implements a neighbouring problem. This use case is `text-classification`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

## Traps the synthetic data plants

- A random split with the leak token present
- Copies of the same text on both sides of the split
- Using a field written after the label
- Freezing a model and not watching vocabulary

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make before you rely on it

- Replace the kit's models with the blueprint's: Multilingual encoder for hardship category and vulnerability cues combined with tabular urgency fea…

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Text classification: Route incoming hardship requests to the right treatment and priority, quickly and fairly, while spotting customers in vulnerable circumstances | Text classification | match |  |
| label | The class of a piece of text | The class of the whole document, assigned by the person who handled it; documents in one thread share a label | match |  |
| validation | Time and thread-grouped split with a leak-token check | Time and thread-grouped split with a post-hoc leak-token filter and a vocabulary-drift alarm | match |  |
| metrics | Macro-F1 per category and language; Recall of vulnerability cues | Honest macro-F1 compared with the optimistic number | match |  |
| data | A text corpus with drifting vocabulary and duplicate threads | A text corpus of tickets or documents with duplicate threads and vocabulary drift | match |  |
| model | Baseline: Keyword routing with a form dropdown and a manual queue, because it is the current practice. Production: Multilingual encoder for hardship category and vulnerability cues combined with tabular urgency features, a h… | TF-IDF with logistic regression | adapt | Replace the kit's models with the blueprint's: Multilingual encoder for hardship category and vulnerability cues combined with tabular urgency fea… |
| serving | Interactive response in seconds (p99 2500 ms) | Offline scripts only: no inference service, queue routing or human-handoff path | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Intake channel gateway (web form and email parser); Specialist case queue (case management tool): a person in the loop; Outcome feedback (lakehouse) | None. Runs locally on synthetic text | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
