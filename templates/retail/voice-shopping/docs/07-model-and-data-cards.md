# Voice Shopping (ASR + NLU): model card and data card

> Generated from the blueprint `retail/voice-shopping` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Voice Shopping (ASR + NLU) · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Generic ASR plus keyword search.
- **Production model:** Streaming conformer ASR with contextual biasing, joint NLU for intent and slots, entity linking and confirmation dialogue.
- **Intended use:** Understand spoken shopping requests, resolve products and handle reorders reliably across accents and noisy environments.
- **Out of scope:** - Speaker gender: unrelated.<br>- Audio duration: weak.
- **Primary metrics:** - WER on entity spans<br>- Intent and slot F1
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Background noise from kitchen<br>- Homophone brand names
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including cold-start users, long-tail sellers and new catalogue items; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Understand spoken shopping requests, resolve products and handle reorders reliably across accents and noisy environments.
- **Label:** For "Voice Shopping (ASR + NLU)": Understand spoken shopping requests, resolve products and handle reorders reliably across accents and noisy environments. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Test audio recorded in quiet rooms.
- **Sources:** - **Source:** Contextual biasing list inputs<br>**Owner:** Catalogue operations<br>**System Of Record:** Product information management (PIM)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: updated frequently.<br>- **Source:** ASR confidence by span inputs<br>**Owner:** E-commerce engineering<br>**System Of Record:** Order management system (OMS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: calibrated.<br>- **Source:** Reorder intent confidence inputs<br>**Owner:** Customer analytics<br>**System Of Record:** Customer data platform (CDP)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: order history as-of.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Test audio recorded in quiet rooms<br>- WER averaged over non-entity words
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
