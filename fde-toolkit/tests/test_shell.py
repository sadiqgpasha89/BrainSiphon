import json
import os
import shutil
import subprocess

import pytest

from servers import Tcp, free_port

SH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "shell", "preflight.sh")


@pytest.mark.skipif(not shutil.which("bash") or not shutil.which("timeout"), reason="bash and timeout are required")
def test_shell_edition_produces_the_same_report_shape(tmp_path):
    up = Tcp(lambda s: None)
    t = tmp_path / "targets.tsv"
    t.write_text(f"# comment\ntcp\tup\t127.0.0.1\t{up.port}\ntcp\tdown\t127.0.0.1\t{free_port()}\negress_denied\tblocked\t127.0.0.1\t{free_port()}\negress_denied\toops\t127.0.0.1\t{up.port}\n")
    out = tmp_path / "r.json"
    r = subprocess.run(["bash", SH, str(t), str(out)], capture_output=True, text=True, env={**os.environ, "BS_TIMEOUT": "2", "BS_CUSTOMER": "acme"})
    up.close()
    assert r.returncode == 1
    rep = json.loads(out.read_text())
    assert rep["schema_version"] == "1.0" and rep["customer"] == "acme"
    s = rep["summary"]
    assert s["readiness"] == "NOT_READY" and s["total"] == 4 and s["passed"] == 2 and s["failed"] == 2
    assert set(s["blocking_failures"]) == {"tcp.down", f"egress.127.0.0.1.{up.port}"}
    for c in rep["checks"]:
        assert {"id", "name", "category", "status", "severity", "target", "message", "remediation", "owner_hint", "duration_ms"} <= set(c)


@pytest.mark.skipif(not shutil.which("bash"), reason="bash required")
def test_shell_edition_ready_when_everything_passes(tmp_path):
    up = Tcp(lambda s: None)
    t = tmp_path / "t.tsv"
    t.write_text(f"tcp\tup\t127.0.0.1\t{up.port}\n")
    out = tmp_path / "r.json"
    r = subprocess.run(["bash", SH, str(t), str(out)], capture_output=True, text=True, env={**os.environ, "BS_TIMEOUT": "2"})
    up.close()
    assert r.returncode == 0 and json.loads(out.read_text())["summary"]["readiness"] == "READY"
