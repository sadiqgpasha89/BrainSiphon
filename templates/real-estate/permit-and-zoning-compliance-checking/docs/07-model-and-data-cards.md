# Permit & Zoning Compliance Checking: model card and data card

> Generated from the blueprint `real-estate/permit-and-zoning-compliance-checking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Permit & Zoning Compliance Checking · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Officers check manually against checklists, because it is the norm.
- **Production model:** Structured code rules, plan measurement extraction and an LLM for narrative requirements with cited findings.
- **Intended use:** Check building plans and applications against zoning and code rules and give applicants and officers cited findings.
- **Out of scope:** - Applicant name: Does not affect whether a plan complies.<br>- Format: The file format of the application, which has no bearing on compliance.<br>- Length: A long application is not more or less compliant.
- **Primary metrics:** - Rule accuracy<br>- Finding precision
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Ambiguous code<br>- Amendments<br>- Non-standard plan
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-comp micro-markets, unusual property types and new developments; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Check building plans and applications against zoning and code rules and give applicants and officers cited findings.
- **Label:** For "Permit & Zoning Compliance Checking": Check building plans and applications against zoning and code rules and give applicants and officers cited findings. The reference kit's label belongs to a neighbouring problem and does not describe yours: Each golden question carries the expected value for the right version, or none when the documents never state it. A response is correct only when it gives that value or abstains on an unanswerable question. Define your own label exactly as in M1. Design around this trap first: Easy applications are over-represented in the data, so unusual cases fail in use.
- **Sources:** - **Source:** Rule check accuracy inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: rules interact, so test combinations.<br>- **Source:** Citation validity inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: A real section can still be the wrong one, so check support.<br>- **Source:** Measurement extraction inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: scales and units vary, so validate against stated figures.<br>- **Source:** Exception flag inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: judgement-based, so measure agreement with officers.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Easy applications are over-represented in the data, so unusual cases fail in use<br>- Code updates mean a test set from last year does not reflect today's rules
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
