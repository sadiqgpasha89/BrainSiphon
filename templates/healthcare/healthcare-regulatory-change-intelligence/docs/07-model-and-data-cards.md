# Healthcare Regulatory Change Intelligence: model card and data card

> Generated from the blueprint `healthcare/healthcare-regulatory-change-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Regulatory Change Intelligence · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A compliance analyst reads publisher newsletters and a manual tracker.
- **Production model:** Scheduled ingestion from approved sources into a versioned store, structural and semantic change detection, hybrid retrieval and an LLM that drafts cited change summaries with applicability candidates, routed to expert review.
- **Intended use:** Monitor approved official publications and identify changes that may apply to the organisation's jurisdiction, facility type and service lines, giving compliance experts cited change summaries, effective dates and a review queue.
- **Out of scope:** - Press coverage volume: not authority.<br>- Document length: not significance.<br>- Publication layout: formatting.
- **Primary metrics:** - Change-detection recall on seeded amendments<br>- Citation precision and unsupported-claim rate<br>- Applicability-candidate recall at the review capacity
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Source republished with a new URL<br>- Pending rule not yet effective<br>- Conflicting jurisdictions<br>- Injected instruction in a source page
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
- **Purpose:** Monitor approved official publications and identify changes that may apply to the organisation's jurisdiction, facility type and service lines, giving compliance experts cited change summaries, effective dates and a review queue.
- **Label:** For "Healthcare Regulatory Change Intelligence": Monitor approved official publications and identify changes that may apply to the organisation's jurisdiction, facility type and service lines, giving compliance experts cited change summaries, effective dates and a review queue. The reference kit's label belongs to a neighbouring problem and does not describe yours: Each golden question carries the expected value for the right version, or none when the documents never state it. A response is correct only when it gives that value or abstains on an unanswerable question. Define your own label exactly as in M1. Design around this trap first: Using unofficial sources as authority.
- **Sources:** - **Source:** Text diff magnitude inputs<br>**Owner:** Compliance<br>**System Of Record:** Approved regulatory and accreditation source feeds<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: version pairs.<br>- **Source:** Applicability match inputs<br>**Owner:** Legal<br>**System Of Record:** Internal policy inventory<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: metadata as at review.<br>- **Source:** Effective-date proximity inputs<br>**Owner:** Regulatory affairs<br>**System Of Record:** Facility and service-line register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: stated in the source.<br>- **Source:** Source authority tier inputs<br>**Owner:** Quality<br>**System Of Record:** Compliance case system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: source register.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Using unofficial sources as authority<br>- Summarising without a prior-version diff<br>- Letting the system decide applicability
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
