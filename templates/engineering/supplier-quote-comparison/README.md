# Supplier Quote Comparison

**BrainSiphon worked template** · Engineering & Product Design · latency tier seconds · foundational

Normalise supplier quotes on scope, exclusions, units and terms and show a like-for-like comparison with gaps highlighted for buyers to negotiate and decide.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `engineering/supplier-quote-comparison`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Line items and units | quoted scope and quantities |
| Exclusions and assumptions | what is not included |
| Commercial terms | payment, warranty and validity |
| Supplier history | performance on past work |

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
