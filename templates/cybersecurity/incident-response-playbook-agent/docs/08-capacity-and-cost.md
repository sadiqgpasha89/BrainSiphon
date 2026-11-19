# Incident Response Playbook Agent: capacity and cost at 10 million users

> Generated from the blueprint `cybersecurity/incident-response-playbook-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Incident Response Playbook Agent · **Domain:** cybersecurity · **Latency tier:** seconds · **Difficulty:** staff-principal

The sizing model behind the design, with the inputs exposed so you can replace them with your own traffic. Modelled on-demand list prices; committed-use pricing usually lowers compute.

## Inputs

| Input | Value |
|---|---|
| a | 20 |
| k | 15 |
| steps | 8 |
| tokensPerStep | 400 |
| outcomeUnit | completed task |
| reviewRate | 0.1 |

## Capacity table (modelled)

| Metric | Value | How |
|---|---|---|
| Registered / daily active users | 10.0M / 3.0M | 30% DAU of 10.0M registered |
| Model-touching events per day | 60.0M | 3.0M DAU × 20 events/user/day |
| Average throughput | 694.4 req/s | events/day ÷ 86,400 |
| Peak throughput | 4,167 req/s | average × 6 (diurnal + event spikes) |
| Provisioned capacity | 6,250 req/s | peak × 1.5 so any one of three regions can fail |
| Compute (GPUs (H100 class)) | 8,000 | ≈3,000 decoded tokens/s per GPU (8B-class, continuous batching); 8 steps × 400 output tokens per request |
| Peak decode load | 20.0M tok/s | provisioned req/s × 8 steps × 400 tokens |
| Event bus | 18 partitions @ 61 MB/s | peak × payload KB; ≤ 5 MB/s per partition, rounded to 6 per AZ-set |
| Online feature store | 3 shards @ 17K lookups/s | peak × 4 entity lookups; ≈80K ops/s per shard |
| Raw data growth | 1,287.5 GB/day | events × payload × 1.5 (features + decision + label join) |
| Retained (400 days) | 502.9 TB | columnar compression not assumed (conservative) |
| Estimated monthly run cost | $25.24M | compute + 35% platform overhead + cache/bus + storage (on-demand list price) |
| Cost per 1,000 decisions | $14.02 | monthly cost ÷ (events/month ÷ 1000) |
| All-in monthly cost | $387.75M | adds retraining, observability, data transfer, backup/DR and human review to the run cost |
| Cost range (low / expected / high) | $299.11M / $387.75M / $589.95M | low = 0.8× load on committed/spot compute; high = 1.5× load at 20% higher unit prices |
| Cost per completed task | $0.215 | all-in monthly cost ÷ outcomes per month |
| Load scenarios (P50 / P95 / P99) | 1,067 / 4,800 / 8,000 GPUs (H100 class) | P50: 555.6 req/s; P95: 2,500 req/s; P99: 4,167 req/s |

## Assumptions

- 10.0M registered users, 30% daily active; each active user triggers 20 model-touching events per day.
- Average payload 15 KB per event across request, features and decision log.
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

- The inference plane is active-active across three regions, each sized to absorb one failure; tenant cells fail over independently so one tenant's incident is not everyone's.
- Every model and feature set is versioned and signed; rollback is a pointer flip that finishes in under a minute.
- Per-tenant and per-key quotas plus load shedding (reject early, cheap) protect the SLO of well-behaved callers.
- Per-request budgets (steps, tokens, dollars) are enforced in the gateway so a runaway session cannot become a cost incident.
- Evaluation harness replays a frozen golden set on every prompt / model / tool change; regressions block release.

## Where it runs

- **Hosting:** Hybrid: telemetry collected on-premises and in cloud, analysed in a segregated security enclave with its own accounts and keys
- **Compute:** 8,000 GPUs (H100 class) for 6,250 req/s (≈3,000 decoded tokens/s per GPU (8B-class, continuous batching); 8 steps × 400 output tokens per request); 3 online feature-store shards and 18 event-bus partitions.
- **Data platform:** Lakehouse (Iceberg or Delta) as the system of analytical record, Kafka as the event backbone, an online feature store for millisecond reads, and a catalogue with lineage and classification.
- **AI platform:** LLM gateway (routing, quotas, fallbacks, caching), vector index, evaluation harness, signed artifacts and a serving layer (LLM).
- **Deployment:** Kubernetes with GitOps; blue-green for the serving plane, shadow then canary for models; infrastructure as code; environments dev, staging and production with promotion by evidence.

## Re-run with your numbers

| Input | Blueprint | Yours |
|---|---|---|
| Registered users | 10M | |
| Daily active share | 30% | |
| Events per active user per day | 3 | |
| Peak to average ratio | 6x | |
| Payload per event | 10 KB | |
