# Public Sector & Smart Cities, part 2 (use cases 22-50): infrastructure and environment, planning and permits, social and public health services, policy and public data, accountability and agent governance
# Vendor-neutral. Models support caseworkers and never issue a denial, sanction or penalty on their own, protected characteristics and their proxies are not used, every decision about a person keeps a named human and an appeal route.
== urban-flood-risk-forecasting | Urban Flood Risk Forecasting | time-series,graph | batch | advanced | a=96 k=4
obj: Forecast street-level flood risk from rainfall forecasts, drainage state and river levels so the city can pre-position pumps, close roads and warn residents in time.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Risk maps for the next 6 hours updated every 15 minutes ; Warnings issued by named duty officers ; Intervals and scenario ranges shown ; Works with sparse gauges ; 50K drainage assets
sn: Truth | Observed flooding from reports, gauges and imagery | Rainfall totals | Totals do not show where water collects
sn: Model | A drainage network model with learned corrections | A pure statistical map | Drainage blockage and capacity matter
sn: Action | Warnings and pre-positioned crews | A map only | Operators need actions and timing
sig: Rainfall nowcast and forecast | radar and model rainfall | Main driver | From weather services
sig: Drain and pump status | blocked drains and pump availability | Capacity | From telemetry and work orders
sig: River and tide levels | gauge levels | Boundary condition | From gauges
sig: Ground saturation | recent rainfall and soil moisture | Runoff | From satellites and models
noise: Gauge name | an identifier
noise: Report author | irrelevant
noise: Map style | an artefact
base: Fixed rainfall thresholds for alerts by catchment, because they are the standard trigger.
prod: A hybrid hydraulic and learned model that predicts flooded streets with scenario ranges, links to pump and crew planning and keeps a duty officer in charge of warnings.
pipe: Rainfall and gauge ingestion @ weather and telemetry ; Network state @ asset and work order data ; Hydraulic simulation @ drainage model ; Learned correction @ gradient boosting ; Risk map @ operations dashboard ; Duty officer warning @ alert system ; Post-event verification @ reports and imagery
edge: Blocked drain | capacity is lower than modelled | Telemetry and a complaint-based update
edge: Extreme rainfall | the event is beyond history | Physics model with wider scenario ranges
edge: Gauge failure | a river level is missing | Neighbour gauge inference and a flag
off: Flooded street detection against observed events ; Lead time ; Calibration
on: Properties flooded ; Warning lead time ; Pump deployment accuracy
gap: Rainfall thresholds only ; Map without actions ; Ignoring drain state

== urban-air-quality-forecasting | Urban Air Quality Forecasting | time-series | batch | foundational | a=24 k=2
obj: Forecast air pollutants by neighbourhood for the next days from sensors, traffic and weather so health alerts and traffic measures are timely.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Hourly forecast for 72 hours ; Reference-grade and low-cost sensors reconciled ; Health alerts reviewed by public health staff ; Uncertainty shown ; 500 sensors
sn: Sensors | Calibration against reference stations | Raw low-cost readings | Low-cost sensors drift with humidity
sn: Use | Health alerts and policy measures | A number on a map | People and officials need advice
sn: Fairness | Coverage in all neighbourhoods | Sensors only in wealthy areas | Gaps hide exposure
sig: Weather forecast | wind, temperature and stability | Dispersion | From weather models
sig: Traffic and emission activity | traffic flow and industrial activity | Source | From traffic and permits
sig: Recent concentrations | readings at nearby sensors | Anchor | Calibrated
sig: Regional background | regional pollution levels | Inflow | From networks
noise: Sensor name | an identifier
noise: Report author | irrelevant
noise: Colour scale | an artefact
base: Persistence of today's readings with a seasonal profile, because it is the simple benchmark.
prod: A calibrated sensor fusion with a forecasting model on weather and activity data, neighbourhood maps with uncertainty and an alert workflow reviewed by public health staff.
pipe: Sensor and reference data @ monitoring network ; Calibration @ regression ; Feature build @ weather and traffic joins ; Forecast model @ gradient boosting ; Uncertainty estimate @ quantile heads ; Alert review @ public health team ; Accuracy tracking @ monthly
edge: Sensor drift | low-cost readings degrade | Calibration checks against references
edge: Wildfire smoke | pollution arrives from outside | Regional inputs and events
edge: Data outage | sensors lose power | Imputation limits and flags
off: Error by pollutant and horizon ; Threshold exceedance detection ; Coverage of intervals
on: Alert lead time ; Exceedance days ; Coverage of neighbourhoods
gap: Using raw low-cost readings ; Map-only outputs ; Sensors in selected areas only

== waste-collection-route-optimisation | Waste Collection Route Optimisation | reinforcement-learning,tabular | batch | foundational | a=1 k=4
obj: Plan collection routes from bin fill levels, schedules and vehicle capacity so trucks collect where needed and fuel and overtime fall.
con: Collection frequency rules and service promises respected ; Driver hours and vehicle capacity as hard limits ; Supervisors approve routes ; Daily plans for 300 trucks
sn: Constraint | Legal service frequency | Fill level alone | Residents are promised pickups
sn: Objective | Distance and time with equal service | Distance only | Distance-only routes can neglect poorer areas
sn: Data | Fill sensors and driver reports | Sensors only | Sensors cover few bins
sig: Bin fill estimate | estimated fill by bin | Need | From sensors and models
sig: Service rules | scheduled days and statutory limits | Constraint | From policy
sig: Vehicle capacity and shift limits | load, volume and hours | Constraint | From fleet data
sig: Traffic and access limits | road works and access limits | Feasibility | From traffic data
noise: Driver name | irrelevant
noise: Bin colour | irrelevant
noise: Route id | an identifier
base: Fixed weekly routes by zone, because they are the standard service pattern.
prod: A fill-level forecast with a vehicle routing optimiser that keeps service promises, a supervisor review and a service equity check.
pipe: Fill and fleet data @ sensors and telematics ; Fill forecast @ time-series model ; Route optimiser @ vehicle routing solver ; Service rule filter @ rules ; Supervisor approval @ routing tool ; Driver task list @ mobile app ; Equity review @ monthly
edge: Sensor failure | fill data is missing | Historic fill profiles and flags
edge: Holiday peak | volumes rise sharply | Calendar features and extra capacity
edge: Blocked street | the truck cannot reach bins | Live access updates
off: Missed collections ; Distance saved ; Service parity across areas
on: Kilometres driven ; Missed collection complaints ; Overtime hours
gap: Distance-only objectives ; Ignoring service promises ; Sensors-only data

== streetlight-fault-prediction | Streetlight Fault Prediction | time-series,tabular | batch | foundational | a=1 k=3
obj: Predict luminaire and driver failures from power, dimming and fault data so repairs are scheduled in routes before streets go dark.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Failure probability within 30 days ; Priority to high-risk streets and crossings ; Repair routes optimised ; Weekly run for 400K lights
sn: Label | Confirmed lamp or driver failure | Resident complaints | Complaints vary by area and confidence
sn: Priority | Safety value of the location | Failure probability alone | A dark crossing matters more than a quiet lane
sn: Fairness | Equal repair times by area | Faster repair where more complaints arrive | Complaint rates reflect trust not need
sig: Power draw drift | change in power consumption | Degradation | From controllers
sig: Dimming and switching faults | fault codes | Cause | From controllers
sig: Luminaire age and type | years and model | Base rate | From the register
sig: Location safety class | crossings, junctions and crime-prevention areas | Priority | From policy
noise: Light id | an identifier
noise: Contractor name | irrelevant
noise: Photo name | an artefact
base: Repair after complaints and annual night inspections, because it is the current process.
prod: A failure prediction model with a safety-weighted repair route planner, parity monitoring of repair times by area and a work order link.
pipe: Controller data intake @ lighting management system ; Feature build @ aggregated histories ; Failure model @ gradient boosting ; Priority scoring @ rules ; Route planning @ optimiser ; Work order @ asset system ; Repair parity review @ quarterly
edge: Controller outage | many lights report no data | Outage flags to avoid false failures
edge: Firmware update | fault codes change | Versioned code maps
edge: New LED type | no failure history | Priors from similar types
off: Calibration of 30-day failure risk ; Top-decile capture ; Repair time parity across areas
on: Lights out ; Repair time ; Night inspections avoided
gap: Complaint-led repairs ; Ignoring location safety ; Failure probability as the only priority

== water-main-break-prediction | Water Main Break Prediction | tabular | batch | advanced | a=0.3 k=6
obj: Predict which pipes are likely to break so renewal and pressure management target the pipes with the highest risk and consequence.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Break probability per pipe for the next year ; Consequence weighting by customers and critical sites ; Engineers review renewal lists ; Annual refresh for 2M pipes
sn: Label | Recorded breaks with cause | Complaints | Complaints do not locate breaks
sn: Censoring | Pipes that have not failed are censored | Failed pipes only | Training on failures alone overstates risk
sn: Action | A renewal and pressure plan | A risk map | Utilities act on lists and budgets
sig: Pipe material and age | material, diameter and install year | Baseline hazard | From the register
sig: Break history | past breaks on the pipe and neighbours | Strong predictor | From records
sig: Soil and traffic load | corrosive soil and road loading | Stress | From geospatial data
sig: Pressure and transients | pressure range and surges | Stress | From sensors
noise: Pipe id | an identifier
noise: Contractor name | irrelevant
noise: Map layer | an artefact
base: Replace the oldest cast iron pipes first, because it is a common policy.
prod: A survival model with spatial features and consequence weighting, a budget-constrained renewal planner and a pressure management advisor.
pipe: Asset and break data extraction @ asset system ; Survival data setup @ batch ; Hazard model @ survival analysis ; Consequence weighting @ GIS rules ; Renewal optimiser @ budget model ; Engineer review @ asset planning ; Outcome tracking @ annual
edge: Missing install year | the pipe age is unknown | Age estimation with a flag
edge: Repair bias | breaks near depots are recorded more | Reporting-rate adjustments
edge: New material | few failures are observed | Priors from similar materials
off: Calibration of annual break probability ; Concordance ; Top-decile capture
on: Breaks per 100 km ; Renewal cost per avoided break ; Customer minutes lost
gap: Age-only replacement ; Training on failures only ; Ignoring consequence

== municipal-building-energy-anomaly | Municipal Building Energy Anomaly Detection | time-series | batch | foundational | a=96 k=2
obj: Find buildings with abnormal energy use among schools, libraries and offices so faults and wasted heating or cooling are fixed.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Baselines weather-adjusted per building ; Estimated waste in energy and cost ; Facilities team confirms before work ; Weekly run for 3K buildings
sn: Baseline | Weather- and schedule-adjusted use | Absolute use | Use changes with season and occupancy
sn: Action | A ranked list with likely cause | A heat map | Facilities teams need a task
sn: Equity | Comfort and service not reduced to save energy | Cutting use blindly | Some buildings are under-heated
sig: Weather-adjusted consumption | use against expected for the weather | Core signal | From meters
sig: Schedule deviation | operation outside opening hours | Waste | From schedules
sig: Equipment alarms | heating and ventilation faults | Cause | From building systems
sig: Occupancy proxy | aggregated occupancy or CO2 trends | Context | From sensors
noise: Building name | an identifier
noise: Caretaker name | irrelevant
noise: Photo name | an artefact
base: Monthly energy reports by building and a review of the highest users, because it is the common approach.
prod: A weather- and schedule-normalised anomaly model with cause hints and a work order flow plus a check that comfort targets are kept.
pipe: Meter and building data @ energy management system ; Normalisation @ regression ; Anomaly detection @ change point ; Cause hints @ rules ; Work order @ facilities system ; Verification @ before after check ; Comfort review @ monthly
edge: Occupancy change | a building is used differently | Schedule updates
edge: Meter fault | readings are wrong | Meter checks before alerts
edge: Cold snap | consumption rises for good reason | Weather-adjusted baselines
off: Detection of seeded faults ; Savings estimate error ; False alerts per building
on: Energy per square metre ; Faults found ; Comfort complaints
gap: Absolute use comparisons ; Blind reductions ; Heat maps with no actions

== building-permit-plan-review-assistant | Building Permit Plan Review Assistant | computer-vision,llm-agents | seconds | advanced | a=1 k=60
obj: Pre-check building plans against code and zoning rules and highlight possible issues with references so plan reviewers focus on judgement and applicants fix problems earlier.
con: Every flag cites the rule and the drawing location ; The assistant never approves or rejects ; Reviewer decides ; Applicants see the same issues list ; Precheck within 15 minutes ; 100K applications per year
sn: Rules | Code text as structured rules with versions | Model recall of code | Codes differ and change
sn: Authority | The reviewer decides and signs | An automatic approval | Approval carries legal responsibility
sn: Transparency | The same checks for all applicants | Hidden checks | Consistency is a fairness duty
sig: Dimension and area extraction | measurements read from plans | Rule inputs | From drawing analysis
sig: Rule match | which code section applies | Citation | From the rule base
sig: Zoning and overlay data | zone and overlays at the site | Applicable rules | From GIS
sig: Drawing completeness | required sheets and details | Readiness | From the checklist
noise: Applicant name | irrelevant
noise: Architect firm | irrelevant for correctness
noise: File name | an artefact
base: Manual plan review by examiners using checklists, because it is the current process.
prod: A plan reading pipeline with a rule engine that produces cited flags for reviewers and applicants, with an audit log of rule versions.
pipe: Plan intake @ permit portal ; Drawing parsing @ vision and OCR ; Measurement extraction @ model ; Rule check @ rule engine ; Flag drafting with citation @ LLM with controlled text ; Reviewer decision @ permit system ; Rule version log @ audit store
edge: Hand-drawn plans | extraction is unreliable | Low confidence flags and manual review
edge: Code update | a rule changes mid-review | Versioned rules by application date
edge: Unusual building | no rule matches | Routing to an expert reviewer
off: Flag precision and recall against reviewer findings ; Measurement error ; Citation accuracy
on: Review cycle time ; Resubmissions ; Reviewer time per application
gap: Automatic approval ; Uncited flags ; Unversioned rules

== permit-processing-time-prediction | Permit Processing Time Prediction | tabular | batch | foundational | a=0.5 k=5
obj: Predict how long each permit application will take so applicants get honest timelines and managers balance workloads.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Timeline range shown to applicants ; Prediction recalculated at each stage ; No effect on queue order ; Aggregated fairness checks ; 200K applications per year
sn: Honesty | A range with the reasons | A promise | Reviews can stall for reasons outside the office
sn: Queue | First-come order maintained | Faster for those predicted to be easy | That would create unequal service
sn: Use | Information and workload planning | Staff performance scoring | Predictions reflect case difficulty not staff quality
sig: Application type and size | permit class and project size | Complexity | From the application
sig: Completeness at submission | missing items at intake | Delay | From intake
sig: Reviewer queue length | open work for the review team | Wait | From the system
sig: Stage history | time in each stage | Progress | From the workflow
noise: Applicant name | irrelevant
noise: Reviewer name | irrelevant
noise: Contractor type | weak link
base: The average processing time by permit type published on the website, because it is common.
prod: A quantile model of remaining time by stage with reasons, workload views for managers and a fairness check that queue order is respected.
pipe: Workflow event data @ permit system ; Feature build @ stage histories ; Timeline model @ quantile regression ; Reason selection @ rules ; Applicant timeline @ portal ; Manager workload view @ dashboard ; Accuracy tracking @ monthly
edge: Policy backlog | a rule change adds work | Backlog features and alerts
edge: Missing info | the applicant delays a response | Pause time modelling
edge: Seasonal peak | volumes spike in spring | Seasonal features
off: Calibration of time ranges ; Error by permit type ; Queue order compliance
on: Applicant wait time uncertainty ; Calls asking for status ; Overdue permits
gap: Staff scoring ; Reordering queues ; Single-point promises

== zoning-code-question-agent | Zoning and Building Code Question Agent | llm-agents,nlp | seconds | advanced | a=0.05 k=40
obj: Answer questions about what can be built on a parcel by retrieving the zoning rules, overlays and code with citations, and refer binding determinations to planners.
con: Answers cite the rule text and the effective date ; The agent gives guidance and not a determination ; Parcel data from the GIS system ; Handoff to planners for formal letters ; Response within 5 s
sn: Source | The current adopted ordinance and overlays | Model recall | Rules vary by parcel and change
sn: Status | Guidance with a disclaimer and an invitation to request a determination | A legal answer | Only planners can issue determinations
sn: Scope | Parcel-specific facts from GIS | General statements | Rules differ by overlay
sig: Parcel zone and overlays | zone and overlay layers at the parcel | Applicable rules | From GIS
sig: Ordinance version and date | effective version | Correctness | From the rule store
sig: Question type | uses, setbacks, height or process | Routing | Classified
sig: Variance history | prior variances nearby | Context | From records
noise: Resident name | irrelevant and private
noise: Address format | an artefact
noise: Chat length | an artefact
base: Planning counter staff searching ordinance PDFs and maps, because it is the current process.
prod: A retrieval agent combining parcel lookups and ordinance retrieval to answer with citations and effective dates, with a clear route to formal determinations.
pipe: Question and address intake @ web and counter ; Parcel resolution @ GIS ; Rule retrieval @ ordinance index ; Answer with citation @ LLM with controlled text ; Determination referral @ permit system ; Feedback @ planners ; Rule coverage review @ quarterly
edge: Ambiguous address | the parcel cannot be resolved | Ask for confirmation and list candidates
edge: Recent amendment | the new ordinance is not indexed yet | Freshness checks and a notice
edge: Complex use | two zoning rules conflict on the parcel | Route to a planner
off: Answer correctness on audited questions ; Citation coverage ; Handoff precision
on: Counter enquiries ; Wrong-assumption applications ; Time to answer
gap: Giving determinations ; Uncited answers ; Unversioned ordinances

== unauthorised-construction-detection | Unauthorised Construction Detection from Imagery | computer-vision | batch | advanced | a=10 k=500
obj: Compare aerial and satellite images over time to find new structures and changes that have no permit, and send the list to inspectors for verification.
con: Detections are leads for inspectors ; No enforcement from a detection alone ; Private homes handled under policy and law ; Parcel-level results with the images ; Annual coverage of 2,000 square km
sn: Truth | Inspector-verified findings | Change detection alone | Seasonal change and demolition cause false alarms
sn: Action | An inspection list with evidence | An automatic notice | Notices need verification and due process
sn: Fairness | Even coverage across areas | Only some neighbourhoods | Uneven coverage leads to unequal enforcement
sig: Building footprint change | new or enlarged footprints between dates | Core signal | From imagery
sig: Permit match | whether a permit exists for the parcel | Filter | From the permit system
sig: Image quality and date gap | resolution and time between images | Reliability | From metadata
sig: Parcel type and zone | use class | Rules | From GIS
noise: Owner name | personal data
noise: Neighbourhood name | a proxy
noise: Image vendor | irrelevant
base: Inspections following resident complaints, because it is the current trigger.
prod: A change detection model with permit matching and a parity check on coverage, producing a verified inspection list with the evidence images.
pipe: Imagery intake @ aerial and satellite providers ; Alignment and change detection @ vision model ; Permit match @ permit system join ; Lead scoring @ rules ; Inspector verification @ field app ; Result capture @ case system ; Coverage parity review @ annual
edge: Seasonal foliage | trees look like structures | Season-aware models
edge: Temporary structure | tents and containers appear briefly | Persistence rules
edge: Permit lag | a permit exists but is not linked | Fuzzy permit matching and manual check
off: Precision of verified leads ; Recall on known cases ; Coverage parity
on: Unpermitted buildings found ; Inspector time per finding ; Wrongful notices
gap: Automatic notices ; Complaint-only triggers ; Uneven coverage

== land-use-change-detection | Land Use Change Detection from Satellite Imagery | computer-vision | batch | advanced | a=5 k=500
obj: Map land cover and change over time from satellite data so planners track green space loss, sprawl and flood risk areas.
con: Land cover classes follow the city's legend ; Accuracy reported per class ; Change maps with confidence ; Annual and seasonal updates ; 5K square km
sn: Truth | Field-verified samples | Model-labelled data | Self-labelled data hides class confusion
sn: Class | A legend tied to policy | Generic classes | Policy needs consistent definitions
sn: Use | Planning and reporting | A map | Planners need statistics and uncertainty
sig: Spectral and texture features | multispectral and radar bands | Class signal | From satellites
sig: Seasonal profile | change through the year | Class separation | From time series
sig: Elevation and slope | terrain | Context | From elevation data
sig: Parcel data | boundaries and use | Context | From GIS
noise: Tile name | an identifier
noise: Provider name | irrelevant
noise: Image file name | an artefact
base: Manual photo interpretation of sample points, because it is the standard accuracy method.
prod: A segmentation model on multi-temporal imagery with class-wise accuracy and change confidence, and an annual statistics pack for planners.
pipe: Imagery intake @ satellite archives ; Preprocessing @ cloud masking ; Land cover model @ segmentation network ; Change detection @ differencing ; Accuracy assessment @ field samples ; Planner review @ GIS tool ; Statistics report @ annual
edge: Cloud cover | the scene is blocked | Multi-date compositing and radar
edge: Class drift | the legend changes | Versioned legends
edge: Small features | gardens and trees are missed | Higher resolution inputs for urban cores
off: Class accuracy and kappa ; Change detection precision ; Area estimate error
on: Planning decisions with current data ; Green space tracking ; Survey cost
gap: Model-labelled test data ; Generic classes ; Maps without uncertainty

== public-consultation-comment-analysis | Public Consultation Comment Analysis | nlp,llm-agents | batch | foundational | a=0.2 k=20
obj: Group and summarise thousands of consultation comments by theme and position with quotes linked to the source, so officials read the range of views and decisions are documented.
con: Every theme links to example comments ; Minority views shown not hidden ; Officials review the themes ; Names removed from analysis ; 200K comments
sn: Method | Transparent themes with counts and examples | A single summary | A summary can hide minority views
sn: Fairness | Equal weight for each submission | More weight for organised campaigns | Campaigns copy text and distort the view
sn: Privacy | Redacted comments | Names in analysis | Names deter participation
sig: Theme membership | assignment of comments to themes | Grouping | From clustering and labels
sig: Duplicate and campaign detection | near-identical submissions | Weighting | From text similarity
sig: Stance label | support, oppose or conditional | Position | From the classifier
sig: Location and group aggregate | area-level counts | Coverage | Aggregated
noise: Commenter name | personal data
noise: Comment length | weak link
noise: Submission time | weak link
base: Staff reading and coding comments by hand with a summary report, because it is the current process.
prod: A clustering and stance pipeline with campaign detection, representative quotes, a minority-view check and a reviewer-approved report.
pipe: Comment intake @ consultation platform ; Redaction @ pattern and model ; Duplicate detection @ similarity search ; Theme and stance @ clustering and classifier ; Report draft @ LLM with quotes ; Official review @ editor ; Publication @ public report
edge: Campaign flood | thousands of copies arrive | Campaign flags and separate counts
edge: Sarcasm | stance is misread | Human sampling and uncertainty flags
edge: Multi-language comments | themes are split by language | Multilingual embeddings
off: Theme coherence ; Stance accuracy on labelled samples ; Quote faithfulness
on: Analysis time ; Disputes about the summary ; Minority themes surfaced
gap: Single summary only ; Counting campaign copies as separate views ; Named analysis

== homelessness-service-demand-forecasting | Homelessness Service Demand Forecasting | time-series | batch | foundational | a=1 k=2
obj: Forecast demand for shelter, outreach and prevention services from aggregated data so capacity and funding are planned ahead, without tracking individuals.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Aggregated counts by area and service ; No individual risk scoring ; Scenario ranges for winter and economic shocks ; Monthly run ; 20 service areas
sn: Purpose | Capacity and funding planning | Ranking individuals for services | Individual scoring can deny help
sn: Data | Aggregated service counts | Individual case histories | Case data is highly sensitive
sn: Use | Scenarios for decision makers | A point forecast | Demand depends on policy and the economy
sig: Past service use | counts by service and month | Anchor | From services
sig: Weather and season | cold nights and winter | Seasonal driver | From weather data
sig: Housing and economic indicators | rents, evictions and unemployment | Driver | From statistics
sig: Policy changes | new programmes and rules | Shifts | From policy
noise: Client name | personal data
noise: Case id | an identifier
noise: Provider name | irrelevant
base: Last year's demand by month scaled by the current trend, because it is the planning norm.
prod: A hierarchical forecaster on aggregated data with economic and weather covariates, scenario ranges and a capacity planning view.
pipe: Aggregated counts @ service providers ; Cleaning and harmonising @ batch ; Feature build @ statistics joins ; Forecast model @ gradient boosting ; Scenario ranges @ simulation ; Planner dashboard @ BI tool ; Accuracy tracking @ quarterly
edge: Reporting gaps | providers report late | Nowcasting and flags
edge: Policy shock | an eviction rule changes | Scenario inputs from policy teams
edge: Data change | providers change definitions | Versioned definitions
off: Error by area ; Interval coverage ; Scenario usefulness in review
on: Capacity shortfall nights ; Planning accuracy ; Prevention funding timing
gap: Individual risk scoring ; Point forecasts only ; Case-level data in planning

== caseworker-case-summarisation-assistant | Caseworker Case Summarisation Assistant | llm-agents,nlp | seconds | advanced | a=0.1 k=40
obj: Summarise long case histories for caseworkers with links to the source notes so they prepare faster for visits, with no recommendation about outcomes for the person.
con: Every statement links to a source note ; No risk scores or recommendations about the person ; Caseworker verifies before relying on it ; Access follows case permissions ; Summary within 20 s
sn: Role | A summary that saves reading time | A decision aid about people | Predictions about individuals in care carry serious risks
sn: Evidence | A link to the note for each statement | A free summary | Errors in a case file can harm
sn: Privacy | Need-to-know access with logs | Wide access | Case files are highly sensitive
sig: Note date and author | when and who wrote the note | Provenance | From the case system
sig: Topic of the note | housing, health or safety | Grouping | Classified
sig: Time since last contact | days since the last contact | Orientation | From the case system
sig: Open actions | tasks not completed | Preparation | From the case system
noise: Person name | irrelevant for the model
noise: Worker name | irrelevant
noise: Note length | weak link
base: Reading the whole file before each visit, because it is the current practice.
prod: A summariser with source links, a timeline view and an open-actions list for the caseworker, run only within the permissions of the user and logged.
pipe: Case notes retrieval @ case system ; Permission check @ access control ; Timeline and action extraction @ LLM ; Summary with source links @ LLM with citations ; Caseworker review @ case system ; Access logging @ audit store ; Quality review @ monthly
edge: Missing notes | the file is incomplete | State the gaps
edge: Conflicting notes | records disagree | Show both and the dates
edge: Sensitive content | the summary could expose details | Redaction rules for sensitive categories
off: Faithfulness of statements to notes ; Omission rate of key facts ; Action item recall
on: Preparation time ; Missed actions ; Caseworker satisfaction
gap: Predictions about the person ; Summaries without sources ; Wide access

== public-health-signal-detection | Public Health Signal Detection | time-series | seconds | advanced | a=96 k=3
obj: Detect early rises in illness from aggregated syndromic, wastewater and lab data so public health teams investigate sooner, without individual-level tracking.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Aggregated data above a minimum count ; Alerts reviewed by epidemiologists ; Each alert states the data source ; No individual identification ; 300 regions
sn: Baseline | Seasonal and reporting-adjusted expected counts | Raw counts | Reporting changes and seasons shift counts
sn: Privacy | Small-cell suppression | Individual records | Individuals could be identified
sn: Action | An alert to epidemiologists with context | A public alarm | Public statements need verification
sig: Syndromic counts | visits and calls for symptoms | Early signal | Aggregated
sig: Wastewater concentration | viral load in sewage | Early signal | From labs
sig: Lab positivity | share of positive tests | Confirmation | From labs
sig: Reporting lag and holidays | delays and calendar effects | Adjustment | From the calendar
noise: Facility name | an identifier
noise: Clinician name | irrelevant
noise: Report format | an artefact
base: Weekly counts compared with thresholds and epidemiologist review, because it is the standard surveillance.
prod: A multi-source detection with reporting-lag correction, spatial clustering and a ranked alert list with context for epidemiologists.
pipe: Aggregated data intake @ health data feeds ; Small-cell suppression @ privacy rules ; Baseline model @ time-series model ; Anomaly detection @ scan statistics ; Alert ranking @ rules ; Epidemiologist review @ surveillance tool ; Outcome review @ monthly
edge: Reporting change | a lab changes its reporting | Source flags and baselines reset
edge: Outbreak in a small area | counts are small | Aggregation and spatial scans
edge: Holiday effects | reported counts drop over holidays | Calendar features
off: Detection delay on past outbreaks ; False alert rate ; Recall of confirmed events
on: Days to detection ; Outbreaks investigated early ; Alert workload
gap: Individual-level tracking ; Raw count thresholds ; Public alarms from raw alerts

== school-enrolment-forecasting | School Enrolment Forecasting | time-series | batch | foundational | a=1 k=2
obj: Forecast student numbers by school and year from births, housing and migration so capacity, catchments and staffing are planned in time.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Forecast for 10 years with intervals ; Aggregated data by catchment ; Housing development pipeline as input ; Annual refresh for 2K schools
sn: Method | A cohort survival model with housing and migration inputs | A trend line | Trends miss new housing and policy changes
sn: Use | Capacity and catchment planning | A school ranking | Planning needs ranges and scenarios
sn: Privacy | Aggregated cohorts | Individual pupil tracking | Not needed for planning
sig: Births by area | births five years earlier | Entry cohort | From registers
sig: Housing completions | new homes by type and area | Growth | From planning data
sig: Cohort progression | transition rates between grades | Flow | From past enrolment
sig: Migration and mobility | movement in and out | Shift | From statistics
noise: School name | an identifier
noise: Head teacher name | irrelevant
noise: Report format | an artefact
base: A linear trend of past enrolment by school, because planners use it as a rule of thumb.
prod: A cohort-component model with housing pipeline inputs and scenarios for capacity planning, reviewed by the education planning team.
pipe: Enrolment and births data @ education and registers ; Cohort model @ cohort-component ; Housing pipeline join @ planning data ; Scenario ranges @ simulation ; Capacity gap analysis @ planning tool ; Planner review @ education team ; Accuracy tracking @ annual
edge: New housing delayed | the pipeline slips | Scenario updates
edge: Policy change | catchments change | Policy flags and rebuilds
edge: Migration shock | new arrivals jump unexpectedly | Wider scenarios
off: Error by school and horizon ; Coverage of intervals ; Capacity gap prediction accuracy
on: Over- and under-capacity schools ; Temporary classroom cost ; Planning accuracy
gap: Trend-only forecasts ; Individual pupil tracking ; Single-scenario plans

== public-facility-demand-forecasting | Public Facility Demand Forecasting | time-series | batch | foundational | a=24 k=2
obj: Forecast use of libraries, pools and community centres by site and hour so opening hours, staffing and programmes match demand.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Aggregated visit counts only ; Equity targets for access ; Weather and event inputs ; Monthly plans for 400 sites
sn: Data | Door counters and bookings aggregated | Individual visitor tracking | Not needed for planning
sn: Goal | Access and use balanced with cost | Maximum use only | Some services serve small high-need groups
sn: Use | Hours and staffing | A dashboard | Planners need schedule changes
sig: Past visits by hour and day | counts by site | Anchor | From counters
sig: Weather and holidays | weather and calendar | Demand shifts | From calendars
sig: Programme schedule | classes and events | Demand | From bookings
sig: Local population changes | new housing and demographics | Long-term shift | From statistics
noise: Visitor name | personal data
noise: Staff name | irrelevant
noise: Site code | an identifier
base: Last year's hours by site with seasonal adjustments, because it is the common practice.
prod: A site-level forecaster with weather and programme covariates, equity targets and an hours and staffing proposal for managers.
pipe: Counter and booking data @ facility systems ; Aggregation @ batch ; Forecast model @ gradient boosting ; Equity target check @ rules ; Hours and staffing proposal @ planning tool ; Manager approval @ review ; Accuracy tracking @ quarterly
edge: Counter fault | counts are wrong | Data quality checks
edge: New programme | the effect is unknown | Pilot measurement
edge: Closure | demand shifts to nearby sites | Network-aware adjustments
off: Visit count error by site ; Peak error ; Equity target attainment
on: Use per opening hour ; Access in high-need areas ; Staff overtime
gap: Maximising use only ; Individual tracking ; Dashboards with no schedule changes

== public-health-outreach-targeting | Public Health Outreach Targeting | tabular | batch | advanced | a=0.2 k=5
obj: Choose neighbourhoods and channels for vaccination and screening outreach by estimated gaps in uptake and barriers, so services reach people who are least served, using area-level data.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Area-level targeting with no individual profiling ; Consent respected for any contact ; Community partners review plans ; Equity gap tracked as the main metric ; 5K neighbourhoods
sn: Goal | Closing uptake gaps | Raising the average uptake | The average can rise while gaps widen
sn: Level | Neighbourhood and service access data | Individual risk scores | Individual profiling raises privacy and trust issues
sn: Method | Randomised or staggered rollout to learn what works | Assumed effects | Assumed effects mislead
sig: Uptake gap against target | gap in coverage | Need | From registers
sig: Access barriers | travel time to services and opening hours | Barrier | From GIS
sig: Language and community channels | languages and trusted channels | Channel fit | From community data
sig: Past outreach response | response in earlier campaigns | Effect | From tests
noise: Resident name | personal data
noise: Postcode text alone | a proxy for protected groups
noise: Clinic name | an identifier
base: Mass mailings to all eligible residents, because it is the standard approach.
prod: An area-level model of gaps and barriers with a rollout that includes randomised comparisons and community review of the plan.
pipe: Coverage and service data @ registers ; Barrier data join @ GIS ; Gap and effect model @ gradient boosting ; Channel selection @ rules ; Community review @ partners ; Outreach delivery @ service teams ; Equity evaluation @ quarterly
edge: Small areas | counts are too small | Aggregation and suppression
edge: Trust gaps | the message is not trusted | Community messengers and tests
edge: Capacity limits | clinics cannot absorb demand | Capacity-aware planning
off: Effect on uptake in randomised comparisons ; Calibration ; Equity gap change
on: Uptake gap ; Coverage in underserved areas ; Cost per additional person reached
gap: Individual profiling ; Average uptake as the metric ; Assumed effects

== policy-microsimulation-assistant | Policy Microsimulation Assistant | tabular,llm-agents | batch | advanced | a=0.1 k=40
obj: Run microsimulation of tax and benefit changes on synthetic or aggregated populations and explain who gains and loses, with the assumptions and uncertainty shown.
con: Models run on synthetic or aggregated populations ; Assumptions listed with every result ; Results reproducible from a versioned model ; Analysts review before publication ; Simulation within 10 minutes
sn: Output | Distributional effects with ranges | A single average | Averages hide who gains and loses
sn: Trust | Reproducible runs with versioned assumptions | A black box | Policy debates need checkable numbers
sn: Role | Support for analysts | Predicting behaviour | Behavioural responses are uncertain
sig: Policy parameter change | thresholds, rates and rules changed | Scenario | From the policy team
sig: Population weights | survey weights to the population | Representativeness | From statistics
sig: Behavioural response assumptions | elasticities used | Uncertainty | From literature and ranges
sig: Take-up assumptions | share of eligible who claim | Uncertainty | From admin data
noise: Analyst name | irrelevant
noise: Run label | an artefact
noise: Chart style | an artefact
base: Spreadsheet models of a few typical households, because they are the quick estimates.
prod: A versioned microsimulation with scenario ranges and an assistant that explains the results in plain language with the assumptions and a distribution view by group.
pipe: Scenario definition @ policy workspace ; Population data load @ synthetic or aggregated data ; Rules engine @ microsimulation model ; Uncertainty ranges @ Monte Carlo ; Explanation draft @ LLM with run metadata ; Analyst review @ analyst desk ; Publication @ policy brief
edge: Rule complexity | interactions between rules are missed | Test cases from legal text
edge: Data age | survey data is old | Uplift and flags
edge: Behavioural shock | people respond more than assumed | Sensitivity ranges
off: Reproduction of known policy costs ; Distributional accuracy against admin data ; Explanation faithfulness
on: Analysis turnaround ; Policy surprises after launch ; Corrections to published figures
gap: Typical-household averages ; Unversioned assumptions ; Behavioural certainty

== open-data-catalogue-search | Open Data Catalogue Search and Quality | nlp,tabular | seconds | foundational | a=0.1 k=10
obj: Help people find public datasets by meaning and check their quality and freshness so open data gets used and problems are fixed at the source.
con: Search by meaning and by field ; Quality and freshness shown with each dataset ; No personal data in published sets ; Publisher notified of problems ; 20K datasets
sn: Search | Meaning-based retrieval with metadata | Keyword match | Users and datasets use different words
sn: Quality | Checks on schema, freshness and completeness | A download count | Popularity does not show quality
sn: Privacy | A scan for personal data before publication | Publisher self-certification | Self-certification misses leaks
sig: Query to dataset similarity | semantic match of query and description | Retrieval | Embeddings
sig: Freshness and update cadence | last update against schedule | Quality | From metadata
sig: Schema and completeness checks | missing values and type issues | Quality | Rules
sig: Personal data scan result | possible personal fields | Safety | From scans
noise: Publisher name | irrelevant for quality
noise: Dataset id | an identifier
noise: Upload date alone | weak link
base: A keyword search over the catalogue with manual quality notes, because it is the typical portal.
prod: A hybrid search index with quality scores and a pre-publication scan for personal data, with publisher feedback and usage analytics.
pipe: Catalogue harvest @ portal ; Metadata enrichment @ LLM and rules ; Quality checks @ validation tools ; Personal data scan @ pattern and model ; Search index @ vector and keyword ; Publisher feedback @ workflow ; Usage analytics @ monthly
edge: Stale dataset | updates stopped | Freshness alerts to the publisher
edge: Hidden personal data | a free-text column has names | Scan blocks publication
edge: Multilingual queries | users search in another language | Multilingual embeddings
off: Retrieval accuracy on judged queries ; Quality check precision ; Personal data recall
on: Dataset use ; Time to find data ; Quality issues fixed
gap: Keyword-only search ; Popularity as quality ; Self-certified privacy

== foia-redaction-assistant | Records Request Redaction Assistant | nlp,computer-vision | batch | advanced | a=0.5 k=20
obj: Suggest redactions in documents released under public records laws by finding personal data and exempt material, so staff review faster and releases are consistent.
con: Suggested redactions are reviewed by a person ; Each redaction cites its legal exemption ; Recall of personal data above 99% on test sets ; Original retained securely ; 200K pages per year
sn: Risk | Missed personal data | Over-redaction | Missed redactions harm people and over-redaction breaches transparency law
sn: Authority | The records officer decides | The model deciding | Exemptions are legal judgments
sn: Evidence | The exemption cited per redaction | A bare black box | Requesters can appeal
sig: Entity detection | names, IDs and contact details | Personal data | From NER
sig: Exemption match | whether the text fits an exemption | Rationale | From rules and model
sig: Context cues | whether a name is public or private | Disambiguation | From context
sig: Document type | email, case file or report | Template | From the classifier
noise: Requester name | irrelevant
noise: Page count alone | weak link
noise: File name | an artefact
base: Manual redaction by records officers with black marker tools, because it is the current process.
prod: A detection and suggestion pipeline with exemption citations, a review interface, a second reviewer for sensitive releases and an audit trail.
pipe: Document intake @ records system ; OCR and parsing @ document model ; Personal data detection @ NER ; Exemption suggestion @ rules and model ; Officer review @ redaction tool ; Second review for sensitive cases @ workflow ; Release and audit @ records system
edge: Handwriting | the text is not recognised | Manual review flags
edge: Images in documents | faces and IDs appear in images | Image detection and review
edge: Public figure | names should not be redacted | Context and policy rules
off: Recall of personal data ; Over-redaction rate ; Reviewer correction rate
on: Review time per page ; Releases challenged ; Redaction errors found after release
gap: Automatic release ; Redaction with no exemption citation ; Missed images

== procurement-spend-risk-analytics | Procurement Spend and Risk Analytics | tabular,graph | batch | advanced | a=0.2 k=6
obj: Spot unusual patterns in public procurement such as split purchases, single bidders and contract changes, and send leads to auditors, without naming wrongdoing from a score.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Indicators are leads for auditors ; No accusation on a score ; Evidence shown for each indicator ; Fairness for small and local suppliers ; 2M contracts
sn: Label | Audited findings | Press reports | Reports follow publicity not risk
sn: Indicators | Documented red flags such as single bids and splitting | A single opaque score | Auditors need evidence they can check
sn: Fairness | Equal scrutiny for similar contracts | Higher scrutiny for small suppliers | Small suppliers are not riskier by size
sig: Single-bid and short-window tenders | number of bids and tender period | Competition risk | From tenders
sig: Split purchase pattern | purchases just below thresholds | Splitting | From payments
sig: Contract change history | value and scope changes | Risk | From contracts
sig: Supplier network links | shared owners and addresses | Collusion indicator | From registers
noise: Supplier name | an identifier
noise: Officer name | irrelevant
noise: Contract title wording | an artefact
base: Threshold rules and sample audits, because they are the current controls.
prod: A red-flag indicator set with a calibrated ranking trained on audit findings, a supplier-network view and a fairness check across supplier size and region.
pipe: Contract and payment data @ procurement systems ; Indicator computation @ rules ; Network build @ graph store ; Ranking model @ gradient boosting ; Auditor lead list @ case tool ; Audit outcome capture @ audit system ; Fairness review @ annual
edge: Emergency procurement | single bids are legitimate | Emergency flags in features
edge: Framework agreements | patterns differ | Contract type features
edge: Missing data | records lack bidder details | Data quality flags
off: Precision at audit capacity ; Calibration ; Review rate parity by supplier size
on: Findings per audit ; Audit coverage ; Complaints about scrutiny
gap: Accusations from scores ; Press-based labels ; Scrutiny by supplier size

== legislative-document-analysis-agent | Legislative Document Analysis Agent | llm-agents,nlp | seconds | advanced | a=0.1 k=60
obj: Help policy analysts compare bill texts, amendments and existing law with citations so they find conflicts, cross-references and definitions quickly.
con: Every statement cites section and version ; The agent is read-only ; Analysts verify before advice goes to officials ; Version history preserved ; Answer within 10 s
sn: Source | The authoritative legal text and versions | Model memory | Wrong citations mislead advice
sn: Role | A search and comparison aid | Legal advice | Legal interpretation needs lawyers
sn: Scope | Citations and differences | Predictions of court outcomes | Not supported by evidence
sig: Section cross-references | links between sections | Impact | From the parser
sig: Definition conflicts | the same term defined differently | Risk | From definitions
sig: Amendment diff | changes between versions | Change | From version control
sig: Effective dates | when provisions apply | Timing | From the text
noise: Author name | irrelevant
noise: Document formatting | an artefact
noise: Page numbers | an artefact
base: Analysts searching PDFs and comparing documents by hand, because it is the current process.
prod: A structured parse of legal text with retrieval and diff tools, an agent that answers with citations and a review step before advice is shared.
pipe: Legal text ingestion @ legislative databases ; Structure parsing @ section parser ; Index and diff tools @ search and version store ; Question answering @ LLM with citations ; Analyst review @ policy team ; Advice note @ document system ; Feedback @ monthly
edge: Unofficial text | the version is not authoritative | Source checks
edge: Cross-jurisdiction rules | references are unclear | Jurisdiction tags
edge: Amendment conflicts | two amendments touch one section | Show both and the order
off: Citation accuracy ; Cross-reference recall ; Answer faithfulness
on: Analysis time ; Missed conflicts ; Corrections to advice notes
gap: Legal advice by the agent ; Unversioned text ; Uncited statements

== budget-variance-forecasting | Public Budget Variance Forecasting | time-series,tabular | batch | foundational | a=0.5 k=3
obj: Forecast year-end spending and revenue by department from monthly actuals so finance teams act early on overspends and shortfalls.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Monthly forecast to year end with ranges ; Drivers explained by line item ; Finance staff review ; Policy and one-off items flagged ; 300 budget lines
sn: Method | Profiles by line item and driver | One growth rate | Lines behave differently
sn: Use | Early warnings and mitigation | A report | Teams need time to respond
sn: Honesty | Ranges and the drivers | A point forecast | Spending timing is uncertain
sig: Spend to date against profile | year-to-date spend against seasonal profile | Core signal | From finance
sig: Committed spend | open orders and contracts | Near-term | From procurement
sig: Revenue drivers | tax receipts and fees | Revenue | From revenue systems
sig: One-off flags | grants and emergencies | Adjustment | From finance
noise: Budget holder name | irrelevant
noise: Cost centre code | an identifier
noise: Report format | an artefact
base: Straight-line projection of spend to date, because it is the standard monthly check.
prod: A line-item model with seasonal profiles and committed spend, intervals and driver explanations, reviewed in monthly finance meetings.
pipe: Actuals and commitments @ finance system ; Profile model @ seasonal regression ; Driver adjustments @ rules ; Forecast with ranges @ quantile model ; Variance report @ BI tool ; Finance review @ monthly meeting ; Accuracy tracking @ monthly
edge: Late invoices | spend is understated | Commitment-based adjustments
edge: Emergency spend | an event adds costs | One-off flags
edge: Budget transfer | lines are restated | Versioned budgets
off: Forecast error by line ; Interval coverage ; Early warning lead time
on: Overspend at year end ; Forecast accuracy ; Time to mitigation
gap: Straight-line projections ; Point forecasts ; Ignoring commitments

== decision-explanation-assistant | Decision Explanation and Appeal Assistant | llm-agents,nlp | seconds | advanced | a=0.1 k=20
obj: Help caseworkers write clear decision letters from the recorded reasons and legal basis and tell people how to appeal, without changing the decision or adding reasons.
con: Letters use only the recorded reasons and the legal basis ; The assistant cannot change a decision ; Appeal route and deadlines included from templates ; Caseworker signs every letter ; Plain language and 12 translation options
sn: Source | The decision record and statute | Model reasoning | Invented reasons make decisions unlawful
sn: Right | A clear reason and appeal route | A short outcome | People have a right to understand and challenge decisions
sn: Authority | The caseworker signs | The assistant sending letters | Accountability needs a person
sig: Decision record fields | outcome, reasons and facts relied on | Content | From the case system
sig: Legal basis | statute and policy sections | Citation | From the rule base
sig: Appeal deadline and route | statutory deadlines | Required content | From templates
sig: Reading level | grade level of the text | Understanding | From metrics
noise: Applicant name | irrelevant for the model
noise: Letter length | weak link
noise: Template colour | irrelevant
base: Letter templates filled by hand by caseworkers, because it is the current process.
prod: A drafting assistant constrained to recorded reasons with template-based appeal sections, plain language checks, translation and a signature step.
pipe: Decision record retrieval @ case system ; Template selection @ rules ; Letter draft @ LLM with constraints ; Reason and citation check @ rules ; Plain language check @ metrics ; Caseworker approval and signature @ case system ; Outcome and appeal tracking @ quarterly
edge: Missing reasons | the record lacks a reason | Stop and ask the caseworker
edge: Rule update | the statute changes | Versioned templates
edge: Unusual decision | the template does not fit | Manual drafting
off: Faithfulness to recorded reasons ; Appeal section accuracy ; Reading level targets
on: Letter drafting time ; Appeals caused by unclear letters ; Complaints
gap: Invented reasons ; Missing appeal route ; Unsigned letters

== automated-decision-fairness-monitoring | Automated Decision Fairness and Drift Monitoring | tabular | batch | staff-principal | a=0.2 k=8
obj: Continuously monitor every automated and AI-supported tool in a programme for drift, error rates and outcome gaps across groups, and publish a register with the results.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Monitoring covers every tool in the public register ; Metrics by protected group using lawful, minimised data ; Thresholds trigger human review and a pause option ; Reports to the oversight board ; 200 tools
sn: Scope | Outcomes and error rates across groups | Overall accuracy | Averages hide group gaps
sn: Data | Lawfully collected group data or approved proxies for audit only | Using group data in the models | Audit use must be separate from decision use
sn: Action | Review, pause or retrain by rule | Alerts only | Monitoring without consequences is not governance
sig: Outcome rate by group | approval or review rate across groups | Disparity | From audit data
sig: Error rate by group | false positive and negative rates | Disparity | From audited samples
sig: Input drift | change in input distributions | Drift | From logs
sig: Override rate by caseworkers | how often staff reverse the tool | Trust and error | From the case system
noise: Tool name | an identifier
noise: Team name | irrelevant
noise: Report format | an artefact
base: Annual audits of selected tools by an internal team, because they are the current oversight.
prod: A monitoring service that computes agreed fairness and drift metrics per tool, sends threshold breaches to named owners and publishes a register and summary reports.
pipe: Decision and outcome logs @ tool logs ; Audit data join @ approved group data ; Metric computation @ monitoring service ; Threshold evaluation @ rules ; Owner review and pause option @ governance workflow ; Register update @ public register ; Board report @ quarterly
edge: Small groups | metrics are noisy | Confidence intervals and pooled periods
edge: Missing group data | groups are not recorded | Approved proxy methods for audit and a flag
edge: Gaming risk | teams tune to the metric | Held-out audit samples
off: Metric stability ; Detection of seeded disparities ; Time to owner action
on: Tools monitored ; Disparities found and fixed ; Time to pause a faulty tool
gap: Average accuracy only ; Group data used for decisions ; Alerts with no action path

== records-retention-classification | Records Retention Classification | nlp | batch | foundational | a=0.2 k=8
obj: Classify documents and emails into records categories with retention rules so records are kept as long as the law requires and deleted when the period ends.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Category with confidence and the retention rule ; Legal holds override deletion ; Records officers approve disposal lists ; Audit log of every disposal ; 50M documents
sn: Label | The category assigned by records officers | Folder names | Folders are inconsistent
sn: Safety | Legal holds checked before disposal | Retention timers alone | Deleting held material is unlawful
sn: Review | Sampled human review of disposals | Fully automatic deletion | Mistakes cannot be undone
sig: Document type and content | text and attachments | Category | From the classifier
sig: Creator unit and function | office and business function | Context | From the directory
sig: Date and trigger event | creation date and closure event | Retention start | From metadata
sig: Legal hold flags | holds by case | Block | From legal
noise: Author name | irrelevant
noise: File size | weak link
noise: Folder name | an artefact
base: Retention schedules applied by office staff by hand, because it is the current practice.
prod: A classifier with confidence and rule lookup, a hold check, sampled review and disposal approval lists with logs.
pipe: Document intake @ records system ; Classification @ transformer ; Retention rule lookup @ schedule ; Legal hold check @ case system ; Disposal list @ records workflow ; Officer approval @ records tool ; Audit log @ archive
edge: Unknown category | no retention rule fits the document | Abstain and ask an officer
edge: Late hold | a hold arrives after listing | Re-check before disposal
edge: Schedule change | the retention rules change by law | Versioned schedules
off: Category accuracy ; Hold check recall ; Disposal error rate on samples
on: Documents correctly retained ; Storage cost ; Disposal errors
gap: Automatic deletion ; Skipping hold checks ; Folder-based labels

== data-sharing-purpose-gateway | Cross-Agency Data Sharing Purpose Gateway | tabular,llm-agents | sub-100ms | staff-principal | a=0.2 k=20
obj: Check each cross-agency data request against its legal basis, purpose and consent before data is released, and log every share so people can see who used their data and why.
con: Policy enforced outside the model in a gateway ; Requests without a legal basis are denied ; Fields minimised to the stated purpose ; Immutable log available to the data subject on request ; Decision within 100 ms
sn: Enforcement | A policy engine with legal basis as data | Prompt instructions | Prompts can be bypassed
sn: Minimisation | Only fields needed for the purpose | Whole records | Excess data raises risk and breaches law
sn: Transparency | A log that people can inspect | An internal log only | Public trust depends on visibility
sig: Requester and purpose code | agency and declared purpose | Policy input | From the request
sig: Legal basis and consent state | statute, agreement and consent | Decision | From the policy store
sig: Field sensitivity class | sensitivity of requested fields | Minimisation | From the catalogue
sig: Request volume anomaly | unusual request rates | Misuse | From logs
noise: Requester name | irrelevant
noise: Request wording | not policy
noise: Agency size | irrelevant
base: Bilateral agreements and manual approval of each request, because it is the current process.
prod: A policy gateway evaluating requests against purpose-tagged agreements and consent with field-level minimisation, anomaly detection and a subject-facing access log.
pipe: Request intake @ API gateway ; Policy evaluation @ policy engine ; Field minimisation @ data catalogue ; Release or denial @ gateway ; Immutable log @ append-only store ; Anomaly detection @ time-series model ; Subject access portal @ self-service
edge: Purpose creep | a new use is proposed for old data | Deny until the purpose is approved
edge: Consent withdrawal | a person withdraws consent | Propagation and re-check rules
edge: Emergency request | the request is urgent | Break-glass with review and logging
off: Policy decision correctness on test cases ; Minimisation compliance ; Latency at p99
on: Requests denied for no basis ; Time to approve valid requests ; Subject log queries
gap: Prompt-based enforcement ; Whole-record releases ; Internal-only logs

== public-sector-agent-action-guardrails | Public Sector Agent Action Guardrails | llm-agents,tabular | seconds | staff-principal | a=0.3 k=40
obj: Control and audit every action AI agents take in government systems such as case management, payments and records, enforce approval tiers and give oversight bodies a replayable record.
con: Policy enforced in a gateway outside the model ; Agents never issue decisions, payments or sanctions ; Approvals by named roles ; Immutable action log ; Kill switch per agent ; Audit queries over 90 days answered within 5 s
sn: Enforcement | A tool gateway with policy as code | Prompt instructions | Prompts can be bypassed by crafted input
sn: Scope | Least privilege per agent and tool | Shared service accounts | One mistake should not reach all programmes
sn: Evidence | An append-only log with context | A summary report | Oversight bodies need replay
sig: Action risk tier | the tier of the target system and action | Approval routing | Policy as code
sig: Action rate per agent | actions per minute against a baseline | Runaway detection | Per agent
sig: Approval and override statistics | approvals, rejections and overrides | Governance health | From the log
sig: Post-action verification result | whether the intended state was reached | Quality of actions | Verification steps
noise: Agent name | an identifier
noise: Prompt length | not risk
noise: Model version alone | needs outcome data
base: Manual review of agent logs by team leads, because it is the minimum audit trail.
prod: A policy gateway with risk tiers, rate limits and a kill switch, an immutable action log with replay, behavioural anomaly detection on agent actions and quarterly reports to the oversight board.
pipe: Tool gateway @ policy proxy ; Risk tier decision @ policy as code ; Approval workflow @ maker-checker ; Action log @ append-only store ; Behaviour monitor @ time-series model ; Replay console @ analytics ; Oversight report @ quarterly
edge: Agent loop | repeated writes to one case record | Rate limits and loop detection
edge: Approver fatigue | approvals become automatic | Override statistics and rotating approvers
edge: New tool added | no tier has been defined for it | Default deny until classified
off: Policy test coverage ; Detection of seeded anomalous actions ; Replay completeness
on: Actions blocked by policy ; Incidents caused by agent actions ; Time to answer audit queries
gap: Prompt-only guardrails ; Shared service accounts ; Default allow for new tools
