/**
 * Customer Implementation Playbook generator. Every blueprint gets one, derived from the blueprint's own fields (systems, data sources,
 * features, edge cases, API and event contracts, failure behaviour, requirements, operations, maturity) plus the domain's protocol
 * profiles. Ten blueprints also have an authored pack (`packs/`) that replaces the parts where hand-written, executable detail exists.
 *
 * Nothing here is invented customer fact: where the blueprint cannot know (a vendor, a hostname, a threshold) the playbook says "confirm",
 * names the owner who confirms it, and lists the evidence.
 */
import type { UseCase } from '../../schemas/usecase.schema';
import type { FdeStageId, Hop, ImplementationPlaybook, TestCase } from '../../schemas/implementation.schema';
import { snake } from '../design';
import { ADAPTER_BY_ID, ADAPTERS, adaptersFor, PACK_BY_SLUG } from './catalog';
import { DEPLOY_MODE_BY_ID, fill } from './deploy-modes';
import { DOD_CATEGORIES } from './dod';
import { PROTOCOL_PROFILES, type ProtocolProfile } from './domain-profiles';
import { mm } from './mm';
import { FDE_ESCALATION, FDE_INDEPENDENT, FDE_NEEDS_APPROVAL, FDE_RACI } from './raci';
import { rankScenarios } from './troubleshooting';
import { FDE_STAGES } from './workflow';
import { AUTHORED, type AuthoredPack } from './packs';

type PB = ImplementationPlaybook;

const strip = (s: string) => s.trim().replace(/[.;:]+$/, '');
const trunc = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…');
const kebab = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const first = <T>(a: T[] | undefined, d: T): T => (a && a.length ? a[0]! : d);
const uniq = <T>(a: T[]): T[] => [...new Set(a)];
const PORT: Record<string, string> = { postgres: '5432', sqlserver: '1433', oracle: '1521', kafka: '9093', rabbitmq: '5671', s3: '443', salesforce: '443', 'sap-odata': '443', servicenow: '443', dynamics365: '443', snowflake: '443', databricks: '443', 'idp-oidc': '443', 'hl7v2-mllp': '6661', 'fhir-r4': '443', zendesk: '443', 'wfm-roster': '443', 'reso-webapi': '443' };
const adapterLabel = (id: string) => ADAPTER_BY_ID[id]?.title ?? id;

/** A stage's id for a maturity item, by what it is about. */
function stageOf(text: string): FdeStageId {
  const t = text.toLowerCase();
  if (/identity|access|permission|privacy|security review|data contract|classification/.test(t)) return 'data-access';
  if (/integration|contract|openapi|asyncapi|event|schema|connector|external/.test(t)) return 'integration-discovery';
  if (/serving|deploy|infrastructure|migration|registry|feature store|online\/offline/.test(t)) return 'customer-deployment';
  if (/shadow|canary|ramp|rollout|traffic/.test(t)) return 'production-rollout';
  if (/approval|on-call|rollback|support owner|sign/.test(t)) return 'customer-acceptance';
  if (/repeat|your own data|baseline|validation/.test(t)) return 'local-development';
  return 'solution-configuration';
}

/** Content that is the same for every use case is generated here and added back by `hydrate`, so it is not stored 500 times. */
export const deployCommands = (svc: string, ns: string): PB['deployment']['commands'] => {
  const vars = { env: 'prod', release: svc, ns, service: svc, endpoint: `${svc}.example.internal`, registry: 'registry.example.internal', source_registry: 'ghcr.io/brainsiphon', image: svc, tag: '<tag>', digest: '<sha256>' };
  const k8s = DEPLOY_MODE_BY_ID['customer-kubernetes'];
  return { preflight: k8s.validateBeforeDeploy.map((c) => fill(c, vars)), deploy: k8s.deploy.map((c) => fill(c, vars)), verify: k8s.verify.map((c) => fill(c, vars)), rollback: k8s.rollback.map((c) => fill(c, vars)), cleanup: k8s.cleanup.map((c) => fill(c, vars)) };
};
export const sharedDeliverables = (): PB['deliverables'] => ({
  fde: FDE_STAGES.flatMap((st) => st.deliverables.slice(0, 2).map((d, i) => ({ id: `D-${st.n}${String.fromCharCode(97 + i)}`, title: d, stage: st.id, evidence: 'Attached in the workspace with its checksum' }))),
  customer: FDE_STAGES.flatMap((st) => st.customerDependencies.map((d, i) => ({ id: `C-${st.n}${String.fromCharCode(97 + i)}`, title: d, owner: d.match(/team|owner|IAM|security|legal|privacy|DBA|platform/i) ? d.split(' ').slice(0, 3).join(' ') : 'Customer sponsor', neededBy: st.id, blocks: `Blocks ${st.name.toLowerCase()}` }))),
});
export const sharedRaci = () => FDE_RACI.slice(0, 12).map((r) => ({ deliverable: r.deliverable, fde: r.fde, platform: r.platform, architect: r.architect, aiEngineer: r.aiEngineer, sre: r.sre, customer: r.customer }));

/** The persisted form omits the shared parts. */
export type PersistedPlaybook = Omit<PB, 'deliverables' | 'deployment' | 'ownership'> & { deployment: { note: string }; ownership: Pick<PB['ownership'], 'fdeOwns' | 'fdeSupports' | 'needsApproval'>; deliverables: { customerExtra: PB['deliverables']['customer'] } };
export function persist(pb: PB): PersistedPlaybook {
  const { deliverables, deployment, ownership, ...rest } = pb;
  const own = { fdeOwns: ownership.fdeOwns, fdeSupports: ownership.fdeSupports, needsApproval: ownership.needsApproval };
  // customer dependencies an authored pack added in front of the shared ones are kept; the shared ones are regenerated
  const sharedIds = new Set(sharedDeliverables().customer.map((c) => c.id));
  return { ...rest, deployment: { note: deployment.note }, ownership: own, deliverables: { customerExtra: deliverables.customer.filter((c) => !sharedIds.has(c.id)) } };
}
export function hydrate(p: PersistedPlaybook): PB {
  const [, tail] = p.slug.split('/') as [string, string];
  const svc = kebab(tail).slice(0, 40);
  return { ...p, deliverables: (() => { const d = sharedDeliverables(); return { fde: d.fde, customer: [...p.deliverables.customerExtra, ...d.customer] }; })(), deployment: { note: p.deployment.note, commands: deployCommands(svc, `${svc.slice(0, 24)}-prod`) }, ownership: { ...p.ownership, raci: sharedRaci(), independent: FDE_INDEPENDENT, escalation: FDE_ESCALATION } };
}

const hostFor = (name: string) => kebab(name).split('-').slice(0, 3).join('-') || 'system';

export function buildImplementationPlaybook(uc: UseCase): ImplementationPlaybook {
  const [, tail] = uc.slug.split('/') as [string, string];
  const mode = uc.systemDesign.mode as 'online' | 'interactive' | 'batch';
  const app = uc.enterpriseContext.application;
  const batch = mode === 'batch';
  const svc = kebab(tail).slice(0, 40);
  const ns = `${svc.slice(0, 24)}-prod`;
  const budget = first(uc.systemDesign.hld.components.filter((c) => c.latencyBudgetMs), null)?.latencyBudgetMs ?? null;
  const text = [uc.title, uc.problemFormulation.businessObjective, ...app.systemsOfRecord, ...app.upstream, ...app.downstream, ...uc.problemFormulation.constraints, uc.architectureBlueprint.productionModel].join(' ');
  const sla = batch ? 'the run window' : `${uc.latencySLA}`;
  const apiPath = uc.systemDesign.lld.apiContract.path;
  const features = uc.dataAndFeatures.highSignalFeatures;
  const edge = uc.productionEdgeCases;

  /* ------------------------------------------------------------------------------------------------ systems */
  const sysRow = (name: string, role: PB['systems'][number]['role'], need: 'core' | 'conditional' | 'optional', purpose: string): PB['systems'][number] => {
    const ads = adaptersFor(name);
    const alts = ads.slice(0, 3).map((a) => ({ name: adapterLabel(a), adapter: a }));
    return {
      role, name, purpose, need, adapter: ads[0],
      alternatives: alts.length ? alts : [{ name: 'The customer\'s own system of the same kind, through a config-driven REST or file connector', adapter: undefined }],
      customerOwner: first(uc.enterpriseContext.data.sources.map((s) => s.owner), 'The system owner'),
      ifNoAccess: `Run the matching mock (python3 -m fde_adapters mock …) or the use case's simulator and record the access request; do not wait for access to start the integration code.`,
    };
  };
  const systems: PB['systems'] = [
    ...app.systemsOfRecord.map((n, i) => sysRow(n, 'system-of-record', i < 2 ? 'core' : 'conditional', `System of record: the service reads context from it and never takes ownership of its state`)),
    ...app.upstream.map((n, i) => sysRow(n, 'source', i < 2 ? 'core' : 'conditional', `Where requests, events or signals arrive from`)),
    ...app.downstream.map((n, i) => sysRow(n, 'target', i < 2 ? 'core' : 'conditional', `Where decisions, cases or results go`)),
    sysRow('Enterprise identity provider (workforce and machine identity)', 'identity', 'core', 'People sign in through it; services authenticate with workload identity or client credentials'),
  ];

  /* ------------------------------------------------------------------------------------------------ hops */
  const mapRows = (n: number): PB['integrations'][number]['mappings'] => {
    const rows = features.slice(0, Math.max(n, 3)).map((f, i) => ({
      external: `${uc.enterpriseContext.data.sources[i % uc.enterpriseContext.data.sources.length]!.source} (${trunc(strip(f.formulaOrLogic), 70)})`,
      internal: snake(f.name),
      rule: `Point-in-time: ${trunc(strip(f.leakageRisk), 140)}`,
      example: undefined as string | undefined,
    }));
    return rows.length >= 2 ? rows : [...rows, { external: 'Source event id', internal: 'event_id', rule: 'Carried unchanged: it is the idempotency key', example: undefined }, { external: 'Source event time', internal: 'event_time', rule: 'UTC, event time not arrival time', example: undefined }];
  };
  const edgeTests = (hop: string, k: number): TestCase[] =>
    edge.slice(0, k).map((e, i) => ({ id: `${hop}-edge-${i + 1}`, title: e.scenario, layer: 'resilience' as const, given: `The hop is running normally`, when: `${strip(e.scenario)}: ${strip(e.failureMode)}`, then: strip(e.mitigationStrategy) }));
  const baseTests = (hop: string, name: string, ack: string): TestCase[] => [
    { id: `${hop}-c1`, title: `A valid message maps to the internal contract`, layer: 'contract', given: `A recorded or mocked ${name} message`, when: 'The connector transforms it', then: 'The output validates against the internal contract schema and every mapped field is populated', command: 'python3 -m fde_adapters contract --config <connector>.json' },
    { id: `${hop}-i1`, title: 'Replaying the same message has one effect', layer: 'integration', given: 'A message already processed', when: 'The same message is delivered again', then: 'The result is the stored one and no second effect occurs (the idempotency key matches)' },
    { id: `${hop}-r1`, title: 'A slow or failing dependency degrades safely', layer: 'resilience', given: 'The target system times out or answers 503', when: 'The connector calls it', then: `The retry budget is spent within the deadline, then ${ack}` },
    { id: `${hop}-s1`, title: 'The wrong or expired identity is refused', layer: 'security', given: 'A token for another audience, or an expired one', when: 'The hop is called', then: '401 for identity failures and 403 for permission failures, with no data returned' },
  ];
  const seq = (src: string, tgt: string, ack: string) =>
    `sequenceDiagram\n  participant S as ${mm(trunc(src, 34))}\n  participant C as Connector\n  participant I as ${mm(trunc(uc.title, 30))}\n  S->>C: external message\n  C->>C: authenticate, validate, map, assign the idempotency key\n  C->>I: internal contract (request or event)\n  I-->>C: ${mm(trunc(ack, 40))}\n  C-->>S: acknowledgement`;

  const hops: Hop[] = [];
  const profiles = PROTOCOL_PROFILES[uc.domain as keyof typeof PROTOCOL_PROFILES] ?? [];
  const chosen: ProtocolProfile[] = profiles.filter((p) => p.necessity === 'core' || (p.when && p.when.test(text))).slice(0, 4);
  for (const p of chosen) {
    const adapter = p.adapter.startsWith('custom') ? p.adapter : p.adapter;
    const id = `hop-${p.id}`;
    hops.push({
      id, name: p.name, necessity: p.necessity, direction: p.direction, purpose: `The ${p.name} connector is a separate integration with its own owner (${p.owner}), certification and failure modes: it is not mixed with the internal service call.`,
      external: { source: p.source, target: p.target, protocol: p.protocol, boundary: p.boundary, authentication: p.authentication, network: p.network },
      connector: {
        adapter,
        transformation: [`Decode the external format (${trunc(p.protocol, 60)}) and reject anything that does not parse, with the reason`, `Map fields to the internal contract using the mapping table below; unmapped values are reported, never dropped`, 'Normalise units, time zones (UTC event time) and identifiers to the canonical form', 'Attach provenance: source system, source message id, tenant and ingest time'],
        errorHandling: ['Malformed or unauthorised input: reject with a stable code and do not retry', 'Transient dependency failure: retry with backoff and jitter inside the deadline', 'Poison message: dead-letter with the reason and continue', ...uc.systemDesign.lld.failureAndRetry.slice(0, 2).map((f) => `${strip(f.failure)}: ${strip(f.behaviour)}`)],
        retry: 'Exponential backoff with full jitter, 3 attempts, honouring Retry-After, never past the caller\'s deadline; permanent errors are not retried',
        timeout: batch ? 'Per call 30 s; overall run deadline from the orchestrator' : budget ? `Within the ${budget} ms stage budget, and never beyond the caller's own timeout` : `Within the stage budget of the ${sla} SLA`,
        idempotency: `Key derived from the business identifiers of the message (never the clock); a repeated key returns the stored result. ${/Idempotency-Key/i.test(JSON.stringify(uc.systemDesign.lld.failureAndRetry)) ? 'The API accepts an Idempotency-Key header.' : ''}`.trim(),
      },
      contract: { name: `${tail}.${p.id}.v1`, request: `External message: ${p.example}`, response: `Acknowledgement: ${p.ack}`, event: 'The canonical event is defined once, in the internal contract hop of this playbook' },
      acknowledgement: { protocol: p.ack.split(' ')[0] ? p.ack : 'HTTP 2xx', example: p.example, expectedOutput: p.ack },
      mappings: mapRows(3),
      sequence: seq(p.source, p.target, p.ack),
      tests: [...baseTests(id, p.name, 'the documented fallback applies'), ...edgeTests(id, 2)],
      artifacts: [ADAPTER_BY_ID[adapter]?.module, ADAPTER_BY_ID[adapter]?.config].filter((x): x is string => Boolean(x)),
    });
  }
  // the internal service hop and the system-of-record hop, from the blueprint's own integration matrix
  const intHop = (i: number, id: string, name: string, necessity: 'core' | 'conditional', direction: Hop['direction'], srcSystem: string, tgtSystem: string): void => {
    const it = app.integration[i];
    if (!it) return;
    const ad = adaptersFor(`${srcSystem} ${tgtSystem}`)[0];
    hops.push({
      id, name, necessity, direction, purpose: `${strip(it.style)}.`,
      external: { source: srcSystem, target: tgtSystem, protocol: trunc(it.contract, 200), boundary: it.boundary, authentication: uc.enterpriseContext.security.identity, network: first(uc.enterpriseContext.security.trustBoundaries, 'Private network between the zones') },
      connector: {
        adapter: ad ?? 'custom: config-driven REST or file connector (fde-adapters/fde_adapters/core)',
        transformation: [`Terminate the external protocol at an anti-corruption layer`, ...mapRows(2).map((r) => `${r.external} -> ${r.internal}`), 'Validate the output against the internal contract before it leaves the connector'],
        errorHandling: [strip(it.onFailure), ...uc.systemDesign.lld.failureAndRetry.slice(0, 3).map((f) => `${strip(f.failure)}: ${strip(f.behaviour)}`)],
        retry: 'Exponential backoff with full jitter, 3 attempts, inside the deadline; permanent errors go to the dead-letter path',
        timeout: batch ? 'Per call 30 s; run deadline from the orchestrator' : budget ? `Within the ${budget} ms stage budget` : `Within the ${sla} SLA`,
        idempotency: 'Decision or event id travels end to end; the receiver stores the first outcome per id and replays it for duplicates',
      },
      contract: i === 1 ? { name: apiPath, request: uc.systemDesign.lld.apiContract.request, response: uc.systemDesign.lld.apiContract.response, event: uc.systemDesign.lld.eventSchema } : { name: `${tail}.${id}.v1`, request: `Request or event of this boundary: ${trunc(strip(it.contract), 200)}`, response: `Acknowledgement: ${trunc(strip(it.onFailure), 160)}`, event: 'The canonical event is defined once, in the internal contract hop of this playbook' },
      acknowledgement: { protocol: i === 0 ? 'Synchronous response inside the deadline' : 'Delivery acknowledgement with the decision id', example: uc.systemDesign.lld.apiContract.response.split('\n').slice(0, 4).join(' ').replace(/\s+/g, ' '), expectedOutput: `${uc.enterpriseContext.business.futureState.split('.')[0]}.` },
      mappings: mapRows(3),
      sequence: seq(srcSystem, tgtSystem, 'decision with reason codes'),
      tests: [...baseTests(id, name, 'the degradation ladder serves the baseline'), ...edgeTests(id, 2)],
      artifacts: [ad ? ADAPTER_BY_ID[ad]?.module : undefined, ad ? ADAPTER_BY_ID[ad]?.config : undefined].filter((x): x is string => Boolean(x)),
    });
  };
  if (!chosen.length) intHop(0, 'hop-inbound', `${first(app.upstream, 'Source')} to the service`, 'core', 'inbound', first(app.upstream, 'Source'), uc.title);
  intHop(1, 'hop-decision-out', `Decisions to ${first(app.downstream, 'the consumer')}`, 'core', 'outbound', uc.title, first(app.downstream, 'the consumer'));
  intHop(2, 'hop-system-of-record', `${first(app.systemsOfRecord, 'System of record')} to the feature pipelines`, 'core', 'inbound', first(app.systemsOfRecord, 'System of record'), 'Feature and data pipelines');
  intHop(3, 'hop-review', `${app.downstream[1] ?? 'Review tool'} and the service`, 'conditional', 'bidirectional', app.downstream[1] ?? 'Review tool', uc.title);
  while (hops.length < 3) intHop(0, `hop-extra-${hops.length}`, `Extra hop ${hops.length}`, 'conditional', 'inbound', first(app.upstream, 'Source'), uc.title);

  /* ------------------------------------------------------------------------------------------------ discovery */
  const D = (id: string, area: string, question: string, why: string, askWho: string, evidence: string) => ({ id, area, question, why, askWho, evidence });
  const own = first(uc.enterpriseContext.data.sources.map((s) => s.owner), 'The data owner');
  const discovery: PB['discovery'] = [
    ...uc.discovery.questions.map((q) => D(`Q-${q.id}`, 'Business', q.question, trunc(q.proposedAnswer, 360), q.confirmWith, q.evidence)),
    D('E-1', 'Environment', 'Where will this run: customer cloud (which), customer Kubernetes, on-premises, hybrid, air-gapped, or a managed service?', `The deployment mode changes registries, identity, network and the whole rollout. Blueprint hosting assumption: ${trunc(uc.enterpriseContext.technology.hosting, 160)}`, 'Customer platform and security architects', 'A deployment-mode decision signed by the customer security team'),
    D('E-2', 'Environment', 'Which network zones and boundaries sit between the service and each system, and which proxies, firewalls and TLS inspection apply?', 'Firewall and DNS changes have the longest lead time and block every later stage', 'Customer network team', 'Completed topology, firewall and proxy templates; filed change tickets'),
    D('E-3', 'Environment', 'Which identity provider authenticates people, and which mechanism authenticates services (client credentials, workload identity, mTLS)?', `Blueprint assumption: ${trunc(uc.enterpriseContext.security.identity, 160)}`, 'Customer IAM team', 'Identity template filled; a registered application and the denied-permission check'),
    D('E-4', 'Environment', 'Where do secrets live and who rotates them? Is there an HSM or a key boundary this use case must respect?', 'Secrets in files or images are a release blocker', 'Customer security', 'Secrets template; rotation rehearsal'),
    D('E-5', 'Environment', 'Which registries and package repositories may the environment use, and is there any internet access at all?', 'Decides the offline or mirrored install path', 'Customer platform team', 'Registry and mirror endpoints; the readiness report'),
    D('E-6', 'Environment', 'What is the change process for production: approvers, windows, evidence, lead time?', 'The release date follows the change calendar, not the code', 'Customer change manager', 'Change-process summary and the earliest window'),
    D('E-7', 'Environment', `Which data-residency and retention rules apply (${trunc(uc.governance.rationale, 100)})?`, 'Residency can rule out regions, managed services and third-party APIs', 'Privacy and legal', 'Residency template signed'),
    ...app.systemsOfRecord.slice(0, 3).map((n, i) => D(`I-S${i + 1}`, 'Integration', `Which product and version is "${n}", who owns its interface, and is there a sandbox?`, `The connector, authentication and contract depend on the exact product. Blueprint default: ${trunc(first(adaptersFor(n), 'a config-driven connector'), 60)}`, own, 'Interface documentation, a sandbox account and the version recorded in the connector registry')),
    ...app.upstream.slice(0, 3).map((n, i) => D(`I-U${i + 1}`, 'Integration', `How does "${n}" deliver data (protocol, format, volume, rate limits, retries, ordering) and who can change it?`, 'The inbound contract and the failure behaviour follow from it', first(uc.discovery.questions.map((q) => q.confirmWith), 'The source owner'), 'A sample message set, the specification and the rate-limit table')),
    ...app.downstream.slice(0, 2).map((n, i) => D(`I-D${i + 1}`, 'Integration', `What does "${n}" accept (API, file, queue), what acknowledgement does it send, and what must never be written automatically?`, 'The outbound contract, idempotency and the approval boundary follow from it', 'The consumer system owner', 'Interface specification and a test endpoint')),
    D('A-1', 'Approvals', 'Who approves each action that changes a customer system, and under what evidence?', 'Automation that changes customer systems needs a named approver and a way back', 'Business owner and security', 'An approval matrix signed by the decision owner'),
    D('A-2', 'Approvals', 'What must be true for go-live: who signs, with which evidence, and who can order a rollback?', 'A go/no-go without agreed evidence is an opinion', 'Product owner, SRE and risk', 'Gate checklist signed'),
  ];

  /* ------------------------------------------------------------------------------------------------ permissions, network, connectors */
  const permissions: PB['permissions'] = [
    ...systems.filter((s) => s.need === 'core' && s.role !== 'identity').slice(0, 5).map((s) => ({
      system: s.name,
      permission: s.role === 'target' ? 'Write of the decision record only (create and update one object type); no delete, no admin' : s.role === 'source' ? 'Read of the specific topic, queue, endpoint or scope this use case needs; no write' : 'Read-only on the named extract views or objects; no base tables with unmasked personal data',
      scope: s.role === 'target' ? 'One object, one environment, a dedicated service account' : 'The fields in the data contract, one environment',
      why: s.purpose, approver: `${s.customerOwner} and the customer security team`,
    })),
    { system: 'Enterprise identity provider', permission: 'An application registration with the client-credentials grant, the audience and the scopes of this service; workforce roles mapped from groups', scope: 'This service only', why: 'Machine and workforce identity are separate planes', approver: 'Customer IAM team' },
    { system: 'Cloud account or cluster', permission: 'Deployer role for one namespace or resource group, time-boxed, reviewed; no cluster-admin and no organisation-level rights', scope: 'The target namespace or resource group', why: 'Deploy through the customer\'s change process', approver: 'Customer platform owner' },
  ];
  const net: PB['network'] = [];
  const seen = new Set<string>();
  const addNet = (from: string, to: string, port: string, protocol: string, purpose: string) => {
    const k = `${from}|${to}|${port}`;
    if (seen.has(k)) return;
    seen.add(k);
    net.push({ id: `NET-${net.length + 1}`, from, to, port, protocol, purpose, change: 'Firewall or security-group rule with source, destination, port, protocol and a ticket' });
  };
  for (const s of systems.filter((x) => x.need === 'core')) {
    const ad = s.adapter ?? 'rest';
    addNet(s.role === 'target' || s.role === 'system-of-record' || s.role === 'identity' ? `${svc} workloads` : s.name, s.role === 'source' ? `${svc} gateway` : s.name, PORT[ad] ?? '443', s.role === 'identity' ? 'HTTPS (OIDC discovery, token, JWKS)' : 'TLS', trunc(s.purpose, 90));
  }
  addNet('Callers and operators', `${svc} gateway`, '443', 'HTTPS', 'Entry to the service');
  addNet(`${svc} workloads`, 'Private container registry', '443', 'HTTPS', 'Image pulls (mirrored by digest)');
  addNet(`${svc} workloads`, 'Telemetry backend', '4317', 'OTLP/gRPC', 'Traces and metrics');
  addNet('CI runner', 'Cluster API', '6443', 'HTTPS', 'Helm and kubectl deployment');

  const adIds = uniq([...hops.map((h) => ADAPTERS.find((a) => h.connector.adapter === a.id)?.id).filter((x): x is string => Boolean(x)), ...systems.map((s) => s.adapter).filter((x): x is string => Boolean(x))]).slice(0, 8);
  const connectors: PB['connectors'] = (adIds.length ? adIds : ['postgres', 'kafka']).map((id) => {
    const a = ADAPTER_BY_ID[id]!;
    return { adapter: id, role: a.title, config: a.config, mock: `${a.mock}: ${a.testedAgainst}` };
  });

  /* ------------------------------------------------------------------------------------------------ maturity */
  const pbk = uc.playbook;
  const states = pbk?.completion.states ?? [];
  const reachedIdx = states.findIndex((s) => s.status !== 'reached');
  const next = states[reachedIdx]?.state ?? 'production-ready';
  const maturityTasks: PB['maturity']['tasks'] = [];
  states.filter((s) => s.status !== 'reached').forEach((s) => {
    s.stillNeeded.forEach((n) => maturityTasks.push({ id: `MT-${maturityTasks.length + 1}`, title: trunc(strip(n), 110), detail: `Needed for "${s.state}": ${strip(s.meaning)}`, stage: stageOf(n), owner: /approval|sign|owner/i.test(n) ? 'shared' : 'fde', approval: /approval|security|privacy|risk|operations/i.test(n) ? 'Customer approver for the area named in the task' : undefined, evidence: trunc(strip(s.evidence), 140) }));
  });
  (pbk?.compatibility.dimensions ?? []).filter((d) => d.status !== 'match' && 'change' in d && d.change).slice(0, 6).forEach((d) => {
    maturityTasks.push({ id: `MT-${maturityTasks.length + 1}`, title: trunc(`Adapt the starter: ${strip(String((d as { change: string }).change))}`, 110), detail: `Blueprint needs ${trunc(strip(d.needs), 120)}; the starter provides ${trunc(strip(d.provides), 120)}`, stage: 'local-development', owner: 'fde', evidence: 'The modified starter and its passing tests' });
  });
  while (maturityTasks.length < 3) maturityTasks.push({ id: `MT-${maturityTasks.length + 1}`, title: ['Replace synthetic data with the customer\'s own and repeat the evaluation', 'Connect the serving path to the customer\'s real inputs behind a flag', 'Rehearse rollback and record who can order it'][maturityTasks.length]!, detail: 'Standard step to the next maturity state', stage: ['local-development', 'customer-deployment', 'customer-acceptance'][maturityTasks.length] as FdeStageId, owner: 'shared', evidence: 'The result attached to the workspace' });

  /* ------------------------------------------------------------------------------------------------ rollout, deployment, config */
  const guard = trunc(strip(first(uc.enterpriseContext.business.kpis, 'the primary KPI')), 80);
  const rollout: PB['rollout'] = {
    strategy: batch ? 'Parallel run, then a holdout group that keeps the old plan while the rest use the new one, widening by category or region' : 'Shadow first (score, log, change nothing), then a canary that grows only while the guardrails hold, with automatic rollback',
    stages: batch
      ? [{ stage: 'Parallel run', traffic: '0% acted on; published beside the current process', gate: 'Accuracy and bias tracked daily against the current process for 4 to 8 weeks', rollback: 'Nothing to roll back: no consumer depends on it' }, { stage: 'Pilot group', traffic: 'One category or region acts on it; buyers or planners still approve', gate: `${guard} not worse than the control group`, rollback: 'Point the group back at the previous feed' }, { stage: 'Widen', traffic: 'Next groups in order of expected benefit and data quality', gate: 'Same guardrails per wave', rollback: 'Per-group switch' }, { stage: 'Full', traffic: '100% with a standing holdout', gate: 'Operations accepted the service', rollback: 'Switch groups back; keep the old feed for a quarter' }]
      : [{ stage: 'Shadow', traffic: '0% acted on', gate: 'Scores, latency and errors match the offline expectation over a full business cycle', rollback: 'Stop the shadow consumer' }, { stage: 'Canary 1%', traffic: '1% acted on', gate: `Guardrails hold (${guard}; error rate; p99 inside the SLA)`, rollback: 'Traffic share to 0, automatic on a breach' }, { stage: 'Ramp 5% to 25%', traffic: '5%, 25%', gate: 'Stopping rules satisfied at each step', rollback: 'Previous model or the baseline serves' }, { stage: 'Ramp 50% to 100%', traffic: '50%, 100%', gate: 'No guardrail breach for the agreed period', rollback: 'Rehearsed rollback' }],
    fallback: `${first(uc.systemDesign.lld.degradationLadder.filter((l) => l.level >= 3).map((l) => `${l.trigger}: ${l.behaviour}`), strip(uc.enterpriseContext.application.coexistence))}`,
    reconciliation: ['Compare decisions with the outcomes the customer\'s systems recorded, daily, and explain every difference', `Track ${guard} against the baseline and report it monthly`, 'Review disagreements with the domain expert before each ramp step'],
  };
  const deployment: PB['deployment'] = {
    note: 'Default shown for customer-managed Kubernetes. The workspace generates the exact commands for the mode you choose (customer AWS, Azure, GCP, Kubernetes, on-premises, hybrid, air-gapped or managed SaaS).',
    commands: deployCommands(svc, ns),
  };
  const cfgKeys: PB['configuration']['keys'] = [
    { key: 'customer.name', description: 'Customer identifier used in the workspace, tags and reports', example: 'acme-bank', required: true },
    { key: 'deployment.mode', description: 'One of the eight deployment modes', example: 'customer-kubernetes', required: true },
    { key: 'deployment.namespace', description: 'Kubernetes namespace or resource group', example: ns, required: true },
    { key: 'registry.host', description: 'The customer\'s private registry', example: 'registry.example.internal', required: true },
    { key: 'identity.issuer', description: 'OIDC issuer exactly as the discovery document reports it', example: 'https://login.example.com/oauth2/default', required: true },
    { key: 'identity.audience', description: 'Audience registered for this service', example: `api://${svc}`, required: true },
    { key: 'secrets.backend', description: 'Where credentials live: vault, aws-sm, azure-kv, gcp-sm, k8s-kms', example: 'vault', required: true },
    ...systems.filter((s) => s.need === 'core' && s.role !== 'identity').slice(0, 4).map((s) => ({ key: `systems.${hostFor(s.name).replace(/-/g, '_')}.endpoint`, description: `Endpoint of ${trunc(s.name, 50)} (${s.adapter ?? 'connector'})`, example: `https://${hostFor(s.name)}.internal.example`, required: true })),
    { key: 'policy.thresholds', description: 'Decision thresholds and routing: set by the decision owner, recorded as an ADR', example: 'see the decision log', required: true },
  ];
  const preflight = {
    customer: '<customer>', environment: '<env>', use_case: uc.slug, timeout: 5, ca_file: '${CUSTOMER_CA_FILE:-/etc/ssl/certs/customer-root-ca.pem}',
    dns: net.slice(0, 4).map((n, i) => ({ name: `n${i + 1}`, host: `\${HOST_${i + 1}:-${hostFor(n.to)}.internal.example}` })),
    tcp: net.map((n, i) => ({ name: n.id.toLowerCase(), host: `\${HOST_${i + 1}:-${hostFor(n.to)}.internal.example}`, port: Number(n.port) || 443, purpose: trunc(n.purpose, 60) })),
    idp: [{ name: 'idp', issuer: '${OIDC_ISSUER}', require_grant_types: ['client_credentials'] }],
    egress_denied: [],
  };
  const files: PB['configuration']['files'] = [
    { path: 'customer-values.yaml', language: 'yaml', content: `# Helm overrides for ${uc.title}\nnameOverride: ${svc}\nnamespace: ${ns}\nimage:\n  repository: \${registry.host}/${svc}\n  tag: <tag>\ningress:\n  host: ${svc}.example.internal\nidentity:\n  issuer: \${identity.issuer}\n  audience: api://${svc}\nsecrets:\n  backend: vault\nsystems:\n${systems.filter((s) => s.need === 'core' && s.role !== 'identity').slice(0, 4).map((s) => `  ${hostFor(s.name).replace(/-/g, '_')}:\n    endpoint: https://${hostFor(s.name)}.internal.example\n    adapter: ${s.adapter ?? 'rest'}`).join('\n')}\npolicy:\n  thresholds: {}   # set by the decision owner, recorded as an ADR\n` },
    { path: `preflight.${svc}.json`, language: 'json', content: JSON.stringify(preflight, null, 2) },
    { path: '.env.customer.example', language: 'env', content: `# names only: values come from the secret store, never from this file\nOIDC_ISSUER=\nCUSTOMER_CA_FILE=\n${connectors.slice(0, 3).map((c) => `${c.adapter.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_ENDPOINT=`).join('\n')}\n` },
  ];

  /* ------------------------------------------------------------------------------------------------ tests, acceptance */
  const reqToCase = (r: UseCase['discovery']['requirements'][number]): TestCase => {
    const m = /given (.+?),? when (.+?),? then (.+)/i.exec(r.acceptance);
    return { id: `UAT-${r.id}`, title: trunc(strip(r.requirement), 100), layer: 'acceptance', given: m ? strip(m[1]!) : 'The system is deployed in the customer environment', when: m ? strip(m[2]!) : trunc(strip(r.requirement), 100), then: m ? strip(m[3]!) : strip(r.acceptance) };
  };
  const acceptanceTests = uc.discovery.requirements.slice(0, 6).map(reqToCase);
  const pack = PACK_BY_SLUG[uc.slug];
  const ref = pack ? pack.dir : 'reference-implementations/<family>';
  const testing: PB['testing'] = {
    suites: [
      { name: 'Contract tests per hop', covers: 'Every hop maps correctly, validates against the internal contract and handles malformed input', command: 'python3 -m fde_adapters contract --config <connector>.json' },
      { name: 'Adapter framework tests', covers: 'Retry, idempotency, mapping, error taxonomy and the mocks', command: 'cd fde-adapters && python3 -m pytest tests -q' },
      { name: pack ? 'Use-case pack tests' : 'Reference implementation', covers: pack ? pack.runs : 'The nearest runnable reference implementation for this solution family', command: pack ? `cd ${pack.dir} && python3 -m pytest tests -q` : 'cd reference-implementations/<family> && make setup && make demo' },
      { name: 'Pre-flight in the target environment', covers: 'DNS, TCP, TLS, identity, database, Kafka and service-account permissions from where the service will run', command: `python3 -m bs_preflight run --config preflight.${svc}.json --out readiness-report.json` },
      { name: 'Smoke test', covers: 'Liveness, readiness, a contract call and the latency budget', command: `bash deployment/smoke-test.sh https://${svc}.example.internal` },
    ],
    acceptance: acceptanceTests.length >= 3 ? acceptanceTests : [...acceptanceTests, ...baseTests('uat', 'business scenario', 'the agreed fallback applies').slice(0, 3 - acceptanceTests.length).map((t) => ({ ...t, layer: 'acceptance' as const }))],
  };

  const kpis = uc.enterpriseContext.business.kpis.map(strip);
  const num = /(\d+(?:\.\d+)?\s*(?:ms|%|s|seconds|minutes|hours?|M\b|k\b))/i;
  const cons = uc.problemFormulation.constraints.map(strip);
  const AC = (id: string, category: string, criterion: string, measure: string, threshold: string, evidence: string, owner: string) => ({ id, category, criterion, measure, threshold, evidence, owner });
  const dod = (id: string) => DOD_CATEGORIES.find((c) => c.id === id)!;
  const criteria: PB['acceptance']['criteria'] = [
    ...uc.discovery.requirements.slice(0, 3).map((r) => AC(`AC-REQ-${r.id}`, 'requirements', trunc(strip(r.requirement), 140), dod('requirements').measure, trunc(strip(r.acceptance), 160), 'UAT result and the traceability matrix', 'Product owner')),
    ...hops.filter((h) => h.necessity === 'core').slice(0, 3).map((h) => AC(`AC-INT-${h.id}`, 'integrations', `${h.name} works in the customer environment`, dod('integrations').measure, 'Contract, idempotency, failure and security tests pass', `Integration test report for ${h.id}`, 'Solution architect and the customer system owner')),
    AC('AC-DATA-1', 'data-access', 'Every source has an approval, a purpose and a least-privilege account', dod('data-access').measure, dod('data-access').threshold, 'Access approvals and the service-account check output', own),
    AC('AC-CON-1', 'data-contracts', 'Data contracts are signed and their quality assertions pass', dod('data-contracts').measure, dod('data-contracts').threshold, 'Signed contracts and the data-quality run', own),
    AC('AC-SEC-1', 'security', 'Security approved for the risk tier ' + uc.governance.riskTier, dod('security').measure, dod('security').threshold, 'Security sign-off and scan results', 'Security engineer'),
    AC('AC-DEP-1', 'deployment', 'Deployment verified: commit, image digest, configuration and model version recorded', dod('deployment').measure, `${dod('deployment').threshold}${budget ? `; p99 inside ${budget} ms per stage` : ''}`, 'Release evidence and the smoke test', 'SRE and platform engineer'),
    AC('AC-UAT-1', 'acceptance-tests', 'Business acceptance scenarios passed by the customer\'s users', dod('acceptance-tests').measure, dod('acceptance-tests').threshold, 'UAT sign-off', 'Product owner'),
    ...kpis.slice(0, 2).map((k, i) => AC(`AC-KPI-${i + 1}`, 'kpis', `${trunc(k, 100)} is measurable from production data`, dod('kpis').measure, `Baseline recorded; first reading reported${cons[i] && num.test(cons[i]!) ? `; constraint: ${trunc(cons[i]!, 90)}` : ''}`, 'KPI definition, baseline and first readout', first(uc.enterpriseContext.business.stakeholders.map((s) => s.who), 'Decision owner'))),
    AC('AC-OWN-1', 'ownership', 'Operations owns the service: owner, rota, runbooks, SLOs, credentials', dod('ownership').measure, dod('ownership').threshold, 'Handover pack and on-call schedule', 'Operations lead'),
    AC('AC-TRN-1', 'training', 'Customer users and operators are trained', dod('training').measure, dod('training').threshold, 'Attendance and assessment records', 'Business owner'),
  ];

  /* ------------------------------------------------------------------------------------------------ troubleshooting */
  const tags = { online: !batch, llm: uc.mlParadigms.includes('llm-agents'), gpu: /GPU|Triton|transformer|vision/i.test(uc.architectureBlueprint.productionModel), tenant: uc.systemDesign.topology.stance === 'tenant-isolated', streaming: /Kafka|stream|event/i.test(text), batch, partners: /partner|carrier|exchange|switch|PSP|vendor/i.test(text) };
  const scenarioIds = rankScenarios(tags).slice(0, 8);
  const specific: PB['troubleshooting']['specific'] = uc.operations.scenarios.slice(0, 4).map((s) => ({
    title: strip(s.failure), symptoms: [`Detected by: ${strip(s.detection)}`, `Alert: ${strip(s.alert)}`],
    diagnose: [`kubectl -n ${ns} logs deploy/${svc} --since=15m | head -50`, `Check the signal named above on the ${svc} dashboard, then the dependency it points at`, `python3 -m bs_preflight run --config preflight.${svc}.json --only tcp --only tls`],
    cause: `The conditions the blueprint lists for this failure: ${strip(s.detection)}. Confirm which dependency changed (deployment, certificate, quota, network rule or upstream release).`,
    fix: [strip(s.mitigation), strip(s.recovery)], verify: [`bash deployment/smoke-test.sh https://${svc}.example.internal`, strip(s.learning)],
  }));
  while (specific.length < 3) specific.push({ title: `Customer-side failure ${specific.length + 1}`, symptoms: ['Errors or delays reported by users'], diagnose: [`kubectl -n ${ns} get events --sort-by=.lastTimestamp | tail`], cause: 'Check recent changes on the customer side', fix: ['Roll back the last change'], verify: ['Smoke test passes'] });

  /* ------------------------------------------------------------------------------------------------ deliverables, checklist */
  const CL = (id: string, stage: FdeStageId, item: string, owner: 'fde' | 'customer' | 'shared', approval = false) => ({ id, stage, item, owner, approval });
  const checklist: PB['checklist'] = [
    CL('CL-1', 'customer-discovery', 'Decision owner and sponsor named', 'customer'),
    CL('CL-2', 'customer-discovery', 'Every discovery question has a confirmed answer or an owned risk', 'shared'),
    CL('CL-3', 'customer-discovery', 'Customer systems map and alternatives signed', 'shared', true),
    CL('CL-4', 'environment-discovery', 'Thirteen environment templates completed', 'shared'),
    CL('CL-5', 'environment-discovery', `Readiness report generated (preflight.${svc}.json) and attached`, 'fde'),
    ...net.slice(0, 5).map((n, i) => CL(`CL-N${i + 1}`, 'environment-discovery', `Firewall/DNS request: ${n.from} to ${n.to} on ${n.port}`, 'customer', true)),
    CL('CL-6', 'environment-discovery', 'Deployment mode agreed with the customer security team', 'shared', true),
    ...systems.filter((s) => s.need === 'core').slice(0, 4).map((s, i) => CL(`CL-S${i + 1}`, 'integration-discovery', `Interface specification and sandbox for ${trunc(s.name, 60)} (${s.adapter ?? 'connector'})`, 'customer')),
    CL('CL-7', 'integration-discovery', 'Each core hop specified in four layers and reviewed by the system owner', 'fde'),
    CL('CL-8', 'data-access', 'Service accounts created with least privilege; denied-permission checks pass', 'shared', true),
    CL('CL-9', 'data-access', 'Data contracts signed; privacy assessment complete', 'customer', true),
    CL('CL-10', 'solution-configuration', 'Thresholds and policies recorded as ADRs with the decision owner', 'shared', true),
    CL('CL-11', 'local-development', 'All hop contract tests pass against mocks; replay on sample data reviewed', 'fde'),
    CL('CL-12', 'customer-deployment', 'Images and packages mirrored into the customer registries', 'shared'),
    CL('CL-13', 'customer-deployment', 'Infrastructure plan, policy checks and permissions validated before apply', 'fde'),
    CL('CL-14', 'customer-deployment', 'Change approved; deployed; smoke test passes; rollback rehearsed', 'shared', true),
    CL('CL-15', 'integration-testing', 'Integration tests pass in the customer environment, including failure injection', 'fde'),
    CL('CL-16', 'uat', 'Business acceptance scenarios passed by users; defects owned', 'customer'),
    CL('CL-17', 'production-rollout', 'Go/no-go recorded; shadow, canary and ramp logged', 'shared', true),
    CL('CL-18', 'customer-acceptance', 'Acceptance report generated from evidence and signed; handover pack accepted', 'shared', true),
    CL('CL-19', 'day-two-support', 'Escalation paths published; first monthly review scheduled', 'shared'),
  ];

  /* ------------------------------------------------------------------------------------------------ localDev, ownership, identity */
  const localDev: PB['localDev'] = {
    prerequisites: ['Python 3.9 or later (3.13 tested) and Git; no package index needed for the framework or the toolkit', 'Docker only if you run the reference implementation or a database locally', 'The use-case pack or reference implementation checked out'],
    steps: [
      { title: 'Validate the generated pre-flight configuration', command: `python3 -m bs_preflight validate-config --config preflight.${svc}.json`, expect: 'preflight.json: valid, N check(s) configured' },
      { title: 'Health-check each connector against its mock', command: `python3 -m fde_adapters check --config ${first(connectors.map((c) => c.config), 'fde-adapters/configs/postgres.connector.json')} --mock`, expect: '"healthy": true and sample mapped records' },
      { title: pack ? 'Run the use-case pack tests' : 'Run the nearest reference implementation', command: pack ? `cd ${pack.dir} && python3 -m pytest tests -q` : 'cd reference-implementations/<family> && make setup && make demo', expect: pack ? `${pack.tests} passed` : 'The demo completes and its verification passes' },
      { title: 'Run the contract battery for a connector', command: 'python3 -m fde_adapters contract --config <connector>.json', expect: 'All checks PASS' },
      { title: 'Serve a vendor-shaped mock while the customer grants access', command: 'python3 -m fde_adapters mock <system>', expect: 'A local base URL to point the connector at' },
    ],
  };
  const idNotes = [`Workforce: ${trunc(uc.enterpriseContext.security.identity, 180)}`, 'Machine: one service identity per integration, scoped to that integration, rotated on a schedule, never shared with a person', 'Partners, devices and external systems each have their own credential and lifecycle, independent of employee SSO'];
  const identity: PB['identity'] = { workforce: 'OIDC single sign-on with multi-factor authentication; roles mapped from groups; approval and override actions attributable to a person', machine: 'OAuth2 client credentials, workload identity or mutual TLS with a service account per integration', partner: tags.partners ? 'External partners (switches, carriers, exchanges, vendors) authenticate with their own certificate or key, allow-listed sources and an independent rotation plan' : undefined, notes: idNotes };

  const raci = sharedRaci();
  const base: PB = {
    version: 1, slug: uc.slug, title: uc.title, domain: uc.domain, pattern: uc.pattern, mode,
    provenance: { kind: 'derived', note: 'Derived from this blueprint\'s own systems, data sources, features, edge cases, contracts, requirements and maturity, plus the domain\'s protocol profiles. Hostnames, versions and thresholds are marked "confirm": they are the customer\'s facts, not the blueprint\'s.', packDir: pack?.dir },
    summary: `Take ${uc.title} into a customer environment: ${systems.filter((s) => s.need === 'core').length} core systems, ${hops.filter((h) => h.necessity === 'core').length} core integration hops (${hops.length} in all), ${batch ? 'a batch path' : `a ${uc.latencySLA} online path`}, risk tier ${uc.governance.riskTier}. The FDE owns discovery, integration, deployment, acceptance and adoption; the decision owner owns thresholds and policy.`,
    ownership: {
      fdeOwns: ['Customer-environment discovery, the readiness report and every access, firewall and identity request', `The integration hops: ${hops.slice(0, 4).map((h) => h.name).join('; ')}`, 'Connector configuration, data mappings and the contract tests', 'Deployment into the customer environment through their change process, and the rollback rehearsal', 'Integration testing, UAT facilitation, the acceptance report and the handover pack', 'User training, adoption tracking and customer-side incident coordination'],
      fdeSupports: ['Model and prompt behaviour (AI engineer)', 'Landing zone, cluster, network and identity foundations (platform engineer)', 'Integration architecture decisions (solution architect)', 'Production incident response and recovery (SRE)'],
      raci, independent: FDE_INDEPENDENT, needsApproval: FDE_NEEDS_APPROVAL, escalation: FDE_ESCALATION,
    },
    maturity: { reached: pbk ? pbk.completion.reached : 'prototype-ready', verdict: pbk?.compatibility.verdict ?? 'none', next, tasks: maturityTasks },
    discovery, systems, integrations: hops, identity, permissions, network: net, connectors, localDev,
    configuration: { files, keys: cfgKeys }, testing, rollout, deployment,
    troubleshooting: { scenarioIds, specific },
    deliverables: sharedDeliverables(),
    acceptance: { criteria, handover: ['Architecture as deployed, with the infrastructure inventory from the Terraform state or cloud APIs', 'Deployed commit, image digest, configuration version and model version', `Service owner, on-call rota and escalation path (${trunc(uc.enterpriseContext.operating.supportModel, 120)})`, `SLOs and the dashboards that show them (${uc.operations.slos.slice(0, 2).map((s) => s.sli).join(', ')})`, 'Runbooks for the ten failure scenarios and the customer-specific troubleshooting entries', 'Credential and secret transfer record, with the rotation schedule', 'Rollback procedure and the record of its rehearsal', 'Test evidence, monitoring links, recovery-test results and the customer approvals', 'Training evidence for users and operators'] },
    checklist,
  };
  const authored = AUTHORED[uc.slug];
  return authored ? applyAuthored(base, authored, ref) : base;
}

/** Authored packs replace the derived parts where hand-written, executable detail exists; extra rows are added to the others. */
export function applyAuthored(base: PB, a: AuthoredPack, packDir: string): PB {
  const out: PB = { ...base };
  out.provenance = { kind: 'authored', note: a.note, packDir };
  if (a.summary) out.summary = a.summary;
  if (a.systems) out.systems = a.systems;
  if (a.integrations) out.integrations = a.integrations;
  if (a.identity) out.identity = a.identity;
  if (a.permissions) out.permissions = a.permissions;
  if (a.network) out.network = a.network;
  if (a.connectors) out.connectors = a.connectors;
  if (a.localDev) out.localDev = a.localDev;
  if (a.rollout) out.rollout = a.rollout;
  if (a.discovery) out.discovery = [...a.discovery, ...base.discovery];
  if (a.troubleshooting) out.troubleshooting = { ...base.troubleshooting, specific: [...a.troubleshooting, ...base.troubleshooting.specific] };
  if (a.criteria) out.acceptance = { ...base.acceptance, criteria: [...a.criteria, ...base.acceptance.criteria] };
  if (a.needsApproval) out.ownership = { ...base.ownership, needsApproval: [...a.needsApproval, ...base.ownership.needsApproval] };
  if (a.customerDependencies) out.deliverables = { ...base.deliverables, customer: [...a.customerDependencies, ...base.deliverables.customer] };
  if (a.testing) out.testing = { ...base.testing, suites: [...a.testing, ...base.testing.suites] };
  return out;
}
