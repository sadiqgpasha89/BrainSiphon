# Alarm Correlation & Root-Cause Grouping

**BrainSiphon worked template** · Telecom & Network Operations · latency tier seconds · advanced

Group the alarms raised by one underlying fault across a multi-vendor network and rank the likely root element, so the NOC works one incident instead of thousands of alarms.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `telecom/alarm-correlation-root-cause-grouping`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Pair precision, shared-value rule | 1.8% |
| Pair precision, weighted model | 100.0% |
| Pair recall, weighted model | 83.4% |
| Cluster purity, weighted model | 100.0% |
| Largest cluster, rule versus model | 341 vs 9 |

## Fit

Adaptable: the `graph` engine implements a neighbouring problem; see FIT.md. Engine: **Entity resolution and link clustering**. A runnable reference for deciding which records belong to the same real-world group from shared attributes: candidate blocking, rarity-weighted pair features, a pair classifier, clustering by connected components and a check on the largest cluster.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Topological distance to the alarm cluster | hop count on the dependency graph |
| Alarm onset order | which alarm in the group fired first within clock tolerance |
| Historical co-occurrence | how often two alarm types appeared together in confirmed incidents |
| Service impact breadth | subscribers or services behind the candidate element |

| Starter feature | What it does |
|---|---|
| shared-value rarity | how many entities share each linking value, so a value shared by three says more than one shared by three hundred |
| number of shared attributes | how many different kinds of value two records share |
| name similarity | character-level overlap of the two names, tolerant of typos |
| group size of the rarest shared value | log of the size of the smallest group the pair shares |
| hub flag | whether a shared value is a known hub |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
