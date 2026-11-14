# Ticketing connector package

A ready-to-configure package: authentication, field mapping, permissions and writeback tests for the ticketing platform, with the entitlement, tenancy and approval controls a real support operation needs.

## 1. Platforms

| Platform | Adapter | Read | Write | Auth | Idempotency |
|----------|---------|------|-------|------|-------------|
| **Zendesk** | `zendesk` (this pack) | Incremental cursor export (`/incremental/tickets/cursor`) | `PUT /tickets/{id}` with `safe_update` | API token (`email/token`) or OAuth | Marker tag `bs_<key>` on the ticket; a replay finds it and does nothing; 409 on a concurrent edit re-applies once on the fresh version |
| **ServiceNow** | framework `servicenow` | Table API with `sysparm_query` | `PATCH /table/{table}/{sys_id}` | Basic or OAuth | `correlation_id` lookup before create |
| **Salesforce Service Cloud** | framework `salesforce` | SOQL on `Case` | `PATCH sobjects/Case/<ExternalId>/<value>` | JWT bearer | Upsert by external id |

All three expose the same adapter interface: `read`, `write` with idempotency keys, mapping and contract checks. Replace the platform without touching the triage logic.

## 2. Bidirectional integration

| Direction | What | Where |
|-----------|------|-------|
| Read | New and updated tickets with requester, organisation, channel, language | `ZendeskAdapter.read` (cursor export; poll from the stored `end_time`) |
| Write | Priority, category (type or custom field), queue (group), assignee, tags, internal note, status | `ZendeskAdapter.write` |
| Not written by the AI | Public replies, closing, merging, credits | Approval queue (section 7), separate actions |

**Webhooks** (instead of polling) are verified by `webhook.Verifier`: HMAC-SHA256 over `timestamp + body`, a 5-minute window, replay protection, two secrets during rotation.
**Rate limits**: 429 with `Retry-After` is honoured by the framework client; use the incremental export (not search) for bulk reads; batch writes with `update_many` where the platform allows.
**Pagination** is cursor-based and resumable: store `after_cursor` or `end_time`, never re-export from the start.

## 3. Field mapping (customer-specific: `config/zendesk.connector.json`, `config/taxonomy.json`)

| Internal field | Zendesk | Note |
|----------------|---------|------|
| `ticket_id` | `id` | string |
| `text` | `description` (plus the first comment) | strip signatures and quoted replies before modelling |
| `organization_id` | `organization_id` | the join key to entitlements |
| `priority` P1..P4 | `priority` urgent/high/normal/low | map the customer's names once, both directions |
| `category` | custom field id or `type` | the taxonomy is the customer's: `taxonomy.json` holds labels per language |
| `queue` | `group_id` | resolve group names to ids at start-up |
| `language` | `locale` or detected | `language.detect` routes; the model classifies |

## 4. Entitlements, priority matrix, routing, SLA, escalation

`entitlements.Entitlements` joins CRM/billing (tier, subscription status, contractual SLA) on the organisation id with a staleness bound: a suspended account falls back to the free tier, an unknown account to standard, a stale record is flagged.
`priority()` is the customer's matrix (urgency x impact, tier bump of at most one level, an outage is always P1). `sla_for()` uses the contract SLA when present, else the tier. `route()` applies ordered rules from `config/routing-rules.json` (first match wins, no match goes to `triage`). `escalation()` reports the fraction of the running SLA clock used and who is told (warn at 75%, team lead at 100%, duty manager at 150%).
Get the priority matrix, the routing rules and the escalation policy **from the support operations owner in writing** before configuring: they are decisions, not defaults.

## 5. Tenant isolation (`tenant.py`)

Structural, not conventional: every operation on the index, the cache, telemetry or logs requires a valid tenant id and **fails closed** without one. The tenant filter is applied by the store, so a query string or a prompt cannot widen it. Cache keys carry the tenant. Documents carry a per-tenant key id. Telemetry carries a salted tenant hash and never ticket text. Logs are scrubbed of emails and tenant names.
Tests to run in the customer environment: tenant A queries for tenant B's confidential phrases (expect nothing); the same question in two tenants (expect no cache hit across); a request with no tenant (expect refusal).

## 6. Caller-specific permissions and on-behalf-of (`obo.py`)

The triage service never uses its own broad credential to read or change what the agent could not. It exchanges the agent's token (RFC 8693) for a short-lived token whose subject is the agent and whose actor is the service. Retrieval of knowledge articles, customer data and repository content is filtered by the agent's groups **before** anything reaches the model's context; writes are authorised against the agent's own rights (queues they work, actions their role allows) and the audit record names both the agent and the service.
Production uses the identity provider's token-exchange endpoint with RS256 tokens; the HMAC token service here is for tests.

## 7. Human approval (`approvals.py`)

Low-impact (category, priority P2-P4, tags, internal note, queue routing): automatic. High-impact (P1, close, merge, public reply, credit, executive reassignment): proposed by the system, approved by a **different person** (two for credits), expiring after two hours. An action nobody classified is treated as high impact.

## 8. Multilingual and customer-specific language

`language.detect` routes by script and stop-words; the classifier model reads the content. `Taxonomy.label(category, language)` shows each agent the customer's own wording; a per-language confidence floor sends low-confidence tickets to a human.

## 9. Feedback and metrics

`FeedbackStore` records every agent correction (field, model value, agent value) and reports acceptance by field and the most frequent confusions: they feed retraining and taxonomy fixes. `operational_metrics`: first-response time, time to resolution, SLA first-response breach rate, reassignments per ticket, escalation rate. Agent acceptance is the adoption metric.

## 10. Correlating product events and logs

Carry the ticket id (or an opaque case reference) into product error logs and event streams at support entry points (the "contact support" action attaches the trace id and recent request ids). Join in the warehouse on that reference; do not join on email address.

## 11. Sandbox and replay

Use a Zendesk sandbox (Enterprise plans) or a ServiceNow developer instance; `mock_zendesk.server()` reproduces the shapes locally. Keep `fixtures/` replayable: export 200 anonymised tickets with their true category and priority, replay through read, triage and a dry-run write (log the update instead of calling PUT), then compare with agent decisions.
