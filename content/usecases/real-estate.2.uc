# Real Estate & PropTech, part 2 (use cases 26-50): commercial, construction, smart buildings, risk and transactions
== lease-abstraction-and-obligation-extraction | Lease Abstraction & Obligation Extraction | nlp,llm-agents | seconds | production-grade | a=0.02 k=900
obj: Read commercial leases and amendments and extract the dates, rents, options, break clauses and obligations into a structured abstract with page citations.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every field cites the page and clause ; Critical dates reviewed by a person ; Amendments applied in order ; Leases stay in the owner's tenancy
sn: Amendments | Effective terms after all amendments | The original lease alone | The rent in force may be set by the third amendment
sn: Dates | Dates and notice periods with their trigger | Any date in the text | Missing a break notice date costs a year of rent
sn: Scope | Fields that drive money and risk | Every clause | Wide extraction increases review without value
sig: Field confidence | calibrated per field | Routing | Calibration
sig: Cross-document consistency | rent in lease vs rent roll | Validation | Rent roll errors
sig: Clause type classifier | clause class | Structure | Variants
sig: Amendment ordering | date order | Currency | Missing pages
noise: Law firm footer | boilerplate
noise: Page numbers | layout
noise: Defined-term capitalisation | style
base: Manual abstracting by paralegals, because it is accurate and slow.
prod: Layout-aware extraction with an LLM for clause understanding, amendment resolution, citations and a reviewer queue for critical fields.
pipe: Lease upload @ data room ; Document parser @ layout model ; Clause extractor @ LLM with schema ; Amendment resolver @ rules ; Validator @ cross-checks ; Reviewer queue @ workflow ; Lease database @ warehouse
edge: Scanned old leases | Scanned old leases have poor OCR and dates and rents are misread | Gate on scan quality, cross-check against the rent roll and send low-confidence fields to review
edge: Side letters | terms outside the lease | Flag unknown references
edge: Foreign-language lease | A lease in another language is mistranslated and a clause is misunderstood | Detect the language, use a multilingual model and require legal review for critical fields
off: Field accuracy ; Critical date recall
on: Abstract time per lease ; Missed critical dates
gap: Clean leases in tests ; Template leakage

== commercial-occupancy-and-rent-roll-forecasting | Commercial Occupancy & Rent-Roll Forecasting | time-series,tabular | batch | production-grade | a=1 k=5
obj: Forecast occupancy and rental income by property from lease expiries, renewal behaviour and market demand.
loss: \mathcal{L}=\sum_t\mathrm{Pinball}(\hat{q}_{0.5},y_t)+\lambda\,\mathrm{Huber}(\hat{r}-r)
con: Lease-by-lease build ; Quarterly update ; Scenarios ; Reconciled to the rent roll
sn: Expiry | Lease expiries and break options | Occupancy trend | Occupancy follows expiries
sn: Renewal | Tenant-level renewal probability | Average | Anchor tenants differ
sn: Market | Submarket vacancy and rents | National data | Local markets differ
sig: Expiry profile | share expiring in 12 months | Risk | Data
sig: Renewal propensity | tenant model | Probability | Few events
sig: Submarket vacancy | vacancy rate | Demand | Source
sig: Rent gap to market | passing minus market rent | Re-letting | Estimates
noise: Property name | none
noise: Manager | none
noise: Photo | none
base: Assume a flat renewal rate and market rent growth, because it is simple.
prod: Lease-level simulation with tenant renewal models and market scenarios, aggregated to fan charts.
pipe: Rent roll @ property system ; Lease terms @ abstract database ; Renewal model @ boosting ; Market model @ time-series ; Simulator @ Monte Carlo ; Asset manager dashboard @ BI ; Archive @ lakehouse
edge: Anchor tenant leaves | The anchor tenant leaves and occupancy drops far more than the model expects | Model anchor tenants individually and run explicit single-name scenarios
edge: Incentives | Incentives such as free rent make the passing rent differ from the effective rent | Model incentives explicitly and forecast effective rent alongside passing rent
edge: Redevelopment | space taken out | Flags
off: Occupancy error ; Income error
on: Forecast accuracy ; Leasing decisions
gap: Back-test in strong markets ; Lease data errors

== investment-property-screening-and-underwriting | Investment Property Screening & Underwriting | tabular,llm-agents | seconds | production-grade | a=0.1 k=100
obj: Screen listed investment properties against the fund's criteria and draft an underwriting summary with cash-flow assumptions.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{r}-r)
con: Assumptions explicit ; Analyst approves ; Sources cited ; Confidential deals
sn: Fit | Mandate fit before analysis | Everything | Analyst time is scarce
sn: Cash flow | Net operating income from lease and cost data | Asking figures | Seller figures flatter
sn: Sensitivity | Range of returns | Point return | Assumptions drive returns
sig: Yield vs target | cap rate | Fit | Estimates
sig: Rent gap | mark to market | Upside | Data
sig: Capex need | condition | Cost | Estimates
sig: Debt service cover | DSCR | Risk | Rates
noise: Broker enthusiasm | marketing
noise: Photo count | none
noise: Deal name | none
base: Spreadsheet screening by analysts, because it is the norm.
prod: Criteria classifier, NOI estimator and an LLM that drafts the underwriting with cited sources and sensitivities.
pipe: Offering memorandum intake @ deal inbox ; Extractor @ LLM ; Criteria screen @ rules ; NOI model @ boosting ; Underwriting drafter @ LLM ; Analyst review @ workflow ; Deal log @ CRM
edge: Missing rent roll | The rent roll is missing, so income cannot be checked | Ask for it, and mark any returns that depend on assumed income as provisional
edge: Seller errors | Seller figures are inconsistent between documents | Flag the inconsistency and use the lower-confidence figure in the base case
edge: Rate changes | A rate change moves returns after the analysis is done | Re-run the underwriting automatically when rates change and show the difference
off: Screen precision ; NOI error
on: Deals screened per analyst ; Hit rate
gap: Biased deal history ; Optimistic seller data

== reit-portfolio-risk-and-allocation | REIT Portfolio Risk & Allocation | tabular,time-series | batch | staff-principal | a=0.1 k=30
obj: Estimate portfolio risk across properties and sectors and recommend allocation changes within mandate limits.
loss: \min_{w}\;w^\top\Sigma w-\lambda\,\mu^\top w
con: Mandate limits ; Liquidity ; Quarterly review ; Explainable
sn: Appraisal | De-smoothed returns | Appraisal returns | Appraisals lag and hide volatility
sn: Concentration | Sector and region exposure | Single assets | Correlated assets fall together
sn: Liquidity | Time to sell | Assume liquid | Assets are illiquid
sig: De-smoothed volatility | adjusted | Risk | Models
sig: Sector correlation | correlation | Diversification | Few data
sig: Lease expiry concentration | expiry | Cash flow risk | Data
sig: Leverage | LTV | Risk | Definitions
noise: Asset name | none
noise: Manager | none
noise: Photo | none
base: Sector weights vs benchmark, because it is typical.
prod: Factor-based risk model with de-smoothing, a constrained optimiser and a scenario module.
pipe: Property valuations @ appraisal data ; Return de-smoother @ model ; Risk model @ factor model ; Optimiser @ constrained solver ; Scenario tool @ simulation ; Committee pack @ BI ; Archive @ lakehouse
edge: Valuation lag | Appraisal-based values lag the market so risk looks smaller than it is | Use de-smoothed returns when estimating volatility and correlation
edge: Rate shock | A rate shock reduces values across all property sectors together | Run stress scenarios with correlated value falls and check the covenant limits
edge: Illiquidity | Assets cannot be sold quickly so the portfolio cannot rebalance | Impose liquidity limits and consider the time to sell in the optimiser
off: Risk forecast error ; Tracking error
on: Risk-adjusted return ; Drawdown
gap: Smoothed returns in tests ; Short history

== commercial-tenant-credit-risk | Commercial Tenant Credit Risk | tabular,nlp | batch | production-grade | a=0.1 k=20
obj: Predict the likelihood that commercial tenants default on rent so landlords price deposits, incentives and exposure.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Explainable ; Monthly refresh ; Data licence ; Fair treatment
sn: Rent | Rent as a share of revenue | Credit score only | Occupancy cost matters
sn: Sector | Sector stress | Static | Retail vs office
sn: Behaviour | Payment behaviour | Financials only | Behaviour leads
sig: Payment days trend | days late | Early | Data
sig: Rent to revenue | ratio | Stress | Revenue estimates
sig: Sector stress index | index | Context | Source
sig: Guarantor strength | parent rating | Support | Data
noise: Tenant name | none
noise: Lease length | weak
noise: Floor | none
base: Credit agency scores, because landlords use them.
prod: Boosting with payment and sector features, monotone constraints and a watchlist.
pipe: Rent ledger @ property system ; Financial data @ vendors ; Feature builder @ Spark ; Default model @ boosting ; Watchlist @ rules ; Asset manager view @ BI ; Outcome feed @ warehouse
edge: Anchor tenant | The largest tenant is a big share of income and its default dominates the risk | Treat large tenants as single names with their own limits
edge: Rent holidays | Rent holidays granted by the landlord look like arrears | Record agreed concessions so they are not treated as missed payments
edge: Parent change | The tenant's parent company changes and the support behind the lease changes | Update guarantor information and re-score when ownership changes
off: AUC ; Calibration
on: Bad debt ; Early warnings
gap: Few defaults ; Cycle

== office-space-utilisation-from-sensors | Office Space Utilisation from Sensors | time-series,tabular | batch | foundational | a=96 k=1
obj: Measure how workspaces and meeting rooms are actually used from sensors and badge data to right-size the portfolio and plan layouts.
loss: \mathcal{L}=\sum_t\mathrm{MSE}(\hat{y}_t,y_t)+\lambda\,\mathrm{Huber}(\hat{o}-o)
con: No individual tracking ; Aggregate counts only ; Works with sensor gaps ; Weekly report
sn: Privacy | Anonymous counts | Named tracking | Trust
sn: Peak | Peak and typical use | Average | Peaks drive space need
sn: Booking | Actual vs booked | Bookings | No-shows hide real use
sig: Peak occupancy | max count | Capacity | Sensors
sig: Booked vs used | ratio | Waste | Booking data
sig: Dwell time | duration | Use | Noise
sig: Day pattern | weekday profile | Planning | Change
noise: Sensor ID | none
noise: Floor colour | none
noise: Badge number | privacy
base: Annual manual headcount, because it is cheap.
prod: Occupancy estimation from sensor fusion with gap filling and a recommendation engine for layouts.
pipe: Sensors @ IoT gateway ; Cleaner @ stream job ; Occupancy estimator @ model ; Pattern miner @ clustering ; Recommender @ rules ; Facilities dashboard @ BI ; Archive @ lakehouse
edge: Sensor failure | Sensor failures create gaps in the occupancy counts | Impute from nearby sensors and mark the interval as estimated
edge: Hybrid days | patterns change | Update
edge: Events | An event fills the building for a day and distorts normal use | Exclude event days from the baseline and report them separately
off: Count error ; Peak error
on: Space released ; Cost saved
gap: Short pilot period ; Sensor bias

== site-selection-for-retail-and-logistics | Site Selection for Retail & Logistics | tabular,graph | batch | production-grade | a=0.02 k=200
obj: Rank candidate locations for a store or warehouse by expected revenue or cost, using demographics, mobility, competition and network fit.
loss: \mathcal{L}=\mathrm{Huber}(\hat{y}-y)+\lambda\,\mathrm{GraphReg}(z)
con: No protected attributes ; Cannibalisation modelled ; Data licences ; Analyst review
sn: Catchment | Drive-time catchment | Radius | Roads shape catchments
sn: Cannibalisation | Effect on own stores | Store alone | Network effects
sn: Transfer | New market validity | Fit on existing | Extrapolation
sig: Catchment population | drive-time | Demand | Data
sig: Competitor density | count | Competition | Data
sig: Mobility flows | foot traffic | Demand | Panel
sig: Network fit | distance to hubs | Cost | Routes
noise: Site name | none
noise: Broker | none
noise: Photo | none
base: Gravity model on population, because it is standard.
prod: Revenue model with cannibalisation and a facility-location optimiser.
pipe: Site candidates @ broker feeds ; Catchment builder @ routing ; Demand model @ boosting ; Cannibalisation model @ regression ; Optimiser @ solver ; Committee pack @ BI ; Outcome log @ warehouse
edge: New market | A new market has no existing stores to learn from | Use priors from similar markets and widen the intervals
edge: Road changes | catchments shift | Update
edge: Pandemic effects | traffic changes | Recent data
off: Revenue error ; Rank correlation
on: New site performance ; Hit rate
gap: Survivor sites ; Selection bias

== due-diligence-document-review | Real Estate Due-Diligence Document Review | llm-agents,nlp | seconds | production-grade | a=0.05 k=800 s=6 t=800
obj: Review data-room documents (title, leases, surveys, environmental, contracts) for a property acquisition, flag issues and draft a report with citations.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every issue cites a document ; Lawyers approve ; Confidential ; Checklist coverage
sn: Coverage | Checklist coverage per document type | Random reading | Missing documents matter
sn: Issues | Material issues ranked | All findings | Noise buries real risk
sn: Evidence | Citations | Claims | Trust
sig: Checklist coverage | share | Completeness | Definition
sig: Issue precision | accepted | Quality | Review
sig: Citation validity | supported | Trust | Check
sig: Material flag | severity | Priority | Judgement
noise: Document length | none
noise: Folder names | none
noise: Dates alone | weak
base: Associates read documents against a checklist, because it is standard.
prod: Agent with document classification, checklist matching, issue extraction and cited drafting with lawyer review.
pipe: Data room ingest @ vendor ; Classifier @ model ; Checklist matcher @ rules ; Issue extractor @ LLM ; Report drafter @ LLM ; Lawyer review @ workflow ; Report @ document
edge: Missing documents | Key documents are missing from the data room | List the missing documents against the checklist and flag the risk in the report
edge: Conflicting documents | Two documents give different facts about the same item | Flag the conflict with both citations and ask the lawyer to resolve it
edge: Scanned files | Scanned files in the data room are unreadable | Check the OCR quality and request clean copies for critical documents
off: Issue recall ; Citation validity
on: Review hours ; Missed issues
gap: Past deals easy ; Checklist bias

== acquisition-deal-sourcing | Acquisition Deal Sourcing | graph,tabular | batch | production-grade | a=0.05 k=50
obj: Find off-market properties likely to sell by combining ownership, debt maturity, lease expiry and behaviour signals.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{GraphReg}(z)
con: Data licences ; Fair contact practice ; Analyst review ; Weekly lists
sn: Sale | Likelihood to sell in 12 months | Owner wealth | Wealth does not imply sale
sn: Ownership | Resolved ownership entities | Parcel owner names | Shell companies hide owners
sn: Timing | Debt and lease events | Static | Events trigger sales
sig: Debt maturity | months | Trigger | Data
sig: Hold period | years | Cycle | Data
sig: Owner entity graph | portfolio | Context | Resolution
sig: Lease expiry | months | Trigger | Data
noise: Owner name | label
noise: Parcel ID | none
noise: Broker | none
base: Analysts' lists from brokers, because it is the norm.
prod: Entity resolution, a sale-propensity model and a ranked outreach list.
pipe: Property and debt data @ vendors ; Entity resolver @ graph ; Features @ Spark ; Sale model @ boosting ; Ranker @ rules ; Analyst list @ CRM ; Outcome feed @ warehouse
edge: Shell ownership | Ownership is hidden behind shell companies | Resolve entities across registries and build the ownership graph
edge: Stale data | Stale debt or owner data suggests a sale that has already happened | Check the freshness of each source and drop records older than the threshold
edge: Mass outreach | Mass outreach to owners causes fatigue and complaints | Limit contacts per owner and per period and track opt-outs
off: PR-AUC ; Lift
on: Off-market deals ; Contact success
gap: Sales biased to listed ; Leakage

== construction-cost-estimation-from-plans | Construction Cost Estimation from Plans | nlp,computer-vision,tabular | seconds | staff-principal | a=0.02 k=2000
obj: Estimate construction cost early from drawings, specifications and past projects, with quantity take-off support.
loss: \mathcal{L}=\mathrm{Huber}(\log\hat{c}-\log c)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.9},c)
con: Range not a point ; Assumptions listed ; Estimator approves ; Region cost indices
sn: Quantities | Quantities from plans | Area alone | Complexity drives cost
sn: Escalation | Time and region adjustment | Historic cost | Prices move
sn: Scope | Scope changes | Static | Change orders matter
sig: Gross area and storeys | area | Base | Plans
sig: Spec level | finish | Cost | Text
sig: Region index | index | Adjustment | Data
sig: Similar project cost | retrieval | Reference | Matching
noise: Architect | none
noise: Drawing style | none
noise: Project name | none
base: Cost per square metre by building type, because estimators use it.
prod: Quantity extraction from plans, a cost model with retrieval of similar projects and intervals.
pipe: Plan intake @ project system ; Take-off extractor @ vision model ; Spec parser @ NLP ; Cost model @ boosting ; Similar projects @ retrieval ; Estimator review @ UI ; Archive @ warehouse
edge: Early design | Early design stages have little detail so a point estimate is false precision | Show a wide range and narrow it as the design develops
edge: Material price spike | A sudden spike in a material price such as steel breaks the estimate | Link to material price indices and re-run the estimate when they move
edge: Unusual site | An unusual site with difficult access adds cost not seen in past projects | Flag unusual sites and require an estimator's review
off: Error by stage ; Interval coverage
on: Estimate vs final cost ; Estimator time
gap: Final cost includes changes ; Few similar projects

== project-delay-and-overrun-prediction | Construction Project Delay & Overrun Prediction | tabular,time-series | batch | production-grade | a=1 k=10
obj: Predict schedule and cost overruns on live projects from progress, supply and weather data so managers act early.
loss: \mathcal{L}=\mathrm{Huber}(\hat{d}-d)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Weekly forecasts ; Explainable drivers ; No blame scoring ; Data from project systems
sn: Earned | Earned value vs plan | Percent complete reported | Self-reported progress is optimistic
sn: Critical | Critical-path tasks | All tasks | Delay matters on the path
sn: Supply | Delivery risks | Site only | Late materials
sig: Schedule performance index | SPI | Delay | Reporting
sig: Critical path float | days | Risk | Schedule data
sig: Delivery lateness | days | Supply | Logs
sig: Weather lost days | days | Context | Data
noise: Project name | none
noise: Manager | none
noise: Photo count | none
base: Earned-value indices with thresholds, because project controls use them.
prod: Gradient boosting for delay with critical-path features and a simulation of schedule risk.
pipe: Schedule and cost data @ project system ; Progress capture @ app ; Feature builder @ Spark ; Delay model @ boosting ; Monte Carlo @ schedule risk ; PM dashboard @ BI ; Outcome log @ warehouse
edge: Change orders | Change orders add scope and cost beyond the original plan | Flag projects with frequent change orders and add them to the forecast
edge: Strike | A strike or stoppage halts work for an extended period | Add an event flag and re-simulate the schedule from the stoppage
edge: Late data | Progress data arrives late so forecasts use stale information | Track data freshness and lower the confidence when it is old
off: MAE of delay ; Early-warning recall
on: Overrun days ; Cost overrun
gap: Completed projects only ; Optimistic reports

== construction-site-safety-monitoring | Construction Site Safety Monitoring | computer-vision | seconds | production-grade | a=1 k=500
obj: Detect missing PPE, exclusion-zone entries and unsafe equipment proximity from site cameras and alert supervisors.
loss: \mathcal{L}=\mathcal{L}_{\text{det}}+\lambda\,\mathrm{FL}(\hat{p},y)
con: Alert within 5 s ; Workers not scored individually ; Privacy blur ; Union and legal rules
sn: Hazard | Specific hazards | Presence of people | Presence is normal
sn: Privacy | Aggregate and blur | Identify | Trust
sn: Alert | Few precise alerts | Many | Alert fatigue
sig: PPE detection | helmet, vest | Compliance | Occlusion
sig: Zone entry | polygon | Hazard | Calibration
sig: Equipment proximity | distance | Hazard | Depth
sig: Event persistence | frames | Precision | Latency
noise: Camera brand | none
noise: Worker identity | privacy
noise: Time stamp | none
base: Periodic manual inspections, because they are required.
prod: Detection and tracking with zone logic, persistence rules and supervisor alerts.
pipe: Cameras @ RTSP ; Edge detector @ GPU ; Tracker @ model ; Rules @ zones ; Alert @ push ; Supervisor app @ mobile ; Review log @ store
edge: Night | Low light at night makes detection unreliable | Use infrared cameras or restrict automated alerts to well-lit areas
edge: Dust | Dust and dirt on lenses hide people and equipment | Schedule lens cleaning and detect low-visibility frames
edge: New PPE colours | New PPE colours or styles are not recognised and workers are flagged wrongly | Retrain on new PPE and add a feedback path for false alerts
off: Recall of hazards ; Precision
on: Incidents ; Near misses
gap: Staged footage ; Site differences

== progress-monitoring-from-drone-imagery | Progress Monitoring from Drone Imagery | computer-vision | batch | production-grade | a=0.1 k=5000
obj: Compare drone captures to the BIM or schedule to estimate progress by element and flag deviations.
loss: \mathcal{L}=\mathcal{L}_{\text{seg}}+\lambda\,\mathrm{Huber}(\hat{p}-p)
con: Capture weekly ; Accuracy by element ; Privacy ; Tolerance
sn: Alignment | Registered to BIM | Raw images | Misalignment
sn: Element | Element-level status | Percent complete | Completeness
sn: Tolerance | Deviation limits | Visual | Rework
sig: Point cloud registration | error | Alignment | Drift
sig: Element completion | class | Progress | Occlusion
sig: Deviation | mm | Quality | Noise
sig: Schedule variance | days | Delay | Plan
noise: Lighting | varies
noise: Weather | varies
noise: Cloud | none
base: Site walks and manual reports, because they are standard.
prod: Photogrammetry, registration to BIM, element classification and a progress dashboard.
pipe: Drone capture @ flights ; Photogrammetry @ pipeline ; Registration @ ICP ; Element model @ vision ; Progress @ rules ; PM dashboard @ BI ; Archive @ store
edge: Occlusion | Interior work or covered areas cannot be seen from the drone | Combine with interior capture or site reports for hidden work
edge: Design change | A design change makes the BIM out of date so deviations are false | Version the BIM and compare against the correct version
edge: Weather | Weather prevents flights on the planned date | Reschedule and fall back to the last good capture with a staleness flag
off: Element accuracy ; Registration error
on: Report time ; Rework found
gap: One site ; Controlled flights

== permit-and-zoning-compliance-checking | Permit & Zoning Compliance Checking | nlp,llm-agents | seconds | production-grade | a=0.1 k=300
obj: Check building plans and applications against zoning and code rules and give applicants and officers cited findings.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Official code text ; Officer decides ; Cited findings ; Versioned rules
sn: Rules | Rules as structured checks | Free summaries | Auditable
sn: Version | Code in force at date | Latest | Applicable
sn: Judgement | Officer decides | Automated | Authority
sig: Rule check accuracy | pass | Core | Rules
sig: Citation validity | supported | Trust | Check
sig: Measurement extraction | dims | Input | Plans
sig: Exception flag | variance | Process | Judgement
noise: Applicant name | none
noise: Format | none
noise: Length | none
base: Officers check manually against checklists, because it is the norm.
prod: Structured code rules, plan measurement extraction and an LLM for narrative requirements with cited findings.
pipe: Application intake @ portal ; Plan reader @ vision and OCR ; Rule engine @ rules ; Narrative checker @ LLM ; Findings drafter @ LLM ; Officer review @ workflow ; Record @ system
edge: Ambiguous code | The code text is ambiguous and can be read two ways | Escalate ambiguous clauses to the officer with both readings
edge: Amendments | Amendments change the code after the application is filed | Version the rule set and check against the version in force at submission
edge: Non-standard plan | A non-standard plan format cannot be read automatically | Route to manual review and add the format to the training set
off: Rule accuracy ; Finding precision
on: Review time ; Rework cycles
gap: Easy applications ; Code updates

== building-material-demand-and-procurement-forecast | Building Material Demand & Procurement Forecast | time-series,tabular | batch | production-grade | a=1 k=3
obj: Forecast material needs by project phase and plan purchases to avoid delays and excess stock.
loss: \mathcal{L}=\sum_t\mathrm{Pinball}(\hat{q}_{0.9},y_t)+\lambda\,\mathrm{Huber}(\hat{c}-c)
con: Lead times ; Price volatility ; Storage ; Weekly plan
sn: Phase | Demand by phase | Average | Demand is lumpy
sn: Lead | Lead-time risk | Order | Late materials stop work
sn: Price | Price volatility | Fixed | Costs move
sig: Schedule phase | tasks | Demand | Plan
sig: Supplier lead time | days | Risk | Data
sig: Price index | index | Cost | Source
sig: Waste factor | percent | Quantity | Site
noise: Project name | none
noise: Supplier name | none
noise: Order number | none
base: Bill of quantities with a buffer, because it is typical.
prod: Phase-aware quantile demand forecast with lead-time risk and a procurement optimiser.
pipe: Schedule and BoQ @ project system ; Demand model @ boosting ; Lead-time model @ regression ; Price feed @ indices ; Procurement optimiser @ solver ; Buyer view @ app ; Outcome log @ warehouse
edge: Design change | A design change alters the quantities after the plan is made | Re-run the take-off when the design changes and update the order
edge: Shortage | A material shortage in the supply chain delays the order | Identify approved substitutes and update the plan
edge: Delay | A schedule delay shifts when materials are needed | Re-forecast demand from the revised schedule and move orders
off: Quantity error ; Stock-out rate
on: Delays from materials ; Excess stock
gap: Plans vs as-built ; Price shocks

== contractor-bid-evaluation | Contractor Bid Evaluation | tabular,nlp | seconds | production-grade | a=0.02 k=100
obj: Compare contractor bids on price, scope coverage, risk and track record to recommend a shortlist.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{c}-c)
con: Procurement rules ; Transparency ; Human decision ; Audit
sn: Scope | Scope coverage | Lowest price | Low bids omit scope
sn: Track | Delivery record | Price | Cheap bidders fail
sn: Risk | Risk-adjusted cost | Bid price | Overruns
sig: Scope gap | missing items | Risk | Parsing
sig: Past overrun rate | history | Reliability | Data
sig: Bid outlier | z-score | Risk | Few bids
sig: Capacity | current load | Delivery | Data
noise: Company name | none
noise: Bid format | none
noise: Brochure | none
base: Lowest compliant bid, because rules often require it.
prod: Scope-gap analysis from bid text, a risk-adjusted cost model and a transparent comparison for the committee.
pipe: Bid intake @ procurement system ; Parser @ NLP ; Scope checker @ rules ; Risk model @ boosting ; Comparison @ BI ; Committee @ workflow ; Record @ system
edge: Abnormally low bid | An abnormally low bid omits part of the scope | Query the bidder on omitted items and compare scope coverage before price
edge: Single bidder | Only one bidder responds so there is nothing to compare | Benchmark against past similar projects and the estimate
edge: Late bids | Bids arrive late and procurement rules say what to do | Apply the procurement policy and record the decision
off: Overrun prediction ; Scope gap recall
on: Overruns ; Dispute rate
gap: Past winners only ; Few failures

== hvac-energy-optimisation | HVAC Energy Optimisation | reinforcement-learning,time-series | seconds | staff-principal | a=288 k=1
obj: Control heating and cooling setpoints to cut energy use while keeping comfort within limits.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t\left(-\text{energy}_t-\lambda\,\text{discomfort}_t\right)\right]
con: Comfort bounds ; Safety interlocks ; Fallback to the BMS schedule ; Gradual rollout
sn: Comfort | Comfort constraint | Energy only | Complaints
sn: Model | Thermal model | Rules | Buildings differ
sn: Safety | Hard limits | Learned | Safety
sig: Zone temperature | sensors | State | Noise
sig: Weather forecast | forecast | Input | Error
sig: Occupancy forecast | people | Load | Data
sig: Energy price | tariff | Cost | Tariffs
noise: Building name | none
noise: Valve ID | none
noise: Sensor brand | none
base: Fixed schedules with setpoints, because buildings use them.
prod: Model-predictive control with a learned thermal model and a safe RL layer inside bounds.
pipe: Sensors @ BMS ; State estimator @ model ; Thermal model @ learned ; Controller @ MPC ; Safety layer @ rules ; BMS write @ BACnet ; Energy log @ lakehouse
edge: Sensor fault | A faulty sensor sends wrong data and the controller reacts to it | Detect the fault and fall back to the schedule for that zone
edge: Heatwave | Extreme heat pushes the plant beyond its design capacity | Respect equipment limits and keep comfort limits relaxed in a defined way
edge: Occupancy surge | A sudden surge in occupancy from an event overloads the zone | Take occupancy feeds from the booking system and allow an override
off: Energy saved in simulation ; Comfort violations
on: kWh ; Complaints
gap: Simulator mismatch ; Mild test season

== building-energy-benchmarking-and-retrofit-targeting | Building Energy Benchmarking & Retrofit Targeting | tabular | batch | production-grade | a=0.1 k=10
obj: Benchmark building energy use against peers and rank buildings for retrofit by savings and payback.
loss: \mathcal{L}=\mathrm{Huber}(\hat{y}-y)+\lambda\,\mathrm{MSE}(\hat{s},s)
con: Normalised for weather ; Peer groups fair ; Audit-ready ; Annual
sn: Normalise | Weather and use normalisation | Raw kWh | Climate
sn: Peers | Peer groups | National | Fair
sn: Savings | Savings potential | Level | Payback
sig: Normalised EUI | kWh per m2 | Core | Area
sig: Peer percentile | rank | Context | Peers
sig: Envelope age | year | Drivers | Data
sig: System type | HVAC | Driver | Data
noise: Building name | none
noise: Owner | none
noise: Photo | none
base: Rank by energy per square metre, because it is easy.
prod: Weather-normalised models of expected use, savings estimators and a payback ranking.
pipe: Meter data @ utilities ; Weather @ feeds ; Expected-use model @ boosting ; Peer benchmark @ stats ; Savings model @ regression ; Retrofit ranker @ rules ; Report @ BI
edge: Missing meters | Missing meters leave gaps in the energy record | Impute carefully from sub-meters or similar buildings and flag them
edge: Mixed use | Tenants in a mixed-use building share meters so use cannot be allocated | Use allocation rules or sub-metering and benchmark by space type
edge: Occupancy change | A change in occupancy shifts energy use and is mistaken for a performance change | Adjust expected use for occupancy and record the change
off: Expected-use error ; Savings error
on: Retrofits delivered ; Energy saved
gap: Retrofitted buildings differ ; Weather

== indoor-air-quality-and-comfort-anomaly-detection | Indoor Air Quality & Comfort Anomaly Detection | time-series | seconds | foundational | a=288 k=1
obj: Detect abnormal CO2, humidity, temperature and particulate readings so facilities fix ventilation and comfort issues.
loss: \mathcal{L}=\sum_t\mathrm{MSE}(\hat{x}_t,x_t)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Alerts tuned to occupancy ; Sensor health ; Privacy ; Standards limits
sn: Context | Occupancy-aware baselines | Fixed thresholds | Meetings raise CO2 normally
sn: Sensor | Sensor faults separated | Treat as events | Faults mislead
sn: Action | Actionable alerts | Raw alarms | Fatigue
sig: CO2 vs occupancy | residual | Ventilation | Sensors
sig: Humidity drift | trend | Mould | Season
sig: Particulate spike | PM2.5 | Event | Outdoor
sig: Temperature gradient | zones | Comfort | Placement
noise: Room name | none
noise: Sensor ID | none
noise: Floor | none
base: Fixed limit alarms, because standards define them.
prod: Occupancy-conditioned anomaly detection with sensor health checks and a work-order link.
pipe: Sensors @ IoT ; Cleaner @ stream ; Baseline model @ time-series ; Anomaly scorer @ model ; Sensor health @ rules ; Work order @ CMMS ; Dashboard @ BI
edge: Sensor drift | Sensor drift makes readings wrong over time | Calibrate sensors on a schedule and flag drifting devices
edge: Events | A crowd in a room raises CO2 for a short time | Use occupancy to put the reading in context before raising an alert
edge: Outdoor smoke | Smoke outside raises indoor particulates | Use outdoor air data to separate outdoor events from indoor sources
off: Event recall ; False alarms
on: Complaints ; Alerts acted on
gap: Few labelled events ; Clean data

== flood-and-climate-risk-scoring-for-properties | Flood & Climate Risk Scoring for Properties | tabular,computer-vision | seconds | staff-principal | a=0.1 k=100
obj: Score each property's exposure to flood, wildfire, heat and wind under current and future climate for buyers, lenders and insurers.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Brier}(\hat{p},y)
con: Methodology published ; Scenario labelled ; Uncertainty shown ; Updated yearly
sn: Elevation | Property-level elevation and drainage | Flood zone only | Zones are coarse
sn: Scenario | Climate scenario and horizon | Single | Futures differ
sn: Vulnerability | Building vulnerability | Hazard only | Loss depends on structure
sig: Elevation above river | height | Flood | LiDAR
sig: Distance to water | distance | Flood | Maps
sig: Vegetation fuel | fuel load | Wildfire | Imagery
sig: Historic claims density | claims | Support | Privacy
noise: Owner | none
noise: Address string | none
noise: Photo | none
base: Official flood zone maps, because lenders require them.
prod: Hazard models combined with property vulnerability, calibrated to claims, with scenario scores and intervals.
pipe: Hazard layers @ models ; Property features @ geospatial ; Vulnerability model @ boosting ; Calibrator @ isotonic ; Score API @ service ; Report @ PDF ; Archive @ lakehouse
edge: New defences | New flood defences change the risk but the hazard maps lag | Update the hazard layers when defences are completed and mark the date
edge: Basement | A basement or below-grade space has far higher flood vulnerability | Add the basement feature and increase vulnerability for it
edge: Model update | A hazard model update changes scores for many properties at once | Version the model and explain the change in scores to users
off: Brier score ; Claims calibration
on: Loss ratio ; Disputes
gap: Claims in few events ; Scenario uncertainty

== title-and-deed-fraud-detection | Title & Deed Fraud Detection | graph,nlp | seconds | production-grade | a=0.1 k=50
obj: Detect forged deeds, owner impersonation and suspicious transfers before closing or recording.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{GraphReg}(z)
con: Investigator reviews ; Evidence shown ; Low false positives ; Recording deadlines
sn: Pattern | Behavioural patterns of fraud | Rules | Fraudsters adapt
sn: Identity | Owner verification | Document only | Impersonation
sn: Network | Notary and agent networks | Single deal | Rings
sig: Ownership change speed | days | Fraud | Data
sig: Notary frequency | count | Ring | Data
sig: Vacant or no-mortgage property | flag | Target | Data
sig: Signature similarity | score | Forgery | Quality
noise: Parcel number | none
noise: Document format | none
noise: Seller name | none
base: Manual title search and checklists, because they are standard.
prod: Graph and tabular models on transfer patterns, document checks and an investigator queue.
pipe: Recording data @ registry ; Entity graph @ graph store ; Feature builder @ Spark ; Fraud model @ boosting plus GNN ; Document checks @ vision ; Investigator queue @ case tool ; Outcome log @ warehouse
edge: Elderly owners | Elderly owners are targeted by fraudsters and are often victims | Give protective alerts to owners flagged at higher risk and add review before recording
edge: Estate sales | Estate sales look unusual but are legitimate | Add context about estates and avoid blocking on this alone
edge: Cross-county | Fraud is spread across counties so no single registry sees the pattern | Link records across counties and share indicators
off: PR-AUC ; Recall
on: Fraud prevented ; Delays
gap: Few labelled cases ; Hidden fraud

== roof-condition-from-aerial-imagery | Roof Condition from Aerial Imagery | computer-vision | batch | production-grade | a=0.05 k=4000
obj: Classify roof material, age and damage from aerial imagery for underwriting, maintenance and valuation.
loss: \mathcal{L}=\mathcal{L}_{\text{seg}}+\lambda\,\mathrm{Ordinal}(\hat{q},q)
con: Date of imagery shown ; Property-level results ; Human review of adverse decisions ; Licence
sn: Material | Roof material | Colour | Colour misleads
sn: Condition | Condition grade | Binary | Grades matter
sn: Date | Imagery age | Latest | Stale images
sig: Roof segmentation | mask | Area | Shadows
sig: Material class | class | Risk | Rare
sig: Damage score | score | Condition | Resolution
sig: Image age | months | Currency | Meta
noise: Image tile | none
noise: Sensor | none
noise: Cloud | none
base: Inspector visits, because they are accurate and costly.
prod: Segmentation and classification with condition scoring and imagery age rules.
pipe: Imagery @ providers ; Footprint match @ geospatial ; Roof model @ vision ; Condition scorer @ model ; Rules @ policy ; Underwriter view @ app ; Archive @ lakehouse
edge: Tree cover | Tree cover hides part of the roof so condition cannot be graded | Flag the occlusion and request another image or an inspection
edge: Recent repair | A recent repair is not in a stale image | Show the image date and prefer fresher imagery for adverse decisions
edge: Solar panels | Solar panels are mistaken for roof damage or a different material | Add a solar-panel class and mask it in condition scoring
off: Condition accuracy ; Material F1
on: Inspection avoided ; Loss ratio
gap: Imagery date mismatch ; Rare materials

== closing-process-delay-prediction | Closing Process Delay Prediction | tabular | batch | foundational | a=1 k=5
obj: Predict which home purchases will miss their closing date and why, so agents and lenders chase the right items.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Daily scores ; Reasons shown ; Worklist ; Privacy
sn: Cause | Cause of delay | Delay only | Actions differ
sn: Stage | Process stage | Calendar | Stage drives risk
sn: Action | Actionable items | Score | Items to chase
sig: Outstanding conditions | count | Delay | Data
sig: Appraisal status | state | Risk | Data
sig: Lender responsiveness | days | Delay | Data
sig: Days to close | days | Timing | Date
noise: Buyer name | none
noise: Property photo | none
noise: Agent | none
base: Checklists with due dates, because coordinators use them.
prod: Gradient boosting on stage features with reason codes and a coordinator worklist.
pipe: Transaction data @ platform ; Feature builder @ Spark ; Delay model @ boosting ; Reasons @ SHAP ; Worklist @ CRM ; Outcome log @ warehouse ; Monitor @ dashboard
edge: Rate lock expiry | A rate lock expires before closing and adds cost | Flag locks that expire before the closing date and prompt the lender
edge: Appraisal gap | The appraisal comes in below the contract price | Flag early signs of an appraisal gap and prepare the buyer and agent
edge: Chain sales | A purchase depends on another sale that is delayed | Link chain transactions and propagate the delay risk
off: PR-AUC ; Calibration
on: On-time closings ; Coordinator time
gap: Outcomes after action ; Seasonality

== rental-listing-scam-detection | Rental Listing Scam Detection | nlp,computer-vision,graph | sub-100ms | production-grade | a=2 k=60
obj: Detect fake rental listings and advance-fee scams at posting time using text, images, price and account behaviour.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Decision under 80 ms ; Low false blocks ; Appeal path ; Privacy
sn: Behaviour | Account and posting behaviour | Text only | Scammers reuse photos not words
sn: Price | Price versus market | Absolute | Too-good-to-be-true
sn: Network | Linked accounts | Single listing | Rings
sig: Image reuse | hash | Scam | Index
sig: Price vs market | ratio | Lure | Market
sig: Account age and velocity | listings | Behaviour | Data
sig: Contact pattern | off-platform | Scam | Text
noise: Title style | none
noise: Photo count | none
noise: Time posted | weak
base: Rules on price and keywords, because portals start there.
prod: Real-time scoring with image-reuse search, price models and account graph features and a review queue.
pipe: Posting API @ portal ; Feature service @ Redis ; Image reuse search @ vector index ; Scam model @ boosting ; Policy @ rules ; Moderation queue @ tool ; Outcome log @ Kafka
edge: Legit low price | A genuinely low price under rent control looks like a scam | Add the rent-control context so legitimate low rents are not blocked
edge: Reposted listing | A legitimate agent reposts the same listing and images | Link reposts to the same account and allow them within limits
edge: New scam pattern | A new scam pattern appears that the model has not seen | Monitor drift, retrain on new reports and add rules for urgent patterns
off: PR-AUC at fixed FPR ; Recall
on: Scam exposure ; False blocks
gap: Reported scams only ; Adversarial drift

== property-tax-assessment-anomaly-detection | Property Tax Assessment Anomaly Detection | tabular | batch | production-grade | a=1 k=5
obj: Find properties whose assessed value is far from their expected market value so assessors fix inequity and appeal risk.
loss: \mathcal{L}=\mathrm{Huber}(\log\hat{y}-\log y)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.9},y)
con: Equity across areas ; Explainable ; Appeal process ; Annual cycle
sn: Ratio | Assessment-to-sale ratio | Assessment | Ratios show equity
sn: Fairness | Equal treatment | Average | Regressivity
sn: Change | Updated attributes | Static | Records go stale
sig: Assessment ratio | ratio | Equity | Sales
sig: Neighbourhood ratio | median | Context | Sales
sig: Unrecorded changes | permits | Update | Data
sig: Sale price gap | gap | Anomaly | Data
noise: Owner | none
noise: Parcel ID | none
noise: Appeal count | weak
base: Periodic reassessment by area factors, because it is common.
prod: AVM-based expected value with anomaly scoring and a review list for assessors.
pipe: Assessment roll @ county ; Sales @ registry ; AVM @ boosting ; Anomaly scorer @ model ; Review list @ rules ; Assessor tool @ UI ; Outcome log @ warehouse
edge: Few sales | Few sales in an area leave the expected value uncertain | Use wider intervals or pool nearby areas
edge: New build | A new build has no sale history | Use priors from comparable new builds and build costs
edge: Exemptions | Exemptions and special assessments make values differ legitimately | Apply the exemption rules before scoring anomalies
off: COD and PRD ; Anomaly precision
on: Appeal rate ; Equity measures
gap: Sales selection ; Stale attributes
