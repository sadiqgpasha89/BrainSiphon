"""The action executor: the only code that changes anything in the security stack, and only after the approvals are in.

Execution is idempotent (running an executed action again is a no-op) and audited. In production each branch is a call to
the EDR, the identity provider or the firewall with a narrowly scoped credential that this service holds and the agent does
not.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select, update

from bsref import db
from data import schema

A, C = schema.proposed_actions, schema.cases


def _apply(action: str, target: str) -> None:
    with db.tx(db.source_engine()) as conn:
        if action == "isolate_host":
            conn.execute(update(schema.core_hosts).where(schema.core_hosts.c.host == target).values(isolated=1))
        elif action == "disable_user":
            conn.execute(update(schema.core_users).where(schema.core_users.c.user == target).values(disabled=1))
        elif action == "block_ip":
            db.upsert(conn, schema.core_blocked_ips, {"ip": target}, {"blocked_at": db.now()})
        else:
            raise ValueError(f"unknown action {action}")


def settle(task: dict[str, Any], actor: str, request_id: str = "") -> dict[str, Any]:
    """Called AFTER an approval decision has been committed. The security stack is another system, so its change cannot be
    in the platform's transaction: the order is decide -> commit -> execute -> record. A crash between execute and record
    leaves the action `pending` with an approved task; calling settle again re-applies it, which is safe because every
    action is idempotent."""
    with db.tx() as conn:
        row = dict(conn.execute(select(A).where(A.c.action_id == task["subject_id"])).mappings().one())
    if task["status"] == "approved" and row["status"] == "pending":
        _apply(row["action"], row["target"])
        with db.tx() as conn:
            conn.execute(update(A).where(A.c.action_id == row["action_id"]).values(status="executed", executed_at=db.now()))
            db.audit(conn, actor, "action.execute", row["action_id"],
                     {"approvers": [d["by"] for d in task["decisions"] if d["decision"] == "approve"]}, request_id)
    elif task["status"] in ("rejected", "expired") and row["status"] == "pending":
        with db.tx() as conn:
            conn.execute(update(A).where(A.c.action_id == row["action_id"]).values(status=task["status"]))
            db.audit(conn, actor, f"action.{task['status']}", row["action_id"], {}, request_id)
    with db.tx() as conn:
        pending = conn.execute(select(func.count()).select_from(A).where(A.c.case_id == row["case_id"], A.c.status == "pending")).scalar_one()
        if not pending:
            executed = conn.execute(select(func.count()).select_from(A).where(A.c.case_id == row["case_id"], A.c.status == "executed")
                                    ).scalar_one()
            conn.execute(update(C).where(C.c.case_id == row["case_id"], C.c.status == "awaiting_approval").values(
                status="contained" if executed else "needs_human", closed_at=db.now() if executed else None))
        return dict(conn.execute(select(A).where(A.c.action_id == row["action_id"])).mappings().one())
