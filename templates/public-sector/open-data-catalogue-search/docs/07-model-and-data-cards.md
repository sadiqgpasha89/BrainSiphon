# Open Data Catalogue Search and Quality: model card and data card

> Generated from the blueprint `public-sector/open-data-catalogue-search` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Open Data Catalogue Search and Quality · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A keyword search over the catalogue with manual quality notes, because it is the typical portal.
- **Production model:** A hybrid search index with quality scores and a pre-publication scan for personal data, with publisher feedback and usage analytics.
- **Intended use:** Help people find public datasets by meaning and check their quality and freshness so open data gets used and problems are fixed at the source.
- **Out of scope:** - Publisher name: irrelevant for quality.<br>- Dataset id: an identifier.<br>- Upload date alone: weak link.
- **Primary metrics:** - Retrieval accuracy on judged queries<br>- Quality check precision<br>- Personal data recall
- **Measured values (fill in):** ____________
- **Slices reported:** - Region and service channel<br>- Language and accessibility needs<br>- Case type and programme rule version<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Stale dataset<br>- Hidden personal data<br>- Multilingual queries
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including people with complex or unusual circumstances, small language communities, rural areas and new programme rules; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Help people find public datasets by meaning and check their quality and freshness so open data gets used and problems are fixed at the source.
- **Label:** For "Open Data Catalogue Search and Quality": Help people find public datasets by meaning and check their quality and freshness so open data gets used and problems are fixed at the source. The reference kit's label: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Design around this trap first: Keyword-only search.
- **Sources:** - **Source:** Query to dataset similarity inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: embeddings.<br>- **Source:** Freshness and update cadence inputs<br>**Owner:** Programme and policy owners<br>**System Of Record:** Tax, benefits and licensing systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from metadata.<br>- **Source:** Schema and completeness checks inputs<br>**Owner:** City operations<br>**System Of Record:** GIS and asset management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: rules.<br>- **Source:** Personal data scan result inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from scans.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Keyword-only search<br>- Popularity as quality<br>- Self-certified privacy
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
