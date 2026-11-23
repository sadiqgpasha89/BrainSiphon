# Repository-Aware Code Completion: capacity and cost at 10 million users

> Generated from the blueprint `devtools/repo-aware-code-completion` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Repository-Aware Code Completion · **Domain:** devtools · **Latency tier:** sub-100ms · **Difficulty:** foundational

The sizing model behind the design, with the inputs exposed so you can replace them with your own traffic. Modelled on-demand list prices; committed-use pricing usually lowers compute.

## Inputs

| Input | Value |
|---|---|
| a | 500 |
| k | 20 |
| outcomeUnit | answered question |

## Capacity table (modelled)

| Metric | Value | How |
|---|---|---|
| Registered / daily active users | 10.0M / 3.0M | 30% DAU of 10.0M registered |
| Model-touching events per day | 1.5B | 3.0M DAU × 500 events/user/day |
| Average throughput | 17K req/s | events/day ÷ 86,400 |
| Peak throughput | 104K req/s | average × 6 (diurnal + event spikes) |
| Provisioned capacity | 156K req/s | peak × 1.5 so any one of three regions can fail |
| Compute (GPUs (H100 class)) | 66K | ≈3,000 decoded tokens/s per GPU (8B-class, continuous batching); 3 steps × 350 output tokens per request |
| Peak decode load | 164M tok/s | provisioned req/s × 3 steps × 350 tokens |
| Event bus | 408 partitions @ 2,034.5 MB/s | peak × payload KB; ≤ 5 MB/s per partition, rounded to 6 per AZ-set |
| Online feature store | 6 shards @ 417K lookups/s | peak × 4 entity lookups; ≈80K ops/s per shard |
| Raw data growth | 43K GB/day | events × payload × 1.5 (features + decision + label join) |
| Retained (400 days) | 17K TB | columnar compression not assumed (conservative) |
| Estimated monthly run cost | $207.37M | compute + 35% platform overhead + cache/bus + storage (on-demand list price) |
| Cost per 1,000 decisions | $4.61 | monthly cost ÷ (events/month ÷ 1000) |
| All-in monthly cost | $228.04M | adds retraining, observability, data transfer, backup/DR to the run cost |
| Cost range (low / expected / high) | $91.44M / $228.04M / $410.44M | low = 0.8× load on committed/spot compute; high = 1.5× load at 20% higher unit prices |
| Cost per answered question | $0.0051 | all-in monthly cost ÷ outcomes per month |
| Load scenarios (P50 / P95 / P99) | 8,750 / 39K / 66K GPUs (H100 class) | P50: 14K req/s; P95: 62K req/s; P99: 104K req/s |

## Assumptions

- 10.0M registered users, 30% daily active; each active user triggers 500 model-touching events per day.
- Average payload 20 KB per event across request, features and decision log.
- Peak = 6× average; the stateless inference plane runs in three active-active regions sized so losing one still serves peak (×1.5).
- Unit prices are indicative on-demand list prices; committed-use or spot discounts typically cut compute 30–60%.
- Retraining, observability, data transfer and backup are modelled shares of the run cost, not measurements; replace them with your own cadence, retention and tariffs.

## Bottlenecks to expect

- Tokens, not requests, are the unit of cost — prompt caching, semantic caching and model routing cut 40–70% of spend.
- KV-cache memory limits concurrency — use paged attention, shorter contexts and speculative decoding.
- Provider rate limits and regional capacity — multi-provider routing with budget-aware fallbacks.
- Hot keys: a handful of entities (celebrity users, big merchants, flagship SKUs) can concentrate load — shard by a salted key and cache aggressively.
- Thundering herd after a deploy or cache flush — warm caches before shifting traffic and add jittered TTLs.

## Resilience

- Three active-active regions; the global load balancer shifts traffic on health and SLO burn, and each region is sized to absorb one failure.
- Every model and feature set is versioned and signed; rollback is a pointer flip that finishes in under a minute.
- Per-tenant and per-key quotas plus load shedding (reject early, cheap) protect the SLO of well-behaved callers.
- Circuit breakers per dependency with the degradation ladder defined in LLD; chaos drills quarterly (kill feature store, kill model tier, inject 500 ms latency).
- Capacity and cost are SLOs too: alert on cost per 1,000 decisions and GPU/CPU saturation, not only on latency.

## Where it runs

- **Hosting:** Model access through a private endpoint or self-hosted models inside the company boundary so source code is not retained by third parties, with sandboxed execution environments for agents that run code
- **Compute:** 65,625 GPUs (H100 class) for 156,250 req/s (≈3,000 decoded tokens/s per GPU (8B-class, continuous batching); 3 steps × 350 output tokens per request); 6 online feature-store shards and 408 event-bus partitions.
- **Data platform:** Lakehouse (Iceberg or Delta) as the system of analytical record, Kafka as the event backbone, an online feature store for millisecond reads, and a catalogue with lineage and classification.
- **AI platform:** LLM gateway (routing, quotas, fallbacks, caching), vector index, evaluation harness, signed artifacts and a serving layer (private LLM endpoint).
- **Deployment:** Kubernetes with GitOps; blue-green for the serving plane, shadow then canary for models; infrastructure as code; environments dev, staging and production with promotion by evidence.

## Re-run with your numbers

| Input | Blueprint | Yours |
|---|---|---|
| Registered users | 10M | |
| Daily active share | 30% | |
| Events per active user per day | 3 | |
| Peak to average ratio | 6x | |
| Payload per event | 10 KB | |
