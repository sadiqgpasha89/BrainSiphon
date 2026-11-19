# Real-Time Card & UPI Fraud Detection: model card and data card

> Generated from the blueprint `fintech/real-time-card-upi-fraud-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Real-Time Card & UPI Fraud Detection · **Domain:** fintech · **Latency tier:** sub-10ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Calibrated logistic regression on 40 velocity features, because it sets the cost floor and gives instant reason codes.
- **Production model:** LightGBM on 300 features plus a GNN-derived device-card embedding, served via Triton with an in-process feature cache.
- **Intended use:** Block fraudulent authorisations inside the payment auth path while keeping false declines under 0.3% of genuine volume.
- **Out of scope:** - Cardholder name length or raw merchant free text: no causal link to fraud, and they overfit to data-entry quirks. The merchant is represented by MCC plus a learned embedding.<br>- Issuer country alone as a feature: it mostly proxies for the population, and it produces unfair declines for travellers, which would show up first in the false-decline guardrail.<br>- A random train-test split: it leaks the same cardholder into both sides. Every evaluation is time-ordered and grouped by card.<br>- Treating transactions not yet reported as fraud as genuine and training on them: it teaches the model to ignore the attack that is under way right now.
- **Primary metrics:** - PR-AUC at 0.5% FPR<br>- Recall at fixed review capacity
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer segment, tenure and new versus existing accounts<br>- Geography and channel (card-present, online, UPI)<br>- Protected-class proxies where lawful analysis is permitted, to check disparate impact<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Flash-sale traffic spike<br>- Issuer chargeback delay<br>- Genuine shopping session<br>- Mule-device ring rotation<br>- UPI switch timeout with the feature store down<br>- Split-leg UPI collect and pay
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file and new-to-credit customers, first-time devices, small merchants; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Block fraudulent authorisations inside the payment auth path while keeping false declines under 0.3% of genuine volume.
- **Label:** is_fraud = 1 when the issuer confirms fraud or a chargeback is filed. The label for a fraud row arrives between 7 and 21 days after the event (30-90 in production) and a row only counts as a confirmed negative after the full maturity window. Train only on rows whose label had matured by the training cut-off, never on "everything not yet reported as fraud".
- **Sources:** - **Source:** Card velocity 1m/1h/24h inputs<br>**Owner:** Payments engineering<br>**System Of Record:** Card management system and authorisation ledger<br>**Ingestion:** CDC or event stream (Kafka) with 5 seconds freshness at p95<br>**Quality:** Point-in-time rule: windows must close strictly before decision time.<br>- **Source:** Device-card fan-out inputs<br>**Owner:** Risk analytics<br>**System Of Record:** Core banking ledger<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: fingerprint must be hashed at event time, not retro-joined.<br>- **Source:** Merchant risk drift inputs<br>**Owner:** Customer data office<br>**System Of Record:** Customer identity and KYC (CIAM)<br>**Ingestion:** CDC or event stream (Kafka) with 5 seconds freshness at p95<br>**Quality:** Point-in-time rule: chargebacks mature in 30-90 days so use matured labels only.<br>- **Source:** New device for card inputs<br>**Owner:** Payments engineering<br>**System Of Record:** HSM-backed token vault (PAN tokenisation)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: the first-seen table must be built from events before the decision, not from full history.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on confirmed fraud only hides review-queue selection bias<br>- Random split leaks cardholders across train and test<br>- Retraining only on outcomes the previous model allowed to happen, with no random holdout or step-up bucket
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
