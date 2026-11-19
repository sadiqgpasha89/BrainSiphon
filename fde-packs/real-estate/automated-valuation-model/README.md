# Pack: Automated Valuation Model (Real Estate)

Market-specific implementation for a valuation service: **RESO Web API** access with **licence, attribution and redistribution enforcement and audit**, address and parcel identity, duplicate-listing resolution,
**comparable selection, adjustment and presentation**, confidence and low-confidence escalation, **residential versus commercial** separation, role-based access, appraisal review and challenge, and the underwriting and collateral payload.
Three market packs (US, UK, India) hold the identifiers, licence terms and comparable rules that differ by market.

```bash
cd fde-packs/real-estate/automated-valuation-model
python3 -m pytest tests -q        # 12 tests
```

| File | What it is |
|------|------------|
| `src/avm_integration/licence.py` | Licence terms enforced in code: fields per use, attribution, redistribution, retention, audit |
| `src/avm_integration/reso.py` | RESO Web API adapter, Data Dictionary mapping, area-unit normalisation, a mock MLS |
| `src/avm_integration/address.py` | Address normalisation, parcel ids, duplicate relistings, building-unit relationships |
| `src/avm_integration/comps.py` | Eligibility, similarity, adjustments with gross and net caps, valuation, confidence and routing |
| `src/avm_integration/commercial.py` | Commercial data requirements and direct capitalisation |
| `src/avm_integration/access.py` | Role-based view of a valuation |
| `src/avm_integration/workflow.py` | Review, challenge, final valuation, underwriting payload |
| `market_packs/` | `us-reso`, `uk-land-registry`, `in-state-registry` |
| `docs/market-implementation.md` | The corrected system map, MLS onboarding, mappings, identity, comparables, workflow |

No MLS has been connected. Licence terms in the market packs are *starting points*: the signed licence and the customer's counsel govern. BMS and IoT data are **optional** condition features, and a maintenance work-order system is not a destination of this use case.
