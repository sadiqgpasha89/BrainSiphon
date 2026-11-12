# Dataset Card Specification

**Dataset Name:** `Enterprise Transaction Authorization Corpus`  
**Dataset Version:** `2026.03-matured`  
**Data Custodian:** Payment Data Governance Board  
**Sensitivity:** Highly Sensitive (PCI-DSS & GDPR Scope)  

---

## 1. Dataset Description
* **Summary:** 120-day historical authorization log containing 190,000 card and instant UPI payment records across 2,500 accounts and 150 merchants.
* **Granularity:** One record per payment authorization attempt.
* **Time Range:** `2026-05-01T00:00:00Z` to `2026-08-28T23:59:59Z` (UTC).

## 2. Ingestion & Transformation Provenance
* **Source Database:** Production Read-Replica via Debezium CDC and Kafka `payment.authorizations.raw` topic.
* **Cleaning Pipeline:** Stripped raw 16-digit PANs; substituted with SHA-256 salted tokens. Cleaned null device IDs with fallback to session IP fingerprint.
* **Feature Schema:** Pinned in OpenDataContract `contracts/data-contract.yaml`.

## 3. Label Definition & Censoring
* **Ground Truth Source:** Bank dispute filings (chargeback reason codes 10.4, 4837) and issuer fraud confirmations.
* **Delayed Feedback:** Fraud reports arrive with an exponential delay between 7 and 90 days. Rows with `event_time > now - 21 days` are flagged as `unmatured` and censored during training set generation.

## 4. Personal Identifiable Information (PII) Protection
* **Data Minimization:** No customer names, phone numbers, or physical street addresses stored.
* **Cryptographic Tokenization:** Tokens are non-reversible without access to customer-controlled KMS HSM keys.

