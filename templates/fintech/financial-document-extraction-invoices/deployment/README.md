# Financial Document & Invoice Extraction: deployment folder

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

- **Hosting:** Hybrid: card and UPI data stays in an in-country private or sovereign-region cloud; training, experimentation and non-regulated analytics run in the public cloud on tokenised data
- **Compute (modelled):** 6 GPUs (L4/L40S class) for 156 req/s (≈80 inferences/s per GPU (detector + tracker, TensorRT fp16)); 3 online feature-store shards and 12 event-bus partitions.
- **Deployment:** Kubernetes with GitOps; blue-green for the serving plane, shadow then canary for models; infrastructure as code; environments dev, staging and production with promotion by evidence.
- **Disaster recovery:** {"rto": "5 minutes for the state plane (fenced failover), under 60 seconds for the stateless inference plane", "rpo": "0 (synchronous in-jurisdiction standby)", "strategy": "Active-active stateless inference in three regions; state shards pinned to the jurisdiction with a synchronous standby and fenced leader election; no cross-border replication of raw records."}

## Not in this folder, on purpose

Terraform state, cloud credentials, secrets and a running service. Nothing here was applied to a cloud account.
