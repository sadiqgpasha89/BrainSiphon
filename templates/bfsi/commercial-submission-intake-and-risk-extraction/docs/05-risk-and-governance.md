# Commercial Insurance Submission Intake & Risk Extraction: risk and governance register

> Generated from the blueprint `bfsi/commercial-submission-intake-and-risk-extraction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Commercial Insurance Submission Intake & Risk Extraction · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

The risk register and control evidence for reviewers. The treatment follows the risk tier; the architecture supports these controls, and compliance is established by your own controls, evidence and assessment.

## Risk tier and treatment

**Tier: critical.** Critical risk because the output can deny, block, diagnose or price a person or an account; financial domain where a regulator reads the model; an agent can take consequential actions through tools in a regulated domain. The category is a default for this domain and consequence; the deployer must confirm it against the actual jurisdiction and use.

**Treatment.** Strict approval boundaries, continuous assurance, human oversight where required and rehearsed fail-safe mechanisms.

**Approval path**

- Formal AI risk assessment and hazard or safety case before build
- Independent validation plus domain safety sign-off (clinical, regulatory or equivalent)
- Rehearsed manual fail-safe before go-live and a defined stop authority
- Continuous assurance reviewed monthly, with re-approval on any model or data change

## Risk register

| Risk | Likelihood (L/M/H) | Impact (L/M/H) | Mitigation | Owner | Status |
|---|---|---|---|---|---|
| Evaluation trap: Clean test submissions are better formatted than live ones. |  |  |  |  | open |
| Evaluation trap: Broker overlap, since the same brokers appear in training and in test and the model learns their templates. |  |  |  |  | open |
| Scanned loss runs: scanned loss runs have poor OCR and the claim totals come out wrong. |  |  |  |  | open |
| Multiple locations: a schedule of locations arrives as a spreadsheet and is read as one risk. |  |  |  |  | open |
| Scanned loss runs: Scanned loss runs have poor OCR and the claim totals come out wrong |  |  | Gate on image quality, compare parsed totals with printed totals and request a clean copy when they differ |  | open |
| Multiple locations: A schedule of locations arrives as a spreadsheet and is read as one risk |  |  | Extract at row level and attach each location to its own risk record |  | open |
| Conflicting values: Two documents give different values for the same field |  |  | Flag both with their sources and ask the broker |  | open |

## Data controls

| Area | Control | Evidence |
|---|---|---|
| Classification and privacy | Tag every dataset and feature with a classification (Restricted: customer financial and credit data); enforce column-level access and mask in analyst views | Catalogue export showing classification coverage and a quarterly access review |
| Consent and data-use rights | Record the lawful basis and permitted purposes per dataset; a use outside the recorded purpose fails the pipeline policy check | Purpose register and failed-check log |
| Residency and sovereignty | Pin regulated state by jurisdiction (RBI/IRDAI data-localisation and outsourcing rules, GDPR for EU customers, regulator-readable audit) | Region policy as code and a storage-location report |
| Retention and deletion | Per-dataset retention, legal-hold support and key-based deletion that reaches features, embeddings, caches and training snapshots | Deletion-latency measurement and a retention-exception register |

## Model controls

| Area | Control | Evidence |
|---|---|---|
| Inventory and ownership | Every model, prompt set and index is a registry entry with a named owner and risk tier | Model inventory export; no production artifact without an entry |
| Risk classification | Tier assigned at intake (critical) and reviewed on any change of use, data or autonomy | Intake record and tier change log |
| Documentation and approval | Model card (purpose, data, limits, slice results), intended-use statement and approvals attached to each version | Model card and approval trail in the registry |
| Validation and periodic review | Independent validation before promotion and a scheduled revalidation | Validation report and review minutes |
| Version and decision traceability | Each decision stores (feature-vector hash, model version, policy version, output) in an append-only ledger | Sampled ledger replay reproduces the output |

## Responsible AI controls

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file borrowers, new-to-bank customers, small-balance accounts and rare product lines; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## AI security controls

| Threat | Control |
|---|---|
| Prompt injection and jailbreaks | Treat retrieved and tool text as untrusted data, mark it, classify ingress and enforce a deterministic outbound policy engine |
| Training-data poisoning | Provenance and signatures on datasets, label audits, outlier checks, matured-label-only training and a holdout the pipeline cannot write to |
| Model theft and extraction | Authenticate and rate-limit callers, return only the fields consumers need, audit high-volume querying and encrypt artifacts at rest |
| Insecure model supply chain | Sign and verify artifacts, pin and scan base models and dependencies, keep an ML bill of materials and refuse unsafe serialisation formats from untrusted sources |
| Agent privilege escalation | Typed least-privilege tools, on-behalf-of tokens for the calling user, approval for every write tool and a bounded budget of steps and cost |
| Leakage through features, logs and caches | Redact sensitive fields from logs and traces, scope caches by principal and exclude prohibited attributes from features |

## Regulatory obligations

| Obligation | Architectural control | Evidence | Owner | Cadence | Evidence link |
|---|---|---|---|---|---|
| Model risk management (SR 11-7, SS1/23) | Model inventory, tiering, independent validation before promotion and periodic revalidation tracked in the registry | Validation report, inventory entry, annual review record | Model risk management | Annual and on material change |   |
| Fair lending and adverse-action explanation | Reason codes stored with each decision, protected-attribute proxies tested and a challenge process for declined customers | Disparate-impact report and a sampled adverse-action replay | Compliance | Quarterly |   |
| Risk-data aggregation and lineage (BCBS 239, IFRS 9, CECL) | Column-level lineage from source to model input to reported figure, with reconciled totals | Lineage graph and reconciliation sign-off | Risk data office | Quarterly |   |
| Operational resilience and third-party risk | Tested failover for the decision service, exit plans for external model providers and an outsourcing register entry | DR test report and vendor exit plan | Technology risk | Annual |   |

## Edge cases and their monitors

| Scenario | Signal | Threshold | Response |
|---|---|---|---|
| Scanned loss runs | Frequency of the condition "scanned loss runs" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Gate on image quality, compare parsed totals with printed t…" does not fire. | Gate on image quality, compare parsed totals with printed totals and request a clean copy when they differ |
| Multiple locations | Frequency of the condition "multiple locations" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Extract at row level and attach each location to its own ri…" does not fire. | Extract at row level and attach each location to its own risk record |
| Conflicting values | Frequency of the condition "conflicting values" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Flag both with their sources and ask the broker" does not fire. | Flag both with their sources and ask the broker |

## Decision on residual risk

Residual risks accepted by: ____________  Date: ________  Review on: ________
