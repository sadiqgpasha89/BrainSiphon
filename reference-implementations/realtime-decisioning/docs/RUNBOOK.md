# Runbook

Every alert in `monitoring/alerts.yaml` links to a section here. First steps for any alert: open the console (`/ui/`), run
`make monitor` for current values, and read the API log (JSON lines; filter by `request_id`).

## Roll back a model

```bash
curl -X POST $API/v1/models/rollback -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"<incident reference and what you saw>"}'
```

The previous production version is serving within seconds (no restart). The rollback is written to the registry history and
the audit log. To put a specific version in production: `POST /v1/models/{version}/promote`.

## Fallback rate high

Decisions are coming from the rules, not the model. Check `/readyz` (`production_model`), then the API log for
`model refused`, `model load failed` or `scoring failed`. Usual causes: the registry volume is not mounted, a model was
trained with a different feature list than `features/definitions.yaml`, or the feature fetch is slow (see latency high).
Customers are still served; fraud loss rises while this lasts.

## Block rate high

More payments are blocked than the false-decline budget allows. Check which model version is serving and when it was
promoted; compare `FraudBlockOverturnRateHigh`. If analysts are releasing most blocks, roll back. If blocks are confirmed
fraud, this is an attack: keep the model, add analyst capacity, tell the fraud operations lead.

## Latency high

p99 scoring time is over the deadline. Check the database (the online store is the dominant cost), connection pool
saturation and CPU throttling. The scorer already falls back to rules when the feature fetch exceeds the deadline.

## Feature drift

`make monitor` prints `worst_drift_feature`. Decide whether the world changed (new merchant mix, a new payment rail: retrain)
or the data broke (a field arriving empty or in new units: fix upstream, do not retrain on it). `matured_pr_auc` tells you
whether quality has actually moved.

## Model performance low

PR-AUC on newly matured labels is under the promotion gate. Run `make retrain ARGS=--force`. If the retrained model also
fails its gates it stays a candidate: investigate the labels (are chargebacks arriving?) before anything else.

## Ingestion lag

Online features are stale, so velocity features under-count. Check that the worker is running and the database is healthy.
The consumer is idempotent: restarting it is always safe.

## Dead letters

An event failed three times. Read `dead_letters.error` and `payload`. Fix the cause, then re-publish the payload to the
topic with a new event id. Never delete a dead letter without understanding it.

## Quarantine rate high

The source is sending events that violate the contract. `SELECT violations, count(*) FROM quarantine GROUP BY 1` shows the
pattern. This is the source team's incident: send them the contract and the examples.

## Reviews overdue

Blocked payments are waiting past the SLA. The customers concerned are still declined. Add reviewers or raise the block
threshold through a reviewed configuration change, not by hand.
