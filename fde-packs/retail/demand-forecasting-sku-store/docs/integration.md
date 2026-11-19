# SKU-store demand forecasting: integration and migration

The forecast is an input to **replenishment and purchasing**. The storefront and search are not its consumers. Everything below is
built around that workflow.

## 1. Systems, and the source of truth for each fact

| Fact | Source of truth | Read by | Typical connector | Alternatives |
|------|-----------------|---------|-------------------|--------------|
| SKU, product hierarchy, status (active, discontinued) | Merchandise system: SAP material master (MARA/MARC) or Oracle Retail item master (RMS `ITEM_MASTER`) | master-data reconciliation | `oracle` (`config/oracle-retail.connector.json`) or `sap-odata` | Salesforce Commerce, a PIM |
| Store, format, region, time zone, trading week | Store master in the merchandise system | calendar | same | Workforce system's location table (check it agrees) |
| Sales as transacted | POS transaction log (not a reporting cube) | demand history | nightly extract to object storage (`config/pos-sales.connector.json`) | Oracle Xstore, NCR, Toshiba, Square, OMS API for e-commerce |
| Inventory availability | Warehouse management and the store stock ledger (on-hand, available-to-promise, in-transit) | stock-out correction, replenishment position | `sap-odata` (`config/sap-stock.connector.json`), WMS export | Manhattan, Blue Yonder, Oracle WMS |
| Price and promotion calendar | Pricing and promotion system | covariates | file drop or API | Spreadsheet owned by category management (put it under change control first) |
| Open purchase orders, lead times, pack sizes, MOQ | Procurement / ERP | replenishment proposal | `sap-odata` (PO items) | Coupa, Oracle Retail RPM/RMS |
| Supplier constraints | Supplier master / portal | order proposal checks | EDI 855/856 acknowledgements, portal export | none: ask the buyer |
| Workforce and store operations | Workforce management | optional features (store hours, labour constraints) | `wfm` connector of the BFSI pack pattern | |

Reconcile identifiers first (`master_data.py`): SAP pads material numbers, POS sends GTINs, RMS uses item ids with suffixes. Unmatched POS
items, duplicate GTINs, invalid check digits, discontinued items still selling and closed stores still reporting are reported, not dropped.

## 2. The nightly batch path (no Kafka, no real-time endpoint)

```
POS / WMS extracts --> inputs/<date>/sales|stock/*.jsonl + _SUCCESS --> [forecast job] --> outputs/<date>/forecast/part-* + _SUCCESS --> replenishment
```

`pipeline.run_nightly` refuses an input partition without its manifest, corrects stock-outs, calls the forecaster, validates **every** row against
the output contract, and only then publishes parts followed by the manifest. A bad row publishes nothing. `config/airflow_dag.py` is the
orchestration skeleton (sensors on the manifests, retries, SLA, one active run, idempotent by run date). Use the customer's orchestrator.

## 3. Demand is not sales

- **Stock-outs.** `censoring.correct_day` estimates unconstrained demand from the share of the trading day the item was available (hourly profile), falls
  back to the item's weekday median when too little of the day was available, and says which method it used. `lost_sales_report` values the loss.
- **Promotions, markdowns, price changes.** Carry them as covariates from the pricing calendar with start and end dates; a promotion not in the calendar is the usual
  override reason (`promo_not_in_calendar`) and must feed back into the calendar owner's backlog.
- **Returns and cancellations.** Subtract returns on the *return* date, not the sale date, in a separate column; never net them into history silently. Cancelled orders never entered demand.
- **New products.** `cold_start.py`: a peer prior (median of the closest peers on category, price band, region and format), blended with the item's own history as weeks accumulate,
  with a wider interval while the weight on own history is low. The output row carries `cold_start: true`.
- **Discontinued products.** A discontinued SKU with remaining stock gets a sell-through forecast and is excluded from replenishment; a discontinued SKU with sales is reported.
- **New stores and closures.** A new store borrows a peer-store prior (same format and region). A closure, refit or holiday is an explicit zero row with a reason, from the store calendar.
- **Assortment changes and regional holidays.** The assortment table (which SKUs a store ranges) is an input: a SKU outside a store's range has no row, not a zero.
- **Calendars, time zones, units.** `calendar.py`: the forecast date is the store-local business date; stores have their own trading week, holidays, closures and business-day cutoff; quantities are
  converted to the base unit with the item's pack size.

## 4. Output contract and how it is consumed

| Field | Meaning |
|-------|---------|
| `sku`, `store` | Canonical ids after reconciliation |
| `forecast_date` | Store-local business date |
| `horizon_days` | Days ahead from the run date |
| `predicted_units`, `p10`, `p50`, `p90` | Base-unit quantity and interval; `p10 <= predicted <= p90` is enforced |
| `model_version`, `run_id`, `generated_at` | Provenance |
| `cold_start`, `trading_day`, `override` | Flags: new item or store, closed day, planner override with who and why |

Replenishment: `contract.replenishment_proposal` turns the forecast into a purchase-order **proposal**: demand over lead time plus review period, safety stock from the
interval, minus on-hand and on-order, rounded to the pack size and minimum order. The status is `proposed` and it needs buyer approval. Creating the order in SAP or Oracle Retail is the customer's process.

## 5. Versioning, planner overrides, approval and feedback

- Every run is `run_id` + `model_version`; consumers read a run only when its manifest exists and its checksum verifies (`verify_manifest`).
- A planner can override a value for a reason from a fixed list. A change within 25% is recorded and auto-approved; above 25% needs a second person; above 50% goes to the category manager.
  The approver cannot be the proposer. An unapproved override is never applied (`OverrideLog`).
- Overrides and the actuals that follow are the feedback: report forecast accuracy **with and without** the override to see whether planners add value, per planner, per category, per reason.

## 6. Migration from the current process

| Step | What | Exit criterion |
|------|------|----------------|
| 1. Inventory the current process | Who forecasts today, in what tool, at what level, how often; which orders depend on it | One page the planners agree with |
| 2. Backtest | Run the new forecast on the last 12 months and compare with the current forecast at SKU-store, SKU-region and category level, with and without stock-out correction | Accuracy and bias reported per category; planners have seen the worst misses |
| 3. Parallel run, no consumption | Publish forecasts every night next to the current ones for four to eight weeks | Daily accuracy tracked; no operational dependency yet |
| 4. Category pilot | One category in a region uses the new forecast for replenishment proposals; buyers still approve every order | In-stock rate and waste not worse than control stores; buyers' override rate known |
| 5. Widen | Add categories in the order of expected benefit and data quality | Same guardrails per wave |
| 6. Retire the old process | Remove it only after two full seasonal comparisons if the business is seasonal | Sign-off from the demand-planning head |
| Always | Rollback = switch the category back to the previous forecast feed; keep it running for a quarter after cutover | Rehearsed once |

## 7. Customer discovery questions specific to this use case

1. Which system owns the SKU master, and do POS and e-commerce use the same ids? Show a mismatch example.
2. At what level do buyers order (SKU-store, SKU-DC, case, layer) and how often? What are the cut-off times?
3. How are promotions planned, who owns the calendar, and how late can it change?
4. How is availability recorded: hourly snapshots, end-of-day, or not at all? What does the shelf-capacity gap look like?
5. How are returns, cancellations, substitutions and click-and-collect recorded?
6. What do planners override today, and how often are they right?
7. Which suppliers have fixed days, minimums or capacity limits the order proposal must respect?
