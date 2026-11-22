# Healthcare & Life Sciences, part 3: Workforce Intelligence (use cases 51-60)
# Source: the healthcare operations expansion plan. Every use case here is vendor-neutral and stays decision support only:
# a named manager approves any roster, offer or pay change, and no model output overrides a licensure, competency, rest or policy rule.
== healthcare-workforce-demand-forecasting-by-unit | Healthcare Workforce Demand Forecasting by Unit | time-series,tabular | batch | advanced | a=1 k=3
obj: Forecast role- and skill-specific staffing demand for every facility, unit and shift so leaders can plan rosters and contingency cover days or weeks ahead instead of discovering shortfalls at shift start.
sor: Workforce management and scheduling system ; Patient flow and ADT system ; Timekeeping and payroll system ; Staffing policy and approved-ratio register
up: HL7 v2 ADT feeds for census, admissions and discharges ; Acuity and workload scores from the EHR ; Historical worked hours from timekeeping ; Operating-room and clinic schedules for planned procedures ; Holiday and service-line calendars
down: Staffing office planning worklist ; Roster-draft input for the schedule builder ; Finance labour-budget forecast ; Facility dashboards with prediction intervals
opt: Regional event and weather calendars ; Seasonal respiratory-illness surveillance feeds ; Agency bureau demand signals
proto: HL7 v2 over MLLP for ADT, FHIR R4 Schedule and Slot reads for procedures, SFTP or REST extracts from timekeeping and scheduling, and a governed policy table for ratios
own: Nursing and clinical workforce planning ; Patient flow and capacity management ; Finance workforce analytics ; HR information systems
con: Forecasts 40K unit-shift-role series nightly at hourly, shift, day and week horizons ; Facility totals must reconcile to the sum of unit forecasts ; Workload demand is kept separate from the legally or policy-required minimum coverage ; Staffing leaders approve every roster change and nothing auto-assigns staff outside credentials, contracts or policy ; Pseudonymous employee IDs only and aggregate demand by role ; Prediction intervals are published beside every point forecast
sn: Target | Worked hours required by acuity-weighted workload per unit and shift | Scheduled hours or paid hours as the label | Scheduled hours encode past understaffing and past overstaffing as if they were demand
sn: Hierarchy | Unit forecasts reconciled to facility and system totals | Independent forecasts per unit that disagree with the facility total | Finance and operations then each trust a different number
sn: Minimum coverage | Policy minimum applied after the forecast as a deterministic floor | Letting the model learn the minimum from history | The model hides a legal floor inside a statistical average
sn: Census | Forecast census and planned-procedure load as exogenous drivers | Same-day actual census used when training the 7-day-ahead model | Actuals are unknown at forecast time and inflate offline accuracy
sn: Intervals | Calibrated 80 and 95 percent intervals per horizon | Point forecast only | A manager cannot size contingency cover without knowing the spread
sig: Acuity-weighted workload | sum of acuity scores times expected hours of care per patient-day | Workload, not headcount, drives the staff a unit needs | Use the acuity score as charted at forecast time
sig: Planned procedure load | scheduled cases by service line and day with historical conversion to inpatient stays | Elective volume is the most predictable driver of inpatient demand weeks ahead | Use the schedule snapshot as it stood at forecast time, not the cases that finally happened
sig: Admission and discharge rhythm | day-of-week and hour-of-day arrival and discharge profile per unit | Staffing demand follows patient flow within the day | Compute from event time not from the processing time of the feed
sig: Holiday and event calendar | distance to the nearest holiday and local event windows | Demand and cover both shift around holidays | Only calendars published before the forecast date
noise: Paid hours including overtime | reflects past shortage decisions and not the demand that caused them
noise: Individual employee attributes | demand is a property of the unit and shift and personal data adds privacy risk without signal
noise: Same-day census revisions | arrive after the planning cut-off and leak the answer
base: Seasonal-naive forecast of worked hours by unit and shift from the same weekday in recent weeks.
prod: Hierarchical gradient-boosted and statistical ensemble with exogenous workload drivers, quantile outputs, bottom-up and top-down reconciliation across unit, facility and system, and a deterministic policy-minimum floor applied after the model.
pipe: Census and schedule intake @ ADT feed and scheduling extract ; Workload feature builder @ point-in-time feature store ; Hierarchical demand forecaster @ gradient boosting with quantiles ; Reconciliation @ MinT hierarchical reconciliation ; Policy floor and ratio rules @ approved ratio register ; Staffing leader review @ human ; Forecast archive and feedback @ lakehouse
edge: New unit opens or closes | no history for the new series and a stale series for the closed one | Cold-start from a peer-unit profile and automatic retirement of series with no patients for 28 days
edge: Late or revised ADT feed | census backfills after the forecast ran | Event-time joins with a stated planning cut-off and a restatement job that records the revision
edge: Policy ratio change | the floor changes while the learned demand does not | Versioned ratio table with effective dates and an automatic re-run on change
edge: Pandemic or regional surge | history no longer resembles demand | Regime flag that widens intervals and routes to a manual scenario plan
off: WAPE and pinball loss by horizon and role ; Interval coverage at 80 and 95 percent ; Reconciliation error between unit and facility totals
on: Fill rate of planned shifts at publication ; Share of shifts covered by premium labour ; Forecast-to-actual worked-hours gap
gap: Training on paid hours that reflect past shortages ; Scoring accuracy on the last 24 hours only ; Letting actual census leak into the forecast features
== staffing-coverage-gap-prediction | Staffing Coverage Gap Prediction | tabular,time-series | batch | advanced | a=2 k=2
obj: Predict which upcoming shifts are likely to fall below minimum safe coverage or the required skill mix early enough to act, keeping a forecast risk distinct from a confirmed uncovered shift.
sor: Workforce management and scheduling system ; Credentialing and privileging system ; Timekeeping system ; Staffing threshold and escalation policy register
up: Published rosters and open-shift lists from scheduling ; Absence and leave records ; Credential and privilege status feeds ; Census forecasts from the demand forecast ; Float-pool eligibility and overtime rules
down: Staffing office escalation queue ; Open-shift marketplace and incentive workflow ; Unit manager dashboard ; Daily huddle report
opt: Agency bureau availability ; Real-time badge-in confirmation
proto: REST and SFTP extracts from scheduling and timekeeping, FHIR R4 PractitionerRole for credential status, and a message to the staffing office worklist
own: Staffing office ; Nursing operations ; Credentialing office
con: Scores every future shift in a 14-day window each night ; Coverage is evaluated by a deterministic rule engine and the model only ranks risk ; Confirmed uncovered shifts are reported separately from predicted gaps ; The staffing office confirms every assignment and the system recommends escalation only ; Minimum coverage and skill mix come from versioned policy not from history ; Calibrated probabilities with a stated alert budget per manager
sn: Label | Shift that actually fell below policy minimum at start time after all fills | Shift that was open at some earlier point | Most open shifts are filled and a model trained on them cries wolf
sn: Rules | Deterministic coverage check against skill mix and credential validity | A learned score that decides whether coverage is met | A model cannot prove a safe ratio and must never override the rule
sn: Timing | Lead time before shift start at which a gap is first predictable | Scoring only the final hours | A late alert leaves no time to find cover and inflates accuracy
sn: Alert budget | Gap alerts per manager per week agreed with operations | Maximising recall with no budget | Managers mute a noisy list within weeks
sn: Censoring | Shifts filled by the rules before start handled as time-to-event outcomes | Treating a successful intervention as a false positive | The model is penalised for the escalations it caused
sig: Open-shift age and fill hazard | hours since posting and historical fill rate for that role and shift type | Shifts that stay open past typical fill time rarely fill themselves | Use posting time and fill time as logged
sig: Absence pressure | notified absences and aggregate sick-call rate for the unit-shift | Absences are the largest source of late gaps | Count only absences notified before scoring time
sig: Eligible float depth | number of eligible float or cross-trained staff available for the shift | Gaps are survivable when eligible cover exists | Eligibility must come from verified credentials at that date
sig: Demand-to-roster margin | forecast required hours minus rostered hours for the unit-shift | The direct measure of how thin a shift is | Use the roster and forecast snapshots from scoring time
noise: Individual employee reliability scores | punitive in effect and a privacy risk with little signal beyond aggregate absence
noise: Manager identity | proxies for unit culture and is not a stable cause
noise: Posting channel | reflects process not coverage risk
base: Rule-only report of shifts currently below minimum plus a trailing fill-rate heuristic.
prod: Gradient-boosted discrete-time hazard and classification model for the probability that a shift ends below minimum, with severity bands and time-to-gap, wrapped by a deterministic coverage and escalation rule engine.
pipe: Roster and absence intake @ scheduling extract ; Coverage rule engine @ versioned policy rules ; Gap risk model @ gradient-boosted hazard model ; Severity and eligible-cover ranker @ credential-aware filter ; Escalation policy and alert budget @ policy rules ; Staffing office review @ human ; Outcome feedback and audit @ lakehouse
edge: Credential lapses between scoring and shift | a cover option becomes ineligible | Re-check eligibility at the moment of recommendation and again at assignment
edge: Mass absence on one day | thousands of shifts spike at once | Cap alerts per manager and roll up to a facility-level surge view
edge: Roster republished mid-day | the prediction refers to a stale roster | Version every score to the roster snapshot and drop scores for superseded versions
edge: Small units with few shifts | probabilities are unstable | Hierarchical pooling across similar units with stated minimum volume
off: PR-AUC and precision at the alert budget ; Calibration error by lead-time band ; Median lead time to first correct gap alert
on: Gaps closed before shift start ; Share of shifts below minimum at start ; Manager alert-acknowledgement rate
gap: Counting filled shifts as false positives ; Scoring only shifts close to start ; Using a model score where a rule decides coverage
== float-pool-cross-department-staff-allocation | Float Pool & Cross-Department Staff Allocation | reinforcement-learning,tabular | batch | advanced | a=0.5 k=3
obj: Allocate eligible float-pool and cross-trained staff to units with shortages, improving coverage while preserving continuity, fairness, rest periods and cost limits.
sor: Workforce management and scheduling system ; Credentialing and competency records ; Labour-rules and collective-agreement register
up: Staff availability and shift preferences ; Verified skills, competencies and credentials ; Unit requirements and shortage list ; Travel time between locations ; Assignment history
down: Float coordinator review screen ; Schedule publish step in the scheduling system ; Fairness and cost report ; Staff notification service
opt: Agency fill options ; Commute-time services
proto: REST and SFTP extracts from scheduling, FHIR R4 PractitionerRole for credentials, and a solver service called by a batch job with an approval webhook
own: Float pool office ; Nursing education and competency ; Labour relations
con: Hard constraints cover licensure, competency, rest periods, maximum hours and collective-agreement rules ; Soft objectives cover continuity, fairness of float burden and cost ; Every plan includes the reasons options were rejected ; A human approves before any assignment is published ; The solver reports status, gap to optimum and a deterministic fallback ; Pseudonymous staff IDs in the solver
loss: \min\;\sum_u \text{shortage}_u+\lambda\,\text{float burden imbalance}+\mu\,\text{extra cost}+\nu\,\text{continuity breaks}
sn: Eligibility | Competency and licensure verified for the unit at the shift date | Matching on job title | A nurse with the right title may lack the unit competency
sn: Fairness | Float burden distributed across the pool with a transparent metric | Always floating the most flexible people | Flexible staff burn out and leave
sn: Objective | Weighted coverage gain with continuity and cost as explicit terms | Minimising cost alone | A cheap plan leaves the sickest unit short
sn: Explanation | Reason codes for every rejected candidate | A single opaque rank | Managers reject plans they cannot interrogate
sn: Fallback | Greedy feasible plan when the solver times out | No plan | The staffing office must still staff the shift
sig: Coverage gain | reduction in unmet required hours if the person is assigned | Direct measure of value of each assignment | Use the shortage list at solve time
sig: Continuity score | prior shifts the person worked on the receiving unit | Familiarity reduces risk and handover cost | Count only completed past shifts
sig: Float burden | float shifts in the trailing 8 weeks relative to the pool median | Keeps the load fair and the pool willing | Window must end before the solve
sig: Travel and rest margin | hours of rest and travel time between consecutive assignments | Prevents unsafe back-to-back moves | Use the published roster at solve time
noise: Seniority alone | does not equal unit competency and entrenches the same people floating
noise: Past acceptance of incentives | confounds willingness with need
noise: Unit manager preference ranking | informal and unfair when used as a score
base: Manual allocation by the float coordinator from a spreadsheet.
prod: Mixed-integer program solved with a constraint solver with hard licensure, competency and rest constraints, weighted soft objectives for continuity, fairness and cost, a feasibility explainer and a greedy fallback.
pipe: Shortage and availability intake @ scheduling extract ; Eligibility rules @ credential and competency validator ; Allocation optimizer @ OR-Tools CP-SAT ; Fairness and cost evaluator @ metric service ; Float coordinator review @ human ; Publish and notification @ scheduling system ; Audit and outcome log @ lakehouse
edge: No feasible plan | hard constraints leave a shortage uncovered | Return the largest feasible partial plan and the binding constraints as escalation reasons
edge: Credential expires overnight | an assigned person becomes ineligible | Eligibility re-validated at publish with a block on stale data
edge: Two units compete for one person | both plans claim the same resource | A single global solve with explicit priority weights set by leaders
edge: Last-minute call-out | the plan is out of date within hours | Rolling re-optimisation of only the open shifts with a frozen published core
off: Unmet required hours vs the best plan in hindsight ; Float burden Gini across the pool ; Solver gap and time to feasible
on: Coverage achieved at shift start ; Premium labour hours avoided ; Float-pool retention
gap: Scoring plans on forecast shortage only ; Ignoring float burden fairness ; Treating a greedy fallback as the optimum
== healthcare-overtime-premium-pay-prediction | Healthcare Overtime & Premium Pay Prediction | time-series,tabular | batch | advanced | a=1 k=2
obj: Forecast overtime, agency, premium and incentive labour hours and cost by facility, unit, role and pay period, and name the feasible lower-cost actions that respect labour agreements.
sor: Timekeeping and payroll system ; Workforce management and scheduling system ; Labour-agreement and pay-rule register ; Agency contract register
up: Rosters and worked hours from timekeeping ; Payroll pay-code definitions ; Vacancies and absence records ; Census forecasts ; Agency utilisation and contract terms
down: Labour-budget dashboard for finance and nursing leaders ; Threshold notifications to unit managers ; Staffing office intervention list ; Payroll accrual forecast
opt: Benchmark premium-rate surveys ; Incentive programme schedules
proto: SFTP or REST extracts from payroll and timekeeping, FHIR R4 Schedule where available, and a governed pay-rule table versioned by effective date
own: Finance workforce analytics ; Payroll ; Labour relations ; Nursing operations
con: Forecasts 60K cost-centre and role series nightly by pay period ; Scheduled hours and realised hours are held as separate quantities ; The forecast reconciles to payroll definitions of overtime, premium and agency ; Recommendations respect collective agreements, labour law and approved staffing levels ; Scenario analysis shows what each lever changes before a manager acts ; No individual employee is ranked or flagged
sn: Definition | Pay-code definitions from payroll applied exactly | An analyst-defined overtime flag | Finance and operations then argue about what the number means
sn: Scheduled vs realised | Realised hours from timekeeping after approvals | Scheduled hours as the target | Schedules omit call-ins and extended shifts
sn: Drivers | Vacancy, absence and census drivers that move premium hours | Pay period totals extrapolated | The forecast misses the cause and the cure
sn: Scenarios | What-if cost of filling a vacancy by incentive, float or agency | A single point estimate | The manager cannot choose a lower-cost lever
sn: Labour rules | Agreement rules checked before any recommendation | Cost minimisation without rules | A cheap suggestion can breach an agreement
sig: Vacancy hours | open budgeted hours per cost centre and role | The core structural cause of premium labour | Use the vacancy snapshot at forecast time
sig: Absence and call-in rate | trailing aggregate sick and unplanned absence by unit-shift | Late absences create the most expensive hours | Aggregate only and no individual health data
sig: Census-driven demand gap | forecast demand minus rostered hours | Premium hours fill the gap that rosters leave | Use the forecast snapshot at the time of the scheduling decision
sig: Pay-period position | days remaining and hours banked towards threshold | Weekly and bi-weekly thresholds shape when overtime appears | Use payroll calendars as published
noise: Employee tenure and age | privacy risk and a route to unfair targeting
noise: Single-period spikes from payroll corrections | retroactive pay adjustments distort the series
noise: Cost centre rename | breaks series continuity not behaviour
base: Last period's premium hours scaled by census growth.
prod: Hierarchical count and cost forecasting with exogenous vacancy, absence and census drivers, quantile outputs and a scenario engine that applies labour-rule filters before ranking interventions.
pipe: Payroll and roster intake @ SFTP extracts ; Pay-code and rule normaliser @ versioned rule table ; Premium labour forecaster @ hierarchical quantile model ; Scenario engine @ what-if simulator with rule filter ; Threshold and budget rules @ policy rules ; Finance and nursing leader review @ human ; Forecast archive and feedback @ lakehouse
edge: Retroactive pay adjustment | past periods change after the fact | Restatement table with as-of dates and training on settled periods only
edge: New collective agreement | pay rules change on a date | Rule table with effective dates and re-run of forecasts on the change date
edge: Facility merger | cost centres combine | Mapping table with lineage and a series-continuity check
edge: Agency contract change | rates and caps move | Contract register as a first-class input with effective dates
off: WAPE and pinball loss by pay period ; Interval coverage ; Cost error against settled payroll
on: Premium hours as a share of worked hours ; Accrual forecast error ; Share of recommended levers adopted
gap: Using scheduled hours as the target ; Training on unsettled pay periods ; Recommending levers that breach agreements
== workforce-productivity-fte-leakage-detection | Workforce Productivity & FTE Leakage Detection | time-series,tabular | batch | advanced | a=1 k=2
obj: Detect unexplained variance between staffed hours, workload, service volume and approved budgets, and queue it as an investigation lead with an estimated financial exposure and no allegation attached.
sor: Timekeeping and payroll system ; Cost-centre and budget ledger ; Patient volume and workload system ; Approved productivity-definition register
up: Schedules and worked hours ; Payroll and cost-centre mapping ; Patient volume and acuity measures ; Budgeted FTE and productivity benchmarks
down: Finance and operations investigation queue ; Unit leader variance review ; Executive productivity scorecard
opt: External productivity benchmarks under licence ; Case-mix indices
proto: SFTP and REST extracts from payroll, ledger and volume systems and a governed definitions table
own: Finance workforce analytics ; Operations excellence ; HR business partners
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Variance is normalised for case mix, acuity and local operating conditions before it is flagged ; Findings are investigation leads and never allegations of misconduct ; Flags are at cost-centre and unit level and never rank individual employees ; Data-quality gates run before any anomaly model ; Approved productivity definitions are versioned and every alert cites its definition ; Nightly run over 90K records of cost-centre by day
sn: Normalisation | Hours per workload unit adjusted for acuity and case mix | Raw hours per patient | A sicker unit looks wasteful when it is simply busier
sn: Data quality | Missing-punch and mapping gates before analysis | Flagging every gap as leakage | Most gaps are data defects not leakage
sn: Attribution | Variance split into volume, mix, rate and data effects | One total variance number | A leader cannot act on an unexplained total
sn: Language | Investigation lead with evidence | Accusation or ranking of individuals | A flag aimed at people destroys trust and invites gaming
sn: Seasonality | Variance against a seasonal and event-aware baseline | A fixed percentage threshold | Holidays trigger false alarms every year
sig: Hours per workload unit | worked hours divided by acuity-weighted workload | The core productivity ratio after normalisation | Use the settled workload for the period
sig: Variance decomposition | volume effect, mix effect, rate effect and unexplained residual | Shows where exposure actually lives | Decomposition must reconcile to the ledger
sig: Budget-to-actual drift | cumulative FTE variance over rolling periods | Persistent drift matters more than single-day noise | Use closed periods for scoring
sig: Data-quality index | share of missing punches, unmapped cost centres and late entries | Tells a leader whether to trust the finding | Computed from the same extract as the metric
noise: Overtime alone | reflects coverage decisions as well as leakage
noise: Individual punch patterns | privacy-sensitive and attributes intent
noise: Single-day outliers | usually data or event artefacts
base: Static threshold on hours per patient-day against budget.
prod: Normalised KPI layer with robust seasonal baselines and a multivariate anomaly model on variance components, a data-quality gate in front and a variance-decomposition explainer behind it.
pipe: Payroll and volume intake @ SFTP extracts ; Data-quality gate @ validation rules ; KPI normaliser @ case-mix adjusted metrics ; Variance anomaly model @ robust seasonal baseline with isolation forest ; Exposure and evidence builder @ decomposition ; Finance and operations review @ human ; Investigation log and feedback @ lakehouse
edge: Unit changes service mix | the baseline no longer applies | Baseline reset on a declared service change with a short burn-in flagged as low confidence
edge: Payroll system migration | mapping gaps look like leakage | Migration flag that suppresses findings until mapping is certified
edge: Budget revised mid-year | variance changes with no change in behaviour | Budget versions with effective dates
edge: Very small cost centres | noisy ratios | Pooling with stated minimum volume
off: Precision of investigation leads at a review budget ; Exposure estimate error against closed investigations ; Data-defect share of flags
on: Recovered or explained exposure ; Time to close an investigation ; Share of leads closed as data defects
gap: Calling a data gap a leakage finding ; Scoring on unnormalised hours ; Reporting individual-level flags
== schedule-actual-time-discrepancy-detection | Schedule vs Actual Time Discrepancy Detection | time-series,tabular | batch | advanced | a=1 k=2
obj: Identify missed punches, schedule deviations, unapproved overtime, duplicate time entries and reconciliation exceptions before payroll closes, with a supporting timeline and a documented correction path.
sor: Timekeeping system ; Workforce management and scheduling system ; Payroll system ; Leave and absence records
up: Scheduled shifts and swaps ; Time-clock punches and manual edits ; Badge events where policy permits ; Leave records and approvals ; Manager approvals
down: Payroll exception worklist ; Manager correction screen ; Employee self-service dispute flow ; Payroll-close dashboard
opt: Badge and door-access events under a privacy policy
proto: REST and SFTP extracts from timekeeping and payroll, event timelines in a governed store and a case workflow for adjudication
own: Payroll ; Timekeeping administration ; HR operations
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Deterministic reconciliation rules run first and anomaly models only rank the rest ; The system never infers intent or wrongdoing and describes discrepancies neutrally ; Employee or manager correction and documented adjudication precede any payroll change ; Badge data is used only where policy and labour agreements permit ; Every exception carries a timeline and the rule or model version ; Nightly run over 800K records of punches
sn: Rules | Deterministic checks for missing punch, overlap, duplicate and unapproved extension | A model that learns what is wrong | Payroll must explain every exception by a rule
sn: Language | Neutral discrepancy with evidence | Fraud or intent labels | Suggesting wrongdoing is unfair and legally risky
sn: Timeline | Event correlation across schedule, punch, badge and approval | Single-table comparison | One source alone cannot tell missed punch from absence
sn: Impact | Estimated payroll effect per exception | Counting exceptions | Ten low-value flags cost more than one large one
sn: Pay-close timing | Detection before payroll cut-off | Detection after payment | Late findings force costly recovery
sig: Punch-to-schedule delta | minutes between scheduled and actual start and end | The basic measure of a deviation | Use punch time not the entry time
sig: Edit history | number and recency of manual edits to a record | Edited records need review before pay | Use only edits logged before scoring
sig: Duplicate signature | same person with overlapping or near-identical entries | Detects double entry | Match on pseudonymous ID and time window
sig: Approval gap | worked hours beyond schedule without a recorded approval | Isolates unapproved overtime | Approval records as of the cut-off
noise: Employee tenure or role seniority | irrelevant to a rule breach and a fairness risk
noise: Historic flag count per person | self-reinforcing and punitive
noise: Time-clock location | explains process not discrepancy
base: Payroll rule report of missing and overlapping punches.
prod: Deterministic reconciliation rules plus an event-correlation layer and an anomaly ranker on the residual, producing an exception record with a timeline, confidence and estimated pay impact.
pipe: Schedule and punch intake @ SFTP and REST extracts ; Reconciliation rule engine @ versioned rules ; Event correlator @ timeline builder ; Exception ranker @ isolation forest on residuals ; Impact estimator @ pay-rule calculator ; Manager and payroll review @ human ; Adjudication log and audit @ case workflow
edge: Daylight-saving change | shifts appear to overlap or vanish | Time-zone aware storage in UTC with local rendering
edge: Offline time clock | punches arrive hours late | Event-time ordering with a late-arrival window before an exception is raised
edge: Shift swap not reflected in the schedule | a valid change looks like a deviation | Swap events included in the schedule version at scoring time
edge: Cross-facility shift | location mismatch | Multi-site assignment table with allowed combinations
off: Precision and recall of exceptions against payroll adjudication ; Payroll-effect error ; Share of exceptions explained by a rule
on: Corrections before payroll close ; Post-payment recoveries avoided ; Exception resolution time
gap: Training on already-corrected data ; Labelling dispute outcomes as ground truth ; Using badge data outside policy
== healthcare-shift-incentive-optimization | Healthcare Shift Incentive Optimization | reinforcement-learning,tabular | batch | advanced | a=0.5 k=2
obj: Recommend the minimum effective incentive or mix of incentives needed to fill hard-to-staff shifts without exceeding labour budgets or breaching pay and fairness policy.
sor: Workforce management and scheduling system ; Pay-rule and incentive policy register ; Labour budget ledger ; Open-shift marketplace
up: Open shifts with role, skill, location and notice ; Historical offers and acceptance ; Staffing urgency and unit census forecast ; Budget and approved incentive ranges
down: Manager approval screen ; Open-shift marketplace offer ; Budget tracker ; Fairness report
opt: Agency rate cards ; Randomised experiment platform under HR and legal approval
proto: REST and SFTP extracts from scheduling and payroll, an offers API on the marketplace and a policy table of approved incentive types and caps
own: Workforce management office ; HR compensation ; Finance ; Labour relations
con: Offers only from the approved incentive menu and within caps ; Recommended incentives never create unequal pay for equal circumstances beyond policy ; Randomised experimentation only with HR and legal approval and with a ceiling on exposure ; Authorised workforce managers approve policy and individual offers ; Fairness impact is reported per role and unit ; Pseudonymous staff IDs and aggregate targeting by shift not by person
loss: \max_{a}\;\Pr(\text{fill}\mid s,a)\,V_s-\text{cost}(a)\quad\text{s.t.}\quad\sum_s \text{cost}(a_s)\le B
sn: Effect | Uplift of the incentive on fill probability | Raw fill rate of shifts that received an incentive | Shifts that get incentives are the hardest ones and look worse
sn: Policy | Approved incentive menu and caps as hard constraints | A learned optimum with no limits | The best incentive may be one policy forbids
sn: Fairness | Equal treatment of comparable shifts across groups and units | Targeting the people most likely to accept | Different pay for similar work is a fairness and legal risk
sn: Experiments | Randomised exploration within a capped budget | Learning only from logged offers | Logged offers are selected by managers and bias the estimate
sn: Alternatives | Compare incentive with float, cross-training and agency | Incentive in isolation | The cheapest fill may not be an incentive at all
sig: Urgency | hours to shift start and unmet required hours | Fill difficulty rises as notice shortens | Use time of the offer
sig: Historical response by shift type | acceptance by role, shift and notice band | Describes how responsive the pool is | Strictly past offers
sig: Marginal fill probability | estimated change in fill probability per incentive step | The quantity the decision needs | Estimate only from randomised or propensity-weighted data
sig: Pool depth | eligible staff not yet scheduled or at hours cap | Fill is limited by who is available | Eligibility as of offer time
noise: Employee personal characteristics | unfair targeting and no causal signal
noise: Raw acceptance rate | confounded by which shifts get which offers
noise: Manager identity | proxies for habit rather than effect
base: A fixed incentive ladder that rises as the shift approaches.
prod: Contextual bandit or uplift model for fill probability by incentive level inside a budget-constrained optimiser with hard policy limits, propensity logging and a counterfactual evaluator.
pipe: Open-shift and offer intake @ scheduling extract ; Incentive policy rules @ approved menu and caps ; Fill uplift model @ contextual bandit ; Budget-constrained allocator @ constrained optimiser ; Fairness check @ group parity metrics ; Workforce manager approval @ human ; Offer log with propensities @ lakehouse
edge: Budget exhausted mid-period | later shifts get no incentive | Pacing rule that spreads budget across the period with a reserve for critical shifts
edge: Incentive anchoring | staff wait for bigger offers | Cap on frequency of escalation and a view of offer-to-acceptance timing
edge: Policy change | menu or cap changes | Versioned policy and re-validation of the bandit on the new action space
edge: Sparse data for rare roles | high-variance estimates | Shrinkage to role family and conservative default
off: Off-policy value of the recommended incentives ; Fill-rate uplift with confidence interval ; Cost per additional fill
on: Fill rate of hard-to-staff shifts ; Incentive spend per filled shift ; Fairness gap across comparable groups
gap: Treating raw acceptance as incentive effect ; Ignoring offers that managers chose selectively ; Optimising cost with no fairness check
== healthcare-workforce-burnout-attrition-early-warning | Healthcare Workforce Burnout & Attrition Early Warning | tabular,time-series | batch | staff-principal | a=0.2 k=2
obj: Identify aggregate working conditions associated with elevated burnout, absence or voluntary attrition risk at team and unit level so leaders can improve those conditions, never to score or manage individuals.
sor: HR information system ; Workforce management and scheduling system ; Employee survey platform ; Timekeeping system
up: Aggregated workload and overtime ; Shift patterns and schedule changes ; Vacancy rates ; Absence trends in aggregate ; Voluntary survey signals where lawful and consented
down: Unit and department leader dashboard ; Employee wellbeing programme planning ; Workforce planning committee report
opt: Exit-interview themes ; Aggregate engagement survey results
proto: Governed extracts from HR and scheduling into an aggregated store with small-cell suppression and role-based access to team-level views only
own: HR analytics ; Employee wellbeing ; Privacy office ; Nursing operations
con: Analysis is at team or unit level with a minimum group size and small-cell suppression ; No individual risk score is computed or stored ; No inference of mental or physical health and no use of protected or sensitive traits ; Outputs support working-condition changes and never employment decisions or performance management ; Privacy and works-council review before any rollout ; Fairness assessment across roles and sites
sn: Unit of analysis | Team and unit aggregates above a minimum size | Individual-level risk scores | Individual scoring becomes a punitive tool and breaches trust
sn: Signal | Operational conditions such as overtime, schedule churn and vacancy load | Inferred emotional or health state | Health inference is invasive and outside lawful basis
sn: Outcome | Voluntary attrition and aggregate absence as events with censoring | Anyone who left | Retirements and involuntary exits are different events
sn: Action | Supportive interventions such as workload relief | Targeting named people | Targeting causes the harm the model claims to prevent
sn: Causality | Associations flagged as hypotheses for leaders to test | Claiming conditions cause departures | A correlation presented as a cause leads to wrong investment
sig: Schedule churn | share of shifts changed within 72 hours at unit level | Unpredictable schedules are strongly associated with turnover | Use schedule snapshots prior to the outcome window
sig: Overtime load | unit mean and tail of overtime hours per head | Sustained overtime tracks with fatigue and exits | Aggregate and lag it
sig: Vacancy burden | open positions relative to budgeted FTE | The remaining team absorbs the gap | Use the vacancy snapshot
sig: Consecutive-shift pressure | share of staff on long runs of consecutive shifts in the unit | Rest is a recognised protective factor | Aggregate only
noise: Age, gender and ethnicity | protected traits with no place in the model
noise: Individual sentiment from messages | surveillance and a consent problem
noise: Health or leave reasons | sensitive data outside scope
base: Quarterly unit turnover rate with a rolling average.
prod: Team-level discrete-time survival and classification models on aggregated operational features with strict minimisation, differential-privacy style suppression, fairness assessment and driver explanations.
pipe: Aggregated HR and schedule intake @ governed extracts ; Minimum-size and suppression rules @ privacy policy rules ; Team-level risk model @ discrete-time survival model ; Driver explainer @ SHAP on aggregates ; Fairness and privacy review @ human ; Leader dashboard @ aggregated reports ; Intervention feedback and audit @ lakehouse
edge: A team shrinks below the minimum size | an aggregate could identify a person | Automatic suppression and merge with a sibling team
edge: Reorganisation | team definitions change | Versioned team hierarchy and a break in the series
edge: Survey non-response | the signal is missing not random | Treat response as a covariate not an imputed value and never infer individual answers
edge: Misuse request | a manager asks for a named list | Access control refuses the view and logs the request
off: Concordance index and time-dependent AUC at 6 and 12 months ; Calibration by unit size ; Subgroup fairness gap on prediction error
on: Voluntary attrition rate in supported units ; Overtime and schedule-churn reduction after intervention ; Pulse-survey trend
gap: Evaluating on a random split of employees rather than by period ; Treating association as cause ; Letting a dashboard reveal a small group
== healthcare-workforce-skill-mix-optimization | Healthcare Workforce Skill-Mix Optimization | reinforcement-learning,tabular | batch | advanced | a=0.3 k=3
obj: Build shift rosters with the right competency, specialty, experience and supervision mix for forecast workload, with an auditable proof of each hard constraint.
sor: Workforce management and scheduling system ; Credentialing and competency records ; Staffing policy and supervision rules
up: Verified skills, licences and competencies ; Unit requirements by acuity band ; Patient acuity forecasts ; Preceptor and supervision rules ; Availability and labour constraints
down: Unit leader roster review ; Scheduling publish step ; Coverage proof report ; Credentialing exception queue
opt: Cross-training plans ; Learning-management completion data
proto: REST and SFTP extracts from scheduling and credentialing, FHIR R4 PractitionerRole for qualifications and a solver service with a constraint proof output
own: Nursing operations ; Clinical education ; Credentialing office
con: Hard constraints cover licensure, competency, supervision ratios, rest and policy mix rules ; Soft objectives cover experience balance, development and preference ; The output includes a proof of coverage and every violated soft constraint ; Credentialing and unit leaders validate eligibility and the final roster ; Infeasibility returns the binding constraints not a silent relaxation ; Pseudonymous IDs
loss: \min\;\sum_s \text{skill gap}_s+\lambda\,\text{experience imbalance}+\mu\,\text{preference loss}+\nu\,\text{supervision breach}
sn: Skills | Verified competency records with effective dates | Job title as a proxy for skill | Titles hide missing competencies
sn: Proof | Constraint proof per shift | An overall score | A leader needs to see why a roster is safe
sn: Supervision | Preceptor and supervision rules as hard constraints | Soft penalties | A new graduate cannot be treated as acceptable without supervision
sn: Trade-offs | Explicit view of the cost of each relaxed preference | Hidden weighting | Staff reject rosters built on opaque trade-offs
sn: Forecast link | Skill mix targets derived from the acuity forecast | Fixed ratios per unit | Mix needs change with acuity
sig: Skill coverage per shift | required competency count present vs required | Core safety measure | Competencies valid on the shift date
sig: Experience balance | share of staff within each experience band per shift | Balances risk and learning | Banding from HR records as of the date
sig: Supervision capacity | preceptor slots available per shift | Limits how many novices can be rostered | Use rules as published
sig: Acuity-driven mix target | target competencies as a function of forecast acuity | Links mix to workload | Use the forecast snapshot at solve time
noise: Years of service alone | does not equal competence in the unit
noise: Informal reputation | unfair and unverifiable
noise: Preference ranking by managers | not a safe objective
base: Spreadsheet roster with a manual skill-mix check by the unit leader.
prod: Constraint programming and mixed-integer optimisation with hard competency, supervision and rest constraints, weighted soft objectives and a constraint-proof generator that also reports infeasibility reasons.
pipe: Competency and requirement intake @ credential and scheduling extracts ; Eligibility validator @ rules ; Skill-mix optimizer @ OR-Tools CP-SAT ; Coverage proof and violation report @ solver output ; Unit leader and credentialing review @ human ; Publish @ scheduling system ; Audit and outcome log @ lakehouse
edge: Competency record missing | a qualified person looks ineligible | Exception queue to credentialing rather than silent exclusion
edge: Preceptor unavailable | novice cannot be rostered | Solver returns the constraint and suggests a feasible alternative
edge: Acuity forecast wrong | mix is mis-sized | Re-optimise at a short horizon with a frozen published core
edge: Conflicting policies across units | no feasible solution | Policy conflict report to the owners
off: Skill-gap hours vs the best plan in hindsight ; Constraint violations per roster ; Solver gap and time to feasible
on: Shifts meeting required mix at start ; Roster publication lead time ; Manager override rate
gap: Scoring against forecast acuity only ; Relaxing hard constraints silently ; Treating title as competency
== healthcare-workforce-absence-sick-leave-forecasting | Healthcare Workforce Absence & Sick Leave Forecasting | time-series | batch | foundational | a=1 k=1
obj: Forecast aggregate absence levels by role, unit, location and shift so leaders can size contingency staffing, using aggregate data only and never inferring any individual's health.
sor: HR information system ; Timekeeping and leave records ; Workforce management and scheduling system
up: Historical absence events in aggregate ; Calendar and seasonality features ; Workforce size and shift patterns ; Aggregate operational context such as census
down: Contingency staffing plan ; Float-pool sizing ; Daily huddle forecast ; Agency demand signal
opt: Regional respiratory-illness surveillance aggregates
proto: Governed aggregate extracts with small-cell suppression and an aggregate-only serving table
own: Workforce planning ; HR analytics ; Privacy office
con: Forecasts 30K unit-shift-role series nightly of absence counts and rates ; Aggregate counts with small-cell suppression and no individual-level output ; No health inference about any person and no reason codes in the model ; Forecasts support planning only and are never used in individual decisions ; Prediction intervals accompany every forecast ; Contingency staffing requirement derived by a separate rule
sn: Aggregation | Counts per unit-shift-role with minimum size | Individual absence histories | Individual histories are sensitive and unnecessary
sn: Seasonality | Weekly, annual and holiday patterns learned explicitly | A flat average | Absence rises on Mondays and in winter
sn: Reasons | No reason codes used | Absence reason as a feature | Reasons are health data and add no planning value
sn: Intervals | Calibrated intervals feeding contingency sizing | Point forecast only | Contingency needs the tail not the mean
sn: Externalities | Aggregate community illness signals where lawful | Individual diagnoses | Population signals are sufficient and privacy-safe
sig: Weekday and season profile | day-of-week and week-of-year effects per unit | Absence is highly regular | Fit on past periods only
sig: Recent absence trend | trailing 7 and 28 day aggregate absence rate | Absence clusters in time | Aggregate and lag
sig: Shift-pattern load | share of night and long shifts in the unit | Patterns relate to absence | Use the roster snapshot
sig: Holiday proximity | days to and from public holidays | Holiday bridging changes absence | Public calendar only
noise: Individual health or leave reasons | sensitive data
noise: Past absence counts per person | privacy risk and stigma
noise: Manager identity | not a stable driver
base: Same weekday trailing average of the unit absence rate.
prod: Count-aware hierarchical forecast of absence with quantile outputs and a seasonal baseline, evaluated by horizon, with a separate rule that converts the forecast into contingency hours.
pipe: Aggregate absence intake @ governed extracts ; Suppression and aggregation rules @ privacy policy ; Absence forecaster @ hierarchical count model ; Contingency sizing @ rule table ; Workforce planner review @ human ; Forecast archive @ lakehouse
edge: Small unit with sparse counts | unstable estimates | Pool with peer units above the minimum size
edge: Outbreak week | absence jumps beyond history | Regime flag and widened intervals
edge: Leave policy change | definitions shift | Versioned absence definitions
edge: Roster reorganisation | series breaks | Hierarchy versioning and a transition period
off: WAPE and pinball loss by horizon ; Interval coverage ; Contingency hours shortfall at the 90th percentile
on: Contingency cover available when needed ; Premium hours on high-absence days ; Short-notice gap rate
gap: Training with individual reasons ; Ignoring suppression in the test set ; Judging only on mean error
