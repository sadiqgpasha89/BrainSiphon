# Phishing detection as an enterprise security response solution

A phishing **detection engine** returns a score. A **security response solution** also has tested SIEM/SOAR integrations, approval controls and reversible
remediation. This pack is the second half.

## 1. Two integration paths, kept apart

| Path | Style | Deadline | Direction | Implementation |
|------|-------|----------|-----------|----------------|
| **Inline inspection** | Synchronous API the email gateway or URL-rewrite service calls | ~100 ms | gateway -> us -> verdict | `gateway.InspectionService` |
| **Event ingestion** | Asynchronous: syslog/CEF, OCSF, vendor APIs, mail logs, threat feeds | seconds to minutes | sources -> us -> SIEM | `events.py`, `stix.py` |
| **Response** | Calls into SOAR, EDR, gateway admin APIs | human-paced | us -> customer systems | `response.Controller` (approval-gated) |

Inline failure behaviour is a business decision with a measured cost either way (`on_timeout`: deliver, deliver with a warning banner, quarantine), recorded in the architecture decision record.

## 2. Vendor-specific event mappings (not just "syslog and CEF")

| Product | Event source | Fields we need | Mapping in this pack |
|---------|--------------|----------------|----------------------|
| Proofpoint TAP | SIEM API `messagesDelivered`, `messagesBlocked` (`/v2/siem/all`) | GUID, messageTime, fromAddress, senderIP, recipient, subject, phishScore, threatsInfoMap | `from_proofpoint_tap` |
| Microsoft Defender for Office 365 | Advanced Hunting `EmailEvents`, `EmailUrlInfo`, `EmailPostDeliveryEvents` (Sentinel connector) | NetworkMessageId, Timestamp, SenderFromAddress, RecipientEmailAddress, ThreatTypes, DetectionMethods, DeliveryAction | `from_defender_email_events` |
| Mimecast, Abnormal Security, Cisco Secure Email, Google Workspace | Their SIEM/log APIs | message id, time, sender, recipients, verdict | Same canonical event: add one mapper function per product (copy `from_proofpoint_tap`) |
| Generic syslog/CEF (any gateway) | UDP/TCP/TLS syslog | `CEF:` header + extension (`src`, `suser`, `duser`, `msg`, `rt`) | `parse_cef` (escaping of `|`, `=` and `\`) |
| Splunk | HTTP Event Collector `POST /services/collector/event` | OCSF JSON as the event | `to_ocsf_email_activity` |
| Microsoft Sentinel | Logs Ingestion API / ASIM `EmailEvent` schema | normalised columns | map the canonical event to ASIM in the data-collection rule |
| Security data lakes (Chronicle, Security Lake, Snowflake) | OCSF (Security Lake) / UDM (Chronicle) | OCSF class 4009 Email Activity | `to_ocsf_email_activity` |

**Every canonical event carries:** `source` and `source_event_id` (provenance), `event_time` (UTC, from the source) separate from `ingest_time`, `tenant` (an event without one is refused),
and a `dedupe_key` derived from source+tenant+id, never from time. Verify OCSF field names against the schema version the customer's lake ingests.

## 3. Threat intelligence: STIX 2.1 over TAXII 2.1

`stix.TaxiiClient` pages a collection (`added_after`, `next`); `stix.indicators` keeps single-observable patterns (`url`, `domain-name`, `email-addr`, `ipv4-addr`, file hashes),
drops expired, revoked and low-confidence indicators, keeps the highest-confidence duplicate, preserves provenance (source feed, indicator id, validity, labels), and **refuses patterns it cannot apply safely**
(`AND`, `FOLLOWEDBY`, `REPEATS`) rather than guessing. Poll from the last `date_added` you stored; never re-import a feed on restart.

## 4. Detection versus response: the boundary

| Capability | Default | To enable |
|------------|---------|-----------|
| Score, verdict, banner recommendation, SIEM enrichment | **On** (read-only) | n/a |
| Add a warning banner (low risk, reversible) | On | n/a |
| Quarantine a message, block a URL | **Off** | A named owner and a change ticket enable `approval-gated` mode; then each use needs a **grant**: action, scope (tenant, mailbox or domain), approver(s), ticket, expiry, maximum uses |
| Disable an account, isolate an endpoint | **Off** | As above with **two distinct approvers** |

Every action is **journalled before it runs** (a crash leaves evidence), names the actor, approvers and ticket, and has a recorded inverse: `release_message`, `unblock_url`, `enable_account`, `release_endpoint`, `remove_banner`.
`Controller.undo(action_id, by, reason)` performs the inverse and records why. Rehearse the undo on a test mailbox before the pilot: remediation of an incorrect containment is part of the acceptance test.

## 5. Product-specific permissions (start read-only; add only what a specific automation needs)

| System | Read-only starting role | Added only for approved actions | Escalation procedure |
|--------|------------------------|--------------------------------|----------------------|
| Microsoft Graph / Defender for Office 365 | `ThreatHunting.Read.All`, `SecurityEvents.Read.All`, `Mail.Read` is **not** requested | `ThreatSubmission.ReadWrite`, `Mail.ReadWrite` scoped by an application access policy to pilot mailboxes | Security owner approves in the change record; app access policy narrows scope; review after the pilot |
| Proofpoint TAP / TRAP | Service principal with TAP read | TRAP quarantine API role | Proofpoint admin grants a role to the service principal, ticketed |
| Mimecast | Read-only API application role | Message-hold/release role | Customer's Mimecast admin |
| CrowdStrike Falcon / Defender for Endpoint / SentinelOne | Detections and hosts read | Contain/network-isolate role | Two approvers; never a blanket role |
| Splunk / Sentinel / QRadar | Write to a dedicated index/table; read of its own data | Search over other indexes only with a reviewed need | SIEM owner |
| SOAR (XSOAR, Splunk SOAR, Sentinel playbooks, ServiceNow SecOps) | Create cases, read playbook status | Run named playbooks, not arbitrary actions | SOC manager |

Privilege escalation is a **change**, not a configuration tweak: ticket, approver, scope, expiry, review. Document the exact permission names for the customer's tenant and product version in the connector registry.

## 6. SIEM/SOAR playbook mapping (customer-specific)

| Trigger | SIEM detection | SOAR playbook | Human step | Action (if approved) | Rollback |
|---------|----------------|---------------|------------|----------------------|----------|
| Score >= block threshold | `brainsiphon.phish = phish` on Email Activity | `phish-quarantine`: enrich sender and URLs, check allow-list, open case | Analyst reviews the case (SLA: 15 min) | `quarantine_message` within the grant | `release_message` |
| Same URL in 3+ recipients in 10 min | Correlation rule | `phish-campaign`: block URL, search and purge | Lead approves campaign scope | `block_url` + purge (two approvals for tenant-wide) | `unblock_url`, restore messages |
| User-reported phish | Mailbox report -> event | `phish-user-report`: score, answer the user, label | Analyst confirms or releases | optional | feedback label |
| Click-time detonation hit | Click event | `phish-click`: find the user, check sign-ins | Analyst | `disable_account` only with two approvers | `enable_account` |

## 7. Feedback loop (`feedback.PolicyLists`)

False positives (benign mail wrongly flagged) become labelled data and, if justified, an **allow-list entry**: reason, owner, expiry (90 days), second approver for a whole domain, no wildcards.
False negatives (missed phish) become labelled data and a 30-day block entry. Review monthly: entries that never matched are removed. Metrics: false positives, false negatives, allow and block entries, time to resolve.
Trusted-sender policy (partners, internal systems) is owned by the security team, not the model team.

## 8. Test environment and fixtures for the FDE

- A **test email gateway** (a lab tenant of the customer's product, or a local SMTP sink plus `InspectionService`) and a **test SIEM/SOAR** (a free Splunk/Sentinel workspace, or the customer's dev instance).
- **Safe fixtures** (`fixtures/`): `.invalid` domains, defanged URLs, no real payloads. Attachment-path tests use the **EICAR** and **GTUBE** test strings generated by the harness, never stored malware. Browser detonation runs in the customer's sandbox, not on the FDE's laptop.
- `simulate.run(messages, now=...)` drives the whole process: verdict -> SIEM event (OCSF) -> SOAR case -> approval-gated action -> journal -> undo, and shows what a **read-only** integration does with the same traffic (detects, refuses actions, journals the refusals).

## 9. Pilot sequence

1. Read-only on a pilot mailbox group; compare verdicts with the existing gateway for two weeks; review every disagreement with analysts.
2. Banner-only action for suspicious mail.
3. Quarantine with per-incident grants for the pilot group; undo rehearsed; measure false-positive rate and time to release.
4. Widen scope by tenant segment; never remove the approval gate for high-risk actions.
