# Pack: Ad Click-Through Rate Prediction (AdTech)

Integration code for a live bidder: **OpenRTB** validation and mapping, **consent gate**, **deadline-aware execution with a stage-by-stage latency budget**, pacing and caps, **reconciliation**, exchange authentication and **per-exchange canary with automatic rollback**, plus a deterministic traffic simulator.

```bash
cd fde-packs/adtech/ctr-prediction-ads
python3 -m pytest tests -q        # 14 tests
```

| File | What it is |
|------|------------|
| `src/rtb_integration/openrtb.py` | BidRequest validation (per-exchange profile), mapping to the scoring contract, BidResponse, no-bid reasons, second-price clearing |
| `src/rtb_integration/consent.py` | TCF v2 core decoding and builder, US Privacy, COPPA, LMT; the fail-closed gate |
| `src/rtb_integration/budget.py` | The 8 ms budget by stage; `Pipeline` with per-stage deadline checks and p50/p99 reports |
| `src/rtb_integration/pacing.py` | Budget, even pacing, frequency cap, reservation of spend at bid time |
| `src/rtb_integration/reconcile.py` | Bids vs wins vs impressions vs clicks vs billing |
| `src/rtb_integration/exchange_auth.py` | Source CIDRs, signed notices, key rotation; `ExchangeTraffic` canary and rollback |
| `src/rtb_integration/simulator.py` | Deterministic OpenRTB traffic with consent variety |
| `config/exchanges.example.json` | Per-exchange profile example |
| `docs/exchange-integration.md` | Mapping, certification, authentication, the latency budget, no-bid behaviour, consent, identity, reconciliation, rollout |

Latency numbers in the tests use an injected clock: they prove the *logic* of deadline handling. Measure the real p99 on production hardware with the real bidder. No exchange certification has been performed here.
