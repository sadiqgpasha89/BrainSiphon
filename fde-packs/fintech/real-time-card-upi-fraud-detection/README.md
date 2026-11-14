# Pack: Real-Time Card & UPI Fraud Detection (FinTech)

The customer-integration code for the payment-switch hop: **ISO 8583** for cards, **UPI ReqPay** for UPI, the **internal scoring contract**, an
**idempotent decision ledger**, a **switch simulator**, shadow **replay**, **canary with automatic rollback to the legacy rules**, and
**reconciliation**. It is the FDE's starting point; the model service sits behind `Scorer`.

```bash
cd fde-packs/fintech/real-time-card-upi-fraud-detection
python3 -m pytest tests -q                    # 27 tests: codec, mapping, duplicates, reversals, advice, timeouts, stand-in, canary, reconciliation
```

| File | What it is |
|------|------------|
| `src/fraud_switch/iso8583.py` | ISO 8583 (1987 ASCII) pack/unpack, common field table, message-type pairs, response helper |
| `src/fraud_switch/upi.py` | UPI ReqPay parsing (illustrative subset: replace with a parser from NPCI's current schema) |
| `src/fraud_switch/mapping.py` | External request -> `ScoreRequest`; decision -> DE39 and DE54 (partial approval) |
| `src/fraud_switch/ledger.py` | One decision per transaction key, conflict detection, reversal and advice records, hash-chained |
| `src/fraud_switch/gateway.py` | TCP gateway and `SwitchClient` (what the switch does), deadline, stand-in |
| `src/fraud_switch/scorer.py` | `StubScorer` (tests), `HttpScorer` (the model service), `legacy_rules` (the way back) |
| `src/fraud_switch/canary.py` | Stable per-card rollout, automatic rollback |
| `src/fraud_switch/replay.py` | Shadow replay with switch-side latency percentiles and legacy agreement |
| `src/fraud_switch/reconcile.py` | Decisions vs switch outcomes vs chargebacks vs fraud labels |
| `src/fraud_switch/hsm.py` | `Tokeniser` interface and a development-only software mock with key rotation |
| `fixtures/iso8583_replay.jsonl` | 300 synthetic authorisations (test PANs only) |
| `contracts/` | JSON Schemas of the internal contract |
| `docs/payment-switch-integration.md` | Layers, message types, DE mapping, response mapping, HSM, identity, certification, PCI checklist, rollout and reconciliation |

Point the gateway at the real model service: `Gateway(HttpScorer("https://scoring.internal/v1/score", bearer), tokeniser, ...)`.
The reference implementation in `reference-implementations/realtime-decisioning` exposes a compatible endpoint.

**Not covered here, and why:** real acquirer certification, an HSM, UPI signature verification and NPCI's schema, and 3-D Secure. They
need the customer's partners and hardware. The docs list what evidence each one needs.
