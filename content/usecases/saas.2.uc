# SaaS & Developer Platforms, part 2 (use cases 30-50)
== enterprise-search-relevance | Enterprise Search Relevance | nlp,recommender | sub-100ms | advanced | a=5 k=4
obj: Return the right documents and answers across connected apps (drive, chat, wiki, tickets) respecting each user's permissions.
loss: \mathcal{L}=\mathrm{ListNet}(s,y)+\lambda\,\mathrm{InfoNCE}(q,d^+)
con: Permission-aware retrieval ; Heterogeneous sources ; Freshness within minutes ; Tenant isolation
sn: Permissions | ACL filtering at retrieval time | Post-filtering results | Post-filtering leaks existence and wastes top-k slots
sn: Signals | Behavioural click and share signals per tenant | Global popularity | Each company's relevance differs
sig: Hybrid lexical-semantic score | BM25 plus dense similarity | Relevance | Fusion
sig: Document freshness and activity | recent edits and views | Currency | Metadata
sig: Personal and team affinity | user's team's interactions | Personalisation | Privacy
noise: Document length | weak
noise: File type alone | weak
base: Keyword search per connector.
prod: ACL-aware hybrid retrieval with learning-to-rank on tenant-specific implicit feedback and freshness-aware indexing.
pipe: Query @ search API ; Query understanding @ intent and entities ; ACL-aware hybrid retrieval @ vector plus BM25 ; Learning-to-rank @ LambdaMART ; Result assembly @ snippets ; UI @ app ; Click feedback @ events
edge: Permission change not yet propagated | user sees documents they should not | Fast ACL sync and result-time permission checks
edge: New connector floods low-quality content | relevance drops | Source quality priors and tenant controls
off: NDCG on tenant query logs and judgments ; Permission-leak rate
on: Search success rate ; Time to find
gap: Training on click logs with position bias ; Ignoring permission checks in evaluation

== document-workflow-classification-extraction | Document Workflow Classification & Extraction | nlp,computer-vision | seconds | advanced | a=0.3 k=300
obj: Classify and extract fields from uploaded documents (contracts, forms, invoices) to automate customer workflows.
loss: \mathcal{L}=\mathrm{CE}_{\text{class}}+\lambda\,\mathrm{CE}_{\text{fields}}
con: Per-tenant document types ; Few-shot onboarding ; Confidence and review loop ; Data isolation
sn: Onboarding | Few-shot adaptation per tenant | Retrain a model per customer | Per-customer training doesn't scale
sn: Review | Human-in-the-loop on low confidence | Fully automatic | Silent extraction errors break downstream workflows
sig: Field confidence margin | calibrated per-field confidence | Routing | Calibration
sig: Layout similarity to exemplars | embedding of page layout | Template match | Exemplar set
sig: Validation rule pass | business rules on fields | Correctness | Rule library
noise: File name | none
noise: Upload time | none
base: Template-based extraction per document type.
prod: Layout-aware document model with few-shot adapters per tenant, validation rules and review UI feeding active learning.
pipe: Upload @ app ; OCR and layout @ document AI ; Classifier and extractor @ LayoutLM with adapters ; Validation rules @ business logic ; Review UI @ human ; Workflow trigger @ automation ; Corrections @ active learning
edge: Customer changes their form template | extraction breaks silently | Template-drift detectors and automatic review spikes
edge: Cross-tenant data mixing in adapters | adapters trained on one tenant leak patterns to another, causing a privacy breach | Strict per-tenant adapter isolation and audits
off: Field-level accuracy ; Automation rate at target accuracy
on: Straight-through processing rate ; Correction rate
gap: Test documents from the same templates as training ; Counting extractions as correct without validation

== email-assistant-auto-reply | Email Assistant & Smart Replies | nlp,llm-agents | seconds | foundational | a=3 k=5 s=2 t=200
obj: Draft replies that match the user's tone and context, and triage inbox priorities, with the user always approving sends.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{thread,style})
con: Never auto-send sensitive content ; Personal style adaptation ; Privacy of email ; Latency under 2 s
sn: Control | Draft-and-approve | Auto-send | Wrong auto-sent emails are unrecoverable
sn: Style | Personalise from the user's sent mail with privacy | Generic tone | Generic tone feels off and is rarely sent
sig: Draft acceptance rate | drafts sent with few edits | Quality | Logging
sig: Thread context completeness | referenced entities resolved | Accuracy | Retrieval
sig: Priority score | importance prediction | Triage | Feedback
noise: Email length | weak
noise: Sender domain popularity | weak
base: Canned quick replies.
prod: LLM drafting with thread and calendar context, style adapters learned on-device or per-user securely, and a priority ranker.
pipe: Inbox event @ mail service ; Context retriever @ thread calendar docs ; Draft LLM @ personalised ; Safety filter @ policy ; Draft UI @ client ; User edit and send @ human ; Feedback @ personalisation
edge: Draft invents a commitment or date | user sends a false promise | Highlight proposed commitments and require confirmation
edge: Confidential thread content leaks to another thread | context from a confidential thread appears in a draft for another thread and leaks private details | Strict thread-scoped context and tests
off: Edit distance and acceptance ; Priority ranking AUC
on: Time spent on email ; Drafts sent
gap: Evaluating on generic emails ; Ignoring commitment hallucinations

== meeting-notes-and-action-items | Meeting Notes & Action-Item Extraction | nlp,llm-agents | seconds | foundational | a=1 k=300 s=3 t=350
obj: Turn meeting recordings into accurate notes, decisions and owned action items that sync to task tools.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{transcript})+\lambda\,\mathrm{OwnerError}
con: Consent and recording rules ; Speaker attribution ; Action item precision ; Multilingual
sn: Attribution | Correct owner and deadline extraction | Generic summary | Actions with wrong owners are worse than none
sn: Faithfulness | Span-grounded notes | Fluent summaries | Hallucinated decisions mislead teams
sig: Owner-resolution accuracy | correct person for each action | Utility | Diarisation
sig: Decision detection | decision statements | Notes | Classifier
sig: Span support rate | notes with transcript support | Faithfulness | Alignment
noise: Small talk | not content
noise: Meeting length | weak
base: Manual note-taking.
prod: Diarised transcript, structured extraction with span evidence, owner resolution against participant lists and task sync with confirmation.
pipe: Meeting audio @ conferencing ; ASR and diarisation @ speech model ; Extraction LLM @ structured ; Owner resolver @ directory match ; Span verifier @ alignment ; Participants confirm @ human ; Task sync @ project tool
edge: Two participants share a first name | action assigned to the wrong person | Directory-based disambiguation and confirmation
edge: Cross-talk and poor audio | missed decisions | Quality flags and low-confidence markers
off: Action-item precision and recall ; Faithfulness rate
on: Action completion rate ; Time to publish notes
gap: Evaluating summaries not actions ; Clean-audio test meetings

== behavioral-cohort-segmentation | Behavioural Cohorts & User Segmentation | tabular,time-series | batch | foundational | a=1 k=3
obj: Discover behaviour-based user cohorts that predict retention and expansion to drive lifecycle messaging and product decisions.
loss: \mathcal{L}=\mathrm{ReconstructionLoss}(z)+\lambda\,\mathrm{ClusterLoss}
con: Stable segments ; Explainable definitions ; Privacy ; Usable in marketing tools
sn: Validity | Segments validated on outcome separation | Silhouette score | Internal metrics don't show business value
sn: Stability | Soft assignment and versioning | Re-cluster weekly | Segments reshuffle and break campaigns
sig: Feature-usage embedding | sequence embedding of actions | Behaviour | Window
sig: Frequency and recency profile | usage cadence | Engagement | Window
sig: Collaboration breadth | teammates active | Network | Org graph
noise: Signup date | cohort artefact
noise: User ID | none
base: RFM segments and manual cohorts.
prod: Sequence-embedding clustering with outcome-separation validation and automated segment profiling with stable versioned definitions.
pipe: Event data @ warehouse ; Sequence encoder @ transformer ; Clustering @ constrained KMeans ; Segment profiler @ summaries ; Segment API @ CDP ; Lifecycle campaigns @ marketing tools ; Outcome tracking @ analytics
edge: Product redesign changes event semantics | a product redesign changes what events mean, so existing segments silently break | Event-contract versioning and re-mapping
edge: Tiny segments produce noisy conclusions | very small segments produce noisy conclusions that lead to bad decisions | Minimum-size rules and uncertainty
off: Outcome separation (retention lift between segments) ; Stability across weeks
on: Lifecycle campaign lift by segment ; Segment usage by teams
gap: Internal metrics only ; No outcome validation

== free-trial-abuse-detection | Free-Trial & Promo Abuse Detection | tabular,graph | sub-100ms | advanced | a=0.3 k=2
obj: Detect repeat trials, referral fraud and credit farming at signup to protect revenue without blocking genuine users.
loss: \mathcal{L}=\mathrm{FL}(y,p)+\lambda\,\mathrm{GraphReg}
con: Decision at signup within 50 ms ; Low friction ; Privacy ; Appeals
sn: Linkage | Identity linkage across email, device and payment | Per-account checks | Abusers create many accounts
sn: Economics | Cost-aware friction by trial value | Block all suspicious | Over-blocking hurts conversion
sig: Device and payment linkage count | accounts sharing device or card | Repeat trials | Hashing
sig: Disposable email indicator | domain reputation | Fake accounts | Lists
sig: Referral graph anomalies | reciprocal and cyclical referrals | Referral fraud | Graph
noise: Signup hour | weak
noise: Browser language | weak
base: Block disposable emails and duplicate cards.
prod: Real-time GBDT with identity graph features and cost-aware friction (verification, card-required trial).
pipe: Signup request @ API ; Identity graph lookup @ graph store ; Abuse model @ GBDT ; Friction policy @ verification step ; Fraud review @ human ; Account decisions @ billing ; Abuse labels @ outcomes
edge: Families or teams share a device | false repeat-trial flags | Business email and workspace signals
edge: Abusers rotate virtual cards | payment linkage weakens | Behavioural and device-level features
off: Precision at fixed block rate ; Trial-abuse detection recall
on: Trial abuse rate ; Conversion rate of genuine trials
gap: Labels only from caught abuse ; Ignoring conversion cost

== saas-account-security-anomalies | SaaS Account Security Anomaly Detection | tabular,time-series | sub-100ms | advanced | a=5 k=2
obj: Detect compromised end-user and admin accounts in a multi-tenant SaaS and offer tenants risk signals and automated responses.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Per-tenant privacy ; Real-time decisions ; Customer-configurable policies ; Explainable alerts
sn: Baselines | Per-user and per-tenant baselines | Global anomaly model | Normal differs by tenant and role
sn: Response | Customer-defined policy actions | Fixed vendor action | Tenants have different risk appetite
sig: New device or location for user | novelty vs history | Compromise | History
sig: Sensitive action burst | exports, permission changes in short time | Takeover | Window
sig: API token creation anomalies | new tokens after login | Persistence | Event
noise: Browser version | noisy
noise: Login hour | weak
base: Geo-IP rules and impossible travel.
prod: Streaming per-tenant behavioural models with risk scores, tenant policy engine and explanations in the admin console.
pipe: Audit events @ Kafka ; Per-user feature state @ stream ; Risk model @ GBDT ; Tenant policy engine @ rules ; Response @ revoke or MFA ; Admin console @ alerts ; Verdicts @ labels
edge: Tenant uses a VPN that changes IP constantly | a tenant-wide VPN rotates IPs constantly and produces a stream of false alarms | Tenant-level network profiles
edge: Cross-tenant model learning could leak | sharing models across tenants could leak one customer's behaviour to another | Federated or aggregate-only shared learning
off: Detection recall at fixed alert rate ; Tenant-level precision
on: Account takeovers detected ; Admin-reported false alerts
gap: Labels only from reported takeovers ; Tenant heterogeneity ignored

== api-usage-forecasting-and-quota-planning | API Usage Forecasting & Quota Planning | time-series | batch | foundational | a=1 k=1
obj: Forecast per-customer API usage to plan capacity, set fair quotas and forecast usage-based revenue.
loss: \mathcal{L}=\sum_t\rho_q(y_t-\hat y_t)
con: Thousands of customers with different scales ; Launch spikes ; Quota fairness ; Billing implications
sn: Heterogeneity | Hierarchical/global models across customers | Per-customer ARIMA | Per-customer models fail on short histories
sn: Events | Customer launch and campaign covariates | History only | Launches drive step changes
sig: Usage trend and seasonality | decomposed trend and weekly cycle | Baseline | Window
sig: Customer lifecycle stage | onboarding, steady, expansion | Growth | CRM
sig: Planned launch events | dated releases from CSM notes | Spikes | Data capture
noise: Customer name | none
noise: Plan name | encoded
base: Linear extrapolation of last 4 weeks.
prod: Global quantile GBDT/transformer with customer embeddings and event covariates, feeding quota recommendations and capacity plans.
pipe: Usage metrics @ warehouse ; Feature builder @ dbt ; Global forecaster @ quantile model ; Quota recommender @ policy ; Capacity planner @ infrastructure ; CSM review @ human ; Realised usage @ calibration
edge: Customer launches a new integration | usage jumps tenfold | Event feeds from CSMs and early-warning detectors
edge: Quota limits suppress observed demand | throttled customers appear to use less than they need, so censored usage understates true demand | Censoring-aware modelling
off: Weighted pinball loss ; Interval coverage
on: Capacity-related incidents ; Quota complaints
gap: Training on throttled usage as true demand ; Ignoring customer events

== data-quality-anomaly-detection | Data Quality Anomaly Detection | time-series,tabular | batch | advanced | a=1 k=2
obj: Detect freshness, volume, schema and distribution problems in data pipelines before dashboards and models break.
loss: \mathcal{L}=\sum_t\left[\log\sigma_t+\frac{(m_t-\mu_t)^2}{2\sigma_t^2}\right]
con: Thousands of tables ; Low alert noise ; Lineage-aware impact ; Auto-generated checks
sn: Impact | Rank by downstream lineage impact | Alert on every anomaly | Most anomalies affect unused tables
sn: Baselines | Seasonal per-table baselines | Static row-count thresholds | Weekly cycles break static thresholds
sig: Freshness delay vs expected | time since last load vs schedule | Staleness | Schedule metadata
sig: Volume and null-rate deviation | z-score | Data issue | Baseline
sig: Downstream consumer count | lineage fan-out | Priority | Lineage graph
noise: Table name | none
noise: Column order | none
base: Hand-written SQL checks per table.
prod: Auto-profiled metrics with seasonal baselines, lineage-based impact ranking and LLM-assisted root-cause hints.
pipe: Warehouse metadata @ catalog ; Metric profiler @ batch ; Seasonal anomaly detector @ stats ; Lineage impact ranker @ graph ; Alert router @ data owners ; Data engineer @ human ; Resolution feedback @ labels
edge: Planned backfill creates volume spikes | a planned backfill creates volume spikes that raise false data-quality alerts | Backfill annotations from orchestrator
edge: Schema change upstream | downstream failures | Schema-drift detection with contract tests
off: Detection precision on incident-linked alerts ; Detection delay
on: Data incidents caught before consumers ; Alert noise
gap: Injected anomalies only ; No lineage in evaluation

== llm-schema-matching-data-integration | Schema Matching & Data Integration with LLMs | nlp,llm-agents | batch | advanced | a=0.01 k=10 s=3 t=250
obj: Map columns between customer data sources and the product's canonical schema, generating validated transformations.
loss: \mathcal{L}=\mathrm{InfoNCE}(\text{column},\text{target field})+\lambda\,\mathrm{ValidationFailure}
con: Thousands of source systems ; Mapping correctness ; Transformation testing ; Human approval
sn: Verification | Validate mappings on sample data (types, distributions) | Name similarity only | Same name can mean different things
sn: Transform | Generate and test transformation code | Free-form mapping text | Untested transforms corrupt data
sig: Column name and description similarity | embedding similarity | Candidates | Descriptions
sig: Value-distribution match | type and distribution compatibility | Verification | Sampling
sig: Constraint checks | uniqueness, nullability, referential | Correctness | Rules
noise: Column position | arbitrary
noise: Table creation date | none
base: Manual mapping spreadsheets.
prod: Embedding candidate retrieval, LLM mapping proposals, execution-based validation on samples and human approval with learned corrections.
pipe: Source schema and samples @ connector ; Candidate retriever @ embeddings ; Mapping LLM @ structured output ; Validation runner @ sandbox SQL ; Approval UI @ human ; Pipeline deploy @ ELT ; Correction feedback @ learning
edge: Ambiguous columns (date meaning order vs ship) | wrong mapping silently | Semantic validation on sample values and required confirmation
edge: PII columns mapped to the wrong target | a personal-data column mapped to the wrong target field creates a privacy risk downstream | PII detectors in the validation step
off: Mapping accuracy on labelled schemas ; Validation pass rate
on: Integration setup time ; Data errors after integration
gap: Evaluating with clean schemas ; Accepting proposals without execution

== learned-trace-sampling | Learned Trace & Telemetry Sampling | tabular,time-series | sub-10ms | staff-principal | a=100000 k=1
obj: Decide in real time which traces and logs to keep so that rare errors and slow requests are retained while costs drop by 80%.
loss: \max\;\sum_r v_r\,\mathbb{1}[\text{keep}_r]\ \text{s.t. budget}
con: Decision under 100 microseconds ; Trillions of spans ; Tail-based sampling needs buffering ; Cost budget
sn: Value | Keep errors, outliers and novel paths | Uniform sampling | Uniform sampling drops the rare traces that matter
sn: Placement | Decide at the collector with buffered traces | Head sampling only | Head sampling can't know if the trace will fail
sig: Error and latency outlier flags | error status, latency percentiles | Retain | Thresholds
sig: Path rarity | rarity of call path | Novelty | Sketches
sig: Customer or SLO importance | tier of tenant | Priority | Config
noise: Trace ID | random
noise: Span count | weak
base: Head-based 1% uniform sampling.
prod: Tail-sampling collectors with learned keep-probabilities from rarity, error and latency features, budget-constrained by controller.
pipe: Span ingestion @ collectors ; Trace assembler @ buffer ; Value estimator @ small model ; Budget controller @ keep probability ; Sampler @ decision ; Storage @ trace backend ; Retention feedback @ query logs
edge: Buffer memory exhausted during spikes | traces dropped unpredictably | Backpressure policies with priority classes
edge: Incident produces a flood of identical errors | budget consumed by duplicates | Per-signature caps and diversity sampling
off: Retention rate of anomalous traces at budget ; Storage savings
on: Debug success with sampled data ; Observability cost
gap: Evaluating on already-sampled data ; Ignoring rare path coverage

== sre-runbook-automation-agent | SRE Runbook Automation Agent | llm-agents | seconds | staff-principal | a=3 k=15 s=8 t=400
obj: Execute and suggest runbook steps for incidents with typed tools, approvals for risky actions and a full audit trail.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{incident})+\lambda\,\mathrm{UnsafeAction}
con: Production safety ; Human approval for mutations ; Observability of agent actions ; Time-critical
sn: Safety | Read-only by default, graded approvals | Autonomous remediation | A wrong restart can worsen an outage
sn: Knowledge | Verified runbooks and past incidents | Model's generic advice | Systems have specific failure modes
sig: Runbook match confidence | retrieval relevance | Plan | Retrieval
sig: Action risk tier | read, restart, scale, delete | Gate | Classification
sig: Post-action health check | metrics recover after action | Verification | Monitors
noise: Chat verbosity | none
noise: Number of tool calls | weak
base: Static runbooks and chatops commands.
prod: Agent with typed SRE tools, runbook retrieval, risk-tiered approvals, dry-run and automatic post-action verification.
pipe: Incident alert @ pager ; Context gatherer @ metrics logs traces ; Runbook retriever @ vector search ; Planner agent @ LLM ; Typed ops tools @ Kubernetes and cloud APIs ; Approval gate @ on-call human ; Audit and learning @ postmortems
edge: Agent proposes restart during a data migration | corrupts the migration | Change-freeze and dependency checks before mutations
edge: Stale runbook | wrong remediation suggested | Runbook freshness metadata and verification after action
off: Plan correctness on replayed incidents ; Unsafe-action rate
on: Mean time to mitigate ; Toil hours saved
gap: Replay incidents lacking novelty ; Measuring speed only

== ml-platform-drift-monitoring | ML Platform: Drift & Quality Monitoring | tabular,time-series | batch | advanced | a=1 k=3
obj: Give every deployed model automatic monitoring for data drift, prediction drift and performance with label delay awareness.
loss: \mathrm{PSI}=\sum_i(P_i-Q_i)\ln\frac{P_i}{Q_i}
con: Thousands of models ; Delayed or missing labels ; Low-noise alerts ; Self-serve onboarding
sn: Performance | Delay-aware estimates and proxy metrics | Wait for labels | Labels arrive weeks later
sn: Alerts | Importance-weighted drift (features that matter) | Drift on every feature | Most drift is harmless
sig: Importance-weighted PSI | PSI weighted by feature importance | Relevant drift | Importance estimates
sig: Prediction distribution shift | score distribution change | Early warning | Reference window
sig: Delayed-label performance estimate | CBPE-style estimates | Performance | Calibration
noise: Drift in unused features | no impact
noise: Single-day PSI | sampling noise
base: Manual dashboards for a few models.
prod: Platform-level monitors with importance-weighted drift, label-free performance estimation and alert policies per model tier.
pipe: Inference logs @ stream ; Reference baselines @ training stats ; Drift and quality metrics @ Spark ; Label-free estimator @ calibration ; Alert policy @ tiered thresholds ; Model owner @ human ; Retrain trigger @ pipeline
edge: Upstream schema change | drift alerts for all features | Schema-change detection and grouped alerts
edge: Seasonal shift flagged as drift | unnecessary retrains | Seasonal reference windows
off: Detection of injected drift ; Correlation of estimated and realised performance
on: Time to detect degradation ; Retrains triggered unnecessarily
gap: Drift without link to performance ; Static reference windows

== llm-gateway-routing-and-cost-optimization | LLM Gateway Routing & Cost Optimisation | llm-agents,reinforcement-learning | sub-100ms | staff-principal | a=30 k=4
obj: Route each LLM request to the cheapest model that meets quality needs, with caching, rate limiting and fallbacks.
loss: \min_\pi\;\mathbb{E}\!\left[\text{cost}(m)+\lambda\,\mathbb{1}[\text{quality}<\tau]\right]
con: Routing overhead under 20 ms ; Quality guarantees per task ; Provider outages ; Budget enforcement per team
sn: Quality | Learned router evaluated against a task-specific quality bar | Always the largest model | Most requests don't need the largest model
sn: Caching | Semantic and prefix caching with safety | No caching | Repeated prompts are common and expensive
sig: Query difficulty estimate | predicted need for strong model | Routing | Router model
sig: Cache hit probability | semantic similarity to cached | Savings | Index
sig: Provider health and latency | live status | Fallback | Monitors
noise: Prompt length alone | weak
noise: Team name | none
base: Fixed model per application.
prod: Router model predicting quality per model, semantic cache with similarity thresholds, budget guards and multi-provider failover.
pipe: LLM request @ gateway ; Auth and budget check @ policy ; Semantic cache @ vector lookup ; Router @ difficulty classifier ; Model call @ provider adapters ; Quality sampler @ judge ; Usage metering @ billing
edge: Cache returns an answer for a similar but different question | wrong response served | High similarity thresholds and task-specific cache TTLs
edge: Provider outage | an LLM provider outage causes an error spike unless traffic fails over to an equivalent model | Health-aware failover with quality-equivalent models
off: Cost saved at equal quality on eval sets ; Router accuracy
on: Cost per request ; Quality regressions
gap: Router trained on judge scores with bias ; Cache evaluated on easy repeats

== llm-app-eval-and-regression-testing | LLM Application Evals & Regression Testing | llm-agents,nlp | batch | advanced | a=0.01 k=20
obj: Maintain golden datasets and automated evaluations so prompt, model and tool changes are gated on measured quality, safety and cost.
loss: \text{score}=\frac{1}{N}\sum_i \mathrm{Judge}(x_i,y_i)\ \text{(calibrated against human labels)}
con: CI-time evaluation ; Calibrated judges ; Coverage of failure modes ; Cost of evaluation
sn: Datasets | Curate from production failures and edge cases | Synthetic easy examples | Easy sets saturate and miss regressions
sn: Judges | Calibrate LLM judges to human labels | Trust judge scores | Judges are biased toward verbosity and their own style
sig: Task success on golden set | pass rate on curated cases | Quality | Dataset curation
sig: Judge-human agreement | kappa | Reliability | Anchor set
sig: Regression diff by slice | slice-level change | Localise | Slicing
noise: Average score alone | hides slices
noise: Number of test cases | quantity
base: Manual spot checks before release.
prod: Versioned golden sets from production traces, calibrated judges, slice-level regression reports and release gates in CI.
pipe: Production traces @ logging ; Case curation @ failure mining ; Eval runner @ batch inference ; Judges @ calibrated LLM ; Regression report @ slices ; Release gate @ CI ; Human labelling @ anchors
edge: Judge model update shifts scores | regressions appear or hide | Pinned judge versions and re-calibration
edge: Dataset contamination via prompt tuning | optimistic scores | Held-out sets and rotation
off: Judge-human agreement ; Regression detection power on seeded changes
on: Bad releases prevented ; Time to ship prompt changes
gap: Evaluating only on the tuned set ; Single aggregate metric

== rag-quality-monitoring | RAG Quality Monitoring in Production | nlp,llm-agents | batch | advanced | a=0.1 k=10
obj: Monitor retrieval relevance, groundedness and user outcomes of RAG apps in production, spotting content gaps and regressions.
loss: \mathcal{L}=\mathrm{BCE}(\text{grounded},p)
con: Online sampling cost ; Privacy of queries ; Per-tenant indexes ; Actionable diagnostics
sn: Diagnosis | Separate retrieval failures from generation failures | End-to-end score only | Fixes differ: retrieval vs prompt vs content
sn: Gaps | Detect missing-content queries | Treat all failures as model errors | Missing docs need content, not tuning
sig: Retrieval hit rate on judged queries | gold passage in top-k | Retrieval health | Labels
sig: Groundedness rate | answers supported by retrieved text | Hallucination | NLI
sig: Unanswerable-query rate | queries with no relevant doc | Content gap | Classifier
noise: Answer length | weak
noise: Latency alone | not quality
base: Thumbs-up and thumbs-down ratings.
prod: Sampled online evaluation with retrieval/generation diagnosis, groundedness checks and content-gap reports to doc owners.
pipe: Traces @ logging ; Sampler @ stratified ; Retrieval judge @ LLM ; Groundedness judge @ NLI ; Gap analyser @ clustering ; Owner report @ dashboard ; Fix tracking @ tickets
edge: Index update lags | the retrieval index lags behind content changes, so answers are stale | Index freshness SLOs and freshness checks in monitoring
edge: Sensitive queries in logs | user queries stored in logs contain sensitive data and create privacy issues | PII redaction before evaluation and retention limits
off: Judge-human agreement ; Diagnosis accuracy on labelled failures
on: Resolution rate ; Content gaps closed
gap: Ratings used as quality ; Not separating retrieval from generation

== ugc-moderation-saas | UGC Moderation as a Service | nlp,computer-vision | sub-100ms | advanced | a=5 k=20
obj: Offer customers configurable moderation of text, images and video with per-tenant policies and audit trails.
loss: \mathcal{L}=\sum_k w_k\,\mathrm{BCE}(y_k,p_k)
con: Per-tenant thresholds ; Latency inline ; Explainable decisions ; Regional laws
sn: Policy | Taxonomy with tenant-configurable thresholds | One fixed policy | Platforms differ in tolerance
sn: Review | Human review tooling and feedback loops | Model-only | Edge cases need human decisions
sig: Category scores | multi-label calibrated scores | Decision | Calibration
sig: Tenant feedback labels | tenant overrides | Adaptation | Privacy
sig: Context signals | thread and user history | Disambiguation | Data
noise: Content length | weak
noise: Upload time | weak
base: Keyword filters and manual review.
prod: Multimodal moderation models with per-tenant calibration, review queues and policy simulation before changes.
pipe: Content API @ gateway ; Text and image models @ multimodal ; Tenant policy engine @ thresholds ; Review queue @ human ; Decision audit @ logs ; Policy simulator @ replay ; Feedback @ calibration
edge: Tenant policy change floods the review queue | a tenant tightens its policy and the review queue is flooded with newly flagged content | Policy simulation and ramped rollout
edge: Cross-tenant learning leaks data | learning shared across tenants can leak one tenant's content or policies to another | Tenant-isolated calibration and aggregate-only shared learning
off: Per-category precision and recall ; Calibration per tenant
on: Violating content exposure ; Review workload
gap: Test data from one tenant ; Ignoring regional laws

== cdp-identity-resolution-saas | Customer Data Platform Identity Resolution | graph,tabular | batch | advanced | a=0.5 k=3
obj: Resolve anonymous and known identifiers into unified customer profiles for analytics and activation with explainable merges.
loss: \mathcal{L}=\mathrm{BCE}(\text{same person})+\lambda\,\mathrm{TransitivityPenalty}
con: Deterministic first ; Privacy and consent ; Unmerge capability ; Scale to billions of events
sn: Safety | Merge only on deterministic or high-confidence links with unmerge | Aggressive probabilistic merging | Bad merges contaminate profiles
sn: Explainability | Link evidence retained for each merge | Opaque clusters | Support teams must explain merges
sig: Deterministic identifier match | email, user ID | Strong link | Hashing
sig: Device-session co-occurrence | repeated shared sessions | Probabilistic | Windows
sig: Conflict signals | contradictory attributes | Prevent bad merges | Rules
noise: IP alone | shared networks
noise: User agent | weak
base: Merge profiles by email.
prod: Deterministic graph clustering with confidence-scored probabilistic links, conflict checks, evidence retention and unmerge workflows.
pipe: Events and identifiers @ stream ; Link scorer @ GBDT ; Conflict checker @ rules ; Graph clustering @ connected components ; Profile store @ unified profiles ; Data steward @ human ; Activation @ destinations
edge: Shared family email merges different people | marketing misfires | Role-based email detection and conflict checks
edge: Consent withdrawal | profile data must be removed | Deletion propagation across downstream destinations
off: Merge precision at fixed recall ; Unmerge rate
on: Profile accuracy ; Activation match rate
gap: Evaluating with deterministic links only ; Ignoring unmerge costs

== developer-docs-assistant | Developer Documentation Assistant | llm-agents,nlp | seconds | advanced | a=2 k=10 s=3 t=350
obj: Answer developer questions about APIs and SDKs with correct, version-specific code snippets and links to authoritative docs.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{docs})+\lambda\,\mathrm{NonExistentAPI}
con: Version-aware answers ; Code must compile ; No invented endpoints ; Low latency
sn: Version | Retrieve docs for the user's SDK version | Retrieving only the latest docs for every user | Version mismatch breaks code
sn: Verification | Compile or run snippets in a sandbox | Trust generated code | LLMs invent plausible API calls
sn: Abstention | Declining to answer when the docs do not state the fact | Always producing a fluent answer | A confident invented limit or endpoint costs developers hours
sn: Evaluation | Held-out golden questions with unanswerable cases scored on facts | Questions written from docs headings and judged on fluency | Heading-derived questions are easy to retrieve and hide failures on real phrasing
sig: API existence check | referenced symbols found in spec | Catches invented endpoints and parameters before they reach the developer | Use the OpenAPI spec for the user's version
sig: Snippet execution pass | sandbox run succeeds | Shows the code actually works, not just that it reads well | Run against the pinned SDK version in a test harness
sig: Version match | docs version equals user version | A correct answer for the wrong version breaks the developer's code | Read the version from request context, not from the question text alone
sig: Citation supports the value | the cited passage literally contains the stated value | Catches fabricated numbers and endpoints | A valid citation alone is not proof, because a changelog can cite both the old and the new value
sig: Abstention precision | share of declined questions that are truly unanswerable | Shows whether refusals are justified | Needs labelled unanswerable questions kept out of tuning
noise: Answer verbosity | longer answers are not more helpful and hide the one fact the developer needs
noise: Greeting text | adds tokens and nothing a developer can act on
noise: Retrieval recall at five alone | easy on small corpora and silent about stale or invented answers
base: Docs search with keyword matching.
prod: Version-aware retrieval over docs and OpenAPI specs, code generation with API-existence validators and sandbox execution.
pipe: Question @ docs site or IDE ; Version detector @ context ; Retriever @ hybrid search ; Answer LLM @ grounded code ; API existence validator @ spec check ; Sandbox runner @ test ; Developer @ feedback
edge: Deprecated API still in older docs | a deprecated API is recommended and the developer's code breaks | Deprecation metadata and warnings
edge: SDK differences across languages | snippet does not compile | Language-specific retrieval and tests
edge: Changelog quotes both old and new values | the reader picks the stale number and cites a valid passage | Exclude changelog chunks from answer sources unless the question asks about changes
edge: Question phrased outside the known vocabulary | a synonym such as throttle or size cap is not recognised as the intended fact | Log abstentions, review them weekly and extend the intent vocabulary from real traffic
off: Snippet execution pass rate ; Hallucinated API rate
on: Time to first successful API call ; Docs support ticket rate
gap: Evaluating on questions from docs headings ; Not executing the code

== personalized-onboarding-paths | Personalised Onboarding Paths | recommender,reinforcement-learning | sub-100ms | foundational | a=1 k=2
obj: Tailor onboarding steps and templates to each new user or team to reach first value faster.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t\,\mathbb{1}[\text{activation}]\right]
con: Quick decisions per step ; Role and goal context ; Experimentation ; Avoid overwhelming users
sn: Goal | Optimise time to value and activation | Checklist completion | Completed steps may not equal value
sn: Context | Role and use-case conditioning | One-size onboarding | Needs differ widely
sig: Declared role and goal | survey answers | Personalisation | Consent
sig: Early action sequence | first-session actions | Intent | Window
sig: Template similarity to successful teams | embedding similarity | Recommendation | Data
noise: Referrer | weak
noise: Browser | weak
base: Single onboarding checklist for everyone.
prod: Contextual bandit selecting next-best onboarding step and template, with activation reward and holdouts.
pipe: Signup context @ app ; User features @ feature store ; Candidate steps @ catalogue ; Bandit selector @ Thompson ; Onboarding UI @ in-app ; Experiment platform @ holdout ; Activation labels @ warehouse
edge: Cold-start users with no context | generic choices | Short intake survey and contextual priors
edge: Overloaded onboarding | too many onboarding steps overwhelm new users and they bounce before reaching value | Step caps and progressive disclosure
off: Off-policy value for activation ; Template recommendation NDCG
on: Time to first value ; Week-4 retention
gap: Rewarding checklist completion ; Non-random step exposure

== customer-success-qbr-agent | Customer Success QBR & Account Briefing Agent | llm-agents,tabular | seconds | advanced | a=0.02 k=60 s=5 t=500
obj: Generate account briefs and quarterly business review drafts from usage, support, billing and CRM data with cited metrics.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{data})+\lambda\,\mathrm{NumericError}
con: Numbers from tools not the model ; Data access by role ; Customer-confidential data ; CSM approval
sn: Numbers | Metrics computed by queries and cited | LLM-stated figures | LLMs fabricate numbers
sn: Insight | Highlight changes and risks with comparisons | List all metrics | Customers want what changed and what to do
sig: Metric citation coverage | statements linked to queries | Trust | Citation check
sig: Insight relevance | CSM-rated usefulness | Quality | Feedback
sig: Data freshness | age of source data | Reliability | Metadata
noise: Slide design | cosmetic
noise: Brief length | weak
base: CSMs build decks manually from dashboards.
prod: Agent with governed metric tools, comparison and risk detectors, narrative generation with citations and CSM review before sharing.
pipe: Account request @ CSM tool ; Metric tools @ governed queries ; Insight detectors @ rules and models ; Narrative LLM @ with citations ; Numeric verifier @ re-query check ; CSM review @ human ; Brief storage @ CRM
edge: Data from different systems disagree | brief states conflicting numbers | Source-of-truth precedence and discrepancy flags
edge: Brief reveals another customer's data | confidentiality breach | Account-scoped tools and tests
off: Numeric accuracy of cited metrics ; CSM acceptance rate
on: CSM prep time ; Customer meeting outcomes
gap: Judging fluency over accuracy ; Not testing cross-account isolation
