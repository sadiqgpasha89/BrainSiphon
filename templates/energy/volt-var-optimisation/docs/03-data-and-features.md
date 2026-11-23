# Volt-VAR Optimisation Advisor: data and feature specification

> Generated from the blueprint `energy/volt-var-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Volt-VAR Optimisation Advisor · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Volt-VAR Optimisation Advisor": Recommend capacitor, regulator and inverter settings that keep voltage in range and reduce losses, as advice to the operator within protection limits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Learned safety limits.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Measured voltage profile | voltages along the feeder | Violation risk | From meters and sensors |   |   |   |
| Load and DER forecast | net load and solar output forecast | Look-ahead | From the forecasts |   |   |   |
| Device state and wear | switch counts of capacitors and regulators | Equipment life | From device logs |   |   |   |
| Loss estimate | modelled technical losses | Objective | From the power flow |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Limits | Hard voltage and loading limits in code | A learned limit | A learned limit can fail in a rare state |
| Model | A power flow model with learned corrections | A pure black box | Operators need to see why a setting is safe |
| Evaluation | Matched periods with similar load and weather | Before and after totals | Load changes dominate raw comparisons |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Device name | an identifier |
| Operator name | irrelevant |
| Timestamp precision | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Measured voltage profile inputs | Network operations | SCADA and ADMS (advanced distribution management) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from meters and sensors. |
| Load and DER forecast inputs | Asset management | Meter data management and billing (CIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the forecasts. |
| Device state and wear inputs | Retail and customer operations | Asset management and GIS | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from device logs. |
| Loss estimate inputs | Network operations | SCADA and ADMS (advanced distribution management) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the power flow. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: volt_var_optimisation_inputs.v1
owner: network-operations@example.com
system_of_record: SCADA and ADMS (advanced distribution management)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: measured_voltage_profile, type: double, nullable: false }
    - { name: load_and_der_forecast, type: double, nullable: false }
    - { name: device_state_and_wear, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Measured voltage profile and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Load and DER forecast against SCADA and ADMS (advanced distribution management)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Measured voltage profile, traces back to SCADA and ADMS (advanced distribution management); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| NASA Prognostics Data Repository (C-MAPSS and others) | https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/ | Public NASA data (see the page) | Run-to-failure sensor data for engines and other components | Simulated or lab data; real fleets are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ETT electricity transformer dataset | https://github.com/zhouhaoyi/ETDataset | CC BY-ND 4.0 (see the repository) | Multivariate transformer temperature and load data used for long-horizon forecasting benchmarks | One asset type. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE volt_var_optimisation_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  measured_voltage_profile           DOUBLE PRECISION,
  load_and_der_forecast              DOUBLE PRECISION,
  device_state_and_wear              DOUBLE PRECISION,
  loss_estimate                      DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE volt_var_optimisation_decisions (
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
CREATE TABLE volt_var_optimisation_labels (
  decision_id    UUID        NOT NULL REFERENCES volt_var_optimisation_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Energy and utilities balance supply and demand second by second on physical networks that fail in the field. Weather, asset age and customer behaviour drive the data, outages carry safety and regulatory consequences, and control actions stay with licensed operators and protection systems. For this use case, "Volt-VAR Optimisation Advisor": Recommend capacitor, regulator and inverter settings that keep voltage in range and reduce losses, as advice to the operator within protection limits. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Renewable output depends on weather | Solar and wind generation follow irradiance, cloud cover and wind speed, with ramps that are hard to predict. Forecast quality varies by site, season and horizon. | Probabilistic forecasts let operators size reserves, whereas point forecasts hide the risk. |
| Operators and protection systems hold control | Grid, gas and water operations are safety-critical and regulated. AI recommends and forecasts, while switching, dispatch and protection stay with licensed operators and certified systems. | A recommendation that cannot be explained or overridden will not be used in a control room. |
| Outage management is a fault location problem | When a fault trips protection, operators locate it from smart meter, SCADA and customer calls, then restore supply in stages. Faster location shortens outage minutes. | Customer minutes lost are the regulated measure, so restoration order matters as much as detection. |
| Learning from logs: off-policy evaluation | Most business data were generated by an earlier policy. To judge a new policy offline you need the probability with which each logged action was chosen; estimators such as inverse propensity weighting, self-normalised weighting and doubly robust methods correct for the difference, with a bias-variance trade-off. | Never evaluate a new policy only on the rows where it agrees with the old one; log propensities from day one. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Measured voltage profile | Voltages along the feeder. Violation risk. | Leakage risk to design against: From meters and sensors. |
| A signal-versus-noise trap in this use case: Limits | The true signal is hard voltage and loading limits in code; the common noise is a learned limit. | A learned limit can fail in a rare state. |

**Ask the experts**

- [ ] What exactly does "Voltage limits enforced in a rules layer outside the model" mean in practice for volt-var optimisation advisor: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Measured voltage profile" and "Load and DER forecast", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Voltage violations" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: learned safety limits, and who can confirm the cut-off times and splits?
- [ ] How often does "Reverse power flow" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Net metering | Crediting customers for energy they send to the grid. |
| DER | Distributed energy resources such as rooftop solar, batteries and electric vehicles. |
| AMI | Advanced metering infrastructure: smart meters and the network that reads them. |
| AMR | Automatic meter reading. |
| Substation | A facility that transforms voltage and switches circuits. |
| Transformer | Equipment that changes voltage levels. |
| Load forecast | A prediction of electricity demand. |
| Capacity factor | Actual output divided by maximum possible output. |
| Power factor | A measure of how effectively current is converted to useful power. |
| Non-technical loss | Energy lost to theft, metering errors or billing faults. |
| Off-policy evaluation (OPE) | Estimating how a new policy would perform from data logged under another policy. |
| Reward | The number the system tries to maximise over time. |
| Propensity | The probability with which the logging policy chose the logged action. |
| Doubly robust estimator | An off-policy estimator that combines a reward model with propensity weighting. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
