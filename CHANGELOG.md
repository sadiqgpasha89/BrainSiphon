# Changelog

Architecture, framework, version and implementation changes. Content changes to individual blueprints are visible in the git history of `content/usecases/`; each blueprint page shows the content version it was built from.

## Unreleased: evidence, versions and implementation packages

### Added (guide and platform views)
- `/start`: first hour, four-week reading and building sequence, reading order inside a blueprint, fast path per role, stuck table, trust notes. Linked from the header, home page and footer.
- Platform tabs (Cloud-neutral, AWS, Azure, GCP, OpenStack) on the deployment topology, sequence, C4 container and agent diagrams, with a per-blueprint service map, connection walk-through and platform-specific design notes. Service map included in each blueprint's Markdown.

### Removed
- Domain-expert review and production evidence are no longer shown anywhere on the site: the two maturity levels (the scorecard is now five levels), their status chips, release-report counts, per-blueprint reviewer fields, the review programme and `content/reviews.json`.

### Changed (corrections)

- **Kubernetes 1.30 removed.** It had passed the end of Amazon EKS extended support. The AWS and Azure stacks now default to 1.36 (a variable), GKE follows a release channel. Dates were read from the vendors' lifecycle pages on 2026-11-14.
- **FIPS 140-2 replaced by FIPS 140-3** in the regulated profile. 140-2 certificates moved to the CMVP historical list on 2026-09-21.
- **Compliance wording.** The regulated profile no longer says it "meets" HIPAA, PCI DSS or SOC 2. It is architecture designed to support their technical controls; compliance is established by your own controls, evidence and assessment. A notice on the deployment page says so.
- **Availability targets are per workload class (T0 to T3)**, not one universal "RPO 0, RTO < 5 min". Each states its replication, failover, split-brain control, justification and drill cadence, and is labelled a target: no recovery drill has been run.
- **Forward Deployed Engineer is now accountable for work**, not only consulted: step 2.1 (access and customer-environment enablement), 5.4 (deploy into the customer-controlled environment) and 5.8 (hypercare, handover and acceptance).
- **Removed the `deployment/terraform/modules/compute-k8s` stub**, which returned hard-coded endpoint and certificate values. The cloud stacks are self-contained.
- AWS EKS API endpoint is private except in `dev`; Aurora pins the major version only (a pinned minor is retired by AWS and breaks the plan).

### Added

- `content/version-registry.json` and `npm run check:versions`: every pinned version with its support end, review date and basis; CI fails when one expires or a file drifts from it. Shown on `/deployment#versions`.
- Four environments (dev, staging, **pre-production**, production) with tfvars and Helm values each; `backend.example.hcl` and `bootstrap-state.sh` for remote state with locking and encryption.
- Infrastructure validation: `npm run validate:infra` (static, in the content gate) and CI jobs for `terraform fmt/init/validate`, `tflint`, Checkov, `helm lint/template`, `kubeconform` and conftest (OPA/Rego policy with its own tests). Reports are workflow artifacts. The jobs report; they do not gate the Pages deploy and they provision nothing.
- `/deployment`: environment matrix, workload-specific architecture variants (not everything needs Kubernetes), recovery tiers, version registry, an honest validation-status table, and deploy / verify / rollback / teardown commands.
- `/workspace` Architecture Packages: a working generator (recommendation with reasons and rejected alternatives, override recorded in an ADR, previews, ZIP download, saved configuration in the browser) producing tfvars, Helm values, env template, commands, ADR and a backlog generated from the 69 delivery steps (CSV plus a `gh issue create` script).
- Downloads: every delivery template and the deployment kit as direct links and as ZIPs with a SHA-256 manifest (`/downloads/`).
- New templates: production handover package (with a worked example), FDE customer-environment checklist, maturity-gap checklist, risk register CSV.
- `/release`: evidence layers (documentation vs tested code) with percentages, and severity and owner on every feasibility warning (`content/warning-acks.json`).
- High-risk blueprints now say plainly: not suitable for real-world deployment as published.
- `verify:static` now fails if any page's footer shows a different commit or content version than `release.json`, or if a listed template or bundle is missing.

### Not done (and why)

- No Terraform plan/apply, restore test or failover drill has been run: this project has no cloud account. The pages say so.
- No new executable kits for the 489 blueprints without named use-case execution.
