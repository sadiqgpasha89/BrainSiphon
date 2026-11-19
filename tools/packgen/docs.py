"""The working documents of a pack, filled in from one blueprint.

Every function takes the blueprint record `u` and returns Markdown. Nothing here is invented: each table and paragraph is a field
of the blueprint, reorganised as a document you fill in and sign off rather than a page you read.
"""

from __future__ import annotations

import json
from pathlib import Path

from .md import bullets, cell, checklist, doc, fence, get, humanize, render, table

ROOT = Path(__file__).resolve().parents[2]
DELIVERY = json.loads((ROOT / "data" / "delivery.json").read_text())

STAMP = (
    "> Generated from the blueprint `{slug}` (content last verified {verified}). Numbers marked *modelled* are starting points from a "
    "capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change."
)


def stamp(u: dict) -> str:
    return STAMP.format(slug=u["slug"], verified=u.get("lastVerifiedAt", "unknown"))


def lead(u: dict, what: str) -> str:
    return f"{stamp(u)}\n\n**Use case:** {u['title']} · **Domain:** {u['domain']} · **Latency tier:** {u.get('latencySLA', '')} · **Difficulty:** {u.get('difficulty', '')}\n\n{what}"


# ------------------------------------------------------------------------------------------------ 00 brief
def brief(u: dict) -> str:
    ps, sa = u.get("problemStatement", {}), u.get("solutionApproach", {})
    pf, dm, ab = u.get("problemFormulation", {}), u.get("decisionMatrix", {}), u.get("architectureBlueprint", {})
    moves = [{"move": m.get("move"), "detail": m.get("detail")} for m in sa.get("moves", [])]
    return doc(
        f"{u['title']}: use-case brief",
        lead(u, "One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it."),
        ("The problem", f"**Situation.** {ps.get('situation', '')}\n\n**Why it is hard.** {ps.get('whyHard', '')}\n\n**Scale and stakes.** {ps.get('scaleAndStakes', '')}\n\n**What success looks like.** {ps.get('successLooksLike', '')}"),
        ("Objective, loss and constraints", f"**Business objective.** {pf.get('businessObjective', u.get('summary', ''))}\n\n**Training objective.** `{pf.get('mlObjectiveAndLoss', '')}`\n\n**Loss variables**\n\n{table(pf.get('lossVariables', []), [('symbol', 'Symbol'), ('meaning', 'Meaning')])}\n**Hard constraints**\n\n{bullets(pf.get('constraints', []))}"),
        ("The approach in one paragraph", f"{sa.get('thesis', '')}\n\n**Moves**\n\n{table(moves)}\n**Deliberately not doing**\n\n{bullets(sa.get('deliberatelyNot', []))}\n**How the approach is proven**\n\n{sa.get('proof', '')}"),
        ("Baseline and production design", f"- **Baseline (build this first):** {ab.get('baselineModel', '')}\n- **Production design:** {ab.get('productionModel', '')}"),
        ("Why AI, and why this kind", f"**Why AI.** {dm.get('whyAI', '')}\n\n**Why not rules.** {dm.get('whyNotRules', '')}\n\n**Why this paradigm.** {dm.get('whyThisParadigm', '')}\n\n**Options weighed**\n\n{table(dm.get('alternatives', []))}\n**Revisit the decision when**\n\n{bullets(dm.get('changeTriggers', []))}"),
        ("Risks to name now", bullets(ps.get("risks", []))),
        ("Sign-off", "| Role | Name | Date | Signature |\n|---|---|---|---|\n| Sponsor | | | |\n| Product owner | | | |\n| Delivery lead | | | |\n| Risk and compliance | | | |"),
    )


# ------------------------------------------------------------------------------------------------ 01 discovery
def discovery(u: dict) -> str:
    d = u.get("discovery", {})
    bc = d.get("businessCase", {})
    qs = [{"id": q.get("id"), "question": q.get("question"), "proposedAnswer": q.get("proposedAnswer"), "confirmWith": q.get("confirmWith"), "evidence": q.get("evidence")} for q in d.get("questions", [])]
    process = d.get("process", {})
    return doc(
        f"{u['title']}: discovery workbook",
        lead(u, "Phase 0 as a workbook. Each question has a proposed answer taken from the blueprint; confirm it with the named person or replace it, and record the evidence."),
        ("Summary", d.get("summary", "")),
        ("Discovery questions", table(qs, [("id", "Id"), ("question", "Question"), ("proposedAnswer", "Proposed answer"), ("confirmWith", "Confirm with"), ("evidence", "Evidence required")], ["Confirmed answer", "Owner", "Status"])),
        ("Stakeholders", table(d.get("stakeholders", []), [("who", "Who"), ("needs", "Needs"), ("involvement", "Involvement")], ["Name", "Interviewed on"])),
        ("User journeys", table(d.get("journeys", []))),
        ("Process: as-is, to-be, what changes", f"**As-is**\n\n{bullets(process.get('asIs', []))}\n**To-be**\n\n{bullets(process.get('toBe', []))}\n**What changes**\n\n{bullets(process.get('changes', []))}"),
        ("Functional requirements", table(d.get("requirements", []), [("id", "Id"), ("requirement", "Requirement"), ("acceptance", "Acceptance (given / when / then)")], ["Traced to test"])),
        ("Non-functional requirements", table(get(u, "enterpriseContext.nfr", []), [("attribute", "Attribute"), ("requirement", "Requirement"), ("measuredBy", "Measured by")], ["Verified in"])),
        (
            "Business case",
            f"- **Baseline:** {bc.get('baseline', '')}\n- **Target:** {bc.get('target', '')}\n- **ROI formula:** `{bc.get('roiFormula', '')}`\n\n**Value drivers**\n\n{bullets(bc.get('valueDrivers', []))}\n**Costs**\n\n{bullets(bc.get('costs', []))}\n**How the benefit is measured**\n\n{bullets(bc.get('measurement', []))}\n**Assumptions**\n\n{bullets(bc.get('assumptions', []))}\n\n**Measured baseline (fill in):** ____________  **Date measured:** ________  **By:** ________",
        ),
        ("RACI for discovery", table(d.get("raci", []))),
        ("Discovery exit gate", table(d.get("exitGate", []), [("criterion", "Criterion"), ("owner", "Owner"), ("status", "Status")], ["Evidence link"])),
    )


# ------------------------------------------------------------------------------------------------ 02 delivery plan
def delivery_plan(u: dict) -> str:
    pb = u.get("playbook", {})
    ms = [{"id": m["id"], "title": m["title"], "days": m["days"], "tasks": m["tasks"], "deliverable": m["deliverable"], "gate": f"{m['gate']['metric']}: {m['gate']['threshold']} ({m['gate']['how']})"} for m in pb.get("milestones", [])]
    phases = []
    for p in DELIVERY:
        steps = "\n".join(f"- [ ] **{s['id']} {s['title']}** · owner: {s['owner']} · {s['when']} → {s['output']}" for s in p["steps"])
        gate = checklist(p["gate"]["checks"])
        phases.append(f"### Phase {p['n']}: {p['name']} ({p['weeks']})\n\nGoal: {p['goal']}\n\nLead: {p['lead']} · Accountable: {p['accountable']}\n\n{steps}\n\n**Gate: {p['gate']['name']}** (convened by {p['gate']['convenedBy']}; signed by {', '.join(p['gate']['signedBy'])})\n\n{gate}")
    pre = pb.get("prerequisites", {})
    return doc(
        f"{u['title']}: delivery plan",
        lead(u, "Two views of the same work: the build milestones for this use case (M0 to M6, each with a numeric exit gate) and the seven delivery phases every use case passes through."),
        ("Effort and prerequisites", f"**Effort.** {pre.get('effort', '')}\n\n**Skills the team needs**\n\n{bullets(pre.get('skills', []))}\n**Tools**\n\n{bullets(pre.get('tools', []))}"),
        ("Build milestones and exit gates", table(ms, [("id", "Id"), ("title", "Milestone"), ("days", "Days"), ("tasks", "Tasks"), ("deliverable", "Deliverable"), ("gate", "Exit gate")], ["Owner", "Planned", "Done"])),
        ("Decisions to take", "\n".join(f"**{x['question']}**\n\n{table(x['options'])}\n*Default:* {x['default']}\n\n*Decision and date:* ____________\n" for x in pb.get("decisions", []))),
        ("Pitfalls, by milestone", table(pb.get("pitfalls", []), [("at", "At"), ("mistake", "Mistake"), ("symptom", "Symptom"), ("fix", "Fix")])),
        ("Test and acceptance plan", table(pb.get("tests", []), [("test", "Test"), ("tool", "Tool or command"), ("pass", "Pass criterion")], ["Result"])),
        ("First 30 days after launch", checklist(pb.get("first30Days", []))),
        ("The seven delivery phases as a checklist", "\n".join(phases)),
    )


def label_text(u: dict) -> str:
    """The label statement for a pack: the blueprint's objective and its first offline-online trap, without any kit-specific wording."""
    objective = get(u, "problemFormulation.businessObjective", u.get("summary", ""))
    trap = (get(u, "evaluationAndMetrics.offlineOnlineGapTraps", []) or get(u, "playbook.pitfalls.0.mistake", []) or [""])
    trap = trap[0] if isinstance(trap, list) else trap
    return (
        f'For "{u["title"]}": {objective.rstrip(".")}. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, '
        f"and when it becomes known. Design around this trap first: {str(trap).rstrip('.')}."
    )


# ------------------------------------------------------------------------------------------------ 03 data
def data_and_features(u: dict) -> str:
    df, pb = u.get("dataAndFeatures", {}), u.get("playbook", {})
    ec = get(u, "enterpriseContext.data", {})
    ddl = get(u, "systemDesign.lld.dataModelDDL", "")
    return doc(
        f"{u['title']}: data and feature specification",
        lead(u, "The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used."),
        ("Label definition", label_text(u)),
        ("Feature specification", table(df.get("highSignalFeatures", []), [("name", "Feature"), ("formulaOrLogic", "Definition"), ("intuition", "Why it carries signal"), ("leakageRisk", "As-of rule and leakage risk")], ["Source table", "Owner", "Available at decision time? (y/n)"])),
        ("Signal versus noise", table(u.get("signalVsNoiseMatrix", []), [("concept", "Concept"), ("trueSignal", "True signal"), ("commonNoise", "Common noise"), ("whyEngineersFail", "Why engineers fail here")])),
        ("Features to drop", table(df.get("noisyFeaturesToDrop", []), [("name", "Feature"), ("whyItIsNoise", "Why it is noise")])),
        ("Data sources", render(ec.get("sources", []))),
        ("Data contract", "The contract below is a starting point; the owner edits and versions it.\n\n" + fence("yaml", ec.get("contractExample", "")) if ec.get("contractExample") else ""),
        ("Quality SLAs", bullets(ec.get("qualitySla", []))),
        ("Lineage, schema change, corrections, privacy", f"- **Lineage:** {ec.get('lineage', '')}\n- **On schema change:** {ec.get('onSchemaChange', '')}\n- **Corrections and backfills:** {ec.get('corrections', '')}\n- **Privacy and deletion:** {ec.get('privacyDeletion', '')}"),
        ("Public datasets to prototype on", table(pb.get("data", {}).get("datasets", []), [("name", "Dataset"), ("url", "URL"), ("license", "Licence"), ("gives", "What it gives"), ("caveat", "Caveat")])),
        ("Reference data model (illustrative)", fence("sql", ddl) if ddl else ""),
        ("Domain knowledge to learn first", f"{get(pb, 'domainKnowledge.overview', '')}\n\n**Concepts**\n\n{table(get(pb, 'domainKnowledge.concepts', []), [('name', 'Concept'), ('explanation', 'Explanation'), ('whyItMatters', 'Why it matters here')])}\n**Ask the experts**\n\n{checklist(get(pb, 'domainKnowledge.askTheExperts', []))}\n**Glossary**\n\n{table(get(pb, 'domainKnowledge.glossary', []), [('term', 'Term'), ('definition', 'Definition')])}"),
    )


# ------------------------------------------------------------------------------------------------ 04 evaluation
def evaluation(u: dict) -> str:
    ev, ex = u.get("evaluationAndMetrics", {}), u.get("experimentation", {})
    m = u.get("metrics", {})
    layers = []
    for layer in m.get("layers", []):
        layers.append(f"### {layer.get('title')}\n\n*{layer.get('why', '')}*\n\n{table(layer.get('rows', []), [('metric', 'Metric'), ('kind', 'Kind'), ('definition', 'Definition'), ('target', 'Target'), ('cadence', 'Cadence'), ('owner', 'Owner'), ('onBreach', 'On breach')])}")
    design, power, labels = ex.get("design", {}), ex.get("power", {}), ex.get("labels", {})
    return doc(
        f"{u['title']}: evaluation plan",
        lead(u, "What has to be proven before launch, how, with what thresholds, and what keeps being measured afterwards."),
        ("Offline metrics", render(ev.get("offlineMetrics", []))),
        ("Online business metrics", render(ev.get("onlineBusinessMetrics", []))),
        ("Offline-to-online gaps to watch", bullets(ev.get("offlineOnlineGapTraps", []))),
        ("Question and estimand", f"**Question.** {ex.get('question', '')}\n\n**Estimand.** {ex.get('estimand', '')}"),
        ("Experiment design", f"- **Type:** {design.get('type', '')}\n- **Unit:** {design.get('unit', '')}\n- **Why:** {design.get('why', '')}\n- **Interference:** {design.get('interference', '')}\n\n**Primary metric.** {get(ex, 'metrics.primary', '')}\n\n**Guardrails**\n\n{bullets(get(ex, 'metrics.guardrails', []))}\n**Offline-online gap.** {get(ex, 'metrics.offlineOnlineGap', '')}"),
        ("Power and duration", f"- **alpha:** {power.get('alpha', '')} · **power:** {power.get('power', '')}\n- **Minimum detectable effect:** {power.get('mde', '')}\n- **Sample size rule:** {power.get('sampleSizeRule', '')}\n- **Duration:** {power.get('duration', '')}\n\n**Your numbers.** Baseline rate: ______ · MDE: ______ · n per arm: ______ · weeks: ______"),
        ("Labels", f"- **Maturity:** {labels.get('maturity', '')}\n- **Quality:** {labels.get('quality', '')}\n- **Selection bias:** {labels.get('selectionBias', '')}"),
        ("Sampling, slices, uncertainty, causal method", f"- **Sampling:** {ex.get('sampling', '')}\n- **Uncertainty:** {ex.get('uncertainty', '')}\n- **Calibration:** {ex.get('calibration', '')}\n- **Counterfactual replay:** {ex.get('counterfactual', '')}\n- **Causal method:** {get(ex, 'causal.method', '')} ({get(ex, 'causal.when', '')})\n\n**Slices to report**\n\n{bullets(ex.get('slices', []))}\n**Data quality checks**\n\n{bullets(ex.get('dataQuality', []))}"),
        ("Stopping rules", bullets(ex.get("stopping", []))),
        ("Business value", table(ex.get("businessValue", []))),
        ("Experiment pitfalls", bullets(ex.get("pitfalls", []))),
        ("Metrics catalogue", "\n".join(layers)),
        ("Metrics that can be gamed", table(m.get("gaming", []))),
        ("Release gate record", "| Gate | Threshold | Measured | Interval | Pass | Date | Approver |\n|---|---|---|---|---|---|---|\n| Offline primary | | | | | | |\n| Calibration | | | | | | |\n| Slice parity | | | | | | |\n| Shadow agreement | | | | | | |\n| Guardrails | | | | | | |"),
    )


# ------------------------------------------------------------------------------------------------ 05 governance
def governance(u: dict) -> str:
    g = u.get("governance", {})
    risks = [{"risk": r, "likelihood": "", "impact": "", "mitigation": "", "owner": "", "status": "open"} for r in get(u, "problemStatement.risks", [])]
    edge = [{"risk": f"{e.get('scenario')}: {e.get('failureMode')}", "likelihood": "", "impact": "", "mitigation": e.get("mitigationStrategy"), "owner": "", "status": "open"} for e in u.get("productionEdgeCases", [])]
    return doc(
        f"{u['title']}: risk and governance register",
        lead(u, "The risk register and control evidence for reviewers. The treatment follows the risk tier; the architecture supports these controls, and compliance is established by your own controls, evidence and assessment."),
        ("Risk tier and treatment", f"**Tier: {g.get('riskTier', '')}.** {g.get('rationale', '')}\n\n**Treatment.** {g.get('treatment', '')}\n\n**Approval path**\n\n{bullets(g.get('approvalPath', []))}"),
        ("Risk register", table(risks + edge, [("risk", "Risk"), ("likelihood", "Likelihood (L/M/H)"), ("impact", "Impact (L/M/H)"), ("mitigation", "Mitigation"), ("owner", "Owner"), ("status", "Status")])),
        ("Data controls", table(g.get("data", []))),
        ("Model controls", table(g.get("model", []))),
        ("Responsible AI controls", table(g.get("responsibleAI", []))),
        ("AI security controls", table(g.get("aiSecurity", []))),
        ("Regulatory obligations", table(g.get("regulatory", []), [("obligation", "Obligation"), ("architecturalControl", "Architectural control"), ("evidence", "Evidence"), ("owner", "Owner"), ("cadence", "Cadence")], ["Evidence link"])),
        ("Edge cases and their monitors", table(get(u, "metrics.failureMonitors", []))),
        ("Decision on residual risk", "Residual risks accepted by: ____________  Date: ________  Review on: ________"),
    )


# ------------------------------------------------------------------------------------------------ 06 operations
def operations(u: dict) -> str:
    o, lld = u.get("operations", {}), get(u, "systemDesign.lld", {})
    mlops = u.get("mlops", {})
    runbooks = []
    for i, s in enumerate(o.get("scenarios", []), 1):
        runbooks.append(f"### RB-{i:02d} {s.get('failure')}\n\n- **Detect:** {s.get('detection')}\n- **Alert:** {s.get('alert')} (owner: {s.get('owner')})\n- **Mitigate:** {s.get('mitigation')}\n- **Recover:** {s.get('recovery')}\n- **Then learn:** {s.get('learning')}\n- **Last drilled:** ________  **Result:** ________")
    return doc(
        f"{u['title']}: operations runbook",
        lead(u, "What the on-call engineer needs at 3 a.m.: objectives, alerts, the first steps for each known failure, how to roll back, and what each decision costs."),
        ("Service level objectives", table(o.get("slos", []), [("sli", "Indicator"), ("slo", "Objective"), ("window", "Window"), ("errorBudget", "Error budget")])),
        ("Telemetry to collect", table(o.get("telemetry", []))),
        ("Severities", table(o.get("severities", []))),
        ("Support model", table(o.get("support", []))),
        ("Release and rollback", f"- **Deploy:** {get(o, 'release.deploy', '')}\n- **Rollback:** {get(o, 'release.rollback', '')}\n\n**Rollback paths**\n\n{bullets(mlops.get('rollback', []))}"),
        ("Runbook entries", "\n".join(runbooks)),
        ("Degradation ladder", table(lld.get("degradationLadder", []))),
        ("Failure and retry behaviour", table(lld.get("failureAndRetry", []))),
        ("Security model", bullets(lld.get("securityModel", []))),
        ("Test scenarios for the running system", table(lld.get("testScenarios", []))),
        ("Retraining", f"{render(mlops.get('retraining', {}))}"),
        ("Lifecycle controls", table(mlops.get("lifecycle", []))),
        ("Toolchain options", table(mlops.get("toolchain", []))),
        ("Capacity statement (modelled)", o.get("capacity", "")),
        ("Unit costs (modelled)", table(o.get("unitCost", []))),
        ("Game-day log", "| Date | Scenario (RB-xx) | What happened | Time to detect | Time to recover | Actions |\n|---|---|---|---|---|---|\n| | | | | | |"),
    )


# ------------------------------------------------------------------------------------------------ 07 cards
def cards(u: dict) -> str:
    ab, ev, g = u.get("architectureBlueprint", {}), u.get("evaluationAndMetrics", {}), u.get("governance", {})
    pb = u.get("playbook", {})
    return doc(
        f"{u['title']}: model card and data card",
        lead(u, "Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation."),
        (
            "Model card",
            f"- **Name and version:** ____________\n- **Owner:** ____________\n- **Baseline model:** {ab.get('baselineModel', '')}\n- **Production model:** {ab.get('productionModel', '')}\n- **Intended use:** {get(u, 'problemFormulation.businessObjective', '')}\n- **Out of scope:** {cell(get(u, 'solutionApproach.deliberatelyNot', []))}\n- **Primary metrics:** {cell([m if isinstance(m, str) else m.get('metric', m) for m in ev.get('offlineMetrics', [])])}\n- **Measured values (fill in):** ____________\n- **Slices reported:** {cell(get(u, 'experimentation.slices', []))}\n- **Calibration:** {get(u, 'experimentation.calibration', '')}\n- **Known failure modes:** {cell([e.get('scenario') for e in u.get('productionEdgeCases', [])])}\n- **Human oversight:** {get(u, 'decisionMatrix.humanOversight.mode', '')}: {get(u, 'decisionMatrix.humanOversight.detail', '')}",
        ),
        ("Fairness and responsible-AI notes", table(g.get("responsibleAI", []))),
        (
            "Data card",
            f"- **Dataset name and owner:** ____________\n- **Purpose:** {get(u, 'problemFormulation.businessObjective', '')}\n- **Label:** {get(pb, 'data.label', '')}\n- **Sources:** {cell([s if isinstance(s, str) else s.get('name', s) for s in get(u, 'enterpriseContext.data.sources', [])])}\n- **Time coverage and refresh:** ____________\n- **Known gaps and biases:** {cell(get(u, 'evaluationAndMetrics.offlineOnlineGapTraps', []))}\n- **Privacy and deletion:** {get(u, 'enterpriseContext.data.privacyDeletion', '')}\n- **Maintenance owner and cadence:** ____________",
        ),
        ("Changes since the last card", "| Date | Change | Author |\n|---|---|---|\n| | | |"),
    )


# ------------------------------------------------------------------------------------------------ 08 capacity
def capacity(u: dict) -> str:
    sc = get(u, "systemDesign.scale", {})
    tech = get(u, "enterpriseContext.technology", {})
    inputs = sc.get("inputs", {})
    return doc(
        f"{u['title']}: capacity and cost at 10 million users",
        lead(u, "The sizing model behind the design, with the inputs exposed so you can replace them with your own traffic. Modelled on-demand list prices; committed-use pricing usually lowers compute."),
        ("Inputs", table([{"input": k, "value": v} for k, v in inputs.items()], [("input", "Input"), ("value", "Value")])),
        ("Capacity table (modelled)", table(sc.get("table", []))),
        ("Assumptions", bullets(sc.get("assumptions", []))),
        ("Bottlenecks to expect", bullets(sc.get("bottlenecks", []))),
        ("Resilience", bullets(sc.get("resilience", []))),
        ("Where it runs", f"- **Hosting:** {tech.get('hosting', '')}\n- **Compute:** {tech.get('compute', '')}\n- **Data platform:** {tech.get('dataPlatform', '')}\n- **AI platform:** {tech.get('aiPlatform', '')}\n- **Deployment:** {tech.get('deployment', '')}"),
        ("Re-run with your numbers", "| Input | Blueprint | Yours |\n|---|---|---|\n| Registered users | 10M | |\n| Daily active share | 30% | |\n| Events per active user per day | 3 | |\n| Peak to average ratio | 6x | |\n| Payload per event | 10 KB | |"),
    )


# ------------------------------------------------------------------------------------------------ fit
def fit_doc(u: dict, engine: str, fit: str, meta: dict, authored: bool) -> str:
    compat = get(u, "playbook.compatibility", {})
    rows = compat.get("dimensions", [])
    mods = compat.get("modifications", [])
    problem = compat.get("problemType", "")
    if authored:
        statement = "This pack ships a hand-written starter for exactly this use case, with its own data generator, tests and contracts. It is the most complete kind of pack in this repository."
    elif fit == "exact":
        statement = f"The `{engine}` engine implements this problem type (`{problem}`) as it is. Its synthetic data, split, metrics and tests are the ones this use case needs, with your signals mapped onto the engine's features."
    else:
        statement = f"The `{engine}` engine implements a neighbouring problem. This use case is `{problem}`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter."
    return doc(
        f"{u['title']}: how well the starter fits",
        f"{stamp(u)}\n\n**Engine:** `{engine}` ({meta['label']}) · **Fit:** {'hand-written for this use case' if authored else fit} · **Problem type:** `{problem}`\n\n{statement}",
        ("Traps the synthetic data plants", bullets(meta.get("traps", []))),
        ("What the starter does not do", "- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.\n- It is not production code: no serving layer, no auth, no secrets handling.\n- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform."),
        ("Changes to make before you rely on it" if fit == "adaptable" and not authored else "Changes to make", bullets(mods) if mods and fit == "adaptable" else "None required for the mechanics. Replace the synthetic generator with your extract, and keep the split, the leakage tests and the gates."),
        ("Dimension by dimension", table(rows, [("dimension", "Dimension"), ("needs", "This use case needs"), ("provides", "The engine provides"), ("status", "Status"), ("change", "Change")]) if rows and not authored else ""),
    )
