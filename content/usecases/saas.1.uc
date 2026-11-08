# SaaS & Developer Platforms, part 1 (use cases 1-25)
== b2b-saas-churn-prediction | B2B SaaS Churn Prediction | tabular,time-series | batch | production-grade | a=0.5 k=3
obj: Predict account-level churn and contraction 90 days ahead and recommend the intervention that actually retains revenue.
loss: \mathcal{L}=-\sum_i\left[\delta_i\log h(t_i)-H(t_i)\right]\ \text{(account-level survival)}
con: Contract renewal cycles ; Few accounts relative to users ; Explainable to CSMs ; Weekly refresh
sn: Level | Account-level modelling with seat-level engagement rollups | User-level churn | Accounts churn when the champion or admin leaves, not when one user does
sn: Action | Uplift on CSM interventions | Churn probability only | Saving a likely-churner is not the same as being able to save them
sig: Admin and champion activity | logins and configuration changes by admins | Ownership | Role mapping
sig: Seat utilisation trend | active seats over licensed seats, 90-day slope | Shelfware risk | Billing data as-of
sig: Support-ticket sentiment and escalations | rate and severity of tickets | Dissatisfaction | Matured tickets
noise: Number of logins total | scale with account size
noise: Company logo or industry text | weak
base: Rule-based health score from usage thresholds.
prod: Discrete-time survival GBDT on account-level features with champion-change detection and an uplift layer for CSM playbooks.
pipe: Product and billing events @ warehouse ; Account feature builder @ dbt and Spark ; Churn hazard model @ GBDT ; Uplift selector @ T-learner ; CSM worklist @ CRM ; CSM outreach @ human ; Renewal outcomes @ labels
edge: Champion leaves the customer | usage looks fine until the renewal blows up | Contact-graph monitoring and champion-change features
edge: Price increase announced | churn spike unrelated to usage | Pricing-event covariates and cohort separation
off: Time-dependent AUC and calibration ; Uplift on CSM-treated accounts
on: Gross revenue retention ; Net revenue retention
gap: Features computed after the renewal conversation started ; Treating all churn as preventable

== account-health-scoring | Customer Account Health Scoring | tabular | batch | foundational | a=1 k=3
obj: Combine usage, support, billing and relationship signals into an interpretable health score that CSMs trust and act on.
loss: \mathcal{L}=\mathrm{BCE}(\text{retain},p)+\lambda\,\mathrm{MonotonicityPenalty}
con: Explainable drivers ; Stable week to week ; Segment-specific baselines ; Data from 5+ systems
sn: Validity | Back-test score against realised renewals | Weights set by committee | Unvalidated health scores drift into noise
sn: Segments | Segment-specific baselines (SMB, enterprise) | One global scoring | Healthy enterprise usage differs from healthy SMB usage
sig: Product adoption breadth | share of core features used | Value realisation | Feature definitions
sig: Time to value | days from contract to first key outcome | Onboarding quality | Event definitions
sig: Executive engagement | sponsor meetings and QBRs held | Relationship | CRM
noise: Total contract value | scale not health
noise: CSM name | personal
base: Weighted checklist score.
prod: Monotone GBDT trained on renewal outcomes, with SHAP driver explanations and segment calibration.
pipe: Source system sync @ ELT ; Feature mart @ dbt ; Health model @ monotone GBDT ; Driver explainer @ SHAP ; Score publisher @ CRM ; CSM playbook @ human ; Renewal outcomes @ labels
edge: Product telemetry gap after instrumentation change | scores drop for healthy accounts | Telemetry-completeness checks and data-quality flags
edge: Accounts on multi-year contracts have no renewal signal | model underfits | Early-warning proxies and expansion labels
off: AUC and calibration on renewals ; Score stability week to week
on: Renewal rate of healthy vs unhealthy ; CSM actions per score alert
gap: Weights set by hand never validated ; Leakage from renewal-related activity

== expansion-and-upsell-propensity | Expansion & Upsell Propensity | tabular | batch | foundational | a=0.5 k=3
obj: Identify accounts ready to expand seats or tiers, and the right product to propose, to prioritise sales effort.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{ARR potential})
con: Sales capacity ; Fairness in territory allocation ; Explainable signals ; Quarterly planning
sn: Timing | Usage-threshold events (seat cap hit, feature gating) | Static firmographics | Intent shows in usage walls
sn: Value | Expected incremental ARR | Highest propensity | Large accounts matter more than many tiny ones
sig: Seat utilisation near cap | active seats over licensed | Need for more | Billing
sig: Gated-feature hits | attempts to use paid features | Intent | Paywall events
sig: New-team adoption | new departments active | Spread | Org graph
noise: Marketing email opens | weak
noise: Account age | confounded
base: Rules for accounts above 90% seat utilisation.
prod: GBDT predicting expansion within 90 days and expected ARR, ranked by value with product-recommendation head.
pipe: Usage and billing events @ warehouse ; Feature builder @ dbt ; Expansion model @ GBDT ; ARR estimator @ regression ; Priority ranker @ expected value ; Sales worklist @ CRM ; Closed-won outcomes @ labels
edge: Free pilots look like expansion | wasted sales calls | Contract-state features and pilot flags
edge: Procurement freeze at the customer | strong signals but no budget | Account-level budget cycle indicators
off: Precision at top-k accounts ; Value-weighted lift
on: Expansion ARR per rep ; Win rate on model-sourced opportunities
gap: Using signals recorded after sales engagement ; Ignoring capacity limits

== b2b-lead-scoring | B2B Lead & Account Scoring | tabular | sub-100ms | production-grade | a=0.2 k=3
obj: Score inbound leads and target accounts by likelihood to convert so sales time goes to the best opportunities.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Real-time routing within seconds ; Fairness across regions ; Explainable factors ; Data enrichment latency
sn: Level | Account-level intent aggregated across contacts | Individual lead clicks | Buying committees act as a group
sn: Outcome | Closed-won revenue not MQL conversion | Marketing-qualified lead rate | MQLs inflate with low-quality traffic
sig: Account intent surge | multi-contact visits to pricing and docs | Buying signal | Window
sig: Firmographic fit | size, industry, tech stack match | ICP | Enrichment
sig: Engagement recency and depth | actions in last 14 days | Interest | Event windows
noise: Lead source label alone | channel artefact
noise: Job title raw text | messy
base: Rule-based lead scoring with points per action.
prod: Calibrated GBDT on account-level features, trained on closed-won outcomes with time-based splits, served with enrichment caching.
pipe: Lead capture @ web forms ; Enrichment @ firmographic APIs ; Feature builder @ account aggregates ; Lead scorer @ GBDT ; Routing engine @ rules ; Sales development @ human ; Opportunity outcomes @ labels
edge: Enrichment vendor outage | features missing and scores plunge | Defined fallback model without enrichment features
edge: Marketing campaign brings low-quality spike | scores inflate with engagement | Source-aware calibration and campaign flags
off: PR-AUC and lift at top decile ; Calibration by region
on: Pipeline created per SDR hour ; Closed-won rate
gap: Training on MQL conversion not revenue ; Features logged after sales contact

== lead-to-account-matching | Lead-to-Account Matching & Entity Resolution | nlp,tabular | batch | production-grade | a=0.2 k=3
obj: Match leads, contacts and accounts across CRM and marketing systems, deduplicating entities for reliable routing and analytics.
loss: \mathcal{L}=\mathrm{BCE}(\text{same entity})+\lambda\,\mathrm{TransitivityPenalty}
con: Millions of records ; Precision above 99% for merges ; Domain and name variations ; Audit trail
sn: Blocking | Blocking by domain and name keys with fuzzy fallback | All-pairs comparison | N-squared is impossible at CRM scale
sn: Hierarchy | Parent-subsidiary account hierarchies | Flat accounts | Routing must respect enterprise hierarchy
sig: Email domain match | normalised company domain | Strong link | Free-mail exclusion
sig: Company name similarity | token-based and embedding similarity | Candidate | Legal suffix normalisation
sig: Location and phone overlap | shared location data | Disambiguation | Formats
noise: Record creation date | arbitrary
noise: Owner ID | personal
base: Exact match on email domain.
prod: Blocking, GBDT pair scorer, correlation clustering with hierarchy awareness, and human-reviewed merges for ambiguous cases.
pipe: CRM and marketing records @ ELT ; Normaliser @ standardisation ; Blocking @ key buckets ; Pair scorer @ GBDT ; Cluster builder @ correlation clustering ; Data steward review @ human ; Golden record store @ MDM
edge: Free-mail domains (gmail.com) | unrelated leads merged by domain | Free-mail blocklist and name-based fallback
edge: Acquisitions change company structure | stale hierarchy | Hierarchy refresh from external data and manual overrides
off: Pairwise precision at 99% ; Cluster purity
on: Duplicate rate ; Routing conflicts
gap: Positive labels only from exact matches ; Ignoring hierarchy in evaluation

== plg-activation-prediction | Product-Led Growth Activation Prediction | tabular,time-series | sub-100ms | production-grade | a=1 k=2
obj: Predict which new signups will activate and convert to paid, and trigger in-product guidance or sales assist for those on the edge.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\ \text{and uplift }\tau(x)
con: Real-time within sessions ; Privacy ; Low-friction nudges ; Experimentation
sn: Activation | Define activation by a leading action tied to retention | Signup counts | Signups without value moments never convert
sn: Nudges | Uplift per nudge type | Nudging everyone | Nudges annoy users who would have activated
sig: Key-action completion in first session | whether the aha action occurred | Activation | Event definitions
sig: Time-to-first-value | minutes to first key action | Friction | Timing
sig: Team invitations sent | collaborators invited | Network value | Event
noise: Signup source text | channel artefact
noise: Browser | weak
base: Rule-based onboarding checklist emails.
prod: Real-time propensity model with uplift-based selection of onboarding nudges and sales-assist triggers.
pipe: In-product events @ SDK ; Session features @ Flink ; Activation scorer @ GBDT ; Uplift selector @ T-learner ; Nudge service @ in-app messaging ; Experiment platform @ A/B ; Conversion outcomes @ warehouse
edge: Instrumentation change breaks the activation event | model sees zero activations | Event-contract tests and activation-rate monitors
edge: Nudge fatigue | users ignore all prompts | Per-user nudge caps and cooldowns
off: AUC and uplift (Qini) ; Calibration
on: Activation rate ; Free-to-paid conversion
gap: Non-random nudge assignments in training ; Using events after the activation moment

== pricing-and-packaging-optimization | Pricing & Packaging Optimisation | tabular,reinforcement-learning | batch | staff-principal | a=0.01 k=3
obj: Estimate willingness-to-pay and feature value to design plans, limits and price points that maximise revenue and satisfaction.
loss: \max_{p}\;\sum_s \Pr(\text{buy}\mid p,x_s)\,(p-c)\quad\text{(segment-level choice model)}
con: Price changes affect existing customers ; Fairness and legal ; Limited experiments ; Long sales cycles
sn: Identification | Conjoint studies and randomised price tests | Correlation of price and conversion | Discounts target different customers than list prices
sn: Value | Value-metric alignment (seats, usage, outcomes) | Raw price tiers | Misaligned metrics create churn or leakage
sig: Feature usage by plan | usage of gated features | Value drivers | Telemetry
sig: Willingness-to-pay estimate | conjoint or Van Westendorp | Price anchor | Survey bias
sig: Price elasticity by segment | randomised test response | Optimisation input | Test design
noise: Rep discount rates | negotiation noise
noise: Competitor list price only | ignores bundles
base: Competitor-based and cost-plus pricing.
prod: Hierarchical choice model combining conjoint, test and usage data with segment-level optimisation and grandfathering simulations.
pipe: Deal and usage data @ warehouse ; Conjoint and test results @ research ; Choice model @ Bayesian ; Price optimiser @ constrained search ; Cannibalisation simulator @ scenario analysis ; Pricing committee @ human ; Rollout metrics @ monitoring
edge: Legacy customers perceive an unfair increase | existing customers see a price rise as unfair and churn spikes in the migrated cohort | Grandfathering and phased migration with comms
edge: Competitor launches a cheaper plan | demand shifts quickly | Competitive monitoring and scenario triggers
off: Backtested revenue under counterfactual prices ; Choice model calibration
on: Net revenue retention after change ; Conversion at new prices
gap: Observational prices confounded by deal size ; Ignoring cannibalisation

== usage-based-billing-anomaly | Usage-Based Billing Anomaly Detection | time-series | batch | production-grade | a=1 k=2
obj: Detect billing errors, metering bugs and bill-shock before invoices go out, protecting trust and revenue.
loss: \mathcal{L}=\sum_t\left[\log\sigma_t+\frac{(x_t-\mu_t)^2}{2\sigma_t^2}\right]
con: Invoice cut-off deadlines ; High precision for customer-facing holds ; Meter reconciliation ; Auditable
sn: Sources | Reconcile independent meters (usage pipeline vs infra logs) | Single meter trust | Metering bugs are invisible to a single source
sn: Customer | Customer-specific baselines | Global thresholds | Usage varies enormously per customer
sig: Meter reconciliation gap | difference between independent meters | Bug detection | Time alignment
sig: Usage spike vs baseline | z-score vs seasonal baseline | Bill shock | Baseline window
sig: Rate-card change events | pricing changes | Explains jumps | Audit log
noise: Customer name | none
noise: Invoice number | none
base: Static thresholds on invoice amounts.
prod: Dual-meter reconciliation plus seasonal customer baselines and a pre-invoice anomaly review queue.
pipe: Usage events @ metering pipeline ; Independent meter @ infra logs ; Reconciliation engine @ batch ; Baseline anomaly model @ seasonal ; Pre-invoice review queue @ billing ops ; Invoice generator @ billing system ; Dispute outcomes @ labels
edge: Pricing migration changes units | all invoices look anomalous | Rate-card event correlation and unit normalisation
edge: Customer launches a legitimate large workload | held invoices cause friction | Proactive notices and customer-confirmation flow
off: Detection of injected billing errors ; Precision of held invoices
on: Billing disputes ; Revenue leakage recovered
gap: Injected errors unlike real bugs ; Evaluation without reconciliation sources

== revenue-and-pipeline-forecasting | Revenue & Pipeline Forecasting | time-series,tabular | batch | production-grade | a=1 k=3
obj: Forecast bookings and ARR by quarter at deal and segment level with calibrated ranges for planning.
loss: \mathcal{L}=\sum_q\rho_q\!\left(y-\hat y^{(q)}\right)+\mathrm{BCE}(\text{deal win})
con: Sparse deals relative to rows ; Rep optimism bias ; Reproducible commits ; Weekly updates
sn: Bottom-up | Deal-level win probability aggregated with uncertainty | Rep-reported commit only | Reps over- and under-call systematically
sn: Dynamics | Stage ageing and slippage | Stage probabilities fixed | Deals older than typical close time rarely close
sig: Deal stage age vs norm | days in stage over median | Stall | CRM history
sig: Multi-threading | number of engaged contacts | Deal strength | CRM
sig: Quote and legal activity | quotes sent and redlines | Late-stage intent | Event timing
noise: Rep name | personal
noise: Deal name | none
base: Weighted pipeline by stage probability.
prod: Deal-level calibrated GBDT with slippage model, Monte Carlo aggregation to quarter outcomes and bias-corrected rep commits.
pipe: CRM snapshots @ warehouse ; Deal feature builder @ dbt ; Win and slippage models @ GBDT ; Monte Carlo aggregator @ simulation ; Forecast dashboard @ BI ; Sales leadership @ human ; Realised bookings @ calibration
edge: CRM hygiene lapses | stale stages mislead models | Stage-hygiene features and data-quality alerts
edge: Quarter-end discounting pushes deals early | seasonality distorts | Calendar features and discount-aware modelling
off: Calibration of deal win probabilities ; Quarter forecast error and interval coverage
on: Forecast accuracy at week 6 ; Commit accuracy
gap: Using stage at close in features ; Evaluating total-only not deal-level

== sales-call-summarization-and-coaching | Sales Call Summarisation & Coaching | llm-agents,nlp | seconds | production-grade | a=1 k=400 s=3 t=350
obj: Transcribe calls, extract next steps, objections and competitor mentions and deliver coaching insights, writing back to CRM.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{transcript})+\lambda\,\mathrm{UnsupportedFact}
con: Call consent and legal rules ; CRM write-back accuracy ; Speaker diarisation ; Coaching fairness
sn: Faithfulness | Fields extracted with transcript span evidence | Free summary only | Wrong CRM fields corrupt forecasting
sn: Coaching | Behavioural metrics tied to outcomes | Talk-time as quality | Talk-time ratio alone is a weak proxy
sig: Evidence-linked extraction accuracy | field accuracy with spans | Trust | Annotations
sig: Question and objection patterns | classified moments | Coaching | Taxonomy
sig: Next-step commitment detection | commitments extracted | CRM | Extraction
noise: Call length | weak
noise: Filler word counts | weak
base: Manual notes in CRM.
prod: ASR with diarisation, structured extraction with citations, CRM write-back with rep confirmation, and outcome-linked coaching analytics.
pipe: Call recording @ conferencing ; ASR and diarisation @ speech model ; Extraction LLM @ structured output ; Evidence verifier @ span check ; CRM write-back @ rep confirmation ; Manager coaching view @ analytics ; Deal outcomes @ labels
edge: Multiple speakers misattributed | commitments assigned to the wrong party | Diarisation confidence and confirmation UI
edge: Call in two languages | extraction misses items | Multilingual ASR and language ID
off: Field-level extraction accuracy ; Faithfulness rate
on: Rep admin time saved ; CRM completeness
gap: Evaluating summaries not field accuracy ; Coaching signals not tied to outcomes

== customer-support-copilot | Customer Support Agent Copilot | llm-agents,nlp | seconds | production-grade | a=0.2 k=10 s=3 t=300
obj: Draft grounded replies, summarise threads and surface relevant articles and past tickets so support agents resolve faster with consistent quality.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{ticket,KB})+\lambda\,\mathrm{PolicyViolation}
con: Answers grounded in KB and account data ; PII controls ; Tone consistency ; Agent in control
sn: Grounding | Retrieval over KB, product docs and similar resolved tickets | Model memory | Product details change monthly
sn: Control | Agent edits and approves | Auto-send | Wrong answers to customers damage trust
sig: KB citation coverage | share of statements cited | Faithfulness | Verification
sig: Resolution similarity | similar past ticket resolved with this answer | Precedent | Retrieval
sig: Agent edit distance | edits to the draft | Quality | Logging
noise: Ticket greeting text | cosmetic
noise: Draft length | weak
base: Macros and canned responses.
prod: RAG drafting with account-context tools, citation verification, tone controls and agent feedback loop.
pipe: Ticket thread @ helpdesk ; Context fetcher @ account tools ; Retriever @ hybrid KB search ; Draft LLM @ grounded ; Citation and policy check @ verifier ; Agent review @ human ; Edit and CSAT feedback @ evaluation
edge: Product release changes behaviour | drafts cite outdated docs | Release-triggered KB refresh and doc versioning
edge: Prompt injection in customer email | draft follows attacker text | Treat customer text as data; strip instructions
off: Citation support rate ; Draft acceptance without major edit
on: Handle time ; First-contact resolution
gap: Judging fluency; ignoring correctness ; Using resolved tickets with wrong answers as truth

== help-center-deflection-rag | Help-Centre Deflection with RAG | llm-agents,nlp | seconds | production-grade | a=1 k=8 s=2 t=250
obj: Resolve customer questions in self-service with a grounded assistant, deflecting tickets while keeping satisfaction and escalation safe.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{docs})+\lambda\,\mathrm{Hallucination}
con: Deflection without satisfaction loss ; Docs versioned per product release ; Escalation with context ; Cost per conversation
sn: Success | Resolution confirmed by user or no recontact | Deflection count | Frustrated users abandon rather than succeed
sn: Content | Fix docs gaps found by failed queries | Only tune the model | Many failures are missing documentation
sig: Answer groundedness | claims supported by docs | Safety | NLI
sig: Recontact rate within 7 days | same user opens a ticket | True resolution | Windows
sig: Query-coverage gap | queries with no good doc | Content gap | Retrieval confidence
noise: Chat turns | not success
noise: Thumbs-up rate alone | biased
base: Keyword help-centre search.
prod: Hybrid retrieval, grounded answering with abstention, confirmed-resolution tracking and content-gap analytics.
pipe: User question @ widget ; Retriever @ hybrid ; Reranker @ cross-encoder ; Answer LLM @ grounded ; Groundedness check @ verifier ; Escalation handoff @ ticket creation ; Gap analytics @ content team
edge: Docs for a new feature are not yet published | assistant guesses | Abstain when retrieval confidence is low
edge: Users ask account-specific questions | generic answer misleads | Authenticated tools or handoff
off: Groundedness and answer correctness ; Retrieval recall
on: Verified resolution rate ; Ticket volume per active user
gap: Counting abandonment as deflection ; Test questions from docs titles

== support-ticket-triage-and-priority | Support Ticket Triage & Priority | nlp,tabular | sub-100ms | foundational | a=0.2 k=3
obj: Classify ticket category, urgency and required skill at creation, and route to the right queue meeting SLA.
loss: \mathcal{L}=\mathrm{CE}_{\text{category}}+\lambda\,\mathrm{OrdinalCE}_{\text{urgency}}
con: SLA tiers ; Multilingual ; Real-time routing ; Explainable
sn: Context | Combine text with account tier, product and recent incidents | Text only | Priority depends on the customer and context
sn: Cost | Asymmetric cost for under-prioritising | Symmetric accuracy | Missing an urgent ticket is costly
sig: Account tier and SLA | contract tier | Priority | CRM
sig: Incident linkage | active incident on product | Grouping | Status
sig: Urgency language | classifier | Urgency | Calibration
noise: Ticket length | weak
noise: Customer name | none
base: Keyword rules and manual triage.
prod: Fine-tuned encoder with account-context features, calibrated urgency, incident linking and skills-based routing.
pipe: Ticket creation @ helpdesk ; Language detector @ model ; Classifier @ encoder with context ; Incident linker @ similarity ; Routing engine @ skills and SLA ; Agent queue @ human ; Resolution outcomes @ labels
edge: Incident causes a flood of near-identical tickets | queue overwhelmed | Incident clustering and bulk handling
edge: New product area with no history | a new product area has no labelled tickets so the classifier misroutes them to the wrong queue | Zero-shot fallback and quick label collection
off: Macro-F1 and urgency recall ; Routing accuracy
on: SLA breach rate ; Time to first response
gap: Labels from past misrouted tickets ; Evaluating without account context

== voice-of-customer-mining | Voice-of-Customer Mining | nlp | batch | foundational | a=0.1 k=3
obj: Turn tickets, reviews, calls and surveys into ranked themes, sentiment and feature requests tied to revenue impact.
loss: \mathcal{L}=\mathrm{CE}_{\text{topic}}+\lambda\,\mathrm{CE}_{\text{sentiment}}
con: Multi-source dedup ; PII handling ; Theme stability ; Revenue weighting
sn: Weighting | Weight themes by account revenue and churn risk | Count mentions | Loud small customers can dominate
sn: Stability | Stable taxonomy with drift handling | Re-clustering each time | Changing clusters break trend tracking
sig: Theme volume trend | mentions over time | Emerging issues | Taxonomy
sig: Revenue-weighted impact | ARR of accounts mentioning | Priority | CRM join
sig: Sentiment by theme | aspect-based sentiment | Severity | Model
noise: Text length | weak
noise: Channel | bias
base: Manual tagging and spreadsheets.
prod: Embedding-based topic taxonomy with LLM labelling, aspect sentiment and revenue-weighted prioritisation.
pipe: Sources @ ticketing surveys calls ; PII redaction @ NER ; Topic assignment @ embeddings ; Aspect sentiment @ transformer ; Revenue weighting @ CRM join ; Product manager dashboard @ BI ; Roadmap decisions @ human
edge: Taxonomy drift as product changes | themes drift as the product changes, so trend lines break and comparisons become meaningless | Versioned taxonomy and mapping tables
edge: One loud customer submits hundreds of tickets | a single noisy customer inflates a theme and distorts the priority ranking | Per-account dedup and capping
off: Topic coherence and labelling accuracy ; Sentiment F1
on: Roadmap decisions informed ; Time to detect emerging issues
gap: Mention counts as importance ; Evaluating topics without human review

== in-app-ai-copilot | In-App AI Copilot for SaaS Products | llm-agents | seconds | staff-principal | a=3 k=10 s=5 t=300
obj: Let users accomplish tasks in the product through natural language, with the copilot calling product APIs safely on their behalf.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{context,tools})+\lambda\,\mathrm{UnsafeAction}
con: Respect user permissions ; Confirm destructive actions ; Tenant isolation ; Cost per user per month
sn: Authority | Execute with the user's scoped permissions | Service-account superuser | A hijacked copilot must not exceed the user's rights
sn: Reliability | Typed tools with validation and dry-run | Free-form API calls | Free-form calls produce invalid or dangerous requests
sig: Tool-call validity rate | calls passing schema validation | Reliability | Schemas
sig: Task success rate | tasks completed as intended | Value | Instrumentation
sig: Confirmation acceptance | user approvals of previews | Safety | UI
noise: Chat turns | not success
noise: Response length | weak
base: Help articles and static onboarding tours.
prod: Planner agent over typed product tools with permission-scoped tokens, dry-run previews, confirmations for state changes and cost-aware model routing.
pipe: User request @ in-app chat ; Context builder @ page and entity context ; Planner LLM @ tool-calling ; Tool gateway @ typed APIs with scopes ; Preview and confirm @ UI ; Execution @ product API ; Audit and feedback @ logs
edge: Ambiguous request deletes the wrong object | an ambiguous request makes the copilot delete the wrong object and cause data loss | Dry-run previews, confirmations and soft-delete
edge: Tenant data leaks via retrieval | cross-customer exposure | Tenant-scoped indexes and ACL-aware retrieval
off: Task success on golden tasks ; Tool-call validity
on: Feature adoption via copilot ; Support tickets avoided
gap: Golden tasks too easy ; Ignoring permission edge cases

== natural-language-to-sql | Natural Language to SQL for Analytics | llm-agents,nlp | seconds | production-grade | a=1 k=5 s=4 t=300
obj: Let business users ask questions in plain language and receive correct SQL and results using a governed semantic layer.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{schema})+\lambda\,\mathrm{ExecutionMismatch}
con: Row-level security ; Read-only ; Correct metric definitions ; Query cost limits
sn: Semantics | Query through a metrics layer with definitions | Raw schema generation | Same word means different metrics
sn: Evaluation | Execution accuracy on golden queries | Exact string match | Different SQL can give the same correct result
sig: Schema linking accuracy | right tables and columns | Correctness | Metadata quality
sig: Execution validity and sanity | runs and passes sanity checks | Safety | Checks
sig: Query cost estimate | planner cost | Guardrail | Warehouse
noise: SQL formatting | cosmetic
noise: Question length | weak
base: BI dashboard with filters.
prod: Schema-linked generation over a semantic layer, with validation, cost limits, row-level security and result explanations.
pipe: Question @ chat ; Schema and metric linker @ retriever ; SQL generator @ LLM ; Validator and cost guard @ planner ; Read-only executor @ warehouse ; Result explainer @ LLM ; Feedback and corrections @ eval set
edge: Ambiguous metric names | wrong definition used silently | Clarifying question and metric-layer resolution
edge: Expensive query scans the full warehouse | an unconstrained generated query scans the whole warehouse and causes a cost spike | Cost estimation and partition requirements
off: Execution accuracy on golden queries ; Wrong-answer rate
on: Self-serve query success ; Analyst request backlog
gap: Benchmark leakage ; Golden queries simpler than real

== code-completion-assistant | Code Completion Assistant | llm-agents,nlp | sub-100ms | staff-principal | a=100 k=4
obj: Provide fast, context-aware code suggestions in the editor that developers accept often, with licence and security safeguards.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{context})\ \text{(fill-in-the-middle)}
con: First token under 200 ms ; Repo-aware context ; Licence compliance ; Cost per completion
sn: Latency | Small fast models with speculative decoding and caching | Large model for every keystroke | Latency kills acceptance
sn: Metric | Persisted accepted characters | Suggestion count | Accepted-then-deleted suggestions don't help
sig: Context window quality | relevant files retrieved | Accuracy | Retrieval
sig: Acceptance and persistence rate | accepted and kept after 30 s | Quality | Telemetry
sig: Latency percentile | p95 time to first token | UX | Infrastructure
noise: Suggestion length | weak
noise: Editor theme | none
base: Static IDE autocomplete from symbols.
prod: FIM-trained code model with repo-aware retrieval, small-model routing, caching and licence/security filters.
pipe: Editor request @ IDE plugin ; Context assembler @ repo index ; Router @ model selection ; Completion model @ vLLM FIM ; Filters @ licence and secrets ; Suggestion display @ IDE ; Acceptance telemetry @ analytics
edge: Large monorepo context | slow retrieval and stale index | Incremental indexing and fallback to local context
edge: Model suggests licensed code verbatim | the model reproduces licensed code verbatim and exposes the company to legal risk | Duplication detection and filters
off: Exact match and execution-based benchmarks ; Latency percentiles
on: Persisted accepted characters ; Developer-reported productivity
gap: Public benchmarks contaminated ; Measuring raw acceptance

== automated-code-review-assistant | Automated Code Review Assistant | llm-agents,nlp | seconds | production-grade | a=10 k=15 s=4 t=350
obj: Review pull requests for bugs, risks and style, posting high-signal comments that developers act on.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{diff,context})+\lambda\,\mathrm{FalsePositive}
con: Low noise (developers mute noisy bots) ; Repo context ; Security of code ; PR latency minutes
sn: Precision | Filter comments by confidence and past acceptance | Comment on everything | Noisy bots get muted
sn: Context | Cross-file context and tests | Diff-only analysis | Bugs depend on callers and invariants
sig: Comment acceptance rate | accepted or resolved comments | Quality | Logging
sig: Static-analysis corroboration | linter or analyser agreement | Evidence | Tools
sig: Test-failure linkage | comment correlates to failing tests | Signal | CI
noise: Style nitpicks | formatters handle them
noise: Comment count | quantity
base: Linters and CI checks.
prod: Agentic reviewer with repo context retrieval, tool verification (tests/static analysis), confidence filtering and learning from developer feedback.
pipe: PR event @ git hook ; Diff and context retriever @ repo graph ; Review agent @ code LLM ; Verifier @ tests and analysers ; Comment ranker @ acceptance model ; PR comments @ bot ; Developer feedback @ labels
edge: Large PRs overflow context | superficial review | Chunked review and risk-based focus
edge: Bot hallucinated bug in correct code | a hallucinated bug comment on correct code erodes developer trust in the reviewer | Verification by tests or analysers before posting
off: Precision of posted comments (accepted rate) ; Bug-catch rate on seeded defects
on: Defects found pre-merge ; Developer mute/disable rate
gap: Counting all comments as value ; Seeded bugs unlike real ones

== test-generation-and-pr-description | Unit Test & PR Description Generation | llm-agents,nlp | seconds | foundational | a=5 k=10 s=3 t=400
obj: Generate meaningful unit tests and PR descriptions from code changes, validated by execution and coverage.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{code})+\lambda\,\mathrm{TestFailure}
con: Tests must compile and pass ; Meaningful assertions ; Flaky avoidance ; Security of code
sn: Validation | Execute tests and measure coverage and mutation score | Accept generated text | Tests that always pass are worthless
sn: Value | Mutation-detected faults not coverage | Line coverage | Coverage can be gamed by assertion-free tests
sig: Compile and pass rate | generated tests that run | Reliability | CI
sig: Mutation score | killed mutants share | Fault detection | Mutation tool
sig: Coverage delta | new covered lines | Effect | Coverage tool
noise: Test count | quantity
noise: Comment verbosity | cosmetic
base: Template-based test scaffolds.
prod: Generate-execute-repair loop with mutation testing feedback and flaky-test filters, plus change-aware PR summaries.
pipe: Code change @ PR ; Context retriever @ related code ; Test generator @ LLM ; Executor @ sandbox CI ; Repair loop @ error feedback ; Quality filter @ mutation and flakiness ; Developer review @ human
edge: Generated tests assert current buggy behaviour | bugs encoded as expected | Spec-based prompts and review of behaviour changes
edge: Tests rely on timing or network | flaky tests added | Flakiness detection runs before acceptance
off: Pass rate and mutation score ; Developer acceptance rate
on: Defects caught by generated tests ; Test maintenance cost
gap: Rewarding coverage ; Ignoring flaky outcomes

== aiops-incident-detection | AIOps Incident Detection | time-series | sub-100ms | production-grade | a=1000 k=1
obj: Detect production incidents from metrics, traces and logs within minutes, with low alert noise and clear scope.
loss: \mathcal{L}=\sum_t\left[\log\hat\sigma_t+\frac{(y_t-\hat\mu_t)^2}{2\hat\sigma_t^2}\right]
con: Millions of time series ; Seasonality ; Alert budget per team ; Explainable alerts
sn: SLO | Detect SLO burn rather than raw metric anomalies | Alert on every anomaly | Most anomalies don't affect users
sn: Seasonality | Seasonal forecasting baselines | Static thresholds | Daily and weekly cycles dominate
sig: SLI burn rate | error budget burn over multiple windows | User impact | Window choices
sig: Seasonal residual | residual vs forecast | Anomaly | Forecast quality
sig: Deploy and change events | recent deployments | Cause | Event feed
noise: Single-sample spikes | noise
noise: Host name | none
base: Static threshold alerts on CPU and latency.
prod: Multi-window SLO burn alerts plus seasonal anomaly detectors on key SLIs, correlated with change events.
pipe: Metrics stream @ Prometheus and Kafka ; Baseline forecaster @ seasonal ; Anomaly scorer @ residual stats ; SLO burn evaluator @ multi-window ; Change correlation @ deploy feed ; On-call page @ alerting ; Incident labels @ postmortems
edge: Traffic from a marketing campaign | anomaly alerts for expected load | Campaign calendar covariates
edge: Metric cardinality explosion | detectors overloaded | Cardinality limits and hierarchical aggregation
off: Detection delay at fixed false alerts ; Precision on postmortem-confirmed incidents
on: Mean time to detect ; Pages per incident
gap: Synthetic anomalies only ; Labels from alerts that fired

== microservice-root-cause-analysis | Microservice Root-Cause Analysis | graph,time-series | seconds | staff-principal | a=5 k=20
obj: Localise the root cause service or change in a microservice incident using traces, metrics and topology, cutting time to diagnosis.
loss: \mathcal{L}=\mathrm{CE}(\text{root cause},p)+\lambda\,\mathrm{GraphReg}
con: Dependency graph changes constantly ; Partial telemetry ; Explainability for on-call ; Minutes to answer
sn: Causality | Causal graph with fault propagation | Correlation of anomalies | Everything downstream of the root also looks anomalous
sn: Changes | Include deploys and config changes | Metrics only | Most incidents originate from a change
sig: Anomaly onset ordering | earliest anomaly in the call graph | Root candidate | Clock sync
sig: Trace error propagation | where errors originate in traces | Origin | Trace sampling
sig: Recent change proximity | change near the candidate | Cause | Change feed
noise: Service name | none
noise: Alert count | volume
base: On-call engineers following dashboards.
prod: Topology-aware causal ranking with trace-based error origin analysis and change correlation, summarised by an LLM with evidence links.
pipe: Alerts and telemetry @ observability stack ; Topology builder @ service graph ; Anomaly onset detector @ time series ; Causal ranker @ graph model ; Change correlator @ deploy feed ; LLM summary with evidence @ incident channel ; On-call engineer @ human
edge: Sampling drops the failing traces | sampling discards the failing traces so the origin of the error is hidden | Tail-based sampling for errors
edge: Cascading failure with retries | symptoms point at healthy services | Retry-aware propagation model
off: Top-3 root cause accuracy on past incidents ; Time to localise
on: Mean time to diagnose ; Incident duration
gap: Evaluation on injected faults only ; Postmortem labels subjective

== log-anomaly-detection | Log Anomaly Detection | nlp,time-series | sub-100ms | production-grade | a=10000 k=1
obj: Detect abnormal log patterns (new error templates, rate shifts) at scale without manual rules.
loss: \mathcal{L}=-\log p(\text{template sequence})\ \text{(next-template prediction)}
con: Billions of lines per day ; Log format drift ; Low alert noise ; Cost per GB
sn: Parsing | Template mining (Drain) then sequence models | Raw text models | Raw text is too expensive and noisy
sn: Drift | Robust to version-driven template changes | Static template sets | Deploys change templates constantly
sig: New template appearance | previously unseen templates | Novel failure | Template store
sig: Template frequency shift | rate vs baseline | Behaviour change | Baseline
sig: Sequence perplexity | next-template surprise | Abnormal flow | Model
noise: Timestamps in text | parsed out
noise: Request IDs | variable
base: Keyword alerts for ERROR logs.
prod: Online template mining with streaming novelty and frequency detectors plus a lightweight sequence model per service.
pipe: Log stream @ collectors ; Template miner @ Drain ; Frequency and novelty detectors @ streaming ; Sequence model @ per-service LSTM ; Alert aggregator @ dedup ; On-call @ human ; Feedback @ suppression rules
edge: Deploy introduces many new templates | a deploy changes log formats and produces a storm of novelty alerts | Deploy-aware grace periods and template aliasing
edge: Log volume spike from debug mode | debug logging left on explodes volume, cost and noise at the same time | Volume guardrails and sampling
off: Detection of injected failures ; Precision on incident-linked alerts
on: Incidents detected via logs first ; Alert fatigue
gap: Logs from one service only ; Labels from alert history

== alert-noise-reduction | Alert Noise Reduction & Routing | graph,tabular | sub-100ms | production-grade | a=100 k=2
obj: Deduplicate, correlate and route alerts to the right on-call, cutting pages per engineer without missing real incidents.
loss: \mathcal{L}=\mathrm{BCE}(\text{actionable},p)+\lambda\,\mathrm{ClusterPurity}
con: Never suppress true critical alerts ; Explainable suppression ; Ownership mapping ; Real-time
sn: Actionability | Learn which alerts led to action | Static severity | Many high-severity alerts are ignored
sn: Safety | Suppression with audits and never for top-severity | Aggressive auto-suppress | Silent suppression hides real incidents
sig: Historical actionability | share of past alerts acted upon | Noise | Matured labels
sig: Correlation with change events | alerts following deploys | Grouping | Feed
sig: Ownership confidence | service-to-team mapping | Routing | Catalogue
noise: Alert text | duplicates rule
noise: Host | variable
base: Static severity routing and manual muting.
prod: Actionability model with correlation grouping and ownership resolution, with a safe-suppression policy and audit reports.
pipe: Alert stream @ monitoring ; Entity and ownership resolver @ service catalogue ; Actionability model @ GBDT ; Correlator @ graph clustering ; Suppression policy @ safe rules ; On-call routing @ pager ; Feedback @ acknowledgements
edge: Suppressed alert type becomes critical | incident missed | Suppression audits and critical-class exemptions
edge: Ownership catalogue out of date | pages go to the wrong team | Ownership confidence and fallback rotation
off: Precision of suppression at zero missed critical ; Page reduction
on: Pages per on-call shift ; Mean time to acknowledge
gap: Treating un-acked alerts as noise ; Evaluating without critical-miss audit

== capacity-forecasting-and-autoscaling | Capacity Forecasting & Predictive Autoscaling | time-series,reinforcement-learning | sub-100ms | production-grade | a=1000 k=1
obj: Forecast load and scale infrastructure ahead of demand to meet SLOs at lowest cost.
loss: \mathcal{L}=\sum_t\rho_{0.95}(y_t-\hat y_t)+\lambda\,\text{cost}(\text{capacity})
con: Warm-up time of new nodes ; SLO of p99 latency ; Cost targets ; Bursty traffic
sn: Lead time | Forecast beyond the node warm-up time | Reactive CPU thresholds | Reactive scaling lags the spike
sn: Quantile | Provision to a high quantile of demand | Mean forecast | Mean provisioning misses spikes
sig: Request rate forecast | seasonal and event-aware forecast | Demand | Forecast quality
sig: Per-instance capacity curve | requests per instance at SLO | Sizing | Load tests
sig: Event calendar | launches, campaigns, holidays | Spikes | Calendar
noise: Instance ID | none
noise: CPU of single host | local noise
base: Reactive autoscaling on CPU utilisation.
prod: Probabilistic forecasts with capacity models and a cost-aware controller combining predictive and reactive scaling.
pipe: Traffic metrics @ time-series DB ; Forecaster @ quantile model ; Capacity model @ load-test curves ; Scaling controller @ predictive plus reactive ; Orchestrator @ Kubernetes ; SRE oversight @ human ; SLO outcomes @ feedback
edge: Unannounced viral traffic | forecast misses a spike | Reactive safety net and fast burst capacity
edge: Capacity curve shifts after code change | over- or under-provisioning | Continuous capacity re-estimation after deploys
off: Quantile coverage and SLO misses in simulation ; Cost vs baseline
on: SLO attainment ; Infrastructure cost per request
gap: Backtests without warm-up delays ; Ignoring code-induced capacity shifts

== cloud-cost-anomaly-finops | Cloud Cost Anomaly Detection & FinOps Forecasting | time-series,tabular | batch | foundational | a=1 k=2
obj: Detect cost spikes by service and team early and forecast spend so engineers can fix waste before the invoice.
loss: \mathcal{L}=\sum_t\rho_q(y_t-\hat y_t)
con: Billing data lag of 24h ; Tag quality ; Ownership attribution ; Commitment (RI/Savings Plan) planning
sn: Attribution | Allocate costs to owners via tags and heuristics | Account-level totals | Teams need their own spend
sn: Baselines | Usage-driven baselines (traffic-normalised) | Raw cost thresholds | Cost grows legitimately with traffic
sig: Cost per unit of traffic | spend divided by requests | Efficiency | Join
sig: New resource spikes | new instance types or services | Waste | Inventory
sig: Commitment coverage | share covered by savings plans | Optimisation | Billing
noise: Resource ID | none
noise: Invoice line text | none
base: Budget alerts on monthly totals.
prod: Traffic-normalised anomaly detection per owner with forecast bands and commitment-planning optimiser.
pipe: Billing exports @ cloud APIs ; Tag and ownership resolver @ rules and ML ; Cost per unit builder @ join ; Anomaly detector @ seasonal ; Forecast and commitment planner @ optimisation ; Team notification @ chat ; Savings outcomes @ tracking
edge: Untagged resources | resources without tags have no owner so anomalies and waste go unattended | ML-based ownership inference and enforcement
edge: Billing data delays | billing exports arrive a day late so cost anomalies are detected too late to act | Near-real-time usage metrics as early signal
off: Detection delay and precision on confirmed waste ; Forecast MAPE
on: Waste avoided ; Forecast accuracy
gap: Raw cost comparisons without traffic ; Ignoring attribution quality

== flaky-test-detection | Flaky Test Detection & Quarantine | tabular,time-series | batch | foundational | a=10 k=2
obj: Identify and quarantine flaky tests that waste CI time and erode trust, and prioritise fixes by impact.
loss: \mathcal{L}=\mathrm{BCE}(\text{flaky},p)
con: Millions of test runs per day ; Quarantine without hiding real failures ; Owner assignment ; CI cost
sn: Detection | Pass/fail inconsistency on unchanged code | Failure count | Real regressions also fail often
sn: Action | Quarantine with owner tickets and timers | Ignore or auto-retry forever | Retries hide the problem and burn CI time
sig: Flip rate on same commit | mixed outcomes on identical code | Flakiness | Run dedup
sig: Failure correlation with infra | failures concentrate on specific runners | Environment cause | Metadata
sig: Time-dependent failure pattern | failures by hour or order | Root cause | Logs
noise: Test name text | none
noise: Duration alone | weak
base: Retry failed tests up to three times.
prod: Statistical flakiness detection on repeated runs, infrastructure-correlation features, auto-quarantine with owner routing and root-cause hints.
pipe: CI results stream @ CI system ; Run deduplicator @ same-commit grouping ; Flakiness scorer @ statistics and GBDT ; Cause classifier @ rules ; Quarantine controller @ CI config ; Owner ticket @ issue tracker ; Fix verification @ re-runs
edge: Real regression looks flaky because it fails intermittently | bug hidden by quarantine | Quarantined tests still run and are tracked with deadlines
edge: Shared runner problems cause failures across many tests | wrongly blamed tests | Runner-level correlation analysis
off: Precision of flaky labels vs manual review ; Quarantine impact on CI pass rate
on: CI time wasted on retries ; Flaky test count
gap: Treating all failures as flakiness ; Not controlling for code changes

== predictive-test-selection | Predictive Test Selection | tabular,graph | seconds | production-grade | a=20 k=3
obj: Select the subset of tests most likely to fail for a code change, cutting CI time dramatically while catching nearly all regressions.
loss: \mathcal{L}=\mathrm{BCE}(\text{test fails}\mid\text{change,test})
con: Catch 99%+ of failures ; Compute budget ; Fresh test-failure history ; Always run critical suites
sn: Selection | Learn failure likelihood from change-test history | Run everything or file-path rules | Running all tests doesn't scale
sn: Safety | Periodic full runs and risk floors | Trust the model only | Silent coverage drift hides regressions
sig: File-test co-failure history | tests failing when file changed | Link | Window
sig: Change size and risk | lines, files, authors | Risk | Metadata
sig: Test historical failure rate | prior fail rate | Prior | Matured
noise: Commit message | weak
noise: Author | personal
base: Run tests mapped by directory.
prod: Gradient-boosted failure predictor with dependency-graph features, risk-based budgets and scheduled full runs for calibration.
pipe: Change event @ VCS ; Feature builder @ change and graph ; Failure predictor @ GBDT ; Selector @ budgeted top-k ; CI executor @ test runners ; Safety net @ scheduled full runs ; Outcome logging @ labels
edge: New test with no history | a brand-new test has no failure history, is never selected and its regressions escape | Exploration slots and default inclusion for new tests
edge: Large refactor touches many modules | selection misses | Risk-based fallback to broader suites
off: Recall of failing tests at budget ; CI time saved
on: Escaped regressions ; CI minutes per commit
gap: Evaluating with selected-only outcomes ; History of past selection biases data

== deployment-risk-prediction | Deployment Risk Prediction | tabular | sub-100ms | production-grade | a=5 k=3
obj: Predict the risk that a deployment causes an incident and apply stricter rollout policies (canary size, bake time) accordingly.
loss: \mathcal{L}=\mathrm{BCE}(\text{incident},p)\cdot w(\text{blast radius})
con: Decision at merge or deploy time ; Explainable factors ; Low friction ; Few incident labels
sn: Action | Risk tiers map to rollout strategies | Score without action | A risk score no one acts on is waste
sn: Labels | Link incidents to causal changes | Time-window attribution only | Co-occurring changes get blamed incorrectly
sig: Change size and files touched | diff statistics | Risk | Metadata
sig: Author-service familiarity | prior commits by author to service | Risk | History
sig: Service criticality and recent incident rate | tier and recent incidents | Blast radius | Catalogue
noise: Commit time of day | weak
noise: Branch name | none
base: Manual risk assessment and change advisory board.
prod: GBDT risk model with blast-radius weighting driving automated canary policies and extra approvals for high-risk changes.
pipe: Deploy request @ CD system ; Feature builder @ change metadata ; Risk model @ GBDT ; Rollout policy engine @ canary and bake ; Progressive delivery @ deployment tool ; Automated rollback @ metrics watch ; Incident linkage @ labels
edge: Incident attribution wrong | model learns the wrong risk drivers | Causal attribution via bisect and postmortem linkage
edge: Developers game the score by splitting changes | developers split changes into small pieces to lower the score, hiding the real aggregate risk | Aggregate risk across related changes
off: AUC and calibration for incident-causing deploys ; Risk-tier precision
on: Change failure rate ; Mean time to rollback
gap: Few labelled incidents ; Time-window attribution errors

== feature-flag-rollout-safety | Feature-Flag Progressive Rollout with Guardrails | reinforcement-learning,time-series | seconds | staff-principal | a=1 k=2
obj: Automatically ramp feature flags while monitoring guardrail metrics, rolling back at the first statistically credible harm.
loss: \max\;\text{ramp speed}\ \text{s.t. }\Pr(\text{harm}>\delta)\le\alpha\ \text{(sequential testing)}
con: Guardrail metrics across many teams ; Low false rollbacks ; Interaction between flags ; Audit trail
sn: Statistics | Sequential tests with always-valid inference | Peek at p-values | Peeking inflates false rollback rates
sn: Interaction | Detect interference between concurrent flags | Evaluate flags independently | Interacting flags confound attribution
sig: Guardrail metric deltas | error rate, latency, conversion deltas | Harm | Metric definitions
sig: Exposure balance | SRM check on exposure | Data quality | Assignment
sig: Concurrent-flag overlap | flags active on same users | Interaction | Registry
noise: Flag name | none
noise: Owner | none
base: Manual percentage increases by engineers.
prod: Automated ramp controller using sequential tests on guardrail metrics with SRM checks and interaction detection.
pipe: Flag service @ SDK ; Exposure logging @ events ; Metric computation @ stream ; Sequential tester @ always-valid ; Ramp controller @ policy ; Auto rollback @ flag service ; Rollout history @ audit
edge: Metric pipeline delay | harm detected late | Fast proxy metrics and delay-aware thresholds
edge: Novelty effect early in ramp | false positives or negatives | Longer bake times at key ramp steps
off: False rollback rate and detection power in simulation ; Time to full ramp
on: Bad-change blast radius ; Rollout time
gap: Peeking without correction ; Single-flag analysis
