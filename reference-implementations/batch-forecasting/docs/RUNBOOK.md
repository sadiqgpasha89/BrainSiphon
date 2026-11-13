# Runbook

Every alert in `monitoring/alerts.yaml` links to a section here. First steps for any alert: open the console (`/ui/`), run
`make monitor` for current values, and read the job logs (JSON lines).

## Roll back a model

```bash
curl -X POST $API/v1/models/rollback -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"<incident reference and what you saw>"}'
make forecast      # writes a new run for the same origin with the restored model; consumers read the newest run
```

## Run stale

No run exists for the newest closed day. Check the scheduler, then run `make forecast`. If it is refused, see input incomplete.
Consumers keep reading the previous run, whose horizon is 14 days, so there is time, but the near days are getting stale.

## Input incomplete

Fewer than 90% of series reported the newest day. Find which stores are missing
(`SELECT store_id, max(day) FROM sales_daily GROUP BY 1`) and chase the feed. Do not lower the threshold to get a run out:
the missing series are rarely random.

## Live error high

Live WAPE is well above the backtest, or the forecast is worse than the baseline. Check, in order: a data fault (units
changed, a store closed, restatements not arriving), an unplanned promotion or event, then genuine drift. Run
`make retrain ARGS=--force`; if the new model also fails its gates, switch consumers to the baseline by rolling back and
escalate to the demand planning lead.

## Band miscalibrated

Coverage of the p10 to p90 band is far from 80%. Safety stock computed from the band is wrong in the same direction.
Retrain (the band scale is refitted on the newest origins).

## Feature drift

`make monitor` prints `worst_drift_feature`. A shift in `promo_share_28d` usually means the promotion calendar changed;
a shift in `stockout_share_28d` is a supply problem, not a model problem.

## Overrides hurting

Planner overrides are, on balance, less accurate than the model they replaced. This is a conversation, not an incident:
show the planners `GET /v1/accuracy` by run, and agree where overrides are warranted.

## Dead letters

An event failed three times. Read `dead_letters.error` and `payload`, fix the cause, re-publish with a new event id.

## Quarantine rate high

The ERP is sending rows that violate the contract. `SELECT violations, count(*) FROM quarantine GROUP BY 1` shows the
pattern. Send the source team the contract and the examples.

## Reviews overdue

Held series have waited past the SLA and consumers are still receiving the baseline for them. Clear the queue in the console.
