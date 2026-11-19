# Insider Trading & Market Abuse Surveillance: model card and data card

> Generated from the blueprint `fintech/insider-trading-surveillance` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Insider Trading & Market Abuse Surveillance · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Threshold rules on volume and price moves before news.
- **Production model:** Event-study features feeding a GBDT, graph features from comms metadata, and an LLM timeline summariser for compliance analysts.
- **Intended use:** Detect suspicious trading ahead of material news by linking trader activity, communications and corporate events for compliance review.
- **Out of scope:** - P&L of the trade: outcome-based, not the cause.<br>- Number of trades per day: dominated by market makers.
- **Primary metrics:** - Precision at analyst capacity<br>- Recall on historical enforcement cases
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer segment, tenure and new versus existing accounts<br>- Geography and channel (card-present, online, UPI)<br>- Protected-class proxies where lawful analysis is permitted, to check disparate impact<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Earnings season floods alerts<br>- Rumour-driven moves with no inside source
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file and new-to-credit customers, first-time devices, small merchants; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Detect suspicious trading ahead of material news by linking trader activity, communications and corporate events for compliance review.
- **Label:** For "Insider Trading & Market Abuse Surveillance": Detect suspicious trading ahead of material news by linking trader activity, communications and corporate events for compliance review. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Enforcement cases are a tiny biased positive set.
- **Sources:** - **Source:** Pre-announcement abnormal return inputs<br>**Owner:** Payments engineering<br>**System Of Record:** Core banking ledger<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: event dates must be public timestamps.<br>- **Source:** Position change vs baseline inputs<br>**Owner:** Risk analytics<br>**System Of Record:** Card management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: baseline excludes the window.<br>- **Source:** Communication proximity inputs<br>**Owner:** Customer data office<br>**System Of Record:** Customer identity and KYC (CIAM)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: respect chinese-wall data scoping.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Enforcement cases are a tiny biased positive set<br>- News timestamps not point-in-time
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
