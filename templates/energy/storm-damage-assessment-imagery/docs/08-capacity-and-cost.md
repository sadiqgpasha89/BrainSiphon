# Storm Damage Assessment from Imagery: capacity and cost at 10 million users

> Generated from the blueprint `energy/storm-damage-assessment-imagery` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Storm Damage Assessment from Imagery · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

The sizing model behind the design, with the inputs exposed so you can replace them with your own traffic. Modelled on-demand list prices; committed-use pricing usually lowers compute.

## Inputs

| Input | Value |
|---|---|
| a | 10 |
| k | 500 |
| outcomeUnit | analysed frame or image |
| reviewRate | 0.02 |

## Capacity table (modelled)

| Metric | Value | How |
|---|---|---|
| Registered / daily active users | 10.0M / 3.0M | 30% DAU of 10.0M registered |
| Model-touching events per day | 30.0M | 3.0M DAU × 10 events/user/day |
| Required throughput | 4,167 rows/s | rows per run ÷ 2 h completion window (not a request rate) |
| Rows per run (daily) | 30.0M | one partition per day |
| Capacity target | 2 h window | finish before downstream consumers start |
| Compute (GPU workers) | 11 | ≈400 rows/s per node, target completion window 2 h |
| Event bus | 36 partitions @ 169.5 MB/s | peak × payload KB; ≤ 5 MB/s per partition, rounded to 6 per AZ-set |
| Online feature store | 3 shards @ 1,389 lookups/s | peak × 4 entity lookups; ≈80K ops/s per shard |
| Raw data growth | 21K GB/day | events × payload × 1.5 (features + decision + label join) |
| Retained (400 days) | 8,381.9 TB | columnar compression not assumed (conservative) |
| Estimated monthly run cost | $197.7K | compute + 35% platform overhead + cache/bus + storage (on-demand list price) |
| Cost per 1,000 decisions | $0.220 | monthly cost ÷ (events/month ÷ 1000) |
| All-in monthly cost | $36.26M | adds retraining, observability, data transfer, backup/DR and human review to the run cost |
| Cost range (low / expected / high) | $29.01M / $36.26M / $54.46M | low = 0.8× load on committed/spot compute; high = 1.5× load at 20% higher unit prices |
| Cost per analysed frame or image | $0.040 | all-in monthly cost ÷ outcomes per month |
| Load scenarios (P50 / P95 / P99) | 11 / 16 / 32 GPU workers | P50: 30.0M rows; P95: 45.0M rows; P99: 90.0M rows |

## Assumptions

- 10.0M registered users, 30% daily active; each active user triggers 10 model-touching events per day.
- Average payload 500 KB per event across request, features and decision log.
- One daily partition; runs must finish inside a 2-hour window so downstream consumers are never blocked.
- Unit prices are indicative on-demand list prices; committed-use or spot discounts typically cut compute 30–60%.
- Retraining, observability, data transfer and backup are modelled shares of the run cost, not measurements; replace them with your own cadence, retention and tariffs.

## Bottlenecks to expect

- GPU utilisation in short bursty windows — use spot pools and checkpoint every N batches so preemption is cheap.
- Data loading from object storage — shard files to ≥ 128 MB and prefetch.
- Hot keys: a handful of entities (celebrity users, big merchants, flagship SKUs) can concentrate load — shard by a salted key and cache aggressively.

## Resilience

- Three active-active regions; the global load balancer shifts traffic on health and SLO burn, and each region is sized to absorb one failure.
- Every model and feature set is versioned and signed; rollback is a pointer flip that finishes in under a minute.
- Per-tenant and per-key quotas plus load shedding (reject early, cheap) protect the SLO of well-behaved callers.
- Backfills and reruns are first-class: idempotent partitions, lineage in the manifest, and a dry-run mode that diffs against production outputs.
- Data contracts with upstream owners: schema changes must pass a compatibility check before they reach the lake.

## Where it runs

- **Hosting:** Hybrid: inference for control-room advice runs inside the operational network with a read-only data diode from SCADA, while training, forecasting and customer analytics run in the enterprise cloud
- **Compute:** 11 GPU workers for 30,000,000 rows per run (≈400 rows/s per node, target completion window 2 h); 3 online feature-store shards and 36 event-bus partitions.
- **Data platform:** Lakehouse (Iceberg or Delta) as the system of analytical record, Kafka as the event backbone, an online feature store for batch lookups, and a catalogue with lineage and classification.
- **AI platform:** Feature store, experiment tracking, model registry, signed artifacts and a serving layer (vision model).
- **Deployment:** Kubernetes with GitOps; orchestrated batch jobs (Airflow or Dagster) on autoscaled workers; infrastructure as code; environments dev, staging and production with promotion by evidence.

## Re-run with your numbers

| Input | Blueprint | Yours |
|---|---|---|
| Registered users | 10M | |
| Daily active share | 30% | |
| Events per active user per day | 3 | |
| Peak to average ratio | 6x | |
| Payload per event | 10 KB | |
