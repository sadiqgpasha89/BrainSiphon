# Manufacturing & Industrial, part 2 (use cases 22-50): planning, scheduling and supply, robotics, safety and autonomous cells, energy, emissions and sustainability, engineering knowledge and agents, product, warranty and service
# Vendor-neutral. Advice sits above the machine safety layer, workers are never scored individually, and a named engineer or planner approves any change to a schedule, recipe or setpoint.
== production-scheduling-optimisation | Production Scheduling Optimisation | reinforcement-learning,tabular | seconds | advanced | a=1 k=30
obj: Build and repair finite-capacity production schedules that respect machines, tooling, materials and due dates, so delivery performance rises and changeovers and idle time fall.
con: Hard constraints on capacity, tooling and shift calendars ; Planner can freeze and edit any order ; Re-plan within 60 s after a disruption ; Schedule explained by the binding constraint ; 50K operations per plan
sn: Constraint | Real machine, tool and labour availability | A nominal capacity table | Plans on paper fail on the floor
sn: Objective | Weighted lateness, changeover and inventory cost | Utilisation | High utilisation creates long queues and late orders
sn: Change | Rolling re-plans with stability limits | A new plan every time | Constant reshuffles stop the floor from trusting the plan
sig: Predicted processing time | duration model by product, machine and tool | Plan realism | Use confirmed durations
sig: Sequence-dependent changeover | changeover minutes between product pairs | Shapes the sequence | From the changeover matrix
sig: Material availability | confirmed arrival dates of inputs | Feasibility | From ERP
sig: Order priority and due date slack | days to due date and customer priority | Objective weights | From orders
noise: Planner name | not a plan driver
noise: Order entry channel | not a plan driver
noise: Machine asset tag | an identifier
base: Dispatch rules such as earliest due date with a planner's manual changes, because they are the baseline most plants use.
prod: A constraint-programming or local-search scheduler with learned durations and changeover costs, a rolling horizon with stability penalties and a simulator for what-if tests before release.
pipe: Order and capacity intake @ ERP and MES ; Duration prediction @ gradient boosting ; Constraint model @ scheduling solver ; Plan stability filter @ rules ; Planner review and freeze @ planning board ; Release to MES @ order release ; Execution feedback @ event stream
edge: Machine breakdown | the schedule becomes infeasible mid-shift | Event-driven repair that moves the fewest orders
edge: Rush order | a priority order arrives late | Insertion with an impact preview for the planner
edge: Missing material | the planned input does not arrive | Re-sequence around the shortage and alert purchasing
off: Schedule feasibility on replayed days ; Duration prediction error ; Lateness against the dispatch baseline
on: On-time delivery ; Changeover hours ; Work in progress
gap: Planning on nominal capacity ; Re-planning without stability ; Optimising utilisation alone

== make-to-stock-demand-forecasting | Demand Forecasting for Make-to-Stock Items | time-series | batch | foundational | a=1 k=2
obj: Forecast item-level demand with intervals for make-to-stock products so production plans, safety stock and raw material orders match demand.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Forecast per item and channel for 26 weeks ; Quantile output for safety stock ; Promotion and event inputs ; Weekly run for 80K items
sn: Demand | Customer orders and shipments by need date | Production output | Output reflects capacity not demand
sn: Hierarchy | Forecasts reconciled from item to family and plant | Independent item forecasts | Totals that disagree break the plan
sn: Intermittent | Methods for slow items | Averages | Many items sell once in a while
sig: Same week last year | demand in the matching week of prior years | Seasonality | Aligned by week number
sig: Promotion and launch calendar | planned promotions and launches | Demand shifts | From sales
sig: Customer order backlog | confirmed open orders by need date | Near-term demand | From ERP
sig: Price and mix changes | list price changes by item | Elasticity | By item family
noise: Item description length | not demand
noise: Planner name | irrelevant
noise: Warehouse code | an identifier
base: Seasonal naive with a moving average on shipments, because planners trust it and it sets the floor.
prod: A global gradient boosting or neural forecaster with item embeddings, calendar and promotion covariates, hierarchical reconciliation and quantile outputs feeding safety stock.
pipe: Order and shipment history @ ERP ; Cleaning and censoring @ batch ; Feature build @ calendar and promotion joins ; Quantile forecast @ global model ; Reconciliation @ hierarchical step ; Planner review @ planning tool ; Accuracy tracking @ weekly
edge: New item | the item has no sales history | Borrow from similar items and widen the interval
edge: Stock-out period | sales understate real demand | Mark censored weeks and estimate unconstrained demand
edge: Large one-off order | an outlier distorts the trend | Outlier flags and a manual override
off: Weighted quantile loss by family ; Bias ; Coverage of intervals
on: Forecast accuracy at item level ; Stock-outs ; Excess inventory
gap: Using shipments as demand ; Ignoring censoring ; Random time splits

== changeover-time-prediction | Changeover Time Prediction | tabular | seconds | foundational | a=3 k=6
obj: Predict the time a changeover will take between two products on a machine so schedules and sequences use realistic changeover times.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Prediction within 3 s of a schedule query ; Intervals reported ; Results by product pair and machine ; 200K predictions per day
sn: Definition | Time from last good part to first good part | Time the machine was stopped | Start-up scrap counts as changeover time
sn: Pair | Product pair and machine specifics | One average per machine | Some pairs need tool swaps and others do not
sn: Use | Feeds the scheduler | A report | The value comes from better sequences
sig: Product pair attributes | differences in tooling, material and colour or size | Main driver | From the product master
sig: Tool and fixture change needs | whether the tooling must change | Large effect | From routings
sig: Crew size and skill mix | number and skill of changeover crew | Duration | Aggregated not individual
sig: Time since last similar changeover | days since the last changeover of this type | Learning effect | From history
noise: Operator name | not a driver
noise: Order number | an identifier
noise: Shift label alone | confounded
base: The standard changeover times from the routing, because planners use them today.
prod: Gradient boosting on product-pair and resource features with intervals, feeding the scheduler and flagging pairs that consistently overrun.
pipe: Changeover history @ MES ; Pair feature build @ product master joins ; Duration model @ gradient boosting ; Interval estimate @ quantile models ; Scheduler feed @ planning system ; Overrun flags @ analytics ; Retrain @ monthly
edge: New product pair | the pair has never been run | Use similar pairs and a wide interval
edge: Crew shortage | the duration rises | Crew size feature and an alert
edge: Definition drift | start-up scrap handling changes | Version the definition
off: Error against measured changeover ; Interval coverage ; Rank accuracy for the best next product
on: Schedule adherence ; Changeover hours ; Late orders from changeover overruns
gap: Using stop time as changeover time ; One average per machine ; Skipping intervals

== supplier-disruption-sensing-agent | Supplier Disruption Sensing Agent | llm-agents,nlp | seconds | advanced | a=0.05 k=60
obj: Watch news, weather, port and supplier signals for events that threaten critical inputs, link them to affected parts and orders, and brief the buyers with options.
con: Every alert cites its sources ; Impact tied to the bill of materials and open orders ; The agent proposes and never places orders ; High-impact alerts reviewed by a person within 1 hour ; Scans 2M items per day
sn: Source | Trusted and dated sources with named locations | Unverified social posts | Rumours trigger unnecessary actions
sn: Linkage | Events mapped to supplier sites, lanes and parts | Headlines only | A headline matters only if it touches your supply
sn: Output | A short brief with options and costs | An alert flood | Buyers stop reading floods
sig: Event location match | whether the event area contains a supplier site or lane | Relevance | Needs supplier geocodes
sig: Part criticality | single-source and downtime cost of affected parts | Priority | From the bill of materials
sig: Inventory cover | days of stock for the affected parts | Urgency | From ERP
sig: Source reliability | past accuracy of the source | Weighting | Maintained list
noise: Headline wording | not impact
noise: Social media volume | not reliability
noise: Article length | not relevance
base: A keyword alert on supplier names and regions, because purchasing already uses it.
prod: An agent that ingests events, resolves them to supplier sites and parts with read-only tools, computes inventory cover and drafts a briefing with options for buyers.
pipe: Event ingestion @ news and weather feeds ; Entity and location resolution @ NER and geocoding ; Supply link @ BOM and supplier graph ; Impact estimate @ inventory cover model ; Brief draft @ LLM with citations ; Buyer review @ procurement console ; Outcome tracking @ analytics
edge: Duplicate reports | many sources report the same event | Event clustering and a single brief
edge: Unclear location | the place name is ambiguous | Ask for confirmation and show the candidates
edge: False alarm | the event does not affect supply | Feedback to the source weights
off: Precision and recall of relevant events ; Impact accuracy on past disruptions ; Citation faithfulness
on: Lead time before disruption impact ; Expedite cost ; Alerts dismissed as irrelevant
gap: Alerting on headlines ; Letting the agent place orders ; Unverified sources

== raw-material-inventory-optimisation | Raw Material Inventory Optimisation | reinforcement-learning,time-series | batch | advanced | a=0.5 k=8
obj: Set reorder points and order quantities for raw materials under demand and lead-time uncertainty so stock-outs fall without excess inventory.
con: Service level targets by criticality ; Supplier minimum order quantities respected ; Planner approves order proposals ; Weekly run for 60K materials
sn: Uncertainty | Lead time and demand distributions | Average values | Averages hide the tail that causes stock-outs
sn: Policy | Service level tied to the cost of shortage | One level for all | Critical materials need more cover
sn: Constraint | Supplier minimums and shelf life | Pure cost minimisation | Infeasible orders get ignored
sig: Demand forecast with intervals | quantile forecast from the production plan | Demand uncertainty | From planning
sig: Lead time distribution | supplier median and p90 lead time | Replenishment risk | From receipts
sig: Shelf life and storage limits | days of life left and capacity | Constraints | From the material master
sig: Shortage cost | line downtime cost per day | Sets the service level | From finance
noise: Buyer name | irrelevant
noise: Warehouse code | an identifier
noise: Order number | an identifier
base: Reorder-point rules from average usage and a safety factor, because it is the standard practice.
prod: A stochastic inventory policy with simulated demand and lead times, optimised against shortage and holding costs with constraints, and a proposal list for buyers.
pipe: Demand and receipts @ ERP ; Distribution fitting @ statistical models ; Policy optimiser @ stochastic simulation ; Constraint filter @ rules ; Order proposals @ planning tool ; Buyer approval @ procurement console ; Outcome tracking @ monthly
edge: Supplier disruption | lead times jump | Scenario planning and dual sourcing rules
edge: Demand change | the production plan shifts | Rolling update from the latest plan
edge: Shelf-life loss | stock expires before it is used | Expiry-aware order sizing
off: Simulated service level against target ; Stock-out rate ; Inventory value at fixed service
on: Stock-outs ; Inventory value ; Expedite orders
gap: Average-based safety stock ; One service level for all ; Ignoring shelf life

== shift-staffing-skill-matching | Shift Staffing & Skill Matching | time-series,tabular | batch | foundational | a=1 k=5
obj: Forecast labour demand by line and skill and propose shift rosters that meet the plan within contract and labour rules, using aggregated data and no individual performance scoring.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Rosters follow contracts, breaks and works-council rules ; No individual productivity scoring ; Supervisors can override ; Weekly plan for 20K employees
sn: Demand | Labour hours derived from the production plan | Last month's headcount | Plans change with orders
sn: Skills | Certified skills matched to station needs | Headcount only | A wrong skill mix stops a line
sn: Privacy | Group-level statistics and consented data | Individual monitoring | Workers and councils reject surveillance
sig: Planned production hours by line | hours from the schedule | Demand | From planning
sig: Skill coverage per station | certified staff per station and shift | Constraint | From training records
sig: Absence rate by group | aggregated absence rate by team and season | Planning buffer | Aggregated only
sig: Overtime budget remaining | hours left in the budget | Constraint | From HR
noise: Employee name | irrelevant and private
noise: Age alone | irrelevant and risky
noise: Badge swipe time | a monitoring artefact
base: A fixed roster by shift pattern with manual swaps, because it is the common approach.
prod: A forecast of labour hours with a roster optimiser that respects skills and labour rules, producing a draft for supervisors and a skill-gap report for training plans.
pipe: Production plan intake @ planning system ; Labour demand forecast @ time-series model ; Skill and rule model @ roster constraints ; Roster optimiser @ constraint solver ; Supervisor review @ rostering tool ; Skill gap report @ HR analytics ; Outcome tracking @ weekly
edge: Sudden absences | the roster has holes | Re-roster with minimal change and a cover list
edge: New line start-up | skills are scarce | Training plan alerts and temporary cover rules
edge: Rule change | a new agreement changes the limits | Versioned rule sets
off: Roster feasibility ; Forecast error in hours ; Skill coverage attainment
on: Overtime hours ; Understaffed shifts ; Skill gaps closed
gap: Individual monitoring ; Headcount-only plans ; Ignoring labour rules

== capable-to-promise-order-promising | Capable-to-Promise Order Promising | reinforcement-learning,tabular | sub-100ms | advanced | a=0.5 k=8
obj: Give customers a reliable delivery date at order entry by checking material, capacity and logistics in real time so promised dates are met.
con: Promise computed within 80 ms ; Dates reflect live capacity and stock ; Sales can reserve capacity within limits ; 40K quotes per hour at peak
sn: Basis | Available-to-promise from live stock and planned capacity | Standard lead time | A fixed lead time ignores the current load
sn: Risk | A date with a confidence level | A single date | Late promises damage trust more than later honest dates
sn: Fairness | Rules for allocating scarce capacity | First come first served | Strategic customers need defined priority
sig: Available stock and planned receipts | stock position by date | Material feasibility | Live
sig: Capacity load by week | committed hours against capacity | Capacity feasibility | From the schedule
sig: Historical on-time rate by lane | delivery performance | Date risk | By route
sig: Order priority class | customer and order class | Allocation | From sales policy
noise: Sales rep name | irrelevant
noise: Order channel alone | weak link
noise: Quote number | an identifier
base: The standard lead time by product family, because it is the fallback sales use today.
prod: A promising service combining stock and capacity checks with a learned delay model and an allocation policy, returning a date with a confidence band.
pipe: Order request @ quoting system ; Stock and capacity check @ planning services ; Delay model @ gradient boosting ; Allocation policy @ rules ; Promise response @ API ; Reservation @ planning ; Performance tracking @ weekly
edge: Capacity overbooked | many requests at once | Reservation locks and queueing
edge: Plan change after the promise | the date becomes unreachable | Early warning and a re-promise workflow
edge: Data lag | the stock view is stale | Freshness checks and conservative dates
off: On-time rate of promises ; Calibration of confidence ; Latency at p99
on: Promise reliability ; Orders re-dated ; Expedite cost
gap: Standard lead times ; Single-point promise dates ; No reservation locks

== vision-guided-bin-picking | Vision-Guided Bin Picking | computer-vision | sub-100ms | advanced | a=10 k=400
obj: Locate and grasp randomly placed parts in bins using 3D vision so robot cells can feed machines without precise fixturing.
con: Pose estimate within 80 ms ; Grasp success above 98% ; Collision checks before each motion ; Fallback to operator assistance on repeated fails ; 15 picks per minute per cell
sn: Label | Successful grasps and measured poses | Annotated images only | Image annotation does not equal a good grasp
sn: Safety | Motion planning with collision and speed limits in the controller | Model-driven motion | A model cannot guarantee clearance
sn: Variation | Parts in all lighting, orientations and bin fill levels | A tidy demo bin | Real bins are messy
sig: Pose estimate confidence | confidence of the part pose | Grasp decision | Calibrated
sig: Grasp reachability | whether the gripper can reach without collision | Feasibility | From the cell model
sig: Part overlap and occlusion | share of the part visible | Failure risk | From the point cloud
sig: Bin fill level | parts remaining | Strategy switch | From the cloud
noise: Operator name | not a driver
noise: Part colour alone | lighting effect
noise: Image timestamp | an artefact
base: Template matching on 3D point clouds with a fixed grasp library, because it is robust and widely used.
prod: A pose estimation network with grasp ranking and a classical motion planner with collision checking, plus a self-supervised data loop from grasp outcomes.
pipe: Point cloud capture @ 3D camera ; Segmentation and pose @ vision model on edge GPU ; Grasp ranking @ learned scorer ; Motion plan and collision check @ robot controller ; Grasp execution @ robot ; Outcome label @ gripper sensors ; Retraining @ nightly
edge: Reflective parts | depth data is noisy | Multi-exposure capture and filters
edge: Stuck pick | the part jams in the bin | Retry policy then shake or operator call
edge: New part | the model has not seen it | Few-shot adaptation and a CAD-based starter
off: Grasp success rate per part type ; Pose error ; Cycle time
on: Picks per hour ; Operator interventions ; Jams
gap: Training on annotation only ; Model-driven motion without a planner ; Demo bins

== worker-safety-zone-monitoring | Worker Safety Zone Monitoring | computer-vision | sub-100ms | advanced | a=30 k=200
obj: Detect people entering hazardous zones near machines and vehicles and trigger warnings or a safe slow-down through the certified safety system, without identifying individuals.
con: The certified safety controller remains the safety function and the model is an additional layer ; Detection within 60 ms ; No face recognition and no individual tracking over time ; Works-council approved ; Warnings reach the worker and the supervisor
sn: Role | An extra warning layer above certified interlocks | The primary safety function | An unvalidated model cannot be the guard
sn: Privacy | Anonymised person detection by zone | Identified workers | Surveillance of individuals harms trust
sn: Metric | Recall of people in the zone at a fixed false alarm rate | Overall accuracy | Missed people are what matters
sig: Person detection in zone | whether a person-shaped object is inside the zone | Core trigger | Confidence calibrated
sig: Object speed and direction | movement of vehicles and machine parts | Collision risk | From tracking
sig: Zone state | the machine state and the allowed zone | Context | From the controller
sig: Visibility conditions | lighting and occlusion indicators | Reliability | From the camera
noise: Worker identity | privacy risk and no safety value
noise: Clothing colour alone | weak link
noise: Shift label alone | irrelevant
base: Light curtains and area scanners wired to the safety controller, because they are the certified measure.
prod: A person-detection model on edge hardware that raises warnings and feeds zone status to the safety system as an advisory input, with anonymised statistics for near-miss analysis.
pipe: Camera capture @ industrial camera ; Person detection @ vision model on edge ; Zone logic @ rules ; Warning output @ beacons and HMI ; Advisory signal @ safety PLC interface ; Near-miss statistics @ anonymised analytics ; Review @ EHS
edge: Poor lighting | people are missed in the dark | Illumination checks and a fallback to certified sensors
edge: Forklift loads | tall loads look like people | Object class training and zone rules
edge: Camera blocked | the zone becomes blind | Camera health alarms and a safe-state request
off: Recall of people in the zone at fixed false alarms ; Latency ; Camera health uptime
on: Near misses ; Zone violations ; False warning rate
gap: Replacing certified interlocks ; Identifying individuals ; Accuracy as the headline metric

== agv-fleet-traffic-orchestration | AGV Fleet Traffic Orchestration | reinforcement-learning | seconds | advanced | a=20 k=2
obj: Assign missions and route AGVs and mobile robots through shared aisles without deadlocks, minimising wait and travel time.
con: Collision avoidance remains with vehicle safety systems ; Re-plan within 1 s after a blockage ; Priority rules for urgent missions ; 300 vehicles per site
sn: Deadlock | Reservation of aisle segments and intersections | Independent shortest paths | Independent paths collide at intersections
sn: Objective | Mission completion time and throughput | Vehicle utilisation | Busy vehicles in jams do not move goods
sn: Safety | Onboard sensors govern collision | Central plan as the safety layer | Network delay breaks plans
sig: Segment occupancy and reservation | which segments are held and when | Conflict avoidance | Live map
sig: Mission urgency | due time of the mission | Priority | From MES
sig: Battery state and charging slots | charge level and slot availability | Feasibility | From the fleet system
sig: Predicted blockage | likelihood of blockage by area | Re-routing | From past events
noise: Vehicle name | an identifier
noise: Mission number | an identifier
noise: Colour of the vehicle | irrelevant
base: A central dispatcher assigning the nearest free vehicle with shortest-path routes, because it is the vendor default.
prod: A multi-agent path planner with time-window reservations and a learned blockage model, tested in a simulator before use and a stability filter against thrashing.
pipe: Mission intake @ MES and WMS ; Assignment @ optimiser ; Path planning with reservations @ multi-agent planner ; Blockage prediction @ model ; Command dispatch @ fleet manager ; Simulation tests @ site simulator ; Performance monitor @ analytics
edge: Blocked aisle | a pallet is left in the lane | Detect blockage and reroute with an operator alert
edge: Network loss | vehicles lose the plan | Local safe behaviour and a re-sync protocol
edge: Peak load | mission queues grow | Priority tiers and load shedding
off: Deadlock rate in simulation ; Mission time against the baseline ; Re-plan latency
on: Throughput ; Mission wait time ; Interventions per shift
gap: Independent shortest paths ; Making the planner the safety layer ; No simulation

== robot-cell-anomaly-detection | Robot Cell Anomaly Detection | time-series | seconds | advanced | a=60 k=4
obj: Detect abnormal behaviour in robot cells from joint currents, torque and cycle signatures so drive wear, tool faults and programme errors are found early.
loss: \mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2
con: Baselines per robot programme and payload ; False alarms under 1 per robot per month ; Alerts include the joint and the cycle step ; Edge scoring for 5K robots
sn: Baseline | Cycle signatures per programme step and payload | A global torque limit | Torque varies with the move and the load
sn: Location | Which joint and step deviated | A cell-level alarm | Technicians need the joint
sn: Validation | Replayed seeded faults | Anomaly counts | Counts do not show missed faults
sig: Current profile deviation | distance between the cycle current profile and the baseline | Wear signal | Per step
sig: Cycle time drift | change in cycle duration | Mechanical or programme change | By programme
sig: Temperature and vibration | motor and gearbox measures | Wear | Per joint
sig: Programme version | the robot programme in use | Prevents false alarms after edits | From the controller
noise: Robot name | an identifier
noise: Cell location alone | weak link
noise: Operator name | irrelevant
base: Torque and current limits per axis from the manufacturer, because they protect the robot.
prod: An autoencoder or reference-signature model per programme step with joint-level explanations, run at the edge with a drift-aware baseline refresh after approved programme changes.
pipe: Controller signal capture @ robot controller ; Cycle segmentation @ signal processing ; Signature model @ autoencoder ; Joint explanation @ attribution ; Alert routing @ monitoring console ; Technician feedback @ labels ; Baseline refresh @ approved changes
edge: Programme edit | signatures change on purpose | Programme version triggers a baseline reset
edge: Payload variation | torque changes with different parts | Payload features and a payload sensor
edge: Controller upgrade | signal scaling changes | Version checks and recalibration
off: Detection rate on seeded faults ; False alarms per robot-month ; Joint localisation accuracy
on: Unplanned robot stops ; Time to find the fault ; Alerts closed as no fault
gap: Global torque limits ; Cell-level alarms ; No seeded fault tests

== ppe-compliance-zone-statistics | PPE Compliance Zone Statistics | computer-vision | seconds | foundational | a=10 k=100
obj: Estimate protective equipment compliance by zone and shift from cameras in aggregate, so EHS targets training and signage without monitoring individuals.
con: Outputs are zone-level counts and never individual alerts ; Faces blurred at the camera ; Works-council and legal approval before use ; Data retained for 30 days ; 500 cameras
sn: Purpose | Aggregate compliance rates to guide training | Individual enforcement | Individual enforcement harms trust and breaks agreements
sn: Method | Anonymised detections with counts | Stored video | Stored video is a privacy and security liability
sn: Action | Zone and time insights for EHS | Alerts to supervisors about named workers | Named alerts are surveillance
sig: PPE item detection rate | share of detected people with each required item | Core statistic | Per zone
sig: Detection confidence | confidence of the PPE classifier | Filters weak calls | Calibrated
sig: Zone and time bucket | where and when | Targeting | Aggregated
sig: Lighting and occlusion | visibility indicators | Quality of the estimate | From the camera
noise: Worker identity | privacy risk
noise: Clothing brand | irrelevant
noise: Face features | prohibited
base: Periodic manual safety walks with checklists, because they are the standard audit and have known coverage.
prod: A detector that counts people and PPE items per zone on edge devices, blurs faces at source, aggregates by hour and publishes zone statistics for EHS review.
pipe: Camera capture and face blur @ edge device ; Person and PPE detection @ vision model ; Aggregation by zone and hour @ edge analytics ; Statistics upload @ secure sync ; EHS dashboard @ BI tool ; Training targeting @ EHS ; Retention enforcement @ storage policy
edge: Partial occlusion | PPE is hidden by equipment | Report as unknown not as non-compliant
edge: Low sample size | too few people in a bucket | Suppress buckets below a count
edge: Repurposed data | pressure to use it for discipline | Technical and policy controls that prevent individual outputs
off: Agreement with manual audits ; Calibration of rates ; Share of buckets suppressed
on: Compliance rate in targeted zones ; Training sessions targeted ; Complaints about monitoring
gap: Individual enforcement ; Storing raw video ; Reporting unknown as non-compliant

== digital-twin-line-calibration | Digital Twin Calibration for Line Simulation | time-series,tabular | batch | advanced | a=0.5 k=30
obj: Calibrate a discrete-event simulation of a production line from real event data so what-if tests on layout, buffers and staffing give trustworthy answers.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: The twin reproduces throughput within 3% on held-out weeks ; Calibration reruns monthly ; Every parameter has a source ; Used for decisions only with documented validity ranges
sn: Validity | Calibration checked on unseen periods | A fit to the training period | A twin that only matches the past gives false confidence
sn: Parameters | Distributions of times and failures from event data | Average values | Variability drives queues
sn: Scope | A documented range where the twin is valid | General use | Use outside the range misleads
sig: Process time distribution | fitted distribution of cycle times per station | Core input | Per product
sig: Failure and repair distributions | time between failures and repair times | Availability | From downtime data
sig: Buffer and routing rules | buffer sizes and priorities | Flow behaviour | From engineering
sig: Arrival pattern | order or part arrival process | Load | From planning
noise: Station name | an identifier
noise: Operator name | not a driver
noise: Report time | an artefact
base: A spreadsheet model of line capacity from nominal cycle times, because it is the planning approach and the benchmark.
prod: A discrete-event simulation with fitted distributions and automatic calibration against event logs, validation on held-out periods and a library of tested scenarios.
pipe: Event log extraction @ MES ; Distribution fitting @ statistical fits ; Simulation build @ discrete-event engine ; Calibration @ parameter search ; Validation on held-out weeks @ backtests ; Scenario library @ analytics ; Report @ planning tool
edge: Recipe change | process times shift | Recalibration trigger on approved changes
edge: Rare breakdowns | little data for repair times | Priors from similar machines
edge: Out-of-range question | the scenario leaves the valid range | Validity range check with a warning
off: Throughput error on held-out weeks ; Distribution fit quality ; Prediction of known past interventions
on: Decisions with simulated evidence ; Trial costs avoided ; Layout change surprises
gap: Fitting to the training period only ; Using averages ; Undocumented validity

== plant-energy-demand-forecasting | Plant Energy Demand Forecasting | time-series | batch | foundational | a=96 k=1
obj: Forecast electricity, gas and steam demand for a plant by interval so purchasing, peak management and on-site generation plans use realistic loads.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: 15-minute resolution for 7 days ahead ; Quantile output for peak risk ; Production plan used as input ; Daily run for 200 plants
sn: Driver | Production plan and weather | History alone | Energy follows what is produced
sn: Peak | Quantiles around peaks | Mean forecast | Demand charges depend on the peak
sn: Hierarchy | Plant, line and meter totals consistent | Meter-only forecasts | Sums must agree for planning
sig: Planned production by line | scheduled hours and output | Main driver | From planning
sig: Weather forecast | temperature and humidity | Cooling and heating | Forecast not actual
sig: Same hour last week | load at the same hour in prior weeks | Anchor | Aligned on local time
sig: Equipment state | machines on and off | Baseload | From MES
noise: Meter name | an identifier
noise: Billing period label | an artefact
noise: Operator name | irrelevant
base: Seasonal naive on the last week's load, because it is the simple benchmark.
prod: A gradient boosting or neural forecaster with production-plan and weather covariates, quantile outputs, hierarchical reconciliation and a peak alert.
pipe: Meter data ingestion @ energy system ; Cleaning @ batch ; Feature build @ plan and weather joins ; Quantile forecast @ model ; Reconciliation @ hierarchical step ; Peak alert @ rules ; Accuracy tracking @ weekly
edge: Plan change | production shifts at short notice | Update the forecast on plan changes
edge: Meter outage | meter readings are missing | Imputation limits and a flag
edge: Extreme weather | load moves beyond history | Wider intervals under extreme forecasts
off: Weighted quantile loss ; Peak error ; Coverage
on: Demand charges ; Energy cost per unit ; Forecast bias at peak
gap: Mean-only forecasts ; Ignoring the plan ; Inconsistent hierarchy

== compressed-air-leak-detection | Compressed Air Leak Detection | time-series | batch | foundational | a=96 k=1
obj: Detect compressed air leaks from flow, pressure and compressor data and prioritise repairs by energy cost so waste falls.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Leak estimate in cubic metres per hour with a range ; Production-off baselines ; Priority by cost ; Daily run for 300 sites
sn: Baseline | Flow when production is idle | Total flow | Production use hides leaks
sn: Location | Zone-level flow with ultrasonic surveys | Plant-wide flow | A plant total does not show where to repair
sn: Value | Energy cost of each leak | Leak count | Small leaks matter less
sig: Idle-period flow | flow during shutdown windows | Leak rate | From the production calendar
sig: Compressor load factor | loaded versus unloaded time | Efficiency | From the compressor
sig: Pressure decay rate | pressure drop in isolated zones | Leak size | From valves
sig: Zone flow trends | trend of flow per zone | Locates growth | From submeters
noise: Meter name | an identifier
noise: Operator name | irrelevant
noise: Alarm text | vendor formatting
base: Periodic ultrasonic surveys by technicians, because it is the standard method and finds specific leaks.
prod: A baseline model on idle flow and zone submeters with a leak growth detector, repair priorities by energy cost and a work-order link for survey teams.
pipe: Flow and pressure capture @ metering system ; Idle period detection @ production calendar ; Baseline model @ regression ; Leak growth detector @ change point ; Priority list @ cost model ; Work order @ CMMS ; Savings verification @ before after check
edge: No idle window | the plant never stops | Use low-load windows and zone isolation
edge: Process change | the baseline shifts | Change events reset the baseline
edge: Sensor drift | flow readings drift | Calibration checks
off: Leak estimate error on surveyed leaks ; Detection of seeded leaks ; Savings accuracy
on: Air energy per unit produced ; Leaks repaired ; Compressor hours
gap: Total flow monitoring only ; Counting leaks not cost ; Ignoring sensor drift

== utility-plant-setpoint-optimisation | Utility Plant Setpoint Optimisation | reinforcement-learning,time-series | seconds | advanced | a=12 k=6
obj: Recommend chiller, boiler and cooling tower setpoints and staging to meet plant demand at the lowest energy cost within comfort and process limits.
con: Limits on temperatures and pressures enforced in code ; Operator approves any setpoint change ; Simulation test before live use ; Recommendation every 10 minutes for 80 plants
sn: Model | A physics-informed performance model per equipment | A generic regression | Plant equipment has known curves
sn: Limits | Hard limits outside the model | Learned limits | A learned limit may fail in a rare state
sn: Evaluation | Matched controls across weather | Before and after energy totals | Weather dominates raw totals
sig: Equipment efficiency curve | measured efficiency against load | Choice of units to run | Fit per equipment
sig: Load forecast | cooling and heating demand forecast | Planning | From the energy forecast
sig: Weather and wet-bulb temperature | ambient conditions | Efficiency driver | Forecast
sig: Electricity tariff period | time-of-use price | Cost objective | From the tariff
noise: Operator name | irrelevant
noise: Equipment tag | an identifier
noise: Log timestamp precision | an artefact
base: Fixed staging rules and setpoints by season, because they are the standard operating procedures.
prod: A model-predictive or optimisation layer on equipment curves and forecasts that proposes staging and setpoints, advice-only at first with matched-control evaluation and a safety clip.
pipe: Plant telemetry @ BMS and historian ; Equipment models @ fitted curves ; Load and weather forecast @ time-series model ; Optimiser @ constrained solver ; Safety clip @ rules ; Operator advice display @ HMI ; Savings evaluation @ matched controls
edge: Equipment failure | a chiller trips | Fast re-optimisation with the remaining units
edge: Tariff change | the cost objective changes | Versioned tariffs and quick updates
edge: Sensor drift | efficiency estimates are wrong | Drift checks and recalibration
off: Predicted versus measured energy on matched periods ; Safety clip rate ; Forecast error
on: Utility energy cost ; Energy per unit of cooling ; Comfort or process limit breaches
gap: Learned safety limits ; Raw before-and-after savings ; Ignoring weather

== product-carbon-footprint-estimation | Product Carbon Footprint Estimation | tabular | batch | advanced | a=0.05 k=30
obj: Estimate the carbon footprint of each product from bills of materials, energy use and supplier data with uncertainty so design and sourcing decisions can reduce emissions.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Methodology follows the declared standard ; Each number has a source and an uncertainty ; Supplier-specific data used where available ; Recompute on every BOM or energy change ; 100K products
sn: Data | Supplier-specific and metered data first | Generic averages for everything | Averages hide the biggest levers
sn: Uncertainty | A range per product | A single number | Decisions need to know the confidence
sn: Boundary | A documented system boundary | Whatever data is available | Unclear boundaries make comparisons wrong
sig: Material emission factors | factor by material and supplier | Largest contribution | Versioned factors
sig: Process energy per unit | metered energy per unit and grid factor | Manufacturing share | Per plant
sig: Transport legs | tonne-kilometres by mode | Logistics share | From shipments
sig: Data quality score | share of primary data in the estimate | Uncertainty weighting | Per product
noise: Product name | an identifier
noise: Marketing category | not an emission driver
noise: Designer | irrelevant
base: Lookup of generic emission factors per BOM line, because it is the common screening method.
prod: A hybrid estimator using supplier data and metered energy where available and imputed factors elsewhere with Monte Carlo uncertainty, plus a lever analysis for designers.
pipe: BOM and routing data @ PLM and ERP ; Factor library @ versioned factor store ; Energy allocation @ plant meters ; Estimator @ model with Monte Carlo ; Uncertainty and lever analysis @ batch ; Designer report @ PLM ; Audit pack @ document store
edge: Missing supplier data | primary data is not available | Use imputed factors with a flagged data quality score
edge: Factor library update | numbers change after a new release | Versioned factors and a recompute log
edge: Allocation choice | shared energy needs a rule | Document the rule and test sensitivity
off: Agreement with audited footprints ; Interval coverage on sampled products ; Share of primary data
on: Footprint reduction in redesigned products ; Supplier data coverage ; Audit findings
gap: Generic factors only ; Single-number reporting ; Undocumented boundaries

== water-waste-anomaly-detection | Water and Waste Stream Anomaly Detection | time-series | seconds | foundational | a=48 k=2
obj: Detect abnormal water use, effluent quality and waste volumes by line so leaks, spills and permit exceedances are found early.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Alarm before permit limits are reached ; Baselines per production state ; Evidence pack for regulators ; Daily review for 200 sites
sn: Baseline | Use per unit of production | Absolute use | Use rises with output
sn: Compliance | Limits from the permit with a margin | Internal targets only | Permit exceedances carry fines
sn: Cause | Meter-level attribution | Site totals | Totals do not show where to look
sig: Water per unit produced | litres per unit by line | Efficiency | From meters and production
sig: Effluent quality indicators | pH, conductivity and load measures | Compliance | From analysers
sig: Waste volume by stream | tonnes by waste class | Disposal cost | From scales
sig: Production state | running, idle or cleaning | Baseline selection | From MES
noise: Meter name | an identifier
noise: Operator name | irrelevant
noise: Report format | an artefact
base: Alerts on permit limits and monthly totals, because they are the compliance minimum.
prod: A state-conditioned anomaly model on normalised use with permit margin alerts, meter-level attribution and an evidence export for regulators.
pipe: Meter and analyser capture @ SCADA ; State assignment @ MES join ; Normalisation @ per unit rates ; Anomaly detector @ state-conditioned model ; Permit margin rules @ compliance rules ; Alert and evidence @ EHS console ; Action tracking @ ticketing
edge: Cleaning cycles | use spikes by design | Cleaning state excluded or modelled separately
edge: Analyser drift | quality readings drift | Calibration checks and a data quality flag
edge: New product | consumption differs | Product-specific baselines
off: Detection rate on seeded excursions ; False alarms per site-month ; Time to detect
on: Permit exceedances ; Water per unit ; Waste disposal cost
gap: Absolute baselines ; Alerting at the limit only ; Site totals only

== sustainability-reporting-copilot | Sustainability Reporting Copilot | llm-agents,nlp | seconds | advanced | a=0.02 k=60
obj: Help sustainability teams collect, check and draft disclosure content from plant, supplier and finance data, with every figure linked to its source and calculation.
con: Every number links to a source record and a calculation ; Figures computed by tools not by the model ; Human approval before any disclosure ; Version control of drafts ; Report draft for 200 sites within a day
sn: Numbers | Computed by deterministic tools from controlled data | Model arithmetic | Models make arithmetic and unit errors
sn: Evidence | A source link per statement | Narrative without references | Auditors need to trace every claim
sn: Scope | The reporting boundary and period defined first | Whatever data is found | Inconsistent boundaries make reports wrong
sig: Data completeness by site | share of required metrics present | Gap finder | From the data catalogue
sig: Calculation lineage | whether each figure traces to inputs | Audit readiness | From the lineage store
sig: Period and boundary match | whether data fits the reporting scope | Consistency | From the config
sig: Prior year change | change from the previous year | Plausibility check | Flag large moves
noise: Writing style of site contacts | not evidence
noise: Report length | not quality
noise: Template colour | irrelevant
base: Manual data collection in spreadsheets with email reminders, because it is the standard process.
prod: A copilot with tools for data retrieval and calculation, gap and anomaly checks, drafted narratives with citations and an approval workflow for sustainability leads.
pipe: Data request and intake @ data catalogue ; Retrieval and calculation tools @ governed APIs ; Gap and anomaly checks @ rules and model ; Draft narrative @ LLM with citations ; Lead review @ approval console ; Disclosure export @ report tool ; Audit pack @ document store
edge: Missing site data | a site does not respond | Mark the gap and show the effect on totals
edge: Unit mismatch | data arrives in different units | Unit checks in the calculation tools
edge: Large unexplained change | a reported figure jumps sharply | Flag and request an explanation
off: Figure accuracy against recalculated values ; Citation coverage ; Gap detection recall
on: Days to produce the report ; Audit findings ; Manual corrections
gap: Model-computed figures ; Statements with no sources ; Unclear reporting boundaries

== operator-work-instruction-assistant | Operator Work-Instruction Assistant | llm-agents,nlp | seconds | foundational | a=3 k=30
obj: Answer operator questions about work instructions, quality checks and changeover steps at the station, in the operator's language, from controlled documents only.
con: Answers come from the controlled document set with revision numbers ; Safety and quality-critical steps shown verbatim ; The assistant cannot change any setting ; Works offline at the station ; Answer within 3 s
sn: Source | The current controlled instruction | Model memory | Wrong instructions cause scrap and injuries
sn: Language | Translations checked by quality | Free translation by the model | Translation errors in safety steps are dangerous
sn: Scope | Questions about the task at the station | Open chat | Off-topic chat distracts
sig: Station and product context | station and the product on it | Retrieves the right instruction | From MES
sig: Document revision status | current or superseded | Prevents old steps | From document control
sig: Question intent | procedure, parameter, defect or safety | Routes the answer | Classified
sig: Operator qualification | certification for the task | Gates steps | From training records
noise: Operator name | irrelevant
noise: Time of day | irrelevant
noise: Device model | irrelevant
base: Printed instruction binders and a search box on the document system, because they are the current tools.
prod: A retrieval-grounded assistant with station context, controlled translations, verbatim critical steps, voice input and a feedback loop to document owners.
pipe: Question intake @ station tablet or voice ; Station context @ MES lookup ; Retrieval @ hybrid search ; Answer with citation @ LLM with controlled content ; Critical step insertion @ document store ; Feedback to owners @ document control ; Usage analytics @ BI
edge: Superseded instruction | an old document is cached | Revision checks and cache expiry
edge: Noise at the station | voice input fails | Text and touch fallback
edge: Instruction gap | no instruction covers the question | Escalate to the supervisor and log a documentation gap
off: Answer faithfulness on audited questions ; Retrieval accuracy ; Critical step accuracy
on: Operator questions to supervisors ; First-pass yield on changeovers ; Training time for new operators
gap: Free translation of safety steps ; Missing revision control ; Open-domain chat

== engineering-change-impact-agent | Engineering Change Impact Agent | llm-agents,graph | seconds | advanced | a=0.1 k=60
obj: For an engineering change request, find the affected parts, assemblies, routings, suppliers and open orders, and draft an impact assessment so change boards decide faster.
con: Impacted items come from the PLM and ERP structure not from text guesses ; The agent has read-only access ; The board approves the change ; Impact assessment within 10 minutes ; 3K change requests per month
sn: Structure | Where-used queries on the real product structure | Keyword search on part names | Names miss indirect impacts
sn: Scope | Direct and indirect impacts with the reason | A flat list | The board needs to see why each item is affected
sn: Decision | A recommendation with cost and risk factors | A summary | Boards need cost and risk
sig: Where-used depth | number of assemblies and products using the part | Breadth of impact | From the BOM
sig: Open order and stock exposure | stock and open orders of old versions | Cost | From ERP
sig: Supplier and tooling dependency | tooling and supplier changes needed | Lead time | From purchasing
sig: Regulatory and qualification flags | parts under certification | Approvals | From PLM
noise: Requester name | irrelevant
noise: Change title wording | not impact
noise: Attachment names | irrelevant
base: A manual where-used report by engineers with a checklist, because it is the standard practice.
prod: A graph query agent that expands where-used across PLM and ERP, estimates stock, order, supplier and qualification impacts and drafts the board paper with citations.
pipe: Change request intake @ PLM ; Structure expansion @ graph queries ; Impact enrichment @ ERP and purchasing tools ; Risk and cost estimate @ rules and model ; Draft assessment @ LLM with citations ; Board review @ change board ; Decision capture @ PLM
edge: Incomplete structure data | where-used misses some products | State the gap and request a data fix
edge: Phased changes | effectivity dates differ | Effectivity-aware impact by date
edge: Conflicting changes | two requests touch the same part | Show the conflict and the order of effect
off: Impacted item recall on audited changes ; Cost estimate error ; Assessment faithfulness
on: Time to assess a change ; Post-release change surprises ; Obsolete stock created
gap: Keyword search for impact ; Flat impact lists ; Ignoring effectivity

== part-master-deduplication | Part Master Deduplication | graph,nlp | batch | advanced | a=0.02 k=5
obj: Find duplicate and near-duplicate parts across plants and systems so purchasing and engineering consolidate part numbers and reduce cost and inventory.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Merges proposed never applied automatically ; Stewards approve each cluster ; Safety-relevant parts need engineering review ; 5M part records
sn: Match | Specification attributes plus text and drawings | Description text alone | Descriptions vary wildly
sn: Cluster | Transitive consistency across a cluster | Pairwise matches only | Pairs can contradict each other
sn: Action | Cluster proposals with savings | A match list | Stewards need clusters to act
sig: Attribute match | agreement of dimensions, material and standard | Core evidence | Normalised units
sig: Text embedding similarity | semantic similarity of descriptions | Recall | Multilingual
sig: Supplier part cross-reference | shared supplier part numbers | Strong evidence | From purchasing
sig: Drawing or geometry similarity | similarity of drawings | Disambiguation | From PLM
noise: Part creator | irrelevant
noise: Creation date | weak link
noise: Plant code | an identifier
base: Exact and fuzzy matching on description and manufacturer part number, because it is the common cleansing step.
prod: A blocking and pairwise match model with attribute and text features, graph clustering with transitivity checks and a steward review queue with savings estimates.
pipe: Part record extraction @ ERP and PLM ; Normalisation @ units and attributes ; Blocking and pairwise match @ model ; Graph clustering @ transitive closure ; Savings estimate @ cost model ; Steward review @ data tool ; Merge execution @ master data process
edge: Look-alike parts | similar but different specifications | Attribute conflicts block merges
edge: Multilingual descriptions | text similarity fails | Multilingual embeddings and attribute-first logic
edge: Approved alternates | two parts are on purpose | Alternate flags in the part master
off: Pair precision and recall on labelled sets ; Cluster purity ; Steward acceptance rate
on: Parts consolidated ; Inventory reduction ; Purchase price variance
gap: Description-only matching ; No transitivity check ; Automatic merges

== cad-drawing-similarity-search | CAD and Drawing Similarity Search | computer-vision,nlp | seconds | advanced | a=0.3 k=200
obj: Find similar existing parts and drawings from a new sketch, model or description so engineers reuse designs and avoid creating duplicates.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Search within 3 s over 5M drawings ; Access control follows the PLM permissions ; Results show the similarity reason ; No export of restricted designs
sn: Similarity | Geometry and manufacturing attributes together | Shape alone | Shape matches with different material or tolerance are not reuse
sn: Access | Permission checks at query time | Index-time filtering only | Permissions change
sn: Evaluation | Engineer-judged reuse cases | Click counts | Clicks do not show real reuse
sig: Shape embedding similarity | embedding of the 3D shape or drawing | Candidate retrieval | Normalise scale
sig: Material and process match | same material and manufacturing process | Reuse feasibility | From attributes
sig: Tolerance and standard compatibility | tolerance class and standard | Fit | From drawings
sig: Usage history | where the part is already used | Reuse value | From PLM
noise: Drawing file name | an artefact
noise: Author name | irrelevant
noise: File size | an artefact
base: Text search on part numbers and descriptions in the PLM, because engineers use it today.
prod: A multimodal embedding index over shape, drawing text and attributes with a re-ranker on manufacturing constraints, permission-aware retrieval and an explanation of the match.
pipe: Query intake @ PLM and CAD plugin ; Shape and text embedding @ encoder ; Candidate retrieval @ vector index ; Constraint re-ranking @ gradient boosting ; Permission filter @ PLM access service ; Result display @ CAD plugin ; Reuse feedback @ analytics
edge: Poor sketch | the query is ambiguous | Ask for attributes and show nearest examples
edge: Restricted design | the user lacks access | Hide the result and give no hint of content
edge: New geometry type | embeddings do not cover it | Monitor recall by family and retrain
off: Recall at ten on judged reuse cases ; Constraint match precision ; Latency at p95
on: Part reuse rate ; New part numbers avoided ; Time to find a design
gap: Shape-only matching ; Index-time permissions ; Using clicks as relevance

== ehs-incident-report-classification | EHS Incident Report Classification | nlp | seconds | foundational | a=0.3 k=6
obj: Classify safety incident and near-miss reports by type, severity and cause category so EHS teams find systemic hazards faster.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Severe incidents routed to a person immediately ; Report text redacted of names before analytics ; Multilingual support ; 8K reports per month
sn: Taxonomy | The company and regulator taxonomy | Free categories | Reporting must match standards
sn: Severity | Potential severity not just actual harm | Actual outcome only | Near misses with high potential matter most
sn: Privacy | Redacted narratives | Named narratives in analytics | Names deter reporting
sig: Hazard and energy source terms | named hazards such as pressure, height or moving parts | Category evidence | Maintain a lexicon
sig: Potential severity cues | phrases indicating what could have happened | Severity | Reviewed labels
sig: Work activity | task and equipment | Context | From the report form
sig: Location and shift pattern | aggregated location and time | Systemic patterns | Aggregated
noise: Reporter name | privacy risk
noise: Report length | not severity
noise: Language of the report | needs per-language handling
base: Keyword rules by hazard category, because EHS teams use similar lists.
prod: A multilingual classifier for category and potential severity with a rule layer for mandatory escalations, redaction before storage and trend dashboards by hazard and area.
pipe: Report intake @ EHS system ; Redaction @ pattern and model ; Rule layer for mandatory cases @ rule engine ; Classifier @ multilingual transformer ; Routing and queue @ EHS workflow ; Trend analytics @ BI ; Review sample @ monthly audit
edge: Underreported incidents | reports are missing | Show reporting rates by area and encourage reporting
edge: Ambiguous text | classes overlap | Allow multiple labels and abstain
edge: New hazard type | the taxonomy lacks it | An other bucket and a review of growth
off: Recall for high-potential reports at fixed precision ; Category accuracy by language ; Redaction recall
on: Time to route severe reports ; Systemic hazards identified ; Reporting rate
gap: Classifying by outcome only ; Named analytics ; No rule layer for mandatory cases

== shopfloor-analytics-query-agent | Shop-Floor Analytics Query Agent | llm-agents,nlp | seconds | advanced | a=2 k=40
obj: Let supervisors and engineers ask questions in plain language about output, quality, downtime and energy and get correct charts and numbers with the definitions and sources shown.
con: Queries run only against a governed semantic layer ; Metrics use the plant definitions ; The agent is read-only ; Every answer shows its query and data freshness ; Answer within 8 s
sn: Definitions | A semantic layer with governed metrics | The model inventing SQL on raw tables | Different definitions give different numbers
sn: Trust | The query and sources shown with every answer | A number with no lineage | Plants will not trust unexplained numbers
sn: Scope | Questions the semantic layer covers | Open-ended analysis | Out-of-scope answers are guesses
sig: Metric match | whether the question maps to a governed metric | Correctness | Semantic layer coverage
sig: Time and entity resolution | lines, shifts and periods resolved | Right slice | Check ambiguities
sig: Data freshness | age of the data used | Trust | From pipelines
sig: Query validation result | row count and sanity checks | Catches wrong answers | Rules
noise: Question phrasing | not substance
noise: User seniority | not relevant to correctness
noise: Chat length | an artefact
base: Fixed dashboards by role, because they are the current way plants see metrics.
prod: A text-to-metrics agent over a semantic layer with entity resolution, validation of generated queries, charts with definitions and a log for governance.
pipe: Question intake @ chat and dashboard ; Entity and period resolution @ LLM with lookups ; Query generation @ semantic layer API ; Result validation @ rules ; Chart and answer @ LLM with citations ; User feedback @ app ; Governance log @ lakehouse
edge: Ambiguous line name | two lines match | Ask which one and show the options
edge: Metric not defined | no governed metric exists | Say so and route to the data owner
edge: Stale data | a pipeline is late | Show freshness and warn
off: Answer accuracy against analyst-verified queries ; Query validity rate ; Refusal accuracy for out-of-scope questions
on: Analyst requests avoided ; Time to answer a plant question ; Disputes over numbers
gap: Free SQL on raw tables ; Hiding query and lineage ; Answering out of scope

== warranty-claim-prediction | Warranty Claim Prediction | tabular,time-series | batch | advanced | a=0.2 k=8
obj: Forecast warranty claims by product, build period and failure mode so reserves, supplier recovery and corrective actions are sized correctly.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Forecast by product and month in service ; Intervals for finance reserves ; Failure modes linked to build data ; Monthly run for 20K product variants
sn: Exposure | Units in service by age | Claim counts alone | Claims depend on how many are exposed
sn: Delay | Reporting delay modelled | Claims to date as final | Recent builds look better than they are
sn: Cause | Failure mode tied to build lot and supplier | Product-level totals | Totals hide a bad lot
sig: Units in service by age | installed base by months in service | Exposure | From sales and registration
sig: Early field failure rate | claims per thousand units in the first months | Leading indicator | By build period
sig: Build and supplier lot attributes | plant, line and component lots | Cause finder | From genealogy
sig: Usage intensity | duty cycle or mileage | Wear | From telematics where available
noise: Dealer name | an identifier
noise: Claim number | an identifier
noise: Claim text length | an artefact
base: Claim rate per thousand units by product and month in service, because finance uses it for reserves.
prod: A cohort survival model with reporting-delay correction and failure-mode splits, early-warning flags for build lots and a reserve forecast with intervals.
pipe: Claims and sales data @ warranty system ; Delay correction @ statistical model ; Cohort survival model @ survival analysis ; Lot attribution @ genealogy join ; Early warning @ control charts ; Reserve forecast @ finance report ; Corrective action link @ quality system
edge: Recall or campaign | claims jump after a campaign starts | Campaign flags and separate handling
edge: Claim policy change | claim rates shift after a policy change | Policy-aware features
edge: New product | no claim history | Use similar products and engineering priors
off: Forecast error by month in service ; Interval coverage ; Early warning lead time
on: Reserve accuracy ; Supplier recovery ; Time to detect a bad lot
gap: Using claims to date as final ; Ignoring exposure ; Product-level totals only

== field-failure-early-warning | Field Failure Early Warning | time-series | batch | advanced | a=1 k=6
obj: Detect emerging field failure patterns for a product from service, telemetry and return data weeks before warranty claims show them.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Alert when a failure mode exceeds the expected rate with a confidence level ; Evidence pack for engineering ; Privacy rules for customer data ; Daily run for 3M connected products
sn: Baseline | Expected failure rate by age and variant | Raw counts | Counts grow with the installed base
sn: Source | Service, telemetry and returns together | Claims only | Claims arrive months later
sn: Action | A containment recommendation with affected builds | An alert | Engineers need the affected population
sig: Failure rate versus expected | observed to expected ratio by variant and age | Primary signal | Exposure adjusted
sig: Telemetry fault codes | fault code rates in the field | Early signal | Per firmware
sig: Return reason mix | returns by reason code | Confirms the mode | Coded reasons
sig: Build attributes | plant, line and component lot | Cause | From genealogy
noise: Customer name | irrelevant and private
noise: Dealer name | an identifier
noise: Complaint wording | not a cause
base: A weekly review of claim counts by product, because it is the standard monitoring.
prod: A sequential monitoring model of observed against expected rates across telemetry and returns with lot-level attribution and a ranked early-warning list.
pipe: Field and return data @ service and telemetry feeds ; Expected rate model @ survival model ; Sequential monitor @ change detection ; Lot attribution @ genealogy join ; Early warning list @ engineering console ; Containment decision @ quality board ; Outcome tracking @ monthly
edge: Firmware release | fault codes change meaning | Firmware-aware code maps
edge: Small variant | few units give noisy rates | Shrinkage and a minimum count
edge: Reporting lag | recent months look better | Delay-adjusted expected rates
off: Detection lead time on past issues ; False alert rate ; Attribution accuracy
on: Time from first failure to action ; Field failures prevented ; Recall scope accuracy
gap: Raw counts ; Claims-only monitoring ; Alerts without affected builds

== connected-product-service-scheduling | Connected Product Service Scheduling | time-series,tabular | batch | advanced | a=2 k=8
obj: Schedule service visits and parts for connected industrial products from usage and condition data so customers have fewer breakdowns and fewer unnecessary visits.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Customer contract and consent respected ; Visits proposed with parts and skills ; Customers can decline ; Weekly plan for 400K installed products
sn: Trigger | Condition and usage based service | Fixed intervals | Fixed intervals waste visits and miss early wear
sn: Bundle | Parts and skills planned with the visit | The visit only | A visit without the part needs a second visit
sn: Consent | Customer-approved data use | Silent collection | Consent is a legal and trust requirement
sig: Usage hours and load | running hours and load profile | Wear exposure | From telemetry
sig: Condition indicators | trends in key health measures | Need for service | Per product
sig: Service history | last service and parts replaced | Reset | From service records
sig: Parts availability by region | depot stock | Feasibility | From the supply system
noise: Customer name | irrelevant and private
noise: Product serial | an identifier
noise: Region name alone | weak link
base: Fixed service intervals by hours or calendar, because it is the contract standard.
prod: A condition-based service model that predicts time to service need, bundles parts and skills in a visit proposal and schedules with route optimisation within contract windows.
pipe: Telemetry and usage ingestion @ IoT platform ; Condition model @ survival and degradation model ; Visit proposal @ rules ; Parts and skills check @ service system ; Route and schedule @ optimiser ; Customer approval @ portal ; Outcome tracking @ service records
edge: Connectivity gaps | no data for a period | Use last known state and widen intervals
edge: Customer declines | visits are postponed | Risk reminders and a record of the decision
edge: Part shortage | the part is not in stock | Re-plan the visit and arrange parts first
off: Prediction of service need against actual findings ; Visit success without a second visit ; Calibration
on: Unplanned breakdowns ; Visits per product-year ; First-time fix rate
gap: Fixed intervals only ; Ignoring parts ; No consent record

== shopfloor-agent-action-guardrails | Shop-Floor Agent Action Guardrails | llm-agents,tabular | seconds | staff-principal | a=0.3 k=40
obj: Control and audit every action that AI agents take in plant systems such as MES, CMMS and ERP, enforce approval tiers and give quality and EHS teams a replayable record.
con: Policy enforced in a gateway outside the model ; Writes to production recipes and safety systems are never allowed to agents ; Approvals by named roles ; Immutable action log ; Kill switch per agent ; Audit queries over 90 days answered within 5 s
sn: Enforcement | A tool gateway with policy as code | Prompt instructions | Prompts can be bypassed by input
sn: Scope | Least privilege per agent and tool | Shared service accounts | One mistake should not reach the whole plant
sn: Evidence | An append-only log of calls with context | A summary report | Auditors need replay
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
edge: New tool added | no tier defined | Default deny until classified
off: Policy test coverage ; Detection of seeded anomalous actions ; Replay completeness
on: Actions blocked by policy ; Incidents caused by agent actions ; Time to answer audit queries
gap: Prompt-only guardrails ; Shared service accounts ; Default allow for new tools
