# Child-Safe Content Filtering: how well the starter fits

> Generated from the blueprint `edtech/child-safe-content-filtering` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `nlp` (Text classification with leakage and drift checks) · **Fit:** exact · **Problem type:** `text-classification`

The `nlp` engine implements this problem type (`text-classification`) as it is. Its synthetic data, split, metrics and tests are the ones this use case needs, with your signals mapped onto the engine's features.

## Traps the synthetic data plants

- A random split with the leak token present
- Copies of the same text on both sides of the split
- Using a field written after the label
- Freezing a model and not watching vocabulary

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make

None required for the mechanics. Replace the synthetic generator with your extract, and keep the split, the leakage tests and the gates.

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Text classification: Filter text, images and chat in learning environments for age-inappropriate and unsafe content, with low over-blocking of educational material | Text classification | match |  |
| label | The class of a piece of text | The class of the whole document, assigned by the person who handled it; documents in one thread share a label | match |  |
| validation | Time and thread-grouped split with a leak-token check | Time and thread-grouped split with a post-hoc leak-token filter and a vocabulary-drift alarm | match |  |
| metrics | Per-category precision and recall; Over-blocking rate on curriculum content | Honest macro-F1 compared with the optimistic number | match |  |
| data | A text corpus with drifting vocabulary and duplicate threads | A text corpus of tickets or documents with duplicate threads and vocabulary drift | match |  |
| model | Baseline: Keyword blocklists and manual moderation. Production: Multimodal classifiers with age-band thresholds, educational-context scoring and a safeguarding escalation pi… | TF-IDF with logistic regression | match |  |
| serving | Online decision inside about 100 milliseconds (p99 80 ms) | Offline scripts only: no inference service, queue routing or human-handoff path | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Safeguarding queue (trained staff): a person in the loop; Parent and teacher controls (settings): a person in the loop; Audit log (compliance) | None. Runs locally on synthetic text | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
