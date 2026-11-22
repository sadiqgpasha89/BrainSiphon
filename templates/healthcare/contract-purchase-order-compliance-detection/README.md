# Contract vs Purchase Order Compliance Detection

**BrainSiphon worked template** · Healthcare & Life Sciences · latency tier batch · advanced

Detect purchase orders that violate contracted price, supplier, volume, term, approval or purchasing-channel conditions by extracting contract terms and testing each order line against them.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `healthcare/contract-purchase-order-compliance-detection`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Macro-F1, rules on their own layout | 1.000 |
| Macro-F1, rules on an unseen layout | 0.000 |
| Macro-F1, tagger on seen layouts | 1.000 |
| Macro-F1, tagger on an unseen layout | 0.500 |
| Macro-F1 after 30 labelled documents of the new layout | 1.000 |

## Fit

Exact: the `extraction` engine implements this problem type. Engine: **Information extraction with a layout the model has never seen**. Layout-specific rules against a token tagger on invoices in three layouts, one of them unseen in training; reports per-field F1, the drop on the new layout and how far a few labelled documents recover it.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Price variance to schedule | order price minus contracted price for the item and tier |
| Channel and supplier match | whether supplier and channel match the contract |
| Volume tier position | cumulative volume against tier thresholds |
| Approval chain completeness | required approvals present |

| Starter feature | What it does |
|---|---|
| token shape | capitalisation and digit pattern of a token |
| neighbouring words | the words before and after, which carry the layout |
| line position | where in the document the token sits |
| field rules | layout-specific regular expressions |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
