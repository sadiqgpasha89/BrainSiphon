# Move-Out Damage Assessment from Photos: how well the starter fits

> Generated from the blueprint `real-estate/move-out-damage-assessment-from-photos` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `cv` (Image classification with shortcut and site-shift checks) · **Fit:** adaptable · **Problem type:** `vision-detection-segmentation`

The `cv` engine implements a neighbouring problem. This use case is `vision-detection-segmentation`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

## Traps the synthetic data plants

- A shortcut the model can learn
- Carrying a threshold across sites unchecked
- Splitting images instead of items
- Judging only on the training site

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make before you rely on it

- Replace image-level labels with box or mask annotations, and score mAP, IoU or Dice, and per-finding sensitivity, instead of per-image AUC
- Replace pooled local-contrast features with a detector or segmentation model fine-tuned on the use case's images
- Keep the split by physical item, the lighting-shortcut check and the site-shift threshold carry-over
- Score "Detection F1" and "Cost error" instead of the kit metrics
- Replace the synthetic data (Images, items, defects, sites and lighting) with data of the shape this use case has; rename every column and keep the generator's trap tests
- Replace the kit's models with the blueprint's: Alignment, change detection and damage grading with wear rules, cost estimates and a reviewer

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Detection and segmentation in images: Compare move-in and move-out photos to identify damage beyond normal wear and estimate repair cost for deposit decisions | Image classification | adapt | The kit implements image classification; this use case is detection and segmentation in images. Only the reusable parts carry over (see the modifications) |
| label | Where in an image the objects, defects or structures are (boxes or masks) | An image is positive when it contains the finding (a defect, a lesion, a tampered region); labels are per image and images of one item share a group | adapt | Define the label this use case really has before writing any code; the kit label does not describe it |
| validation | Split by physical item or patient, with overlap-based scoring | Split by physical item with a shortcut test and a site-to-site operating-threshold check | adapt | Use the validation method named here, not the kit split, which is built for the kit label |
| metrics | Detection F1; Cost error | AUC and false-alarm rate at a fixed threshold across sites | adapt | Score "Detection F1" and "Cost error" instead of the kit metrics |
| data | Images with box, mask or keypoint annotations | Small synthetic images with a lighting shortcut and two capture sites | adapt | Replace the synthetic data (Images, items, defects, sites and lighting) with data of the shape this use case has; rename every column and keep the generator's trap tests |
| model | Baseline: Manager walk-through with a checklist, because it is the norm. Production: Alignment, change detection and damage grading with wear rules, cost estimates and a reviewer | Pixel baseline against pooled local-contrast features | adapt | Replace the kit's models with the blueprint's: Alignment, change detection and damage grading with wear rules, cost estimates and a reviewer |
| serving | Interactive response in seconds (p99 2500 ms) | Offline scripts only: no camera ingest, edge runtime or latency path | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Photo capture (inspection app); Reviewer (web): a person in the loop; Report (PDF) | None. Runs locally on generated images | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
