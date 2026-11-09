/**
 * Agentic solutioning for a use case.
 *
 * The point of this section is the distinction most teams miss: an agent is rarely a replacement for the model in the decision path.
 * For a scoring, forecasting or ranking system it is the operating layer around the model (investigate, explain, label, monitor,
 * re-plan); for a language-model system it is the product. Either way it earns autonomy in steps, with typed tools, permissions,
 * a verifier and a replay set.
 *
 * Everything below is generated deterministically from the blueprint's own pipeline stages, constraints, edge cases, metrics and
 * traps, plus a role pattern per kind of system (the same eleven kinds as the reference starter kits).
 */
import { DOMAIN_META, type Agentic, type AgentAlternative, type AgentDecision, AgenticSchema, type Domain, type LatencySLA, type Paradigm, isAgentic } from '../schemas/usecase.schema';
import { m, snake, type Stage, TOTAL_BUDGET_MS } from './design';
import type { RawUseCase } from './parse';
import { pickKit, type KitId } from './playbook-gen';

type Level = 'L0' | 'L1' | 'L2' | 'L3';
interface AgentTpl { name: string; responsibility: string; trigger: string; tools: string[]; autonomy: Level; handoff: string }
interface Role { fit: Agentic['fit']; role: string; pattern: string; why: string; agents: AgentTpl[]; context: { kind: string; detail: string }[] }

const ROLES: Record<KitId, Role> = {
  tabular: {
    fit: 'strong',
    role: 'Investigator and operator layer around the scoring model',
    pattern: 'Model in the decision path, agents around it',
    why: 'The model must decide in the request path with a fixed latency budget, so an agent cannot replace it. Agents take over what a score cannot do: gathering context for cases in the review band, explaining a decision, chasing delayed labels and keeping thresholds and rules current.',
    agents: [
      { name: 'Case investigator', responsibility: 'Collects evidence for each case the model sends to review, writes a cited summary and recommends a disposition', trigger: 'A score falls inside the review band, or a customer or analyst disputes a decision', tools: ['get_decision_log', 'get_entity_history', 'search_policy'], autonomy: 'L1', handoff: 'Analyst approves or overrides; the outcome becomes a label' },
      { name: 'Label and feedback agent', responsibility: 'Chases confirmed outcomes, joins them to the decision snapshot with their delay and proposes matured labels', trigger: 'A label window closes or a late outcome arrives', tools: ['get_decision_log', 'get_outcomes', 'propose_label'], autonomy: 'L1', handoff: 'Data owner approves label batches before they enter training' },
      { name: 'Drift and threshold sentinel', responsibility: 'Watches input drift, score drift and cost per decision, replays a proposed threshold change on recent traffic and reports its effect', trigger: 'Daily, and when a guardrail metric moves', tools: ['get_metrics', 'replay_decisions', 'create_change_request'], autonomy: 'L0', handoff: 'Model owner reviews the change request; nothing deploys automatically' },
    ],
    context: [{ kind: 'Working memory', detail: 'The case record, the decision snapshot (features and model version) and the tool results so far' }, { kind: 'Retrieval', detail: 'Policy documents, past dispositions of similar cases and the runbook for each review reason' }, { kind: 'Long-term memory', detail: 'Analyst overrides and their reasons, stored as labelled examples rather than free text' }],
  },
  forecast: {
    fit: 'strong',
    role: "Planner's assistant around the forecast",
    pattern: 'Forecast service in the loop, agents explain and handle exceptions',
    why: 'Forecasts are produced by a scheduled pipeline and consumed by planners. Agents add value where planners spend their time: explaining why a forecast moved, handling exceptions such as late feeds and stock-outs, and running what-if scenarios through the forecasting service.',
    agents: [
      { name: 'Forecast explainer', responsibility: 'Compares two forecast versions, attributes the change to drivers and writes a short cited explanation for the planner', trigger: 'A forecast changes by more than the agreed tolerance, or a planner asks why', tools: ['get_forecast_versions', 'get_driver_contributions', 'search_calendar'], autonomy: 'L1', handoff: 'Planner accepts the explanation or opens the series' },
      { name: 'Exception handler', responsibility: 'Reviews series flagged for late or missing feeds, capped history or sudden level shifts and proposes imputation, flags or overrides', trigger: 'The pipeline raises a data-quality or accuracy exception', tools: ['get_feed_status', 'get_series_history', 'propose_override'], autonomy: 'L1', handoff: 'Planner approves overrides, which are recorded with their reason' },
      { name: 'Scenario agent', responsibility: 'Turns a planner question ("what if the promotion moves a week?") into a scenario run and compares it with the baseline forecast', trigger: 'A planner request', tools: ['run_scenario', 'get_forecast_versions', 'get_driver_contributions'], autonomy: 'L0', handoff: 'Results are shown beside the baseline; nothing is published' },
    ],
    context: [{ kind: 'Working memory', detail: 'The series, its recent history, the forecast versions and the feed status' }, { kind: 'Retrieval', detail: 'The promotion and event calendar, supplier notices and previous overrides for the same series' }, { kind: 'Long-term memory', detail: 'Planner overrides with outcomes, so the agent learns which overrides added accuracy' }],
  },
  anomaly: {
    fit: 'strong',
    role: 'Alert triage, root-cause and runbook agents on top of the detector',
    pattern: 'Detector raises alerts, agents triage and remediate',
    why: 'Detectors are cheap and noisy; the cost is the human time spent on each alert. Agents gather the context an engineer would (recent changes, upstream metrics, calendar events), group related alerts, rank them and, within approved limits, run the remediation step.',
    agents: [
      { name: 'Alert triage agent', responsibility: 'Enriches each alert with recent deploys, scheduled events and upstream metrics, groups duplicates and assigns a severity with its evidence', trigger: 'A detector raises an alert', tools: ['get_alert', 'get_recent_changes', 'get_related_series'], autonomy: 'L1', handoff: 'On-call engineer confirms severity; low-severity groups are closed with a reason' },
      { name: 'Root-cause agent', responsibility: 'Forms hypotheses, runs read-only queries to test them and reports the most likely cause with the queries it ran', trigger: 'A grouped alert is confirmed as real', tools: ['query_metrics', 'query_logs', 'get_topology'], autonomy: 'L1', handoff: 'Engineer reviews the evidence chain before acting' },
      { name: 'Runbook executor', responsibility: 'Runs the documented remediation for known causes, one reversible step at a time, and stops on any unexpected result', trigger: 'A human approves a runbook step', tools: ['get_runbook', 'run_runbook_step', 'rollback_step'], autonomy: 'L2', handoff: 'Any step outside the runbook, or any failure, pages a human' },
    ],
    context: [{ kind: 'Working memory', detail: 'The alert, the series window, related series and every query result so far' }, { kind: 'Retrieval', detail: 'Runbooks, past incidents with the same signature and the change calendar' }, { kind: 'Long-term memory', detail: 'Closed alerts with their true cause, used to tune grouping and severity' }],
  },
  recommender: {
    fit: 'supporting',
    role: 'Merchandising, experiment and catalogue-quality agents beside the ranker',
    pattern: 'Ranker in the request path, agents in the feedback loop',
    why: 'Ranking runs in tens of milliseconds, far inside any agent loop. Agents belong in the surrounding work: explaining ranking behaviour to merchandisers, reading experiments against guardrails and finding catalogue problems that no ranker can fix.',
    agents: [
      { name: 'Merchandising copilot', responsibility: 'Explains why items rank where they do, finds coverage and popularity-bias problems and drafts pin, ban or boost rules for review', trigger: 'A merchandiser asks, or coverage falls below target', tools: ['get_ranking_trace', 'get_coverage_report', 'draft_rule'], autonomy: 'L1', handoff: 'Merchandiser approves rules before they reach the ranker' },
      { name: 'Experiment analyst', responsibility: 'Reads A/B and interleaving results, checks guardrails and sample ratio, and writes a decision memo with intervals', trigger: 'An experiment reaches its planned size', tools: ['get_experiment', 'get_metrics', 'run_power_check'], autonomy: 'L0', handoff: 'Product owner makes the ship decision' },
      { name: 'Catalogue quality agent', responsibility: 'Detects stale, out-of-stock or mis-categorised items that distort recommendations and proposes fixes to the catalogue owner', trigger: 'Daily, and when an item is over-exposed but converting poorly', tools: ['get_item', 'get_inventory', 'create_catalogue_task'], autonomy: 'L1', handoff: 'Catalogue owner applies the change' },
    ],
    context: [{ kind: 'Working memory', detail: 'The ranking trace for the request or experiment being examined' }, { kind: 'Retrieval', detail: 'Merchandising rules, past experiments and catalogue policies' }, { kind: 'Long-term memory', detail: 'Accepted and rejected rule proposals with their measured effect' }],
  },
  graph: {
    fit: 'strong',
    role: 'Resolution reviewer and ring investigator around the link model',
    pattern: 'Link model proposes, agents assemble evidence for a human decision',
    why: 'One wrong link can merge two large groups, so merges and flags need evidence and a human decision. Agents assemble that evidence quickly: shared values with their rarity, history of each record and the neighbourhood of a suspected ring.',
    agents: [
      { name: 'Resolution reviewer', responsibility: 'For each uncertain pair, retrieves both records, the shared values and their rarity, and proposes merge, keep apart or ask', trigger: 'A pair scores inside the uncertain band', tools: ['get_record', 'get_shared_values', 'get_cluster'], autonomy: 'L1', handoff: 'Data steward approves merges; every merge is reversible' },
      { name: 'Ring investigator', responsibility: 'Expands the neighbourhood around a flagged group, summarises roles and flows and lists the evidence for the case file', trigger: 'A cluster is flagged or grows abnormally', tools: ['get_neighbourhood', 'get_transactions', 'create_case'], autonomy: 'L1', handoff: 'Investigator accepts, edits or closes the case' },
      { name: 'Graph quality sentinel', responsibility: 'Monitors the largest cluster, hub values and link precision on a labelled sample and proposes hub caps or threshold changes', trigger: 'Daily, and after any bulk load', tools: ['get_graph_metrics', 'get_hub_report', 'create_change_request'], autonomy: 'L0', handoff: 'Owner reviews the change request' },
    ],
    context: [{ kind: 'Working memory', detail: 'The pair or cluster under review, with the shared values and their group sizes' }, { kind: 'Retrieval', detail: 'Past merge decisions and their outcomes, matching rules and data-source notes' }, { kind: 'Long-term memory', detail: 'Reviewer decisions as labelled pairs for retraining' }],
  },
  nlp: {
    fit: 'strong',
    role: 'Labelling, error-analysis and drift agents around the text model',
    pattern: 'Classifier in the path, agents curate the data around it',
    why: 'Text models are limited by labels and vocabulary drift more than by architecture. Agents pre-label with a confidence, route uncertain items to people, cluster errors and watch for new vocabulary.',
    agents: [
      { name: 'Labelling agent', responsibility: 'Pre-labels incoming documents, explains each label with the text span it used and routes low-confidence items to annotators', trigger: 'New documents arrive, or a class has too few labels', tools: ['get_document', 'get_label_guideline', 'propose_label'], autonomy: 'L1', handoff: 'Annotators confirm; agreement with the agent is tracked' },
      { name: 'Error analyst', responsibility: 'Clusters misclassified examples, names the pattern and drafts a guideline or data fix', trigger: 'Weekly, and after a model release', tools: ['get_errors', 'cluster_examples', 'draft_guideline_change'], autonomy: 'L0', handoff: 'Data lead reviews proposals' },
      { name: 'Vocabulary drift watcher', responsibility: 'Detects new terms and shifting class balance and recommends retraining or lexicon updates', trigger: 'Daily', tools: ['get_vocabulary_stats', 'get_class_balance', 'create_change_request'], autonomy: 'L0', handoff: 'Model owner decides on retraining' },
    ],
    context: [{ kind: 'Working memory', detail: 'The document, its thread and the label guideline' }, { kind: 'Retrieval', detail: 'Labelled examples of each class and the annotation guideline' }, { kind: 'Long-term memory', detail: 'Annotator corrections, used as new labelled data' }],
  },
  cv: {
    fit: 'supporting',
    role: 'Exception review, data-curation and site-onboarding agents around the vision model',
    pattern: 'Vision model on the stream, agents handle exceptions and validation',
    why: 'Inference is a model call, not an agent loop. Agents help with what surrounds it: reviewing low-confidence images against similar past cases, finding label noise and shortcuts, and running the checklist for validating a new camera or site before an operating threshold is carried over.',
    agents: [
      { name: 'Exception reviewer', responsibility: 'Retrieves similar past cases for a low-confidence image, shows the evidence and drafts a disposition', trigger: 'Confidence falls in the review band', tools: ['get_image_result', 'search_similar_cases', 'get_guideline'], autonomy: 'L1', handoff: 'Reviewer confirms; the decision becomes a label' },
      { name: 'Data curator', responsibility: 'Finds probable label errors, duplicates and shortcuts (overlays, brightness, scanner artefacts) and proposes dataset fixes', trigger: 'Weekly, and before each retraining', tools: ['get_dataset_stats', 'find_label_conflicts', 'create_data_task'], autonomy: 'L0', handoff: 'Data owner approves changes' },
      { name: 'Site onboarding agent', responsibility: 'Runs the validation checklist for a new camera, device or site: distribution comparison, threshold check and a sample review', trigger: 'A new site or device is registered', tools: ['get_site_images', 'run_validation_suite', 'create_report'], autonomy: 'L1', handoff: 'Quality lead signs off before the site goes live' },
    ],
    context: [{ kind: 'Working memory', detail: 'The image, its model output and the guideline for the finding' }, { kind: 'Retrieval', detail: 'Embeddings of past reviewed cases and their final dispositions' }, { kind: 'Long-term memory', detail: 'Per-site validation results and reviewer disagreements' }],
  },
  bandit: {
    fit: 'supporting',
    role: 'Policy-analysis, guardrail and experiment agents around the decision policy',
    pattern: 'Policy decides, agents evaluate and guard',
    why: 'The policy must choose actions in milliseconds from logged propensities. Agents work around it: reading off-policy evaluation reports, watching guardrails, designing experiments and explaining policy changes to the business.',
    agents: [
      { name: 'Policy analyst', responsibility: 'Runs off-policy evaluation for a candidate policy, compares estimators and writes a memo with the estimate, its uncertainty and its risks', trigger: 'A candidate policy is proposed', tools: ['get_logged_data', 'run_ope', 'get_policy_diff'], autonomy: 'L0', handoff: 'Owner decides whether to run an online test' },
      { name: 'Guardrail monitor', responsibility: 'Watches guardrail metrics and exploration rates in production and pauses exploration or reverts to the previous policy when a limit is crossed', trigger: 'Continuously', tools: ['get_metrics', 'pause_exploration', 'rollback_policy'], autonomy: 'L2', handoff: 'A human reviews every automatic rollback' },
      { name: 'Experiment designer', responsibility: 'Chooses sample size, holdout and duration for a test and checks that propensities are logged', trigger: 'An online test is planned', tools: ['get_traffic_stats', 'run_power_check', 'create_experiment'], autonomy: 'L1', handoff: 'Owner approves the experiment' },
    ],
    context: [{ kind: 'Working memory', detail: 'The candidate policy, logged data summary and estimator outputs' }, { kind: 'Retrieval', detail: 'Past experiments, their estimates and what was later measured' }, { kind: 'Long-term memory', detail: 'Calibration of offline estimates against online results' }],
  },
  optimize: {
    fit: 'strong',
    role: 'Planner, re-planner and exception agents around the solver',
    pattern: 'Solver computes, agents translate, re-plan and explain',
    why: 'Optimisation problems are solved by a solver, not by a language model. Agents turn business requests into constraints, call the solver, re-plan when events break the plan, and explain the trade-offs so people can accept a change.',
    agents: [
      { name: 'Planner agent', responsibility: 'Turns a request or constraint change into solver inputs, runs the solver and explains the result and its trade-offs in business terms', trigger: 'A planner request or a new planning cycle', tools: ['get_instance', 'run_solver', 'compare_plans'], autonomy: 'L1', handoff: 'Planner approves the plan before it is published' },
      { name: 'Re-planner', responsibility: 'Reacts to events (a late vehicle, an absent worker) by re-solving within allowed change limits and showing the plan churn', trigger: 'A disruption event', tools: ['get_events', 'run_solver', 'get_plan_churn'], autonomy: 'L2', handoff: 'Changes beyond the churn limit need approval' },
      { name: 'Exception handler', responsibility: 'Handles infeasible or conflicting requests by finding which constraint binds and proposing relaxations with their cost', trigger: 'The solver reports infeasibility or a very high cost', tools: ['explain_infeasibility', 'run_solver', 'create_ticket'], autonomy: 'L1', handoff: 'Owner of the constraint decides' },
    ],
    context: [{ kind: 'Working memory', detail: 'The current plan, the active constraints and recent events' }, { kind: 'Retrieval', detail: 'Business rules, previous plans and why they were changed' }, { kind: 'Long-term memory', detail: 'Promised versus realised cost per plan, to correct optimism' }],
  },
  'llm-rag': {
    fit: 'core',
    role: 'The product itself: a grounded answering agent with a verifier',
    pattern: 'Retrieve, answer, verify, abstain',
    why: 'This is a language-model product, so the agent is the system. Its quality depends on structure around the model: version-aware retrieval, a source filter, a verifier that checks every cited claim and a clear policy to abstain.',
    agents: [
      { name: 'Router and intent agent', responsibility: 'Classifies the request, picks the version and sources, and decides whether the request is in scope', trigger: 'Every request', tools: ['get_context', 'classify_intent', 'search_index'], autonomy: 'L2', handoff: 'Out-of-scope or unsafe requests go to a human channel' },
      { name: 'Retrieval and answer agent', responsibility: 'Retrieves passages, composes an answer from them only and attaches citations', trigger: 'An in-scope request', tools: ['search_index', 'get_passage', 'compose_answer'], autonomy: 'L2', handoff: 'Answers pass through the verifier before they are shown' },
      { name: 'Verifier and abstention agent', responsibility: 'Checks that each claim is supported by its cited passage for the right version and abstains or escalates when it is not', trigger: 'Every drafted answer', tools: ['get_passage', 'check_claim', 'escalate'], autonomy: 'L2', handoff: 'Unsupported answers become an abstention with the closest sources' },
    ],
    context: [{ kind: 'Working memory', detail: 'The conversation, the resolved version and the retrieved passages' }, { kind: 'Retrieval', detail: 'The indexed knowledge with source type, version and deprecation metadata' }, { kind: 'Long-term memory', detail: 'Thumbs-down feedback and abstentions with their questions, reviewed weekly' }],
  },
  'llm-agent': {
    fit: 'core',
    role: 'The product itself: a planner-executor agent with typed tools and approvals',
    pattern: 'Plan, call typed tools, verify, escalate',
    why: 'This is an agent product, so safety comes from structure: typed read-only tools, an allow-list, approval for any action that changes something, step and cost budgets, an evidence verifier and a replay set that includes planted attacks.',
    agents: [
      { name: 'Planner', responsibility: 'Decides the next step from the task and the evidence so far, within a step and cost budget', trigger: 'A task arrives', tools: ['get_task', 'list_allowed_tools', 'plan_next_step'], autonomy: 'L1', handoff: 'Stops and escalates when the budget is exhausted or evidence is missing' },
      { name: 'Tool executor', responsibility: 'Runs typed tool calls with narrow schemas and returns results as untrusted data', trigger: 'The planner requests a tool call', tools: ['run_read_tool', 'request_approval', 'write_audit_log'], autonomy: 'L1', handoff: 'Write actions wait for a named approver' },
      { name: 'Verifier', responsibility: 'Checks that every claim cites an existing record that supports it and blocks unsupported conclusions', trigger: 'Before any answer or action is released', tools: ['get_record', 'check_claim', 'escalate'], autonomy: 'L2', handoff: 'Unsupported claims become an escalation with the missing evidence listed' },
    ],
    context: [{ kind: 'Working memory', detail: 'The task, the plan and every tool result, kept as untrusted data' }, { kind: 'Retrieval', detail: 'Playbooks, similar closed cases and tool documentation' }, { kind: 'Long-term memory', detail: 'Reviewed outcomes and approver decisions, used for the replay set' }],
  },
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const low = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

const DATA_RULE: Record<string, string> = {
  healthcare: 'Protected health information never enters a prompt unredacted; tools return only the fields the task needs',
  fintech: 'Account numbers and card data are tokenised before any tool result reaches a model',
  bfsi: 'Customer identifiers, account numbers and policy data are tokenised or masked before any tool result reaches a model',
  edtech: 'Learner identifiers are pseudonymised and minors\' data is excluded from prompts and logs by default',
  'real-estate': 'Personal data of tenants, buyers and owners is masked in tool results, and fair-housing protected attributes are never passed to a model',
};


/* ------------------------------------------------------------------ does this problem need an agent at all? */

type NoAgent = 'fast-no-queue' | 'batch-no-queue' | 'closed-loop' | 'solver';
const REGULATED: Domain[] = ['healthcare', 'fintech', 'bfsi'];

/**
 * The first question is not "which agents?" but "is an agent better than a rules engine, a conventional model, an optimiser or a
 * deterministic workflow?". An agent earns its place when there is work a score cannot do (investigating, explaining, chasing
 * evidence, drafting changes) or when the product is language. Without a human queue to feed, a closed learning loop or a solver,
 * the deterministic design wins and the blueprint says so.
 */
export function agentVerdict(kit: KitId, latency: LatencySLA, hasHumanQueue: boolean): NoAgent | null {
  if (kit === 'llm-agent' || kit === 'llm-rag' || kit === 'nlp') return null;
  const fast = latency === 'sub-10ms' || latency === 'sub-100ms';
  if (kit === 'bandit' && !hasHumanQueue) return 'closed-loop';
  if (kit === 'optimize' && !hasHumanQueue) return 'solver';
  if (hasHumanQueue) return null;
  if (fast) return 'fast-no-queue';
  if (latency === 'batch') return 'batch-no-queue';
  return null;
}

const APPROACH_START: Record<AgentAlternative, string> = {
  'rules-engine': 'Stable, explicit business rules that a domain owner can state and audit',
  'conventional-ml': 'A structured prediction with labelled history and a measurable loss',
  optimiser: 'A constrained allocation, routing or scheduling problem where feasibility must be guaranteed',
  'llm-rag': 'Knowledge-intensive language tasks that need grounded, cited answers',
  'deterministic-workflow': 'Known steps that need retries, SLAs, ordering and an exception queue',
  'human-in-the-loop': 'High-consequence decisions that need a named accountable person',
  'agentic-workflow': 'Multi-step work whose intermediate results decide the next step and cannot be scripted in advance',
};

const PRIMARY: Record<KitId, AgentAlternative> = {
  tabular: 'conventional-ml', forecast: 'conventional-ml', anomaly: 'conventional-ml', recommender: 'conventional-ml', graph: 'conventional-ml',
  nlp: 'conventional-ml', cv: 'conventional-ml', bandit: 'conventional-ml', optimize: 'optimiser', 'llm-rag': 'llm-rag', 'llm-agent': 'agentic-workflow',
};

const WHY_NOT: Record<NoAgent, (b: number | null) => string> = {
  'fast-no-queue': (b) => `the decision runs in ${b ?? 'a few'} ms and no case queue exists to feed an asynchronous agent: a planning loop cannot sit in the path, and there is nothing beside it to investigate`,
  'batch-no-queue': () => 'the work is a scheduled, fully specified pipeline; orchestration with retries, a reconciliation report and an exception list does the same job deterministically and testably',
  'closed-loop': () => 'the policy already learns from its own feedback loop; an agent in or beside it would be a second, unaccountable controller of the same decision',
  solver: () => 'the solver searches the space and proves feasibility; a language-model planner can give neither the guarantee nor the explanation of binding constraints',
};

const REVISIT: Record<NoAgent, string[]> = {
  'fast-no-queue': ['A review or case-handling queue appears and analysts spend most of their time gathering evidence', 'Unstructured inputs (documents, free text) become part of the decision', 'Disputes or explanations must be produced for each decision at a volume people cannot handle'],
  'batch-no-queue': ['Exception volume grows until manual triage costs more than an agent would', 'The exception handling needs multi-step investigation whose steps cannot be fixed in advance', 'Free-text sources start to drive the run'],
  'closed-loop': ['Business owners need natural-language what-if analysis over the policy, not control of it', 'A human review stage is introduced for high-value decisions', 'Campaign or policy setup becomes a multi-step process with tool use'],
  solver: ['Planners need an assistant that gathers inputs and explains plans, while the solver still decides', 'Disruptions arrive as unstructured messages that must be turned into constraints', 'A human approval queue forms around the plan and consumes analyst time'],
};

function buildDecision(opts: { raw: RawUseCase; kit: KitId; fit: Agentic['fit']; no: NoAgent | null; domain: Domain; latency: LatencySLA; hasHuman: boolean; steps: number }): AgentDecision {
  const { raw, kit, fit, no, domain, latency, hasHuman, steps } = opts;
  const agentic = isAgentic(fit);
  const budget = TOTAL_BUDGET_MS[latency];
  const north = raw.on[0] ?? 'the north-star metric';
  const guard = raw.on[1] ?? 'the guardrail metric';
  const primary = PRIMARY[kit];
  const regulated = REGULATED.includes(domain);
  const baseText = low(raw.base.replace(/[.!?]$/, ''));
  const prodText = low(raw.prod.replace(/[.!?]$/, ''));

  const verdictOf = (a: AgentAlternative): AgentDecision['options'][number]['verdict'] => {
    if (a === primary) return 'chosen';
    switch (a) {
      case 'agentic-workflow': return agentic ? 'complement' : 'rejected';
      case 'rules-engine': return 'fallback';
      case 'deterministic-workflow': return 'complement';
      case 'human-in-the-loop': return hasHuman || regulated ? 'complement' : 'rejected';
      case 'llm-rag': return agentic ? 'complement' : 'rejected';
      case 'conventional-ml': return 'complement';
      case 'optimiser': return 'rejected';
    }
  };

  const reason = (a: AgentAlternative, v: string): string => {
    switch (a) {
      case 'rules-engine':
        return `Kept as the last rung of the degradation ladder: the baseline (${baseText}) is versioned, owned by the business and explainable to an auditor.`;
      case 'conventional-ml':
        return v === 'chosen'
          ? `The production model (${prodText}) decides: it is trained on labelled history, judged on "${raw.off[0] ?? 'the offline metric'}" and fits the ${budget ? `${budget} ms` : 'batch'} budget.`
          : 'Classifiers for routing, risk tier and redaction sit around the language model; they are cheap, testable and run before any generation.';
      case 'optimiser':
        return v === 'chosen'
          ? 'The decision is a constrained allocation: a solver guarantees feasibility and explains which constraints bind, which an agent cannot.'
          : 'There is no constrained allocation to solve inside this scope; a solver would add machinery without a decision to optimise.';
      case 'llm-rag':
        return v === 'chosen'
          ? 'The product is a grounded answer over documents: retrieval, re-ranking and citation checking are the architecture.'
          : v === 'complement'
            ? 'Used by the agents to search policy, runbooks and closed cases with citations; it is not part of the scoring path.'
            : 'No knowledge-intensive language task sits in the decision, so retrieval-augmented generation would add cost and a hallucination surface for nothing.';
      case 'deterministic-workflow':
        return v === 'chosen'
          ? 'Fixed steps with retries, SLAs and a reconciliation report.'
          : 'Orchestrates the pipeline with retries, ordering and an exception queue; every step is explicit and testable.';
      case 'human-in-the-loop':
        return v === 'complement'
          ? `Error consequences${regulated ? ` in ${DOMAIN_META[domain].name}` : ''} justify named accountability: reviewers work the uncertain band and a sampled audit.`
          : 'Errors here are low-cost and reversible at this volume, so a sampled audit is enough; routine per-decision review would cost more than it saves.';
      case 'agentic-workflow':
        return v === 'chosen'
          ? 'The task is multi-step: tool results decide the next step, which a fixed script cannot express. Autonomy is earned level by level.'
          : v === 'complement'
            ? `Only around the model: it investigates review-band cases, chases delayed labels and drafts change requests${budget ? `, and never sits in the ${budget} ms path` : ''}.`
            : `Rejected: ${WHY_NOT[no ?? 'batch-no-queue'](budget)}.`;
    }
  };

  const options = (Object.keys(APPROACH_START) as AgentAlternative[]).map((a) => {
    const verdict = verdictOf(a);
    return { approach: a, startWhen: APPROACH_START[a], verdict, reason: reason(a, verdict) };
  });

  const question = `Why is an agent better than a rules engine, a conventional model, an optimiser or a deterministic workflow for ${raw.title}?`;
  if (agentic)
    return {
      question,
      options,
      measurableValue: `Agents must beat a no-agent control on "${north}" without worsening "${guard}": analyst minutes per case, time to a matured label and precision of escalations, measured in four weeks of shadow before any autonomy.`,
      incrementalCost: `About ${(steps * 2400).toLocaleString('en-US')} tokens per task, plus a replay set, a verifier and a security review of every tool contract; the budget table below prices it.`,
      operationalRisk: 'Prompt injection through records, over-permissioned tools, unsupported claims and runaway loops: each has a control and an evaluation row below.',
      fallbackArchitecture: `Withdraw the agent layer and the system keeps working: the ${primary === 'agentic-workflow' ? 'workflow runs as a scripted pipeline with a human queue' : 'model still decides, people work the review queue and thresholds change by change request'}.`,
      revisitWhen: ['Evidence validity or analyst agreement falls below its gate for two consecutive weeks', 'A deterministic workflow reaches the same task success at lower cost', 'A tool the agents rely on changes its contract or permissions'],
    };
  const chosen = options.find((o) => o.verdict === 'chosen')!;
  return {
    question,
    options,
    measurableValue: `An agent would have to improve "${north}" over the ${chosen.approach.replace(/-/g, ' ')} design by more than its run cost, with "${guard}" unchanged. No lever of that kind exists in this scope today.`,
    incrementalCost: 'Avoided by this verdict: token spend, replay-set upkeep, a verifier, tool-permission reviews and an autonomy-governance process.',
    operationalRisk: 'None added. Residual risk sits in model drift and data quality, which the MLOps and operations sections cover.',
    fallbackArchitecture: `${chosen.approach === 'optimiser' ? 'A constraint-based solver with an independent plan checker, warm-started re-planning and a published explanation' : `${raw.prod.replace(/\.$/, '')} behind a deterministic ${latency === 'batch' ? 'orchestrated pipeline with reconciliation and an exception report' : 'serving path with a rules fallback and a sampled review'}`}; the baseline (${baseText}) is the last rung.`,
    revisitWhen: REVISIT[no ?? 'batch-no-queue'],
  };
}

function nonAgenticArchitecture(sync: Stage[], target: Stage | undefined, latency: LatencySLA, no: NoAgent) {
  const body = sync.slice(0, 5);
  const fast = latency === 'sub-10ms' || latency === 'sub-100ms';
  const lines = ['flowchart LR', `  IN(["${no === 'closed-loop' ? 'Request or auction event' : 'Input'}"])`];
  body.forEach((s, n) => lines.push(`  S${n}["${m(s.label, 30)}<br/>${m(s.tech, 30)}"]`));
  lines.push('  IN --> S0');
  body.forEach((_, n) => n < body.length - 1 && lines.push(`  S${n} --> S${n + 1}`));
  const last = `S${body.length - 1}`;
  lines.push(`  ${last} --> OUT(["${m(target?.label ?? 'Decision or output', 32)}"])`);
  lines.push('  CHK{"Rule or quality gate"}', `  ${last} --> CHK`, '  CHK -- pass --> OUT', `  CHK -- exception --> Q[("Exception queue<br/>${fast ? 'sampled review' : 'owner and SLA'}")]`, '  OUT -.-> LOG[("Decision and outcome log")]', '  Q -.-> LOG', '  LOG -. labels and outcomes .-> S0');
  lines.push('  classDef gate fill:#33121a,stroke:#fb7185,color:#ffe4e6', '  class CHK gate');
  return lines.join('\n');
}

function nonAgenticSequence(target: Stage | undefined, latency: LatencySLA) {
  return [
    'sequenceDiagram',
    '  autonumber',
    '  participant C as Caller or scheduler',
    '  participant P as Pipeline',
    '  participant M as Model or solver',
    `  participant R as ${m(target?.label ?? 'Rules and policy', 28)}`,
    '  participant Q as Exception queue',
    '  participant L as Decision log',
    '  C->>P: request or scheduled run',
    '  P->>M: features and inputs',
    '  M-->>P: score, plan or forecast',
    '  P->>R: apply policy from config',
    '  alt within policy',
    '    R-->>C: decision or output',
    '  else exception',
    `    R->>Q: ${latency === 'batch' ? 'owner and SLA' : 'sampled review'}`,
    '  end',
    '  R-->>L: decision with versions',
    '  Q-->>L: outcome and reason',
    '  Note over L,M: outcomes become labels, no agent sits anywhere in this path',
  ].join('\n');
}

export function generateAgentic(raw: RawUseCase, domain: Domain, paradigms: Paradigm[], latency: LatencySLA, difficulty: string, stages: Stage[]): Agentic {
  const picked = pickKit(raw, paradigms);
  // a language model in a sub-100ms path is a model call, not an agent loop: the agents work around it, asynchronously
  const fast = latency === 'sub-10ms' || latency === 'sub-100ms';
  const kit: KitId = fast && picked.startsWith('llm') ? 'nlp' : picked;
  const role = ROLES[kit];
  const guard = raw.on[1] ?? 'the guardrail metric';
  const north = raw.on[0] ?? 'the north-star metric';
  const sync = stages.filter((s) => !s.async);
  const readable = sync.filter((s) => s.kind !== 'ingest');
  const target = [...sync].reverse().find((s) => s.kind === 'rules') ?? sync[sync.length - 1];
  const asyncS = stages.filter((s) => s.async);
  const steps = difficulty === 'foundational' ? 4 : difficulty === 'staff-principal' ? 8 : 6;
  const hasHuman = stages.some((s) => s.kind === 'human');
  const no = agentVerdict(kit, latency, hasHuman);

  if (no) {
    const fit: Agentic['fit'] = no === 'closed-loop' ? 'not-applicable' : 'not-recommended';
    const decision = buildDecision({ raw, kit, fit, no, domain, latency, hasHuman, steps });
    const chosen = decision.options.find((o) => o.verdict === 'chosen')!;
    const reasonText = WHY_NOT[no](TOTAL_BUDGET_MS[latency]);
    const outNo: Agentic = {
      fit,
      role: `No agent: ${chosen.approach.replace(/-/g, ' ')} is the recommended architecture`,
      pattern: no === 'solver' ? 'Solver in the decision path, deterministic workflow around it' : no === 'closed-loop' ? 'Learning policy in a closed loop, no agent' : 'Model and rules in the path, deterministic workflow around them',
      rationale: `For ${raw.title}, ${reasonText}. ${sentence(raw.obj)} The better engineering answer is the plain design: ${low(raw.prod.replace(/[.!?]$/, ''))}, with the baseline (${low(raw.base.replace(/[.!?]$/, ''))}) as the fallback rung, an exception queue for the cases the rules cannot settle and a decision log that turns outcomes into labels. Section "Revisit when" lists what would change this answer.`,
      decision,
      agents: [],
      tools: [],
      autonomy: [],
      architecture: nonAgenticArchitecture(sync, target, latency, no),
      sequence: nonAgenticSequence(target, latency),
      context: [],
      guardrails: [],
      evaluation: [],
      failureModes: [],
      budget: [],
      buildSteps: [],
      whenNotToUse: [
        `Do not add an agent to this design for its own sake: ${reasonText}`,
        'Do not use an agent where a rule, a model score or a solver already makes the decision reliably and cheaply',
        'Do not introduce one without a measured gain over the deterministic workflow and a named owner for its tools and permissions',
      ],
    };
    const checkedNo = AgenticSchema.safeParse(outNo);
    if (!checkedNo.success) {
      const issues = checkedNo.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
      throw new Error(`${raw.file}:${raw.line} (${raw.key}): agentic section invalid\n${issues}`);
    }
    return checkedNo.data;
  }


  // typed tools: one read tool per synchronous stage, one gated write tool per human or sink stage, plus the generic ones
  const tools: Agentic['tools'] = [
    ...(readable.length >= 3 ? readable : sync).slice(0, 4).map((s) => ({ name: `read_${snake(s.label, 28)}`, access: 'read' as const, backedBy: `${s.label} (${s.tech})`, permission: 'Read-only, scoped to the case or entity under review, rate-limited' })),
    ...asyncS.slice(0, 2).map((s) => ({ name: `request_${snake(s.label, 26)}`, access: 'write' as const, backedBy: `${s.label} (${s.tech})`, permission: 'Write: creates a request only; a named approver must release it' })),
    { name: 'get_decision_log', access: 'read' as const, backedBy: 'Decision log and feature snapshots', permission: 'Read-only, redacted, audited' },
    { name: 'search_runbooks_and_policy', access: 'read' as const, backedBy: 'Runbooks, policy and past case notes', permission: 'Read-only retrieval with source and date' },
    { name: 'write_case_note', access: 'write' as const, backedBy: 'Case management', permission: 'Append-only note with the evidence it cites' },
  ];
  const seen = new Set<string>();
  const uniqueTools = tools.filter((t) => (seen.has(t.name) ? false : (seen.add(t.name), true)));
  const toolNames = uniqueTools.map((t) => t.name);

  const agents = role.agents.map((a, i) => ({
    ...a,
    tools: [...new Set([...a.tools, ...(i === 0 ? toolNames.slice(0, 2) : [])])].slice(0, 5),
  }));

  const latencyNote =
    latency === 'sub-10ms' || latency === 'sub-100ms'
      ? `The decision path runs in ${TOTAL_BUDGET_MS[latency]} ms, so agents are never in it: they work asynchronously on cases, alerts and feedback`
      : latency === 'seconds'
        ? `Interactive: an agent may sit in the path only inside the ${TOTAL_BUDGET_MS[latency]} ms interactive budget, with streaming and an early fallback; slower work runs asynchronously`
        : 'Batch: agents run as orchestrators inside the batch window, one exception at a time, and never block the run';

  const autonomy: Agentic['autonomy'] = [
    { level: 'L0', name: 'Observe', behaviour: 'Reads data and writes drafts or reports; takes no action and changes nothing', gate: 'Entry level: a replay set of at least 100 labelled cases exists and tool schemas are reviewed' },
    { level: 'L1', name: 'Suggest', behaviour: 'Proposes an action with its cited evidence; a human approves every action', gate: `Advance after 4 weeks in shadow with evidence validity of at least 99%, zero unsafe actions, and "${guard}" unchanged` },
    { level: 'L2', name: 'Act within limits', behaviour: 'Executes reversible, low-risk actions inside written limits; humans sample the results', gate: 'Advance after 8 weeks at L1 with analyst agreement of at least 95% and a sampled audit of 300 cases finding 0 missed true positives' },
    { level: 'L3', name: 'Orchestrate', behaviour: 'Runs a multi-step workflow end to end for one narrow case class, with an audit trail and an automatic stop', gate: 'Only for case classes that have run at L2 for at least 12 weeks; any unsafe action drops the class back to L1' },
  ];

  const edge = raw.edge.slice(0, 3);
  const failureModes = [
    ...edge.map((e) => ({ scenario: cap(e[0]!), response: `The agent must not improvise: it recognises the case, follows the documented mitigation (${low(e[2]!.trim().replace(/[.!?]$/, ''))}) and escalates with its evidence if it cannot` })),
    { scenario: 'A tool is down or returns a partial result', response: 'Retry once, then stop and escalate with the missing evidence listed; never fill the gap with a guess' },
    { scenario: 'The agent loops or exceeds its step budget', response: `Hard stop at ${steps} steps or the cost cap, hand off with the partial trace, and count it as a failed task in the evaluation` },
    { scenario: 'Text inside data tries to give the agent instructions', response: 'All tool output is data: strip instruction-like text, keep the tool allow-list fixed and flag the record for review' },
  ];

  const guardrails: Agentic['guardrails'] = [
    ...raw.con.slice(0, 3).map((c) => ({ risk: `Violating the constraint: ${c}`, control: 'Encode it as a check the agent cannot skip (a verifier or a tool-level limit), and test it on the replay set' })),
    { risk: 'Prompt injection through records, logs or documents', control: 'Treat all tool output as untrusted data, keep typed tools with narrow schemas, and test against planted instructions in every release' },
    { risk: 'Over-permissioned tools', control: 'Least privilege: read-only by default, write actions create requests that a named approver releases, and every call is audited' },
    { risk: 'Unsupported claims', control: 'A verifier checks that every statement cites an existing record that supports it; otherwise the agent abstains or escalates' },
    { risk: 'Runaway cost or loops', control: `A budget of ${steps} steps and a token cap per task, enforced outside the model` },
    { risk: 'Sensitive data exposure', control: DATA_RULE[domain] ?? 'Mask personal data in tool results and logs, and keep prompts free of identifiers the task does not need' },
  ];

  const evaluation: Agentic['evaluation'] = [
    { what: 'Task success on a held-out replay set', metric: 'Share of cases where the final disposition matches the expert one', target: 'At least 90% before L1 and at least 95% before L2', how: 'Replay frozen cases; never tune on them' },
    { what: 'Evidence validity', metric: 'Share of cited claims that point at a real record that supports them', target: 'At least 99%', how: 'Automatic check against the record store plus a weekly human sample' },
    { what: 'Safety', metric: 'Unsafe or unauthorised actions, and successful planted-instruction attacks', target: 'Exactly 0 in the replay set and in shadow', how: 'Planted-attack replay on every model, prompt or tool change' },
    { what: 'Honest escalation', metric: 'Cases with missing evidence that the agent decided anyway', target: '0, and escalation precision above 80%', how: 'Replay cases with tool outages and missing fields' },
    { what: 'Business effect', metric: `"${north}" with "${guard}" as a guardrail`, target: 'Better than the control group, guardrail not worse', how: 'Shadow, then a canary with a permanent control group' },
    { what: 'Cost and speed', metric: 'Steps, tokens and minutes per task', target: `At most ${steps} steps per task`, how: 'Trace statistics on the replay set and in production' },
  ];

  const budget: Agentic['budget'] = [
    { item: 'Step budget per task', value: `${steps} steps, each with at most one tool call` },
    { item: 'Token budget per task', value: `About ${(steps * 2400).toLocaleString('en-US')} tokens (roughly 2,000 in and 400 out per step); stop and escalate beyond twice that` },
    { item: 'Where the agent runs', value: latencyNote },
    { item: 'Human handoff', value: 'Every task ends in a decision record: auto-handled with its evidence, or escalated with the partial trace' },
    { item: 'Audit', value: 'Every prompt, tool call, result and decision is stored immutably with the case id and model version' },
  ];

  const buildSteps: Agentic['buildSteps'] = [
    { step: 'Write the tool contracts first', deliverable: `Typed schemas for ${toolNames.slice(0, 4).join(', ')} with permissions and rate limits, reviewed by security` },
    { step: 'Build the replay set', deliverable: 'At least 100 labelled cases, including tool outages, missing fields and planted instructions, split into tuning and held-out halves' },
    { step: `Build the first agent: ${agents[0]!.name.toLowerCase()}`, deliverable: 'A planner with a step budget that only reads, and a verifier that checks every cited claim' },
    { step: 'Add the approval path', deliverable: 'Write actions create requests; an approver queue releases them; every release is audited' },
    { step: 'Run in shadow', deliverable: `Four weeks of shadow on live cases, measuring agreement, evidence validity and "${guard}"` },
    { step: 'Climb the autonomy ladder', deliverable: 'Promote one case class at a time from L0 to L1 to L2 when its gate is met, and demote on any unsafe action' },
  ];

  const whenNotToUse = [
    latency === 'sub-10ms' || latency === 'sub-100ms'
      ? `Never put an agent in the ${TOTAL_BUDGET_MS[latency]} ms decision path: use the model and rules there and let agents work asynchronously`
      : 'Do not use an agent for a decision that a rule or a single model call can make reliably and cheaply',
    'Do not give an agent write access to anything irreversible without a named human approver',
    'Do not start without a replay set and a verifier: an agent you cannot evaluate is a demo, not a system',
    `Do not replace the baseline (${low(raw.base.replace(/\.$/, ''))}) with an agent; keep it as the fallback rung`,
  ];

  const tn = (i: number) => m(toolNames[i] ?? 'tool', 28);
  const architecture = [
    'flowchart LR',
    `  TRG(["${m(role.agents[0]!.trigger, 44)}"]) --> ORC["Orchestrator agent<br/>${m(agents[0]!.name, 30)}"]`,
    `  ORC --> T1["${tn(0)}<br/>read"]`,
    `  ORC --> T2["${tn(1)}<br/>read"]`,
    `  ORC --> T3["${tn(2)}<br/>read"]`,
    '  T1 --> VER{"Verifier<br/>every claim cited and supported?"}',
    '  T2 --> VER',
    '  T3 --> VER',
    '  VER -- yes --> ACT["Proposed action<br/>with cited evidence"]',
    '  VER -- no --> ESC(["Escalate with missing evidence"])',
    '  ACT --> APP{"Approval gate<br/>autonomy level L0-L3"}',
    `  APP -- approved --> SYS["${m(target?.label ?? 'Core system', 34)}<br/>${m(target?.tech ?? '', 34)}"]`,
    '  APP -- rejected --> LOG[("Decision and audit log")]',
    '  SYS --> LOG',
    '  ESC --> LOG',
    '  LOG -. outcomes and overrides .-> ORC',
    '  classDef agent fill:#1e1b3a,stroke:#818cf8,color:#e0e7ff',
    '  classDef guard fill:#33121a,stroke:#fb7185,color:#ffe4e6',
    '  class ORC agent',
    '  class VER,APP guard',
  ].join('\n');

  const sequence = [
    'sequenceDiagram',
    '  autonumber',
    '  participant U as Trigger',
    `  participant P as ${m(agents[0]!.name, 28)}`,
    '  participant T as Typed tools',
    '  participant V as Verifier',
    '  participant H as Human approver',
    `  participant S as ${m(target?.label ?? 'Core system', 28)}`,
    '  participant L as Audit log',
    `  U->>P: ${m(role.agents[0]!.trigger, 60)}`,
    '  P->>T: read-only calls within the step budget',
    '  T-->>P: results as untrusted data',
    '  P->>V: draft with cited evidence',
    '  alt every claim supported',
    '    V->>H: proposed action and evidence',
    '    H->>S: approve (L1) or auto within limits (L2)',
    '  else missing or unsupported',
    '    V-->>H: escalate with what is missing',
    '  end',
    '  S-->>L: outcome',
    '  H-->>L: decision and reason',
    '  Note over L,P: outcomes and overrides become labels and replay cases',
  ].join('\n');

  const out: Agentic = {
    fit: role.fit,
    role: role.role,
    pattern: role.pattern,
    decision: buildDecision({ raw, kit, fit: role.fit, no: null, domain, latency, hasHuman, steps }),
    rationale: `${role.why} For ${raw.title}: ${sentence(raw.obj)} ${DOMAIN_META[domain].short} constraints that shape the agents: ${raw.con.slice(0, 2).join('; ')}.`,
    agents,
    tools: uniqueTools,
    autonomy,
    architecture,
    sequence,
    context: role.context,
    guardrails,
    evaluation,
    failureModes,
    budget,
    buildSteps,
    whenNotToUse,
  };
  const checked = AgenticSchema.safeParse(out);
  if (!checked.success) {
    const issues = checked.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`${raw.file}:${raw.line} (${raw.key}): agentic section invalid\n${issues}`);
  }
  return checked.data;
}
