import argparse
import json
import os
import sys

from . import inventory, pack, release


def _key(args):
    if getattr(args, "key_file", None):
        return open(args.key_file, "rb").read().strip()
    k = os.environ.get("BS_EVIDENCE_KEY")
    return k.encode() if k else None


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="fde_evidence", description="Handover evidence for a customer deployment.")
    sub = p.add_subparsers(dest="cmd", required=True)
    i = sub.add_parser("inventory", help="inventory from a Terraform state/plan and kubectl JSON files")
    i.add_argument("--terraform"); i.add_argument("--kubectl", nargs="*", default=[]); i.add_argument("--out", required=True)
    r = sub.add_parser("release", help="capture commit, image digests, config and model versions")
    r.add_argument("--repo", default="."); r.add_argument("--image", action="append", default=[]); r.add_argument("--config", action="append", default=[])
    r.add_argument("--model-name", default=""); r.add_argument("--model-version", default=""); r.add_argument("--model-artifact", default=""); r.add_argument("--environment", default=""); r.add_argument("--by", default=""); r.add_argument("--out", required=True)
    b = sub.add_parser("pack", help="build a sealed handover pack from a folder of evidence")
    b.add_argument("evidence_dir"); b.add_argument("--out", required=True); b.add_argument("--customer", required=True); b.add_argument("--use-case", required=True)
    b.add_argument("--key-file"); b.add_argument("--sign-key", default=""); b.add_argument("--key-id", default="key-1")
    v = sub.add_parser("verify", help="verify a pack folder or zip")
    v.add_argument("pack"); v.add_argument("--key-file"); v.add_argument("--pubkey", default="")
    a = p.parse_args(argv)

    if a.cmd == "inventory":
        out = {}
        if a.terraform:
            out["terraform"] = inventory.from_terraform(inventory.load(a.terraform))
        if a.kubectl:
            out["kubernetes"] = inventory.from_kubernetes([inventory.load(x) for x in a.kubectl])
        if not out:
            print("give --terraform and/or --kubectl", file=sys.stderr); return 2
        out["summary"] = {"total": sum(len(v.get("resources", v.get("workloads", []))) for v in out.values()), "flagged": (out.get("terraform", {}).get("summary", {}).get("flagged", []))}
        json.dump(out, open(a.out, "w"), indent=2); print(f"inventory: {out['summary']['total']} items, {len(out['summary']['flagged'])} flagged -> {a.out}"); return 0
    if a.cmd == "release":
        rec = release.capture(a.repo, images=a.image, config_files=a.config, model_name=a.model_name, model_version=a.model_version, model_artifact=a.model_artifact, environment=a.environment, by=a.by)
        json.dump(rec, open(a.out, "w"), indent=2); print(("complete" if rec["complete"] else "INCOMPLETE: " + "; ".join(rec["problems"])) + f" -> {a.out}"); return 0 if rec["complete"] else 1
    if a.cmd == "pack":
        res = pack.build(a.evidence_dir, a.out, customer=a.customer, use_case=a.use_case, hmac_key=_key(a), rsa_private_key=a.sign_key, key_id=a.key_id)
        print(f"pack: {res['files']} files, sealed with {res['seal']} -> {res['zip'] or res['dir']}"); return 0
    res = pack.verify(a.pack, hmac_key=_key(a), public_key=a.pubkey)
    print(("VERIFIED" if res["ok"] else "FAILED") + f": {res['files_checked']} files checked, seal {res['seal'] or 'n/a'}")
    for pr in res["problems"]:
        print(f"  - {pr}")
    return 0 if res["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
