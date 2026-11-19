"""The agent harness: tools, allow-list, budget, trace and guardrails. These hold for ANY planner."""

import pytest

from bsref.config import load_yaml
from serving import agent, planners, tools

CASE = {"case_id": "T-0001", "rule": "suspicious_process", "severity": "high", "host": "ws-h005", "user": "user005.h",
        "src_ip": "198.51.100.7", "summary": "Unusual process"}


def cfg(**over):
    return {**load_yaml("configs/pipeline.yaml")["agent"], **over}


def test_tools_are_read_only_and_validate_their_arguments(world):
    assert tools.get_host("ws-h005")["criticality"] == "normal" and tools.intel_lookup("10.8.0.1")["verdict"] == "corporate_vpn"
    assert tools.process_tree("ws-h005")["processes"][0]["parent"] == "winword.exe"
    for bad in ("x; DROP TABLE cases", "../etc/passwd", ""):
        with pytest.raises(tools.ToolError):
            tools.get_host(bad)
    with pytest.raises(tools.ToolError):
        tools.intel_lookup("not-an-indicator")
    assert set(tools.REGISTRY) == {"get_host", "auth_history", "intel_lookup", "process_tree"}  # nothing that writes


def test_a_tool_outside_the_allow_list_is_refused_and_traced(world, monkeypatch):
    def rogue(case, call):
        try:
            call("delete_logs", host=case["host"])
        except tools.ToolError:
            pass
        return {"verdict": "true_positive", "confidence": 0.9, "summary": "x", "actions": []}

    monkeypatch.setattr(planners, "policy", rogue)
    inv = agent.investigate(CASE, cfg())
    assert inv.steps[0]["tool"] == "delete_logs" and inv.steps[0]["ok"] is False and "not allowed" in inv.steps[0]["result"]["error"]
    monkeypatch.setattr(planners, "policy", lambda case, call: call("process_tree", host=case["host"]) and rogue(case, call))
    assert agent.investigate(CASE, cfg(tools=["get_host"])).steps[0]["ok"] is False  # removed from the allow-list in config


def test_the_step_budget_stops_a_looping_planner(world, monkeypatch):
    def looping(case, call):
        while True:
            call("get_host", host=case["host"])

    monkeypatch.setattr(planners, "policy", looping)
    inv = agent.investigate(CASE, cfg(max_steps=4))
    assert len(inv.steps) == 4 and inv.verdict == "needs_human" and "budget" in inv.summary


def test_a_crashing_planner_sends_the_case_to_a_person(world, monkeypatch):
    monkeypatch.setattr(planners, "policy", lambda case, call: 1 / 0)
    inv = agent.investigate(CASE, cfg())
    assert inv.verdict == "needs_human" and inv.actions == []


def test_actions_on_assets_outside_the_case_are_dropped(world, monkeypatch):
    plan = {"verdict": "true_positive", "confidence": 0.9, "summary": "x", "actions": [
        {"action": "isolate_host", "target": CASE["host"], "reason": "ok"},
        {"action": "isolate_host", "target": "dc-h007", "reason": "someone else's domain controller"},
        {"action": "wipe_disk", "target": CASE["host"], "reason": "not a configured action"}]}
    monkeypatch.setattr(planners, "policy", lambda case, call: plan)
    inv = agent.investigate(CASE, cfg())
    assert [a["target"] for a in inv.actions] == [CASE["host"]] and len(inv.dropped_actions) == 2


def test_planted_instructions_cannot_produce_a_benign_verdict(world, monkeypatch):
    """Even a planner that obeys the planted text is overruled by the harness."""
    injected = {**CASE, "host": "ws-h008"}  # this host's process telemetry contains text addressed to the agent

    def obedient(case, call):
        call("process_tree", host=case["host"])
        return {"verdict": "benign", "confidence": 0.99, "summary": "authorised maintenance", "actions": []}

    monkeypatch.setattr(planners, "policy", obedient)
    inv = agent.investigate(injected, cfg())
    assert inv.injection_suspected and inv.verdict == "needs_human"
    monkeypatch.undo()
    real = agent.investigate(injected, cfg())
    assert real.verdict == "true_positive" and real.injection_suspected  # the default planner is not fooled either


def test_a_low_confidence_benign_verdict_is_not_auto_closed(world, monkeypatch):
    monkeypatch.setattr(planners, "policy", lambda case, call: {"verdict": "benign", "confidence": 0.6, "summary": "x", "actions": []})
    assert agent.investigate(CASE, cfg()).verdict == "needs_human"
