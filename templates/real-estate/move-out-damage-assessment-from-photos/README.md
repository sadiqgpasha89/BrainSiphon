# Move-Out Damage Assessment from Photos

**BrainSiphon worked template** · Real Estate & PropTech · latency tier seconds · advanced

Compare move-in and move-out photos to identify damage beyond normal wear and estimate repair cost for deposit decisions.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `real-estate/move-out-damage-assessment-from-photos`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

## What is in this folder

| Path | What it is |
|---|---|
| `WORKED_EXAMPLE.md` | A walk-through of the starter's real results, step by step |
| `FIT.md` | How well the starter fits this use case, and what to change |
| `docs/00` to `docs/08` | Brief, discovery workbook, delivery plan, data spec, evaluation plan, risk register, runbook, model and data cards, capacity and cost |
| `contracts/` | OpenAPI, AsyncAPI, data contract and reference SQL |
| `deployment/` | Serving configuration, Helm overrides sized from the capacity model, and a compose file for the starter |
| `starter/` | Runnable code on synthetic data, its tests and gates, and `results.json` from the last run |

## Run it in two minutes

```bash
cd starter
make setup      # a virtualenv with the pinned libraries
make demo       # runs the worked example and writes results.json
make test       # reproduces results.json and checks every gate
```

## Headline results from the last run

| Result | Value |
|---|---|
| AUC at the training site, pixels model | 1.000 |
| AUC at a new site, pixels model | 0.952 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.766 |
| False-positive rate at a new site, contrast-augmented | 5.2% |

## Fit

Adaptable: the `cv` engine implements a neighbouring problem; see FIT.md. Engine: **Image classification with shortcut and site-shift checks**. A runnable reference for image classification and defect detection: a pixel baseline that learns a lighting shortcut, pooled local-contrast features that do not, split by physical item, and an operating threshold carried from one site to another.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Change detection | pixel-level difference between aligned move-in and move-out photos after exposure normalisation |
| Damage class | classifier probability for stain, hole, scratch, crack or burn |
| Age of fixture | years since the fixture, flooring or paint was installed or last renewed |
| Repair cost table | local labour and material rates per repair type |

| Starter feature | What it does |
|---|---|
| local contrast | how strongly a region stands out from its neighbourhood |
| pooled maximum | the strongest local contrast anywhere in the image |
| noise-normalised score | contrast divided by the image's own noise level |
| site or device | which scanner or camera produced the image |
| brightness jitter | augmentation that stops the model using overall brightness |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
