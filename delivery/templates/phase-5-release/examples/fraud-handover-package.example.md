# Worked example: handover package for the card-fraud reference use case

> **This is an illustration, not evidence.** It shows how the template is completed for the *Real-Time Card & UPI Fraud Detection* reference implementation. Every value below is invented for the example. The reference implementation has run only on synthetic data, so a real handover would replace every figure with a measurement from your own environment.

System: Card-fraud decisioning. Release `v0.4.0`, image `sha256:…` (illustrative). Environment: pre-production at a fictional bank.

## 1. Architecture as deployed (excerpt)

Authorisation switch → API gateway → `decision-api` (3 pods, 3 zones) → feature cache (Redis) + model server → decision ledger. Difference from the blueprint: the customer mandates their existing Kafka cluster instead of the reference broker; the outbox publishes to it through a private endpoint.

## 4. SLIs and SLOs (excerpt, with measured values)

| SLI | SLO | Measured (14 days, pre-production) | Note |
| --- | --- | --- | --- |
| p99 decision latency | 50 ms | 31 ms (replayed traffic, not production) | Replay only; production unmeasured |
| Availability | 99.9 % | not yet measurable | Shadow period not started |
| Fraud capture at 0.5 % review rate | ≥ 70 % | 64 % on 30 days of customer data | **Below target; blocks Gate 5** |

## 7. Outstanding risks (excerpt)

| ID | Description | Severity | Owner | Due |
| --- | --- | --- | --- | --- |
| H-01 | Capture below target on card-not-present slice | High | Data scientist | Before shadow |
| H-02 | Restore test not yet run | High | SRE | Before canary |

## 12. Acceptance record

| | Role | Decision |
| --- | --- | --- |
| Business | Head of fraud operations | **Rejected** until H-01 closed |
| Technical | Platform lead | Accept with conditions: H-02 |

The point of the example: a handover that is rejected with the reasons recorded is a successful use of the gate.
