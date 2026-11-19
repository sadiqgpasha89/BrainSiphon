# Runbook

Every alert in `monitoring/alerts.yaml` links to a section here. First steps for any alert: open the console (`/ui/`), run
`make monitor`, and read a few traces (`GET /v1/cases/{id}`): the trace is the agent's reasoning you can check.

## Stop the agent, or roll it back

```bash
curl -X POST $API/v1/agent/rollback -H "Authorization: Bearer $LEAD_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"<incident reference and what you saw>"}'
```

To stop automated investigation entirely, stop the worker. Alerts keep arriving and are opened as cases (`status: new`);
analysts work them by hand, and `POST /v1/cases/{id}/investigate` runs the agent on a single case when you want it.
Pending approvals are unaffected: nothing executes without them.

## Missed threat

A case the agent closed as benign was judged a true positive by an analyst. Treat it as a security incident first (contain
by hand), then as an agent incident: read the trace, add the case to the suite (the verdict already did), run
`make reevaluate`. The current version will now fail the "missed threats" gate, which is the point: fix the playbook or
prompt and evaluate again before promoting anything.

## Override rate high

Analysts are changing the agent's own verdicts. Read the overridden cases side by side with their traces. A pattern (one
rule, one asset class) means a playbook or prompt gap; no pattern means the evidence the tools return is not what analysts
actually use.

## Escalation rate high

More than half the cases go to a person. Check `tool_error_rate` first (an agent with failing tools escalates everything),
then whether a new alert type is arriving that no playbook covers.

## Approval rejections high

Approvers reject what the agent proposes. Either the verdicts are wrong (see override rate) or the actions are too heavy
for the evidence. Do not "fix" this by loosening approvals.

## Tool errors

Investigations are running on partial evidence. Check the upstream system and the read-only credential. The agent already
treats a failed tool as missing evidence and tends to escalate.

## Step budget exhausted

Investigations end without a conclusion. Read the trace of one: repeated identical calls are a planner fault; many distinct
useful calls mean the budget is too small for that alert type.

## Approvals overdue

A containment action has waited past its SLA and the threat is still active. Page the approvers. Expired approvals are
never executed; the case returns to a person.

## Cases uninvestigated

Alerts are ingested but nothing investigates them: no production agent version (`make evaluate`) or the worker is down.

## Dead letters

An alert event failed three times. Read `dead_letters.error` and `payload`, fix the cause, re-publish with a new event id.
An alert in the dead-letter queue is an alert nobody is looking at.
