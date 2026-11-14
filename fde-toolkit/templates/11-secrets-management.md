# Secrets management

| Item | Value |
|------|-------|
| Secret store (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, Kubernetes Secrets + KMS, CyberArk, other) | |
| How workloads authenticate to it (IRSA, Workload Identity, Kubernetes auth, AppRole) | |
| How secrets reach pods (CSI driver, External Secrets Operator, Vault Agent, env from secret) | |
| Rotation period and who rotates | |
| Who can read production secrets (people) | |
| Break-glass procedure | |
| HSM / KMS key boundary (for payment keys, signing keys, tokenisation) | |
| Where secrets must **never** appear (images, Helm values in git, CI logs, model artifacts, prompts) | |

| Secret | Purpose | Store path | Consumer | Rotation | Owner |
|--------|---------|------------|----------|----------|-------|
| | | | | | |

## Rules the delivery follows

- The preflight toolkit reads credentials only from environment variables named in the config (`*_env`); it never writes them to
  a report and redacts any value it saw. Config files that contain a credential are rejected.
- Secrets in git are scanned (`gitleaks` or the customer's tool) before every push.
- A rotation is rehearsed before go-live: rotate, confirm the service reconnects, and record the time it took.
