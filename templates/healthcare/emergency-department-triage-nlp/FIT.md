# ED Triage Acuity Assistant: how well the starter fits

> Generated from the blueprint `healthcare/emergency-department-triage-nlp` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

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

- Score "Under-triage rate at fixed over-triage" and "Weighted kappa" instead of the kit metrics
- Replace the kit's models with the blueprint's: Ordinal gradient-boosted model with transformer-encoded complaint text, asymmetric loss and a nurse…

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Text classification: Suggest ESI acuity levels from triage notes, vitals and history to reduce under-triage and variability between nurses | Text classification | match |  |
| label | The class of a piece of text | The class of the whole document, assigned by the person who handled it; documents in one thread share a label | match |  |
| validation | Time and thread-grouped split with a leak-token check | Time and thread-grouped split with a post-hoc leak-token filter and a vocabulary-drift alarm | match |  |
| metrics | Under-triage rate at fixed over-triage; Weighted kappa | Honest macro-F1 compared with the optimistic number | adapt | Score "Under-triage rate at fixed over-triage" and "Weighted kappa" instead of the kit metrics |
| data | A text corpus with drifting vocabulary and duplicate threads | A text corpus of tickets or documents with duplicate threads and vocabulary drift | match |  |
| model | Baseline: Manual ESI assignment. Production: Ordinal gradient-boosted model with transformer-encoded complaint text, asymmetric loss and a nurse-facing ex… | TF-IDF with logistic regression | adapt | Replace the kit's models with the blueprint's: Ordinal gradient-boosted model with transformer-encoded complaint text, asymmetric loss and a nurse… |
| serving | Interactive response in seconds (p99 2500 ms) | Offline scripts only: no inference service, queue routing or human-handoff path | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | No external system beyond the data source | None. Runs locally on synthetic text | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
