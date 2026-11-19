# Pack: Support Ticket Triage & Priority (SaaS)

A ready-to-configure **ticketing connector package**: Zendesk read and writeback with idempotent, conflict-safe updates; webhook verification; CRM entitlements, priority matrix, routing and SLA escalation as customer configuration;
**strict tenant isolation**; **on-behalf-of authorisation** with permission-filtered retrieval; human approval for high-impact actions; multilingual routing; feedback and operational metrics.

```bash
cd fde-packs/saas/support-ticket-triage-and-priority
python3 -m pytest tests -q        # 14 tests, including a replay of a write and a concurrent-edit conflict against a Zendesk-shaped mock
```

| File | What it is |
|------|------------|
| `src/ticket_integration/zendesk.py`, `mock_zendesk.py` | The adapter and a local mock |
| `src/ticket_integration/webhook.py` | Signed-webhook verification with tolerance, replay protection, rotation |
| `src/ticket_integration/entitlements.py` | Tier and contract SLA lookup, priority matrix, routing, escalation |
| `src/ticket_integration/tenant.py` | Tenant-scoped index, cache, telemetry and log scrubbing, failing closed |
| `src/ticket_integration/obo.py` | Token exchange and caller-specific retrieval and writes |
| `src/ticket_integration/approvals.py` | Approval queue for high-impact actions |
| `src/ticket_integration/feedback.py`, `language.py` | Corrections, metrics, language detection, taxonomy per language |
| `config/` | Zendesk connector, routing rules, taxonomy |
| `docs/ticketing-connector-package.md` | Platform matrix, mapping, controls, sandbox and replay |

Not covered: a real Zendesk, ServiceNow or Salesforce tenant (mocks only), the customer's priority matrix and routing policy (they must supply them), and the identity provider's token-exchange endpoint.
