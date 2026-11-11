# Source-to-Target Mapping (STTM) Specification

**Document Code:** `BS-TMPL-DATA-01`  
**Phase:** Phase 2 — Data Engineering (Step 2.1)  

---

## 1. Pipeline Metadata
* **Source System:** Transaction Core DB (`PostgreSQL` / `Oracle`)  
* **Target Storage:** Feature Store Online Store (`Redis Cluster`) & Offline Lakehouse (`Apache Iceberg / Parquet`)  
* **Ingestion Cadence:** Real-time Change Data Capture (CDC) via Debezium + Kafka  
* **SLA Freshness:** Event-to-Redis latency ≤ 3.0 seconds (P95)  

---

## 2. Field-Level Transformation Specification

| Target Feature Name | Target Data Type | Source System & Table | Source Column(s) | Transformation / Business Logic | Null Handling & Default | Leakage Prevention Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `entity_id` | `VARCHAR(64)` | `core.transactions` | `user_id` | Direct mapping; trim whitespace; lowercase | Mandatory (Drop if NULL) | Entity join key |
| `event_time` | `TIMESTAMP_NTZ` | `core.transactions` | `created_at` | Convert to strict UTC ISO-8601 | Mandatory (Reject event) | Primary time anchor for PIT joins |
| `tx_amount_cents` | `INTEGER` | `core.transactions` | `amount` | `ROUND(amount * 100)` (store in cents) | Default: `0` | Snapshot value at transaction time |
| `tx_velocity_1h` | `INTEGER` | `core.transactions` | `transaction_id` | Sliding window count over last 3,600s in Redis | Default: `1` | Strictly excludes current tx |
| `amount_zscore_30d`| `FLOAT` | Aggregated Store | `amount`, `avg_30d`, `std_30d` | `(amount - avg_30d) / NULLIF(std_30d, 0.0)` | Default: `0.0` | Computed from prior matured days |
| `country_mismatch` | `BOOLEAN` | `core.transactions` | `card_country`, `ip_country` | `CASE WHEN card_country != ip_country THEN 1 ELSE 0 END` | Default: `0` | Evaluated at decision time |
| `device_age_days` | `FLOAT` | `core.devices` | `first_seen_at`, `created_at` | `EXTRACT(EPOCH FROM (created_at - first_seen_at)) / 86400` | Default: `0.0` (new device) | Must not use future device updates |

