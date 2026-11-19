# Security Log Parsing & Normalisation with LLMs: deployment folder

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

- **Hosting:** Hybrid: telemetry collected on-premises and in cloud, analysed in a segregated security enclave with its own accounts and keys
- **Compute (modelled):** 1,042 GPU workers for 3,000,000,000 rows per run (≈400 rows/s per node, target completion window 2 h); 3 online feature-store shards and 12 event-bus partitions.
- **Deployment:** Kubernetes with GitOps; orchestrated batch jobs (Airflow or Dagster) on autoscaled workers; infrastructure as code; environments dev, staging and production with promotion by evidence.
- **Disaster recovery:** {"rto": "2 hours (one run window)", "rpo": "Last completed daily partition", "strategy": "Inputs are replicated across regions; a failed run is re-executed in the standby region from the same partition and published atomically, so consumers never see half a run."}

## Not in this folder, on purpose

Terraform state, cloud credentials, secrets and a running service. Nothing here was applied to a cloud account.
