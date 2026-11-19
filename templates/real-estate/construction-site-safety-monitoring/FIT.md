# Construction Site Safety Monitoring: how well the starter fits

> Generated from the blueprint `real-estate/construction-site-safety-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `cv` (Image classification with shortcut and site-shift checks) · **Fit:** exact · **Problem type:** `vision-classification`

The `cv` engine implements this problem type (`vision-classification`) as it is. Its synthetic data, split, metrics and tests are the ones this use case needs, with your signals mapped onto the engine's features.

## Traps the synthetic data plants

- A shortcut the model can learn
- Carrying a threshold across sites unchecked
- Splitting images instead of items
- Judging only on the training site

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make

None required for the mechanics. Replace the synthetic generator with your extract, and keep the split, the leakage tests and the gates.

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Image classification: Detect missing PPE, exclusion-zone entries and unsafe equipment proximity from site cameras and alert supervisors | Image classification | match |  |
| label | Whether an image (or region) contains a finding, labelled per image | An image is positive when it contains the finding (a defect, a lesion, a tampered region); labels are per image and images of one item share a group | match |  |
| validation | Split by physical item or patient, with checks across sites and devices | Split by physical item with a shortcut test and a site-to-site operating-threshold check | match |  |
| metrics | Recall of hazards; Precision | AUC and false-alarm rate at a fixed threshold across sites | match |  |
| data | Images with per-image labels from several sites or devices | Small synthetic images with a lighting shortcut and two capture sites | match |  |
| model | Baseline: Periodic manual inspections, because they are required. Production: Detection and tracking with zone logic, persistence rules and supervisor alerts | Pixel baseline against pooled local-contrast features | match |  |
| serving | Interactive response in seconds (p99 2500 ms) | Offline scripts only: no camera ingest, edge runtime or latency path | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Review log (store): a person in the loop | None. Runs locally on generated images | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
