# Healthcare & Life Sciences, part 7: Regulatory Compliance Intelligence (use cases 99-106) and Physician Scheduling & Coverage Intelligence (107-112)
# Outputs are leads for compliance, legal, audit and medical-group leaders. No interpretation, attestation, certification, schedule publication or contingency action happens without a named human approval.
== healthcare-regulatory-change-intelligence | Healthcare Regulatory Change Intelligence | llm-agents,nlp | batch | advanced | a=0.02 k=300 s=3 t=500
obj: Monitor approved official publications and identify changes that may apply to the organisation's jurisdiction, facility type and service lines, giving compliance experts cited change summaries, effective dates and a review queue.
sor: Approved regulatory and accreditation source feeds ; Internal policy inventory ; Facility and service-line register ; Compliance case system
up: Official regulations, guidance and accreditation standards ; Prior versions of each source ; Internal policy inventory ; Jurisdiction, facility type and service-line metadata
down: Change review queue ; Cited change summary ; Applicability candidate list ; Source freshness report
opt: Licensed legal update services ; Professional association bulletins marked as secondary
proto: Scheduled fetch from approved official sources, versioned document store with retrieval over REST, and a case workflow for compliance review
own: Compliance ; Legal ; Regulatory affairs ; Quality
con: Compliance or legal experts confirm interpretation and applicability and the system only drafts and ranks ; Only approved official sources are ingested and every summary cites source, version and date ; Source freshness is tracked and stale sources are flagged ; The system abstains where the text is unclear ; Documents are untrusted input ; Monitors 1.2K sources daily
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{source text})+\lambda\,\mathrm{Calibration}
sn: Sources | Approved official publications with version and date | Open web search | Unofficial summaries can be wrong or outdated
sn: Change | Diff against the prior version of the same source | Summary of the new text alone | Reviewers need what changed
sn: Applicability | Candidates tagged by jurisdiction, facility and service line | Final applicability decision | Legal interpretation is a human call
sn: Freshness | Source retrieval time and staleness shown | Silent use of old text | A missed update is a compliance gap
sn: Citation | Every statement links to a source span | Fluent summary | Unsupported claims mislead reviewers
sig: Text diff magnitude | semantic and structural change between versions of a requirement | Separates substantive from editorial changes | Version pairs
sig: Applicability match | overlap between requirement scope and the organisation's metadata | Ranks the review queue | Metadata as at review
sig: Effective-date proximity | days to the stated effective date | Sets urgency | Stated in the source
sig: Source authority tier | official, secondary or unofficial classification of the source | Weights confidence | Source register
noise: Press coverage volume | not authority
noise: Document length | not significance
noise: Publication layout | formatting
base: A compliance analyst reads publisher newsletters and a manual tracker.
prod: Scheduled ingestion from approved sources into a versioned store, structural and semantic change detection, hybrid retrieval and an LLM that drafts cited change summaries with applicability candidates, routed to expert review.
pipe: Source ingestion @ scheduled fetchers ; Versioned document store @ object store with lineage ; Change detector @ structural and semantic diff ; Applicability candidate ranker @ rules with embeddings ; Cited summary drafter @ LLM ; Citation and source guard @ citation verifier ; Compliance expert review @ human ; Decision and audit log @ case system
edge: Source republished with a new URL | the change looks like a new document | Source identity table with lineage
edge: Pending rule not yet effective | applicability is premature | Effective-date states and a watch status
edge: Conflicting jurisdictions | requirements differ | Show both and route to legal
edge: Injected instruction in a source page | model behaviour changes | Treat as data with no tool calls
off: Change-detection recall on seeded amendments ; Citation precision and unsupported-claim rate ; Applicability-candidate recall at the review capacity
on: Time from publication to review ; Relevant changes missed ; Reviewer time per change
gap: Using unofficial sources as authority ; Summarising without a prior-version diff ; Letting the system decide applicability
== healthcare-regulatory-change-impact-assessment | Healthcare Regulatory Change Impact Assessment | llm-agents,graph | seconds | advanced | a=0.02 k=150 s=4 t=600
obj: Translate a confirmed regulatory change into the policies, controls, facilities, workflows, systems, owners, evidence and deadlines it affects, and draft a task plan with dependencies for the compliance owner to approve.
sor: Compliance case system ; Control and policy knowledge store ; Process inventory ; Ownership directory
up: Approved change record ; Control and policy knowledge store ; Process and system inventory ; Facility scope ; Ownership directory
down: Impact map ; Draft task plan with owners and dates ; Dependency map ; Effort and risk estimate ; Completion evidence checklist
opt: Prior change projects ; Training catalogue
proto: Graph store queries, retrieval over approved documents and a task API with deterministic workflow state and an approval gate
own: Compliance ; Legal ; Operations owners ; Quality
con: The compliance owner approves scope, tasks and deadlines before any task is created ; Workflow state is deterministic and the model only proposes impacts ; Every impacted item cites its relationship and source ; Agent tools are read-only plus draft tasks ; Documents are untrusted input ; Handles roughly 400 confirmed changes per year
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{change record})+\lambda\,\mathrm{PolicyViolation}
sn: Scope | Impacts traced through explicit relationships | Free-text guess of what is affected | A missed impact is a compliance gap
sn: Plan | Draft tasks with dependencies and owners | Auto-created tasks | Owners must accept responsibility
sn: Deadlines | Deterministic dates from the effective date | Model-estimated dates | Dates are facts of the change
sn: Evidence | Completion checklist per impacted control | Closing on task completion | Proof of compliance is the goal
sn: Effort | Range with assumptions | Point estimate | Planning needs uncertainty
sig: Graph distance to the changed requirement | hops from the requirement to a policy, control or process | Ranks likely impact | Graph at assessment time
sig: Owner and facility scope | facilities and owners connected to impacted nodes | Defines who acts | Directory as at assessment
sig: Prior-change similarity | overlap with earlier changes and their actual impact | Calibrates the effort | Closed change projects
sig: Dependency order | prerequisites between tasks | Sequencing | Plan rules
noise: Change title wording | not impact
noise: Owner seniority | not scope
noise: Document formatting | layout
base: A compliance lead builds an impact list in a spreadsheet after a meeting.
prod: Graph traversal over controls, policies, processes and facilities, retrieval for clause-level matching, and an LLM planner that drafts tasks through typed tools into a deterministic workflow with an approval gate.
pipe: Confirmed change intake @ case system ; Impact graph traversal @ graph store ; Clause-level matcher @ retrieval ; Task plan drafter @ LLM with typed tools ; Permission and policy guard @ tool allow-list ; Compliance owner approval @ human ; Workflow activation and audit @ task system
edge: Stale knowledge graph | impacts are missed | Graph freshness checks and a manual scope review
edge: Change affects only some facilities | scope is too broad | Facility scope rules and owner confirmation
edge: Conflicting owner records | tasks go to the wrong person | Directory reconciliation and a fallback owner
edge: Injected instruction in a change record | the planner is steered into unapproved tool use | Allow-listed tools and content isolation
off: Impact recall and precision against expert-built impact maps ; Task-plan acceptance rate ; Deadline accuracy
on: Time to approved implementation plan ; Missed impacts found late ; Planning effort per change
gap: Auto-creating tasks without approval ; Letting the model compute dates ; Trusting an outdated graph
== healthcare-compliance-evidence-collection-automation | Healthcare Compliance Evidence Collection Automation | llm-agents,nlp | batch | advanced | a=0.02 k=200 s=4 t=400
obj: Gather, classify, validate and organise the evidence that audits, accreditation and regulatory reviews require, so control owners attest to a complete, time-stamped binder instead of assembling it by hand.
sor: Control catalogue and evidence requirements ; Document repositories ; System report generators ; Ownership directory
up: Control catalogue ; Evidence requirements per control ; Documents and system reports ; Audit period ; Control owners
down: Evidence binder ; Control-to-evidence map ; Freshness and completeness status ; Exception list
opt: Prior audit binders ; Auditor request lists
proto: Connectors to document repositories and report systems, document AI for classification and a binder service that stores immutable references and timestamps
own: Compliance ; Internal audit ; Control owners ; IT
con: Control owners attest evidence and the agent never fabricates, edits or backfills missing proof ; Each item keeps an immutable reference, retrieval time and source system ; Freshness is checked against the audit period ; Gaps are listed as exceptions and not filled ; Agent permissions are read-only ; Collects for 6K controls per audit cycle
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{artifact})+\lambda\,\mathrm{PolicyViolation}
sn: Provenance | Immutable reference with timestamp and source | Copied file | A copy cannot prove where it came from
sn: Mapping | Evidence linked to a specific control requirement | Folder of documents | Auditors test one control at a time
sn: Gaps | Missing evidence listed as an exception | Placeholder or inferred proof | Fabricated proof is a serious violation
sn: Freshness | Evidence date compared to the audit period | Any document accepted | Out-of-period evidence fails an audit
sn: Attestation | Owner confirms each item | Agent self-certifies | Accountability stays with owners
sig: Requirement match score | match between an artifact and the evidence requirement | Primary mapping signal | Reviewed mappings
sig: Evidence age versus period | evidence date against the audit window | Freshness check | Document metadata
sig: Completeness ratio | share of requirements with accepted evidence per control | Readiness view | Binder state
sig: Source reliability | system-generated versus manually uploaded | Weights trust | Source register
noise: File name | unreliable label
noise: Folder depth | storage artefact
noise: Uploader seniority | not evidence quality
base: Control owners email documents to the audit coordinator before an audit.
prod: Connectors to approved repositories and report systems, document classification and requirement matching, deterministic freshness and completeness checks, and an agent that assembles the binder with immutable references and routes items for owner attestation.
pipe: Requirement and owner intake @ control catalogue ; Evidence connectors @ read-only repository and report APIs ; Document classifier and matcher @ document AI ; Freshness and completeness checker @ deterministic rules ; Binder assembler agent @ typed tools ; Control owner attestation @ human ; Immutable binder and audit log @ evidence store
edge: Evidence exists only in a person's mailbox | the connector cannot see it | Exception listed and a manual route
edge: Document supersedes an earlier one | wrong version used | Version rules and a latest-approved check
edge: Redacted document | the match is unclear | Reviewer prompt and a confidence flag
edge: Injected instruction in a document | agent attempts an action | Read-only tools and content isolation
off: Mapping precision and recall against owner-confirmed links ; Freshness-check accuracy ; Share of binder items accepted by auditors
on: Audit preparation hours ; Evidence requests answered first time ; Exceptions found before the audit
gap: Letting the agent fill missing evidence ; Accepting out-of-period documents ; Mapping by file name
== healthcare-compliance-control-effectiveness-prediction | Healthcare Compliance Control Effectiveness Prediction | tabular,time-series | batch | advanced | a=0.1 k=2
obj: Identify controls with a rising likelihood of failure using overdue tests, exceptions, incidents and evidence quality, and give risk owners a ranked queue with the contributing signals and a recommended next test.
sor: Control testing and GRC system ; Incident and exception records ; Remediation tracker ; Evidence repository
up: Control tests and results ; Exceptions and waivers ; Remediation history ; Audit findings ; Evidence age ; Process events
down: Control risk queue ; Next-test recommendation ; Owner notification ; Risk trend dashboard
opt: Process mining outputs ; Training completion records
proto: Warehouse extracts from the GRC system and a scoring API with a worklist; deterministic control rules run beside the model
own: Compliance ; Risk management ; Internal audit ; Control owners
con: Compliance and risk owners validate ratings and remediation and the score never changes a control rating itself ; Deterministic rules for overdue tests and open exceptions run first ; Every score shows the contributing signals ; Calibrated probabilities with confidence ; Scores 25K controls weekly ; No individual is scored
sn: Rules | Overdue test and open exception rules as hard flags | Model score for known failures | A known failure needs no prediction
sn: Outcome | Control failure within a horizon with censoring | Current rating | Ratings lag the real state
sn: Signals | Test, exception, incident and evidence signals shown | Score only | Owners need reasons
sn: Timing | Recommended next test date | Fixed annual cycle | Risky controls need earlier tests
sn: Authority | Owner validates the rating | Automatic downgrade | Ratings carry audit meaning
sig: Days overdue for testing | days past the planned test date | A direct risk signal | Test schedule
sig: Recent exception rate | exceptions and waivers per period for the control | Trend toward failure | Earlier periods
sig: Evidence staleness | age of the latest accepted evidence | Weak evidence predicts failure | At scoring
sig: Related incident count | incidents linked to the control's process | Operational evidence | Earlier periods
noise: Control description wording | not risk
noise: Owner tenure | not a control factor
noise: Control identifier | label
base: Annual control rating by self-assessment.
prod: Deterministic control rules plus a discrete-time survival and gradient-boosted model over test, exception, incident and evidence features, with signal explanations and a next-test recommender.
pipe: Control and event intake @ GRC extracts ; Control rules @ deterministic checks ; Failure risk model @ discrete-time survival ; Signal explainer @ feature attribution ; Next-test scheduler @ capacity-aware ranking ; Risk owner validation @ human ; Outcome and audit log @ lakehouse
edge: New control | no test history to estimate failure risk from | Category prior and a low-confidence flag
edge: Control redesigned | history no longer applies | Version reset with lineage
edge: Test results delayed | the signal is stale | Data freshness flag
edge: Shared control across processes | failure is counted twice | Control-level aggregation
off: Concordance index and time-dependent AUC at 90 and 180 days ; Precision at the review capacity ; Calibration of failure probabilities
on: Failures caught before an audit finding ; Test effort focused on at-risk controls ; Time from risk rise to owner action
gap: Predicting failures that rules already show ; Training on current ratings ; Scoring individuals
== healthcare-compliance-obligation-mapping | Healthcare Compliance Obligation Mapping | graph,nlp | batch | advanced | a=0.05 k=300
obj: Map regulatory obligations to the policies, controls, procedures, systems, owners, facilities and evidence that address them, and show uncovered obligations, conflicting policies and evidence gaps in a traceable obligation graph.
sor: Approved regulatory source store ; Policy management system ; Control framework ; Process and system catalogue
up: Authoritative requirements ; Internal policies and procedures ; Control framework ; Process and system catalogue ; Organisation structure
down: Obligation graph ; Uncovered-obligation list ; Policy conflict list ; Evidence-gap list ; Mapping review queue
opt: Prior mapping workbooks ; Accreditation crosswalks
proto: Citation-grounded extraction into a graph store, a mapping review workbench and read APIs over the graph
own: Compliance ; Legal ; Policy owners ; Internal audit
con: Legal or compliance experts confirm every mapping and every applicability decision ; Each edge cites the source span and policy or control reference ; Extraction runs from approved sources only ; Unmapped obligations are shown and never inferred as covered ; Maps 40K requirements against 12K policy and control statements ; Edges are versioned with the source version
loss: \mathcal{L}=-\sum_{(r,c)}\log\frac{e^{s(r,c)/\tau}}{\sum_{c'}e^{s(r,c')/\tau}}
sn: Edges | Requirement-to-control edges with source citations | Similarity list | Auditors need a defensible link
sn: Coverage | Uncovered requirements listed | Assumed coverage | A hidden gap is a compliance risk
sn: Conflicts | Policies that contradict each other flagged | Single-policy view | Conflicts cause inconsistent practice
sn: Confirmation | Experts confirm each mapping | Automatic mapping | Applicability is a legal judgment
sn: Versioning | Edges tied to source and policy versions | Current-state map only | Past audits need the map as it was
sig: Semantic match score | similarity between requirement text and policy or control statement | Proposes candidate edges | Embedding and cross-encoder
sig: Terminology and scope overlap | shared defined terms, facility types and service lines | Reduces false links | Extracted metadata
sig: Existing confirmed edges | previously confirmed mappings for similar requirements | Supervises ranking | Earlier mapping rounds
sig: Owner and system linkage | owners and systems already tied to a control | Completes the graph | Directory as at mapping
noise: Policy title | not content
noise: Requirement numbering style | layout
noise: Document author | not coverage
base: A compliance analyst keeps a crosswalk spreadsheet by hand.
prod: Citation-grounded extraction of obligations, candidate-edge retrieval and cross-encoder ranking, a graph store with versioned edges, rule checks for conflicts and coverage, and a reviewer workbench.
pipe: Source and policy intake @ approved stores ; Obligation extractor @ document AI with spans ; Candidate edge retriever @ embedding search ; Mapping ranker @ cross-encoder ; Obligation graph builder @ graph store ; Compliance expert confirmation @ human ; Graph versioning and audit @ graph store
edge: Requirement split across several clauses | the mapping is partial | Requirement grouping and a review prompt
edge: Policy retired | edges point to nothing | Lifecycle states and an orphan report
edge: Same word different meaning | false edges link unrelated requirements and policies | Defined-term checks and a reviewer prompt
edge: Rare obligation type | ranker is uncertain | Abstain and route
off: Recall at ten of confirmed mappings ; Edge precision after expert review ; Uncovered-obligation detection recall
on: Mappings confirmed per expert hour ; Uncovered obligations found before audit ; Policy conflicts resolved
gap: Treating similarity as coverage ; Mapping to retired policies ; Skipping expert confirmation
== healthcare-audit-readiness-prediction | Healthcare Audit Readiness Prediction | tabular,time-series | batch | advanced | a=0.1 k=3
obj: Estimate readiness for a defined audit or accreditation scope and identify the unresolved gaps before the audit date, with a transparent score that is never presented as a certification.
sor: GRC and audit management system ; Evidence repository ; Findings and remediation tracker ; Ownership directory
up: Audit criteria and scope ; Control tests ; Evidence completeness and freshness ; Open findings ; Remediation deadlines ; Owners
down: Readiness report by scope ; Blocker list ; Evidence gap list ; Prioritised action plan
opt: Prior audit outcomes ; Mock audit results
proto: Warehouse extracts from GRC and evidence systems and a scoring API with a dashboard; weighted rules compute the score
own: Compliance ; Internal audit ; Quality ; Control owners
con: The audit or compliance leader signs off readiness and the score is never a certification or a prediction of an audit result ; Transparent weighted rules are the base and the model only estimates the chance of unresolved gaps ; Each score shows its blockers and the evidence behind them ; Confidence is stated ; Refreshes daily for 20 scopes in the run-up to audits
sn: Score | Transparent weights over criteria status | Opaque model output | Leaders must see and own the weights
sn: Blockers | Items that would fail the criterion listed first | Average readiness | A single blocker can fail an audit
sn: Confidence | Evidence freshness and completeness shown | One number | A score on stale evidence misleads
sn: Prediction | Chance that open gaps close before the audit | Readiness as a pass forecast | The auditor decides the outcome
sn: Sign-off | Leader confirms readiness | Automatic status | Accountability stays with the leader
sig: Criteria completion share | share of criteria with accepted evidence and passing tests | The core readiness measure | Status at scoring
sig: Open findings by severity and age | unresolved findings weighted by severity and days open | Direct risk | Findings tracker
sig: Remediation on-time rate | share of past remediation actions closed on schedule | Predicts whether gaps close | Earlier periods
sig: Days to audit | time left to the audit date | Sets urgency | Audit calendar
noise: Audit team size | not readiness
noise: Binder page count | volume
noise: Owner seniority | not a factor
base: A readiness checklist reviewed in a monthly meeting.
prod: A transparent weighted readiness score per scope and criterion, a calibrated model for the likelihood that open gaps close by the audit date, a blocker list with evidence links and a sign-off workflow.
pipe: Audit scope and status intake @ GRC extracts ; Criteria status calculator @ weighted rules ; Gap closure model @ gradient boosting with calibration ; Blocker and evidence gap builder @ rules ; Action prioritiser @ ranking ; Audit leader sign-off @ human ; Readiness history and audit log @ lakehouse
edge: Criteria change mid-cycle | scores are not comparable | Criteria version and a restatement
edge: Evidence uploaded late | readiness jumps | Freshness and review status in the score
edge: Scope overlaps between audits | work is double counted | Shared-control handling
edge: Owner absence | remediation stalls | Owner availability flag
off: Rank correlation of readiness with realised audit findings ; Calibration of gap-closure probabilities ; Blocker recall on mock audits
on: Findings at audit versus the forecast ; Gaps closed before the audit date ; Preparation effort per scope
gap: Presenting readiness as certification ; Using opaque weights ; Scoring on stale evidence
== healthcare-compliance-remediation-prioritization | Healthcare Compliance Remediation Prioritization | reinforcement-learning,tabular | batch | advanced | a=0.1 k=3
obj: Prioritise remediation across findings by severity, likelihood, deadline, patient and operational exposure, recurrence and effort, and give the risk owner a ranked backlog, a sequence and resource scenarios.
sor: GRC and findings tracker ; Risk taxonomy ; Project and resource management system ; Ownership directory
up: Findings and severity ; Risk taxonomy ; Deadlines and dependencies ; Owners ; Effort estimates ; Resource capacity
down: Ranked remediation backlog ; Sequencing plan ; Overdue forecast ; Resource scenario comparison
opt: Prior remediation outcomes ; Audit calendar
proto: Warehouse extracts, a priority-rule service and an optimiser with a scenario API and a planning worklist
own: Compliance ; Risk management ; Operations owners ; Internal audit
con: The risk owner approves prioritisation and any accepted residual risk ; Deterministic priority rules for severe patient-safety and legal-deadline findings sit above the optimiser ; Dependencies and capacity are hard constraints ; Plans show each constraint that binds ; Prioritises 15K open findings monthly ; Scenarios state their assumptions
loss: \max\;\sum_f x_f\,\text{risk reduction}_f\quad\text{s.t. capacity, dependency and deadline constraints}
sn: Rules | Severe and deadline-bound findings first by rule | Optimiser decides everything | Some findings cannot be traded off
sn: Objective | Risk reduction per effort across several objectives | Severity rank only | Large cheap fixes are missed
sn: Dependencies | Prerequisite tasks as hard constraints | Independent items | Work order matters
sn: Residual risk | Owner accepts what is not remediated | Silent deferral | Deferral is a risk decision
sn: Scenarios | Capacity what-ifs with overdue forecasts | One plan | Leaders need to compare trade-offs
sig: Severity and likelihood | rated severity and the estimated chance of recurrence or harm | Core risk measure | Rating version
sig: Deadline slack | days to the commitment less estimated effort time | Urgency | Plan data
sig: Recurrence history | whether similar findings have repeated | Systemic risk | Findings history
sig: Effort and capacity | estimated effort against team capacity | Feasibility | Capacity calendar
noise: Finding title | wording
noise: Reporter identity | not risk
noise: Ticket age alone | not risk
base: Findings are worked in the order they were logged.
prod: A deterministic priority rule layer for severe and deadline-bound findings, then a multi-objective optimiser over risk reduction, effort and capacity with dependency constraints and a scenario engine for overdue forecasts.
pipe: Findings and capacity intake @ GRC and project extracts ; Priority rules @ deterministic policy ; Constraint builder @ dependency and capacity model ; Multi-objective optimizer @ MILP solver ; Scenario and overdue forecaster @ simulation ; Risk owner approval @ human ; Plan and outcome log @ lakehouse
edge: New severe finding mid-cycle | the plan is stale | Re-plan with the rule layer first
edge: Shared remediation fixes several findings | benefit is counted once | Grouped actions
edge: Capacity changes | the plan is infeasible | Re-run with updated capacity
edge: Contested severity rating | the order changes | Rating override log and a sensitivity view
off: Risk reduction against the best plan in hindsight ; Rule-layer violations ; Overdue forecast error
on: Overdue findings ; Risk reduced per unit of effort ; Share of recurring findings
gap: Letting the optimiser override severe-finding rules ; Ignoring dependencies ; Treating deferral as free
== healthcare-compliance-policy-drift-detection | Healthcare Compliance Policy Drift Detection | nlp,tabular | batch | advanced | a=0.1 k=3
obj: Detect divergence between approved policies and the procedures, system configurations, training and operational records actually in use, and give policy owners candidate drift with evidence, affected control and severity.
sor: Policy management system ; Process documentation repository ; Configuration management and system exports ; Training and audit records
up: Versioned policies ; Process documentation ; Configuration snapshots ; Training records ; Audit evidence and event logs
down: Drift candidate list ; Affected process and control ; Evidence pack ; Policy owner review task
opt: Process mining outputs ; Prior audit findings
proto: Policy and document extraction, configuration snapshot ingestion and a rules service with a review worklist
own: Compliance ; Policy owners ; IT governance ; Operations owners
con: The policy owner validates drift and approves any policy or process change ; Semantic comparison proposes candidates and configuration rules decide measurable mismatches ; Each candidate cites the policy text and the observed evidence ; Severity follows an approved scale ; Compares 8K policies against operational records monthly ; Employee-level activity is aggregated and never used to name individuals
sn: Comparison | Policy text against procedure text and observed records | Policy text alone | Drift is a gap between two things
sn: Rules | Configuration checks for measurable requirements | Semantic judgment for settings | A setting either matches or it does not
sn: Evidence | Both sides cited for every candidate | Score only | Owners need to see the difference
sn: Severity | Approved severity scale | Similarity distance | Distance is not risk
sn: Authority | Owner decides whether policy or practice changes | Automatic policy edit | Policies are approved documents
sig: Semantic divergence | distance between policy statements and procedure statements | Finds text drift | Version pair
sig: Configuration mismatch | observed setting against the required value | Finds measurable drift | Snapshot time
sig: Training coverage gap | share of in-scope staff trained on the current version | Practice drift risk | Training records
sig: Process variant frequency | share of cases that follow a path outside the documented process | Observed deviation | Event logs
noise: Document formatting | layout
noise: Author name | not drift
noise: Policy length | not risk
base: A periodic manual comparison of policies against procedures.
prod: Semantic comparison of policy and procedure text, configuration rules against snapshots, process-variant analysis on event logs and a severity classifier, combined into a reviewed drift list.
pipe: Policy and record intake @ document and configuration extracts ; Policy statement extractor @ document AI ; Semantic comparator @ embeddings and cross-encoder ; Configuration rule checks @ deterministic rules ; Process variant detector @ process mining ; Policy owner review @ human ; Review outcome and audit @ case system
edge: Policy updated but procedures lag | expected drift is flagged as a finding | Effective-date grace period
edge: Intended local variation | approved differences are flagged as false drift | Approved exception register
edge: Snapshot unavailable | a setting is unknown | Unknown status instead of pass
edge: Ambiguous policy wording | comparison is unclear | Route to the owner for clarification
off: Drift precision at the review capacity ; Recall on seeded drift ; Severity agreement with owners
on: Drift found before an audit finding ; Time to policy or process correction ; Owner time per review
gap: Treating text distance as risk ; Reporting unknown settings as compliant ; Naming individuals in drift output
== physician-demand-coverage-forecasting | Physician Demand & Coverage Forecasting | time-series,tabular | batch | advanced | a=0.5 k=3
obj: Forecast physician coverage requirements by specialty, facility, clinic, shift and service line, with uncertainty and shortage risk, so medical group leaders can plan coverage ahead of demand.
sor: Scheduling and appointment system ; Procedure and OR scheduling system ; Census and admissions feed ; Physician roster and coverage policy
up: Appointment and procedure demand ; Census ; Referral trends ; Service calendars ; Physician availability ; Coverage policy
down: Coverage demand forecast ; Shortage risk by specialty and site ; Scenario plan ; Leadership dashboard
opt: Seasonal illness indices ; Local event calendars
proto: Warehouse extracts from scheduling and census systems, a forecasting service with a REST API and a planning dashboard
own: Medical group leadership ; Clinical operations ; Physician scheduling office ; Finance
con: Medical group leaders approve coverage plans and the forecast never changes a schedule ; Hierarchical reconciliation across specialty, site and shift keeps totals consistent ; Forecasts state intervals and the drivers ; Minimum coverage policy applies as a hard rule ; Forecasts 15K specialty-site-shift series nightly ; Individual physicians are not forecast
loss: \mathcal{L}=\sum_{t}\left[\tau\,(y_t-\hat y_t)_+ +(1-\tau)\,(\hat y_t-y_t)_+\right]
sn: Hierarchy | Reconciled forecasts across specialty, site and shift | Independent series | Totals disagree across levels
sn: Drivers | Appointment, procedure, census and referral drivers | History only | Demand shifts follow upstream signals
sn: Uncertainty | Quantile forecasts | Point forecast | Coverage planning needs shortage risk
sn: Policy | Minimum coverage rules applied after the forecast | Forecast as the plan | A forecast is not a staffing decision
sn: Authority | Leaders approve | Auto-adjusted schedule | Coverage plans have contractual effects
sig: Booked and referred demand | appointments and referrals already scheduled | Leading indicator of workload | Snapshot at forecast time
sig: Seasonality and calendar | holidays, school terms and service calendars | Regular demand cycles | Calendar tables
sig: Census and admission trend | recent inpatient census and admissions | Drives inpatient coverage | Earlier periods
sig: Available physician capacity | rostered availability and leave | Shortage risk needs supply | Roster snapshot
noise: Individual physician identity | not a demand driver
noise: Clinic naming | label
noise: Appointment booking channel | not workload
base: Next quarter coverage is copied from the same quarter last year.
prod: A hierarchical probabilistic forecaster over appointment, procedure, census and referral drivers, reconciled across specialty, site and shift, with a rules layer for minimum coverage and a scenario view.
pipe: Demand and roster intake @ warehouse extracts ; Feature builder @ point-in-time features ; Hierarchical forecaster @ gradient boosting with quantiles ; Reconciliation @ hierarchical reconciliation ; Coverage rules and shortage risk @ policy rules ; Medical group leader approval @ human ; Forecast and outcome log @ lakehouse
edge: New clinic or service line | no demand history to forecast coverage from | Peer prior and a low-confidence flag
edge: Demand spike from an outbreak | history breaks and coverage is under-forecast | Event driver and a manual override with a log
edge: Roster not yet final | supply is uncertain | Scenario ranges
edge: Holiday timing shifts | seasonality is wrong | Calendar tables by year
off: Weighted quantile loss and coverage of prediction intervals ; Hierarchical consistency error ; Shortage-risk precision at the review capacity
on: Coverage gaps found in advance ; Locum and overtime spend ; Share of plans approved without rework
gap: Evaluating on random splits ; Ignoring reconciliation ; Treating the forecast as the schedule
== physician-on-call-rotation-optimization | Physician On-Call & Call-Rotation Optimization | reinforcement-learning,tabular | batch | advanced | a=0.1 k=3
obj: Build equitable, compliant on-call rotations that meet specialty coverage, availability, rest and contractual requirements, with a constraint proof and a log of every manual override.
sor: Physician roster and privileges system ; Leave and availability records ; Call rules and contracts register ; Scheduling system
up: Physician roster ; Specialty and privileges ; Availability and leave ; Call rules ; Fairness history ; Facility coverage requirements
down: Draft rotation plan ; Fairness metrics ; Constraint proof ; Manual override log
opt: Preference windows ; Prior rotation outcomes
proto: Roster and rules extracts, a constraint solver service with a REST API and a schedule editor for leadership review
own: Medical group leadership ; Physician scheduling office ; Medical staff office ; Legal
con: Physician leadership approves and publishes every rotation and the solver only proposes ; Coverage, privileges, rest and contract rules are hard constraints with a proof of satisfaction ; Fairness is measured against comparable groups and reported ; Solver status and gap are reported ; Plans 1.2K physicians across 60 specialty rotations per cycle ; Physician-level data is restricted to scheduling roles
loss: \min\;\sum_p \text{burden}_p^2+\mu\sum_p \text{rule violation}_p\quad\text{s.t. coverage, rest and privilege constraints}
sn: Constraints | Coverage, rest, privilege and contract rules as hard constraints | Soft penalties for rule breaks | A rule break can be a safety or contract breach
sn: Fairness | Burden distribution within comparable groups | Equal counts across all | Different FTE and exceptions change fair shares
sn: Proof | Constraint satisfaction report | Plan only | Leaders must verify compliance
sn: Overrides | Manual changes logged with reasons | Silent edits | Overrides need an audit trail
sn: Authority | Leaders approve and publish | Auto-publish | Schedules affect people and patient coverage
sig: Availability and leave | blocked dates and leave per physician | Defines feasibility | Roster snapshot
sig: Privileges and specialty | procedures and sites a physician may cover | Eligibility for each slot | Privilege register
sig: Burden history | nights, weekends and holidays worked in recent cycles | Fair allocation | Closed cycles
sig: Rest and contract rules | minimum rest and maximum call per period | Hard limits | Rule version
noise: Physician seniority alone | not a rule
noise: Request submission time | process artefact
noise: Prior plan layout | format
base: A scheduler builds the rotation in a spreadsheet each quarter.
prod: A constraint-programming and mixed-integer optimiser that treats coverage, privilege, rest and contract rules as hard constraints, minimises burden dispersion within comparable groups and emits a constraint proof and override log.
pipe: Roster and rules intake @ scheduling extracts ; Constraint builder @ rule compiler ; Rotation optimizer @ CP-SAT and MILP ; Fairness and proof reporter @ rule checker ; Scheduler and leadership review @ human ; Publication and notification @ scheduling system ; Override and outcome log @ lakehouse
edge: Infeasible coverage | no rotation satisfies all rules | Show the binding rules and options for leadership
edge: Mid-cycle leave | the plan breaks | Re-plan with frozen assignments
edge: Privilege change | a physician becomes ineligible | Privilege register as a live constraint
edge: Contested fairness group | metrics differ depending on who is compared | Group definition owned by leadership
off: Hard-constraint violations (must be zero) ; Burden dispersion within groups ; Solver gap and time to feasible
on: Coverage gaps ; Share of rotations published without manual rework ; Physician-reported fairness
gap: Soft-penalising a rest rule ; Publishing without approval ; Using total call counts as fairness
== physician-availability-schedule-conflict-detection | Physician Availability & Schedule Conflict Detection | time-series,tabular | batch | advanced | a=0.5 k=3
obj: Detect overlapping clinic, operating room, call, telehealth and multi-facility commitments, including travel-time infeasibility, and propose resolutions with the affected appointments and coverage.
sor: Clinic scheduling system ; OR scheduling system ; Call and telehealth schedules ; Facility location and travel-time tables
up: Clinic, OR, call and telehealth schedules ; Facility locations ; Appointment and procedure durations ; Travel times ; Privileges ; Availability
down: Conflict queue with type and severity ; Proposed resolution ; Affected appointments and coverage list ; Scheduling office worklist
opt: Leave records ; Prior conflict resolutions
proto: Schedule event feeds and extracts, a temporal and spatial rules service and a worklist for the scheduling office
own: Physician scheduling office ; Clinical operations ; Medical staff office ; Access centre
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: The scheduling office confirms every change and any patient communication ; Conflicts are found by deterministic temporal and spatial checks and not by a model ; Resolutions are proposals that list affected appointments ; Travel-time assumptions are shown ; Checks 60K scheduled commitments per day ; Schedules are read-only to the detector
sn: Detection | Deterministic overlap and travel-time checks | Learned conflict classifier | Conflicts are logical facts
sn: Travel | Facility travel times with buffers | Same-day assumption | Two sites an hour apart cannot both be served
sn: Severity | Impact on patients and coverage | Conflict count | A cancelled surgery outweighs a clinic overlap
sn: Resolution | Proposal with affected items | Auto-reschedule | Changes affect patients
sn: Cross-system view | Merged events across systems | One system at a time | Conflicts span clinic, OR and call
sig: Overlap duration | minutes of overlap between commitments | Defines the conflict | Event times
sig: Travel infeasibility margin | travel time plus buffer against the gap between commitments | Detects impossible moves | Travel-time table version
sig: Privilege and site eligibility | whether the physician may practise at the site | Invalid assignments | Privilege register
sig: Affected patient volume | appointments and procedures touched by the conflict | Severity ranking | Schedule snapshot
noise: Commitment title | label
noise: Entry time | process artefact
noise: Physician seniority | not a conflict factor
base: Schedulers find conflicts when physicians or patients complain.
prod: A temporal and spatial rules engine over merged schedule events with travel-time modelling, event correlation across systems and a severity ranker, producing conflict records with proposed fixes for the scheduling office.
pipe: Schedule event intake @ scheduling feeds ; Event normaliser and merger @ identity and time rules ; Temporal and spatial conflict checker @ deterministic rules ; Severity ranker @ gradient boosting ; Fix proposer @ rules ; Scheduling office review @ human ; Change and outcome log @ scheduling system
edge: Time zone difference between systems | false overlaps appear between systems | Single time standard on ingest
edge: Telehealth from a remote site | travel rules do not apply | Location type rules
edge: Cancelled but not removed event | phantom conflict | Event status in the checks
edge: Recurring series with exceptions | the pattern is misread | Series expansion with exception handling
off: Conflict detection precision and recall on audited schedules ; Severity agreement with the scheduling office ; Time from schedule change to detection
on: Conflicts found before patients are affected ; Cancelled or delayed appointments from conflicts ; Scheduler time per conflict
gap: Using a model for logical conflicts ; Ignoring travel time ; Rescheduling without office confirmation
== specialty-coverage-risk-prediction | Specialty Coverage Risk Prediction | tabular,time-series | batch | advanced | a=0.1 k=3
obj: Predict specialty service gaps caused by demand spikes, leave, vacancies, credential status or schedule fragility, with the likely cause and contingency options for clinical operations to validate.
sor: Coverage roster and scheduling system ; Leave and vacancy records ; Privilege and credential records ; Demand and census feeds
up: Coverage roster ; Specialty demand ; Leave ; Vacancies ; Privileges and credential status ; Call schedules ; Historical gap events
down: Risk by specialty, site and time ; Likely cause ; Contingency option list ; Clinical operations worklist
opt: Locum agency availability ; Transfer agreements
proto: Warehouse extracts, a scoring API and a rules service for minimum coverage with a clinical operations dashboard
own: Clinical operations ; Medical group leadership ; Physician scheduling office ; Medical staff office
con: Clinical operations validates contingency actions and the model never changes a schedule or contacts a physician ; Minimum coverage rules are deterministic and the model estimates the chance of a breach ; Each risk shows its cause and evidence ; Scores 3K specialty-site-week combinations daily ; Physician-level detail is restricted
sn: Rules | Minimum coverage as a deterministic check | Model-only risk | A known shortfall needs no prediction
sn: Cause | Demand, leave, vacancy, credential or fragility cause shown | Single risk score | Different causes need different contingencies
sn: Fragility | Coverage depth and single points of failure | Roster count | One absence can break a thin roster
sn: Horizon | Risk by future week | Today's status only | Contingency needs lead time
sn: Action | Options listed for validation | Automatic call-in | Contacting physicians has costs and rules
sig: Coverage depth | qualified physicians available per slot beyond the minimum | Fragility measure | Roster snapshot
sig: Demand-to-capacity ratio | forecast demand against available capacity | Spike risk | Forecast snapshot
sig: Credential and privilege expiry | upcoming expirations of those who cover | Hidden supply loss | Credential records
sig: Historical gap frequency | past gaps for the specialty and site | Base rate | Earlier periods
noise: Specialty name | label
noise: Roster file format | artefact
noise: Physician seniority | not a driver
base: Coverage gaps are discovered by the scheduling office as they appear.
prod: A deterministic minimum-coverage check plus a calibrated gradient-boosted model of future gap probability by specialty, site and week, with a cause classifier and a contingency option list.
pipe: Roster, leave and demand intake @ warehouse extracts ; Minimum coverage rules @ deterministic checks ; Gap risk model @ gradient boosting with calibration ; Cause classifier @ rules and attribution ; Contingency option builder @ rules ; Clinical operations validation @ human ; Outcome and audit log @ lakehouse
edge: Rare specialty with few gaps | the model has little data | Specialty-group prior and a low-confidence flag
edge: Late leave request | coverage risk jumps with little lead time | Event-driven re-score
edge: Credential lapse | supply drops without notice | Credential feed with early warning
edge: Shared coverage across sites | the gap is counted twice | Site-level aggregation rules
off: PR-AUC and precision at the review capacity ; Lead time of correct gap warnings ; Calibration of gap probabilities
on: Gaps avoided or mitigated ; Locum and overtime spend ; Hours of uncovered service
gap: Predicting shortfalls that rules show ; Random splits ; Contacting physicians from a score
== physician-schedule-fairness-analytics | Physician Schedule Fairness Analytics | tabular | batch | advanced | a=0.1 k=3
obj: Measure how nights, weekends, holidays, call burden, undesirable shifts and workload are distributed across comparable physician groups, and show disparities and what-if adjustments to leaders.
sor: Scheduling system ; Physician roster and group membership ; Approved exceptions register ; Workload definitions
up: Published and actual schedules ; Group membership ; FTE ; Availability ; Approved exceptions ; Workload definitions
down: Fairness metrics ; Distribution analysis ; Disparity report ; Scenario comparison
opt: Preference data ; Prior adjustment decisions
proto: Warehouse extracts, an analytics service and a leadership dashboard with restricted access
own: Medical group leadership ; Physician scheduling office ; Physician wellbeing lead ; HR
con: Leaders interpret context and approve adjustments and the analytics make no employment decision ; Comparisons are within groups defined by leadership and adjusted for FTE and approved exceptions ; Sensitive employment and demographic data are restricted and aggregated where small groups could identify a person ; Metrics are defined and versioned ; Analyses 1.2K physicians per cycle ; Suggestions are what-ifs and never changes to a schedule
sn: Groups | Leadership-defined comparable groups | One pool | Specialties differ in call burden
sn: Adjustment | FTE and approved exceptions applied | Raw counts | A part-time physician carries fewer shifts fairly
sn: Metrics | Several defined measures of burden | Single total | Nights and holidays weigh differently
sn: Privacy | Small groups aggregated | Individual league table | Ranking colleagues invites harm
sn: Suggestions | Constrained what-ifs for leaders | Automatic rebalancing | Fairness needs context
sig: Burden index | weighted count of nights, weekends, holidays and call per FTE | Core fairness measure | Actual schedule
sig: Dispersion within group | spread of the burden index in a comparable group | Shows disparity | Closed cycles
sig: Exception-adjusted share | burden after approved exceptions | Fair comparison | Exceptions register
sig: Persistence across cycles | repeat high burden for the same person or group | Chronic disparity | Several cycles
noise: Physician name | not a fairness factor
noise: Schedule layout | format
noise: Tenure | not defined burden
base: A scheduler compares call counts in a spreadsheet when a complaint arrives.
prod: Defined burden metrics adjusted for FTE and approved exceptions, within-group dispersion and persistence analysis with small-group suppression, and a constrained what-if optimiser for leaders.
pipe: Schedule and roster intake @ warehouse extracts ; Burden metric builder @ metric definitions ; Group comparison and dispersion @ descriptive statistics ; Small-group suppression @ privacy rules ; What-if optimizer @ constrained solver ; Leadership review @ human ; Decision and audit log @ lakehouse
edge: Very small group | individuals are identifiable | Suppression and pooling rules
edge: Approved exception added late | fairness metrics change after review has begun | Effective-dated exceptions
edge: Metric definition disputed | results differ between leaders and trust falls | Versioned definitions and a sensitivity view
edge: Part-year physicians | burden is understated | FTE-time normalisation
off: Metric reproducibility against a manual audit ; Disparity-detection agreement with leaders ; Privacy-rule compliance
on: Disparity reduced across cycles ; Leader time to prepare fairness reviews ; Physician-reported fairness
gap: Ranking individual physicians ; Comparing unlike groups ; Rebalancing without leader approval
== physician-schedule-preference-optimization | Physician Schedule Preference Optimization | reinforcement-learning,tabular | batch | advanced | a=0.1 k=3
obj: Maximise physician preferences while meeting coverage, skill, continuity, workload and fairness constraints, and give the scheduling committee ranked feasible schedules with trade-off explanations.
sor: Preference submission system ; Scheduling system ; Physician roster and privileges ; Contract and rules register
up: Preference windows ; Availability ; Specialty and privileges ; Service demand ; Fairness rules ; Contractual constraints ; Historical assignments
down: Ranked feasible schedules ; Preference satisfaction summary ; Trade-off explanations ; Exception list for committee review
opt: Prior schedule satisfaction survey ; Demand forecast
proto: Preference and roster extracts, a solver service with a REST API and a schedule comparison view for the committee
own: Physician scheduling office ; Medical group leadership ; Scheduling committee ; Clinical operations
con: The scheduling committee approves final schedules and exceptions ; Coverage, skill, continuity, workload and contract rules are hard constraints ; Preferences are soft and fairness in preference outcomes is measured ; Each trade-off explains which constraint bound ; Solves 1.2K physicians per cycle ; Preference data is restricted to scheduling roles
loss: \max\;\sum_{p,s} x_{ps}\,\text{preference}_{ps}\quad\text{s.t. coverage, continuity, workload and fairness constraints}
sn: Constraints | Coverage, skill, continuity, workload and contract as hard | Preference as a hard goal | Patient coverage comes first
sn: Preferences | Weighted soft objective | Hard requests | Not every request can be met
sn: Fairness | Preference satisfaction compared across physicians | Total satisfaction only | Maximising the total can favour a few
sn: Explanation | Why a request was not met | Silent outcome | Physicians accept trade-offs they understand
sn: Authority | Committee approves | Auto-published schedule | Schedules affect people and patients
sig: Preference weight and window | rank and timing of each request | The objective | Submission data
sig: Eligibility | privilege and skill match for each shift | Feasibility | Privilege register
sig: Continuity needs | existing patient-physician relationships by session | Care continuity | Schedule data
sig: Past satisfaction | preference outcomes in recent cycles | Fair alternation | Closed cycles
noise: Submission time | not priority
noise: Comment wording | free text
noise: Physician seniority | not a rule
base: A scheduler resolves preference conflicts by hand each cycle.
prod: A multi-objective constraint optimiser with hard coverage, skill, continuity and contract constraints, a weighted preference objective with an alternation term for fairness, and an explainer for unmet requests.
pipe: Preference and roster intake @ scheduling extracts ; Constraint and objective builder @ rule compiler ; Schedule optimizer @ CP-SAT and MILP ; Alternative schedule ranker @ multi-objective ranking ; Trade-off explainer @ constraint analysis ; Scheduling committee review @ human ; Approved schedule and audit @ scheduling system
edge: Many conflicting requests | satisfaction is low | Show the binding constraints and options
edge: Late preference change | the plan is stale | Re-solve with frozen assignments
edge: Contract rule revised | a schedule becomes invalid | Rule version in the constraints
edge: Gaming of preference rankings | some physicians gain unfair advantage in the schedule | Normalised weights and a fairness term
off: Hard-constraint violations (must be zero) ; Preference satisfaction and its dispersion across physicians ; Committee acceptance rate of the top schedule
on: Preference satisfaction ; Manual rework per cycle ; Schedule publication lead time
gap: Treating preferences as hard constraints ; Optimising total satisfaction only ; Publishing without committee approval
