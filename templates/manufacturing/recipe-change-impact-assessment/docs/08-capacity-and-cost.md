# Recipe Change Impact Assessment: capacity and cost at 10 million users

> Generated from the blueprint `manufacturing/recipe-change-impact-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Recipe Change Impact Assessment · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

The sizing model behind the design, with the inputs exposed so you can replace them with your own traffic. Modelled on-demand list prices; committed-use pricing usually lowers compute.

## Inputs

| Input | Value |
|---|---|
| a | 0.02 |
| k | 15 |
| outcomeUnit | scored record |
| reviewRate | 0.01 |

## Capacity table (modelled)

| Metric | Value | How |
|---|---|---|
| Registered / daily active users | 10.0M / 3.0M | 30% DAU of 10.0M registered |
| Model-touching events per day | 60K | 3.0M DAU × 0.02 events/user/day |
| Required throughput | 8 rows/s | rows per run ÷ 2 h completion window (not a request rate) |
| Rows per run (daily) | 60K | one partition per day |
| Capacity target | 2 h window | finish before downstream consumers start |
| Compute (8-vCPU Spark executors) | 2 | ≈40K rows/s per node, target completion window 2 h |
| Event bus | 12 partitions @ 0 MB/s | peak × payload KB; ≤ 5 MB/s per partition, rounded to 6 per AZ-set |
| Online feature store | 3 shards @ 3 lookups/s | peak × 4 entity lookups; ≈80K ops/s per shard |
| Raw data growth | 1.3 GB/day | events × payload × 1.5 (features + decision + label join) |
| Retained (400 days) | 0.5 TB | columnar compression not assumed (conservative) |
| Estimated monthly run cost | $1.6K | compute + 35% platform overhead + cache/bus + storage (on-demand list price) |
| Cost per 1,000 decisions | $0.904 | monthly cost ÷ (events/month ÷ 1000) |
| All-in monthly cost | $37.6K | adds retraining, observability, data transfer, backup/DR and human review to the run cost |
| Cost range (low / expected / high) | $30.4K / $37.6K / $55.7K | low = 0.8× load on committed/spot compute; high = 1.5× load at 20% higher unit prices |
| Cost per scored record | $0.021 | all-in monthly cost ÷ outcomes per month |
| Load scenarios (P50 / P95 / P99) | 2 / 2 / 2 8-vCPU Spark executors | P50: 60K rows; P95: 90K rows; P99: 180K rows |

## Assumptions

- 10.0M registered users, 30% daily active; each active user triggers 0.02 model-touching events per day.
- Average payload 15 KB per event across request, features and decision log.
- One daily partition; runs must finish inside a 2-hour window so downstream consumers are never blocked.
- Unit prices are indicative on-demand list prices; committed-use or spot discounts typically cut compute 30–60%.
- Retraining, observability, data transfer and backup are modelled shares of the run cost, not measurements; replace them with your own cadence, retention and tariffs.

## Bottlenecks to expect

- Shuffle and skew in the largest joins — salt hot keys, broadcast small dimensions, partition by date and entity.
- Small-files and metadata pressure on the lakehouse — compact and Z-order on a schedule.
- Hot keys: a handful of entities (celebrity users, big merchants, flagship SKUs) can concentrate load — shard by a salted key and cache aggressively.

## Resilience

- Three active-active regions; the global load balancer shifts traffic on health and SLO burn, and each region is sized to absorb one failure.
- Every model and feature set is versioned and signed; rollback is a pointer flip that finishes in under a minute.
- Per-tenant and per-key quotas plus load shedding (reject early, cheap) protect the SLO of well-behaved callers.
- Backfills and reruns are first-class: idempotent partitions, lineage in the manifest, and a dry-run mode that diffs against production outputs.
- Data contracts with upstream owners: schema changes must pass a compatibility check before they reach the lake.

## Where it runs

- **Hosting:** Edge-first: inference runs on plant-level edge servers beside the lines for latency and resilience, with a central cloud or data centre for training, fleet analytics and model management across plants
- **Compute:** 2 8-vCPU Spark executors for 60,000 rows per run (≈40K rows/s per node, target completion window 2 h); 3 online feature-store shards and 12 event-bus partitions.
- **Data platform:** Lakehouse (Iceberg or Delta) as the system of analytical record, Kafka as the event backbone, an online feature store for batch lookups, and a catalogue with lineage and classification.
- **AI platform:** Feature store, experiment tracking, model registry, signed artifacts and a serving layer (causal model).
- **Deployment:** Kubernetes with GitOps; orchestrated batch jobs (Airflow or Dagster) on autoscaled workers; infrastructure as code; environments dev, staging and production with promotion by evidence.

## Re-run with your numbers

| Input | Blueprint | Yours |
|---|---|---|
| Registered users | 10M | |
| Daily active share | 30% | |
| Events per active user per day | 3 | |
| Peak to average ratio | 6x | |
| Payload per event | 10 KB | |
