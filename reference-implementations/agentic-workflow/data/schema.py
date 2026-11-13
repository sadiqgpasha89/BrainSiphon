"""Tables owned by this implementation (the platform tables live in bsref.db)."""

from sqlalchemy import Column, Float, Integer, String, Table, Text

from bsref.db import metadata

# ── the simulated security stack (SIEM, EDR, identity provider, threat intelligence) ──
core_alerts = Table(
    "core_alerts", metadata,
    Column("alert_id", String(8), primary_key=True), Column("rule", String(32), nullable=False), Column("severity", String(8), nullable=False),
    Column("host", String(40), nullable=False), Column("user", String(40), nullable=False), Column("src_ip", String(15), nullable=False),
    Column("summary", Text, nullable=False), Column("created_at", Float, nullable=False),
)
core_hosts = Table(
    "core_hosts", metadata,
    Column("host", String(40), primary_key=True), Column("owner", String(40), nullable=False),
    Column("criticality", String(8), nullable=False), Column("isolated", Integer, nullable=False),
)
core_users = Table("core_users", metadata, Column("user", String(40), primary_key=True), Column("disabled", Integer, nullable=False),
                   Column("home_country", String(2), nullable=False))
core_blocked_ips = Table("core_blocked_ips", metadata, Column("ip", String(15), primary_key=True), Column("blocked_at", Float, nullable=False))
core_auth_logs = Table(
    "core_auth_logs", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True), Column("user", String(40), nullable=False, index=True),
    Column("src_ip", String(15), nullable=False), Column("country", String(2), nullable=False),
    Column("success", Integer, nullable=False), Column("at", Float, nullable=False),
)
core_processes = Table(
    "core_processes", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True), Column("host", String(40), nullable=False, index=True),
    Column("process", String(64), nullable=False), Column("parent", String(64), nullable=False),
    Column("cmdline", Text, nullable=False), Column("sha256", String(64), nullable=False), Column("at", Float, nullable=False),
)
core_threat_intel = Table("core_threat_intel", metadata, Column("indicator", String(64), primary_key=True),
                          Column("verdict", String(24), nullable=False), Column("source", String(40), nullable=False))
sim_state = Table("sim_state", metadata, Column("id", Integer, primary_key=True), Column("state", Text, nullable=False))

# ── the triage platform's side ──
cases = Table(
    "cases", metadata,
    Column("case_id", String(8), primary_key=True), Column("rule", String(32), nullable=False), Column("severity", String(8), nullable=False),
    Column("host", String(40), nullable=False), Column("user", String(40), nullable=False), Column("src_ip", String(15), nullable=False),
    Column("summary", Text, nullable=False), Column("created_at", Float, nullable=False),
    Column("status", String(24), nullable=False, index=True),   # new | closed_benign | awaiting_approval | needs_human | contained | closed
    Column("agent_verdict", String(16)), Column("agent_confidence", Float), Column("agent_summary", Text),
    Column("agent_version", String(16)), Column("injection_suspected", Integer, nullable=False),
    Column("final_verdict", String(16)), Column("decided_by", String(64)), Column("steps", Integer, nullable=False),
    Column("investigated_at", Float), Column("closed_at", Float),
)
agent_steps = Table(  # the trace: every tool call, its arguments, its result and its duration
    "agent_steps", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True), Column("case_id", String(8), nullable=False, index=True),
    Column("step", Integer, nullable=False), Column("tool", String(32), nullable=False), Column("arguments", Text, nullable=False),
    Column("result", Text, nullable=False), Column("ok", Integer, nullable=False), Column("ms", Float, nullable=False), Column("at", Float, nullable=False),
)
proposed_actions = Table(
    "proposed_actions", metadata,
    Column("action_id", String(128), primary_key=True),          # <case>:<action>:<target>, which makes proposals idempotent
    Column("case_id", String(8), nullable=False, index=True), Column("action", String(24), nullable=False),
    Column("target", String(64), nullable=False), Column("reason", Text, nullable=False),
    Column("status", String(12), nullable=False),               # pending | approved | rejected | executed | expired
    Column("review_task_id", Integer), Column("executed_at", Float),
)
labelled_incidents = Table(  # the evaluation suite: past incidents with the verdict and the actions a senior analyst signed off
    "labelled_incidents", metadata,
    Column("case_id", String(8), primary_key=True), Column("verdict", String(16), nullable=False),
    Column("expected_actions", Text, nullable=False), Column("has_injection", Integer, nullable=False),
    Column("source", String(12), nullable=False), Column("created_at", Float, nullable=False),
)
