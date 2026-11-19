# Property Manager Assistant for Tenant Queries: deployment folder

What is here and how it relates to the free deployment kit at https://github.com/sadiqgpasha89/BrainSiphon/tree/main/deployment (Terraform for AWS, Azure and GCP, a Helm chart, Kubernetes base, runbooks and a smoke test).

## Files

- `config.yaml`: the serving configuration from the blueprint, with a timeout and fallback per stage.
- `values.sized.yaml`: Helm overrides for the free chart, sized from the blueprint's capacity model.
- `docker-compose.yml`: runs the worked example and its tests in a container. It is not a production service.
- `../contracts/`: the API, event and data contracts; `../contracts/schema.sql` is the reference data model.

## How to use the sizing

1. Replace the modelled traffic in `docs/08-capacity-and-cost.md` with your measured peak.
2. Copy `values.sized.yaml` over the chart's `values-<env>.yaml` and adjust.
3. Apply the free kit's Terraform for your cloud, then deploy the chart.
4. Run the kit's smoke test, then the runbook scenarios in `docs/06-operations-runbook.md`.

## What the blueprint says about where it runs

- **Hosting:** Public cloud with tenant cells per brokerage or portfolio; edge gateways in buildings for BMS data
- **Compute (modelled):** 250 GPUs (H100 class) for 313 req/s (≈3,000 decoded tokens/s per GPU (8B-class, continuous batching); 4 steps × 500 output tokens per request); 3 online feature-store shards and 12 event-bus partitions.
- **Deployment:** Kubernetes with GitOps; blue-green for the serving plane, shadow then canary for models; infrastructure as code; environments dev, staging and production with promotion by evidence.
- **Disaster recovery:** {"rto": "15 minutes per tenant cell, under 60 seconds for the inference plane", "rpo": "Up to 30 seconds of tenant state (asynchronous replication lag)", "strategy": "Stateless inference is active-active; tenant cells replicate asynchronously to a standby region and the largest tenants fail over independently."}

## Not in this folder, on purpose

Terraform state, cloud credentials, secrets and a running service. Nothing here was applied to a cloud account.
