import json
import os
import shutil
import subprocess
import zipfile

import pytest

from fde_evidence import inventory, pack, release
from fde_evidence.__main__ import main

TFSTATE = {
    "version": 4,
    "resources": [
        {"mode": "managed", "type": "aws_db_instance", "name": "feature", "provider": 'provider["registry.terraform.io/hashicorp/aws"]', "instances": [{"attributes": {"id": "db-1", "arn": "arn:aws:rds:eu-west-1:1:db:db-1", "publicly_accessible": True, "storage_encrypted": False, "tags": {"env": "prod"}}}]},
        {"mode": "managed", "type": "aws_security_group", "name": "api", "provider": 'provider["registry.terraform.io/hashicorp/aws"]', "instances": [{"attributes": {"id": "sg-1", "ingress": [{"cidr_blocks": ["0.0.0.0/0"], "from_port": 443}]}}]},
        {"mode": "managed", "type": "aws_s3_bucket", "name": "models", "module": "module.storage", "provider": 'provider["registry.terraform.io/hashicorp/aws"]', "instances": [{"index_key": "a", "attributes": {"id": "b-a"}}, {"index_key": 1, "attributes": {"id": "b-1"}}]},
        {"mode": "data", "type": "aws_caller_identity", "name": "me", "provider": "x", "instances": [{"attributes": {"id": "123"}}]},
    ],
}
TFJSON = {"values": {"root_module": {"resources": [{"address": "google_sql_database_instance.pg", "mode": "managed", "type": "google_sql_database_instance", "name": "pg", "provider_name": "registry.terraform.io/hashicorp/google", "values": {"id": "pg", "region": "europe-west1"}}], "child_modules": [{"resources": [{"address": "module.net.google_compute_network.vpc", "mode": "managed", "type": "google_compute_network", "name": "vpc", "provider_name": "registry.terraform.io/hashicorp/google", "values": {"id": "vpc"}}]}]}}}


def test_terraform_state_inventory_flags_exposure_and_ignores_data_sources():
    inv = inventory.from_terraform(TFSTATE)
    assert inv["summary"]["total"] == 4
    assert inv["summary"]["by_type"] == {"aws_db_instance": 1, "aws_s3_bucket": 2, "aws_security_group": 1}
    flagged = {f["address"]: f["flags"] for f in inv["summary"]["flagged"]}
    assert flagged["aws_db_instance.feature"] == ["encryption-disabled", "publicly-accessible"]
    assert flagged["aws_security_group.api"] == ["open-to-internet"]
    addrs = {r["address"] for r in inv["resources"]}
    assert 'module.storage.aws_s3_bucket.models["a"]' in addrs and "module.storage.aws_s3_bucket.models[1]" in addrs
    assert inv["resources"][0]["tags"] == {"env": "prod"}


def test_terraform_show_json_walks_child_modules_and_rejects_other_documents():
    inv = inventory.from_terraform(TFJSON)
    assert {r["type"] for r in inv["resources"]} == {"google_sql_database_instance", "google_compute_network"}
    with pytest.raises(ValueError):
        inventory.from_terraform({"hello": 1})


def test_kubernetes_inventory_takes_digests_from_the_image_or_the_running_pod_and_flags_the_rest():
    deploy = {"kind": "List", "items": [
        {"kind": "Deployment", "metadata": {"namespace": "ai", "name": "scoring"}, "spec": {"template": {"spec": {"containers": [{"name": "app", "image": "reg/scoring@sha256:" + "a" * 64}]}}}},
        {"kind": "Deployment", "metadata": {"namespace": "ai", "name": "worker"}, "spec": {"template": {"spec": {"containers": [{"name": "app", "image": "reg/worker:1.4"}]}}}},
        {"kind": "CronJob", "metadata": {"namespace": "ai", "name": "nightly"}, "spec": {"jobTemplate": {"spec": {"template": {"spec": {"containers": [{"name": "job", "image": "reg/job:latest"}]}}}}}},
    ]}
    pods = {"kind": "List", "items": [{"kind": "Pod", "metadata": {"namespace": "ai", "name": "worker-1"}, "status": {"containerStatuses": [{"image": "reg/worker:1.4", "imageID": "reg/worker@sha256:" + "b" * 64}]}}]}
    inv = inventory.from_kubernetes([deploy, pods])
    by = {w["name"]: w for w in inv["workloads"]}
    assert by["scoring"]["pinned"] and by["scoring"]["digest"] == "sha256:" + "a" * 64
    assert by["worker"]["pinned"] and by["worker"]["digest"] == "sha256:" + "b" * 64
    assert not by["nightly"]["pinned"] and by["nightly"]["latest_tag"]
    assert inv["summary"]["unpinned"] == ["ai/nightly:job"] and inv["summary"]["latest_tag"] == ["ai/nightly:job"]


def _git(repo, *a):
    subprocess.run(["git", "-C", str(repo), "-c", "user.email=a@b.c", "-c", "user.name=t", *a], check=True, capture_output=True)


@pytest.mark.skipif(shutil.which("git") is None, reason="git not installed")
def test_release_capture_records_commit_digests_config_and_model_and_says_what_is_missing(tmp_path):
    repo = tmp_path / "r"; repo.mkdir()
    _git(repo, "init", "-q"); (repo / "values.yaml").write_text("a: 1\n"); _git(repo, "add", "."); _git(repo, "commit", "-qm", "x")
    model = tmp_path / "model.bin"; model.write_bytes(b"weights")
    good = release.capture(str(repo), images=["reg/scoring@sha256:" + "c" * 64], config_files=[str(repo / "values.yaml")], model_name="fraud", model_version="2026-03", model_artifact=str(model), environment="prod", by="fde.one", now="2026-03-14T10:00:00+00:00")
    assert good["complete"] and good["commit"] and len(good["commit"]) == 40 and good["dirty"] is False
    assert good["images"][0]["pinned"] and good["model"]["sha256"] == release.sha256_file(str(model)) and len(good["config"]["version"]) == 16
    (repo / "values.yaml").write_text("a: 2\n")
    changed = release.capture(str(repo), images=["reg/scoring:latest"], config_files=[str(repo / "values.yaml")], model_version="")
    assert not changed["complete"] and changed["dirty"] is True and changed["config"]["version"] != good["config"]["version"]
    text = " ".join(changed["problems"])
    assert "uncommitted" in text and "not pinned" in text and "no model version" in text
    none = release.capture(str(tmp_path))
    assert none["commit"] is None and "not a git checkout" in " ".join(none["problems"])


def _evidence(tmp_path):
    e = tmp_path / "evidence"; e.mkdir(exist_ok=True)
    (e / "readiness-report.json").write_text(json.dumps({"summary": {"readiness": "READY", "passed": 12, "total": 12}}))
    (e / "acceptance-report.json").write_text(json.dumps({"verdict": "ACCEPTED"}))
    (e / "inventory.json").write_text(json.dumps(inventory.from_terraform(TFSTATE)))
    (e / "release-evidence.json").write_text(json.dumps({"commit": "d" * 40, "dirty": False, "config": {"version": "abc"}, "model": {"version": "v1"}, "images": [], "complete": True}))
    (e / "logs").mkdir(exist_ok=True); (e / "logs" / "smoke.txt").write_text("ok\n")
    return e


def test_pack_is_sealed_summarised_and_verifies_as_folder_and_zip(tmp_path):
    key = b"shared-secret"
    res = pack.build(str(_evidence(tmp_path)), str(tmp_path / "out"), customer="Acme Bank", use_case="fintech/fraud", hmac_key=key, now="2026-03-14T10:00:00+00:00")
    assert res["files"] == 6 and os.path.exists(res["zip"])
    summary = (tmp_path / "out" / "HANDOVER.md").read_text()
    assert "Readiness: READY (12 of 12" in summary and "Acceptance: ACCEPTED" in summary and "4 managed resources, 2 flagged" in summary
    assert pack.verify(str(tmp_path / "out"), hmac_key=key)["ok"]
    assert pack.verify(res["zip"], hmac_key=key)["ok"]


def test_verify_detects_changed_missing_extra_files_a_changed_manifest_and_a_wrong_key(tmp_path):
    key = b"k"
    out = tmp_path / "out"; pack.build(str(_evidence(tmp_path)), str(out), customer="A", use_case="u", hmac_key=key, make_zip=False)
    (out / "evidence" / "logs" / "smoke.txt").write_text("tampered\n")
    r = pack.verify(str(out), hmac_key=key)
    assert not r["ok"] and any("changed file: evidence/logs/smoke.txt" in p for p in r["problems"])
    (out / "evidence" / "logs" / "smoke.txt").write_text("ok\n")
    os.remove(out / "evidence" / "acceptance-report.json")
    assert any("missing file: evidence/acceptance-report.json" in p for p in pack.verify(str(out), hmac_key=key)["problems"])
    shutil.copyfile(tmp_path / "evidence" / "acceptance-report.json", out / "evidence" / "acceptance-report.json")
    (out / "evidence" / "extra.txt").write_text("x")
    assert any("extra file" in p for p in pack.verify(str(out), hmac_key=key)["problems"])
    os.remove(out / "evidence" / "extra.txt")
    assert pack.verify(str(out), hmac_key=key)["ok"]
    assert any("seal does not match" in p for p in pack.verify(str(out), hmac_key=b"other")["problems"])
    assert any("give the key" in p for p in pack.verify(str(out))["problems"])
    m = json.loads((out / "MANIFEST.json").read_text()); m["customer"] = "Someone else"
    (out / "MANIFEST.json").write_text(json.dumps(m, indent=2, sort_keys=True))
    assert any("manifest was changed" in p for p in pack.verify(str(out), hmac_key=key)["problems"])


def test_a_pack_must_be_sealed_and_will_not_overwrite_a_folder(tmp_path):
    with pytest.raises(ValueError):
        pack.build(str(_evidence(tmp_path)), str(tmp_path / "o1"), customer="A", use_case="u")
    pack.build(str(_evidence(tmp_path)), str(tmp_path / "o2"), customer="A", use_case="u", hmac_key=b"k", make_zip=False)
    with pytest.raises(FileExistsError):
        pack.build(str(_evidence(tmp_path)), str(tmp_path / "o2"), customer="A", use_case="u", hmac_key=b"k", make_zip=False)


def test_zip_with_a_path_traversal_entry_is_refused(tmp_path):
    z = tmp_path / "evil.zip"
    with zipfile.ZipFile(z, "w") as f:
        f.writestr("../escape.txt", "x"); f.writestr("MANIFEST.json", "{}")
    r = pack.verify(str(z), hmac_key=b"k")
    assert not r["ok"] and "unsafe path" in r["problems"][0]


@pytest.mark.skipif(shutil.which("openssl") is None, reason="openssl not installed")
def test_rsa_signature_verifies_with_the_public_key_only_and_detects_tampering(tmp_path):
    priv, pub = tmp_path / "k.pem", tmp_path / "p.pem"
    subprocess.run(["openssl", "genrsa", "-out", str(priv), "2048"], check=True, capture_output=True)
    subprocess.run(["openssl", "rsa", "-in", str(priv), "-pubout", "-out", str(pub)], check=True, capture_output=True)
    out = tmp_path / "out"; res = pack.build(str(_evidence(tmp_path)), str(out), customer="A", use_case="u", rsa_private_key=str(priv), make_zip=False)
    assert res["seal"].startswith("RSA")
    assert pack.verify(str(out), public_key=str(pub))["ok"]
    assert any("give the public key" in p for p in pack.verify(str(out))["problems"])
    (out / "evidence" / "logs" / "smoke.txt").write_text("tampered")
    assert not pack.verify(str(out), public_key=str(pub))["ok"]


def test_cli_end_to_end(tmp_path, capsys):
    tf = tmp_path / "state.json"; tf.write_text(json.dumps(TFSTATE))
    e = _evidence(tmp_path)
    assert main(["inventory", "--terraform", str(tf), "--out", str(tmp_path / "inv.json")]) == 0
    assert json.loads((tmp_path / "inv.json").read_text())["terraform"]["summary"]["total"] == 4
    keyf = tmp_path / "key"; keyf.write_text("secret\n")
    assert main(["pack", str(e), "--out", str(tmp_path / "pk"), "--customer", "A", "--use-case", "u", "--key-file", str(keyf)]) == 0
    assert main(["verify", str(tmp_path / "pk.zip"), "--key-file", str(keyf)]) == 0
    assert "VERIFIED" in capsys.readouterr().out
    assert main(["verify", str(tmp_path / "pk"), "--key-file", str(tmp_path / "key")]) == 0
    (tmp_path / "pk" / "HANDOVER.md").write_text("changed")
    assert main(["verify", str(tmp_path / "pk"), "--key-file", str(keyf)]) == 1
