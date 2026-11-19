"""Logging, metrics and alerting.

Logs      one JSON object per line on stdout, with the request id, so any log shipper can index them.
Metrics   Prometheus text format on /metrics: request rate, errors and latency per route, plus each implementation's own.
Alerts    monitoring/alerts.yaml is the single list of alert rules. Each rule has a PromQL expression for Prometheus /
          Alertmanager and a `metric` + `op` + `threshold` that the monitoring job evaluates itself, so the local profile
          raises the same alerts without a Prometheus server. `python -m bsref.observability` renders the Prometheus rule
          file from it; a test fails when the committed file is stale.
"""

from __future__ import annotations

import json
import logging
import operator
import sys
import time
from typing import Any

import httpx
import yaml
from prometheus_client import CollectorRegistry, Counter, Gauge, Histogram
from sqlalchemy import insert, select, update
from sqlalchemy.engine import Connection

from . import db
from .config import home, load_yaml, settings

_STD = set(logging.LogRecord("", 0, "", 0, "", (), None).__dict__) | {"message", "asctime", "taskName"}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        out = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created)) + f".{int(record.msecs):03d}Z",
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        out.update({k: v for k, v in record.__dict__.items() if k not in _STD})
        if record.exc_info:
            out["exc"] = self.formatException(record.exc_info)
        return json.dumps(out, default=str)


def configure_logging() -> None:
    root = logging.getLogger()
    if any(isinstance(h.formatter, JsonFormatter) for h in root.handlers):
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root.handlers[:] = [handler]
    root.setLevel(settings().log_level)


class Metrics:
    """One Prometheus registry per application instance (so tests can build many apps in one process)."""

    def __init__(self) -> None:
        self.registry = CollectorRegistry()
        self._made: dict[str, Any] = {}
        self.requests = self.counter("http_requests_total", "HTTP requests", ("method", "route", "status"))
        self.latency = self.histogram(
            "http_request_duration_seconds",
            "HTTP request latency",
            ("route",),
            buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
        )

    def counter(self, name: str, doc: str, labels: tuple[str, ...] = ()) -> Counter:
        if name not in self._made:
            self._made[name] = Counter(name, doc, labels, registry=self.registry)
        return self._made[name]

    def gauge(self, name: str, doc: str, labels: tuple[str, ...] = ()) -> Gauge:
        if name not in self._made:
            self._made[name] = Gauge(name, doc, labels, registry=self.registry)
        return self._made[name]

    def histogram(self, name: str, doc: str, labels: tuple[str, ...] = (), buckets: tuple[float, ...] | None = None) -> Histogram:
        if name not in self._made:
            kw = {"buckets": buckets} if buckets else {}
            self._made[name] = Histogram(name, doc, labels, registry=self.registry, **kw)
        return self._made[name]


# ── alert rules ──
_OPS = {">": operator.gt, ">=": operator.ge, "<": operator.lt, "<=": operator.le}


def load_rules(path: str = "monitoring/alerts.yaml") -> list[dict[str, Any]]:
    return load_yaml(path)["rules"]


def render_prometheus_rules(rules: list[dict[str, Any]], group: str = "bsref") -> str:
    out = {
        "groups": [
            {
                "name": group,
                "rules": [
                    {
                        "alert": r["name"],
                        "expr": r["promql"],
                        "for": r.get("for", "5m"),
                        "labels": {"severity": r["severity"]},
                        "annotations": {"summary": r["summary"], "runbook": r.get("runbook", "")},
                    }
                    for r in rules
                ],
            }
        ]
    }
    return "# GENERATED from monitoring/alerts.yaml by `python -m bsref.observability`. Do not edit.\n" + yaml.safe_dump(
        out, sort_keys=False, width=120
    )


def _notify(payload: dict[str, Any]) -> None:
    url = settings().alert_webhook_url
    if not url:
        return
    try:
        httpx.post(url, json=payload, timeout=3.0)
    except httpx.HTTPError as exc:  # the alert is already stored; a failing pager must not fail the monitoring job
        logging.getLogger("bsref.alerts").warning("alert webhook failed", extra={"error": str(exc)})


def evaluate_alerts(conn: Connection, values: dict[str, float], rules: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    """Store the metric values, then fire or resolve each rule. Returns the alerts that changed state in this run."""
    t = db.now()
    changed: list[dict[str, Any]] = []
    for name, value in values.items():
        conn.execute(insert(db.metric_snapshots).values(name=name, value=float(value), at=t))
    for rule in rules if rules is not None else load_rules():
        if rule["metric"] not in values:
            continue
        value = float(values[rule["metric"]])
        breach = _OPS[rule["op"]](value, rule["threshold"])
        open_alert = conn.execute(
            select(db.alerts.c.id).where(db.alerts.c.rule == rule["name"], db.alerts.c.status == "firing")
        ).first()
        if breach and not open_alert:
            msg = f"{rule['summary']} ({rule['metric']}={value:.4g} {rule['op']} {rule['threshold']})"
            conn.execute(
                insert(db.alerts).values(
                    rule=rule["name"], severity=rule["severity"], value=value, threshold=rule["threshold"],
                    message=msg, status="firing", fired_at=t,
                )
            )
            event = {"rule": rule["name"], "status": "firing", "severity": rule["severity"], "message": msg,
                     "runbook": rule.get("runbook", "")}
            changed.append(event)
            _notify(event)
        elif not breach and open_alert:
            conn.execute(update(db.alerts).where(db.alerts.c.id == open_alert[0]).values(status="resolved", resolved_at=t))
            event = {"rule": rule["name"], "status": "resolved", "severity": rule["severity"],
                     "message": f"{rule['name']} resolved"}
            changed.append(event)
            _notify(event)
    return changed


def firing(conn: Connection) -> list[dict[str, Any]]:
    rows = conn.execute(select(db.alerts).where(db.alerts.c.status == "firing").order_by(db.alerts.c.fired_at.desc()))
    return [dict(r) for r in rows.mappings().all()]


if __name__ == "__main__":
    target = home() / "monitoring" / "prometheus-rules.yml"
    target.write_text(render_prometheus_rules(load_rules()))
    print(f"wrote {target}")
