# SIEM Alert Triage & Prioritisation: capacity and cost at 10 million users

> Generated from the blueprint `cybersecurity/siem-alert-triage-ml` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SIEM Alert Triage & Prioritisation · **Domain:** cybersecurity · **Latency tier:** seconds · **Difficulty:** advanced

The sizing model behind the design, with the inputs exposed so you can replace them with your own traffic. Modelled on-demand list prices; committed-use pricing usually lowers compute.

## Inputs

| Input | Value |
|---|---|
| a | 500 |
| k | 3 |
| outcomeUnit | decision |
| reviewRate | 0.01 |

## Capacity table (modelled)

| Metric | Value | How |
|---|---|---|
| Registered / daily active users | 10.0M / 3.0M | 30% DAU of 10.0M registered |
| Model-touching events per day | 1.5B | 3.0M DAU × 500 events/user/day |
| Average throughput | 17K req/s | events/day ÷ 86,400 |
| Peak throughput | 104K req/s | average × 6 (diurnal + event spikes) |
| Provisioned capacity | 156K req/s | peak × 1.5 so any one of three regions can fail |
| Compute (8-vCPU pods) | 63 | ≈2,500 scores/s per pod (GBDT / small NN, features already in memory) |
| Event bus | 66 partitions @ 305.2 MB/s | peak × payload KB; ≤ 5 MB/s per partition, rounded to 6 per AZ-set |
| Online feature store | 6 shards @ 417K lookups/s | peak × 4 entity lookups; ≈80K ops/s per shard |
| Raw data growth | 6,437.3 GB/day | events × payload × 1.5 (features + decision + label join) |
| Retained (400 days) | 2,514.6 TB | columnar compression not assumed (conservative) |
| Estimated monthly run cost | $85.7K | compute + 35% platform overhead + cache/bus + storage (on-demand list price) |
| Cost per 1,000 decisions | $0.0019 | monthly cost ÷ (events/month ÷ 1000) |
| All-in monthly cost | $900.11M | adds retraining, observability, data transfer, backup/DR and human review to the run cost |
| Cost range (low / expected / high) | $720.08M / $900.11M / $1350.18M | low = 0.8× load on committed/spot compute; high = 1.5× load at 20% higher unit prices |
| Cost per decision | $0.020 | all-in monthly cost ÷ outcomes per month |
| Load scenarios (P50 / P95 / P99) | 9 / 38 / 63 8-vCPU pods | P50: 14K req/s; P95: 62K req/s; P99: 104K req/s |

## Assumptions

- 10.0M registered users, 30% daily active; each active user triggers 500 model-touching events per day.
- Average payload 3 KB per event across request, features and decision log.
- Peak = 6× average; the stateless inference plane runs in three active-active regions sized so losing one still serves peak (×1.5).
- Unit prices are indicative on-demand list prices; committed-use or spot discounts typically cut compute 30–60%.
- Retraining, observability, data transfer and backup are modelled shares of the run cost, not measurements; replace them with your own cadence, retention and tariffs.

## Bottlenecks to expect

- Feature fetch dominates latency, not the model — co-locate the feature store, batch lookups, pipeline them.
- Tail latency from GC pauses and noisy neighbours — pin CPUs, preallocate buffers, hedge slow calls.
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
- **Compute:** 63 8-vCPU pods for 156,250 req/s (≈2,500 scores/s per pod (GBDT / small NN, features already in memory)); 6 online feature-store shards and 66 event-bus partitions.
- **Data platform:** Lakehouse (Iceberg or Delta) as the system of analytical record, Kafka as the event backbone, an online feature store for millisecond reads, and a catalogue with lineage and classification.
- **AI platform:** Feature store, experiment tracking, model registry, signed artifacts and a serving layer (LightGBM).
- **Deployment:** Kubernetes with GitOps; blue-green for the serving plane, shadow then canary for models; infrastructure as code; environments dev, staging and production with promotion by evidence.

## Re-run with your numbers

| Input | Blueprint | Yours |
|---|---|---|
| Registered users | 10M | |
| Daily active share | 30% | |
| Events per active user per day | 3 | |
| Peak to average ratio | 6x | |
| Payload per event | 10 KB | |
