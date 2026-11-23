-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE process_setpoint_optimisation_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  current_setpoint_distance_from_the DOUBLE PRECISION,
  feed_quality_indicators            DOUBLE PRECISION,
  ambient_and_utility_conditions     DOUBLE PRECISION,
  equipment_fouling_indicator        DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE process_setpoint_optimisation_decisions (
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
CREATE TABLE process_setpoint_optimisation_labels (
  decision_id    UUID        NOT NULL REFERENCES process_setpoint_optimisation_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
