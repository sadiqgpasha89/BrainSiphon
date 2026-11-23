# Energy & Utilities, part 1 (use cases 1-21): grid operations and reliability, forecasting and markets, asset health and inspection
# Vendor-neutral. Models advise above the protection and control layer, no model output issues a switching command, customer consumption data is minimised and a named operator or engineer approves any change to the network.
== distribution-outage-prediction | Distribution Outage Prediction | tabular | batch | foundational | a=1 k=40
obj: Predict the chance of outages on each feeder section over the next days from weather, vegetation, asset age and history, so crews and spares are pre-positioned before storms.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Risk score per feeder section for 72 hours ahead ; Calibrated probabilities for crew planning ; Refresh every 3 hours during weather alerts ; Explanations name the top drivers ; 400K feeder sections
sn: Label | Outages with confirmed cause and duration from the outage log | Customer calls | Calls cluster around a few sections and miss quiet failures
sn: Weather | Forecast wind, ice and lightning at the section | Observed weather after the fact | Planning needs the forecast not the past
sn: Use | Crew and spares pre-positioning | A single network-wide alert | Planners need ranked areas
sig: Forecast wind gust and lightning | forecast gust speed and strike density at the section | Main storm driver | Interpolated to sections
sig: Vegetation density near the line | canopy cover within the corridor | Tree contact risk | From imagery or survey
sig: Asset age and condition | age of conductors, poles and switches | Failure propensity | From the asset register
sig: Past outage count | outages on the section in the last three years | Persistent weak points | Excludes planned work
noise: Feeder name | an identifier
noise: Substation code alone | an identifier
noise: Report author | irrelevant
base: Historical outage rate per section scaled by the weather severity class, because planners use a similar rule.
prod: A calibrated gradient boosting model on weather forecast, vegetation and asset features per section with storm-scenario scoring and a ranked crew pre-positioning list.
pipe: Weather forecast ingestion @ forecast feeds ; Section feature build @ GIS and asset joins ; Outage risk model @ gradient boosting ; Calibration @ isotonic fit ; Ranked section list @ ADMS console ; Planner review @ storm room ; Outcome comparison @ post-event
edge: Unprecedented storm | the event is outside the training range | Wider intervals and a rule-based severity floor
edge: Asset data gap | the register lacks the pole age | Missing flag and a regional prior
edge: Forecast miss | the storm track shifts | Frequent refresh and a scenario view
off: Rank accuracy of risky sections ; Calibration by storm class ; Lead time of useful warnings
on: Customer minutes lost ; Restoration time ; Crew mobilisation accuracy
gap: Using customer calls as labels ; Scoring only after the event ; Uncalibrated storm scores

== feeder-fault-location | Feeder Fault Location from Waveforms | time-series | seconds | advanced | a=20 k=6
obj: Estimate the location of a fault on a distribution feeder from relay and meter waveforms so crews drive to the right span first and restoration is faster.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Candidate span list within 30 s of the fault ; Top three spans cover the true location at least 85% of the time ; Works with sparse measurement points ; Confirmed locations feed back ; 5K feeders
sn: Truth | Locations confirmed by crews after repair | Impedance estimates alone | Physics estimates drift with the feeder model
sn: Model | A hybrid of physics and learning | A learned map with no network model | Topology changes break pure learning
sn: Output | A ranked list of spans with distance | One point | Crews need a search area
sig: Apparent impedance to the fault | impedance computed from relay phasors | Distance estimate | Needs the feeder model
sig: Fault type and phases | type of fault from relay data | Narrows the cause | From relay events
sig: Downstream meter voltage sags | sag depth at smart meters | Branch isolation | Time aligned
sig: Switching state | open and closed devices at the fault time | Topology context | From ADMS
noise: Relay serial number | an identifier
noise: Crew name | irrelevant
noise: Event log wording | formatting
base: Impedance-based distance estimation on the feeder model, because protection engineers use it today.
prod: A hybrid physics and learned model that corrects impedance estimates with meter sag patterns and topology state to produce a ranked span list, retrained on confirmed locations.
pipe: Relay and meter waveform capture @ protection and AMI data ; Event alignment @ time synchronisation ; Topology lookup @ ADMS model ; Distance model @ hybrid estimator ; Span ranking @ GIS join ; Crew dispatch hint @ outage console ; Confirmation feedback @ work orders
edge: Wrong topology | the model has the wrong switch state | Check the live state and flag stale models
edge: Intermittent fault | the fault clears and recurs | Event grouping and a repeat-fault view
edge: Sparse meters | few sag measurements exist | Wider candidate lists with a stated confidence
off: Top-three coverage on confirmed faults ; Distance error ; Latency from event to list
on: Patrol time per fault ; Restoration time ; Repeat faults on the same span
gap: Learning without a network model ; Single-point output ; Ignoring topology state

== volt-var-optimisation | Volt-VAR Optimisation Advisor | reinforcement-learning,time-series | seconds | advanced | a=12 k=6
obj: Recommend capacitor, regulator and inverter settings that keep voltage in range and reduce losses, as advice to the operator within protection limits.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Voltage limits enforced in a rules layer outside the model ; Operator approves each settings change ; Recommendation every 5 minutes ; Simulation test before live use ; 800 feeders
sn: Limits | Hard voltage and loading limits in code | A learned limit | A learned limit can fail in a rare state
sn: Model | A power flow model with learned corrections | A pure black box | Operators need to see why a setting is safe
sn: Evaluation | Matched periods with similar load and weather | Before and after totals | Load changes dominate raw comparisons
sig: Measured voltage profile | voltages along the feeder | Violation risk | From meters and sensors
sig: Load and DER forecast | net load and solar output forecast | Look-ahead | From the forecasts
sig: Device state and wear | switch counts of capacitors and regulators | Equipment life | From device logs
sig: Loss estimate | modelled technical losses | Objective | From the power flow
noise: Device name | an identifier
noise: Operator name | irrelevant
noise: Timestamp precision | an artefact
base: Fixed capacitor schedules by season and time of day, because they are the standard practice.
prod: A model-predictive advisor on a power flow model with learned load corrections, a safety clip in rules and a human approval step with simulation previews.
pipe: Telemetry and meter voltages @ SCADA and AMI ; State estimate @ power flow ; Load and DER forecast @ time-series model ; Setting optimiser @ constrained solver ; Safety clip @ rules ; Operator advice display @ ADMS ; Savings evaluation @ matched periods
edge: Reverse power flow | solar export raises voltage | Inverter setting recommendations and limits
edge: Sensor error | a bad voltage reading misleads the model | Bad data detection and fallbacks
edge: Device failure | a capacitor bank does not switch | Command feedback checks and a re-plan
off: Predicted versus measured voltage ; Safety clip rate ; Loss estimate error
on: Voltage violations ; Technical losses ; Device switching count
gap: Learned safety limits ; Raw before-and-after savings ; Ignoring DER output

== der-hosting-capacity-estimation | DER Hosting Capacity Estimation | tabular,graph | batch | advanced | a=0.5 k=8
obj: Estimate how much solar, storage or charging load each feeder location can host without breaching limits, so connection offers are faster and upgrades are targeted.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Capacity by node with a confidence range ; Conservative when uncertain ; Recompute on network changes ; Planner can override ; 2M network nodes
sn: Truth | Full power flow studies on sampled locations | Rules of thumb | Rules ignore the local network
sn: Speed | A fast surrogate checked against full studies | Full studies for every query | Studies are too slow for screening
sn: Safety | A conservative bound with a margin | A point estimate | Over-estimating capacity causes violations
sig: Upstream impedance | electrical distance to the substation | Voltage rise | From the network model
sig: Existing DER and load profile | installed generation and daily load shape | Headroom | From connection records
sig: Transformer and conductor rating | thermal limit of nearby equipment | Thermal limit | From the asset register
sig: Protection constraints | fault level and device settings | Safety limit | From protection data
noise: Applicant name | irrelevant
noise: Postcode text | an identifier
noise: Request date | not a network property
base: Fixed screening rules such as a share of transformer rating, because they are the common first check.
prod: A graph neural surrogate of power flow trained on thousands of full studies with conservative quantile bounds, used for screening with full studies for borderline cases.
pipe: Network model export @ GIS and ADMS ; Scenario generation @ power flow runs ; Surrogate training @ graph neural network ; Conservative bounds @ quantile heads ; Hosting map @ planning portal ; Planner review @ network planning ; Validation @ sampled full studies
edge: Network change | a new feeder tie alters the map | Trigger recomputation on topology edits
edge: Clustered requests | many connections in one area | Queue-aware capacity with cumulative effects
edge: Poor model data | the network model has errors | Data quality flags that lower confidence
off: Violation rate when using the bound ; Error against full studies ; Coverage of the quantile
on: Connection offer time ; Unnecessary studies ; Voltage or thermal violations after connection
gap: Point estimates with no margin ; Ignoring queued connections ; No checks against full studies

== grid-state-estimation-surrogate | Fast Power Flow Surrogate for Contingency Screening | graph,tabular | seconds | staff-principal | a=2 k=4
obj: Screen thousands of network contingencies quickly with a learned power flow surrogate and send the dangerous ones to the full solver so operators see risks sooner.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Surrogate screening within 5 s for 10K contingencies ; Recall of dangerous contingencies above 99% ; Full solver verifies every flagged case ; Never replaces the certified solver ; 20K buses
sn: Role | A screen that prioritises | A replacement for the solver | Operators need certified results for decisions
sn: Metric | Recall of dangerous cases at a fixed review budget | Average error | Missed dangerous cases are the cost
sn: Data | Cases across seasons and outage states | A typical day | Rare states hide the failure
sig: Bus injections and topology | load, generation and switch states | Input state | From the state estimator
sig: Line loading margin | distance of each element to its limit | Risk level | From the solver
sig: Voltage margin | distance of bus voltages to limits | Risk level | From the solver
sig: Contingency type | line, transformer or generator loss | Case class | From the contingency list
noise: Case file name | an artefact
noise: Operator name | irrelevant
noise: Solver run id | an identifier
base: Run the full solver on every contingency with a reduced list based on past experience, because it is the certified approach.
prod: A graph neural surrogate trained on solver outputs that ranks contingencies by risk and routes the top set and uncertain cases to the full solver with an audit trail.
pipe: State estimate intake @ EMS ; Contingency list build @ rules ; Surrogate scoring @ graph neural network ; Risk ranking @ threshold policy ; Full solver verification @ certified solver ; Operator display @ EMS console ; Missed-case review @ monthly
edge: Unseen topology | an outage state outside training | Out-of-range detector and full solver fallback
edge: Rare overload | the dangerous case is uncommon | Recall-focused thresholds and hard negative mining
edge: Solver mismatch | the surrogate disagrees with the solver | Always trust the solver and log the gap
off: Recall of dangerous contingencies ; Rank error at the top ; Speed-up factor
on: Screening time ; Dangerous cases found early ; Solver compute cost
gap: Replacing the certified solver ; Average error as the headline ; No out-of-range detector

== control-room-operator-copilot | Control Room Operator Copilot | llm-agents,nlp | seconds | advanced | a=0.1 k=60
obj: Help control-room operators find procedures, similar past events and switching sheets during an incident by answering from controlled documents and giving the evidence, without issuing or preparing live commands.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Answers come from controlled procedures with revision numbers ; The copilot cannot reach any control system ; Switching steps shown verbatim never paraphrased ; Every answer cites its source ; Answer within 5 s
sn: Source | The current controlled procedure | Model memory | A wrong step can cause an outage or injury
sn: Scope | Information and recall | Operational commands | Command authority stays with the operator and the system
sn: Evidence | A citation and revision per answer | An unsourced summary | Operators must trust and verify quickly
sig: Procedure revision status | whether the document is current | Prevents old steps | From document control
sig: Event similarity | similarity to past incidents | Useful context | Embedding and metadata
sig: Question intent | procedure, equipment data or history | Routing | Classified
sig: Operator role | operator, supervisor or planner | Access gating | From identity
noise: Operator name | irrelevant
noise: Time of day | irrelevant
noise: Console model | irrelevant
base: Keyword search over the procedure library and a shared drive, because that is what operators use now.
prod: A retrieval-grounded assistant over controlled procedures and event history with verbatim switching sheets, revision checks and no connection to control systems, plus a feedback loop to procedure owners.
pipe: Question intake @ operator console ; Role and context check @ identity ; Hybrid retrieval @ procedure index ; Answer with citation @ LLM with controlled content ; Verbatim step insertion @ document store ; Feedback to owners @ document control ; Usage review @ monthly
edge: Superseded procedure | an old document is cached | Revision checks and cache expiry
edge: Ambiguous equipment name | two substations share a name | Ask which one and list the options
edge: Gap in procedures | no document covers the situation | Say so and escalate to the supervisor
off: Answer faithfulness on audited questions ; Retrieval accuracy ; Verbatim step accuracy
on: Time to find a procedure ; Operator escalations for lookups ; Procedure gaps found
gap: Paraphrasing switching steps ; Any link to control systems ; Answers without revision control

== restoration-switching-recommendation | Restoration Switching Recommendation | reinforcement-learning,graph | seconds | advanced | a=5 k=4
obj: Propose switching sequences that restore as many customers as quickly as possible after a fault within loading and protection limits, for the operator to review and execute.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Every proposed sequence passes a power flow and protection check ; The operator reviews and executes ; Proposal within 20 s ; Safety isolation steps included ; 3K feeders
sn: Goal | Customers restored weighted by priority and time | Number of switches | Fewer switches do not restore more customers
sn: Safety | Isolation and protection checks as hard constraints | Learned preferences | A learned rule may skip a safety step
sn: Authority | The operator decides and executes | Automatic switching | Switching affects crews and the public
sig: Faulted section and isolation points | location of the fault and the nearest switches | Defines the plan | From fault location
sig: Alternate supply capacity | spare capacity on neighbouring feeders | Feasibility | From the power flow
sig: Customer priority | critical customers on each section | Ordering | From the register
sig: Switch availability | remote or manual operation and crew position | Time to restore | From ADMS
noise: Operator name | irrelevant
noise: Event number | an identifier
noise: Substation name alone | an identifier
base: The standard restoration plan for each feeder prepared by planners, because it is the validated fallback.
prod: A search and learned-heuristic planner on the network graph that checks each plan with power flow and protection rules and presents ranked sequences with the customers restored and timings.
pipe: Fault and state intake @ ADMS ; Graph search @ planner ; Plan scoring @ learned heuristic ; Power flow and protection check @ solver ; Ranked plans @ operator display ; Operator execution @ switching order ; Result logging @ audit store
edge: Stale switch state | the network model is not current | State freshness checks and a block on old data
edge: Cascading overload | a plan overloads a neighbour | Loading checks and secondary plans
edge: Manual switch delay | the crew cannot reach the switch | Crew-aware timings and alternatives
off: Customers restored in simulated faults ; Constraint violation rate ; Plan time
on: Customer minutes interrupted ; Switching steps ; Plans accepted by operators
gap: Learned safety checks ; Automatic execution ; Stale network state

== short-term-load-forecasting | Short-Term Load Forecasting | time-series | batch | foundational | a=96 k=1
obj: Forecast electricity demand by substation and system for the next days at 15-minute resolution so dispatch, reserves and purchases are planned against realistic loads.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: 15-minute resolution for 7 days ahead ; Quantile output for peak risk ; Consistent totals across the hierarchy ; Daily refresh with intraday updates ; 3K substations
sn: Driver | Weather and calendar effects | History only | Temperature and holidays move demand
sn: Peak | Quantiles around peaks | Mean forecast | Capacity and cost depend on the peak
sn: Hierarchy | System, region and substation totals consistent | Independent forecasts | Sums must agree for operations
sig: Temperature forecast | forecast temperature and humidity | Heating and cooling load | Forecast not actual
sig: Calendar and holiday effects | day type, school terms and holidays | Load shape | From the calendar
sig: Same time last week | load at the same time in prior weeks | Anchor | Aligned on local time
sig: Behind-the-meter solar estimate | estimated solar generation reducing net load | Net load shape | From the solar forecast
noise: Substation name | an identifier
noise: Meter reading format | an artefact
noise: Report author | irrelevant
base: Seasonal naive on the last week's load with a temperature adjustment, because operators use a similar rule.
prod: A gradient boosting or neural forecaster with weather and calendar covariates, quantile outputs, hierarchical reconciliation and a peak alert for control rooms.
pipe: SCADA load ingestion @ historian ; Grid cleaning and gap fill @ batch ; Feature build @ weather and calendar joins ; Grid quantile forecast @ model ; Grid reconciliation @ hierarchical step ; Peak alert @ rules ; Grid accuracy tracking @ weekly
edge: Heatwave | demand moves beyond history | Wider intervals and an extreme weather model
edge: Load transfer | a switching change moves load | Topology-aware adjustment
edge: Telemetry outage | load data is missing for hours | Imputation limits and a flag
off: Weighted quantile loss ; Peak error ; Coverage of intervals
on: Forecast bias at peak ; Reserve cost ; Dispatch deviations
gap: Mean-only forecasts ; Ignoring behind-the-meter solar ; Inconsistent hierarchy

== solar-generation-forecasting | Solar Generation Forecasting | time-series,computer-vision | batch | advanced | a=96 k=2
obj: Forecast solar generation per plant and for distributed rooftop fleets from irradiance forecasts, satellite cloud motion and plant telemetry so balancing and curtailment decisions improve.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Forecasts at 15-minute resolution up to 48 hours ; Nowcasts for the next 4 hours from satellite ; Quantile output ; Clipped to plant capacity ; 20K plants
sn: Horizon | Different models for nowcast and day ahead | One model for all horizons | Cloud motion matters near term and weather models matter later
sn: Capacity | Available capacity after curtailment and outages | Nameplate | Nameplate overstates what plants can deliver
sn: Fleet | Aggregated rooftop estimates from sampled systems | Per-home forecasts | Individual homes are not needed and add privacy risk
sig: Forecast irradiance | numerical weather model irradiance | Day-ahead driver | From the weather feed
sig: Satellite cloud motion | cloud displacement from images | Nowcast driver | Computed from imagery
sig: Plant availability | inverter and string outages | Capacity limit | From plant telemetry
sig: Panel soiling and age | derating by soiling and age | Efficiency | From plant history
noise: Plant owner name | irrelevant
noise: Inverter serial | an identifier
noise: Report format | an artefact
base: Clear-sky output scaled by the day-ahead cloud forecast, because it is the standard approach.
prod: A blended forecaster with a satellite-based nowcast model and a gradient boosting day-ahead model on weather forecasts and plant availability, with quantiles and capacity clipping.
pipe: Weather and satellite ingestion @ forecast feeds ; Cloud motion nowcast @ vision model ; Day-ahead model @ gradient boosting ; Blend by horizon @ stacking ; Capacity clipping @ plant status ; Forecast publish @ market and control systems ; Accuracy tracking @ daily
edge: Fast cloud edge | ramps change within minutes | Nowcast updates and ramp alerts
edge: Plant outage | capacity drops without notice | Telemetry-driven availability updates
edge: Snow cover | panels produce nothing | Snow flags from weather and plant data
off: Skill against persistence ; Ramp detection ; Quantile coverage
on: Imbalance cost ; Curtailment ; Forecast error at ramps
gap: Nameplate capacity as truth ; One model for all horizons ; Ignoring cloud motion

== wind-power-forecasting | Wind Power Forecasting | time-series | batch | advanced | a=96 k=2
obj: Forecast wind farm output from weather forecasts, turbine status and local measurements so schedules, reserves and bids reflect real power.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: 15-minute resolution for 72 hours ahead ; Quantile output for ramps ; Accounts for turbine availability and curtailment ; Refresh when new weather runs arrive ; 1K wind farms
sn: Power curve | A learned curve per turbine group with wake effects | The manufacturer curve | Real turbines deviate with wake and wear
sn: Error | Ramp timing and size | Mean error | Mistimed ramps cause imbalance
sn: Availability | Real turbine status | All turbines available | Maintenance and curtailment cut output
sig: Wind forecast at hub height | forecast speed and direction | Main driver | From weather models
sig: Turbine availability | number of turbines operating | Capacity | From SCADA
sig: Wake and direction effects | direction-dependent losses | Output shape | Learned
sig: Curtailment signals | grid or market curtailment orders | Output limit | From the operator
noise: Turbine name | an identifier
noise: Report author | irrelevant
noise: Log timestamp format | an artefact
base: The manufacturer power curve applied to the forecast wind speed, because it is the quick benchmark.
prod: A gradient boosting or neural model on multi-model weather ensembles with learned power curves, availability inputs and quantile outputs focused on ramps.
pipe: Weather ensemble ingestion @ forecast feeds ; Site feature build @ hub height interpolation ; Power model @ gradient boosting ; Availability and curtailment filter @ rules ; Quantile output @ model ; Publish to scheduling @ market systems ; Ramp review @ daily
edge: Storm cut-out | turbines shut down at high wind | Cut-out features and a storm flag
edge: Icing | blades lose output in cold humid weather | Icing indicators from weather and turbine data
edge: Model run delay | the weather run arrives late | Fallback to the previous run with wider bands
off: Error against persistence ; Ramp detection ; Quantile coverage
on: Imbalance cost ; Reserve held ; Forecast error at ramps
gap: Manufacturer curve only ; Ignoring availability ; Mean error as the headline

== day-ahead-price-forecasting | Day-Ahead Price Forecasting | time-series | batch | advanced | a=24 k=1
obj: Forecast hourly day-ahead power prices with intervals from fuel prices, load and renewable forecasts so bids and hedges are planned with uncertainty.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Hourly forecast for the next day ; Prediction intervals and spike probabilities ; Forecast published before the bid deadline ; Daily run for 30 zones
sn: Spikes | A separate model for price spikes | A single mean model | Spikes drive profit and risk
sn: Inputs | Forecast load, wind, solar and gas price | Past prices only | Fundamentals explain the price
sn: Use | Bid support with intervals | A trading signal on its own | Prices depend on rival behaviour that cannot be seen
sig: Residual load forecast | demand minus wind and solar | Main driver | From the forecasts
sig: Gas and carbon prices | fuel and allowance prices | Marginal cost | From market data
sig: Interconnector flows | cross-border flow forecasts | Supply shifts | From transmission operators
sig: Same hour last week price | prices at the same hour in prior weeks | Anchor | Local time aligned
noise: Trader name | irrelevant
noise: Report channel | an artefact
noise: Weather station name | an identifier
base: Naive price from the same hour last week, because it is the standard benchmark.
prod: A quantile gradient boosting or neural model on fundamentals with a spike probability head and scenario ensembles feeding the bid optimiser.
pipe: Market and fundamentals ingestion @ market data feeds ; Feature build @ lags and forecasts ; Quantile forecast @ model ; Spike probability @ classifier head ; Scenario ensemble @ simulation ; Publish to bidding @ trading system ; Accuracy tracking @ daily
edge: Fuel price shock | the cost structure changes suddenly | Rapid refresh and regime flags
edge: Market rule change | the pricing rule is revised | Versioned features and a re-fit
edge: Data delay | a forecast input arrives late | Fallback inputs and stale flags
off: Pinball loss ; Spike recall at fixed precision ; Interval coverage
on: Bid value against the baseline ; Hedging cost ; Forecast error at peaks
gap: Mean-only forecasts ; Ignoring spikes ; Using past prices alone

== intraday-imbalance-prediction | Intraday Imbalance Risk Prediction | time-series | seconds | advanced | a=96 k=2
obj: Predict the system imbalance direction and price risk for coming settlement periods so balancing responsible parties adjust positions before penalties hit.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Direction forecast for the next 8 periods ; Calibrated probability of a penalty price ; Update every 5 minutes ; Alerts only above a cost threshold ; 20 market zones
sn: Label | Realised settlement outcomes | Forecast errors alone | The cost is what the market charges
sn: Timing | Features known before gate closure | Data available after the fact | Leakage makes the model useless live
sn: Action | A position adjustment advice | An alert | Traders need a recommended size and cost
sig: System frequency and area control error | measured frequency deviation and error | Direction signal | Live
sig: Renewable forecast revisions | change in wind and solar forecasts | Position error | From forecasts
sig: Recent imbalance prices | prices in the last periods | Persistence | From settlement
sig: Outage and ramp events | generator trips and scheduled ramps | Shock | From the market feed
noise: Trader name | irrelevant
noise: Report format | an artefact
noise: Weather station id | an identifier
base: Persistence of the last observed imbalance direction, because it is the simple benchmark.
prod: A calibrated classifier and quantile model on live system signals with strict time-of-availability features and cost-aware alerts for trading desks.
pipe: Live system data intake @ market feeds ; Feature build with availability checks @ stream processing ; Direction classifier @ gradient boosting ; Price quantile model @ quantile regression ; Cost-aware alert @ rules ; Trader display @ trading console ; Outcome tracking @ settlement
edge: Market rule change | imbalance pricing is revised | Versioned data and a re-fit
edge: Late data | the live feed lags | Staleness checks and no-alert fallbacks
edge: Extreme event | a large generator trip | Scenario alerts and manual review
off: Direction accuracy by period ; Calibration of penalty probability ; Alert precision at the cost threshold
on: Imbalance cost ; Alerts acted on ; Position adjustment value
gap: Using data after gate closure ; Alerting with no cost threshold ; Forecast error as the label

== bidding-strategy-optimisation | Bidding Strategy Optimisation | reinforcement-learning,time-series | seconds | staff-principal | a=24 k=4
obj: Recommend bid curves for generation and storage portfolios that maximise expected margin under price uncertainty and physical constraints, as advice for traders to approve.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Physical limits such as ramp and capacity enforced outside the model ; Traders approve every bid ; Risk limits and exposure caps in code ; Market rules compliance checks ; Recommendations in 60 s
sn: Constraint | Physical and market rules as hard limits | Learned limits | Infeasible or non-compliant bids are costly
sn: Evaluation | Backtests with market impact assumptions | Historical price replay only | A large bid changes the price
sn: Control | Human approval and caps | Autonomous bidding | Market conduct and exposure need accountable humans
sig: Price scenario distribution | scenario set from the price model | Uncertainty input | From forecasts
sig: Unit availability and ramp limits | physical limits per unit | Feasibility | From plant status
sig: Storage state of charge | stored energy and cycling limits | Dispatch limit | From telemetry
sig: Position and exposure | current open positions | Risk limit | From the trading system
noise: Trader name | irrelevant
noise: Market notice wording | an artefact
noise: Terminal id | an identifier
base: A rule-based bidding policy at marginal cost plus a margin, because it is the trader benchmark.
prod: A stochastic optimisation with scenario trees and a learned value function, hard constraints and compliance checks in rules, and a trader approval step with explanations and risk views.
pipe: Scenario generation @ price and renewable models ; Constraint model @ unit and storage limits ; Bid optimiser @ stochastic programme ; Compliance and risk filter @ rules ; Trader review @ trading console ; Bid submission @ market gateway ; Post-trade analysis @ daily
edge: Market rule update | bid formats change | Versioned rules and block-on-error checks
edge: Model overconfidence | the scenario set is too narrow | Stress scenarios and wider bounds
edge: Unit outage | the plan assumes capacity that is gone | Live availability checks before submission
off: Backtest margin with market impact ; Constraint violation rate ; Scenario calibration
on: Margin against the rule-based baseline ; Exposure limit breaches ; Bids rejected by the market
gap: Autonomous bidding ; Replay-only evaluation ; Learned physical limits

== energy-market-briefing-agent | Energy Market Briefing Agent | llm-agents,nlp | seconds | advanced | a=0.05 k=60
obj: Prepare daily briefings for traders and planners from market notices, outage reports, weather and price data, with every statement linked to its source and numbers computed by tools.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every claim cites a source ; Figures computed by tools not by the model ; The agent has read-only access ; Briefing ready by 06:30 daily ; Covers 30 markets
sn: Source | Official market notices and operator data | Social posts and rumours | Rumours move positions wrongly
sn: Numbers | Computed by deterministic tools | Model arithmetic | Models make unit and arithmetic errors
sn: Output | A short brief with what changed and what to watch | A feed of everything | Traders need priority not volume
sig: Notice relevance | whether the notice touches a position or asset | Priority | From the portfolio
sig: Source reliability | past accuracy of the source | Weighting | Maintained list
sig: Change since yesterday | change in key figures from the previous day | What is new | From data
sig: Outage and weather impact | outage and storm flags that affect supply | Risk | From operators and weather
noise: Notice length | not importance
noise: Headline wording | not impact
noise: Report template colour | irrelevant
base: Analysts reading market notices and building a morning email by hand, because it is the current routine.
prod: An agent with retrieval and calculation tools that drafts a ranked briefing with citations and flags items touching positions, reviewed by an analyst before it is sent.
pipe: Source collection @ market and news feeds ; Relevance filter @ portfolio lookup ; Calculation tools @ governed APIs ; Briefing draft @ LLM with citations ; Analyst review @ editorial step ; Distribution @ email and chat ; Feedback capture @ analytics
edge: Conflicting reports | two sources disagree | Show both with reliability and flag the conflict
edge: Late notice | a notice appears after the briefing | Update alert for affected positions
edge: Data outage | a price feed is missing | State the gap and avoid filling it
off: Figure accuracy against recalculation ; Citation coverage ; Relevance precision
on: Analyst preparation time ; Missed notices ; Briefings edited by reviewers
gap: Model-computed figures ; Claims without sources ; Rumour as input

== transformer-health-index | Transformer Health Index | tabular | batch | foundational | a=0.5 k=8
obj: Combine age, loading, oil tests and maintenance history into an explainable health index per transformer so replacement and refurbishment are planned in the right order.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}
con: Index with the top contributing factors ; Calibrated failure probability within 5 years ; Engineers can override with notes ; Quarterly refresh for 300K transformers
sn: Label | Failures and condition findings from teardown and repairs | Age alone | Age is a weak guide to condition
sn: Output | A ranked list with reasons | A single score | Engineers need the reason to act
sn: Risk | Failure probability times consequence | Probability alone | Consequence differs by location
sig: Oil test results | dissolved gas and moisture values | Condition | From lab tests
sig: Loading history | peak and average loading ratio | Thermal ageing | From SCADA
sig: Age and manufacturer family | years in service and family | Prior | From the register
sig: Maintenance and fault history | past repairs and through-faults | Stress | From work orders
noise: Asset tag | an identifier
noise: Inspector name | irrelevant
noise: Photo count | an artefact
base: An age-based replacement list, because many utilities start there.
prod: A survival or gradient boosting model on condition and loading data with calibrated probabilities and consequence weighting, plus explanations and engineer overrides tracked.
pipe: Condition data extraction @ asset and lab systems ; Feature build @ aggregated histories ; Failure probability model @ survival analysis ; Consequence weighting @ rules ; Ranked list @ asset management tool ; Engineer review @ planning meeting ; Outcome tracking @ annual
edge: Missing oil tests | tests are years old | Staleness flags and wider intervals
edge: Rare failure | too few failures for the family | Pooling across families with priors
edge: Overridden score | an engineer disagrees | Override capture and review
off: Calibration of five-year probability ; Rank accuracy against failures ; Agreement with engineers
on: In-service failures ; Replacement cost ; Planned versus emergency replacements
gap: Age-only ranking ; Probability without consequence ; Unexplained scores

== transformer-dga-fault-classification | Transformer DGA Fault Classification | tabular,time-series | batch | advanced | a=1 k=6
obj: Classify the likely fault type in a transformer from dissolved gas trends and online monitors so the right inspection or outage is planned.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Fault class with confidence ; Trend and rate-of-change alerts ; Engineers confirm before action ; Handles lab and online monitor data ; 100K transformers
sn: Label | Faults confirmed by inspection or teardown | Rule-based gas ratios | Ratio methods mislabel mixed faults
sn: Trend | Gas generation rate over time | A single sample | The rate shows how fast the fault grows
sn: Action | A recommended inspection with urgency | A fault name | Planners need what to do and by when
sig: Gas concentrations | levels of key gases | Fault type | From lab or monitor
sig: Gas generation rate | change per month in key gases | Urgency | Time series
sig: Load and temperature context | loading and oil temperature | Confounder | From SCADA
sig: Past DGA classification | previous results and actions | Context | From the asset system
noise: Lab name | an identifier
noise: Sample bottle id | an identifier
noise: Report author | irrelevant
base: Standard gas ratio methods and limits from industry guides, because engineers know and trust them.
prod: A classifier combining ratio features, gas rates and loading context with confidence and abstention, checked against the standard method and routed to engineer review.
pipe: Gas data intake @ lab and monitor systems ; Cleaning and alignment @ time series ; Feature build @ ratios and rates ; Fault classifier @ gradient boosting ; Standard method check @ rules ; Engineer review @ asset queue ; Outcome logging @ inspection results
edge: Sampling error | a contaminated sample shows odd gases | Outlier checks and resampling advice
edge: Oil treatment | gases drop after degassing | Treatment events in features
edge: Mixed faults | classes overlap | Multi-label output and abstention
off: Class accuracy on confirmed faults ; Calibration ; Lead time of useful alerts
on: Faults found before failure ; Unnecessary outages ; Inspection cost
gap: Ratio methods alone ; Single-sample decisions ; Ignoring treatment events

== line-inspection-drone-defects | Line Inspection Drone Defect Detection | computer-vision | batch | advanced | a=50 k=500
obj: Detect damaged insulators, corroded hardware, cracked crossarms and missing parts in drone and helicopter imagery of lines and poles so crews target the real defects.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Defect list per structure with the image evidence ; Recall above 90% for critical defects ; Inspector confirms before a work order ; Images retained with model version ; 2M images per month
sn: Label | Defects confirmed by qualified inspectors | Image tags from the vendor | Vendor tags vary in quality
sn: Priority | Defect severity and structure criticality | Detection count | Counts do not rank urgency
sn: Coverage | Images with the full structure visible | Any image | Partial views miss the defect
sig: Defect class scores | model score per defect type | Core signal | Calibrated per class
sig: Image quality | focus, lighting and distance | Reliability | From the image
sig: Structure criticality | voltage level and customers served | Priority | From GIS
sig: Defect history | previous findings on the structure | Trend | From work orders
noise: Drone operator name | irrelevant
noise: Flight id | an identifier
noise: File name | an artefact
base: Manual image review by inspectors, because it is the current method and the quality reference.
prod: An object detection model on structure crops with severity scoring, calibrated per defect class, an inspector review queue and a feedback loop to retraining.
pipe: Image ingestion @ drone and helicopter surveys ; Structure matching @ GIS join ; Defect detection @ vision model ; Severity and criticality scoring @ rules ; Inspector review @ web tool ; Work order proposal @ asset system ; Feedback and retraining @ monthly
edge: Poor image | glare hides the component | Quality filter and a re-fly request
edge: New hardware type | the model has not seen it | Out-of-distribution flag and expert labels
edge: Seasonal change | foliage and light alter appearance | Season-aware validation
off: Recall by defect class and severity ; Precision at inspector review ; Calibration
on: Inspector review time ; Defects found per survey ; Failures from missed defects
gap: Using detection count as priority ; Vendor tags as labels ; Ignoring image quality

== substation-thermal-imaging-anomaly | Substation Thermal Imaging Anomaly Detection | computer-vision | batch | foundational | a=10 k=100
obj: Find hot spots on connectors, breakers and transformers in thermal images and fixed camera feeds, rank them by temperature rise and load, and schedule repairs.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Hot spot list with temperature rise relative to similar parts ; Load-adjusted severity ; Technician confirms before outage planning ; Weekly scan for 5K substations
sn: Reference | Temperature rise against similar phases and load | Absolute temperature | Ambient and load change temperatures
sn: Severity | Rise adjusted for load | Rise alone | A hot spot at low load is worse than it looks
sn: Action | A ranked repair list | An alert flood | Crews need priorities
sig: Temperature difference between phases | difference between similar parts | Anomaly | From the image
sig: Load at capture time | current at the time of the image | Normalisation | From SCADA
sig: Ambient and wind | outdoor temperature and wind speed | Correction | From weather
sig: Component type and history | type and past findings | Context | From the register
noise: Camera model | an identifier
noise: Operator name | irrelevant
noise: Image file name | an artefact
base: A fixed temperature-rise threshold per component type, because standards define it.
prod: A detector with load and ambient normalisation that compares similar phases and ranks hot spots by load-adjusted severity with a technician confirmation step.
pipe: Thermal image capture @ cameras and handheld scans ; Component detection @ vision model ; Normalisation @ load and weather join ; Hot spot scoring @ rules and model ; Ranked repair list @ work management ; Technician confirmation @ field app ; Outcome tracking @ re-scan
edge: Reflection | sun glare causes a false hot spot | Reflection filters and angle metadata
edge: Low load scan | problems are hidden at low load | Load flags and re-scan prompts
edge: Camera drift | the camera is not calibrated | Calibration records and checks
off: Recall of confirmed hot spots ; False alarms per scan ; Severity rank accuracy
on: Failures from hot connections ; Unplanned outages ; Repair backlog by severity
gap: Absolute temperature thresholds ; Ignoring load at capture ; Alerts with no ranking

== wind-turbine-gearbox-anomaly | Wind Turbine Gearbox Anomaly Detection | time-series | seconds | advanced | a=1 k=10
obj: Detect early gearbox and bearing deterioration in wind turbines from SCADA and vibration data so repairs are planned before major component failures.
loss: \mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2
con: Baselines per turbine and operating state ; False alarms under 1 per turbine per quarter ; Alerts include the component and trend ; Weekly run for 8K turbines
sn: Baseline | Normal behaviour per operating state and season | A global limit | Temperature and load vary with wind and season
sn: Validation | Replayed past failures with lead time | Alarm counts | Counts do not show detection
sn: Action | A planned crane and parts booking | An alert | Component swaps need long lead times
sig: Gearbox temperature residual | difference between measured and expected temperature | Wear signal | State-conditioned
sig: Vibration spectral features | energy at gear and bearing frequencies | Fault signal | From condition monitoring
sig: Oil particle and filter data | particle counts and filter pressure | Debris | From sensors
sig: Operating state | power, speed and ambient temperature | Context | From SCADA
noise: Turbine name | an identifier
noise: Alarm text | vendor wording
noise: Maintenance crew name | irrelevant
base: Alarm limits from the turbine manufacturer on temperature and vibration, because they are the default.
prod: A state-conditioned residual model per turbine with trend tests, vibration feature checks and a lead-time estimate feeding crane and parts planning.
pipe: SCADA and vibration capture @ turbine controllers ; State segmentation @ signal processing ; Residual model @ normal-behaviour model ; Trend test @ change detection ; Alert and lead time @ asset console ; Maintenance planning @ work management ; Feedback @ inspection findings
edge: Curtailment | operating state is unusual for weeks | State-aware baselines
edge: Sensor replacement | the baseline shifts | Change events reset the baseline
edge: Sparse failures | few labelled failures exist | Replayed seeded faults and expert review
off: Detection lead time on past failures ; False alarms per turbine-quarter ; Component localisation accuracy
on: Major component failures ; Crane cost ; Lost generation
gap: Global alarm limits ; Counting alarms ; No replay of past failures

== asset-replacement-prioritisation | Asset Replacement Prioritisation | tabular,reinforcement-learning | batch | advanced | a=0.1 k=6
obj: Rank assets for replacement or refurbishment under a capital budget by balancing failure risk, consequence and cost across the network.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Budget and outage-window limits respected ; Planners can lock or exclude assets ; Every ranking shows its drivers ; Plans for a 10-year horizon ; 2M assets
sn: Objective | Risk reduced per unit cost | Highest risk first | Cheap fixes can reduce more risk per dollar
sn: Constraint | Crew, outage and supply chain limits | Pure ranking | An optimal list can be impossible to execute
sn: Evidence | Risk model with explained drivers | A black box | Regulators and boards ask why
sig: Failure probability | calibrated failure probability by asset | Likelihood | From health models
sig: Consequence of failure | customers, safety and repair cost | Impact | From GIS and finance
sig: Intervention cost and risk reduction | cost and expected risk change | Value | From engineering
sig: Outage and crew availability | windows and capacity | Feasibility | From planning
noise: Asset tag | an identifier
noise: Project author | irrelevant
noise: Spreadsheet version | an artefact
base: The annual capital plan from engineering judgement with age thresholds, because it is the planning norm.
prod: A multi-period optimisation on calibrated risk and cost with scenario budgets, lock and exclude rules, and an explanation of each choice for the investment board.
pipe: Asset risk data @ health models ; Cost and consequence join @ finance and GIS ; Portfolio optimiser @ constrained solver ; Scenario budgets @ planning ; Planner review @ investment board ; Plan export @ capital planning tool ; Outcome review @ annual
edge: Budget cut | the capital pool shrinks | Re-optimisation with a comparison to the previous plan
edge: Bad risk input | a risk model has errors | Sensitivity analysis and input checks
edge: Supply delay | equipment lead times grow | Lead-time-aware scheduling
off: Risk reduced per unit cost in backtests ; Plan feasibility ; Sensitivity to input error
on: Risk reduced per budget ; Emergency replacements ; Planner acceptance of the ranking
gap: Highest risk first only ; Unconstrained rankings ; Opaque risk inputs

== pole-and-cable-failure-prediction | Pole and Cable Failure Prediction | tabular | batch | foundational | a=0.3 k=6
obj: Predict failures of wood poles and underground cables from age, material, soil, loading and test results so inspections and renewals go where failures are likely.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Failure probability per segment for the next year ; Inspection list within a fixed budget ; Explanations on request ; Annual refresh for 10M poles and cable segments
sn: Label | Failures and condition findings from inspections | Replacement records | Replacements happen for many reasons
sn: Censoring | Assets still alive are right-censored | Only failed assets | Training on failures alone overstates risk
sn: Use | An inspection and renewal list | A fleet-level rate | Crews need where to go
sig: Age and material | age, species or insulation type | Baseline hazard | From the register
sig: Soil and moisture | soil class and moisture | Decay risk | From geospatial data
sig: Loading and fault history | load level and faults | Stress | From SCADA
sig: Test and inspection results | past test findings | Condition | From inspections
noise: Pole number | an identifier
noise: Crew name | irrelevant
noise: Photo file name | an artefact
base: Replace by age beyond the design life, because it is a common policy.
prod: A survival model handling censoring with gradient boosting for non-linear effects, calibrated probabilities and an inspection budget optimiser.
pipe: Asset and test data extraction @ asset system ; Cohort and censoring setup @ survival data prep ; Hazard model @ survival analysis ; Calibration @ isotonic fit ; Inspection list @ budget optimiser ; Crew assignment @ work management ; Outcome tracking @ annual
edge: Missing install date | the installation age is unknown | Age estimation with a flag
edge: New material | no failures yet | Priors from similar materials
edge: Inspection bias | tests are done on suspect assets | Adjust for selection in training
off: Calibration of annual failure probability ; Concordance ; Top-decile capture rate
on: In-service failures ; Inspection hit rate ; Renewal cost per avoided failure
gap: Ignoring censoring ; Training on failures only ; Replacement as the label
