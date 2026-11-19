-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE real_time_card_upi_fraud_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  card_velocity_1m_1h_24h            DOUBLE PRECISION,
  device_card_fan_out                DOUBLE PRECISION,
  merchant_risk_drift                DOUBLE PRECISION,
  new_device_for_card                DOUBLE PRECISION,
  amount_versus_card_baseline        DOUBLE PRECISION,
  mule_ring_risk_scalar              DOUBLE PRECISION,
  payload_only_score_inputs          DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE real_time_card_upi_fraud_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE real_time_card_upi_fraud_labels (
  decision_id    UUID        NOT NULL REFERENCES real_time_card_upi_fraud_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
