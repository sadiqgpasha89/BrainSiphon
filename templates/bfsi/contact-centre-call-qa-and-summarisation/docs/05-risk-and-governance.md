# Contact-Centre Call QA & Summarisation: risk and governance register

> Generated from the blueprint `bfsi/contact-centre-call-qa-and-summarisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Contact-Centre Call QA & Summarisation · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

The risk register and control evidence for reviewers. The treatment follows the risk tier; the architecture supports these controls, and compliance is established by your own controls, evidence and assessment.

## Risk tier and treatment

**Tier: medium.** Medium risk because financial domain where a regulator reads the model. The category is a default for this domain and consequence; the deployer must confirm it against the actual jurisdiction and use.

**Treatment.** Additional data, privacy, fairness and human-review controls.

**Approval path**

- Model owner and product owner approve promotion on green gates and fairness-slice results
- Privacy review of data use and retention
- Security review of the model, prompts and tools

## Risk register

| Risk | Likelihood (L/M/H) | Impact (L/M/H) | Mitigation | Owner | Status |
|---|---|---|---|---|---|
| Evaluation trap: Supervisor labels are inconsistent between reviewers, so the ceiling is lower than it appears. |  |  |  |  | open |
| Evaluation trap: Speech recognition tested on clean audio overstates accuracy on real calls. |  |  |  |  | open |
| Noisy audio: a poor recording gives a bad transcript and wrong scores. |  |  |  |  | open |
| Dialects and languages: accuracy is lower for some dialects and languages and those callers get worse scoring. |  |  |  |  | open |
| Noisy audio: A poor recording gives a bad transcript and wrong scores |  |  | Gate on transcript confidence and send low-confidence calls to a human |  | open |
| Dialects and languages: Accuracy is lower for some dialects and languages and those callers get worse scoring |  |  | Monitor accuracy per language and dialect and route low-confidence calls to a human reviewer |  | open |
| Customer with vulnerability: A caller showing signs of vulnerability is scored only on the script checklist |  |  | Add a vulnerability flag to the checklist and send flagged calls to a specialist reviewer |  | open |

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
| Risk classification | Tier assigned at intake (medium) and reviewed on any change of use, data or autonomy | Intake record and tier change log |
| Documentation and approval | Model card (purpose, data, limits, slice results), intended-use statement and approvals attached to each version | Model card and approval trail in the registry |
| Validation and periodic review | Automated gates before promotion and a scheduled owner review | Validation report and review minutes |
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
| Retrieval-based data leakage | Apply permission filters inside the retrieval query before top-k, scope indexes and caches by tenant, and redact secrets before indexing |

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
| Noisy audio | Frequency of the condition "noisy audio" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Gate on transcript confidence and send low-confidence calls…" does not fire. | Gate on transcript confidence and send low-confidence calls to a human |
| Dialects and languages | Frequency of the condition "dialects and languages" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Monitor accuracy per language and dialect and route low-con…" does not fire. | Monitor accuracy per language and dialect and route low-confidence calls to a human reviewer |
| Customer with vulnerability | Frequency of the condition "customer with vulnerability" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Add a vulnerability flag to the checklist and send flagged…" does not fire. | Add a vulnerability flag to the checklist and send flagged calls to a specialist reviewer |

## Decision on residual risk

Residual risks accepted by: ____________  Date: ________  Review on: ________
