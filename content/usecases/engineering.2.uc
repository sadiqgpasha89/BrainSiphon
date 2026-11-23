# Engineering, Design & Projects, part 2 (use cases 28-50): asset and structural integrity, estimating and contracts, project and portfolio management, engineering AI governance
# Vendor-neutral. Licensed engineers verify and sign every output, agents never issue or seal drawings, designs and bids stay inside the company boundary and site analytics never identify or score individual workers.
== structural-health-monitoring | Structural Health Monitoring | time-series,tabular | seconds | advanced | a=10 k=4
obj: Detect abnormal structural behaviour from strain, vibration, tilt and temperature sensors on bridges and buildings and alert engineers with context, separating environmental effects from real change.
loss: \mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2
con: Alerts reviewed by a structural engineer ; Temperature and load effects removed before alerting ; Detection within 10 minutes ; Sensor health checked daily ; 5K sensors per structure group
sn: Baseline | Normal behaviour by temperature and load | A fixed limit | Daily and seasonal effects dominate readings
sn: Label | Inspections and confirmed damage | Alarm counts | Alarms may be sensor faults
sn: Role | Early warning for engineers | Safety declaration | Structural safety needs engineering judgement
sig: Strain and displacement | measured response | Core | From sensors
sig: Modal frequencies | natural frequency shifts | Core | From vibration data
sig: Temperature and load | environmental drivers | Compensation | From weather and traffic data
sig: Sensor health | drift and dropouts | Quality | From diagnostics
noise: Sensor id | an identifier
noise: Installer name | personal data
noise: Cable colour | irrelevant
base: Periodic inspections and threshold alarms on a few sensors, because they are the standard practice.
prod: A monitoring pipeline that compensates environmental effects, tracks modal and strain trends and raises ranked alerts with sensor health checks for engineer review.
pipe: Sensor stream @ site gateways ; Quality and drift checks @ rules ; Environmental compensation @ regression ; Anomaly detection @ model ; Engineer alert @ operations console ; Inspection trigger @ asset management ; Baseline review @ quarterly
edge: Sensor failure | a gauge drifts or fails | Redundant sensors and health alerts
edge: Extreme event | an earthquake or flood changes behaviour | Event mode with expert review
edge: Slow damage | change is gradual | Long-term trend tests
off: Detection of seeded damage in models ; False alert rate ; Compensation accuracy
on: Damage found early ; Inspection cost ; False alarm callouts
gap: Fixed limits ; Alarm counts as truth ; Safety declared by the model

== infrastructure-defect-detection | Infrastructure Defect Detection | computer-vision | batch | advanced | a=0.3 k=5
obj: Detect cracks, spalling, corrosion and leaks in images of bridges, tunnels and pipes and rank defects by severity for inspection engineers to confirm and schedule.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Inspector confirms every defect before work orders ; Defect recall above 95% at the review rate ; Findings show location and measurements ; Processing of 2M images per year ; Calibrated severity
sn: Label | Inspector ratings using the agency scale | Model labels from earlier runs | Errors would be copied
sn: Cost | Missed severe defects cost most | Equal weights | The costs differ
sn: Output | Located, measured defects | Image flags | Engineers need measurements
sig: Defect class and extent | crack width and area | Core | From a vision model
sig: Location on the structure | element and position | Context | From registration
sig: Previous inspection findings | past condition | Progression | From records
sig: Image quality | focus and lighting | Confidence | From the image
noise: Inspector name | personal data
noise: Camera brand | weak link
noise: File name | an artefact
base: Manual visual inspection with notes and photographs, because it is the standard practice.
prod: A detection and measurement pipeline that maps defects to structure elements, compares with past inspections and queues severe findings for inspector review.
pipe: Image capture @ crawlers, drones and cameras ; Quality check @ rules ; Defect detection and measurement @ vision model ; Element mapping @ registration ; Progression analysis @ comparison ; Inspector review @ inspection app ; Work order @ asset management
edge: Dirt and stains | marks look like cracks | Hard negative training
edge: Hidden defects | defects are behind coatings | Non-visual inspection plan
edge: Different structure type | the model is new to the type | Type-specific validation
off: Defect recall by severity ; Measurement error ; Calibration
on: Defects found before failure ; Inspection time ; Missed severe defects
gap: Model labels as truth ; Equal error costs ; Automatic work orders

== corrosion-remaining-life-prediction | Corrosion and Remaining Life Prediction | time-series,tabular | batch | advanced | a=1 k=3
obj: Estimate wall thickness loss rates and remaining life of pipes, tanks and steel structures from inspection data, so inspection intervals and repairs are planned within safety margins.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Remaining life shown as a range ; Inspection intervals never exceed code limits ; Engineers approve interval changes ; Conservative defaults for sparse data ; 200K inspection points
sn: Method | Corrosion rate from repeated measurements | One reading | One reading gives no rate
sn: Safety | Code minimum thickness and margins | Model alone | Codes set safety limits
sn: Data | Calibrated measurements | Mixed instruments | Instrument differences create false rates
sig: Thickness readings over time | wall thickness history | Core | From inspections
sig: Process conditions | temperature, chemistry and flow | Driver | From plant data
sig: Material and coating | corrosion resistance | Context | From asset data
sig: Inspection method uncertainty | measurement error | Uncertainty | From the method
noise: Inspector name | personal data
noise: Tag format | an artefact
noise: Report layout | an artefact
base: Fixed inspection intervals by asset class, because they are the usual practice.
prod: A risk-based inspection model that estimates corrosion rate and remaining life with uncertainty and proposes inspection intervals within codes for engineer approval.
pipe: Inspection data @ asset integrity system ; Calibration and cleaning @ rules ; Corrosion rate model @ statistics ; Remaining life range @ model ; Interval proposal @ rules ; Engineer approval @ integrity review ; Outcome tracking @ yearly
edge: Localised pitting | average thickness hides deep pits | Pit-depth models
edge: Process upset | conditions change suddenly | Condition triggers
edge: Sparse readings | there are too few points | Conservative defaults
off: Rate prediction error ; Calibration of life ranges ; Interval safety checks
on: Leaks and failures ; Inspection cost ; Assets near minimum thickness
gap: One reading rates ; Model-only safety limits ; Mixed-instrument data

== digital-twin-calibration | Digital Twin Calibration | time-series,tabular | batch | advanced | a=1 k=4
obj: Calibrate simulation models of assets and buildings with sensor data, track model error over time and show when the twin can no longer be trusted for decisions.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Model error reported against measurements ; Decisions flagged when error exceeds a limit ; Engineers approve recalibration ; Sensor quality checked ; Daily update for 500 assets
sn: Goal | Predict measured behaviour | Look realistic | Visuals do not mean validity
sn: Control | Validity limits and flags | Unchecked use | Wrong twins mislead decisions
sn: Update | Engineer-approved recalibration | Automatic parameter drift | Parameters can absorb faults
sig: Model versus measurement error | residuals | Core | From sensors and model
sig: Parameter estimates | calibrated values | Core | From calibration
sig: Sensor quality | drift and gaps | Quality | From diagnostics
sig: Operating regime | conditions covered by calibration | Validity | From data
noise: Vendor | weak link
noise: Model file name | an artefact
noise: Operator name | personal data
base: Models calibrated once at commissioning, because it is the common practice.
prod: A calibration service that fits parameters on recent data, reports error and validity range and flags decisions that rely on out-of-range twin outputs.
pipe: Sensor and model data @ twin platform ; Quality filter @ rules ; Parameter calibration @ optimiser ; Error report @ analytics ; Validity flag @ twin service ; Engineer recalibration approval @ review ; Change log @ document system
edge: Drift absorbs a fault | calibration hides damage | Residual analysis by component
edge: New operating regime | conditions leave the calibrated range | Validity flags
edge: Sensor outage | data is missing | Gap handling
off: Prediction error against held-out data ; Validity flag accuracy ; Calibration stability
on: Decisions on out-of-range models ; Model error ; Calibration effort
gap: Realism as validity ; Unchecked twin use ; Automatic parameter drift

== geotechnical-ground-risk-modelling | Geotechnical Ground Risk Modelling | tabular,graph | batch | advanced | a=1 k=4
obj: Combine borehole logs, geophysics and past projects to map ground conditions and uncertainty and flag areas where unexpected conditions could hit cost and schedule.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Maps show uncertainty ; Geotechnical engineers review all outputs ; Gaps in data highlighted ; Additional investigation recommended where uncertainty is high ; 10K boreholes
sn: Output | Interpolated maps with uncertainty | A single ground model | Uncertainty drives risk
sn: Data | Quality-rated investigation data | All logs equally | Logs differ in quality
sn: Role | Support investigation planning | Replace site investigation | Ground is only known where measured
sig: Borehole logs | soil and rock descriptions | Core | From investigations
sig: Geophysical profiles | resistivity and seismic data | Core | From surveys
sig: Distance to nearest data | data density | Uncertainty | From geometry
sig: Past project experience | issues in similar ground | Prior | From lessons learned
noise: Driller name | personal data
noise: Log format | an artefact
noise: Contractor brand | weak link
base: Engineers interpolating by hand between boreholes, because it is the usual practice.
prod: A geostatistical and learned model that produces ground maps with uncertainty and highlights where extra investigation would reduce risk most.
pipe: Data collection @ geotechnical database ; Quality rating @ rules ; Spatial model @ geostatistics and ML ; Uncertainty map @ analytics ; Engineer review @ geotechnical team ; Investigation plan @ project tool ; Update with new data @ weekly
edge: Sparse data | few boreholes exist | Wide uncertainty
edge: Sharp geological boundary | ground changes abruptly | Geological expert rules
edge: Contaminated ground | additional hazards exist | Specialist review
off: Prediction error at held-out boreholes ; Uncertainty calibration ; Engineer acceptance
on: Unexpected ground conditions ; Investigation cost ; Cost growth from ground issues
gap: Single ground models ; Equal weight for all logs ; Replacing site investigation

== fatigue-life-estimation | Fatigue Life Estimation | time-series,tabular | batch | advanced | a=1 k=3
obj: Estimate fatigue damage accumulation in structures and components from measured load histories, to plan inspections and repairs with safety margins.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Damage estimates include uncertainty ; Safety factors from codes applied ; Engineers approve inspection plans ; Load data checked ; 100K load cycles per day per asset
sn: Method | Cycle counting and material curves | Average load | Fatigue depends on cycles and range
sn: Safety | Code safety factors | Model-only life | Codes protect against model error
sn: Data | Calibrated sensors | Unchecked sensors | Bad data gives wrong damage
sig: Load cycle histogram | counted cycles and ranges | Core | From sensor data
sig: Material fatigue curve | S-N curve | Core | From standards
sig: Hot spot stress | stress at critical details | Core | From models
sig: Environment | corrosion and temperature | Modifier | From site data
noise: Sensor id | an identifier
noise: Operator name | personal data
noise: Report layout | an artefact
base: Design life assumptions and fixed inspection intervals, because they are the standard approach.
prod: A damage tracking service that counts load cycles, applies material curves and safety factors and outputs remaining life ranges and inspection suggestions for engineers.
pipe: Load data @ sensors ; Cycle counting @ rainflow analysis ; Stress mapping @ finite element models ; Damage accumulation @ fatigue model ; Remaining life range @ analytics ; Engineer review @ integrity team ; Inspection plan @ asset management
edge: Overload event | one extreme load occurs | Event damage checks
edge: Missing data | a sensor stops reporting for several days | Conservative assumptions
edge: Repair changes stress | a repair alters the detail | Model update
off: Damage estimate error in test cases ; Calibration ; Sensitivity accuracy
on: Fatigue cracks found late ; Inspection cost ; Assets beyond design life
gap: Average load ; Model-only life ; Unchecked sensors

== early-stage-cost-estimation | Early-Stage Cost Estimation | tabular,nlp | seconds | foundational | a=1 k=3
obj: Estimate project cost ranges from early scope and design parameters using past projects, so owners and planners understand likely cost before detailed design.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Estimates shown as ranges with drivers ; Estimators review before sharing ; Past project data normalised for inflation and location ; Estimate within 1 minute ; 20K past projects
sn: Label | Final project cost | Early budget | Budgets are not outcomes
sn: Output | Range with confidence | A single number | Early estimates carry large uncertainty
sn: Control | Estimator review | Automatic budget setting | Budgets are commercial decisions
sig: Scope drivers | size, type and complexity | Core | From the brief
sig: Location and market index | cost level by region | Adjustment | From indices
sig: Similar past projects | cost per unit of similar work | Core | From the database
sig: Design maturity | stage of design | Uncertainty | From project data
noise: Estimator name | personal data
noise: Client brand | weak link
noise: Project nickname | irrelevant
base: Cost per square metre rules applied by estimators, because they are the common approach.
prod: A model trained on normalised past projects that produces cost ranges and drivers, with estimator review and tracking against outturn cost.
pipe: Brief intake @ estimating tool ; Feature extraction @ NLP and forms ; Cost model @ gradient boosting ; Range calibration @ quantile regression ; Estimator review @ estimating tool ; Estimate record @ bid system ; Outturn comparison @ project close
edge: Novel project type | no similar projects exist | Wide ranges and analogue search
edge: Inflation shock | material prices jump after the estimate is issued | Index adjustment
edge: Scope creep | scope grows after the estimate | Scope change tracking
off: Calibration of ranges ; Estimate error by stage ; Driver accuracy
on: Estimate to outturn variance ; Time to estimate ; Early budget revisions
gap: Early budget as label ; Single-number estimates ; Automatic budget setting

== bid-no-bid-decision-support | Bid and No-Bid Decision Support | tabular,nlp | batch | advanced | a=0.5 k=5
obj: Score tender opportunities on win probability, margin, risk and fit with capacity and strategy so bid committees choose which tenders to pursue, with the evidence shown.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}
con: Committee decides ; Scores show drivers ; Client and bid data kept in segregated workspaces ; Calibrated win probabilities ; 3K tenders per year
sn: Label | Past tender outcomes and realised margin | Bid count | Many bids are sunk cost
sn: Value | Expected margin after risk | Win rate alone | Winning bad work destroys value
sn: Control | Committee judgement | Model decision | Strategy and relationships matter
sig: Client and competition | repeat client and competitor set | Core | From records
sig: Contract risk profile | payment and liability terms | Risk | From tender documents
sig: Capacity and fit | available teams and experience | Fit | From resource plans
sig: Estimated margin range | margin from the estimate | Value | From estimating
noise: Bid manager name | personal data
noise: Tender number | an identifier
noise: Document format | an artefact
base: Committee discussion using experience and a checklist, because it is the common practice.
prod: A scoring model that combines win probability, risk and capacity with transparent drivers and a summary pack for the committee.
pipe: Tender intake @ bid portal ; Document extraction @ NLP ; Feature build @ batch ; Win and margin model @ gradient boosting ; Risk and capacity check @ rules ; Committee pack @ report ; Outcome tracking @ quarterly
edge: New market | there is no history | Qualitative review
edge: Strategic bid | the bid has non-financial value | Strategic flag
edge: Late addendum | terms change after scoring | Rescore on change
off: Calibration of win probability ; Margin forecast error ; Committee agreement
on: Win rate on pursued bids ; Margin on won work ; Bid cost
gap: Win rate as value ; Model-made bid decisions ; Bid count as success

== contract-clause-risk-review | Contract Clause Risk Review | nlp | seconds | advanced | a=0.3 k=20
obj: Read tender and contract documents, extract clauses on liability, payment, delay and change, compare them with company positions and flag risks with citations for legal counsel to decide.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every flag cites clause and page ; Legal counsel decides every position ; Contract data kept in segregated workspaces ; Review within 30 minutes for a 500-page contract ; No legal advice to third parties
sn: Source | The contract text and playbook | Model memory of law | Law and terms vary by jurisdiction
sn: Role | Highlight and compare | Advise on legal outcomes | Legal advice needs lawyers
sn: Safety | Unclear terms flagged | Assume acceptable | Silent passes carry legal risk
sig: Clause type and text | liability, payment or delay clause | Core | From extraction
sig: Playbook position | accepted and fallback positions | Core | From the legal playbook
sig: Deviation severity | distance from the position | Priority | From comparison
sig: Jurisdiction | governing law | Context | From the contract
noise: Counsel name | personal data
noise: Document layout | an artefact
noise: Client logo | irrelevant
base: Lawyers and commercial managers reading the full contract, because it is the standard approach.
prod: A clause extraction and comparison tool that finds high-risk deviations against the playbook with citations and drafts suggested fallback wording for counsel.
pipe: Contract intake @ document system ; Clause extraction @ NLP ; Playbook comparison @ rules and LLM ; Risk ranking @ model ; Citation report @ review tool ; Legal review @ counsel ; Position record @ contract system
edge: Non-standard drafting | clauses use unusual wording | Low-confidence flags
edge: Cross-references | meaning depends on other clauses | Reference resolution
edge: Amendments | later documents change terms | Version ordering
off: Clause extraction accuracy ; Deviation recall ; Citation faithfulness
on: Contract review time ; Missed risky clauses ; Negotiation cycles
gap: Model memory of law ; Silent passes ; Legal advice by the model

== change-order-impact-assessment | Change Order Impact Assessment | nlp,tabular | seconds | foundational | a=0.5 k=5
obj: Estimate the cost and time impact of proposed changes and link them to the contract basis so commercial managers evaluate and negotiate with evidence.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Estimates shown as ranges with assumptions ; Commercial managers decide ; Contract entitlement checked by counsel ; Impact within 10 minutes ; 50K change events
sn: Basis | Contract terms and records | Verbal agreements | Verbal changes cause disputes
sn: Output | Cost and time ranges | A single figure | Early figures are uncertain
sn: Control | Commercial approval | Automatic approval | Changes affect contracts
sig: Change scope | what changes in the design | Core | From the change request
sig: Affected activities | linked schedule activities | Time | From the schedule
sig: Unit rates | cost of similar work | Cost | From the cost database
sig: Contract entitlement | clause basis for the change | Basis | From the contract
noise: Requester name | personal data
noise: Change number | an identifier
noise: Document layout | an artefact
base: Estimators pricing each change by hand, because it is the usual practice.
prod: An assessment tool that finds affected activities and quantities, prices with rates, estimates time effect and presents a cited entitlement summary for commercial managers.
pipe: Change request @ project platform ; Scope extraction @ NLP ; Activity and quantity link @ schedule and model ; Cost and time estimate @ models ; Entitlement summary @ LLM with citations ; Commercial review @ managers ; Decision record @ contract system
edge: Disputed scope | parties disagree on scope | Evidence pack and neutral log
edge: Concurrent delay | several causes overlap | Delay analysis methods
edge: Unit rate gaps | no unit rate exists for the changed work item | Estimator pricing
off: Cost estimate error ; Activity link accuracy ; Entitlement citation accuracy
on: Time to price changes ; Disputes ; Unapproved work
gap: Verbal agreements as basis ; Single figures ; Automatic approval

== delay-claims-analysis | Delay Claims Analysis | time-series,nlp | batch | staff-principal | a=0.5 k=20
obj: Reconstruct schedule history and records to show causes of delay and the share each event contributed, giving claims teams evidence packs for experts and counsel to review.
con: Every finding cites schedule updates and records ; Methods named and repeatable ; Delay experts and counsel decide positions ; Records handled under legal hold ; Analysis of 200 updates per project
sn: Method | Recognised delay analysis methods | A custom score | Courts and tribunals need accepted methods
sn: Evidence | Contemporaneous records | Recollection | Records carry weight
sn: Role | Prepare the evidence | Decide liability | Liability is a legal matter
sig: Schedule update history | planned versus actual by update | Core | From schedule archives
sig: Delay events | notices, changes and weather days | Core | From records
sig: Critical path changes | path shifts | Cause | From schedule analysis
sig: Records and correspondence | letters, RFIs and daily logs | Evidence | From document systems
noise: Author name | personal data
noise: Letter format | an artefact
noise: File date | an artefact
base: Delay experts reconstructing the programme from archives by hand, because it is the standard approach.
prod: An analysis pipeline that rebuilds schedule history, applies named methods, links delay events to records and prepares an evidence pack for experts.
pipe: Schedule archive intake @ scheduling tool ; Version alignment @ rules ; Delay method run @ schedule analysis ; Event and record linking @ NLP ; Evidence pack @ report ; Expert review @ delay expert ; Counsel review @ legal team
edge: Missing updates | schedule updates are not archived | State gaps and limits
edge: Retroactive changes | updates were edited later | Version integrity checks
edge: Concurrent delays | both parties caused delay | Apportionment methods
off: Method reproducibility ; Event linking accuracy ; Expert acceptance
on: Time to prepare claims ; Evidence completeness ; Claim outcomes
gap: Custom scores ; Recollection as evidence ; Liability decided by the model

== supplier-quote-comparison | Supplier Quote Comparison | nlp,tabular | seconds | foundational | a=0.3 k=10
obj: Normalise supplier quotes on scope, exclusions, units and terms and show a like-for-like comparison with gaps highlighted for buyers to negotiate and decide.
con: Each normalised line cites the quote page ; Buyers decide awards ; Exclusions and assumptions listed ; Comparison within 5 minutes for 50 quotes ; Supplier data kept confidential
sn: Basis | Normalised scope and units | Total price | Totals hide scope differences
sn: Risk | Exclusions and conditions listed | Price only | Cheap bids can exclude key items
sn: Control | Buyer decision | Automatic award | Awards have legal and commercial effect
sig: Line items and units | quoted scope and quantities | Core | From extraction
sig: Exclusions and assumptions | what is not included | Risk | From text
sig: Commercial terms | payment, warranty and validity | Comparison | From text
sig: Supplier history | performance on past work | Context | From procurement
noise: Sales contact name | personal data
noise: Quote layout | an artefact
noise: Supplier logo | irrelevant
base: Buyers building comparison spreadsheets from quotes, because it is the usual practice.
prod: A normalisation tool that extracts lines, units and exclusions into a common sheet, finds gaps against the enquiry and highlights differences for buyers.
pipe: Quote intake @ procurement portal ; Line and term extraction @ NLP and tables ; Unit normalisation @ rules ; Scope gap check @ comparison to the enquiry ; Comparison view @ buyer tool ; Buyer decision @ procurement ; Award record @ ERP
edge: Alternative offers | a supplier offers a different solution | Flag as an alternative
edge: Unit confusion | units are mixed | Normalisation checks
edge: Missing pages | quote files are incomplete | Completeness check
off: Extraction accuracy ; Gap detection recall ; Buyer correction rate
on: Time to compare quotes ; Scope gaps found after award ; Procurement cost
gap: Totals as comparison ; Price-only ranking ; Automatic award

== project-health-reporting | Project Health Reporting | nlp,time-series | batch | foundational | a=0.2 k=20
obj: Draft weekly project status reports from schedule, cost, risk and issue data with cited figures and a plain narrative for the project manager to edit and send.
con: Every figure links to its source system ; Project manager approves before sending ; Unconfirmed items marked ; Draft within 10 minutes ; 2,000 projects
sn: Source | Systems of record | Chat summaries | Chat can be wrong or stale
sn: Audience | Separate client and internal versions | One report | Clients should not see internal risks
sn: Control | Manager approval | Auto-send | Reports carry commercial meaning
sig: Schedule and cost status | variance and forecasts | Core | From project controls
sig: Open risks and issues | top items | Content | From the risk register
sig: Milestones | upcoming and missed | Content | From the schedule
sig: Previous report | last week statements | Consistency | From the archive
noise: Author name | personal data
noise: Report template | an artefact
noise: Time of day | irrelevant
base: Project managers compiling reports from several tools by hand, because it is the common practice.
prod: A reporting assistant that pulls approved data, drafts audience-specific narratives with source links, flags changes since last week and routes drafts to the manager.
pipe: Data pull @ project systems ; Variance and change calculation @ analytics ; Draft narrative @ LLM with citations ; Audience filter @ rules ; Manager review @ editor ; Distribution @ project platform ; Feedback @ monthly
edge: Data conflicts | two systems disagree | List the conflict and ask the manager
edge: Sensitive issue | a dispute should not appear | Audience rules and manual path
edge: Late data | updates are missing | Mark stale values
off: Figure accuracy ; Citation faithfulness ; Manager edit rate
on: Time to produce reports ; Reporting errors ; Manager time
gap: Chat as source ; One report for all ; Auto-sending

== project-risk-register-assistant | Project Risk Register Assistant | nlp,tabular | seconds | foundational | a=0.2 k=10
obj: Suggest risks from project documents, past projects and lessons learned, check the register for gaps and duplicates and help owners write clear risks with causes, effects and actions.
con: Owners confirm every risk ; Suggestions cite their source ; Duplicates flagged ; Suggestions within 1 minute ; 100K register entries
sn: Source | Project documents and past registers | Generic lists | Generic lists miss project risks
sn: Role | Suggest and check quality | Set ratings | Ratings need owner judgement
sn: Quality | Cause, event and effect structure | Vague titles | Vague risks cannot be managed
sig: Project scope and stage | type and phase | Context | From project data
sig: Similar past risks | risks in similar projects | Suggestion | From past registers
sig: Register gaps | areas with no risks | Coverage | From register analysis
sig: Risk text quality | clarity and structure | Quality | From NLP
noise: Owner name | personal data
noise: Risk id | an identifier
noise: Date | weak link
base: Risk workshops and spreadsheets, because they are the usual approach.
prod: An assistant that suggests risks and mitigations from similar projects, checks wording and coverage and keeps owners in control of ratings and actions.
pipe: Project data intake @ project systems ; Similar project search @ embeddings ; Risk suggestion @ LLM with citations ; Quality and duplicate check @ rules ; Owner review @ register tool ; Action tracking @ project tool ; Register review @ monthly
edge: Unique project | no similar projects exist | Structured prompts for workshops
edge: Risk inflation | too many risks are added | Priority limits
edge: Sensitive risk | a risk concerns a person or dispute | Restricted visibility
off: Suggestion acceptance ; Duplicate detection ; Coverage of audited risks
on: Risks realised that were not in the register ; Register quality ; Workshop time
gap: Generic risk lists ; Model-set ratings ; Vague risk titles

== portfolio-prioritisation | Portfolio Prioritisation | tabular | batch | advanced | a=1 k=3
obj: Rank and balance projects in a portfolio by value, risk, capacity use and strategic fit with scenarios, so leaders choose which to fund, delay or stop.
con: Leaders decide ; Criteria and weights set and published by governance ; Scenarios for budget and capacity limits ; Quarterly review of 300 projects ; Assumptions shown
sn: Criteria | Published criteria and weights | Hidden model weights | Prioritisation must be explainable
sn: Constraint | Capacity and budget | Value only | Value without capacity fails
sn: Control | Leadership decisions | Automatic funding | Funding decisions are leadership accountabilities
sig: Expected value | benefit and return estimates | Core | From business cases
sig: Risk level | risk exposure | Core | From project risk data
sig: Capacity demand | people and equipment needs | Constraint | From resource plans
sig: Strategic fit | alignment to strategy | Weight | From governance
noise: Sponsor name | personal data
noise: Project nickname | irrelevant
noise: Slide template | an artefact
base: Annual portfolio reviews with scoring spreadsheets, because they are the usual practice.
prod: An optimiser and what-if tool that applies published criteria, tests capacity scenarios and shows trade-offs and sensitivity for the portfolio board.
pipe: Business case data @ project systems ; Criteria scoring @ rules ; Capacity check @ resource data ; Portfolio optimiser @ solver ; Scenario view @ dashboard ; Board decision @ portfolio board ; Outcome review @ quarterly
edge: Inflated benefits | sponsors overstate value | Benefit realisation tracking
edge: Interdependence | projects depend on each other | Dependency constraints
edge: Funding cut | the budget falls | Scenario re-run
off: Ranking stability ; Constraint satisfaction ; Benefit forecast accuracy
on: Portfolio value delivered ; Projects stopped late ; Capacity overload
gap: Hidden weights ; Value without capacity ; Automatic funding

== engineering-resource-capacity-planning | Engineering Resource Capacity Planning | time-series,tabular | batch | foundational | a=1 k=3
obj: Forecast demand for engineering skills against available capacity across projects and recommend hiring, subcontracting or re-sequencing, at team and skill level and not individual level.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Planning at skill and team level ; No individual utilisation ranking ; Managers decide on hiring and assignments ; Forecast horizon of 12 months ; 5K staff
sn: Level | Skills and teams | Named individuals | Individual utilisation scoring distorts timesheets
sn: Demand | Probabilistic pipeline of projects | Only won projects | Pipeline timing matters for hiring
sn: Action | Hire, subcontract or move work | Overtime | Overtime burns out staff
sig: Project pipeline and stage | likely work and timing | Core | From the pipeline
sig: Effort by phase and discipline | hours per phase | Core | From past projects
sig: Staff capacity by skill | available hours | Constraint | From HR planning
sig: Leave and training plans | absences | Constraint | From planning
noise: Employee name | personal data
noise: Timesheet comment | personal data
noise: Project nickname | irrelevant
base: Resource planning in spreadsheets by discipline leads, because it is the common practice.
prod: A planning model that converts pipeline and past effort profiles into skill demand ranges and shows gaps and options by team for management.
pipe: Pipeline and effort data @ project systems ; Demand forecast @ time-series model ; Capacity data @ HR planning ; Gap analysis @ analytics ; Option scenarios @ planner ; Manager decision @ resource board ; Accuracy tracking @ quarterly
edge: Win rate shift | the pipeline converts differently | Updating conversion rates
edge: Skill shortage | no supply exists | Subcontract and training options
edge: Project slip | work shifts in time | Re-sequencing scenarios
off: Demand forecast error ; Calibration of ranges ; Gap detection accuracy
on: Idle capacity ; Unmet demand ; Overtime hours
gap: Individual utilisation ranking ; Only won projects ; Overtime as the solution

== lessons-learned-retrieval | Lessons Learned Retrieval | llm-agents,nlp | seconds | foundational | a=0.2 k=20
obj: Capture lessons from project closeouts and incident reports and surface relevant ones at design, bid and planning stages with source links.
con: Lessons cite the source project and date ; Client-confidential details removed before reuse ; Owners confirm lessons ; Retrieval within 3 s ; 200K lessons
sn: Source | Confirmed lessons with context | Raw closeout text | Raw text is noisy
sn: Privacy | Redacted client details | Full project names across clients | Clients expect confidentiality
sn: Use | Surfaced at the decision point | An archive | Archives are not read
sig: Lesson text and tags | issue, cause and action | Core | From closeouts
sig: Project type and phase | context match | Relevance | From project data
sig: Outcome evidence | cost or time effect | Weight | From records
sig: Recency and validity | whether the lesson still applies | Filter | From owners
noise: Author name | personal data
noise: Client name | confidential
noise: Document template | an artefact
base: Lessons registers rarely consulted after closeout, because they are the usual practice.
prod: A retrieval service that structures and redacts lessons, links them to project phases and pushes the most relevant ones into design, estimating and planning tools.
pipe: Closeout intake @ project systems ; Structuring and redaction @ LLM and rules ; Owner confirmation @ workflow ; Index with tags @ search ; Context push @ planning tools ; Usage feedback @ UI ; Review of lessons @ yearly
edge: Outdated lesson | practice has changed | Validity dates
edge: Cross-client leak risk | details identify a client | Redaction checks
edge: Vague lesson | no actionable content | Rewrite prompts
off: Retrieval relevance ; Redaction recall ; Owner acceptance
on: Repeated mistakes ; Lessons used at decisions ; Time to find lessons
gap: Raw closeout text ; Cross-client names ; Archives nobody reads

== meeting-minutes-action-tracking | Meeting Minutes and Action Tracking | nlp,llm-agents | seconds | foundational | a=0.1 k=10
obj: Draft minutes and extract decisions and actions from project meeting transcripts and notes, assign owners for confirmation and track completion across projects.
con: Participants consent to recording ; Attendees confirm decisions and actions ; Minutes cite transcript timestamps ; Draft within 15 minutes of meeting end ; 50K meetings per year
sn: Source | Consented transcripts and chair notes | Covert recording | Consent is required
sn: Output | Decisions, actions and owners | A transcript summary | Teams need actions
sn: Control | Attendee confirmation | Auto-assigned owners | Wrong owners lose tasks
sig: Decision statements | agreements in the text | Core | From the transcript
sig: Action items and owners | tasks with named people | Core | From the transcript
sig: Due dates | stated or implied dates | Tracking | From the transcript
sig: Open actions from earlier meetings | carried-over items | Follow-up | From the tracker
noise: Speaker voice | personal data
noise: Meeting room name | irrelevant
noise: Platform | weak link
base: A secretary taking notes and emailing minutes, because it is the usual practice.
prod: A drafting assistant that creates cited minutes, extracts actions with proposed owners and dates and tracks open items in the project tool after confirmation.
pipe: Consented transcript @ meeting tool ; Segmentation @ NLP ; Decision and action extraction @ LLM ; Owner and date proposal @ rules ; Chair confirmation @ editor ; Action tracking @ project tool ; Reminders @ chat
edge: Cross-talk | several people speak at once | Low-confidence marks
edge: Implicit action | a task is implied not stated | Ask the chair
edge: Sensitive discussion | content should not be recorded | Pause and redaction rules
off: Action extraction recall ; Owner accuracy ; Faithfulness to transcript
on: Action completion rate ; Time to publish minutes ; Missed actions
gap: Covert recording ; Transcript summaries without actions ; Auto-assigned owners

== engineering-copilot-calculation-verification | Engineering Copilot with Calculation Verification | llm-agents,tabular | seconds | staff-principal | a=0.5 k=40
obj: Help engineers draft calculations, specifications and reports while a separate verifier checks units, formulas, code clauses and numeric results against independent tools before anything reaches review.
con: Every numeric result is recomputed by an independent calculator ; Code clauses cited with edition ; Licensed engineer signs every deliverable ; The copilot cannot issue or seal documents ; Verification within 30 s per calculation
sn: Verification | Independent computation and unit checks | Model self-check | A model can repeat its own error
sn: Scope | Draft and check | Sign or issue | Professional accountability stays with the engineer
sn: Source | Clause text from the licensed standard | Model memory | Memory can mix editions
sig: Unit consistency | dimensions of every quantity | Core | From a units engine
sig: Independent recomputation | tool result versus draft | Core | From calculators
sig: Clause citation match | cited clause and edition | Check | From the standards library
sig: Assumption register | stated assumptions and limits | Review | From the draft
noise: Engineer name | personal data
noise: Draft length | weak link
noise: Template name | an artefact
base: Engineers writing calculations in spreadsheets and documents with peer checking, because it is the standard practice.
prod: A drafting copilot that structures calculations as code and formulas, runs an independent verifier for units and numbers, cites clauses from licensed standards and lists assumptions for the engineer.
pipe: Calculation brief @ engineer ; Draft structure @ LLM ; Formula and unit execution @ calculation engine ; Independent verifier @ separate tool ; Clause citation check @ standards library ; Engineer review and sign-off @ review tool ; Record @ document system
edge: Unit slip | a value uses the wrong unit | Unit engine and reject
edge: Edition mismatch | an old code edition is cited | Edition check
edge: Out of scope | a method is outside code limits | Applicability checks and a stop
off: Detection of seeded calculation errors ; Citation accuracy ; Verification coverage
on: Calculation errors found in review ; Time to draft calculations ; Late design changes
gap: Model self-checking ; Signing by the copilot ; Memory of standards

== ai-design-review-professional-sign-off | AI-Assisted Design Review and Professional Sign-Off | llm-agents,tabular | seconds | staff-principal | a=0.3 k=20
obj: Check design packages for coordination errors, missing information and code issues with an AI reviewer and route a findings list to licensed engineers who review, resolve and sign.
con: Engineer of record signs every package ; Findings cite sheet and clause ; AI findings logged with engineer decisions ; The reviewer never edits controlled drawings ; Review of 500 sheets within 2 hours
sn: Role | Find and cite | Pass or fail the design | Professional judgement stays with the engineer
sn: Evidence | Sheet, clause and measurement | General comments | Engineers need to verify quickly
sn: Control | Logged engineer decisions | Silent edits | Edits must be traceable
sig: Cross-sheet inconsistencies | values that differ between sheets | Core | From extraction
sig: Missing information | required items absent from the package | Core | From checklists
sig: Code requirement checks | clause versus design value | Support | From the standards library
sig: Past review findings | common errors by discipline | Hint | From review history
noise: Reviewer name | personal data
noise: Sheet layout | an artefact
noise: Software brand | weak link
base: Peer review by senior engineers using checklists, because it is the standard control.
prod: A review assistant that reads the package, lists cited inconsistencies, gaps and code issues and tracks each engineer decision to resolution before release.
pipe: Package intake @ document system ; Sheet and table extraction @ vision and NLP ; Consistency and gap checks @ rules ; Code check with citations @ LLM and library ; Findings list @ review tool ; Engineer decisions @ engineer ; Release gate @ document control
edge: Poor drawings | scans are hard to read | Quality flags
edge: Intentional deviation | a design departs from a standard on purpose | Engineer decision with rationale
edge: Overwhelming findings | too many comments appear | Severity ranking
off: Finding precision and recall on seeded errors ; Citation accuracy ; Engineer acceptance
on: Errors found before issue ; Review time ; Post-issue revisions
gap: AI pass or fail ; Silent edits ; Uncited comments

== safety-critical-ai-validation | Safety-Critical AI Validation | tabular,computer-vision | batch | staff-principal | a=1 k=5
obj: Validate AI models used near safety-critical engineering decisions with independent test sets, failure analysis and operating limits so only models with documented evidence are released for use.
con: Independent test data never used in training ; Validation report required before release ; Operating limits documented and enforced ; Revalidation after data or model changes ; Safety officer signs off every release within 10 working days
sn: Evidence | Independent held-out and field data | Training performance | Training metrics overstate reality
sn: Scope | Documented operating domain | Any use | Models fail outside their domain
sn: Control | Safety officer sign-off | Self-release by developers | Developers miss their own risks
sig: Held-out performance by condition | accuracy across conditions | Core | From validation
sig: Failure case catalogue | known failure modes | Core | From analysis
sig: Operating domain coverage | conditions tested | Limit | From test design
sig: Monitoring drift | live data versus validation data | Alert | From monitoring
noise: Developer name | personal data
noise: Model architecture | not evidence
noise: Training run id | an identifier
base: Developer testing and review by a senior engineer, because it is the common practice.
prod: A validation process with independent datasets, failure analysis, domain limits and sign-off gates that also monitors live drift and triggers revalidation.
pipe: Intended use definition @ safety case ; Independent test set build @ data team ; Validation run @ test harness ; Failure analysis @ engineers ; Safety review and sign-off @ safety officer ; Release with limits @ model registry ; Drift monitoring @ monitoring
edge: Rare conditions | the test set lacks edge cases | Targeted tests
edge: Distribution shift | the field differs from tests | Drift alerts and revalidation
edge: Version change | a model update changes behaviour | Revalidation before release
off: Performance by condition ; Failure coverage ; Calibration
on: Models released without evidence ; Field failures ; Time to validate
gap: Training metrics as evidence ; Any-use release ; Self-release

== engineering-agent-evaluation-harness | Engineering Agent Evaluation Harness | llm-agents,tabular | batch | advanced | a=1 k=40
obj: Evaluate engineering assistants and agents on real past questions, reviews and calculations with expert answers, safety checks and cost so changes are judged on evidence before rollout.
con: Tasks built from real past work with expert-approved answers ; Results by discipline and task type ; Calculation correctness checked by tools ; Re-run on every agent change ; 2K tasks
sn: Truth | Expert answers and verified calculations | Model-written answers | The model may grade itself wrongly
sn: Metrics | Correctness, citation, safety and cost | Fluency | Fluent answers can be wrong
sn: Coverage | Real hard tasks | Textbook questions | Real work is messier
sig: Answer correctness | match to expert answer | Core | From the harness
sig: Calculation verification | tool recomputation result | Core | From calculators
sig: Citation accuracy | clause and edition correctness | Quality | From the standards library
sig: Safety violations | policy breaches in runs | Safety | From gateway logs
noise: Task author | irrelevant
noise: Run id | an identifier
noise: Model name alone | needs outcome data
base: Spot checks by senior engineers, because they are the common evidence.
prod: A harness that replays curated tasks in a sandbox, grades with expert answers and tool checks, tracks safety and cost and gates rollout on regression thresholds.
pipe: Task curation @ past project work ; Sandbox run @ agent platform ; Automated grading @ rules and calculators ; Expert sampling @ review tool ; Safety check @ gateway logs ; Report and gate @ release process ; Task refresh @ quarterly
edge: Stale standards | tasks use old code editions | Edition tagging
edge: Non-determinism | results vary across runs | Multiple runs and intervals
edge: Confidential tasks | tasks contain client data | Redaction and segregated storage
off: Agreement of harness scores with later outcomes ; Variance across runs ; Task coverage
on: Regressions caught before rollout ; Cost per solved task ; Agent changes shipped with evidence
gap: Model-written answers as truth ; Fluency as quality ; Textbook-only tasks

== engineering-agent-action-guardrails | Engineering Agent Action Guardrails | llm-agents,tabular | seconds | staff-principal | a=0.5 k=40
obj: Control and audit every action AI agents take in engineering and project systems, enforce approval tiers and client segregation and give auditors a replayable record.
con: Policy enforced in a gateway outside the model ; Agents never issue, seal or release drawings, approve payments or change baselines ; Client workspaces strictly segregated ; Immutable action log ; Kill switch per agent ; Audit queries over 90 days answered within 5 s
sn: Enforcement | A tool gateway with policy as code | Prompt instructions | Prompts can be bypassed by crafted input
sn: Scope | Least privilege per agent and project | One token for all projects | One mistake should not cross clients
sn: Evidence | An append-only log with context | A summary report | Auditors need replay
sig: Action risk tier | the tier of the target system and action | Approval routing | Policy as code
sig: Cross-project access attempts | requests outside the assigned project | Leak signal | From the gateway
sig: Approval and override statistics | approvals, rejections and overrides | Governance health | From the log
sig: Post-action verification result | whether the intended state was reached | Quality of actions | Verification steps
noise: Agent name | an identifier
noise: Prompt length | not risk
noise: Model version alone | needs outcome data
base: Manual review of agent logs by project controls, because it is the minimum audit trail.
prod: A policy gateway with risk tiers and project segregation, a kill switch, an immutable action log with replay and anomaly detection on agent actions with quarterly governance reports.
pipe: Tool gateway @ policy proxy ; Risk tier decision @ policy as code ; Approval workflow @ maker-checker ; Action log @ append-only store ; Behaviour monitor @ time-series model ; Replay console @ analytics ; Governance report @ quarterly
edge: Cross-client request | an agent asks for another client data | Block and alert
edge: Approver fatigue | approvals become automatic | Override statistics and rotating approvers
edge: New tool added | no tier has been defined for it | Default deny until classified
off: Policy test coverage ; Detection of seeded anomalous actions ; Replay completeness
on: Actions blocked by policy ; Cross-project access incidents ; Time to answer audit queries
gap: Prompt-only guardrails ; One token for all projects ; Default allow for new tools
