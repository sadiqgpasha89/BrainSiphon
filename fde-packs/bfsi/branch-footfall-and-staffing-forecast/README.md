# Pack: Branch Footfall & Staffing Forecast (BFSI)

The integration architecture **rebuilt around branch operations and workforce planning** (not core banking): sensor and queue-system data quality, identifier and time-zone reconciliation, calendars and refits,
**Erlang C staffing**, **labour-rule validation**, a roster recommendation, a **WFM proposal connector** and **branch-manager approval**, and per-branch accuracy and override reporting.

```bash
cd fde-packs/bfsi/branch-footfall-and-staffing-forecast
python3 -m pytest tests -q        # 15 tests
```

| File | What it is |
|------|------------|
| `src/branch_integration/footfall.py` | Sensor failure detection, imputation, branch master with aliases, time-zone and DST handling, calendar, cold start |
| `src/branch_integration/staffing.py` | Erlang C, agents needed, hourly requirement, labour rules and roster validation, skills, recommendation |
| `src/branch_integration/wfm.py` | `wfm-roster` adapter (proposals, status check, publish only after approval) and a mock |
| `src/branch_integration/approval.py` | Manager approval with diff, legality gate, rejection reason, amendment |
| `src/branch_integration/reports.py` | WAPE, bias, peak error, P90 coverage, imputed share; override feedback |
| `config/` | WFM connector, branch master (aliases, time zones), labour rules (placeholder) |
| `docs/branch-integration.md` | The corrected system map, flow, controls, discovery questions, rollout |

Labour rules in `config/labour-rules.json` are placeholders: the customer's HR and legal teams own the real ones. No WFM product has been connected: the adapter follows a generic roster REST shape.
