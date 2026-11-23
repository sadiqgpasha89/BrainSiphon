# Supplier Quote Comparison: model card and data card

> Generated from the blueprint `engineering/supplier-quote-comparison` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Supplier Quote Comparison · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Buyers building comparison spreadsheets from quotes, because it is the usual practice.
- **Production model:** A normalisation tool that extracts lines, units and exclusions into a common sheet, finds gaps against the enquiry and highlights differences for buyers.
- **Intended use:** Normalise supplier quotes on scope, exclusions, units and terms and show a like-for-like comparison with gaps highlighted for buyers to negotiate and decide.
- **Out of scope:** - Sales contact name: personal data.<br>- Quote layout: an artefact.<br>- Supplier logo: irrelevant.
- **Primary metrics:** - Extraction accuracy<br>- Gap detection recall<br>- Buyer correction rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Project type, client and region<br>- Discipline and contract type<br>- Site, season and supplier<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Alternative offers<br>- Unit confusion<br>- Missing pages
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including first-of-a-kind designs, new clients, remote sites and unusual ground conditions; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Normalise supplier quotes on scope, exclusions, units and terms and show a like-for-like comparison with gaps highlighted for buyers to negotiate and decide.
- **Label:** For "Supplier Quote Comparison": Normalise supplier quotes on scope, exclusions, units and terms and show a like-for-like comparison with gaps highlighted for buyers to negotiate and decide. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Totals as comparison.
- **Sources:** - **Source:** Line items and units inputs<br>**Owner:** Engineering management<br>**System Of Record:** CAD, BIM and document management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from extraction.<br>- **Source:** Exclusions and assumptions inputs<br>**Owner:** Project delivery<br>**System Of Record:** Project scheduling and cost control platform<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from text.<br>- **Source:** Commercial terms inputs<br>**Owner:** Health, safety and quality<br>**System Of Record:** Quality, safety and inspection records<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from text.<br>- **Source:** Supplier history inputs<br>**Owner:** Engineering management<br>**System Of Record:** CAD, BIM and document management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from procurement.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Totals as comparison<br>- Price-only ranking<br>- Automatic award
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
