# CTR prediction in a live bidder: exchange integration, certification and cutover

The FDE's work here is **partner certification, low-latency exchange integration and traffic cutover**. Generic VPC connectivity and employee SSO are not the critical path.

## 1. Layers

| Layer | What | Here |
|-------|------|------|
| External protocol | OpenRTB 2.5 / 3.0 over HTTP (JSON or Protobuf) per exchange; win/loss notices, impression and click beacons | `openrtb.py`, `exchange_auth.py` |
| Connector and transformation | Validate, consent-gate, map `BidRequest` x `Imp` to the internal scoring contract, build `BidResponse` | `openrtb.py`, `consent.py` |
| Internal contract | `ScoreRequest` (per impression) and the CTR prediction | `openrtb.to_score_request` |
| Acknowledgement | `BidResponse` or no-bid (HTTP 204, or `nbr`), `200` to notices | `build_response`, `no_bid` |

## 2. Exchange-specific mapping: a profile per exchange

For each exchange keep a profile (`config/exchanges.example.json`): endpoint, protocol version, required extensions (`required_ext`), default `tmax`, supported creative types, currencies, seat ids, source CIDRs, signing keys, notice URLs and macros, its own no-bid reason codes. Differences between exchanges are data, not code.
Typical divergences to read in each exchange's specification: `ext.sellers`/`schain` presence, `ads.txt` checks, floor semantics (net or gross), price macros (`${AUCTION_PRICE}` encoding), `bidfloor` currency handling, banner `format` arrays vs `w`/`h`, deal ids (`pmp`), and minimum creative review time.
OpenRTB 3.0 carries the same facts in an AdCOM envelope: write a second mapping, not a second model.

## 3. Certification and onboarding per exchange

1. Obtain the exchange's technical specification, seat id, endpoints (production and test), QPS allocation and their certification test plan.
2. **Test with their simulator and with `simulator.generate`** (deterministic traffic) at their test QPS; record request/response logs for each certification case.
3. Cases that nearly every exchange asks for: valid bid; no-bid; bid below floor (must not be sent); unsupported creative size; invalid impid; response after `tmax` (must not be sent); consent-denied request (no bid); duplicate request ids; malformed JSON; high QPS burst.
4. Win/loss/impression/click notice endpoints: verify signatures (`ExchangeAuth.verify_notice`), idempotent handling (a notice is processed once per bid id), and `2xx` only after the event is stored.
5. Creative approval and blocked-category/advertiser lists agreed; `adomain` and `crid` populated.
6. Sign-off from the exchange, then a ramp plan (below). Record exchange, version, date and contact in the connector registry.

## 4. Authentication, request verification and key rotation

| Concern | Mechanism |
|---------|-----------|
| Is this request from the exchange? | Source CIDR allow-list per exchange; TLS; where offered, request signing |
| Are notices genuine? | HMAC over the payload with the exchange's key; two keys valid during rotation (`rotate`, then `retire`); unknown or retired key ids refused |
| Certificates | mTLS where the exchange requires it: expiry tracked and rotated 45 days ahead (see the supply-chain pack's `rotation_plan` pattern) |
| Blast radius | One key set and one traffic share **per exchange**: compromising or misconfiguring one never affects another |

## 5. The 8 ms p99 is a budget, not a target

| Stage | Budget (ms) | Notes |
|-------|-------------|-------|
| Network in (exchange to our edge) | 1.0 | Measured by the exchange; colocate in their region |
| Parse and validate | 0.3 | Use the exchange's wire format (Protobuf if offered) |
| Consent gate | 0.1 | Decode the string once per user session and cache |
| Feature retrieval | 2.0 | In-process cache first; the remote store only on a miss |
| Model inference | 2.0 | Quantised, batched per request |
| Auction logic, pacing, caps | 0.4 | Local state, reservations |
| Build response | 0.3 | Pre-rendered creative templates |
| Network out | 1.0 | |
| Reserve | 0.9 | Never spent in design: it is the p99 tail |
| **Total** | **8.0** | `budget.DEFAULT_BUDGET_MS` |

`budget.Pipeline` gives each stage what is **left**, answers no-bid before a stage that cannot finish (reason `501 Deadline exceeded`), takes `tmax` from the request minus a network reserve, and reports per-stage p50/p99 and the worst stage. Tests drive it with an injected clock (no sleeping, no flakiness). Run the real harness at production QPS on production-shaped hardware: a Python harness measures logic, not the JVM/Go/C++ bidder's tail.

## 6. When a dependency is down: timeout and no-bid behaviour

| Failure | Behaviour | `nbr` |
|---------|-----------|-------|
| Feature store slow or down | Serve from the in-process cache; if no entry, bid with the segment prior at a reduced bid, or no-bid by policy | 502 |
| Model service unavailable | Fall back to the calibrated baseline (logistic) in process; if that fails, no-bid | 502 |
| Budget, pacing or frequency cap exhausted | No-bid | 503 |
| Consent not established | No-bid; **no feature fetch happens** | 500 |
| Deadline would be missed | No-bid, never late | 501 |
| Exchange share is zero (rolled back) | No-bid | 504 |

## 7. Consent and privacy

The gate is in front of feature retrieval: no consent means no lookup of the user's data and no scoring on it. `consent.may_process` decodes the TCF v2 core string (vendor and purpose consent), the US Privacy string, `coppa` and `lmt`, and **denies by default** when consent is required but cannot be established.
Integrate with the customer's CMP and regional frameworks (TCF v2.2 in the EU/UK, the IAB GPP and state-law strings in the US, Google's Additional Consent, local rules elsewhere): the purposes your processing needs are a decision for the customer's privacy counsel; this code makes whichever set they choose enforceable and testable. Use the IAB reference decoder in production.

## 8. Identity: campaign managers and bidder services are different things

| Plane | Who | Mechanism |
|-------|-----|-----------|
| Workforce | Campaign managers, analysts | OIDC SSO, roles per advertiser and campaign, audit log; budget and bid-modifier changes need a second approver above a threshold |
| Machine | Bidder, feature store, pacing service, model service | Workload identity and mTLS, scoped per service |
| Partner | Exchanges and measurement vendors | Per-exchange keys, CIDRs and certificates, rotated independently |

## 9. Events and money: reconciliation (`reconcile.py`)

Daily, per exchange and campaign: bids vs wins vs impressions vs clicks vs billing. Alerts: wins without impressions above 5%, impressions without wins, clicks without impressions, duplicate clicks,
a clearing price above our bid, and billing that differs from the expected spend by more than the tolerance. Decisions must not create inconsistent spend: the pacing service **reserves** budget at bid time and releases it on a loss (`pacing.Campaign`).

## 10. Rollout: per-exchange canary, cutover and rollback

1. **Shadow**: score live requests, log the bid that would have been sent, send nothing. Compare predicted CTR with observed on the exchange's own win/click data.
2. **Canary per exchange** (`ExchangeTraffic`): start at 1 to 5% of that exchange's requests, assigned by a stable hash of the request id.
3. Guardrails per exchange: timeout rate (5%), invalid-bid rate (2%), win rate, eCPM, CTR vs control, billing discrepancy. A breach sets that exchange's share to zero automatically.
4. Ramp 5, 25, 50, 100% over days, not hours; one exchange at a time.
5. Rollback is a traffic-share change to zero (instant, per exchange) with the previous model or the baseline serving. Keep the previous model warm for a week after each cutover.

## 11. Monitoring

Bid request rate, bid rate, **no-bid by reason**, win rate, CTR (predicted vs observed, per placement and per exchange: calibration), conversion rate, advertiser outcomes (CPA/ROAS), spend vs pace, p50/p99 per stage, timeout and invalid-bid rates per exchange, consent-denied share, billing discrepancy.
