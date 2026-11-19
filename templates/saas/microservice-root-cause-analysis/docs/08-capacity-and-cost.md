# Microservice Root-Cause Analysis: capacity and cost at 10 million users

> Generated from the blueprint `saas/microservice-root-cause-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Microservice Root-Cause Analysis · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** staff-principal

The sizing model behind the design, with the inputs exposed so you can replace them with your own traffic. Modelled on-demand list prices; committed-use pricing usually lowers compute.

## Inputs

| Input | Value |
|---|---|
| a | 5 |
| k | 20 |
| outcomeUnit | decision |

## Capacity table (modelled)

| Metric | Value | How |
|---|---|---|
| Registered / daily active users | 10.0M / 3.0M | 30% DAU of 10.0M registered |
| Model-touching events per day | 15.0M | 3.0M DAU × 5 events/user/day |
| Average throughput | 173.6 req/s | events/day ÷ 86,400 |
| Peak throughput | 1,042 req/s | average × 6 (diurnal + event spikes) |
| Provisioned capacity | 1,563 req/s | peak × 1.5 so any one of three regions can fail |
| Compute (8-vCPU pods) | 6 | ≈800 scores/s per pod (cached neighbourhood embeddings + light head) |
| Event bus | 12 partitions @ 20.3 MB/s | peak × payload KB; ≤ 5 MB/s per partition, rounded to 6 per AZ-set |
| Online feature store | 3 shards @ 4,167 lookups/s | peak × 4 entity lookups; ≈80K ops/s per shard |
| Raw data growth | 429.2 GB/day | events × payload × 1.5 (features + decision + label join) |
| Retained (400 days) | 167.6 TB | columnar compression not assumed (conservative) |
| Estimated monthly run cost | $7.4K | compute + 35% platform overhead + cache/bus + storage (on-demand list price) |
| Cost per 1,000 decisions | $0.017 | monthly cost ÷ (events/month ÷ 1000) |
| All-in monthly cost | $8.8K | adds retraining, observability, data transfer, backup/DR to the run cost |
| Cost range (low / expected / high) | $6.7K / $8.8K / $13.3K | low = 0.8× load on committed/spot compute; high = 1.5× load at 20% higher unit prices |
| Cost per decision | $0.000020 | all-in monthly cost ÷ outcomes per month |
| Load scenarios (P50 / P95 / P99) | 6 / 6 / 6 8-vCPU pods | P50: 138.9 req/s; P95: 625 req/s; P99: 1,042 req/s |

## Assumptions

- 10.0M registered users, 30% daily active; each active user triggers 5 model-touching events per day.
- Average payload 20 KB per event across request, features and decision log.
- Peak = 6× average; the stateless inference plane runs in three active-active regions sized so losing one still serves peak (×1.5).
- Unit prices are indicative on-demand list prices; committed-use or spot discounts typically cut compute 30–60%.
- Retraining, observability, data transfer and backup are modelled shares of the run cost, not measurements; replace them with your own cadence, retention and tariffs.

## Bottlenecks to expect

- Multi-hop neighbourhood expansion explodes on hub nodes — cap fan-out and precompute embeddings off the request path.
- Graph store memory and replication lag — stale edges are tolerable, cross-region transactions are not.
- Hot keys: a handful of entities (celebrity users, big merchants, flagship SKUs) can concentrate load — shard by a salted key and cache aggressively.
- Thundering herd after a deploy or cache flush — warm caches before shifting traffic and add jittered TTLs.

## Resilience

- The inference plane is active-active across three regions, each sized to absorb one failure; tenant cells fail over independently so one tenant's incident is not everyone's.
- Every model and feature set is versioned and signed; rollback is a pointer flip that finishes in under a minute.
- Per-tenant and per-key quotas plus load shedding (reject early, cheap) protect the SLO of well-behaved callers.
- Per-request budgets (steps, tokens, dollars) are enforced in the gateway so a runaway session cannot become a cost incident.
- Evaluation harness replays a frozen golden set on every prompt / model / tool change; regressions block release.

## Where it runs

- **Hosting:** Public cloud, cell-based multi-tenant deployment with region pinning and dedicated cells for the largest or regulated tenants
- **Compute:** 6 8-vCPU pods for 1,563 req/s (≈800 scores/s per pod (cached neighbourhood embeddings + light head)); 3 online feature-store shards and 12 event-bus partitions.
- **Data platform:** Lakehouse (Iceberg or Delta) as the system of analytical record, Kafka as the event backbone, an online feature store for millisecond reads, and a catalogue with lineage and classification.
- **AI platform:** Feature store, experiment tracking, model registry, signed artifacts and a serving layer (time series).
- **Deployment:** Kubernetes with GitOps; blue-green for the serving plane, shadow then canary for models; infrastructure as code; environments dev, staging and production with promotion by evidence.

## Re-run with your numbers

| Input | Blueprint | Yours |
|---|---|---|
| Registered users | 10M | |
| Daily active share | 30% | |
| Events per active user per day | 3 | |
| Peak to average ratio | 6x | |
| Payload per event | 10 KB | |
