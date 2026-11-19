# models/

`models/registry/` is created at run time (git-ignored). Layout: `<model>/<version>/{model.joblib, manifest.json, requirements.txt}`
and `<model>/index.json` with the production pointer and the promotion history. See `src/bsref/registry.py`.

```bash
cat models/registry/demand-forecaster/index.json              # which version is production, and who promoted it
cat models/registry/demand-forecaster/v0001/manifest.json     # backtest metrics, origins, band scale, lineage, checksum
```

## Model card (fill in for your deployment)

| Item | This reference implementation |
|---|---|
| Intended use | 14-day daily demand forecasts (p10, p50, p90) per product and store, for replenishment and planning |
| Not intended for | New products with under 35 days of history; pricing decisions; financial reporting |
| Training data | Synthetic daily sales from `data/source_system.py`, with promotions, stock-outs, restatements and late feeds |
| Target | Units sold on the target day divided by the series' recent level; stock-out days are excluded as censored |
| Evaluation | Rolling-origin backtest on the 6 newest weekly origins; WAPE, forecast value added, band coverage, bias |
| Known limitations | No hierarchy reconciliation, no intermittent-demand model, no price elasticity; synthetic data is easier than production |
| Human oversight | Series whose forecast moves implausibly are held for a planner; planners can override any series, and overrides are scored |
