# Unauthorised Construction Detection from Imagery

**BrainSiphon worked template** · Public Sector & Government · latency tier batch · advanced

Compare aerial and satellite images over time to find new structures and changes that have no permit, and send the list to inspectors for verification.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `public-sector/unauthorised-construction-detection`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| AUC at a new site, pixels model | 0.955 |
| False-positive rate at a new site using the old threshold | 100.0% |
| AUC at a new site, contrast-augmented | 0.801 |
| False-positive rate at a new site, contrast-augmented | 4.3% |

## Fit

Exact: the `cv` engine implements this problem type. Engine: **Image classification with shortcut and site-shift checks**. A runnable reference for image classification and defect detection: a pixel baseline that learns a lighting shortcut, pooled local-contrast features that do not, split by physical item, and an operating threshold carried from one site to another.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Building footprint change | new or enlarged footprints between dates |
| Permit match | whether a permit exists for the parcel |
| Image quality and date gap | resolution and time between images |
| Parcel type and zone | use class |

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
