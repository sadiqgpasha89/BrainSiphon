# Healthcare Compliance Evidence Collection Automation: model card and data card

> Generated from the blueprint `healthcare/healthcare-compliance-evidence-collection-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Compliance Evidence Collection Automation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Control owners email documents to the audit coordinator before an audit.
- **Production model:** Connectors to approved repositories and report systems, document classification and requirement matching, deterministic freshness and completeness checks, and an agent that assembles the binder with immutable references and routes items for owner attestation.
- **Intended use:** Gather, classify, validate and organise the evidence that audits, accreditation and regulatory reviews require, so control owners attest to a complete, time-stamped binder instead of assembling it by hand.
- **Out of scope:** - File name: unreliable label.<br>- Folder depth: storage artefact.<br>- Uploader seniority: not evidence quality.
- **Primary metrics:** - Mapping precision and recall against owner-confirmed links<br>- Freshness-check accuracy<br>- Share of binder items accepted by auditors
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Evidence exists only in a person's mailbox<br>- Document supersedes an earlier one<br>- Redacted document<br>- Injected instruction in a document
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Gather, classify, validate and organise the evidence that audits, accreditation and regulatory reviews require, so control owners attest to a complete, time-stamped binder instead of assembling it by hand.
- **Label:** For "Healthcare Compliance Evidence Collection Automation": Gather, classify, validate and organise the evidence that audits, accreditation and regulatory reviews require, so control owners attest to a complete, time-stamped binder instead of assembling it by hand. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Letting the agent fill missing evidence.
- **Sources:** - **Source:** Requirement match score inputs<br>**Owner:** Compliance<br>**System Of Record:** Control catalogue and evidence requirements<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: reviewed mappings.<br>- **Source:** Evidence age versus period inputs<br>**Owner:** Internal audit<br>**System Of Record:** Document repositories<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: document metadata.<br>- **Source:** Completeness ratio inputs<br>**Owner:** Control owners<br>**System Of Record:** System report generators<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: binder state.<br>- **Source:** Source reliability inputs<br>**Owner:** IT<br>**System Of Record:** Ownership directory<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: source register.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Letting the agent fill missing evidence<br>- Accepting out-of-period documents<br>- Mapping by file name
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
