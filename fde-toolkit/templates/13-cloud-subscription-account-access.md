# Customer cloud subscription / account access

| Item | Value |
|------|-------|
| Cloud and account type (AWS account / Azure subscription / GCP project / on-prem) | |
| Account or subscription id(s) per environment (dev, staging, pre-production, production) | |
| Who owns the account and approves access | |
| How the FDE gets access (SSO role assumption, B2B guest, delegated admin, jump host, no direct access: customer operator executes) | |
| Role granted (name and permissions): should be read-only for discovery, deployer for delivery | |
| Session length and MFA | |
| Approved regions and services (service allow-list / SCPs / Azure Policy / org policy) | |
| Budget and cost alerts | |
| Tagging and naming standards | |
| Quotas that matter (GPU, vCPU, IPs, load balancers) and the process to raise them | |

## Proof (run as the FDE's identity)

```bash
aws sts get-caller-identity && aws iam simulate-principal-policy --policy-source-arn <arn> --action-names eks:CreateCluster s3:PutObject
az account show -o json && az role assignment list --assignee <upn> -o table
gcloud auth list && gcloud projects get-iam-policy <project> --flatten="bindings[].members" --filter="bindings.members:<user>"
kubectl auth can-i --list -n <namespace>
```

`cloud_access[]` in `preflight.json` runs allow-listed CLI commands (no shell) and asserts on the JSON output.
