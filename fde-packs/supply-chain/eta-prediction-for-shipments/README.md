# Pack: Shipment ETA Prediction (Supply Chain)

Independent integration code for EDI, carrier feeds, telemetry and the downstream actions an ETA change causes.

```bash
cd fde-packs/supply-chain/eta-prediction-for-shipments
python3 -m pytest tests -q        # 13 tests
```

| File | What it is |
|------|------------|
| `src/eta_integration/edi.py` | X12 214 and EDIFACT IFTSTA parsing to canonical milestones; 997 builder |
| `src/eta_integration/events.py` | Event time vs processing time, out-of-order, duplicate, correction and missing-ping handling |
| `src/eta_integration/geo.py` | Coordinates, geofences, location quality, GPS anomaly detection |
| `src/eta_integration/security.py` | Signed webhooks with replay protection and secret rotation; certificate expiry and rotation plan |
| `src/eta_integration/policy.py` | Publish, withhold and recalculate rules; downstream actions; manual override book and exceptions |
| `src/eta_integration/edge.py` | Store-and-forward buffer for intermittent warehouse or vehicle links |
| `src/eta_integration/registry.py`, `config/carriers.json` | Carrier registry with onboarding and certification checklists |
| `fixtures/` | A 214 and an IFTSTA sample |
| `docs/integration.md` | The six integrations, canonical event, mappings, onboarding, partner identity, event-time rules, publication rules |

Not covered: a real AS2 stack, an MQTT broker client, a TMS or WMS vendor API: they use the framework's adapters and the customer's endpoints. The 214 and IFTSTA parsers
cover the segments above; carrier-specific variants (extra qualifiers, private segments) go into per-carrier profiles after reading the carrier's implementation guide.
