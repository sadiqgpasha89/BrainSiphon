# KYC Document Verification (Vision): model card and data card

> Generated from the blueprint `fintech/kyc-document-verification-vision` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** KYC Document Verification (Vision) · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** OCR plus rule checks on MRZ and expiry date.
- **Production model:** Document classifier, ViT tamper detector and layout-aware OCR in one TensorRT pipeline; low-confidence cases routed to human review.
- **Intended use:** Verify ID documents in under 3 seconds with tamper, forgery and replay detection to cut manual KYC review by 80%.
- **Out of scope:** - Image resolution: varies with phone model not authenticity.<br>- Background colour: uninformative and easy to alter.
- **Primary metrics:** - Forgery recall at 1% false reject<br>- OCR field accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer segment, tenure and new versus existing accounts<br>- Geography and channel (card-present, online, UPI)<br>- Protected-class proxies where lawful analysis is permitted, to check disparate impact<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - New passport design released<br>- Low-light images from low-end phones
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
- **Purpose:** Verify ID documents in under 3 seconds with tamper, forgery and replay detection to cut manual KYC review by 80%.
- **Label:** For "KYC Document Verification (Vision)": Verify ID documents in under 3 seconds with tamper, forgery and replay detection to cut manual KYC review by 80%. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Synthetic forgeries in training differ from real attacker craft.
- **Sources:** - **Source:** MRZ checksum validity inputs<br>**Owner:** Payments engineering<br>**System Of Record:** Core banking ledger<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: parse the raw MRZ not the cleaned text.<br>- **Source:** Template conformity inputs<br>**Owner:** Risk analytics<br>**System Of Record:** Card management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: template version must match issue year.<br>- **Source:** Screen-recapture score inputs<br>**Owner:** Customer data office<br>**System Of Record:** Customer identity and KYC (CIAM)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: compression changes the spectrum so augment with JPEG.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Synthetic forgeries in training differ from real attacker craft<br>- Test set has the same document templates as train
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
