/**
 * Level 2 of the pattern hierarchy: enterprise architecture patterns, "how the solution is assembled".
 *
 *   L1  AI/ML archetypes              how the intelligence is implemented (tabular, graph, RAG, agent ...)   /patterns/<id>
 *   L2  Enterprise architecture       how the solution is assembled (event-driven AI, online inference ...)  /patterns#enterprise-patterns
 *   L3  Engineering primitives        reusable mechanisms inside the architecture (CDC, PIT joins, shedding)  /patterns/primitives/<id>
 *
 * An architect picks an L2 pattern first, then the L1 archetype it serves, then the L3 mechanisms it needs.
 * Client-safe plain data.
 */
export interface ArchitecturePattern {
  id: string;
  title: string;
  summary: string;
  useWhen: string;
  tradeoff: string;
  /** L1 archetypes that typically sit inside it */
  archetypes: string[];
  /** L3 primitives that make it work */
  primitives: string[];
}

export const ARCHITECTURE_PATTERNS: ArchitecturePattern[] = [
  {
    id: 'online-inference',
    title: 'Online inference service',
    summary: 'A synchronous, deadline-propagating decision path with a stale-tolerant feature store, a degradation ladder and a decision ledger.',
    useWhen: 'A caller is waiting (authorisation, ranking, bidding, alerting) and the p99 is a contract.',
    tradeoff: 'Every hop spends budget and every dependency needs a fallback; accuracy is bought only where the latency envelope allows.',
    archetypes: ['tabular', 'recommender', 'graph', 'bandit'],
    primitives: ['compound-cascade', 'adaptive-concurrency-shedding', 'point-in-time-feature-joins', 'wal-decision-ledger'],
  },
  {
    id: 'event-driven-ai',
    title: 'Event-driven AI',
    summary: 'Decisions and outcomes flow as events through a durable log; consumers score, enrich and learn without coupling to the source system.',
    useWhen: 'Several consumers need the same signal, the system of record must stay authoritative, or labels arrive late.',
    tradeoff: 'Eventual consistency and replay discipline: idempotent consumers, schema governance and dead-letter handling are mandatory.',
    archetypes: ['anomaly', 'tabular', 'graph'],
    primitives: ['outbox-cdc', 'schema-evolution-dlq', 'delayed-label-attribution', 'data-contract-quality-sla'],
  },
  {
    id: 'batch-scoring',
    title: 'Batch scoring and planning pipeline',
    summary: 'Scheduled, idempotent runs over immutable partitions with atomic publish, reconciled outputs and a bounded run window.',
    useWhen: 'Decisions are consumed by planners or downstream systems on a cadence, not by a waiting caller.',
    tradeoff: 'Freshness is bounded by the schedule; a failed run must be re-runnable without double effects.',
    archetypes: ['forecast', 'optimize', 'tabular'],
    primitives: ['backfill-isolation', 'schema-evolution-dlq', 'data-contract-quality-sla'],
  },
  {
    id: 'human-in-the-loop',
    title: 'Human-in-the-loop decisioning',
    summary: 'The model handles the clear cases, an uncertain band goes to a review queue with evidence, and every human decision becomes a labelled outcome.',
    useWhen: 'Consequences are costly or regulated, or labels only exist because a person decided.',
    tradeoff: 'Reviewer capacity is a hard constraint; thresholds, hysteresis and queue SLAs matter as much as the model.',
    archetypes: ['tabular', 'nlp', 'cv', 'llm-agent'],
    primitives: ['three-action-decision', 'alert-hysteresis', 'plan-preview-commit'],
  },
  {
    id: 'multi-tenant-ai',
    title: 'Multi-tenant AI platform',
    summary: 'A shared stateless inference plane with tenant-scoped data, keys, adapters, quotas and cells.',
    useWhen: 'One platform serves many customers whose data, limits and compliance obligations differ.',
    tradeoff: 'Noisy-neighbour control and per-tenant sparsity: small tenants need a pooled model plus a tenant adapter.',
    archetypes: ['llm-rag', 'llm-agent', 'nlp'],
    primitives: ['tenant-isolation', 'permission-aware-retrieval', 'obo-token-exchange'],
  },
  {
    id: 'llm-gateway-rag-platform',
    title: 'LLM gateway and RAG platform',
    summary: 'One governed entry point for model access (routing, quotas, fallbacks, caching, redaction) in front of a shared retrieval and evaluation stack.',
    useWhen: 'More than one application uses language models, or provider choice and cost must stay changeable.',
    tradeoff: 'A shared choke point needs its own SLOs and security model; it also centralises logging of sensitive prompts.',
    archetypes: ['llm-rag', 'llm-agent', 'nlp'],
    primitives: ['spotlighting-policy-engine', 'permission-aware-retrieval', 'shadow-canary-mirroring'],
  },
  {
    id: 'residency-pinned-state',
    title: 'Jurisdiction-pinned state with a stateless inference plane',
    summary: 'Inference is active-active everywhere; regulated state is pinned to the data subject’s jurisdiction with a synchronous in-country standby.',
    useWhen: 'Law or contract fixes where data may live, but the decision still needs global availability.',
    tradeoff: 'Failover of the state plane needs fencing and rehearsal; cross-border calls carry tokens and derived features only.',
    archetypes: ['tabular', 'graph', 'nlp'],
    primitives: ['residency-pinned-state', 'wal-decision-ledger', 'outbox-cdc'],
  },
  {
    id: 'strangler-coexistence',
    title: 'Strangler and anti-corruption coexistence',
    summary: 'Shadow the legacy decision path, translate its protocols at an anti-corruption layer and move traffic over as guardrails hold.',
    useWhen: 'The AI service must live beside a core system that cannot change on your schedule.',
    tradeoff: 'Two paths to run and reconcile for longer than anyone wants; the legacy path is also the fallback.',
    archetypes: ['tabular', 'forecast', 'optimize'],
    primitives: ['shadow-canary-mirroring', 'outbox-cdc', 'schema-evolution-dlq'],
  },
  {
    id: 'enterprise-agent-control-plane',
    title: 'Enterprise agent control plane',
    summary:
      'A governed orchestration and policy fabric for autonomous AI agents with typed tool registries, OBO workload identity, policy guardrails, human approvals, and replayable execution ledgers.',
    useWhen:
      'AI agents execute multi-step workflows, call external APIs, inspect or modify production systems, or require enterprise auditability.',
    tradeoff:
      'Agent autonomy is bounded by explicit tool permissions and approval latency; state machine checkpointing requires durable storage.',
    archetypes: ['llm-agent', 'llm-rag', 'nlp'],
    primitives: [
      'plan-preview-commit',
      'spotlighting-policy-engine',
      'wal-decision-ledger',
      'obo-token-exchange',
    ],
  },
];
