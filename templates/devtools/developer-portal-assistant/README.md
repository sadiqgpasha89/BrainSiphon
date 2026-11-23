# Internal Developer Portal Assistant

**BrainSiphon worked template** · Developer Tools & Software Delivery · latency tier seconds · foundational

Answer questions about services, owners, dependencies and standards from the service catalogue and docs, and create tickets or scaffold templates through approved workflows.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `devtools/developer-portal-assistant`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Hallucination rate, naive | 100.0% |
| Hallucination rate, guarded | 0.0% |
| Answered precision, naive | 60.4% |
| Answered precision, guarded | 100.0% |
| Answerable questions it declined, guarded | 41.7% |

## Fit

Exact: the `llm-rag` engine implements this problem type. Engine: **Retrieval-augmented answering with a verifier**. A runnable reference for answering questions from a document collection: versioned chunks, hybrid retrieval, a source filter, an intent check, a verifier that requires the cited passage to contain the value, abstention and a golden set with unanswerable questions held out by product.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Catalogue match | the service the question is about |
| Ownership and on-call | owner and rotation |
| Template eligibility | whether a template applies |
| Doc freshness | last update |

| Starter feature | What it does |
|---|---|
| source type | reference, tutorial or changelog, so factual answers come only from reference pages |
| version | the version the user is on, from context first and the question second |
| intent | what fact the question asks for, so the system can abstain when none is documented |
| retrieval score | keyword plus similarity rank fusion over chunks |
| supporting passage | the passage that must literally contain the stated value |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
