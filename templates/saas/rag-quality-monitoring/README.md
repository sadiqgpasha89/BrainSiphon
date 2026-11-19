# RAG Quality Monitoring in Production

**BrainSiphon worked template** · SaaS & Product · latency tier batch · advanced

Monitor retrieval relevance, groundedness and user outcomes of RAG apps in production, spotting content gaps and regressions.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `saas/rag-quality-monitoring`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Pass rate v1, strict judge | 16.3% |
| Pass rate v1, fuzzy judge | 50.9% |
| Pass rate v2, fuzzy judge | 61.5% |
| v2 minus v1, 95% interval | 10.6% (2.5% to 18.7%) |
| Judge agreement (kappa) | 0.32 |

## Fit

Adaptable: the `generative` engine implements a neighbouring problem; see FIT.md. Engine: **Evaluating generated or specialised output with a golden set and two judges**. A golden set of checkable items, stand-ins for two generator versions with controlled failure rates, a strict and a fuzzy judge, their agreement, and bootstrap intervals on the difference; replace the stand-in with your model.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Retrieval hit rate on judged queries | gold passage in top-k |
| Groundedness rate | answers supported by retrieved text |
| Unanswerable-query rate | queries with no relevant doc |

| Starter feature | What it does |
|---|---|
| key facts | the entity, amount and date every output must contain |
| constraints | length and forbidden claims |
| strict judge | exact canonical strings |
| fuzzy judge | any valid format |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
