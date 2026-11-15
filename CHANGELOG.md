# Changelog

Architecture, framework, version and implementation changes. Content changes to individual blueprints are visible in the git history of `content/usecases/`; each blueprint page shows the content version it was built from.

## Unreleased: simpler navigation and home page for newcomers

### Changed
- Header: four things in the bar (Start here, Blueprints, Delivery guide, More) instead of up to nine links that appeared and disappeared by screen width. Blueprints opens the ten industries; More groups Patterns, Reference implementations, Deployment, FDE hub, About and the release report, each with a one-line explanation. Pro is a separate button so it is never mistaken for free content. On a phone the same lists open as one menu panel.
- Home page: one headline, one primary action (Start here), a search box and a card showing what is inside a blueprint, then How it works, Pick an industry, Free and Pro, and What has been checked. The long About block, the blueprint-contents grid and the role-lens section moved out of the home page; they remain on `/about` and `/start`. The "what has been checked" strip moved from the hero to its own section, with the same figures and the same link to the release report.
- `/pro`: a three-step "how you get it" section, a lead that separates learning (free) from building (Pro), and the FAQ and the list of 20 engines in expandable sections. Pro uses one warm accent everywhere (header, home page, this page).
- `/start`: a plainer headline and one "Begin the first hour" button above the jump links.
- Footer: three short columns instead of seventeen links with descriptions; the notes for tools and AI agents moved to a quiet bottom line, and a link to the source repository was added.
- Primary buttons use dark text on the signal colour; white on the dark theme's light green did not have enough contrast.
- Industry pages say "Industry" where they said "Domain", matching the menu. `DOMAIN_META` gained a short `topics` line used on cards and in menus.

### Added
- `src/lib/nav.ts`: the navigation written once; the header, phone menu and footer all read it.

## Unreleased: freemium split and BrainSiphon Pro

### Added
- `/pro`: what BrainSiphon Pro contains, what stays free, the plans and how buying works. Linked from the header, footer and every locked worked example. `content/pro.json` holds the free use case and the plans; `NEXT_PUBLIC_PRO_CHECKOUT_URL` (repository variable `PRO_CHECKOUT_URL`) turns the early-access buttons into a checkout link.
- `content/pro-catalog.json`: the public listing of what each of the 500 Pro worked templates contains (engine, fit, file and document counts). It contains no results.
- A locked panel in place of the worked example on every use case except the free one, and a pointer to `/pro` in its Markdown export.

### Changed
- The worked example of a build playbook is published for one use case only (card and UPI fraud). For the other 499 it is removed when the content is expanded, so it is absent from the generated JSON, the Markdown exports and the HTML. The playbook's milestones, gates, tests, decisions, pitfalls, compatibility analysis and the pattern kits are unchanged.
- The free implementation assets are one use case deep: one authored starter, one executable customer implementation pack (`fde-packs/`), one reference implementation (`reference-implementations/realtime-decisioning`). The `/implementations` page describes the other three and links to `/pro`.

### Removed from this repository (now in BrainSiphon Pro)
- Seven hand-written starters from `content/playbooks/` (CTR, SOC copilot, knowledge tracing, sepsis, session recommendation, developer docs assistant, demand sensing).
- Nine executable customer implementation packs from `fde-packs/` and their authored text under `src/content/fde/packs/`, and the three adapters that only existed inside them (Zendesk, workforce management, RESO).
- Three reference implementations (`batch-forecasting`, `rag-assistant`, `agentic-workflow`).
- Anything already published stays in the git history of this repository; the Pro repository is built from the same material plus 500 new worked templates that were never public.

## Unreleased: evidence, versions and implementation packages

### Added (guide and platform views)
- `/start`: first hour, four-week reading and building sequence, reading order inside a blueprint, fast path per role, stuck table, trust notes. Linked from the header, home page and footer.
- Platform tabs (Cloud-neutral, AWS, Azure, GCP, OpenStack) on the deployment topology, sequence, C4 container and agent diagrams, with a per-blueprint service map, connection walk-through and platform-specific design notes. Service map included in each blueprint's Markdown.

### Added (forward deployed engineer work)
- **Customer implementation playbook on every blueprint** (500): ownership and RACI, maturity-gap tasks, discovery questions, systems and alternatives, integrations in four layers with mappings, sequence diagrams and tests, identity, permissions, network, configuration, rollout and rollback, deployment commands, troubleshooting, deliverables, acceptance and handover. New `implementation` reader section, `/implementation/<slug>.md` and `.json`, and links from `llms.txt`.
- **Ten authored playbooks** over new executable packs in `fde-packs/` (fraud, forecasting, sepsis, ETA, CTR, phishing, knowledge tracing, ticket triage, branch footfall, valuation). The BFSI branch-footfall and real-estate valuation blueprints now carry their own systems of record, upstream and downstream systems (`sor`, `up`, `down`, `opt`, `proto`, `own`, `host` in the `.uc` source) instead of the domain default.
- `fde-toolkit/` (13 templates and executable DNS, TCP, TLS, API, IdP, service-account, database, Kafka and S3 checks with a machine-readable readiness report, usable offline), `fde-adapters/` (framework, 15 config-driven connectors, mocks) and `fde-evidence/` (inventory, release identity, sealed handover pack), all as downloads and ZIP bundles.
- `/fde` hub: customer workspaces with a hash-chained change history, evidence attachments (SHA-256), decisions, blockers, issues, test and deployment records, a progress dashboard and a generated acceptance report; a dated plan generator over twelve FDE stages; deployment modes with filled commands; the troubleshooting knowledge base; exports to GitHub Issues, Jira and Azure DevOps.
- Delivery guide: four FDE-owned steps (0.11 environment discovery and access requests, 1.12 integration specification, 4.11 customer acceptance and adoption, 6.11 customer-side incidents), so access discovery starts in Phase 0 rather than Phase 2. The FDE RACI row is now R in Phases 0, 1, 2, 4, 5 and 6.
- `npm run test:fde` and a CI job running every FDE Python suite on Python 3.9 and 3.13.

### Changed (FDE work)
- Role, section and step counts in prose are derived from `ROLE_IDS`, `SECTION_IDS` and `ALL_STEPS` (the site said fourteen roles and 69 steps; it has fifteen and 73).
- The stored playbook keeps customer dependencies that an authored pack adds in front of the shared ones (a round-trip test caught them being dropped).

### Not done (FDE work)
- No adapter, pack or toolkit check has been run against a real vendor sandbox or customer environment. Each adapter is marked `vendorSandbox: not run`.
- The derived playbooks for 490 blueprints are generated from each blueprint's data and say so; only ten are authored against an executable pack.
- Page size grew: each blueprint page carries about 190 KB more HTML (and the same again in its payload files), and `public/implementation/` adds about 100 MB.

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
- `/workspace` Architecture Packages: a working generator (recommendation with reasons and rejected alternatives, override recorded in an ADR, previews, ZIP download, saved configuration in the browser) producing tfvars, Helm values, env template, commands, ADR and a backlog generated from the delivery steps (CSV plus a `gh issue create` script).
- Downloads: every delivery template and the deployment kit as direct links and as ZIPs with a SHA-256 manifest (`/downloads/`).
- New templates: production handover package (with a worked example), FDE customer-environment checklist, maturity-gap checklist, risk register CSV.
- `/release`: evidence layers (documentation vs tested code) with percentages, and severity and owner on every feasibility warning (`content/warning-acks.json`).
- High-risk blueprints now say plainly: not suitable for real-world deployment as published.
- `verify:static` now fails if any page's footer shows a different commit or content version than `release.json`, or if a listed template or bundle is missing.

### Not done (and why)

- No Terraform plan/apply, restore test or failover drill has been run: this project has no cloud account. The pages say so.
- No new executable kits for the 489 blueprints without named use-case execution.
