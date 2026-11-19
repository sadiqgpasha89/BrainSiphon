# Pack: SKU-Store Demand Forecasting (Retail)

The integration around the forecast: how sales, stock and calendars get in, how a demand estimate is corrected for stock-outs, what the output
contract looks like, and how it becomes a reviewed purchase proposal. **Batch and object storage first.**

```bash
cd fde-packs/retail/demand-forecasting-sku-store
python3 -m pytest tests -q        # 13 tests, including the nightly run against an S3-shaped mock
```

| File | What it is |
|------|------------|
| `src/forecast_integration/censoring.py` | Stock-out correction and lost-sales estimate with the method named on every row |
| `src/forecast_integration/master_data.py` | SKU and store reconciliation; the declared source of truth per fact |
| `src/forecast_integration/calendar.py` | Store-local business dates, closures, holidays, units of measure |
| `src/forecast_integration/contract.py` | Output schema, manifest, planner overrides with approval, replenishment proposal |
| `src/forecast_integration/cold_start.py` | Peer priors, blending, interval widening for new SKUs and stores |
| `src/forecast_integration/pipeline.py` | The nightly batch run: manifest-gated input, validated output, atomic publish |
| `config/*.connector.json` | SAP stock and material, Oracle Retail item master, POS sales drop (framework adapters) |
| `config/airflow_dag.py` | Orchestration skeleton |
| `docs/integration.md` | Systems and source of truth, demand-versus-sales rules, contract, overrides, migration plan |

The forecasting model itself is behind `forecast_fn`. Not covered: a real SAP or Oracle Retail system, the customer's POS, and their replenishment tool; the docs say what to ask each owner.
