# Home Search Ranking: capacity and cost at 10 million users

> Generated from the blueprint `real-estate/home-search-ranking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Home Search Ranking · **Domain:** real-estate · **Latency tier:** sub-100ms · **Difficulty:** advanced

The sizing model behind the design, with the inputs exposed so you can replace them with your own traffic. Modelled on-demand list prices; committed-use pricing usually lowers compute.

## Inputs

| Input | Value |
|---|---|
| a | 15 |
| k | 6 |
| outcomeUnit | ranked slate |

## Capacity table (modelled)

| Metric | Value | How |
|---|---|---|
| Registered / daily active users | 10.0M / 3.0M | 30% DAU of 10.0M registered |
| Model-touching events per day | 45.0M | 3.0M DAU × 15 events/user/day |
| Average throughput | 520.8 req/s | events/day ÷ 86,400 |
| Peak throughput | 3,125 req/s | average × 6 (diurnal + event spikes) |
| Provisioned capacity | 4,688 req/s | peak × 1.5 so any one of three regions can fail |
| Compute (GPUs (L4/L40S class)) | 8 | ≈600 ranked requests/s per GPU (1,500 candidates per request, batched, fp16) |
| Event bus | 12 partitions @ 18.3 MB/s | peak × payload KB; ≤ 5 MB/s per partition, rounded to 6 per AZ-set |
| Online feature store | 3 shards @ 13K lookups/s | peak × 4 entity lookups; ≈80K ops/s per shard |
| Raw data growth | 386.2 GB/day | events × payload × 1.5 (features + decision + label join) |
| Retained (400 days) | 150.9 TB | columnar compression not assumed (conservative) |
| Estimated monthly run cost | $19.2K | compute + 35% platform overhead + cache/bus + storage (on-demand list price) |
| Cost per 1,000 decisions | $0.014 | monthly cost ÷ (events/month ÷ 1000) |
| All-in monthly cost | $22.5K | adds retraining, observability, data transfer, backup/DR to the run cost |
| Cost range (low / expected / high) | $12.4K / $22.5K / $39.2K | low = 0.8× load on committed/spot compute; high = 1.5× load at 20% higher unit prices |
| Cost per ranked slate | $0.000017 | all-in monthly cost ÷ outcomes per month |
| Load scenarios (P50 / P95 / P99) | 6 / 6 / 8 GPUs (L4/L40S class) | P50: 416.7 req/s; P95: 1,875 req/s; P99: 3,125 req/s |

## Assumptions

- 10.0M registered users, 30% daily active; each active user triggers 15 model-touching events per day.
- Average payload 6 KB per event across request, features and decision log.
- Peak = 6× average; the stateless inference plane runs in three active-active regions sized so losing one still serves peak (×1.5).
- Unit prices are indicative on-demand list prices; committed-use or spot discounts typically cut compute 30–60%.
- Retraining, observability, data transfer and backup are modelled shares of the run cost, not measurements; replace them with your own cadence, retention and tariffs.

## Bottlenecks to expect

- Candidate set size × feature width sets GPU memory and PCIe transfer cost — shrink with a cheap pre-ranker.
- Embedding table size — shard tables across GPUs / host memory and quantise.
- Hot keys: a handful of entities (celebrity users, big merchants, flagship SKUs) can concentrate load — shard by a salted key and cache aggressively.
- Thundering herd after a deploy or cache flush — warm caches before shifting traffic and add jittered TTLs.

## Resilience

- The inference plane is active-active across three regions, each sized to absorb one failure; tenant cells fail over independently so one tenant's incident is not everyone's.
- Every model and feature set is versioned and signed; rollback is a pointer flip that finishes in under a minute.
- Per-tenant and per-key quotas plus load shedding (reject early, cheap) protect the SLO of well-behaved callers.
- Circuit breakers per dependency with the degradation ladder defined in LLD; chaos drills quarterly (kill feature store, kill model tier, inject 500 ms latency).
- Capacity and cost are SLOs too: alert on cost per 1,000 decisions and GPU/CPU saturation, not only on latency.

## Where it runs

- **Hosting:** Public cloud with tenant cells per brokerage or portfolio; edge gateways in buildings for BMS data
- **Compute:** 8 GPUs (L4/L40S class) for 4,688 req/s (≈600 ranked requests/s per GPU (1,500 candidates per request, batched, fp16)); 3 online feature-store shards and 12 event-bus partitions.
- **Data platform:** Lakehouse (Iceberg or Delta) as the system of analytical record, Kafka as the event backbone, an online feature store for millisecond reads, and a catalogue with lineage and classification.
- **AI platform:** Feature store, experiment tracking, model registry, signed artifacts and a serving layer (gradient boosting ranker).
- **Deployment:** Kubernetes with GitOps; blue-green for the serving plane, shadow then canary for models; infrastructure as code; environments dev, staging and production with promotion by evidence.

## Re-run with your numbers

| Input | Blueprint | Yours |
|---|---|---|
| Registered users | 10M | |
| Daily active share | 30% | |
| Events per active user per day | 3 | |
| Peak to average ratio | 6x | |
| Payload per event | 10 KB | |
