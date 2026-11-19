# Longevity & Mortality Forecasting

**BrainSiphon worked template** · Banking, Financial Services & Insurance · latency tier batch · staff-principal

Forecast mortality improvement by age and cohort for pension and annuity pricing and reserving.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `bfsi/longevity-and-mortality-forecasting`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| WAPE at 7 days, model | 11.8% |
| WAPE at 7 days, seasonal baseline | 20.5% |
| Forecast value added at 7 days | 42.2% |
| 90th-percentile band coverage | 88.7% |
| Error at SKU level versus aggregate | 12.4% vs 2.5% |

## Fit

Adaptable: the `forecast` engine implements a neighbouring problem; see FIT.md. Engine: **Multi-horizon forecasting from an origin snapshot**. A runnable reference for forecasting many series at several horizons with origin-safe features, quantile boosting, forecast value added against a seasonal baseline, censored demand and late feeds.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Age-period-cohort effects | decomposition of log mortality into age, period and cohort terms |
| Population improvement | national mortality improvement rate by age band over the last 10 years |
| Portfolio experience ratio | actual deaths divided by expected deaths for the portfolio |
| Cause-of-death mix | share of deaths due to cardiovascular disease and cancer by age |

| Starter feature | What it does |
|---|---|
| recent level and momentum | mean of the last 7 and 28 days and their ratio, known at the forecast origin |
| same-weekday history | values on the same weekday in previous weeks |
| leading indicator | what is already booked or ordered for the target day at the origin |
| planned events | promotion and external-signal flags for the target day, as published at the origin |
| missing-days count | how many of the recent days are missing in the feed |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
