"""Contracts and deployment files derived from a blueprint's low-level design and enterprise context."""

from __future__ import annotations

import json
import math
import re

import yaml

from .md import doc, fence, get, table


def _dump(obj) -> str:
    return yaml.safe_dump(obj, sort_keys=False, allow_unicode=True, width=110)


def infer_schema(v):
    if isinstance(v, bool):
        return {"type": "boolean"}
    if isinstance(v, int):
        return {"type": "integer"}
    if isinstance(v, float):
        return {"type": "number"}
    if isinstance(v, dict):
        return {"type": "object", "properties": {k: infer_schema(x) for k, x in v.items()}}
    if isinstance(v, list):
        return {"type": "array", "items": infer_schema(v[0]) if v else {}}
    return {"type": "string"}


def _parse_json(text: str):
    try:
        return json.loads(text)
    except Exception:
        return None


def slug_last(u: dict) -> str:
    return u["slug"].split("/")[1]


def openapi(u: dict) -> str:
    api = get(u, "systemDesign.lld.apiContract", {}) or {}
    path = api.get("path") or f"/v1/{slug_last(u)}/decisions"
    method = (api.get("method") or "POST").lower()
    req_raw, res_raw = api.get("request", ""), api.get("response", "")
    req, res = _parse_json(req_raw), _parse_json(res_raw)
    sse = isinstance(res_raw, str) and res_raw.lstrip().startswith("event:")
    deadline = get(u, "systemDesign.lld.config", "")
    m = re.search(r"deadline_ms:\s*(\d+)", deadline or "")
    op = {
        "summary": f"{u['title']}: request a decision",
        "operationId": re.sub(r"[^a-zA-Z0-9]+", "_", slug_last(u)),
        "description": f"Illustrative contract taken from the blueprint's low-level design. {('End-to-end deadline: ' + m.group(1) + ' ms.') if m else ''} Replace the placeholder values with your own fields and keep the error behaviour.",
        "security": [{"bearerAuth": []}],
        "requestBody": {"required": True, "content": {"application/json": ({"schema": infer_schema(req), "example": req} if req is not None else {"schema": {"type": "string"}, "example": req_raw})}},
        "responses": {
            "200": {"description": "Decision returned inside the deadline", "content": ({"text/event-stream": {"schema": {"type": "string"}, "example": res_raw}} if sse else {"application/json": ({"schema": infer_schema(res), "example": res} if res is not None else {"schema": {"type": "string"}, "example": res_raw})})},
            "400": {"description": "Invalid request; never retried"},
            "429": {"description": "Rate limited or load shed; retry with backoff and the same idempotency key"},
            "503": {"description": "Dependency unavailable; the service answers from its degradation ladder when it can"},
        },
    }
    spec = {
        "openapi": "3.1.0",
        "info": {"title": f"{u['title']} API (illustrative)", "version": "0.1.0", "description": "Generated from the BrainSiphon blueprint. This is the shape of the interface, not a deployed service."},
        "servers": [{"url": "https://scoring.internal.example.com"}],
        "paths": {path: {method: op}},
        "components": {"securitySchemes": {"bearerAuth": {"type": "http", "scheme": "bearer"}}},
    }
    return _dump(spec)


_TYPE = {"int": "integer", "integer": "integer", "long": "integer", "double": "number", "float": "number", "decimal": "number", "bool": "boolean", "boolean": "boolean", "timestamp": "string", "string": "string", "uuid": "string"}


def _prop(spec: str) -> dict:
    s = str(spec).strip()
    if "|" in s:
        parts = [p.strip() for p in s.split("|")]
        if all(re.fullmatch(r"[A-Za-z0-9_\-]+", p) for p in parts):
            return {"type": "string", "enum": parts}
    base = s.split()[0].lower().rstrip(",") if s else "string"
    p = {"type": _TYPE.get(base, "string")}
    if base == "timestamp":
        p["format"] = "date-time"
    if base not in _TYPE:
        p["description"] = s
    return p


def asyncapi(u: dict) -> str:
    raw = get(u, "systemDesign.lld.eventSchema", "") or ""
    obj = _parse_json(raw)
    topic = f"{slug_last(u).replace('-', '.')}.events"
    payload = {"type": "object", "properties": {k: _prop(v) for k, v in obj.items()}} if isinstance(obj, dict) else {"type": "object", "description": raw}
    spec = {
        "asyncapi": "3.0.0",
        "info": {"title": f"{u['title']} events (illustrative)", "version": "0.1.0", "description": "Generated from the blueprint's event schema. Partition by the entity key so one entity's events stay ordered."},
        "channels": {"events": {"address": topic, "messages": {"event": {"$ref": "#/components/messages/Event"}}}},
        "operations": {"publishEvents": {"action": "send", "channel": {"$ref": "#/channels/events"}}},
        "components": {"messages": {"Event": {"name": "Event", "contentType": "application/json", "payload": {"$ref": "#/components/schemas/EventPayload"}}}, "schemas": {"EventPayload": payload}},
    }
    return _dump(spec)


def data_contract(u: dict) -> str:
    text = get(u, "enterpriseContext.data.contractExample", "") or ""
    try:
        yaml.safe_load(text)
        return text.rstrip() + "\n"
    except Exception:
        return "# the blueprint's contract example did not parse as YAML; kept verbatim below\n" + "\n".join("# " + l for l in text.splitlines()) + "\n"


def schema_sql(u: dict) -> str:
    return (get(u, "systemDesign.lld.dataModelDDL", "") or "-- no data model in the blueprint").rstrip() + "\n"


def config_yaml(u: dict) -> str:
    return (get(u, "systemDesign.lld.config", "") or "# no serving configuration in the blueprint").rstrip() + "\n"


# ------------------------------------------------------------------------------------------------ deployment
def _sizing(u: dict) -> dict:
    tech = get(u, "enterpriseContext.technology.compute", "") or ""
    out = {"text": tech}
    m = re.search(r"(\d[\d,]*)\s+(\d+)-vCPU pods", tech)
    if m:
        out["replicas"], out["vcpu"] = int(m.group(1).replace(",", "")), int(m.group(2))
    g = re.search(r"(\d[\d,]*)\s+GPUs", tech)
    if g:
        out["gpus"] = int(g.group(1).replace(",", ""))
    return out


def helm_values(u: dict) -> str:
    s = _sizing(u)
    lines = [
        f"# Overrides for deployment/helm/ai-solution in the free BrainSiphon deployment kit, for {u['title']}.",
        "# Modelled sizing at 10M registered users. Replace with your measured peak, and set autoscaling bounds from a load test.",
        f"# Blueprint compute statement: {s['text']}",
    ]
    if "replicas" in s:
        lines += [f"replicaCount: {s['replicas']}   # modelled pods at peak, including failover headroom", "resources:", "  requests:", f"    cpu: '{s['vcpu'] * 1000}m'", "  limits:", f"    cpu: '{s['vcpu'] * 1000}m'"]
    elif "gpus" in s:
        lines += ["# GPU-bound: size the GPU node pools from the count below, then derive replicas from GPUs per pod.", f"# provisioned GPUs (modelled): {s['gpus']}", "resources:", "  limits:", "    nvidia.com/gpu: 1"]
    else:
        lines += ["# No pod or GPU count could be read from the compute statement; set replicas from docs/08-capacity-and-cost.md."]
    return "\n".join(lines) + "\n"


def compose(u: dict) -> str:
    name = slug_last(u)
    return f"""# Reproduces the worked example and its tests in a container. It does not start a production service.
services:
  starter:
    build: ../starter
    image: brainsiphon-pro/{name}:starter
    command: ["python", "run_usecase.py"]
    environment:
      OMP_NUM_THREADS: "2"
    volumes:
      - ../starter:/app
  tests:
    build: ../starter
    image: brainsiphon-pro/{name}:starter
    command: ["python", "-m", "pytest", "-q"]
    environment:
      OMP_NUM_THREADS: "2"
"""


DOCKERFILE = """FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd --create-home app && chown -R app /app
USER app
CMD ["python", "run_usecase.py"]
"""


def deployment_readme(u: dict) -> str:
    s = _sizing(u)
    tech = get(u, "enterpriseContext.technology", {}) or {}
    return doc(
        f"{u['title']}: deployment folder",
        "What is here and how it relates to the free deployment kit at https://github.com/sadiqgpasha89/BrainSiphon/tree/main/deployment (Terraform for AWS, Azure and GCP, a Helm chart, Kubernetes base, runbooks and a smoke test).",
        ("Files", "- `config.yaml`: the serving configuration from the blueprint, with a timeout and fallback per stage.\n- `values.sized.yaml`: Helm overrides for the free chart, sized from the blueprint's capacity model.\n- `docker-compose.yml`: runs the worked example and its tests in a container. It is not a production service.\n- `../contracts/`: the API, event and data contracts; `../contracts/schema.sql` is the reference data model."),
        ("How to use the sizing", "1. Replace the modelled traffic in `docs/08-capacity-and-cost.md` with your measured peak.\n2. Copy `values.sized.yaml` over the chart's `values-<env>.yaml` and adjust.\n3. Apply the free kit's Terraform for your cloud, then deploy the chart.\n4. Run the kit's smoke test, then the runbook scenarios in `docs/06-operations-runbook.md`."),
        ("What the blueprint says about where it runs", f"- **Hosting:** {tech.get('hosting', '')}\n- **Compute (modelled):** {s['text']}\n- **Deployment:** {tech.get('deployment', '')}\n- **Disaster recovery:** {json.dumps(tech.get('dr', ''), ensure_ascii=False)}"),
        ("Not in this folder, on purpose", "Terraform state, cloud credentials, secrets and a running service. Nothing here was applied to a cloud account."),
    )
