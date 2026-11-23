# Project Health Reporting: capacity and cost at 10 million users

> Generated from the blueprint `engineering/project-health-reporting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Project Health Reporting · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** foundational

The sizing model behind the design, with the inputs exposed so you can replace them with your own traffic. Modelled on-demand list prices; committed-use pricing usually lowers compute.

## Inputs

| Input | Value |
|---|---|
| a | 0.2 |
| k | 20 |
| outcomeUnit | processed document |
| reviewRate | 0.08 |

## Capacity table (modelled)

| Metric | Value | How |
|---|---|---|
| Registered / daily active users | 10.0M / 3.0M | 30% DAU of 10.0M registered |
| Model-touching events per day | 600K | 3.0M DAU × 0.2 events/user/day |
| Required throughput | 83 rows/s | rows per run ÷ 2 h completion window (not a request rate) |
| Rows per run (daily) | 600K | one partition per day |
| Capacity target | 2 h window | finish before downstream consumers start |
| Compute (GPU workers) | 2 | ≈400 rows/s per node, target completion window 2 h |
| Event bus | 12 partitions @ 0.1 MB/s | peak × payload KB; ≤ 5 MB/s per partition, rounded to 6 per AZ-set |
| Online feature store | 3 shards @ 28 lookups/s | peak × 4 entity lookups; ≈80K ops/s per shard |
| Raw data growth | 17.2 GB/day | events × payload × 1.5 (features + decision + label join) |
| Retained (400 days) | 6.7 TB | columnar compression not assumed (conservative) |
| Estimated monthly run cost | $2.0K | compute + 35% platform overhead + cache/bus + storage (on-demand list price) |
| Cost per 1,000 decisions | $0.111 | monthly cost ÷ (events/month ÷ 1000) |
| All-in monthly cost | $2.88M | adds retraining, observability, data transfer, backup/DR and human review to the run cost |
| Cost range (low / expected / high) | $2.31M / $2.88M / $4.32M | low = 0.8× load on committed/spot compute; high = 1.5× load at 20% higher unit prices |
| Cost per processed document | $0.160 | all-in monthly cost ÷ outcomes per month |
| Load scenarios (P50 / P95 / P99) | 2 / 2 / 2 GPU workers | P50: 600K rows; P95: 900K rows; P99: 1.8M rows |

## Assumptions

- 10.0M registered users, 30% daily active; each active user triggers 0.2 model-touching events per day.
- Average payload 20 KB per event across request, features and decision log.
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

- **Hosting:** Models hosted inside the company boundary or on a private endpoint so designs, client data and bid information are not retained by third parties, with a gateway in front of every tool agents can call
- **Compute:** 2 GPU workers for 600,000 rows per run (≈400 rows/s per node, target completion window 2 h); 3 online feature-store shards and 12 event-bus partitions.
- **Data platform:** Lakehouse (Iceberg or Delta) as the system of analytical record, Kafka as the event backbone, an online feature store for batch lookups, and a catalogue with lineage and classification.
- **AI platform:** Feature store, experiment tracking, model registry, signed artifacts and a serving layer (LLM with citations).
- **Deployment:** Kubernetes with GitOps; orchestrated batch jobs (Airflow or Dagster) on autoscaled workers; infrastructure as code; environments dev, staging and production with promotion by evidence.

## Re-run with your numbers

| Input | Blueprint | Yours |
|---|---|---|
| Registered users | 10M | |
| Daily active share | 30% | |
| Events per active user per day | 3 | |
| Peak to average ratio | 6x | |
| Payload per event | 10 KB | |
