# Counterparty Exposure (PFE) Approximation with ML: capacity and cost at 10 million users

> Generated from the blueprint `bfsi/counterparty-exposure-pfe-approximation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Counterparty Exposure (PFE) Approximation with ML · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** staff-principal

The sizing model behind the design, with the inputs exposed so you can replace them with your own traffic. Modelled on-demand list prices; committed-use pricing usually lowers compute.

## Inputs

| Input | Value |
|---|---|
| a | 40 |
| k | 6 |
| outcomeUnit | decision |

## Capacity table (modelled)

| Metric | Value | How |
|---|---|---|
| Registered / daily active users | 10.0M / 3.0M | 30% DAU of 10.0M registered |
| Model-touching events per day | 120M | 3.0M DAU × 40 events/user/day |
| Average throughput | 1,388.9 req/s | events/day ÷ 86,400 |
| Peak throughput | 8,333 req/s | average × 6 (diurnal + event spikes) |
| Provisioned capacity | 13K req/s | peak × 1.5 so any one of three regions can fail |
| Compute (8-vCPU pods) | 6 | ≈2,500 scores/s per pod (GBDT / small NN, features already in memory) |
| Event bus | 12 partitions @ 48.8 MB/s | peak × payload KB; ≤ 5 MB/s per partition, rounded to 6 per AZ-set |
| Online feature store | 3 shards @ 33K lookups/s | peak × 4 entity lookups; ≈80K ops/s per shard |
| Raw data growth | 1,030 GB/day | events × payload × 1.5 (features + decision + label join) |
| Retained (400 days) | 402.3 TB | columnar compression not assumed (conservative) |
| Estimated monthly run cost | $12.8K | compute + 35% platform overhead + cache/bus + storage (on-demand list price) |
| Cost per 1,000 decisions | $0.0036 | monthly cost ÷ (events/month ÷ 1000) |
| All-in monthly cost | $15.9K | adds retraining, observability, data transfer, backup/DR to the run cost |
| Cost range (low / expected / high) | $12.4K / $15.9K / $26.9K | low = 0.8× load on committed/spot compute; high = 1.5× load at 20% higher unit prices |
| Cost per decision | $0.0000044 | all-in monthly cost ÷ outcomes per month |
| Load scenarios (P50 / P95 / P99) | 6 / 6 / 6 8-vCPU pods | P50: 1,111.1 req/s; P95: 5,000 req/s; P99: 8,333 req/s |

## Assumptions

- 10.0M registered users, 30% daily active; each active user triggers 40 model-touching events per day.
- Average payload 6 KB per event across request, features and decision log.
- Peak = 6× average; the stateless inference plane runs in three active-active regions sized so losing one still serves peak (×1.5).
- Unit prices are indicative on-demand list prices; committed-use or spot discounts typically cut compute 30–60%.
- Retraining, observability, data transfer and backup are modelled shares of the run cost, not measurements; replace them with your own cadence, retention and tariffs.

## Bottlenecks to expect

- Feature fetch dominates latency, not the model — co-locate the feature store, batch lookups, pipeline them.
- Tail latency from GC pauses and noisy neighbours — pin CPUs, preallocate buffers, hedge slow calls.
- Hot keys: a handful of entities (celebrity users, big merchants, flagship SKUs) can concentrate load — shard by a salted key and cache aggressively.
- Thundering herd after a deploy or cache flush — warm caches before shifting traffic and add jittered TTLs.

## Resilience

- The stateless inference plane is active-active across three regions and each is sized to absorb one failure; the state plane is pinned per jurisdiction with a synchronous in-country standby and fenced failover.
- Every model and feature set is versioned and signed; rollback is a pointer flip that finishes in under a minute.
- Per-tenant and per-key quotas plus load shedding (reject early, cheap) protect the SLO of well-behaved callers.
- Per-request budgets (steps, tokens, dollars) are enforced in the gateway so a runaway session cannot become a cost incident.
- Evaluation harness replays a frozen golden set on every prompt / model / tool change; regressions block release.

## Where it runs

- **Hosting:** Hybrid and often on-premises for the core; model development and non-production in a private-cloud landing zone; data residency by jurisdiction
- **Compute:** 6 8-vCPU pods for 12,500 req/s (≈2,500 scores/s per pod (GBDT / small NN, features already in memory)); 3 online feature-store shards and 12 event-bus partitions.
- **Data platform:** Lakehouse (Iceberg or Delta) as the system of analytical record, Kafka as the event backbone, an online feature store for millisecond reads, and a catalogue with lineage and classification.
- **AI platform:** Feature store, experiment tracking, model registry, signed artifacts and a serving layer (trading front end).
- **Deployment:** Kubernetes with GitOps; blue-green for the serving plane, shadow then canary for models; infrastructure as code; environments dev, staging and production with promotion by evidence.

## Re-run with your numbers

| Input | Blueprint | Yours |
|---|---|---|
| Registered users | 10M | |
| Daily active share | 30% | |
| Events per active user per day | 3 | |
| Peak to average ratio | 6x | |
| Payload per event | 10 KB | |
