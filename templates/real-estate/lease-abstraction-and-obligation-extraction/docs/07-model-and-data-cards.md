# Lease Abstraction & Obligation Extraction: model card and data card

> Generated from the blueprint `real-estate/lease-abstraction-and-obligation-extraction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Lease Abstraction & Obligation Extraction · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manual abstracting by paralegals, because it is accurate and slow.
- **Production model:** Layout-aware extraction with an LLM for clause understanding, amendment resolution, citations and a reviewer queue for critical fields.
- **Intended use:** Read commercial leases and amendments and extract the dates, rents, options, break clauses and obligations into a structured abstract with page citations.
- **Out of scope:** - Law firm footer: Boilerplate that repeats on every page and is not part of any term.<br>- Page numbers: Layout artefacts that are not content and cause false matches.<br>- Defined-term capitalisation: A drafting style that varies by firm and does not change the meaning.
- **Primary metrics:** - Field accuracy<br>- Critical date recall
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Scanned old leases<br>- Side letters<br>- Foreign-language lease
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
- **Purpose:** Read commercial leases and amendments and extract the dates, rents, options, break clauses and obligations into a structured abstract with page citations.
- **Label:** For "Lease Abstraction & Obligation Extraction": Read commercial leases and amendments and extract the dates, rents, options, break clauses and obligations into a structured abstract with page citations. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Evaluation on clean, modern leases hides failures on the old scans that dominate real portfolios.
- **Sources:** - **Source:** Field confidence inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: calibrate by field type, as dates and amounts behave differently.<br>- **Source:** Cross-document consistency inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: the rent roll itself contains errors, so treat a mismatch as a question and not a verdict.<br>- **Source:** Clause type classifier inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: clause wording varies between firms and jurisdictions, so test per template.<br>- **Source:** Amendment ordering inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: missing pages and undated amendments break the chain and must be flagged.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluation on clean, modern leases hides failures on the old scans that dominate real portfolios<br>- Template leakage when similar leases from one firm appear in both training and test
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
