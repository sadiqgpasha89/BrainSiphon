import json
import os

import pytest

from bs_preflight import config as cfgmod
from bs_preflight.runner import build_context, build_report, run_all
from servers import Tcp, free_port

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.mark.parametrize("name", ["preflight.example.json", "preflight.airgapped.example.json"])
def test_shipped_example_configs_are_valid(name):
    cfg = cfgmod.load(os.path.join(ROOT, "config", name))
    assert sum(len(cfg.get(s, [])) for s in cfgmod.SECTIONS) > 5


def test_airgapped_example_never_needs_the_internet_and_asserts_blocked_egress():
    cfg = cfgmod.load(os.path.join(ROOT, "config", "preflight.airgapped.example.json"))
    assert cfg["offline"] is True
    blocked = {d["host"] for d in cfg["egress_denied"]}
    assert {"pypi.org", "registry-1.docker.io", "example.com"} <= blocked
    for section in cfgmod.SECTIONS:
        for item in cfg.get(section, []):
            assert not item.get("requires_internet"), item


def test_every_template_exists_and_is_referenced_by_the_checklist():
    tdir = os.path.join(ROOT, "templates")
    names = sorted(os.listdir(tdir))
    assert len([n for n in names if n[0].isdigit() and n != "00-readiness-checklist.md"]) == 13
    checklist = open(os.path.join(tdir, "00-readiness-checklist.md")).read()
    for n in names:
        if n != "00-readiness-checklist.md":
            assert n in checklist, f"{n} is not in the checklist"


def test_report_validates_against_the_published_schema():
    jsonschema = pytest.importorskip("jsonschema")
    schema = json.load(open(os.path.join(ROOT, "schema", "readiness-report.schema.json")))
    up = Tcp(lambda s: None)
    cfg = {"customer": "c", "environment": "e", "tcp": [{"name": "a", "host": "127.0.0.1", "port": up.port}, {"name": "b", "host": "127.0.0.1", "port": free_port(), "timeout": 1}], "egress_denied": [{"host": "127.0.0.1", "port": free_port(), "timeout": 1}]}
    ctx = build_context(cfg)
    rep = build_report(cfg, ctx, run_all(cfg, ctx))
    up.close()
    jsonschema.validate(rep, schema)
