"""Build and verify a handover pack: files, a SHA-256 manifest, a human summary, and a seal over the manifest.

Two seals: HMAC-SHA256 with a shared key (integrity between parties who hold the key: it is not a non-repudiable signature), or an RSA
signature made with the `openssl` CLI and checked with the public key (anyone with the public key can verify). Both detect any change
to any file, any missing or extra file, and a changed manifest.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import hmac
import json
import os
import shutil
import subprocess
import tempfile
import zipfile
from typing import Any, Dict, List, Optional

from .release import sha256_file

MANIFEST = "MANIFEST.json"
SEAL = "MANIFEST.seal.json"
SUMMARY = "HANDOVER.md"
_KINDS = {"readiness-report.json": "readiness", "acceptance-report.json": "acceptance", "inventory.json": "inventory", "release-evidence.json": "release"}


def _load(path: str) -> Optional[Dict[str, Any]]:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def _summary(meta: Dict[str, Any], files: List[Dict[str, Any]], docs: Dict[str, Optional[Dict[str, Any]]]) -> str:
    L = [f"# Handover pack: {meta['customer']}", "", f"Use case: {meta['use_case']}  ·  created {meta['created_at']}", ""]
    r, a, inv, rel = docs.get("readiness"), docs.get("acceptance"), docs.get("inventory"), docs.get("release")
    L += ["## What this pack proves", ""]
    L.append(f"- Readiness: {r['summary']['readiness']} ({r['summary']['passed']} of {r['summary']['total']} checks passed)" if r else "- Readiness report: not included")
    L.append(f"- Acceptance: {a.get('verdict', 'unknown')}" if a else "- Acceptance report: not included")
    L.append(f"- Infrastructure: {inv['summary']['total']} managed resources, {len(inv['summary'].get('flagged', []))} flagged" if inv and "resources" in inv else "- Infrastructure inventory: not included")
    if rel:
        L.append(f"- Release: commit {(rel.get('commit') or 'unknown')[:12]}{' (dirty)' if rel.get('dirty') else ''}, config {rel['config']['version'] or 'unknown'}, model {rel['model']['version'] or 'unknown'}, {len(rel['images'])} images" + ("" if rel.get("complete") else "; INCOMPLETE: " + "; ".join(rel.get("problems", []))))
    else:
        L.append("- Release evidence: not included")
    L += ["", "## Files", "", "| Path | Kind | Bytes | SHA-256 |", "|---|---|---|---|"] + [f"| {f['path']} | {f['kind']} | {f['bytes']} | `{f['sha256'][:16]}…` |" for f in files]
    L += ["", f"Verify with: `python3 -m fde_evidence verify <this folder or zip>`. The manifest is sealed ({meta['seal']}).", ""]
    return "\n".join(L)


def _seal_hmac(manifest_bytes: bytes, key: bytes, key_id: str) -> Dict[str, str]:
    return {"alg": "HMAC-SHA256", "key_id": key_id, "manifest_sha256": hashlib.sha256(manifest_bytes).hexdigest(), "signature": hmac.new(key, manifest_bytes, hashlib.sha256).hexdigest()}


def _seal_rsa(manifest_bytes: bytes, private_key: str, key_id: str) -> Dict[str, str]:
    with tempfile.TemporaryDirectory() as d:
        m = os.path.join(d, "m"); s = os.path.join(d, "s")
        open(m, "wb").write(manifest_bytes)
        r = subprocess.run(["openssl", "dgst", "-sha256", "-sign", private_key, "-out", s, m], capture_output=True, text=True)
        if r.returncode:
            raise RuntimeError(f"openssl could not sign: {r.stderr.strip()}")
        return {"alg": "RSA-SHA256 (openssl)", "key_id": key_id, "manifest_sha256": hashlib.sha256(manifest_bytes).hexdigest(), "signature": open(s, "rb").read().hex()}


def build(evidence_dir: str, out_dir: str, *, customer: str, use_case: str, hmac_key: Optional[bytes] = None, rsa_private_key: str = "", key_id: str = "key-1", now: Optional[str] = None, make_zip: bool = True) -> Dict[str, Any]:
    if not (hmac_key or rsa_private_key):
        raise ValueError("A pack must be sealed: give an HMAC key or an RSA private key.")
    created = now or dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    if os.path.exists(out_dir):
        raise FileExistsError(f"{out_dir} already exists; choose a new folder")
    os.makedirs(os.path.join(out_dir, "evidence"))
    files: List[Dict[str, Any]] = []
    docs: Dict[str, Optional[Dict[str, Any]]] = {}
    for root, _, names in sorted(os.walk(evidence_dir)):
        for n in sorted(names):
            src = os.path.join(root, n)
            rel = os.path.relpath(src, evidence_dir).replace(os.sep, "/")
            dst = os.path.join(out_dir, "evidence", rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copyfile(src, dst)
            kind = _KINDS.get(n, "other")
            if kind != "other":
                docs[kind] = _load(src)
            files.append({"path": f"evidence/{rel}", "kind": kind, "bytes": os.path.getsize(dst), "sha256": sha256_file(dst)})
    files.sort(key=lambda f: f["path"])
    meta = {"schema_version": 1, "customer": customer, "use_case": use_case, "created_at": created, "seal": "HMAC-SHA256" if hmac_key else "RSA-SHA256 (openssl)"}
    open(os.path.join(out_dir, SUMMARY), "w", encoding="utf-8").write(_summary(meta, files, docs))
    files.append({"path": SUMMARY, "kind": "summary", "bytes": os.path.getsize(os.path.join(out_dir, SUMMARY)), "sha256": sha256_file(os.path.join(out_dir, SUMMARY))})
    manifest = json.dumps({**meta, "files": files}, indent=2, sort_keys=True).encode()
    open(os.path.join(out_dir, MANIFEST), "wb").write(manifest)
    seal = _seal_hmac(manifest, hmac_key, key_id) if hmac_key else _seal_rsa(manifest, rsa_private_key, key_id)
    open(os.path.join(out_dir, SEAL), "w", encoding="utf-8").write(json.dumps(seal, indent=2))
    zip_path = ""
    if make_zip:
        zip_path = out_dir.rstrip("/\\") + ".zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
            for rel in [MANIFEST, SEAL, SUMMARY] + [f["path"] for f in files if f["path"].startswith("evidence/")]:
                zi = zipfile.ZipInfo(rel, date_time=(2020, 1, 1, 0, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(zi, open(os.path.join(out_dir, rel), "rb").read())
    return {"dir": out_dir, "zip": zip_path, "files": len(files), "seal": seal["alg"]}


def verify(pack: str, *, hmac_key: Optional[bytes] = None, public_key: str = "") -> Dict[str, Any]:
    """`pack` is a folder or a .zip. Returns {ok, problems, files_checked, seal}."""
    tmp = None
    problems: List[str] = []
    try:
        root = pack
        if os.path.isfile(pack):
            tmp = tempfile.mkdtemp()
            with zipfile.ZipFile(pack) as z:
                for name in z.namelist():
                    if name.startswith("/") or ".." in name.split("/"):
                        return {"ok": False, "problems": [f"unsafe path in the archive: {name}"], "files_checked": 0, "seal": ""}
                z.extractall(tmp)
            root = tmp
        mpath, spath = os.path.join(root, MANIFEST), os.path.join(root, SEAL)
        if not os.path.exists(mpath) or not os.path.exists(spath):
            return {"ok": False, "problems": ["manifest or seal is missing"], "files_checked": 0, "seal": ""}
        manifest_bytes = open(mpath, "rb").read()
        seal = json.load(open(spath, encoding="utf-8"))
        if hashlib.sha256(manifest_bytes).hexdigest() != seal.get("manifest_sha256"):
            problems.append("the manifest was changed after it was sealed")
        if seal.get("alg") == "HMAC-SHA256":
            if not hmac_key:
                problems.append("this pack is HMAC-sealed: give the key to verify the seal")
            elif not hmac.compare_digest(hmac.new(hmac_key, manifest_bytes, hashlib.sha256).hexdigest(), seal.get("signature", "")):
                problems.append("the seal does not match (wrong key, or the manifest was changed)")
        elif str(seal.get("alg", "")).startswith("RSA"):
            if not public_key:
                problems.append("this pack is RSA-signed: give the public key to verify the signature")
            else:
                with tempfile.TemporaryDirectory() as d:
                    sig = os.path.join(d, "s"); open(sig, "wb").write(bytes.fromhex(seal.get("signature", "")))
                    r = subprocess.run(["openssl", "dgst", "-sha256", "-verify", public_key, "-signature", sig, mpath], capture_output=True, text=True)
                    if r.returncode:
                        problems.append("the RSA signature does not verify")
        else:
            problems.append(f"unknown seal algorithm {seal.get('alg')!r}")
        listed = {f["path"]: f for f in json.loads(manifest_bytes)["files"]}
        for path, f in listed.items():
            full = os.path.join(root, path)
            if not os.path.exists(full):
                problems.append(f"missing file: {path}")
            elif sha256_file(full) != f["sha256"]:
                problems.append(f"changed file: {path}")
        present = {os.path.relpath(os.path.join(r, n), root).replace(os.sep, "/") for r, _, ns in os.walk(root) for n in ns}
        for extra in sorted(present - set(listed) - {MANIFEST, SEAL}):
            problems.append(f"extra file not in the manifest: {extra}")
        return {"ok": not problems, "problems": problems, "files_checked": len(listed), "seal": seal.get("alg", "")}
    finally:
        if tmp:
            shutil.rmtree(tmp, ignore_errors=True)
