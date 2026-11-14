"""Infrastructure inventory from Terraform state (tfstate v4 or `terraform show -json`) and from kubectl JSON."""
from __future__ import annotations

import json
from collections import Counter
from typing import Any, Dict, Iterable, List

_OPEN = {"0.0.0.0/0", "::/0"}


def _flags(rtype: str, attrs: Dict[str, Any]) -> List[str]:
    out: List[str] = []
    if attrs.get("publicly_accessible") is True:
        out.append("publicly-accessible")
    if attrs.get("endpoint_public_access") is True or attrs.get("public_network_access_enabled") is True:
        out.append("public-endpoint")
    for k in ("storage_encrypted", "encrypted", "kms_encrypted"):
        if attrs.get(k) is False:
            out.append("encryption-disabled")
    for key in ("ingress", "security_rule"):
        for rule in attrs.get(key) or []:
            cidrs = (rule.get("cidr_blocks") or []) + (rule.get("ipv6_cidr_blocks") or []) + [rule.get("source_address_prefix")]
            if any(c in _OPEN for c in cidrs if c):
                out.append("open-to-internet")
    for k in ("cidr_blocks", "cidr_ipv4", "source_ranges"):
        v = attrs.get(k)
        if isinstance(v, list) and any(c in _OPEN for c in v) and rtype.endswith(("security_group_rule", "firewall")):
            out.append("open-to-internet")
    return sorted(set(out))


def _row(address: str, rtype: str, name: str, provider: str, mode: str, attrs: Dict[str, Any]) -> Dict[str, Any]:
    tags = attrs.get("tags") or attrs.get("labels") or {}
    return {
        "address": address, "type": rtype, "name": name, "provider": provider.split("/")[-1].strip('"[]') or provider, "mode": mode,
        "id": str(attrs.get("id") or attrs.get("arn") or attrs.get("self_link") or ""),
        "region": str(attrs.get("region") or attrs.get("location") or ""),
        "tags": tags if isinstance(tags, dict) else {}, "flags": _flags(rtype, attrs),
    }


def _walk_plan_module(mod: Dict[str, Any], rows: List[Dict[str, Any]]) -> None:
    for r in mod.get("resources", []):
        rows.append(_row(r.get("address", ""), r.get("type", ""), r.get("name", ""), r.get("provider_name", ""), r.get("mode", "managed"), r.get("values") or {}))
    for child in mod.get("child_modules", []):
        _walk_plan_module(child, rows)


def from_terraform(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Accepts a tfstate (version 4) or the JSON from `terraform show -json`."""
    rows: List[Dict[str, Any]] = []
    if "resources" in doc:  # tfstate
        for r in doc["resources"]:
            prefix = f"module.{r['module'].split('.')[-1]}." if r.get("module") else ""
            for i, inst in enumerate(r.get("instances", [])):
                idx = inst.get("index_key")
                suffix = "" if idx is None else (f"[{idx}]" if isinstance(idx, int) else f'["{idx}"]')
                rows.append(_row(f"{prefix}{r['type']}.{r['name']}{suffix}", r["type"], r["name"], r.get("provider", ""), r.get("mode", "managed"), inst.get("attributes") or {}))
    elif "values" in doc:  # terraform show -json
        _walk_plan_module(doc["values"].get("root_module", {}), rows)
    else:
        raise ValueError("Not a Terraform state or `terraform show -json` document.")
    managed = [r for r in rows if r["mode"] == "managed"]
    return {
        "source": "terraform", "resources": managed,
        "summary": {"total": len(managed), "by_type": dict(sorted(Counter(r["type"] for r in managed).items())), "by_provider": dict(sorted(Counter(r["provider"] for r in managed).items())),
                    "flagged": [{"address": r["address"], "flags": r["flags"]} for r in managed if r["flags"]]},
    }


def from_kubernetes(docs: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    """Workloads and the images they run, from `kubectl get deploy,sts,ds,cronjob,pods -A -o json` output."""
    workloads: List[Dict[str, Any]] = []
    pod_digests: Dict[str, str] = {}
    for doc in docs:
        items = doc.get("items", [doc])
        for it in items:
            kind = it.get("kind", "")
            if kind == "Pod":
                for cs in (it.get("status") or {}).get("containerStatuses", []):
                    ref = cs.get("imageID", "")
                    if "@sha256:" in ref:
                        pod_digests[cs.get("image", "")] = ref.split("@", 1)[1]
    for doc in docs:
        for it in doc.get("items", [doc]):
            kind = it.get("kind", "")
            if kind in ("Deployment", "StatefulSet", "DaemonSet", "CronJob", "Job"):
                spec = it.get("spec", {})
                tmpl = (spec.get("jobTemplate", {}).get("spec", {}).get("template") if kind == "CronJob" else spec.get("template")) or {}
                for c in (tmpl.get("spec") or {}).get("containers", []):
                    img = c.get("image", "")
                    digest = img.split("@", 1)[1] if "@sha256:" in img else pod_digests.get(img, "")
                    workloads.append({"kind": kind, "namespace": it.get("metadata", {}).get("namespace", ""), "name": it.get("metadata", {}).get("name", ""), "container": c.get("name", ""), "image": img.split("@", 1)[0], "digest": digest, "pinned": bool(digest), "latest_tag": img.endswith(":latest") or (":" not in img.split("/")[-1] and "@" not in img)})
    return {"source": "kubernetes", "workloads": workloads, "summary": {"total": len(workloads), "unpinned": [f"{w['namespace']}/{w['name']}:{w['container']}" for w in workloads if not w["pinned"]], "latest_tag": [f"{w['namespace']}/{w['name']}:{w['container']}" for w in workloads if w["latest_tag"]]}}


def load(path: str) -> Dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)
