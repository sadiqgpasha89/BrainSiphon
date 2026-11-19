# KYC Periodic Review Automation & Risk Re-rating: model card and data card

> Generated from the blueprint `bfsi/kyc-periodic-review-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** KYC Periodic Review Automation & Risk Re-rating · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Fixed review cycle by tier with manual checks, because it is regulation-driven.
- **Production model:** A change-detection pipeline with entity checks, a re-rating model and an analyst queue for material changes.
- **Intended use:** Automate periodic KYC refreshes by checking customer files against fresh data and re-rating risk, escalating changes to analysts.
- **Out of scope:** - Customer name length: No link to risk.<br>- Account number: An arbitrary identifier.<br>- Branch: An administrative attribute with no risk information.
- **Primary metrics:** - Precision on escalations<br>- Recall of material changes
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Registry delay<br>- Name collisions<br>- Dormant account
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file borrowers, new-to-bank customers, small-balance accounts and rare product lines; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Automate periodic KYC refreshes by checking customer files against fresh data and re-rating risk, escalating changes to analysts.
- **Label:** For "KYC Periodic Review Automation & Risk Re-rating": Automate periodic KYC refreshes by checking customer files against fresh data and re-rating risk, escalating changes to analysts. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Labels come from past analyst decisions, so the model repeats earlier habits.
- **Sources:** - **Source:** Ownership change inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: registries update late.<br>- **Source:** Adverse media hit inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: precision is low for common names.<br>- **Source:** Activity versus profile inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: baselines are weak for new customers.<br>- **Source:** Document expiry inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: dates are entered by hand and may be wrong.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Labels come from past analyst decisions, so the model repeats earlier habits<br>- Easy cases dominate the data, so performance on hard cases is overstated
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
