# Healthcare & Life Sciences, part 5: Quality, Safety & Performance Intelligence (use cases 69-76) and Vendor & Facility Access Intelligence (77-82)
# Quality findings are hypotheses for formal review. Access findings are leads for security staff, never accusations or sanctions.
== hospital-quality-measure-performance-forecasting | Hospital Quality Measure Performance Forecasting | time-series,tabular | batch | advanced | a=1 k=2
obj: Forecast quality measure outcomes and identify the facilities and units likely to miss internal or external performance targets early enough for improvement work to change the result.
sor: Quality and performance reporting system ; Enterprise data warehouse ; Measure specification library ; EHR and claims-derived numerator and denominator data
up: Validated numerator and denominator data ; Case-mix and risk-adjustment variables ; Versioned measure definitions and exclusions ; Reporting windows and submission calendars ; Historical trends by facility and unit
down: Quality council dashboard ; Unit and service-line improvement lists ; Executive scorecard ; Intervention scenario planner
opt: Peer benchmark datasets under licence ; Published regulatory measure updates
proto: Warehouse extracts with measure-version tags, governed measure logic in SQL or a measure engine and a reporting API; FHIR Measure and MeasureReport resources where supported
own: Quality and patient safety ; Clinical informatics ; Finance ; Health information management
con: Forecasts 8K measure-by-unit series monthly and weekly where volume allows ; Measure logic is versioned and denominators are validated before any forecast ; Reporting lag and data completeness are modelled explicitly ; Small denominators carry wide intervals and are flagged not hidden ; Quality specialists validate measure logic and interventions ; Forecasts are internal planning estimates and never official results
sn: Definition | Versioned measure specification with exclusions | Home-made approximation of the measure | A forecast of the wrong measure is worse than none
sn: Denominator | Validated denominator and case mix | Raw event counts | Low volume and mix shifts dominate the rate
sn: Latency | Reporting lag modelled so recent months are completed estimates | Treating incomplete recent months as final | The latest point looks better than it is
sn: Uncertainty | Intervals sized to the denominator | A point rate | A unit with 12 cases cannot be ranked by a point rate
sn: Action | Scenarios linked to improvement levers | A red-amber-green status | Leaders need to know what would change the outcome
sig: Risk-adjusted rate trend | rolling observed to expected ratio with case-mix adjustment | The fair comparator across units | Use the final adjusted data
sig: Denominator drift | change in volume and exclusion share over time | Explains apparent rate changes | Use closed periods
sig: Process-measure lead indicator | compliance with the care process that drives the outcome | Leads the outcome by weeks | Same definition as the process measure
sig: Reporting completeness | share of expected records present at the cut-off | Controls for lag | Compute at each historical cut-off
noise: Single-month spikes in small units | statistical noise
noise: Unvalidated manual counts | inconsistent and unauditable
noise: Provider names | unfair and not a system driver
base: Last 12-month average of the measure with a linear trend.
prod: Measure-specific hierarchical time-series and regression models with exogenous process and case-mix drivers, completeness-aware nowcasting for lagged months, quantile outputs and a scenario layer tied to the measure version.
pipe: Measure data intake @ warehouse extracts ; Denominator and version validator @ measure rules ; Completeness nowcaster @ lag-adjusted model ; Quality measure forecaster @ hierarchical quantile model ; Target-gap and scenario builder @ rules ; Quality specialist review @ human ; Forecast archive and feedback @ lakehouse
edge: Measure specification changes | history is no longer comparable | Version tag per series and a break in the training window
edge: Late data corrections | past values change | As-of snapshots and a restatement log
edge: New unit | no history to forecast from and the first weeks are unstable | Peer-unit prior with wide intervals
edge: Coding practice change | measured rates move with no change in care | Coding-change annotation and a manual review
off: WAPE and pinball loss by measure and horizon ; Interval coverage by denominator size ; Target-miss detection precision at the review budget
on: Share of measures reaching target ; Lead time between a forecast miss and an intervention ; Improvement-plan completion
gap: Backtesting on final data without reporting lag ; Mixing measure versions in training ; Ranking units by point rates
== cms-quality-program-penalty-forecasting | CMS Quality Program Penalty Forecasting | tabular,time-series | batch | advanced | a=0.5 k=2
obj: Estimate potential financial exposure under applicable quality-linked payment programs by combining current program rules with validated performance data, clearly labelled as scenario estimates and never as official determinations.
sor: Quality and performance reporting system ; Finance and revenue cycle system ; Program rules library with year versions
up: Program measures and scoring rules by program year ; Baseline and achievement benchmarks ; Payment base and volume data ; Validated facility performance data ; Current-year policy updates
down: Finance and compliance scenario workbook ; Executive exposure summary ; Quality improvement prioritisation input ; Data-gap tracker
opt: Published benchmark and scoring files ; Preview reports issued by the programme
proto: Versioned rules as code with a program-year parameter table, warehouse extracts and a scenario API; every output cites the rule version and input snapshot
own: Quality and patient safety ; Finance ; Compliance ; Revenue cycle
con: A transparent deterministic policy calculator is the base and predictive uncertainty sits on top of the inputs ; Rules are versioned by program year and cite their source ; Finance and compliance validate assumptions and every output is labelled as an estimate not an official determination ; Data gaps are listed with the exposure they leave unknown ; Scenarios show sensitivity to each measure ; Runs 3K facility-program scenarios on demand and nightly
sn: Calculation | Rules as code from the published methodology | A statistical guess at the penalty | The payment adjustment is a calculation and not a prediction
sn: Uncertainty | Distributions on pending performance inputs | A single exposure number | Leaders need the range and the swing measures
sn: Versioning | Program-year parameter tables | Latest rules applied to old years | Backtests then misstate what happened
sn: Labels | Estimate with stated gaps | Official-sounding figures | A wrong figure presented as official creates financial and reputational risk
sn: Drivers | Measures ranked by marginal exposure | Overall score only | Improvement effort should go where dollars and patients are
sig: Measure score gap to benchmark | distance from achievement and improvement thresholds | Drives the point scale | Benchmarks of the right year
sig: Payment base | program payment base for the period | Scales exposure | Use the declared base
sig: Sensitivity per measure | change in exposure per unit change in the measure | Prioritises work | Computed by the calculator
sig: Pending data share | share of the period not yet reported | Sizes the uncertainty | As of the run
noise: Prior year penalty amount | does not describe this year's rules
noise: Peer penalties reported in the press | unverified
noise: Executive expectation | not evidence
base: Prior-year penalty amount carried forward.
prod: A rules-as-code calculator of the program's scoring methodology by year, Monte Carlo sampling of pending performance inputs from forecast distributions, a sensitivity analyser and a gap report, with every figure stamped with rule version and data snapshot.
pipe: Performance and payment intake @ warehouse extracts ; Program-year rule loader @ versioned rule tables ; Exposure scenario calculator @ deterministic policy calculator ; Input uncertainty sampler @ Monte Carlo from forecast models ; Sensitivity and gap report @ rules ; Finance and compliance review @ human ; Scenario archive and audit @ lakehouse
edge: Program rule change mid-year | outputs use stale rules | Rule version check with a mandatory refresh on publication
edge: Benchmarks published late | achievement thresholds unknown | Use prior-year thresholds with a flagged assumption
edge: Measure suppressed for low volume | no score can be computed | Follow program suppression logic and show it
edge: Facility merger | combined payment base | Mapping with lineage and a restated base
off: Absolute error of estimated exposure vs the official result by program year ; Interval coverage of the exposure range ; Rule-replication agreement with published examples
on: Exposure estimate error at year end ; Share of exposure explained by the top three measures ; Time to refresh after a rule publication
gap: Calling a statistical estimate the penalty ; Applying one year's rules to another ; Hiding data gaps behind a single number
== patient-safety-incident-prioritization | Patient Safety Incident Prioritization | nlp,tabular | batch | advanced | a=0.3 k=3
obj: Triage patient-safety incident reports by potential severity, urgency, recurrence and required review pathway, so safety professionals open the highest-risk reports first and mandatory escalations are never delayed.
sor: Incident reporting system ; Patient safety event taxonomy ; Risk management case system
up: Incident narratives and structured fields ; Event categories, location and time ; Harm and severity fields ; Approved safety taxonomy and escalation rules ; Prior similar events
down: Safety officer review queue ; Mandatory escalation notifications ; Reviewer routing to quality or risk ; Trend dashboards
opt: Staffing and census context ; Medication and device event feeds
proto: Incident system API or batch extract, a classification service over REST and a worklist API with an escalation webhook; narratives pass through PHI redaction before modelling
own: Patient safety office ; Risk management ; Quality ; Clinical informatics
con: Deterministic escalation rules for sentinel and never events run first and always override the model ; Safety professionals determine final severity and reporting obligations ; The model suggests priority and routing and states what information is missing ; Free text is redacted of identifiers before modelling ; Calibrated risk scores with conservative thresholds ; Processes 15K reports per month with a first-pass turnaround under 10 minutes
sn: Escalation | Hard rules for sentinel events and reportable categories | A learned threshold | A missed sentinel event is unacceptable
sn: Severity | Potential severity and actual harm as separate fields | One severity number | Near misses can carry high potential harm
sn: Labels | Severity after safety review | Initial reporter severity | Reporters under- and over-state
sn: Missing info | Prompts for missing facts | Silent guess | An incomplete report needs a question not a score
sn: Fairness | Parity across units and reporter roles | Aggregate accuracy | Under-triage of some groups hides real risk
sig: Narrative risk phrases | model-extracted harm, equipment, medication and escalation cues | Narrative contains severity signals fields miss | Redacted text as at report time
sig: Event type and location risk | event category with unit risk profile | Context changes potential severity | Taxonomy version
sig: Recurrence | similar event count in the same unit or process in the last 90 days | Repeated events signal a system issue | Count only earlier events
sig: Report completeness | share of required fields filled | Poor reports need follow-up | At submission
noise: Reporter name or role seniority | bias source and unrelated to severity
noise: Report length | style rather than risk
noise: Submission time of day | process artefact
base: Keyword rules on the event category and harm field.
prod: A deterministic escalation rule layer followed by a transformer text classifier and gradient-boosted tabular model combined into a calibrated priority score with routing suggestions, a missing-information prompt and an abstain path.
pipe: Report intake and PHI redaction @ intake service ; Mandatory escalation rules @ taxonomy rules ; Severity and routing classifier @ transformer with gradient boosting ; Calibration and abstention @ conformal thresholds ; Safety officer review @ human ; Outcome labels and audit @ case system ; Fairness report @ lakehouse
edge: New event type not in the taxonomy | classifier mislabels | Out-of-vocabulary detector and a manual route
edge: Report written in another language | text model degrades | Language detection and a manual route
edge: Delayed severity update | label changes after review | Use the label after safety review and track revisions
edge: Bulk submission after an incident | the queue floods and real signals are buried | Duplicate grouping and an incident-level view
off: Recall for high-severity reports at the review capacity ; Macro-F1 by event category ; Calibration error and subgroup parity
on: Time from report to first review for high-severity events ; Escalations missed by rules ; Reviewer re-prioritisation rate
gap: Training on reporter-assigned severity ; Random split that leaks duplicate reports ; Letting the model override a mandatory rule
== patient-safety-event-root-cause-discovery | Patient Safety Event Root-Cause Discovery | nlp,graph | batch | staff-principal | a=0.1 k=4
obj: Find recurring contributing factors and system patterns across de-identified safety events, giving investigators hypotheses and evidence links without asserting causality from correlation.
sor: Incident reporting system ; Root-cause analysis case repository ; Process and workflow data ; Safety causal taxonomy
up: De-identified incident narratives and metadata ; Workflow and process event data ; Approved contributing-factor taxonomy ; Prior investigation outcomes
down: Investigator hypothesis board ; Quality council themes report ; Improvement project proposals ; Trend dashboards
opt: Staffing and equipment maintenance records ; Environmental and layout data
proto: Governed warehouse extracts of de-identified narratives and a topic and graph analytics service with a read-only investigator view
own: Patient safety office ; Quality ; Human factors and clinical engineering
con: Narratives are de-identified before analysis ; Output is a hypothesis with evidence links and never a causal claim or a finding of blame ; Investigators lead causal analysis using the approved taxonomy ; Clusters carry coherence and stability measures ; Individual staff are never named or ranked ; Analyses 200K de-identified reports in a batch run
loss: \mathcal{L}=-\sum_{(i,j)}\log\sigma(z_i^\top z_j)+\lambda\,\mathrm{Contrastive}
sn: Claim | Candidate contributing factor with evidence | Causal conclusion | Correlation across reports is not cause
sn: Taxonomy | Mapping to the approved factor taxonomy | Free topic labels | Investigators need comparable categories
sn: Stability | Clusters that persist across resamples and periods | One clustering run | Unstable clusters mislead action
sn: People | System and process factors | Named individuals | Blame suppresses reporting
sn: Evidence | Linked source reports | Summary only | Reviewers must read the underlying events
sig: Semantic cluster membership | embedding-based cluster of narratives with coherence score | Groups similar events | De-identified text only
sig: Temporal concentration | cluster counts by month and unit | Reveals emerging patterns | Event time
sig: Process-step co-occurrence | workflow step linked to an event in the graph | Anchors the pattern in a process | Mapped by taxonomy
sig: Factor co-occurrence graph | co-occurring contributing factors across events | Reveals compound causes | Only taxonomy-coded factors
noise: Reporter identity | not a system factor
noise: Rare words unique to one report | outliers
noise: Report author department | confounds reporting culture with safety
base: Keyword counts by event category and month.
prod: Embedding-based topic clustering with stability checks, a contributing-factor graph with co-occurrence and temporal analytics, evidence links to source reports and an investigator workbench that records hypotheses and outcomes.
pipe: De-identified narrative intake @ warehouse extracts ; Narrative embedder @ sentence transformer ; Topic and cluster builder @ HDBSCAN with stability checks ; Contributing-factor graph @ graph analytics ; Hypothesis evidence builder @ source links ; Investigator review @ human ; Hypothesis outcomes and audit @ case repository
edge: Reporting culture change | volume of reports shifts patterns | Normalise by reporting rate and flag the change
edge: Small clusters | statistical noise | Minimum cluster size with a manual review path
edge: Re-identification risk in free text | names remain in text | De-identification check and suppression
edge: Spurious cluster driven by a template | boilerplate dominates | Template removal and tf-idf weighting
off: Topic coherence and cluster stability across resamples ; Agreement of cluster factors with investigator-coded factors ; Hypothesis hit rate in follow-up reviews
on: Investigations started from a surfaced pattern ; Recurring-event reduction in addressed patterns ; Investigator time to a first hypothesis
gap: Reporting a correlation as a cause ; Evaluating clusters only by visual inspection ; Mixing identified and de-identified text
== regulatory-quality-measure-gap-detection | Regulatory Quality Measure Gap Detection | llm-agents,nlp | seconds | advanced | a=0.02 k=120 s=3 t=350
obj: Identify missing documentation, measure evidence, workflow steps and data fields needed to satisfy selected quality requirements, with a requirement-to-evidence map that cites its sources and rule versions.
sor: Quality and performance reporting system ; Policy and document repository ; Evidence repository ; Measure specification library
up: Versioned measure specifications and regulatory requirements ; Policy and procedure documents ; Clinical and operational documentation ; Evidence in the repository ; Workflow and data-field catalogues
down: Quality owner gap worklist ; Accountable-owner tasks ; Readiness dashboard ; Audit evidence index
opt: Peer-organisation published guidance ; Accreditation survey findings
proto: Retrieval over versioned documents and specs through a REST service, a knowledge graph of requirements, evidence and owners and a worklist API
own: Quality and accreditation ; Compliance ; Clinical informatics ; Policy owners
con: Every claim cites the source document and the rule version ; The system abstains when evidence is absent and never fabricates evidence ; The quality or compliance owner confirms applicability and closes gaps ; Requirements are versioned by effective date ; Retrieval is limited to approved repositories and documents are untrusted input ; Answers a requirement query in under 3 seconds
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{requirement},\text{evidence})+\lambda\,\mathrm{Calibration}
sn: Mapping | Requirement to evidence map with citations | Free-text answer that a requirement is met | A claim without evidence will not survive an audit
sn: Rules | Deterministic checks for required fields and dates | LLM judgement for every gap | Rules are cheaper and exact
sn: Applicability | Owner confirms whether a requirement applies | Assumed applicability | A requirement for a service not offered is a false gap
sn: Abstention | Insufficient evidence is a result | Best guess | Guesses create false assurance
sn: Version | Requirement version at the date in scope | Latest text | Audits judge against the version in force
sig: Evidence coverage | share of requirement elements with a cited evidence span | Core gap measure | Retrieved from approved sources
sig: Evidence freshness | age of the evidence relative to the required period | Stale evidence fails the requirement | Document dates
sig: Citation precision | share of cited spans that actually support the claim | Quality of the retrieval | Judged on a labelled set
sig: Owner responsiveness | days from gap assignment to closure in prior cycles | Prioritises follow-up | Past cycles only
noise: Document length | not evidence quality
noise: Author seniority | not evidence quality
noise: Query phrasing | model sensitivity
base: Manual spreadsheet cross-walk of requirements to policies.
prod: Hybrid retrieval over versioned requirement and evidence collections, a requirement-to-evidence knowledge graph, rule checks for required fields and dates and an LLM that explains gaps strictly from retrieved passages with citations and abstention.
pipe: Requirement and document intake @ versioned repositories ; Hybrid retriever @ vector and keyword index ; Rule checker for fields and dates @ versioned rules ; Gap explainer with citations @ LLM ; Citation and policy guard @ citation verifier ; Quality owner review @ human ; Gap log and audit @ case system
edge: Evidence exists in a scanned file | retrieval misses it | OCR and layout parsing before indexing
edge: Policy updated after evidence date | the evidence is stale | Effective-date logic and a refresh task
edge: Conflicting policies | two documents disagree | Surface both with citations
edge: Prompt injection in a document | model changes behaviour | Documents treated as data and tool-free generation
off: Citation precision and unsupported-claim rate ; Gap recall against audited gaps ; Abstention accuracy on requirements with no evidence
on: Gaps closed before the audit date ; Owner time per requirement ; False-gap rate after owner review
gap: Scoring answers without checking citations ; Using latest requirements for an old period ; Asking the model whether a requirement is met
== corrective-action-capa-effectiveness-prediction | Corrective Action & CAPA Effectiveness Prediction | tabular,time-series | batch | advanced | a=0.1 k=2
obj: Estimate recurrence risk and monitor whether corrective and preventive actions are implemented and effective, flagging overdue or weak actions and evidence gaps for the quality committee.
sor: Quality management and CAPA system ; Incident reporting system ; Action-tracking and audit system
up: Incident history and root-cause hypotheses ; CAPA plans, owners and due dates ; Implementation evidence ; Recurrence indicators ; Effectiveness-check results
down: Quality committee review list ; Action owner reminders ; Overdue and weak-action report ; Closure recommendation for approval
opt: Audit findings ; Staffing and process change logs
proto: CAPA system API or extracts, a rule engine for workflow states and a survival model service with a committee worklist
own: Quality and patient safety ; Risk management ; Action owners ; Compliance
con: The safety or quality committee approves every CAPA closure ; Workflow rules handle overdue and missing-evidence conditions and the model only estimates recurrence risk ; No causal claim that an action worked without a suitable design ; Time-to-recurrence keeps censoring ; Alerts show the evidence gap and owner ; Scores 30K open and closed actions nightly
sn: Effect | Recurrence after the action with a comparison period | Closure of the action | A closed action is not an effective action
sn: Outcome | Time to recurrence with censoring | Binary recurred or not | Short follow-up hides recurrences
sn: Rules | Overdue and missing-evidence checks by rule | Predictive score for deadlines | Deadlines are facts
sn: Causality | Recurrence-risk signal with stated limits | Claim that the action caused the change | Regression to the mean looks like improvement
sn: Quality | Action strength using a standard hierarchy | Count of actions | Education alone is a weak action
sig: Action strength | classification on an action-strength hierarchy | Stronger system fixes work better | From the plan
sig: Implementation evidence | evidence type and date relative to the due date | Shows the action is real | As at scoring
sig: Pre-action event rate | events per month before the action | Baseline for recurrence | Window before the action date
sig: Owner load | open actions per owner | Overloaded owners miss follow-through | Counts as at scoring
noise: Action text length | style
noise: Owner seniority | not a cause of effectiveness
noise: Meeting where the action was agreed | context not mechanism
base: Overdue-action report and a manual 90-day check.
prod: Rule-based workflow tracking with a discrete-time survival model for time to recurrence of the event pattern, action-strength and evidence features, and a monitoring layer that reports whether recurrence fell relative to a pre-action baseline.
pipe: Action and incident intake @ CAPA system extracts ; Workflow state rules @ overdue and evidence checks ; Recurrence risk model @ discrete-time survival ; Effectiveness monitor @ pre-post comparison ; Quality committee review @ human ; Outcome and audit log @ lakehouse
edge: Concurrent changes | recurrence falls for another reason | Flag overlapping initiatives and avoid effect claims
edge: Low event volume | intervals are too wide to act on | Report uncertainty and extend the follow-up window
edge: Action reopened | timeline resets | Event history with reopen events
edge: Reclassified event | recurrence definition shifts | Versioned event taxonomy
off: Concordance index and time-dependent AUC at 6 and 12 months ; Calibration of recurrence risk ; Overdue-action rule precision
on: Recurrence rate of addressed patterns ; Actions closed with evidence ; Time from action to effectiveness check
gap: Treating closure as effectiveness ; Ignoring regression to the mean ; Ignoring right-censoring
== clinical-quality-performance-anomaly-detection | Clinical Quality Performance Anomaly Detection | time-series,tabular | batch | advanced | a=1 k=2
obj: Detect unexpected changes in quality indicators across facilities, units, specialties and time, and tell analysts whether a change is more likely a data problem or a real performance shift before escalating.
sor: Quality and performance reporting system ; Enterprise data warehouse ; Measure specification library
up: Quality metrics with numerators and denominators ; Case-mix variables ; Reporting latency and completeness ; Facility hierarchy ; Measure versions
down: Quality analyst triage queue ; Escalation to quality leadership ; Data-quality ticket to data owners ; Trend dashboard
opt: Peer comparison data ; Staffing and census context
proto: Warehouse extracts with measure version tags, a detection service with a REST API and a ticket integration for data issues
own: Quality analytics ; Clinical informatics ; Data engineering ; Quality and patient safety
con: Data-quality gates run before any performance alarm ; Alerts carry baseline comparison and a data-versus-performance classification ; A quality analyst validates before any escalation ; Seasonality, case mix and denominators are handled explicitly ; Alert budget per analyst per week ; Scores 25K indicator-by-unit series nightly
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
sn: Data first | Data-quality gate on completeness and definition changes | Treating every change as performance | Most apparent shifts are data defects
sn: Baseline | Seasonal, case-mix-adjusted baseline | A fixed control limit | Holidays and mix shifts fire false alarms
sn: Volume | Statistical tests aware of denominators | Raw rate thresholds | Small denominators fluctuate widely
sn: Attribution | Data or performance cause with evidence | Alert without context | Analysts then investigate blind
sn: Budget | Weekly alert budget agreed with analysts | Maximum sensitivity | Analysts stop looking
sig: Adjusted deviation from baseline | standardised residual after seasonality and case mix | The core anomaly score | Baseline fit on earlier periods
sig: Data completeness at cut-off | share of expected records present | Separates lag from change | At the cut-off
sig: Definition change flag | measure or coding version change in the window | Common source of artefacts | Version tags
sig: Cross-unit coherence | whether peer units show the same shift | Shared shifts suggest data or policy changes | Same period
noise: Single low-denominator month | noise
noise: Unreviewed manual overrides | inconsistent
noise: Weekend effects in monthly measures | seasonality
base: Control chart with fixed three-sigma limits.
prod: Multivariate and seasonal time-series anomaly detection on adjusted indicators with a data-quality gate in front, a data-versus-performance classifier behind it and an analyst triage view with baseline comparison.
pipe: Indicator and metadata intake @ warehouse extracts ; Data-quality gate @ validation rules ; Adjusted baseline builder @ seasonal and case-mix model ; Anomaly detector @ robust residual model with isolation forest ; Data-versus-performance classifier @ gradient boosting ; Quality analyst review @ human ; Triage outcome and feedback @ lakehouse
edge: Measure specification update | step change in every series | Version-aware baselines and a suppressed alert window
edge: Late-arriving data | an apparent drop recovers later | Completeness gating and re-scoring on arrival
edge: Seasonality shift | alerts at the same month each year | Multi-year seasonal profiles
edge: Merged units | the hierarchy changes | Hierarchy versioning and a series break
off: Detection recall and precision on seeded and adjudicated shifts at the alert budget ; Data-versus-performance classification accuracy ; Median time to detection
on: Analyst-confirmed performance shifts caught early ; Data defects found by the gate ; Alert acknowledgement rate
gap: Treating data defects as performance ; Tuning on seeded anomalies only ; Using fixed limits for seasonal measures
== quality-improvement-initiative-prioritization | Quality Improvement Initiative Prioritization | reinforcement-learning,tabular | batch | advanced | a=0.1 k=3
obj: Rank proposed improvement projects by patient impact, compliance urgency, feasibility, cost, equity and expected benefit, giving leaders a transparent portfolio with trade-offs and assumptions to decide from.
sor: Quality management system ; Project and portfolio tracking ; Finance and budget system ; Quality gap and incident repositories
up: Quality gaps and incident trends ; Project proposals with cost and resource estimates ; Evidence strength for each intervention ; Strategic priorities and weights ; Equity indicators
down: Leadership portfolio review ; Quality council decision record ; Resource allocation plan ; Benefit tracking
opt: Published intervention evidence ; Peer programme results
proto: Governed inputs in a portfolio workbook and an optimisation API; weights are set in a versioned decision-criteria table
own: Quality and patient safety ; Strategy office ; Finance ; Health equity office
con: Leadership sets criteria weights and makes the final portfolio decision ; Hard constraints cover budget, staffing capacity and mandatory compliance projects ; The scoring method is transparent and its weights are versioned ; Assumptions and evidence strength are shown beside every score ; Equity impact is an explicit criterion ; Infeasibility reports which constraint binds
loss: \max\;\sum_k x_k\big(\sum_m w_m\,\text{score}_{km}\big)\quad\text{s.t.}\quad\sum_k c_k x_k\le B
sn: Method | Multi-criteria decision analysis with explicit weights | Single opaque score | Leaders must be able to challenge a ranking
sn: Evidence | Evidence strength as a criterion and an uncertainty | Point benefit estimate | Weak evidence deserves a discount
sn: Constraints | Budget and capacity as hard limits | Ranking without limits | A ranked list leaves the budget problem unsolved
sn: Compliance | Mandatory projects fixed in the portfolio | Everything scored equally | Compliance deadlines are not optional
sn: Sensitivity | Rank stability across weight changes | One weight set | A fragile top choice should be seen
sig: Expected patient impact | estimated harm avoided or outcomes gained with evidence grade | The core value | Estimates from the stated source
sig: Compliance urgency | days to a mandatory deadline and penalty exposure | Hard drivers | Calendar
sig: Feasibility | resource requirement against available capacity | Unrealistic projects waste effort | Current capacity
sig: Equity benefit | expected reduction in disparities by group | Makes equity explicit | Group definitions agreed in advance
noise: Sponsor seniority | pressure not merit
noise: Project name or branding | not value
noise: Past project success rate of the team | confounded
base: Ranking by sponsor request and a cost threshold.
prod: Multi-criteria scoring with versioned weights, a constrained portfolio optimiser for resource allocation under budget and capacity limits, a rank-stability sensitivity analysis and a decision record generator.
pipe: Proposal and gap intake @ portfolio workbook ; Criteria scoring @ MCDA with versioned weights ; Portfolio optimizer under budget and capacity constraints @ integer program ; Sensitivity and equity analysis @ scenario engine ; Leadership review @ human ; Decision record and benefit tracking @ portfolio system
edge: Weights disputed | different leaders prefer different weights | Scenario views per weight set and a recorded decision
edge: Cost estimates change | the portfolio is no longer feasible | Re-run with versioned inputs
edge: Dependencies between projects | independent scoring misleads | Dependency constraints in the optimiser
edge: Proposals game the criteria | inflated benefit | Evidence review and reference-class checks
off: Rank stability under weight perturbation ; Portfolio value vs the best feasible portfolio ; Estimate calibration against realised benefit
on: Realised benefit of selected projects ; Portfolio utilisation of capacity ; Share of mandatory deadlines met
gap: Treating estimated benefits as certain ; Ignoring budget as a constraint ; Letting weights be chosen to produce a preferred answer
== vendor-credential-compliance-risk-scoring | Vendor Credential Compliance Risk Scoring | tabular,nlp | batch | foundational | a=0.5 k=3
obj: Identify vendor representatives whose required credentials, training, insurance or attestations are missing, expired or inconsistent, and give access staff an evidence-linked risk score and eligibility recommendation.
sor: Vendor credentialing and access management system ; Vendor master data ; Facility access and visitor management system
up: Vendor and representative records ; Credential documents ; Training completion ; Insurance certificates ; Facility policy and visit history
down: Access desk eligibility screen ; Vendor reminder and remediation workflow ; Compliance exception queue ; Facility security review
opt: Immunisation and background-check provider results where policy requires them ; Contract records
proto: REST and SFTP extracts from the vendor system, document intake with OCR and a verification worklist; eligibility is a recommendation shown to access staff
own: Vendor management ; Facility security ; Infection prevention ; Compliance
con: Rules-first validation decides compliance and the model only prioritises risk ; Access remains governed by facility policy and authorised staff ; Missing evidence is shown as missing and not as ineligible ; Evidence-linked scores show the missing or expired item ; Handles 200K representative-credential records ; Personal data is minimised and retained per policy
sn: Compliance | Rule check of each requirement against evidence | A learned score of compliance | Facilities must show exactly which requirement fails
sn: Evidence | Document and date linked to each requirement | Self-attestation only | Attestations need verification where policy requires it
sn: Risk | Prioritisation by expiry proximity and criticality | Binary pass-fail | Reviewers need a queue not a list
sn: Decision | Recommendation to access staff | Automatic denial | Access decisions are policy decisions
sn: Consistency | Cross-document identity and date checks | Single document trust | Mismatches reveal errors
sig: Days to nearest expiry | minimum days to expiry across required items | Imminent lapse risk | Use document dates
sig: Missing requirement count | requirements with no valid evidence | Direct compliance gap | Catalogue version
sig: Visit frequency and areas | recent visit frequency and clinical areas visited | Higher exposure needs stricter checks | Past visits only
sig: Historical lapse rate | share of past cycles with a lapse for the vendor | Predicts friction | Strictly earlier cycles
noise: Vendor company size | not a compliance cause
noise: Representative name | personal and not predictive
noise: Visit purpose free text | noisy
base: Spreadsheet of credential expiry dates with a monthly review.
prod: Deterministic requirement validation against a versioned catalogue, document extraction for evidence, and a gradient-boosted risk prioritiser that ranks representatives by likelihood of lapse and exposure, each with its supporting evidence attached.
pipe: Credential and document intake @ vendor portal and document OCR ; Requirement validator @ versioned requirement rules ; Compliance risk model @ gradient boosting ; Eligibility recommendation @ policy rules ; Access staff and compliance review @ human ; Evidence and audit log @ document store
edge: Vendor submits late | an eligible person is blocked | Provisional status rules defined in policy
edge: Requirement catalogue changes | all vendors appear non-compliant | Effective-date versions and a grace period
edge: Same person works for two vendors | identity confusion | Strong identifiers and a steward check
edge: Forged or altered certificate | evidence looks valid | Verification with the issuer where policy requires it
off: PR-AUC and precision at the review capacity ; Rule-evaluation accuracy on audited records ; Calibration by vendor category
on: Lapsed credentials reaching a facility ; Time to remediate a gap ; Access desk handling time
gap: Scoring on records already remediated ; Mixing requirement catalogue versions ; Treating missing evidence as violation
== vendor-access-risk-prediction | Vendor Access Risk Prediction | time-series,graph | batch | advanced | a=1 k=2
obj: Identify unusual vendor access patterns, such as unexpected location, time or frequency and policy deviations, so security staff can review with explainable context and no automatic accusation.
sor: Facility access control system ; Visitor and vendor management system ; Role-based access policy register
up: Approved access logs ; Visit schedules and authorisations ; Facility zones ; Vendor credentials ; Role-based access policy
down: Security review queue ; Access policy owner report ; Vendor manager notification for context ; Audit report
opt: Badge-reader health telemetry ; Visitor escort records
proto: Batch extracts and event streams from access control, a detection service with an API and a case workflow; strict allow-list and policy rules run first
own: Facility security ; Vendor management ; Privacy office ; Compliance
con: A strict allow-list and policy rules decide violations and anomaly models are supplemental ; No automatic accusation or punitive action and security staff investigate ; Alerts explain which pattern was unusual and the baseline ; Privacy, retention and labour-policy safeguards apply to access data ; Per-reviewer alert budget ; Scores 3M access events nightly
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
sn: Policy | Deterministic policy check against authorisation | Anomaly score as the finding | A policy breach is a fact not a probability
sn: Baseline | Per-vendor and per-zone behaviour baseline | Global thresholds | Vendors differ by service and site
sn: Context | Visit schedule and event calendar in the model | Access events alone | A planned installation explains a night visit
sn: Language | Unusual pattern for review | Suspicious vendor | Labelling people causes harm and legal exposure
sn: Budget | Alerts per reviewer per week | Maximum recall | Reviewers stop trusting noisy alerts
sig: Time and zone deviation | distance of a visit from the vendor's usual time and zones | The primary behavioural signal | Baselines from earlier periods
sig: Frequency change | change in visit rate against the vendor baseline | Detects drift in activity | Trailing windows
sig: Access path novelty | whether the sequence of zones is new for the vendor | Graph path anomaly | Past paths only
sig: Authorisation gap | access outside the scheduled visit window or purpose | Direct policy deviation | Schedule snapshot at the time
noise: Vendor company name | irrelevant to behaviour
noise: Individual representative demographics | protected
noise: Badge reader brand | hardware artefact
base: Report of vendor access outside scheduled hours.
prod: A policy allow-list and rule engine for hard violations, a temporal and graph-based anomaly model over per-vendor baselines for the rest, and a reviewer view that shows the baseline, the unusual pattern and the authorisation context.
pipe: Access event intake @ access control stream ; Policy and allow-list rules @ role-based policy rules ; Baseline builder @ per-vendor profiles ; Sequence and graph anomaly detector @ isolation forest with graph paths ; Explanation builder @ rule trace and baseline view ; Security reviewer @ human ; Case outcome and audit @ case workflow
edge: New vendor | no baseline exists and normal activity looks unusual | Peer-group baseline with low confidence
edge: Emergency repair outside normal hours | pattern is legitimate | Emergency authorisation records as context
edge: Reader outage | missing events look like absence | Reader health feed and suppression
edge: Credential sharing suspicion | evidence is partial | Neutral case wording and security review before any step
off: Precision and recall of confirmed review findings at the alert budget ; Rule-versus-model agreement ; Explanation usefulness rating from reviewers
on: Confirmed policy exceptions found ; Reviewer time per alert ; False-alarm rate
gap: Training on investigated cases only ; Treating anomalies as violations ; Ignoring planned work context
== vendor-visit-demand-forecasting | Vendor Visit Demand Forecasting | time-series | batch | foundational | a=1 k=1
obj: Forecast vendor representative visits by facility, department, time and service line so access desks can plan capacity, schedule appointments and reduce congestion.
sor: Visitor and vendor management system ; Facility operations calendar ; Service-line schedule system
up: Historical visit bookings ; Service calendars and procedure schedules ; Facility rules and access windows ; Vendor category ; Event schedules
down: Access desk staffing plan ; Appointment slot capacity ; Facility operations dashboard ; Vendor scheduling guidance
opt: Weather and local event data ; Product launch and recall calendars
proto: Batch extracts and REST from the visitor system and a forecast API with a capacity planning view
own: Facility operations ; Vendor management ; Supply chain
con: Forecasts 20K facility-department-hour series nightly ; Facility operations approve capacity and access windows ; Outputs show peak periods and uncertainty ; Visit counts are aggregate and not tied to individuals ; Holidays and service-line events are explicit drivers ; Cancellations and no-shows are modelled
sn: Target | Arrivals actually signed in per interval | Bookings alone | Bookings include cancellations and walk-ins
sn: Calendar | Service and event calendars as drivers | Day-of-week only | Product launches and procedures move demand
sn: Granularity | Hourly counts where capacity decisions are hourly | Daily totals | Congestion is a peak problem
sn: Uncertainty | Peak quantiles | Mean forecast | Capacity is sized for the peak
sn: Policy | Access windows as hard limits | Unconstrained demand | Facilities cannot accept visits outside windows
sig: Booking pace | bookings received by lead time versus the usual profile | Early indicator of volume | Snapshot at forecast time
sig: Service-line schedule load | scheduled procedures by service line | Vendors attend procedures | Schedule snapshot
sig: Seasonality | weekly, monthly and holiday patterns | Explains most regular variation | Past data
sig: Event flags | training days, product launches and maintenance windows | Spikes in visits | Published calendars
noise: Vendor brand | not a stable driver
noise: Individual representative identity | privacy
noise: Weather | minor effect
base: Same-weekday trailing average of visits.
prod: Hierarchical count forecasting with service-line and booking-pace drivers, quantile outputs at the hour level and a capacity planner that converts the peak quantile into desk staffing.
pipe: Visit and booking intake @ visitor system extracts ; Calendar and driver builder @ feature store ; Visit demand forecaster @ hierarchical count model ; Capacity planner @ rule table ; Facility operations review @ human ; Forecast archive @ lakehouse
edge: Facility closure | zero visits for a period | Calendar flags and a closure mask
edge: New vendor programme | visits step up and look like an anomaly | Manual override with a ramp assumption
edge: Check-in outage | missing arrivals | Gap fill from bookings with a flag
edge: Policy change in access windows | the shape of demand shifts | Policy version as a driver
off: WAPE and pinball loss by hour and facility ; Peak-hour coverage at the 90th percentile ; Interval coverage
on: Peak wait time at the access desk ; Desk staffing hours per visit ; Visits outside the access window
gap: Using bookings as the target ; Scoring on daily totals only ; Ignoring cancellations
== vendor-access-policy-violation-detection | Vendor Access Policy Violation Detection | time-series,tabular | batch | advanced | a=2 k=2
obj: Detect access attempts that conflict with approved hours, locations, credentials, visit purpose or restricted-area rules, with an evidence timeline, a severity and an escalation path for security staff.
sor: Facility access control system ; Visitor and vendor management system ; Access policy register ; Credential compliance records
up: Access control events ; Visit authorisations ; Credential state ; Location and restricted-area policy ; Time windows
down: Security operations queue ; Escalation to facility leadership ; Vendor manager notification ; Audit export
opt: CCTV event references under policy ; Escort assignment records
proto: Event streams and extracts from access control, a rules engine with an event correlator and a case workflow with escalation
own: Facility security ; Compliance ; Vendor management
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: A deterministic policy engine decides violations and anomaly models are supplemental only ; Security personnel review and respond and the system takes no sanction or denial itself ; Every violation shows the rule, the event timeline and the authorisation in force ; Events are correlated by time and credential state ; Latency under 5 minutes from event to alert for restricted areas ; Retention and privacy limits apply to access logs
sn: Rules | Policy rules over authorised windows, areas and credentials | A learned violation classifier | Violations are defined by policy not by pattern
sn: Evidence | Timeline of access, authorisation and credential state | Single event | One event rarely proves a violation
sn: Severity | Restricted-area and patient-area weighting | Equal weights | Some zones carry far higher risk
sn: Models | Anomaly score ranks the residual | Anomaly as the decision | Residual ranking helps without defining violation
sn: Response | Escalation path to named roles | Unrouted alert | Alerts without owners are ignored
sig: Authorisation mismatch | access outside the approved window, area or purpose | Direct violation | Authorisations as at the event
sig: Credential state at event time | whether required credentials were valid | Invalid credentials make access non-compliant | Point-in-time status
sig: Restricted-area sensitivity | zone risk class | Severity weighting | From the zone register
sig: Repeat-pattern count | similar events by the same vendor in the last 30 days | Repeated breaches differ from isolated ones | Past events
noise: Vendor revenue | irrelevant
noise: Badge reader brand | artefact
noise: Representative identity | privacy
base: Nightly report of access events outside the scheduled window.
prod: Deterministic policy engine with event correlation and credential-state lookups, severity scoring by zone, and a supplementary anomaly ranker for the unmatched residual, producing a violation record with timeline and escalation.
pipe: Access and authorisation intake @ event stream ; Policy rule engine @ versioned access rules ; Event correlator @ timeline builder ; Severity and escalation rules @ zone policy ; Residual anomaly ranker @ isolation forest ; Security review @ human ; Case outcome and audit @ case workflow
edge: Clock skew between systems | events look out of order | Time synchronisation checks and tolerance windows
edge: Authorisation entered late | access looks unauthorised | Late-authorisation window before alerting
edge: Door held open by staff | false violation | Event type filters and a review path
edge: Policy update | rule versions differ across sites | Effective-date rule versions
off: Rule precision and recall against security-confirmed violations ; Alert latency at the 95th percentile ; Severity ranking agreement with reviewers
on: Confirmed violations resolved within SLA ; Violations reaching restricted areas ; False-alert share
gap: Letting an anomaly model define a violation ; Comparing events without time alignment ; Ignoring late authorisations
== vendor-compliance-document-intelligence | Vendor Compliance Document Intelligence | nlp,tabular | batch | advanced | a=0.2 k=300
obj: Extract and validate insurance, licences, certificates, training records, attestations and contract-linked evidence from vendor documents, with provenance, expiry alerts and a discrepancy queue for reviewers.
sor: Vendor credentialing and access management system ; Vendor master data ; Contract repository ; Document repository
up: PDF and image documents ; Vendor master ; Requirements catalogue ; Expiry rules ; Approved verification sources
down: Reviewer validation workbench ; Expiry alert workflow ; Requirement coverage report ; Vendor remediation request
opt: Insurance carrier verification services ; Training provider records
proto: Document upload and intake with OCR, REST to verification services and a reviewer worklist API; structured results are written back to the vendor system after approval
own: Vendor management ; Compliance ; Risk management ; Procurement
con: Every extracted value links to its page and region with a confidence ; Reviewers validate ambiguous or legally material evidence and the system never accepts a certificate on its own ; Requirements and expiry rules come from a versioned catalogue ; Handles 150K documents per month with a first pass under 10 minutes ; Documents are untrusted input and cannot trigger tool calls ; Personal data is minimised
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid x)+\lambda\,\mathrm{Calibration}
sn: Provenance | Value with page, region and confidence | Value alone | Reviewers must see the source to trust a value
sn: Rules | Deterministic coverage and expiry rules | Model guess at validity | Validity is a rule not a prediction
sn: Materiality | Review queue for ambiguous or material evidence | Auto-accept above a score | Coverage limits and named insureds carry legal weight
sn: Verification | Issuer verification where available | Extraction as verification | A scanned certificate can be forged
sn: Formats | Layout-aware extraction across certificate types | One template | Vendors submit many layouts
sig: Field confidence | calibrated confidence per extracted field | Directs review | Held-out document groups
sig: Coverage versus requirement | extracted limits against required limits | Core compliance test | Requirement catalogue version
sig: Named-entity agreement | vendor and insured names versus vendor master | Detects wrong-entity evidence | Master as at scoring
sig: Expiry proximity | days to the document expiry | Alerting | Document dates
noise: Logo and letterhead | layout style
noise: Document file name | not content
noise: Page count | not validity
base: Manual keying from PDFs into the vendor system.
prod: Layout-aware OCR and extraction with document classification and calibrated field confidences, a rules engine for requirement coverage and expiry, reconciliation to the vendor master and a reviewer workbench with highlighted source regions.
pipe: Document intake and OCR @ upload service with OCR engine ; Document classifier @ layout-aware transformer ; Field extractor @ document AI with spans ; Requirement and expiry rules @ versioned catalogue ; Master reconciliation @ rules and fuzzy lookups ; Reviewer validation @ human ; Evidence store and audit @ document store
edge: Certificate lists several insured parties | the wrong party is extracted | Entity matching to the vendor master with a review route
edge: Scan is rotated or skewed | extraction fails | Image normalisation and a manual route
edge: Expiry stated in a non-standard way | date extraction fails | Date normalisation rules and low-confidence routing
edge: Document contains injected instructions | downstream behaviour changes | Treat as data and constrain tools
off: Field-level F1 and exact match by document type ; Calibration of field confidence ; Requirement-coverage accuracy on audited files
on: Reviewer time per document ; Share of fields accepted without edits ; Lapsed-evidence incidents
gap: Splitting by page not by vendor ; Evaluating on clean PDFs only ; Counting extraction as verification
== facility-access-pattern-anomaly-detection | Facility Access Pattern Anomaly Detection | time-series,graph | batch | advanced | a=1 k=2
obj: Detect unusual access patterns across facilities, staff, contractors and authorised visitors, show the affected access path and evidence, and send the case to security triage with hard policy checks run first.
sor: Facility access control system ; Identity and role directory ; Shift and roster system ; Access policy register
up: Badge and access events ; Identity roles ; Shift schedules ; Facility zones ; Approved access policy and event calendars
down: Security triage queue ; Facility manager notification for context ; Access policy owner report ; Audit export
opt: Door and reader health telemetry ; Visitor escort logs
proto: Event stream and batch extracts from access control, a graph and sequence detector with a REST API and a security case workflow
own: Facility security ; Privacy office ; HR operations ; Facilities
con: Hard policy checks run first and anomaly findings never decide a violation ; Security triages and the system never sanctions anyone ; Privacy, retention and labour-policy safeguards apply and findings are minimised and role-based ; Alerts show the access path and the baseline ; Individual-level flags require a documented purpose and review ; Scores 10M access events nightly
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
sn: Policy | Hard policy checks for zones, times and roles | Anomaly score as a rule breach | Policy is a fact and anomaly is a hint
sn: Context | Shift schedule, role and event calendar | Raw badge events | A night-shift employee is not unusual at night
sn: Path | Sequence and graph of zones visited | Individual events | Unusual routes show up only in the path
sn: Privacy | Minimised data with purpose limits | Monitoring of everyone | Surveillance beyond purpose breaks trust and law
sn: Language | Unusual pattern for triage | Suspect | Wrong labels harm staff
sig: Path novelty | whether the zone sequence is unseen for the identity and role | Detects off-pattern routes | Past paths
sig: Schedule alignment | access time relative to the rostered shift | Separates normal from off-shift access | Roster snapshot
sig: Role-zone fit | zones accessed against the role's allowed set | Strong policy signal | Role as of the event
sig: Peer deviation | difference from peers with the same role and unit | Normalises for site behaviour | Same period
noise: Employee demographics | protected
noise: Badge issue date | not behaviour
noise: Reader vendor | artefact
base: A report of badge use outside the shift window.
prod: Policy checks first, then a sequence and graph anomaly model over role-conditioned baselines to rank residual patterns with path explanations, wrapped in a triage workflow with privacy controls and retention limits.
pipe: Access event intake @ access control stream ; Policy rule checks @ role and zone rules ; Context joiner for shifts and roles @ feature store ; Sequence and graph anomaly model @ isolation forest with path features ; Explanation builder @ path and baseline view ; Security triage @ human ; Case and audit log @ case workflow
edge: Reorganisation changes roles | baselines mislead | Role versioning and a re-baseline window
edge: Large event or drill | many unusual paths | Event calendar suppression
edge: Reader failure | badge events go missing and gaps look like activity changes | Reader health feed
edge: Request for a named list | the output is misused to single out individuals | Access control denies and logs the request
off: Precision and recall of triaged findings at the alert budget ; Path-explanation usefulness rating ; Rule-versus-model agreement
on: Confirmed findings per 1000 alerts ; Triage time per alert ; Reader and policy issues discovered
gap: Treating anomalies as violations ; Ignoring shift context ; Retaining badge data beyond the stated purpose
