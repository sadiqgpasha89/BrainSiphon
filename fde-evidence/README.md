# fde-evidence: handover evidence from facts, not from memory

Standard library only (Python 3.9+). Nothing here connects to a cloud account: it reads files the FDE already has (a Terraform state or
`terraform show -json`, `kubectl get ... -o json`, the git checkout), so it works in restricted and air-gapped environments.

```bash
cd fde-evidence && python3 -m pytest tests -q

# 1. infrastructure inventory (resources, providers, and anything open to the internet, unencrypted or public)
terraform show -json > plan.json
kubectl get deploy,sts,ds,cronjob,pods -A -o json > k8s.json
python3 -m fde_evidence inventory --terraform plan.json --kubectl k8s.json --out evidence/inventory.json

# 2. release identity: exactly what was deployed
python3 -m fde_evidence release --repo ../my-deployment --image reg.example/scoring@sha256:<digest> \
  --config values-prod.yaml --model-name fraud --model-version 2026-03 --model-artifact model.bin \
  --environment prod --by fde.one --out evidence/release-evidence.json

# 3. put the readiness report, the acceptance report and test logs beside them, then seal the pack
cp readiness-report.json acceptance-report.json evidence/
export BS_EVIDENCE_KEY=...            # or --key-file, or --sign-key private.pem (RSA via openssl)
python3 -m fde_evidence pack evidence --out handover-acme --customer "Acme Bank" --use-case fintech/real-time-card-upi-fraud-detection

# 4. the customer verifies it
python3 -m fde_evidence verify handover-acme.zip --key-file key     # or --pubkey public.pem for an RSA-signed pack
```

## What it guarantees, and what it does not

- The manifest lists every file with its SHA-256. Verification fails on a changed, missing or extra file, a changed manifest, a wrong key and an unsafe archive path.
- **HMAC-SHA256** proves integrity between parties who hold the key; it is not a non-repudiable signature. **RSA** (via the `openssl` CLI) lets anyone with the public key verify who sealed it.
- `release` reports *INCOMPLETE* (and exits 1) when the tree is dirty, an image is not pinned by digest, there is no model version or no configuration. It records what is true, not what is hoped.
- The inventory flags exposure it can see in the files (open ingress, public access, encryption off). It is not a security scan, and it sees only what Terraform or kubectl reported.
- Tested against synthetic state, plans and kubectl output and a real temporary git repository. It has not been run against a customer's cloud.
