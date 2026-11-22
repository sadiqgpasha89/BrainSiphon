# Healthcare & Life Sciences, part 4: Provider Lifecycle Intelligence (use cases 61-68)
# Credentialing, enrollment, onboarding, identity, privileges and directories. No autonomous credential approval, privilege grant or adverse finding.
== provider-credentialing-document-intelligence | Provider Credentialing Document Intelligence | nlp,tabular | batch | advanced | a=0.2 k=400
obj: Ingest provider applications and supporting evidence, classify each document, extract fields with page-level provenance, validate completeness and reconcile values across sources so credentialing staff review a ready evidence packet instead of raw paperwork.
sor: Credentialing and privileging system ; Provider master data ; Primary-source verification services ; Document repository
up: Scanned and digital applications, CVs, licences, board certificates and malpractice certificates ; Education and training records ; Reference letters ; Sanction and exclusion list checks ; Authoritative verification responses
down: Credentialing specialist review workbench ; Discrepancy and missing-document queue ; Committee packet generator ; Provider master update after human approval
opt: National provider registry lookups ; State licensing board portals ; Cloud document-AI services
proto: Document upload and SFTP intake with OCR, FHIR R4 Practitioner and PractitionerRole for the structured result, REST calls to primary-source verification services and a worklist API for reviewers
own: Medical staff office ; Credentialing verification organisation ; Provider data governance ; Privacy office
con: Every extracted fact links to its source page, region and extraction confidence ; The system never approves a credential or grants a privilege and staff verify all evidence ; Discrepancies are queued and never auto-resolved ; Handles scans of mixed quality and multiple languages ; Processes 300K documents per month with a per-document turnaround under 15 minutes ; Immutable evidence references with timestamps
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid x)+\lambda\,\mathrm{Calibration}
sn: Provenance | Field value with source page, region and confidence | Extracted value with no source | A reviewer cannot trust or correct an unsourced field
sn: Verification | Primary-source verification result is the authority | Extracted value treated as verified | An extracted licence number is a claim until a source confirms it
sn: Completeness | Deterministic checklist per credential type and jurisdiction | A model guess at completeness | Missing items must be explicit and auditable
sn: Discrepancy | Cross-source mismatch queue for staff | Silent choice of one value | Name or date mismatches are the highest-risk records
sn: Scope | Evidence packet and summary | Approval recommendation | Approval is a human committee decision
sig: Field confidence | calibrated extraction confidence per field and document | Directs review effort to uncertain fields | Calibrate on held-out document groups
sig: Document-type completeness | required documents present for the credential type | Core completeness signal | Requirements as of the application date
sig: Cross-source agreement | match score between application, licence and verification response | Detects mismatches | Compare against verification responses received before scoring
sig: Expiry window | days between document expiry and decision date | Expired evidence is unusable | Use document dates not upload dates
noise: Provider prestige or institution ranking | irrelevant to evidence completeness and a bias risk
noise: Document layout aesthetics | rarely related to validity
noise: Applicant nationality or name origin | protected and irrelevant
base: Template-based OCR with regex field capture and a manual checklist.
prod: OCR and layout-aware extraction with document classification, field-level reconciliation against the provider master, deterministic completeness and consistency rules and a reviewer workbench with highlighted source regions.
pipe: Document intake and OCR @ upload service with OCR engine ; Document classifier @ layout-aware transformer ; Field extractor @ document AI with spans ; Cross-source reconciliation @ rules and fuzzy lookups ; Completeness and policy validator @ credential rules ; Credentialing specialist review @ human ; Evidence packet and audit @ document store
edge: Low-quality scan | fields are misread | Confidence threshold routes the document to manual keying with the image attached
edge: Name change or transliteration | identity appears to mismatch | Aliases from authoritative identifiers and steward review before any merge
edge: Document in an unseen format | classifier fails | Fallback to generic extraction with a lower confidence and a template request
edge: Injected instruction in a document | text tries to steer a downstream model | Documents are treated as untrusted data and cannot trigger actions
off: Field-level F1 and exact match by document type ; Calibration error of field confidence ; Missing-document detection recall
on: Specialist handling time per file ; Share of fields accepted without edits ; Credentialing cycle time
gap: Splitting train and test by page and not by provider ; Scoring on clean scans only ; Counting extraction as verification
== provider-credential-expiration-renewal-prediction | Provider Credential Expiration & Renewal Prediction | tabular,time-series | batch | advanced | a=0.1 k=2
obj: Predict which credential renewals are at risk of missing their deadline and prioritise outreach before a licence, certification or coverage lapses.
sor: Credentialing and privileging system ; Provider master data ; Primary-source verification services
up: Credential inventory with expiry dates ; Renewal lead times by credential type ; Verification turnaround history ; Provider response history to reminders ; Policy for lapse handling
down: Credentialing outreach work queue ; Provider reminder campaign ; Medical staff office dashboard ; Scheduling hold recommendations for human approval
opt: Licensing-board change notifications ; Continuing-education completion records
proto: Governed extracts from credentialing, REST verification calls and a worklist API; reminders go through approved communication templates
own: Medical staff office ; Credentialing operations ; Provider data governance
con: Deadline rules are deterministic and the model only prioritises outreach ; Authorised credentialing staff confirm status and contact providers ; A lapse is never inferred from a prediction ; Outputs show missing evidence and next action for each case ; Scores 600K credentials nightly ; Pseudonymous IDs in the model and no sensitive attributes
sn: Deadline | Rule-based expiry calendar with lead times | Model estimate of the expiry date | Expiry is a fact in the record not a prediction
sn: Risk | Probability the renewal will not complete before expiry | Probability the provider is careless | Operational friction not character drives lateness
sn: Outcome | Time to completion with censoring for open renewals | Binary renewed or not | Open cases are not failures yet
sn: Outreach | Ranked work queue with the blocking evidence | Mass reminders | Generic reminders are ignored
sn: Policy | Lapse handling follows policy and committee | Automatic scheduling holds | A hold is an employment action needing human approval
sig: Days to expiry minus expected completion time | remaining time minus the typical verification turnaround | Directly expresses the buffer | Use the verification turnaround known at scoring time
sig: Missing evidence count | required documents not yet received | The usual blocker | Snapshot as of scoring
sig: Prior reminder response | days from reminder to submission in past cycles | Past responsiveness predicts friction | Strictly earlier cycles
sig: Verification source latency | median turnaround of the source for the credential type | Slow sources create risk | Trailing window
noise: Provider specialty prestige | not a driver of lateness
noise: Provider age | protected and irrelevant
noise: Employment status alone | confounds process with outcome
base: A report of credentials expiring in the next 90 days sorted by date.
prod: Discrete-time survival and gradient-boosted classification of the probability that a renewal closes before expiry, combined with a deterministic deadline calendar, evidence-gap lookup and a prioritised outreach queue.
pipe: Credential and expiry intake @ credentialing extract ; Deadline calendar rules @ policy rules ; Renewal risk model @ discrete-time survival model ; Evidence gap lookup @ document checklist ; Outreach prioritiser @ ranking with capacity ; Credentialing team review @ human ; Outcome feedback and audit @ lakehouse
edge: Verification source outage | turnaround spikes | Source-health feature and a manual escalation path
edge: Policy change in lead time | the buffer changes | Versioned policy table and a re-run
edge: Provider on leave | outreach is inappropriate | Leave flag suppresses reminders without storing the reason
edge: Bulk renewals at one date | the queue floods | Capacity-aware ranking and early outreach by cohort
off: Concordance index and time-dependent AUC at 30 and 60 days ; Calibration by credential type ; Precision at the outreach capacity
on: Credentials lapsed per month ; Renewals closed more than 14 days before expiry ; Outreach touches per renewal
gap: Treating open renewals as failures ; Using final completion dates as features ; Mass reminders with no prioritisation
== provider-enrollment-delay-prediction | Provider Enrollment Delay Prediction | tabular | batch | advanced | a=0.1 k=2
obj: Predict payer enrollment and roster delays that affect network participation, scheduling and reimbursement, and tell enrollment specialists the likely bottleneck and next best follow-up.
sor: Provider enrollment system ; Credentialing system ; Payer portals and roster files ; Revenue cycle system
up: Enrollment applications and submission completeness ; Payer, specialty and geography ; Status events from payers ; Payer service-level commitments ; Historical turnaround by payer and process
down: Enrollment specialist work queue ; Scheduling rules for new providers ; Revenue cycle expected-start report ; Provider onboarding dashboard
opt: Payer announcements on processing backlogs ; Clearinghouse enrollment status feeds
proto: REST and SFTP roster exchanges with payers, EDI enrollment transactions where supported, portal status scraping only where permitted and a work-queue API
own: Provider enrollment ; Revenue cycle ; Managed-care contracting
con: Predictions are segmented by payer and process type ; Specialists validate payer status and the model never states a guarantee of participation or reimbursement ; Time-to-event labels keep censoring for open applications ; Predicts a date range and not a point date ; Scores 120K active applications nightly ; Scheduling effects require human approval
sn: Target | Calendar days from complete submission to payer effective date with censoring | Days from the first draft | The clock starts at completeness not at the first form
sn: Segmentation | Models or features per payer and process | One pooled average | Payers differ by an order of magnitude in turnaround
sn: Bottleneck | Likely stage such as missing attestation or payer backlog | Generic delay probability | A specialist needs the next action not a score
sn: Claims | Expected date range with uncertainty | Guarantee of start date | Reimbursement depends on payer decisions the model cannot see
sn: Leakage | Features known at submission and at each status event | Final status fields | Final status contains the outcome
sig: Completeness at submission | share of required items present on submission | Incomplete submissions are the leading cause of delay | As of the submission event
sig: Payer SLA position | days elapsed against the payer's stated turnaround | Shows whether the payer is late | Use payer SLA table versions
sig: Stage dwell time | time spent in the current stage relative to the payer median | Stalls are predictive | Computed from event time
sig: Follow-up count | number of status follow-ups made so far | A proxy for payer friction | Count only prior follow-ups
noise: Provider reputation | irrelevant to administrative processing
noise: Payer contact name | personal and unstable
noise: Final status code | contains the outcome
base: Median historical turnaround by payer.
prod: Discrete-time survival model with payer-specific baselines and gradient-boosted classification of stalls, a stage-level bottleneck classifier and a next-action recommender governed by enrollment playbooks.
pipe: Enrollment and status intake @ EDI and portal extracts ; Stage and event normaliser @ workflow events ; Delay risk model @ survival model per payer ; Bottleneck classifier @ gradient boosting ; Follow-up recommender @ playbook rules ; Enrollment specialist review @ human ; Outcome and audit log @ lakehouse
edge: Payer changes process | historic turnaround no longer applies | Change-point test and a switch to a recent window
edge: Application withdrawn | censoring looks like completion | Explicit competing-risk label
edge: Roster file rejected | all providers in the file are delayed | Batch-level alert and file validation before submission
edge: New payer | no enrolment history to learn the delay from | Conservative prior from similar payers and a wide interval
off: Concordance index and time-dependent AUC at 30 and 60 days ; Date-range coverage ; Bottleneck top-1 accuracy
on: Days from submission to effective date ; Providers scheduled before enrollment completes ; Follow-ups that unblock a case
gap: Starting the clock before the file is complete ; Using final status as a feature ; Pooling all payers into one model
== provider-onboarding-cycle-time-optimization | Provider Onboarding Cycle-Time Optimization | reinforcement-learning,tabular | batch | advanced | a=0.1 k=3
obj: Find the bottlenecks across HR, credentialing, IT, facilities, payer enrollment and department readiness and recommend the task sequencing that shortens time to start-readiness.
sor: Onboarding workflow system ; HR information system ; Credentialing system ; IT access management and facilities request systems
up: Workflow events and task owners ; Task dependencies and service-level targets ; Document status ; Equipment and access requests ; Planned start dates
down: Onboarding coordinator work queue ; Task owner reminders ; Department readiness dashboard ; Start-date change request for approval
opt: Payer enrollment status ; Background-check provider feeds
proto: Event extraction from workflow and ticketing systems into a process-mining log and a work-queue API; task reassignment is a request not a command
own: Provider onboarding office ; HR operations ; IT service management ; Facilities
con: Owners approve every task reassignment and every start-date change ; Critical-path analysis uses explicit dependencies including hard prerequisites such as credentialing ; Recommendations never skip a mandatory verification step ; Duration predictions carry intervals ; Handles 40K onboarding cases per year with parallel tasks ; Process-mining logs hold pseudonymous provider IDs
loss: \min\;\sum_c \text{lateness}_c+\lambda\,\text{idle wait}+\mu\,\text{rework}
sn: Dependencies | Explicit prerequisite graph | Inferred order from average timing | Order inferred from history repeats past mistakes
sn: Bottleneck | Queue and handoff delay at a stage | The slowest task by duration | A short task with long waiting is the real constraint
sn: Prediction | Remaining-time estimate with interval per case | Standard duration | Cases differ widely by specialty and facility
sn: Authority | Recommendation for the owner to approve | Automatic reassignment | Owners are accountable for their tasks
sn: Mandatory steps | Hard prerequisites enforced | Fast path that skips verification | Safety and compliance checks are not negotiable
sig: Critical-path slack | latest start minus earliest start for each open task | Identifies tasks that drive the date | Use the dependency graph at scoring time
sig: Queue wait time | median waiting time before a task is picked up by the owner team | Shows capacity limits | Event timestamps
sig: Rework rate | share of tasks reopened for missing information | Quality of handoff | Past cycles only
sig: Predicted start-readiness | modelled completion date of the slowest required stream | The headline outcome | Computed from open tasks and queue state
noise: Task owner seniority | not a cause of delay
noise: Calendar month alone | mixes many causes
noise: Provider specialty prestige | irrelevant
base: Gantt chart with static durations maintained by the coordinator.
prod: Process mining on the event log with duration models per task, critical-path computation on the dependency graph, a scheduler that proposes resequencing and reassignment under capacity limits, and an explanation of each recommendation.
pipe: Workflow event intake @ process-mining log ; Dependency graph builder @ workflow definitions ; Duration predictor @ gradient boosting survival ; Critical-path scheduler @ constraint solver ; Policy and mandatory-step rules @ rules ; Onboarding coordinator review @ human ; Outcome and audit log @ lakehouse
edge: Missing events from one system | the process looks shorter than it is | Event-completeness checks per source before mining
edge: Task reopened | duration is double counted | Event types distinguish rework from first pass
edge: Owner team on leave | onboarding capacity falls and cycle times stretch | Capacity calendar as an input to the scheduler
edge: Start date fixed by contract | optimisation cannot move it | Hard deadline mode that surfaces risks and mitigations
off: Remaining-time error by case ; Critical-path hit rate ; Simulated lateness against the best plan in hindsight
on: Days from offer to start-readiness ; Cases starting on the planned date ; Idle wait per case
gap: Learning order from history rather than rules ; Ignoring queue wait ; Measuring task duration but not handoff delay
== provider-data-quality-entity-resolution | Provider Data Quality & Entity Resolution | graph,tabular | batch | advanced | a=0.5 k=2
obj: Resolve duplicate and conflicting provider identities across credentialing, HR, EHR, scheduling, payer and directory systems and give data stewards ranked candidate merges with provenance.
sor: Provider master data ; Credentialing system ; HR information system ; EHR provider directory ; Scheduling system
up: Provider identifiers, names, specialties and affiliations ; Addresses and licence IDs ; National provider identifiers where applicable ; Source-system metadata and change history
down: Data steward review queue ; Provider master update after human approval ; Directory publication feed ; Data-quality scorecard
opt: National provider registry ; State licensing board data
proto: Batch extracts via SFTP and FHIR R4 Practitioner and Organization reads, a match-service API and a steward worklist with merge and unmerge events
own: Provider data governance ; Medical staff office ; Health information management
con: A merge is never made on fuzzy name similarity alone and needs a strong identifier or steward approval ; Source lineage and survivorship rules are preserved for every field ; Data stewards approve merges and corrections ; Unmerge is supported and audited ; Resolves 5M provider records across 12 systems in a nightly batch ; Match scores are calibrated per attribute
loss: \mathcal{L}=-\sum_{(i,j)}\big[\,m_{ij}\log p_{ij}+(1-m_{ij})\log(1-p_{ij})\,\big]
sn: Identity | Strong identifiers such as national provider ID and licence number | Name similarity | Common names create false merges that corrupt credentials and billing
sn: Blocking | Multi-key blocking that keeps recall high | One key | A missed block is a duplicate forever
sn: Survivorship | Rules by field and source authority | Last write wins | The most recent value is often the least trusted
sn: Review | Steward queue ordered by risk and impact | Automatic merge of everything above a threshold | A false merge is far costlier than a missed one
sn: Lineage | Every golden field cites its sources | A single merged record | Stewards must be able to unmerge
sig: Identifier agreement | exact match on strong identifiers with check-digit validation | The strongest evidence of identity | Validate against the authoritative registry
sig: Name and alias similarity | phonetic and token similarity with alias tables | Handles spelling and transliteration | Never used alone
sig: Affiliation and address overlap | shared facility, address and specialty | Corroborates identity | Dated and weighted by recency
sig: Cluster consistency | graph transitivity and conflicting identifiers inside a cluster | Detects bad merges | Computed after clustering
noise: Provider photo or biography text | irrelevant to identity
noise: Record creation order | an artefact of systems
noise: Source system name alone | not an identity attribute
base: Deterministic match on national provider ID with a manual duplicate report.
prod: Probabilistic record linkage with blocking and calibrated pairwise models, graph-based clustering with transitivity checks, rule-based survivorship per field and a steward workbench with merge, split and audit.
pipe: Record intake and standardisation @ batch extracts ; Blocking and candidate generator @ multi-key blocking ; Pairwise match model @ gradient boosting with calibration ; Cluster resolver @ graph connected components ; Survivorship rules @ field authority rules ; Data steward review @ human ; Golden record and audit log @ master data hub
edge: Two providers with the same name and specialty | a false merge risk | Identifier conflict rules that block a merge
edge: Provider changes name | a true match looks like a mismatch | Alias history and identifier-first linkage
edge: Source system migration | duplicates flood in | Staged ingestion with match thresholds tightened
edge: Stale registry data | authoritative value is outdated | Source freshness stamps in survivorship
off: Pairwise precision and recall at the steward threshold ; Cluster purity and completeness ; False-merge rate on a stewarded audit sample
on: Duplicate provider rate ; Steward decisions per hour ; Downstream correction tickets
gap: Evaluating on random pairs instead of hard near-duplicates ; Counting transitive merges as correct ; Ignoring unmerge cost
== provider-privilege-scope-of-practice-validation | Provider Privilege & Scope-of-Practice Validation | graph,tabular | batch | staff-principal | a=0.3 k=2
obj: Detect mismatches between provider qualifications, granted privileges, specialty, facility rules and proposed assignments or procedures, and give the medical staff office an auditable explanation of each exception.
sor: Credentialing and privileging system ; Medical staff bylaws and privilege catalogue ; Scheduling and operating-room system ; Provider master data
up: Verified credentials and licences ; Privilege catalogues and facility policy ; Specialty and subspecialty ; Procedure codes on proposed cases ; Supervision rules and effective dates
down: Medical staff office exception queue ; Scheduling warning for the proposed assignment ; Privileging committee packet ; Audit report
opt: Case-volume history for focused review ; Peer-review outcomes
proto: Rule evaluation service called from scheduling with a REST API, a temporal knowledge graph of credentials and privileges and FHIR R4 PractitionerRole for qualification data
own: Medical staff office ; Privileging committee ; Perioperative services ; Compliance
loss: \mathcal{L}=\sum_i w_i\,\mathrm{BCE}(y_i,p_i)\quad y_i=1\ \text{if the committee upholds exception } i
con: A rules engine decides eligibility and the model may only prioritise exceptions and never invents clinical authorisation ; The medical staff office or authorised committee makes every privilege decision ; All rules are versioned with effective dates and cite their bylaw source ; Missing evidence is reported as missing not as ineligible ; Temporal reasoning handles effective and expiry dates ; Evaluates 200K proposed assignments per month
sn: Authority | Deterministic rules from bylaws and policy | A learned authorisation score | A model cannot grant authority
sn: Time | Temporal graph with effective and expiry dates | Current-state flags | An assignment made last month needs last month's privileges
sn: Evidence | Missing-evidence alert | Silent ineligible | Missing records are a data problem not a finding
sn: Prioritisation | Model ranks exceptions for human review | Model decides eligibility | Ranking is safe and decision is not
sn: Explanation | Rule and source citation per result | A score | Committees need the rule not a number
sig: Privilege coverage | procedure code mapped to required privilege vs granted privilege | The core eligibility test | Catalogue version at the assignment date
sig: Credential validity at date | licence and certification validity on the assignment date | Expired evidence invalidates eligibility | Use effective dates
sig: Supervision requirement | required supervisor and availability | Some privileges are conditional | Rules as published
sig: Exception novelty | whether this mismatch pattern was seen and cleared before | Reduces repeated review | Past adjudicated exceptions only
noise: Provider case volume as a quality proxy | not an authorisation criterion
noise: Seniority | not a privilege
noise: Manager request urgency | pressure not evidence
base: Manual cross-check by medical staff office against the privilege catalogue.
prod: Versioned rules engine over a temporal knowledge graph of providers, credentials, privileges and procedures, with a learned ranker that only orders exceptions by review priority and an explanation generator that cites rule and source.
pipe: Credential and privilege intake @ credentialing extract and FHIR ; Temporal graph builder @ graph store with effective dates ; Eligibility rules engine @ versioned bylaw rules ; Exception prioritiser @ gradient-boosted ranker ; Explanation and citation builder @ rule trace ; Medical staff office review @ human ; Decision log and audit @ case workflow
edge: Bylaws amended mid-year | the old rule is applied | Versioned rules with effective dates and a rule-change replay
edge: Interim privileges | temporary scope is mistaken for permanent | Explicit status in the graph and a time-bound check
edge: Missing procedure code | the rule cannot be evaluated | Flag as incomplete data and route to the scheduler
edge: Provider with multi-facility privileges | facility rules differ | Facility-scoped evaluation
off: Exception ranking precision at the review budget ; Rule-evaluation agreement with committee decisions ; False-clear rate on adjudicated cases
on: Assignments flagged before the case date ; Review hours per exception ; Privilege-mismatch events reaching the day of care
gap: Letting the ranker decide eligibility ; Evaluating without effective-date replay ; Treating missing evidence as a violation
== provider-recredentialing-automation | Provider Recredentialing Automation | llm-agents,nlp | seconds | staff-principal | a=0.02 k=60 s=4 t=350
obj: Orchestrate periodic recredentialing cycles, evidence collection, verification, exception routing and committee packet preparation with a deterministic case state machine and human sign-off for every adverse finding.
sor: Credentialing and privileging system ; Provider master data ; Document repository ; Committee and meeting management
up: Provider master and due dates ; Credential evidence and prior decisions ; Primary-source verification services ; Policies and bylaws ; Workflow history
down: Credentialing specialist work queue ; Provider evidence request messages as drafts ; Committee packet ; Audit trail
opt: Peer-review and quality data under policy ; Malpractice carrier feeds
proto: A case state machine over REST with typed tool calls, FHIR R4 PractitionerRole and DocumentReference, verification service APIs and approval-gated messaging
own: Medical staff office ; Credentialing operations ; Compliance ; Privileging committee
con: An agent only drafts, retrieves and routes and every adverse finding, approval, denial or privilege change needs human sign-off ; Tool permissions are least privilege and read-only by default ; Messages to providers are drafts until approved ; Summaries cite source documents and abstain when evidence is absent ; Documents are untrusted input and cannot trigger actions ; Case state transitions are deterministic and logged
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{case})+\lambda\,\mathrm{PolicyViolation}
sn: State | Deterministic case state machine | A free-running agent | The case must be resumable and auditable
sn: Authority | Draft and route only | Approve or deny | Adverse findings carry legal consequences
sn: Grounding | Summary cites documents and rule version | Fluent summary from memory | A committee relies on the cited evidence
sn: Tool use | Typed allow-listed tools with scopes | Free web or shell access | Least privilege limits damage from a bad input
sn: Injection | Document text treated as data | Following instructions found in a CV | A malicious file could redirect the agent
sig: Evidence completeness | required items received and verified by the checklist | Drives the next action | Checklist version as of the due date
sig: Exception severity | rule-classified severity of each discrepancy | Prioritises human review | Rule output not the model's opinion
sig: Citation coverage | share of summary statements with a source span | Measures faithfulness | Check against retrieved sources
sig: Time to due date | days left against the average cycle | Schedules reminders | Calendar
noise: Provider reputation | irrelevant to evidence
noise: Model confidence phrases | not a calibrated signal
noise: Message tone | style not substance
base: Manual recredentialing with a spreadsheet tracker and email reminders.
prod: A deterministic case state machine with an LLM agent that retrieves evidence, drafts reminders and the committee summary through typed tools, verifies citations, routes exceptions and stops at every approval gate.
pipe: Case intake and due-date scheduler @ workflow engine ; Evidence retriever @ document store with search ; Verification tool caller @ typed verification APIs ; Summary and draft agent @ LLM with citations ; Policy and permission guard @ policy rules ; Credentialing specialist review @ human ; Case audit trail @ immutable log
edge: Conflicting evidence | the agent chooses one source | Surface both and route as an exception
edge: Verification service timeout | the case stalls | Retry with backoff and a manual task after the limit
edge: Prompt injection in an uploaded file | agent tries a tool outside scope | Tool allow-list and a content filter with an incident record
edge: Provider disputes a finding | the audit trail is incomplete | Immutable log of evidence, drafts and approvals
off: Citation faithfulness and unsupported-claim rate ; Task success on replayed cases ; Unauthorised tool-call attempts blocked
on: Recredentialing cycle time ; Specialist hours per case ; Cases completed before expiry
gap: Letting the agent finalise a case ; Judging fluent summaries without citation checks ; Skipping replay of adversarial documents
== provider-directory-accuracy-prediction | Provider Directory Accuracy Prediction | tabular,graph | batch | advanced | a=0.2 k=2
obj: Predict which provider directory fields such as location, specialty, affiliation, accepting-patients status and contact details are stale or inconsistent, so a health system can target attestation outreach where errors are most likely.
sor: Provider master data ; Provider directory and website feeds ; Scheduling system ; Credentialing system
up: Directory feeds and web listings ; Provider attestations ; Scheduling availability and appointment history ; Claims and encounter signals where permitted ; Authoritative reference sources
down: Provider outreach work queue ; Data steward correction queue ; Directory publication after validation ; Patient-access dashboard
opt: Patient-reported inaccuracy feedback ; Secret-shopper call results
proto: Batch extracts and FHIR R4 Practitioner and Location reads, a freshness score API and an outreach worklist
own: Provider data governance ; Patient access ; Marketing and digital
con: Outputs are field-level accuracy risks and never replace attestation ; The provider or data steward validates corrections before publication ; Claims and encounter signals are used only where lawful and minimised ; Freshness is scored per field with its source date ; Scores 400K provider-location records nightly ; Outreach capacity is a stated budget
sn: Level | Field-level accuracy risk | Whole-record flag | A single wrong phone number differs from a closed practice
sn: Evidence | Independent signals such as scheduling and attestation | One feed compared with itself | Duplicated sources agree on the same error
sn: Freshness | Age of the last verified value per field | Record last-updated date | Updates to unrelated fields reset the date
sn: Outreach | Highest-risk fields first within capacity | Sweep of every provider | Contact fatigue lowers response
sn: Label | Verified correct or incorrect from outreach and calls | Whether a change was later made | Changes are not the only sign of error
sig: Field age since verification | days since the field was last confirmed from a trusted source | Stale fields are more likely wrong | Use verification events
sig: Cross-source disagreement | disagreement between directory, scheduling and credentialing for the field | Disagreement is a strong signal | Use the snapshot at scoring
sig: Activity mismatch | absence of appointments or claims at a listed location | Suggests the location is inactive | Use a lagged window
sig: Provider change propensity | historical rate of changes for similar practices | Some groups change often | Past data only
noise: Provider popularity | does not relate to accuracy
noise: Directory page traffic | reflects marketing
noise: Provider age | protected and irrelevant
base: A rule that flags fields not verified in the last 90 days.
prod: Field-level gradient-boosted accuracy models fed by freshness, cross-source disagreement and activity features, an identity reconciliation layer for provider and location records and a capacity-aware outreach ranker.
pipe: Directory and source intake @ batch feeds ; Identity reconciliation for provider and location @ rules and fuzzy lookups ; Field feature builder @ freshness and disagreement ; Accuracy risk model @ gradient boosting by field ; Outreach ranker with capacity @ ranking ; Data steward review @ human ; Verification outcomes and audit @ lakehouse
edge: Provider moves practice | old and new location both appear active | Location lifecycle states with an end date
edge: Telehealth only provider | no physical activity is expected | Service-mode attribute that changes the rule
edge: Attestation received but wrong | verified status is false | Independent signals and spot-check calls
edge: Directory feed outage | everything looks stale | Feed-health check suppresses risk until the source returns
off: PR-AUC and precision at the outreach capacity by field ; Calibration by field ; Share of high-risk fields confirmed wrong in audit
on: Directory error rate in secret-shopper audits ; Attestation response rate ; Patient complaints about wrong directory data
gap: Training on records where change implies error ; Evaluating on the whole record instead of the field ; Ignoring feed outages
