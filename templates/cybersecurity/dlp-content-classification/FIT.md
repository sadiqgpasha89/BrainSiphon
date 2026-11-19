# DLP Content Classification: how well the starter fits

> Generated from the blueprint `cybersecurity/dlp-content-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

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

- Score "Precision and recall per data type" and "Latency overhead" instead of the kit metrics
- Replace the kit's models with the blueprint's: Validated pattern detectors plus document-type and NER models with policy engine considering user,…

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Text classification: Classify sensitive content (PII, source code, financial data) in documents and messages to enforce data-loss policies with low false positives | Text classification | match |  |
| label | The class of a piece of text | The class of the whole document, assigned by the person who handled it; documents in one thread share a label | match |  |
| validation | Time and thread-grouped split with a leak-token check | Time and thread-grouped split with a post-hoc leak-token filter and a vocabulary-drift alarm | match |  |
| metrics | Precision and recall per data type; Latency overhead | Honest macro-F1 compared with the optimistic number | adapt | Score "Precision and recall per data type" and "Latency overhead" instead of the kit metrics |
| data | A text corpus with drifting vocabulary and duplicate threads | A text corpus of tickets or documents with duplicate threads and vocabulary drift | match |  |
| model | Baseline: Regex and dictionary DLP policies. Production: Validated pattern detectors plus document-type and NER models with policy engine considering user, destinatio… | TF-IDF with logistic regression | adapt | Replace the kit's models with the blueprint's: Validated pattern detectors plus document-type and NER models with policy engine considering user,… |
| serving | Online decision inside about 100 milliseconds (p99 80 ms) | Offline scripts only: no inference service, queue routing or human-handoff path | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Content capture (endpoint or CASB); Incident feedback (labels) | None. Runs locally on synthetic text | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
