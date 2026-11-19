# Collections Propensity & Next-Best-Action: capacity and cost at 10 million users

> Generated from the blueprint `fintech/collections-propensity-and-next-best-action` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Collections Propensity & Next-Best-Action · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

The sizing model behind the design, with the inputs exposed so you can replace them with your own traffic. Modelled on-demand list prices; committed-use pricing usually lowers compute.

## Inputs

| Input | Value |
|---|---|
| a | 0.3 |
| k | 3 |
| outcomeUnit | planned entity |

## Capacity table (modelled)

| Metric | Value | How |
|---|---|---|
| Registered / daily active users | 10.0M / 3.0M | 30% DAU of 10.0M registered |
| Model-touching events per day | 900K | 3.0M DAU × 0.3 events/user/day |
| Required throughput | 125 rows/s | rows per run ÷ 2 h completion window (not a request rate) |
| Rows per run (daily) | 900K | one partition per day |
| Capacity target | 2 h window | finish before downstream consumers start |
| Compute (8-vCPU Spark executors) | 2 | ≈40K rows/s per node, target completion window 2 h |
| Event bus | 12 partitions @ 0 MB/s | peak × payload KB; ≤ 5 MB/s per partition, rounded to 6 per AZ-set |
| Online feature store | 3 shards @ 42 lookups/s | peak × 4 entity lookups; ≈80K ops/s per shard |
| Raw data growth | 3.9 GB/day | events × payload × 1.5 (features + decision + label join) |
| Retained (400 days) | 1.5 TB | columnar compression not assumed (conservative) |
| Estimated monthly run cost | $1.6K | compute + 35% platform overhead + cache/bus + storage (on-demand list price) |
| Cost per 1,000 decisions | $0.061 | monthly cost ÷ (events/month ÷ 1000) |
| All-in monthly cost | $1.7K | adds retraining, observability, data transfer, backup/DR to the run cost |
| Cost range (low / expected / high) | $1.6K / $1.7K / $1.7K | low = 0.8× load on committed/spot compute; high = 1.5× load at 20% higher unit prices |
| Cost per planned entity | $0.000062 | all-in monthly cost ÷ outcomes per month |
| Load scenarios (P50 / P95 / P99) | 2 / 2 / 2 8-vCPU Spark executors | P50: 900K rows; P95: 1.4M rows; P99: 2.7M rows |

## Assumptions

- 10.0M registered users, 30% daily active; each active user triggers 0.3 model-touching events per day.
- Average payload 3 KB per event across request, features and decision log.
- One daily partition; runs must finish inside a 2-hour window so downstream consumers are never blocked.
- Unit prices are indicative on-demand list prices; committed-use or spot discounts typically cut compute 30–60%.
- Retraining, observability, data transfer and backup are modelled shares of the run cost, not measurements; replace them with your own cadence, retention and tariffs.

## Bottlenecks to expect

- Shuffle and skew in the largest joins — salt hot keys, broadcast small dimensions, partition by date and entity.
- Small-files and metadata pressure on the lakehouse — compact and Z-order on a schedule.
- Hot keys: a handful of entities (celebrity users, big merchants, flagship SKUs) can concentrate load — shard by a salted key and cache aggressively.

## Resilience

- The stateless inference plane is active-active across three regions and each is sized to absorb one failure; the state plane is pinned per jurisdiction with a synchronous in-country standby and fenced failover.
- Every model and feature set is versioned and signed; rollback is a pointer flip that finishes in under a minute.
- Per-tenant and per-key quotas plus load shedding (reject early, cheap) protect the SLO of well-behaved callers.
- Backfills and reruns are first-class: idempotent partitions, lineage in the manifest, and a dry-run mode that diffs against production outputs.
- Data contracts with upstream owners: schema changes must pass a compatibility check before they reach the lake.

## Where it runs

- **Hosting:** Hybrid: card and UPI data stays in an in-country private or sovereign-region cloud; training, experimentation and non-regulated analytics run in the public cloud on tokenised data
- **Compute:** 2 8-vCPU Spark executors for 900,000 rows per run (≈40K rows/s per node, target completion window 2 h); 3 online feature-store shards and 12 event-bus partitions.
- **Data platform:** Lakehouse (Iceberg or Delta) as the system of analytical record, Kafka as the event backbone, an online feature store for batch lookups, and a catalogue with lineage and classification.
- **AI platform:** Feature store, experiment tracking, model registry, signed artifacts and a serving layer (GBDT T-learner).
- **Deployment:** Kubernetes with GitOps; orchestrated batch jobs (Airflow or Dagster) on autoscaled workers; infrastructure as code; environments dev, staging and production with promotion by evidence.

## Re-run with your numbers

| Input | Blueprint | Yours |
|---|---|---|
| Registered users | 10M | |
| Daily active share | 30% | |
| Events per active user per day | 3 | |
| Peak to average ratio | 6x | |
| Payload per event | 10 KB | |
