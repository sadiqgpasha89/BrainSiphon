# Pack: Phishing URL & Email Detection (Cybersecurity)

What turns a phishing classifier into a **security response solution**: vendor-specific event mappings, STIX/TAXII feeds, an inline inspection API with a stated failure policy,
a **read-only-by-default response controller** with approvals, a journal and reversible actions, an analyst feedback loop, and an executable incident simulation.

```bash
cd fde-packs/cybersecurity/phishing-url-and-email-detection
python3 -m pytest tests -q        # 11 tests
```

| File | What it is |
|------|------------|
| `src/phish_integration/events.py` | CEF parse/build, Proofpoint TAP and Defender mappings, canonical event with provenance and tenant, OCSF Email Activity |
| `src/phish_integration/stix.py` | STIX 2.1 indicator handling, TAXII 2.1 client |
| `src/phish_integration/gateway.py` | Synchronous inspection with deadline, allow-list and failure policy |
| `src/phish_integration/response.py` | Read-only by default; grants (scope, approvers, ticket, expiry, uses); journal before action; undo with the inverse |
| `src/phish_integration/feedback.py` | False-positive and false-negative loop, expiring allow and block lists |
| `src/phish_integration/simulate.py` | End-to-end incident simulation with a stand-in scorer |
| `fixtures/` | Safe messages, a STIX bundle, a note on EICAR and GTUBE |
| `docs/siem-soar-integration.md` | Vendor mappings, the response boundary, permissions per product, playbook mapping, test environment, pilot plan |

The scorer in `simulate.toy_score` is **not the model**. No vendor product has been connected: the mappings follow the vendors' documented field names and must be verified against the customer's tenant and API versions.
