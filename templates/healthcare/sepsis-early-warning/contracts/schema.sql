-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE sepsis_early_warning_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  lactate_and_trend                  DOUBLE PRECISION,
  missingness_pattern                DOUBLE PRECISION,
  sirs_and_qsofa_drift               DOUBLE PRECISION,
  vital_sign_slope_3h                DOUBLE PRECISION,
  reading_density_4h                 DOUBLE PRECISION,
  clinician_order_frequency          DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE sepsis_early_warning_decisions (
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
CREATE TABLE sepsis_early_warning_labels (
  decision_id    UUID        NOT NULL REFERENCES sepsis_early_warning_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
