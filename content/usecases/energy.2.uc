# Energy & Utilities, part 2 (use cases 22-50): customer and retail energy, metering and network losses, renewables storage and EV, field vegetation and wildfire, regulation and agent governance
# Vendor-neutral. Models advise above the protection and control layer, customer consumption data is minimised, no automated disconnection or penalty decisions are made and a named person approves any customer-affecting or network-affecting action.
== bill-shock-prediction | Bill Shock Prediction | tabular,time-series | batch | foundational | a=0.5 k=6
obj: Predict which customers are heading for an unusually high bill before it arrives so the utility can explain the cause and offer help early.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}
con: Prediction at least 10 days before bill issue ; Reason code with every flag ; Outreach is an offer of help never a penalty ; Aggregated consumption features only ; 5M accounts
sn: Label | Bills that exceed the customer's usual range and trigger complaints or arrears | Any bill rise | Seasonal rises are expected
sn: Cause | Weather, tariff, estimate or fault | A score only | Customers need the reason
sn: Action | A proactive message with advice | An automatic fee or disconnection | Support not sanction is the goal
sig: Consumption against the same month last year | change in usage for the same period | Core signal | Weather adjusted
sig: Tariff or price change | a change in unit price or plan | Explains a rise | From billing
sig: Estimated read flag | share of readings that are estimated | Catch-up risk | From the meter system
sig: Weather degree days | heating and cooling demand | Seasonal driver | From weather data
noise: Customer name | irrelevant and private
noise: Account number | an identifier
noise: Postcode text alone | weak link
base: A rule flagging bills more than 50% above the last bill, because customer teams use similar rules.
prod: A calibrated model on weather-adjusted consumption changes with a reason code and a proactive message workflow reviewed by customer operations.
pipe: Consumption and billing extraction @ MDM and CIS ; Weather adjustment @ degree day model ; Bill shock model @ gradient boosting ; Reason code @ rules ; Outreach list @ CRM ; Customer message @ templated channel ; Outcome tracking @ monthly
edge: Estimated reads | a catch-up read arrives late | Estimated flags and an early notice
edge: Meter fault | readings are wrong | Meter checks before the outreach
edge: New tenant | there is no history | Use similar properties and a wide band
off: Calibration of bill shock probability ; Reason code accuracy ; Lead time before billing
on: Bill complaints ; Arrears after high bills ; Contact centre calls
gap: Flagging seasonal rises ; Penalising flagged customers ; Scores with no reason

== billing-inquiry-copilot | Billing Inquiry Copilot | llm-agents,nlp | seconds | advanced | a=0.02 k=60
obj: Help contact centre agents explain bills, tariffs and adjustments by retrieving the customer's own billing facts and the controlled policy, with every figure computed by tools.
con: Answers use the customer's verified account and controlled policy text ; Figures computed by tools ; The copilot cannot change an account ; Agent confirms before any promise to the customer ; Response within 4 s
sn: Facts | Billing data retrieved by tools after identity verification | Model memory | Wrong amounts cause complaints and compensation
sn: Policy | Controlled policy and regulator rules | General knowledge | Rules differ by region and change
sn: Authority | Agents decide and act | The copilot acting alone | Credits and plans need accountable people
sig: Identity verification state | whether the customer is verified | Access gate | From the contact system
sig: Bill line items | charges, credits and estimates | Evidence | From billing
sig: Tariff and policy version | the rule version that applies | Correct answer | From the policy store
sig: Inquiry type | high bill, estimate, payment or move | Routing | Classified
noise: Agent name | irrelevant
noise: Call length | not correctness
noise: Chat tone | not facts
base: Agents searching the billing screens and policy wiki by hand, because it is how the work is done today.
prod: A retrieval and calculation assistant that drafts explanations with citations to bill lines and policy sections, with a review step and a log for quality teams.
pipe: Inquiry intake @ contact centre tool ; Identity check @ authentication ; Billing retrieval @ governed APIs ; Policy retrieval @ knowledge index ; Explanation draft @ LLM with citations ; Agent review @ agent desktop ; Quality sampling @ weekly
edge: Unverified caller | identity is not confirmed | Block account data and offer the verification path
edge: Policy change | the rule changed last week | Version checks and a recent change notice
edge: Complex adjustment | the case needs a specialist | Hand-off with a summary
off: Figure accuracy on audited cases ; Citation coverage ; Policy faithfulness
on: Handle time ; First-contact resolution ; Billing complaints escalated
gap: Model-computed amounts ; Account changes by the copilot ; Answers with no policy version

== demand-response-targeting | Demand Response Targeting | tabular | batch | advanced | a=0.5 k=6
obj: Choose which participating customers and sites to call during a peak event by estimated reduction per customer, so events deliver the needed load drop with the least inconvenience.
con: Only customers who opted in ; Fatigue limits on events per customer ; Reduction measured against a baseline ; Event plan within 10 minutes ; 1M enrolled customers
sn: Effect | Estimated load reduction compared with a counterfactual baseline | Total consumption | High users do not always shift load
sn: Consent | Opt-in customers and their stated limits | Any customer | Unwanted events harm trust
sn: Fairness | Rotation and fatigue limits | The same customers every time | Repeated calls drive opt-outs
sig: Past event response | measured reduction in earlier events | Core signal | Baseline adjusted
sig: Load shape and flexible load | share of load that is shiftable | Potential | From interval data
sig: Weather and event timing | temperature and event hour | Context | From forecasts
sig: Fatigue count | events in the last weeks | Constraint | From programme records
noise: Customer name | irrelevant and private
noise: Marketing segment alone | weak link
noise: Device brand | an artefact
base: Calling all enrolled customers in the stressed area, because it is the simple programme design.
prod: An uplift model of expected reduction per customer with fatigue constraints and an event planner that selects the cheapest set to meet the target with a margin.
pipe: Enrolment and interval data @ MDM and programme system ; Baseline model @ regression ; Reduction model @ uplift model ; Event planner @ constrained optimiser ; Notification @ customer channel ; Reduction measurement @ settlement ; Learning loop @ after event
edge: Baseline error | the measured reduction is overstated | Control groups and conservative baselines
edge: Heatwave overlap | weather shifts both load and response | Weather-adjusted baselines
edge: Opt-out wave | customers leave after events | Fatigue limits and feedback surveys
off: Reduction forecast error ; Target hit rate ; Baseline bias on held-out events
on: Delivered reduction ; Event cost ; Opt-out rate
gap: Using total consumption as the target ; Repeating the same customers ; Naive baselines

== retail-energy-churn-prediction | Retail Energy Churn Prediction | tabular,time-series | batch | foundational | a=0.5 k=5
obj: Predict which retail energy customers are likely to switch supplier in the coming months so the retention team can offer a fair, relevant plan.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Churn probability for the next 90 days ; Calibrated scores for offer budgets ; Offers only to customers who have not been disadvantaged ; No sensitive or vulnerability data as features ; 4M accounts
sn: Label | Customers who left after the contract ended or switched mid-term | Calls to cancel | Many callers stay
sn: Fairness | Equal access to the best plans | Better prices only for those about to leave | Loyal customers should not pay more
sn: Timing | Features known before the switch decision | Data from after the switch | Leakage inflates results
sig: Price gap to the best market offer | difference between current and best available price | Switch motive | From market data
sig: Contract end date | days until the fixed term ends | Timing | From contracts
sig: Contact and complaint history | recent complaints and contacts | Dissatisfaction | From CRM
sig: Bill shock events | recent unusually high bills | Trigger | From billing
noise: Customer name | irrelevant and private
noise: Marketing channel alone | weak link
noise: Postcode text | an identifier
base: Contact customers whose fixed term ends in the next 60 days, because it is the standard retention rule.
prod: A calibrated churn model with price-gap and event features, an offer policy limited by fairness rules and uplift testing to confirm that offers change behaviour.
pipe: Customer and market data @ CRM and price feeds ; Feature build @ time-aware joins ; Churn model @ gradient boosting ; Offer policy @ rules ; Uplift testing @ randomised holdouts ; Campaign execution @ marketing system ; Outcome tracking @ monthly
edge: Market price drop | many customers become at risk at once | Price-gap features and campaign capacity limits
edge: Regulatory rule | an offer is not allowed for some groups | Rule checks before the campaign
edge: Leakage | features include post-switch data | Time-travel checks in the pipeline
off: Calibration ; Uplift of retention offers ; Lift at the campaign size
on: Retention rate ; Offer cost per saved customer ; Complaints about offers
gap: Targeting loyal customers with worse prices ; Leakage from post-switch data ; Scores without uplift tests

== tariff-recommendation | Tariff Recommendation | tabular | batch | foundational | a=0.2 k=4
obj: Recommend the tariff that would have cost each customer the least on their own usage, and tell them how confident the saving is, so plans fit how people actually use energy.
con: Recommendation based on the customer's own usage and consent ; Savings shown with a range ; The cheapest plan is shown even when it is not the utility's most profitable ; Regulator rules followed ; 3M accounts
sn: Basis | The customer's actual usage replayed under each tariff | An average household | Usage shapes differ widely
sn: Honesty | The cheapest plan with the range of savings | The highest margin plan | Misleading advice breaks regulation and trust
sn: Risk | Sensitivity to future usage changes | One estimate | A plan that wins only on past use may lose next year
sig: Replayed annual cost | cost of past usage under each tariff | Core signal | From interval data
sig: Usage shape stability | how much the pattern varies by year | Reliability | From history
sig: Planned changes | solar, EV or heat pump plans | Future shape | From the customer
sig: Tariff eligibility | which plans the customer can take | Feasibility | From rules
noise: Customer name | irrelevant and private
noise: Marketing segment | weak link
noise: Home size alone | weak link
base: A tariff comparison from a typical household profile, because it is the common web calculator.
prod: A tariff replay engine on the customer's own intervals with sensitivity ranges, eligibility checks and a clear explanation of the trade-offs.
pipe: Usage and eligibility lookup @ MDM and CIS ; Tariff replay @ rating engine ; Sensitivity range @ scenarios ; Eligibility and rules check @ rules ; Recommendation text @ templated explanation ; Customer or agent view @ portal ; Outcome tracking @ annual
edge: Short history | less than a year of data | Wide ranges and a low confidence note
edge: New tariff | no rating history | Rate-card rating with a flag
edge: Behaviour change | usage shifts after the switch | Re-check after six months
off: Savings forecast error ; Range coverage ; Rule compliance on audits
on: Customer savings realised ; Complaints about advice ; Plan switch satisfaction
gap: Typical household assumptions ; Margin-led recommendations ; Single-point savings

== payment-difficulty-early-support | Payment Difficulty Early Support | tabular,time-series | batch | advanced | a=0.5 k=5
obj: Identify customers who may soon struggle to pay so the utility can offer payment plans, advice and support early, never as a basis for automatic collection or disconnection.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}
con: Outputs trigger support offers only ; No automated disconnection or fee decision ; Human review for every outreach list ; Audited for fairness across groups ; 3M accounts
sn: Purpose | Early help and payment plans | Collections pressure | Support reduces harm and debt
sn: Label | Customers who later missed payments or sought help | Disconnection events | Disconnection reflects policy not need
sn: Fairness | Equal quality of help across groups | Higher scores for already vulnerable groups used for penalties | A score used punitively causes harm
sig: Payment pattern change | shift in payment timing and amounts | Core signal | From billing
sig: Bill size relative to usual | unusual bill increases | Trigger | From billing
sig: Contact history | calls about payments | Need | From CRM
sig: Seasonal pressure | winter or summer bill peaks | Context | From calendar and billing
noise: Customer name | irrelevant and private
noise: Postcode text | a proxy for protected groups
noise: Age alone | irrelevant and risky
base: Reminders sent after a bill is overdue, because it is the standard process.
prod: A calibrated model that prioritises support outreach, a rules layer that blocks any use for collection decisions and a fairness audit across customer groups.
pipe: Billing and payment extraction @ CIS ; Feature build @ time-aware joins ; Support need model @ gradient boosting ; Policy gate @ rules ; Outreach list @ reviewed queue ; Support offer @ customer care ; Fairness and outcome audit @ quarterly
edge: Policy drift | someone wants to use scores for collections | Technical block and governance sign-off
edge: Data gaps | payments arrive through third parties | Source flags and wide bands
edge: Offer fatigue | customers ignore messages | Channel testing and human outreach
off: Calibration ; Recall of customers who later need help ; Fairness gaps in offer rates
on: Early payment plans taken up ; Arrears ; Disconnections avoided
gap: Using scores for disconnection ; Overdue-only reminders ; Postcode proxies

== outage-communication-agent | Outage Communication Agent | llm-agents,nlp | seconds | advanced | a=0.1 k=40
obj: Answer customer questions about outages and estimated restoration times from the outage system and keep status pages and messages current, without promising times the operator has not confirmed.
con: Estimates come from the outage management system and are labelled as estimates ; The agent cannot create or alter outage records ; Vulnerable customer flags trigger a human callback ; Replies within 3 s ; Handles 500K contacts during a storm
sn: Source | The outage management system | Model guesses | A wrong time breaks trust and affects safety
sn: Honesty | Estimates labelled with a confidence range | A single promise | Restoration times change
sn: Priority | Customers who rely on powered medical equipment get a human | Equal treatment | Some outages are urgent
sig: Outage record status | cause, crew status and estimate | Answer content | From the OMS
sig: Customer location match | whether the address is in the affected area | Relevance | From GIS
sig: Estimate confidence | how reliable the estimate is | Wording | From the OMS
sig: Priority flag | registered priority customers | Routing | From the register
noise: Customer name | irrelevant and private
noise: Message length | not importance
noise: Social post tone | not facts
base: A static outage map and an interactive voice menu, because they are the current channels.
prod: A retrieval-grounded assistant with live outage data that answers, subscribes customers to updates and escalates priority cases, with templates for all promises about time.
pipe: Contact intake @ chat and phone ; Address resolution @ GIS ; Outage lookup @ OMS API ; Answer draft @ LLM with templates ; Priority routing @ rules ; Update subscription @ messaging ; Quality review @ post-event
edge: Estimate change | the restoration time moves | Proactive updates and no old promises
edge: Unknown address | the address does not match | Ask for confirmation and offer the report path
edge: Safety report | a customer reports a downed line | Immediate emergency instructions and a human handoff
off: Answer accuracy against the OMS ; Escalation recall ; Estimate wording faithfulness
on: Calls during storms ; Repeat contacts ; Customer satisfaction after outages
gap: Model-made restoration times ; Writing to outage records ; No priority routing

== smart-meter-data-validation-estimation | Smart Meter Data Validation and Estimation | time-series | batch | foundational | a=96 k=1
obj: Validate interval meter reads, detect gaps and spikes, and estimate missing values with flags so billing and analytics use trustworthy data.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Every estimate is flagged and traceable ; Estimates follow the regulatory rules ; Validation within one day of read ; Never overwrites raw reads ; 10M meters
sn: Raw data | Preserved with validation flags | Overwritten values | Disputes need the original reads
sn: Estimate | A method by gap length and type | One method for all gaps | A long gap needs a different method from a short gap
sn: Privacy | Aggregated checks where possible | Household behaviour inferences | Meter data reveals daily routines
sig: Gap length and pattern | missing intervals and their length | Method choice | From the reads
sig: Neighbour and cohort load shape | load of similar meters | Estimate basis | Aggregated
sig: Spike and zero checks | extreme values and long zeros | Quality flags | Rules and model
sig: Meter and head-end status | device events and communication state | Cause | From the head-end
noise: Customer name | irrelevant and private
noise: Meter serial | an identifier
noise: File name | an artefact
base: Linear interpolation for short gaps and profile-based estimates for long gaps, because they are standard rules.
prod: A rule and model hybrid that applies regulatory validation rules, estimates by gap type using cohort profiles and attaches flags and method codes to each value.
pipe: Read intake @ head-end system ; Rule validation @ validation engine ; Gap classification @ rules ; Estimation @ cohort model ; Flagging and storage @ MDM ; Exception queue @ analyst tool ; Quality reporting @ monthly
edge: Daylight saving shift | intervals duplicate or vanish | Time handling tests and flags
edge: Meter swap | the register resets | Swap event handling
edge: Long outage | the gap is a real outage | Outage records prevent false estimates
off: Estimation error on masked values ; Flag precision ; Share of valid reads
on: Estimated bill share ; Billing disputes ; Manual validation effort
gap: Overwriting raw reads ; One method for all gaps ; Ignoring real outages

== non-technical-loss-detection | Non-Technical Loss Detection | tabular,time-series | batch | advanced | a=0.3 k=6
obj: Find feeders and transformers with unexplained energy losses and rank them for field inspection so theft and metering faults are found at areas, not by profiling individuals.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Analysis at transformer and feeder level first ; Inspectors verify on site before any action ; No customer is penalised on a score alone ; Audit of inspection outcomes across areas ; 2M transformers
sn: Label | Verified findings from inspections | Customer complaints | Complaints do not show losses
sn: Unit | Transformer or feeder balance | Individual customer scores | Individual scores risk wrongful accusation
sn: Action | A ranked inspection route | A fine | A verified finding by a person must come first
sig: Energy balance gap | difference between supply and metered consumption | Core signal | By transformer
sig: Meter anomaly counts | tamper and communication events | Supporting signal | From head-end
sig: Technical loss estimate | modelled network losses | Adjustment | From the power flow
sig: Past inspection yield | share of inspections that found a problem | Prior | From inspections
noise: Customer name | irrelevant and private
noise: Neighbourhood label | a proxy for protected groups
noise: Meter serial | an identifier
base: Inspect the areas with the highest reported losses and complaints, because it is the common approach.
prod: A transformer-level balance model with an anomaly score and an inspection planner that balances expected recovery and coverage across areas with fairness checks.
pipe: Energy balance data @ SCADA and AMI ; Technical loss estimate @ power flow ; Anomaly scoring @ model ; Inspection planning @ route optimiser ; Field verification @ inspectors ; Result capture @ field app ; Fairness and yield audit @ quarterly
edge: Meter data gaps | balance errors appear | Data quality checks before scoring
edge: Area bias | some neighbourhoods are inspected more | Coverage audits and random checks
edge: New supply | a new connection changes the balance | Network change updates
off: Inspection hit rate by area ; Energy recovered per inspection ; Balance model error
on: Energy recovered ; Wrongful findings ; Inspection cost per recovery
gap: Individual customer scoring ; Penalties from scores ; Complaint-based areas only

== meter-communication-failure-prediction | Meter Communication Failure Prediction | tabular,time-series | batch | foundational | a=0.2 k=5
obj: Predict which meters and collectors will lose communication in the coming weeks so repairs are planned and reads do not become estimates.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Probability of failure within 30 days ; Collector and meter level lists ; Reason hints for the field team ; Weekly run for 10M endpoints
sn: Label | Communication loss lasting more than a set number of days | Single missed reads | Short misses are noise
sn: Cause | Radio, power or device fault | A score only | Crews need a likely cause
sn: Action | A route-based work plan | A failure list | Efficient routes save cost
sig: Signal strength trend | change in radio signal and retry counts | Early sign | From head-end
sig: Collector load and age | number of meters on a collector and its age | Capacity risk | From network data
sig: Firmware and model family | firmware version and hardware model | Known issues | From the register
sig: Environment | temperature, humidity and construction | Risk | From weather and local data
noise: Customer name | irrelevant and private
noise: Meter serial | an identifier
noise: Install crew name | irrelevant
base: Repair meters after they have not reported for a set number of days, because it is the standard process.
prod: A calibrated model of failure within 30 days with cause hints and a route-optimised preventive work plan.
pipe: Head-end data extraction @ AMI system ; Feature build @ aggregated histories ; Failure model @ gradient boosting ; Cause hint @ rules ; Route plan @ optimiser ; Work order @ field system ; Outcome tracking @ monthly
edge: Firmware rollout | communication changes for a family | Firmware flags and a pause in alerts
edge: Storm outage | many meters go quiet at once | Outage correlation to avoid false alerts
edge: Seasonal foliage | signals weaken in summer | Season features
off: Calibration of 30-day failure risk ; Top-decile capture ; Cause hint accuracy
on: Estimated read share ; Truck rolls ; Time with no communication
gap: Reactive repair only ; Ignoring firmware ; Counting short misses as failures

== water-network-leak-detection | Water Network Leak Detection | time-series | batch | advanced | a=96 k=2
obj: Detect and localise leaks in water distribution from district meter flows, pressure loggers and acoustic sensors so crews find them before they burst.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Night-flow baselines per district ; Leak area list within 24 hours ; Estimated loss volume with a range ; Crew confirms before excavation ; 3K districts
sn: Baseline | Night flow minus legitimate use | Total flow | Daytime flow hides leaks
sn: Location | Pressure and acoustic cues to narrow the search | A district alarm | Crews need an area
sn: Value | Water and energy lost | A leak count | Small leaks matter less
sig: Minimum night flow | flow in the lowest-use hours | Leak indicator | From district meters
sig: Pressure transient pattern | pressure drops and surges | Burst signal | From loggers
sig: Acoustic noise level | leak noise on hydrophones | Location | From sensors
sig: Consumption in the district | billed use by district | Balance | From billing
noise: Meter name | an identifier
noise: Crew name | irrelevant
noise: Alarm wording | an artefact
base: Alarm when night flow exceeds a fixed threshold, because it is a common practice.
prod: A district baseline model on night flow with pressure and acoustic corroboration and a hydraulic model that ranks candidate pipes, with a work order link.
pipe: Flow and pressure capture @ SCADA ; Night-flow baseline @ regression ; Leak anomaly detector @ change point ; Location ranking @ hydraulic model ; Alert and work order @ network console ; Crew verification @ field app ; Savings check @ before after
edge: Large user event | a customer fills a tank | Customer event flags and filters
edge: Valve operation | flow changes after operations | Operations log integration
edge: Sensor drift | the meter reads wrongly | Calibration checks
off: Detection of seeded leaks ; Location hit rate ; Estimated volume error
on: Water lost ; Time to repair ; Burst frequency
gap: Total flow monitoring ; Fixed thresholds ; No corroboration

== gas-network-leak-detection | Gas Network Leak Detection | time-series,computer-vision | batch | advanced | a=20 k=10
obj: Detect gas leaks along pipelines and in the distribution network from sensors, mobile survey data and pressure behaviour so repair crews are sent to the highest-risk leaks first.
con: Leak reports ranked by risk and proximity to people and buildings ; Safety-critical reports escalate to a person immediately ; Crew confirms on site ; Works with survey vehicle data ; 100K km of main
sn: Risk | Leak size, location and nearby receptors | Leak count | A small leak near buildings can matter more than a large one in a field
sn: Evidence | Sensor readings with wind and survey position | A single reading | Wind and position change the reading
sn: Safety | An immediate human route for danger | Queue ranking alone | Some reports cannot wait
sig: Methane concentration enhancement | readings above background | Leak signal | From survey sensors
sig: Wind speed and direction | wind at measurement time | Dispersion model | From weather
sig: Distance to buildings and roads | proximity to receptors | Risk | From GIS
sig: Pipe material and age | pipe attributes | Likelihood | From the register
noise: Vehicle name | irrelevant
noise: Survey route id | an identifier
noise: Report author | irrelevant
base: Scheduled surveys of mains with portable detectors and public reports, because it is the regulated method.
prod: A source localisation model that combines survey readings with wind data and a risk ranking by receptors, with an immediate escalation rule for dangerous readings.
pipe: Survey and sensor ingestion @ vehicles and fixed sensors ; Background correction @ signal processing ; Source localisation @ dispersion model ; Risk ranking @ rules and model ; Emergency escalation @ rules ; Crew dispatch @ work management ; Repair feedback @ confirmation
edge: Sewer gas | methane is not from the network | Isotope or odour flags where available
edge: Calm wind | dispersion is unclear | Wider location areas and a manual check
edge: Sensor fault | readings are wrong | Calibration checks and cross-sensor comparison
off: Location accuracy on confirmed leaks ; Recall of high-risk leaks ; Escalation correctness
on: Time to repair high-risk leaks ; Emissions avoided ; False dispatches
gap: Counting leaks equally ; No wind data ; No immediate escalation for danger

== meter-to-cash-exception-triage | Meter-to-Cash Exception Triage | tabular,nlp | batch | foundational | a=0.5 k=5
obj: Classify and route billing exceptions such as unusual reads, rejected bills and mismatched accounts so analysts fix the most costly ones first.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Exception type and fix route for every item ; Value at risk shown ; Analysts approve every correction ; Daily run for 200K exceptions
sn: Label | The fix that analysts applied | The exception code | Codes are broad and inconsistent
sn: Priority | Value at risk and age | First in first out | Large unbilled amounts matter more
sn: Action | A recommended fix and queue | A report | Analysts need the next step
sig: Exception code and text | code and free-text note | Type | From the billing system
sig: Account and meter context | account type and meter changes | Cause | From CIS
sig: Value at risk | estimated unbilled amount | Priority | From billing
sig: Age of the exception | days since it arose | Urgency | From the queue
noise: Analyst name | irrelevant
noise: Customer name | irrelevant and private
noise: Queue name | an artefact
base: Queues by exception code worked in order of arrival, because it is the current workflow.
prod: A classifier on codes and notes with a value-at-risk ranking, a recommended fix with confidence and analyst approval.
pipe: Exception intake @ billing system ; Context join @ CIS and MDM ; Fix classifier @ transformer ; Value ranking @ rules ; Analyst queue @ work tool ; Correction approval @ maker-checker ; Outcome tracking @ weekly
edge: New exception type | the classifier has not seen it | Abstain and route to an expert
edge: Conflicting fixes | two analysts apply different fixes | Review and a standard fix list
edge: Data lag | the meter data arrives late | Waiting rules and a recheck
off: Fix accuracy against analyst actions ; Priority rank quality ; Abstention rate
on: Unbilled revenue days ; Analyst handle time ; Rebills
gap: Code-only labels ; First-in first-out queues ; Auto-corrections without approval

== battery-dispatch-optimisation | Battery Dispatch Optimisation | reinforcement-learning,time-series | seconds | advanced | a=96 k=4
obj: Schedule battery charging and discharging across energy, ancillary and capacity markets to maximise margin while protecting battery life and respecting grid limits.
con: State of charge and power limits enforced in the controller ; Degradation cost in the objective ; Warranty and grid connection limits respected ; Dispatch plan every 5 minutes ; 500 sites
sn: Objective | Margin after degradation cost | Revenue | Aggressive cycling wears out the battery
sn: Uncertainty | Price scenarios and forecast errors | A single price path | Prices change after the plan is made
sn: Limits | Hard limits outside the model | Learned limits | A learned limit can violate warranty or grid terms
sig: Price and ancillary scenarios | scenario set from the price models | Value of options | From forecasts
sig: State of charge and temperature | charge level and cell temperature | Constraint | From the battery system
sig: Degradation cost per cycle | cost from the ageing model | Objective | From the health model
sig: Grid and contract limits | export limits and market obligations | Constraint | From contracts
noise: Site name | an identifier
noise: Operator name | irrelevant
noise: Log format | an artefact
base: A rule that charges at night and discharges at evening peak, because it is the usual simple schedule.
prod: A stochastic model-predictive controller with a degradation model and market stack optimisation, a rules layer for limits and an operator view of the plan.
pipe: Price and forecast ingestion @ market feeds ; State estimation @ battery system ; Scenario generation @ stochastic model ; Dispatch optimiser @ MPC ; Limit filter @ rules ; Dispatch command @ battery controller interface ; Settlement review @ daily
edge: Forecast miss | prices move against the plan | Rolling horizon and reserve margins
edge: Cell fault | usable capacity drops | Health model updates and derating
edge: Market rule change | product rules change | Versioned constraints
off: Margin after degradation in backtests ; Limit violation rate ; Forecast calibration
on: Margin per MWh ; Throughput and ageing ; Warranty limit breaches
gap: Revenue-only objectives ; Learned safety limits ; Single price paths

== battery-state-of-health-estimation | Battery State of Health Estimation | time-series | batch | advanced | a=1 k=6
obj: Estimate battery capacity and resistance from operating data without full test cycles so ageing is tracked and the end of life is planned.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Capacity estimate with an interval ; Works from partial cycles ; Alerts for accelerated ageing ; Weekly run for 100K batteries
sn: Truth | Periodic reference capacity tests | The management system estimate alone | Vendor estimates drift
sn: Data | Partial and noisy cycles | Full test cycles | Real use rarely gives full cycles
sn: Use | End of life planning and warranty | A health score | Planners need time to replacement
sig: Capacity from partial charge | capacity inferred from partial cycles | Core estimate | Normalised
sig: Internal resistance trend | rise in resistance | Ageing | From current and voltage
sig: Temperature exposure | time at high temperature | Ageing driver | From sensors
sig: Cycle depth and rate | depth of discharge and C-rate | Ageing driver | From telemetry
noise: Site name | an identifier
noise: Operator name | irrelevant
noise: Log format | an artefact
base: The manufacturer's health estimate and fixed cycle count limits, because they are the default.
prod: A hybrid physics and learning ageing model fitted on partial cycles with calibration on test results, interval output and fleet comparison for accelerated ageing.
pipe: Telemetry capture @ battery management system ; Cycle segmentation @ signal processing ; Capacity and resistance estimate @ hybrid model ; Calibration on tests @ periodic checks ; Alerts and forecast @ asset console ; Warranty tracking @ contract system ; Retraining @ quarterly
edge: Sensor drift | voltage or current readings are wrong | Cross-checks and calibration
edge: Mixed chemistries | models differ by cell type | Per-chemistry models
edge: Sparse use | few cycles in a period | Wider intervals and time-based ageing
off: Capacity error against tests ; Interval coverage ; Lead time of ageing alerts
on: Replacement timing error ; Warranty claims ; Unexpected capacity loss
gap: Vendor estimate only ; Full-cycle assumptions ; Point estimates only

== ev-charging-demand-forecasting | EV Charging Demand Forecasting | time-series | batch | foundational | a=96 k=2
obj: Forecast charging demand by site and feeder so grid upgrades, tariffs and charger operations match when and where vehicles charge.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: 15-minute resolution for 14 days ; Aggregated demand by site and feeder ; No tracking of individual drivers ; Quantile output for peaks ; 50K chargers
sn: Driver | Site type, day type and prices | History only | Behaviour changes with tariffs and events
sn: Privacy | Aggregated charging sessions | Individual vehicle trips | Trip traces reveal where people live and work
sn: Peak | Quantiles for coincident peaks | Averages | Feeder capacity depends on coincident peaks
sig: Site type and location | workplace, public or home area | Load shape | From the register
sig: Day type and events | weekday, holiday and local events | Demand pattern | From calendars
sig: Tariff and price signals | time-of-use prices | Shifting | From tariffs
sig: Recent session volume | sessions in recent weeks | Anchor | From operator data
noise: Driver name | irrelevant and private
noise: Vehicle identifier | an identifier and private
noise: Card number | an identifier
base: Same-day-last-week demand per site, because it is the simple benchmark.
prod: A hierarchical forecaster with site and feeder aggregation, tariff and event covariates, quantile outputs and a growth model for new chargers.
pipe: Session and meter aggregation @ charge point operators ; Feature build @ calendar and tariff joins ; Demand forecast @ gradient boosting ; Hierarchical reconciliation @ rules ; Feeder peak view @ planning tool ; Planner review @ network planning ; Accuracy tracking @ monthly
edge: New site | the site has no charging history | Borrow from similar sites with a wide interval
edge: Pricing change | behaviour shifts quickly | Price features and a rapid refresh
edge: Outage | chargers go offline | Availability flags
off: Weighted quantile loss ; Peak error ; Coverage by site type
on: Feeder overloads ; Upgrade cost avoided ; Forecast bias at peak
gap: Individual trip tracking ; Average-based capacity planning ; Ignoring prices

== smart-charging-schedule-optimisation | Smart Charging Schedule Optimisation | reinforcement-learning,tabular | seconds | advanced | a=1 k=4
obj: Schedule EV charging across a site or fleet to meet departure needs at the lowest cost within feeder and connection limits.
con: Every vehicle meets its stated departure target unless the driver agrees otherwise ; Site and feeder limits enforced in the controller ; Drivers can override ; Re-plan every 5 minutes ; 20K sessions per day per region
sn: Promise | The stated departure target | The cheapest schedule | Drivers must trust that cars are ready
sn: Limit | Hard connection and feeder limits | Learned limits | A violation trips breakers
sn: Fairness | Equal access when capacity is scarce | Priority by payment only | Unclear priority breeds complaints
sig: Departure time and energy needed | driver-stated deadline and required energy | Constraint | From the session
sig: Price signal | time-of-use and wholesale prices | Cost objective | From tariffs
sig: Site capacity headroom | available power at the connection | Constraint | From meters
sig: Vehicle charge limits | maximum charge rate | Feasibility | From the charger
noise: Driver name | irrelevant and private
noise: Vehicle plate | an identifier and private
noise: Card number | an identifier
base: Charge at full power on plug-in, because it is the default behaviour.
prod: A model-predictive scheduler with departure constraints and site limits, a fairness policy under scarcity and driver overrides with notifications.
pipe: Session intake @ charge point systems ; Constraint model @ site limits ; Price and limit forecast @ time-series model ; Schedule optimiser @ constrained solver ; Command output @ charger interface ; Driver notification @ app ; Cost and fairness review @ monthly
edge: Early departure | the driver leaves before the deadline | Override and fast-charge options
edge: Charger fault | capacity drops mid-schedule | Re-plan with remaining chargers
edge: Missing deadline | the driver gives no departure time | Conservative defaults and a prompt
off: Departure target attainment ; Limit violation rate ; Cost against the baseline
on: Charging cost ; Peak site demand ; Driver complaints about readiness
gap: Cost without a promise ; Learned limits ; Opaque priority

== virtual-power-plant-orchestration | Virtual Power Plant Orchestration | reinforcement-learning,time-series | seconds | staff-principal | a=12 k=6
obj: Coordinate distributed batteries, solar, flexible loads and chargers as one resource that bids into markets and follows grid signals, within each owner's limits and consent.
con: Each asset's owner limits and consent respected ; Safety limits in local controllers ; Delivery verified against metered data ; Dispatch signals every 5 minutes ; 200K assets
sn: Consent | Owner-set limits per asset | Maximum extraction | Trust and consent are required for a fleet
sn: Delivery | Verified delivery against metered response | Planned dispatch | Markets pay for delivered energy
sn: Control | Local safety control with fleet signals | Direct central control of devices | Local safety must hold when links fail
sig: Fleet availability forecast | forecast of controllable capacity | Bid size | From asset models
sig: Asset response model | past response to signals | Delivery risk | From metering
sig: Market and grid signals | price and grid service calls | Value | From markets
sig: Owner constraints | limits on comfort, charge and hours | Constraint | From settings
noise: Owner name | irrelevant and private
noise: Device brand alone | weak link
noise: Installer name | irrelevant
base: Static schedules for each asset type with fixed windows, because it is the simple programme.
prod: A hierarchical controller with fleet-level bids from availability forecasts and device-level dispatch within owner limits, with verification, penalty-aware bidding and local safety control.
pipe: Asset state and consent @ device platforms ; Availability forecast @ time-series model ; Fleet bid @ optimiser ; Dispatch signals @ orchestrator ; Local control @ device controllers ; Delivery verification @ metering ; Settlement and learning @ daily
edge: Link loss | devices lose connection | Local fallback behaviour
edge: Under-delivery | the fleet misses the call | Reserve margins and penalty-aware bids
edge: Owner opt-out | the controllable capacity drops | Availability updates and communication
off: Delivery against bid ; Availability forecast error ; Limit breach rate
on: Delivered flexibility ; Penalties ; Owner opt-outs
gap: Central control without local safety ; Planned dispatch as delivery ; Ignoring consent

== solar-plant-fault-detection | Solar Plant Fault Detection | time-series,computer-vision | batch | foundational | a=96 k=3
obj: Find underperforming strings, inverters and panels in solar plants from power data and thermal imagery and rank the lost energy to schedule repairs.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Loss estimate in kWh per fault ; Cleaning and electrical faults separated ; Technician confirms before parts are ordered ; Daily run for 1K plants
sn: Baseline | Expected power from irradiance and temperature | Nameplate | Weather changes output
sn: Cause | Soiling, shading or electrical | A loss number | Different faults need different crews
sn: Value | Lost energy cost | Fault count | Large losses first
sig: Power ratio against model | measured over expected power | Core signal | By string
sig: Inverter and string faults | alarm and current mismatch | Electrical fault | From inverters
sig: Thermal hot spots | panel temperature outliers | Panel defect | From drone images
sig: Soiling trend | slow decline after cleaning | Cleaning schedule | From history
noise: Plant name | an identifier
noise: Technician name | irrelevant
noise: Report format | an artefact
base: Compare each inverter's output against the plant average, because it is a common check.
prod: A performance model per string with fault classification and drone image defect detection, a lost-energy ranking and cleaning and repair plans.
pipe: Plant and weather data @ SCADA and weather ; Expected power model @ regression ; Fault classifier @ model ; Thermal image analysis @ vision model ; Loss ranking @ rules ; Work plan @ field system ; Outcome tracking @ monthly
edge: Curtailment | output is limited by the grid | Curtailment flags
edge: Snow or shade | production drops for known reasons | Weather and shade models
edge: Sensor drift | irradiance sensors read low | Calibration checks
off: Fault detection recall ; Loss estimate error ; Cause classification accuracy
on: Recovered energy ; Time to repair ; Cleaning cost per kWh recovered
gap: Nameplate baselines ; Plant average comparisons only ; Counting faults not losses

== vegetation-encroachment-detection | Vegetation Encroachment Detection | computer-vision | batch | advanced | a=30 k=400
obj: Measure vegetation clearance to power lines from aerial and satellite imagery and lidar and rank spans by risk of contact so trimming crews work where it matters.
con: Clearance estimates with an uncertainty ; Priority by growth rate and local wind and fire risk ; Arborist confirms before trimming ; Annual coverage of 100K km of line
sn: Truth | Field-measured clearances | Image labels only | Images can mislead in depth
sn: Priority | Time to contact given growth | Current distance only | A fast-growing tree matters more
sn: Action | Trimming cycles tied to risk | A fixed cycle | Fixed cycles trim safe spans and miss risky ones
sig: Clearance distance | distance from canopy to conductor | Core measurement | From lidar or imagery
sig: Species and growth rate | tree type and growth | Time to contact | From classification
sig: Line sag and wind swing | conductor movement under load and wind | Dynamic clearance | From models
sig: Local fire and storm risk | risk class of the area | Priority | From risk maps
noise: Survey vendor name | irrelevant
noise: Image file name | an artefact
noise: Crew name | irrelevant
base: Fixed trimming cycles by line class, because they are the regulatory and cost default.
prod: A segmentation and distance model on lidar and imagery with growth models and a risk-ranked trim list, plus arborist verification and feedback.
pipe: Imagery and lidar intake @ survey providers ; Canopy and line segmentation @ vision model ; Clearance and growth estimate @ geometric model ; Risk ranking @ rules ; Arborist review @ field tool ; Trim work order @ work management ; Outcome and regrowth tracking @ annual
edge: Dense canopy | lidar misses the lower tree | Multi-source checks and field samples
edge: Season change | leaf-off images underestimate | Season-aware growth models
edge: Georeferencing error | spans are misaligned | Alignment checks
off: Clearance error against field measures ; Recall of high-risk spans ; Ranking accuracy
on: Vegetation outages ; Trim cost per span ; Spans trimmed that did not need it
gap: Fixed cycles only ; Using distance without growth ; Image labels as truth

== wildfire-ignition-risk-forecasting | Wildfire Ignition Risk Forecasting | tabular,time-series | batch | advanced | a=1 k=30
obj: Forecast the chance that conditions and equipment could start a fire for each network segment so operators and planners can decide on inspections, covered conductor work and temporary protection settings.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Segment risk for the next 72 hours with updates every 6 hours ; Any power shutoff decision is made by named senior staff under the written protocol ; Public safety above model output ; Explanations for every high-risk segment ; 200K segments
sn: Role | Decision support for protocols run by people | An automated shutoff trigger | Shutoffs affect safety and need accountable decisions
sn: Label | Ignition events and near misses with cause | Fire counts alone | Fires have many causes
sn: Uncertainty | Scenario ranges for wind and fuel moisture | A single risk score | Conditions change quickly
sig: Wind gust and direction forecast | forecast wind speed and direction | Main driver | From weather models
sig: Fuel moisture and vegetation dryness | fuel state | Spread potential | From satellite and sensors
sig: Equipment type and condition | conductor, hardware and protection type | Ignition source | From the register
sig: Recent faults and operations | faults and reclose events | Ignition risk | From SCADA
noise: Segment name | an identifier
noise: Report author | irrelevant
noise: Map layer name | an artefact
base: A fire weather index by region and fixed thresholds in the operating protocol, because it is how protocols work today.
prod: A calibrated segment-level model combining weather, fuel and equipment features with scenario ranges and explanations, feeding a decision protocol with human sign-off.
pipe: Weather and fuel data intake @ forecast and satellite feeds ; Segment feature build @ GIS and asset joins ; Risk model @ gradient boosting ; Calibration @ isotonic fit ; Scenario ranges @ ensembles ; Risk map and brief @ control room ; Decision log @ audit store
edge: Rapid weather shift | the forecast changes in hours | Frequent refresh and scenario views
edge: Rare event | few ignitions in training | Pooled regions and conservative handling
edge: Data outage | a sensor feed is down | Staleness flags and fallbacks
off: Calibration of segment risk ; Recall of ignition-prone conditions ; Lead time
on: Ignition events ; Inspections targeted ; Public safety decision quality
gap: Automated shutoff decisions ; Single-point risk scores ; Fire counts as the label

== field-crew-dispatch-optimisation | Field Crew Dispatch Optimisation | reinforcement-learning,tabular | seconds | advanced | a=30 k=4
obj: Assign crews to jobs and routes by skills, parts, travel time and priority so emergency work is fast and planned work is efficient.
con: Skills and safety certifications are hard constraints ; Dispatcher can override ; Re-plan within 60 s after a new emergency ; Working-time rules respected ; 4K crews
sn: Constraint | Certified skills and time rules | A preference | A person without the certification cannot do the work
sn: Objective | Priority-weighted completion time and travel | Distance | Emergency response matters more
sn: Control | Dispatcher approval and overrides | Fully automatic | Crews need humane plans and judgement
sig: Job priority and deadline | emergency level and due time | Order | From work management
sig: Crew skills and location | certifications and position | Feasibility | From the crew app
sig: Parts availability on truck | stock held on the vehicle | Feasibility | From inventory
sig: Travel time forecast | predicted road time | Plan realism | From traffic data
noise: Crew name | irrelevant
noise: Job number | an identifier
noise: Vehicle colour | irrelevant
base: Dispatchers assign the nearest crew to the highest-priority job, because it is the current method.
prod: A dynamic vehicle routing planner with skills and time rules, emergency insertion and a dispatcher view with explanations and overrides.
pipe: Job intake @ work management ; Constraint model @ skills and rules ; Route optimiser @ vehicle routing solver ; Emergency insertion @ event trigger ; Dispatcher review @ dispatch console ; Crew notification @ mobile app ; Performance review @ weekly
edge: Large storm | demand exceeds crews | Priority tiers and mutual aid planning
edge: Crew absence | a crew is unavailable | Fast re-plans
edge: Missing parts | the job needs parts not on the truck | Parts-aware assignments and pre-stocking
off: Plan feasibility ; Emergency response time ; Travel time per job
on: Response time ; Jobs per crew-day ; Overtime hours
gap: Nearest-crew assignment only ; Ignoring certification ; Full automation of crews

== field-technician-copilot | Field Technician Copilot | llm-agents,nlp | seconds | foundational | a=0.5 k=40
obj: Answer technician questions on site about equipment, procedures and safety steps from controlled manuals and past work orders, in the technician's language, without altering any record.
con: Safety steps shown verbatim from controlled documents ; The assistant cannot issue a switching or isolation instruction ; Works with intermittent connectivity ; Citations with revision numbers ; Answer within 4 s
sn: Source | Controlled manuals and procedures | Model memory | A wrong step can injure someone
sn: Safety | Verbatim safety steps | Paraphrase | Paraphrase can drop key conditions
sn: Scope | Equipment and procedure questions | Open chat | Off-topic chat wastes time on site
sig: Equipment identification | asset type and model | Retrieves the right manual | From the work order
sig: Document revision | current or superseded | Prevents old steps | From document control
sig: Question intent | procedure, parts or history | Routing | Classified
sig: Technician qualification | training and authorisation | Gates steps | From training records
noise: Technician name | irrelevant
noise: Device model | irrelevant
noise: Time of day | irrelevant
base: Paper manuals and a search box on the document site, because they are the current tools.
prod: An offline-capable retrieval assistant with asset context, verbatim safety steps, photo and voice input and a feedback path to document owners.
pipe: Question intake @ mobile app ; Asset context @ work order lookup ; Retrieval @ hybrid search ; Answer with citation @ LLM with controlled content ; Safety step insertion @ document store ; Feedback to owners @ document control ; Usage review @ monthly
edge: No connectivity | the technician is underground | Cached manuals and sync
edge: Outdated manual | the cache holds an old revision | Revision checks and expiry
edge: Unrecognised equipment | no manual matches | Say so and ask for the asset tag
off: Answer faithfulness on audited questions ; Retrieval accuracy ; Verbatim step accuracy
on: Calls to the helpdesk ; First-time fix rate ; Time to find a procedure
gap: Paraphrased safety steps ; Missing revision control ; Open-domain chat

== storm-damage-assessment-imagery | Storm Damage Assessment from Imagery | computer-vision | batch | advanced | a=10 k=500
obj: Assess damage to poles, lines and substations after storms from aerial, drone and satellite images so crews and materials are sent to the right places quickly.
con: Damage counts by area within 12 hours of imagery ; Safety hazards such as downed lines flagged for immediate human review ; Crew verifies before work ; Images retained with model version ; 1M images per event
sn: Truth | Crew-confirmed damage | Image tags | Tags can miss hidden damage
sn: Priority | Hazard first then customers affected | Damage count | A downed line over a road matters most
sn: Use | Materials and crew planning | A damage map | Planners need quantities
sig: Damage class scores | model scores for poles, wires and equipment | Core signal | Calibrated
sig: Location and customers affected | where damage sits and who is without power | Priority | From GIS and OMS
sig: Image quality and coverage | resolution and cloud cover | Reliability | From metadata
sig: Road access | road status near damage | Crew time | From road data
noise: Pilot name | irrelevant
noise: Image file name | an artefact
noise: Flight id | an identifier
base: Damage assessment by crews driving the lines, because it is the standard approach.
prod: A damage detector on aerial and satellite images with hazard flags, a materials estimate and a crew verification step feeding restoration planning.
pipe: Imagery intake @ aircraft, drones and satellites ; Damage detection @ vision model ; Hazard flag @ rules ; Materials estimate @ planning rules ; Crew verification @ field app ; Restoration planning @ ADMS and work management ; Review after the event @ debrief
edge: Cloud cover | satellite images are blocked | Drone and aircraft fallbacks
edge: Debris confusion | debris looks like damaged equipment | Verification and class training
edge: Overload | too many images arrive | Priority queues by hazard
off: Hazard recall ; Damage count error ; Materials estimate error
on: Assessment time ; Restoration time ; Crew miles driven
gap: Using damage counts as priority ; Image tags as truth ; No hazard escalation

== regulatory-filing-copilot | Regulatory Filing Copilot | llm-agents,nlp | seconds | advanced | a=0.05 k=60
obj: Help regulatory teams assemble rate case and reliability filings by retrieving prior filings, regulator rules and source data, with every number computed by tools and linked to its source.
con: Every number links to a source record and a calculation ; Figures computed by tools not by the model ; Human approval before any submission ; Version control of drafts ; Drafts for 200 data requests within a week
sn: Numbers | Deterministic tools on controlled data | Model arithmetic | Models make unit and arithmetic errors
sn: Evidence | A source link per statement | Narrative without references | Regulators need to trace every claim
sn: Consistency | Terms and values consistent across filings | Free wording | Differences invite challenge
sig: Data request match | which request a passage answers | Routing | From the request list
sig: Calculation lineage | whether a figure traces to inputs | Audit readiness | From the lineage store
sig: Prior filing consistency | agreement with earlier answers | Consistency | From prior filings
sig: Rule citation | whether the rule is cited | Compliance | From the rule library
noise: Author name | irrelevant
noise: Draft length | not quality
noise: Template colour | irrelevant
base: Analysts copying from prior filings into new documents with manual checks, because it is the current process.
prod: A drafting copilot with retrieval and calculation tools, consistency checks across filings and an approval workflow for regulatory leads.
pipe: Data request intake @ regulatory tracker ; Retrieval of prior answers @ document index ; Calculation tools @ governed APIs ; Draft answer @ LLM with citations ; Consistency check @ rules and model ; Lead review @ approval console ; Submission pack @ document store
edge: Conflicting prior answers | two filings disagree | Flag and request an owner decision
edge: Rule change | a rule is updated | Versioned rule library
edge: Missing data | the source is unavailable | Mark the gap and do not estimate
off: Figure accuracy against recalculated values ; Citation coverage ; Consistency check recall
on: Drafting time ; Regulator follow-up questions ; Corrections after submission
gap: Model-computed figures ; Statements with no sources ; Inconsistent answers across filings

== interconnection-application-triage | Interconnection Application Triage | tabular,nlp | seconds | foundational | a=0.2 k=5
obj: Check, classify and route requests to connect solar, storage and generation so incomplete applications are fixed early and simple ones move quickly.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Completeness check in minutes ; Route by study type ; Engineers decide on the study outcome ; Fair queue order maintained ; 200K applications per year
sn: Label | The study path and outcome engineers assigned | Applicant category | Category does not decide the path
sn: Fairness | Queue order by rules | Faster service for large applicants | Unfair queues breach regulation
sn: Role | Triage and completeness | Approval | Engineering studies decide connection
sig: Document completeness | required forms and data present | Readiness | From the application
sig: Technology and size | generation type and capacity | Study path | From the application
sig: Location headroom | hosting capacity at the point | Path hint | From the hosting map
sig: Past similar cases | outcomes of similar applications | Expected path | From history
noise: Applicant name | irrelevant
noise: Company size | irrelevant to the path
noise: Submission channel | irrelevant
base: Manual completeness checks and routing by a clerk, because it is the current process.
prod: A classifier and rules for completeness and study path with a queue that preserves order, a missing-item message to applicants and engineer review of each route.
pipe: Application intake @ portal ; Document extraction @ OCR and parsing ; Completeness check @ rules ; Study path classifier @ model ; Queue assignment @ workflow ; Engineer review @ planning tool ; Applicant message @ templated channel
edge: Wrong document | a form is the wrong type | Document type checks and a request for correction
edge: Large project | the application is unusual | Route to a specialist
edge: Rule change | thresholds change | Versioned rules
off: Route accuracy ; Completeness precision and recall ; Queue order compliance
on: Time to a complete application ; Applications returned late ; Engineer review time
gap: Priority for large applicants ; Using the model as the decision ; Skipping queue rules

== grid-ot-anomaly-detection | Grid OT Network Anomaly Detection | time-series,graph | seconds | advanced | a=50 k=8
obj: Detect abnormal behaviour in substation and control-network traffic such as unusual commands, new devices and protocol misuse so the security team investigates before it affects operations.
loss: \mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2
con: Passive monitoring only with no inline blocking ; Baselines per zone and protocol ; Alerts include the device and the change ; False alarms under 5 per site per week ; 2K sites
sn: Baseline | Normal commands and flows per zone | A global baseline | Substations differ widely
sn: Mode | Passive detection with analyst response | Automatic blocking | Blocking a control path can cause an outage
sn: Evidence | Packet-level context with the alert | An anomaly score | Analysts need what changed
sig: New or changed device | devices not in the inventory | Core signal | From passive discovery
sig: Command and function code mix | control commands seen | Misuse | From protocol parsing
sig: Flow graph change | new communication pairs | Lateral movement | From flow data
sig: Maintenance window | scheduled work | Context | From the change calendar
noise: Device name | an identifier
noise: Analyst name | irrelevant
noise: Alert wording | an artefact
base: Signature-based intrusion detection and asset inventory reviews, because they are the standard controls.
prod: A passive monitoring system with protocol-aware baselines and graph anomaly detection that adds maintenance context and sends evidence-rich alerts to the OT security team.
pipe: Passive capture @ network taps ; Protocol parsing @ OT-aware parser ; Baseline model @ per-zone model ; Graph change detection @ graph analytics ; Context enrichment @ change calendar and inventory ; Analyst alert @ SOC console ; Feedback @ weekly review
edge: Maintenance work | legitimate changes trigger alerts | Change calendar enrichment
edge: New vendor device | the inventory is incomplete | Onboarding workflow
edge: Encrypted traffic | content is not visible | Flow-level detection
off: Detection of seeded anomalies ; False alarms per site-week ; Time to triage
on: Mean time to detect ; Unknown devices found ; Incidents in OT zones
gap: Inline blocking ; Global baselines ; Alerts with no context

== grid-carbon-intensity-forecasting | Grid Carbon Intensity Forecasting | time-series | batch | foundational | a=96 k=2
obj: Forecast the carbon intensity of grid electricity by region and hour so flexible loads, charging and reporting use cleaner times and numbers.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Hourly forecast for 48 hours ; Both average and marginal intensity reported with definitions ; Methodology documented ; Daily run for 40 regions
sn: Definition | Average and marginal intensity labelled | One number called carbon intensity | They answer different questions
sn: Inputs | Generation mix forecasts and imports | History only | The mix changes with weather and demand
sn: Use | Shifting flexible load and accurate reporting | A marketing number | Claims need consistent methods
sig: Renewable forecast | wind and solar generation forecasts | Mix driver | From forecasts
sig: Demand forecast | forecast load | Dispatch driver | From load models
sig: Interconnector flows | imports and exports | Mix shift | From operators
sig: Plant outages | planned and unplanned outages | Mix shift | From market data
noise: Region name | an identifier
noise: Report author | irrelevant
noise: Chart colour | irrelevant
base: Persistence of the last published intensity with a time-of-day profile, because it is the simple benchmark.
prod: A dispatch-aware model that forecasts the generation mix and derives average and marginal intensity with intervals and a documented method.
pipe: Generation and demand feeds @ operator data ; Mix forecast @ dispatch model ; Intensity calculation @ emission factors ; Interval estimate @ ensembles ; Publish @ API and reports ; Consumer use @ flexible load systems ; Accuracy tracking @ weekly
edge: Missing interconnector data | imports are unknown | Fallbacks and a flag
edge: Factor update | emission factors are revised | Versioned factors
edge: Extreme weather | renewable output changes sharply | Wider intervals
off: Intensity error ; Coverage of intervals ; Ranking of cleanest hours
on: Emissions avoided by shifting ; Reporting corrections ; Forecast error at peaks
gap: Mixing average and marginal intensity ; Using history alone ; Undocumented methods

== grid-agent-action-guardrails | Grid Agent Action Guardrails | llm-agents,tabular | seconds | staff-principal | a=0.2 k=40
obj: Control and audit every action AI agents take in utility systems such as ADMS, work management, billing and market platforms, enforce approval tiers and give regulators a replayable record.
con: Policy enforced in a gateway outside the model ; Agents never write to switching, protection settings or market bids ; Approvals by named roles ; Immutable action log ; Kill switch per agent ; Audit queries over 90 days answered within 5 s
sn: Enforcement | A tool gateway with policy as code | Prompt instructions | Prompts can be bypassed by crafted input
sn: Scope | Least privilege per agent and tool | Shared service accounts | One mistake should not reach critical systems
sn: Evidence | An append-only log with context | A summary report | Regulators need replay
sig: Action risk tier | the tier of the target system and action | Approval routing | Policy as code
sig: Action rate per agent | actions per minute against a baseline | Runaway detection | Per agent
sig: Approval and override statistics | approvals, rejections and overrides | Governance health | From the log
sig: Post-action verification result | whether the intended state was reached | Quality of actions | Verification steps
noise: Agent name | an identifier
noise: Prompt length | not risk
noise: Model version alone | needs outcome data
base: Manual review of agent logs by team leads, because it is the minimum audit trail.
prod: A policy gateway with risk tiers, rate limits and a kill switch, an immutable action log with replay, behavioural anomaly detection on agent actions and weekly governance reports.
pipe: Tool gateway @ policy proxy ; Risk tier decision @ policy as code ; Approval workflow @ maker-checker ; Action log @ append-only store ; Behaviour monitor @ time-series model ; Replay console @ analytics ; Governance report @ weekly
edge: Agent loop | repeated writes to one record | Rate limits and loop detection
edge: Approver fatigue | approvals become automatic | Override statistics and rotating approvers
edge: New tool added | no tier has been defined | Default deny until classified
off: Policy test coverage ; Detection of seeded anomalous actions ; Replay completeness
on: Actions blocked by policy ; Incidents caused by agent actions ; Time to answer audit queries
gap: Prompt-only guardrails ; Shared service accounts ; Default allow for new tools
