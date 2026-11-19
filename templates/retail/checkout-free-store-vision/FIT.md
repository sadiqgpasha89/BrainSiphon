# Checkout-Free Store Vision: how well the starter fits

> Generated from the blueprint `retail/checkout-free-store-vision` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `cv` (Image classification with shortcut and site-shift checks) · **Fit:** adaptable · **Problem type:** `vision-classification`

The `cv` engine implements a neighbouring problem. This use case is `vision-classification`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

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

- Score "Basket-level exact match" and "Item-level precision and recall" instead of the kit metrics
- Replace the kit's models with the blueprint's: Multi-camera tracking with edge fusion of vision, weight and RFID, probabilistic basket reconstruct…

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Image classification: Track shoppers and pick/put events with camera and weight sensors to produce accurate virtual baskets without checkout | Image classification | match |  |
| label | Whether an image (or region) contains a finding, labelled per image | An image is positive when it contains the finding (a defect, a lesion, a tampered region); labels are per image and images of one item share a group | match |  |
| validation | Split by physical item or patient, with checks across sites and devices | Split by physical item with a shortcut test and a site-to-site operating-threshold check | match |  |
| metrics | Basket-level exact match; Item-level precision and recall | AUC and false-alarm rate at a fixed threshold across sites | adapt | Score "Basket-level exact match" and "Item-level precision and recall" instead of the kit metrics |
| data | Images with per-image labels from several sites or devices | Small synthetic images with a lighting shortcut and two capture sites | match |  |
| model | Baseline: Sensor-only smart shelves with manual app checkout. Production: Multi-camera tracking with edge fusion of vision, weight and RFID, probabilistic basket reconstruction and ex… | Pixel baseline against pooled local-contrast features | adapt | Replace the kit's models with the blueprint's: Multi-camera tracking with edge fusion of vision, weight and RFID, probabilistic basket reconstruct… |
| serving | Online decision inside about 100 milliseconds (p99 80 ms) | Offline scripts only: no camera ingest, edge runtime or latency path | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Camera streams (edge cluster); Exception review (remote operators): a person in the loop | None. Runs locally on generated images | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
