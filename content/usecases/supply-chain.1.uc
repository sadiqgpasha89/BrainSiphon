# Supply Chain & Logistics, part 1 (use cases 1-25)
== network-demand-sensing-short-term | Short-Term Demand Sensing | time-series,tabular | batch | production-grade | a=1 k=1
obj: Blend point-of-sale, order and external signals into 1-14 day demand forecasts that react to what is actually happening this week.
loss: \mathcal{L}=\sum_{h=1}^{14}\sum_q\rho_q\!\left(y_{t+h}-\hat y_{t+h}^{(q)}\right)
con: Nightly refresh for 5M series ; Latency of POS feeds ; Hierarchical consistency ; Planner overrides audited
sn: Horizon | Short-horizon model on recent sell-through and open orders | Reusing the monthly statistical forecast | Monthly models ignore this week's signals
sn: Reconciliation | Reconcile sensing output with the plan hierarchy | Independent SKU forecasts | Totals disagree with plan and planners distrust it
sn: Censoring | Constrained demand flags so allocation-capped sales are not read as demand | Training on raw sales during supply restrictions | The model learns that demand collapsed when stock was simply rationed
sn: Evaluation | Error measured at SKU and location level with forecast value added | Aggregate accuracy across the whole network | Aggregate error can be a fifth of SKU error because mistakes cancel out
sig: Open order book | confirmed orders not yet shipped by SKU | A leading indicator that exists only for the next two weeks | Take the snapshot as it stood at forecast time
sig: Sell-through momentum | 7-day vs 28-day velocity ratio | Shows a trend change before monthly averages do | Align calendar days across the two windows
sig: External event signal | weather, strikes, promotions known in advance | Explains demand shocks the history cannot | Use the forecast published at the origin, not the observed value
sig: Planned promotion flag | whether the target day sits inside a scheduled promotion | Promotions multiply demand and are known weeks ahead | The flag must be the plan as of the origin, not the promotion as finally run
sig: Same-weekday history | mean of the last two or three same-weekday sales before the origin | Weekly rhythm dominates short-term demand | Only same weekdays that fall on or before the origin day may be used
noise: Year-over-year growth rate | stale for fast-changing items
noise: Planner ID | carries no demand information and only records who last edited the plan
noise: Annual growth of the whole category | too slow to matter inside a 14-day horizon and already in the level
base: Statistical baseline forecast with a seasonal factor.
prod: Gradient-boosted sensing model on recent signals with quantile outputs, reconciled to the demand plan via MinT.
pipe: POS and order feeds @ Kafka ; Signal feature builder @ Spark ; Sensing forecaster @ LightGBM quantile ; Hierarchical reconciler @ MinT ; Plan publisher @ planning system ; Planner override @ demand planner ; Actuals tracking @ KPI
edge: POS feed arrives late for a region | the model reads a missing day as zero demand | Feed-completeness check per partner and imputation with confidence flags
edge: Sudden supplier allocation limits shipments | observed sales understate demand | Censoring flags and constrained-demand adjustment
edge: Promotion planned but cancelled late | the model forecasts an uplift that never happens and stock is overbuilt | Treat promo flags as probabilistic until a week out and publish the P90 band beside the point forecast
edge: A new SKU with under four weeks of history | same-weekday features are missing and the level is unknown | Fall back to a category prior with wide quantile bands and flag the forecast as low confidence
off: Weighted MAPE at 1-14 day horizons ; Forecast value added vs baseline
on: Forecast accuracy at lag 2 ; Expedite shipments avoided
gap: Training with signals that arrive after the forecast time ; Evaluating at aggregate level only

== eta-prediction-for-shipments | Shipment ETA Prediction | time-series,tabular | sub-100ms | production-grade | a=6 k=2
obj: Predict arrival times for in-transit shipments with calibrated uncertainty so customers and planners can act before delays hit.
loss: \mathcal{L}=\sum_i\rho_{0.5}(y_i-\hat q^{50}_i)+\rho_{0.9}(y_i-\hat q^{90}_i)
con: ETA refresh on every scan or ping ; 50 ms API ; Multimodal journeys ; Explainable delay reasons
sn: Uncertainty | P50 and P90 ETAs | Single point ETA | A single ETA hides risk and is late half the time
sn: Context | Network congestion, weather and dwell at hubs | Distance and average speed | Hub dwell dominates variance
sig: Hub dwell-time distribution | recent dwell quantiles at the next hub | Biggest delay source | Window before prediction
sig: Remaining-leg progress | fraction of leg completed by GPS | Progress | GPS timestamp alignment
sig: Weather and disruption on route | alerts in corridor | Delay risk | Known at prediction time
noise: Shipper name | none
noise: Parcel colour | none
base: Planned transit time lookup by lane.
prod: Leg-wise quantile gradient boosting with a survival head for hub dwell, recomputed on every event and cached per shipment.
pipe: Scan and GPS events @ Kafka ; Journey state builder @ Flink ; Leg and dwell models @ LightGBM quantile ; ETA combiner @ distribution convolution ; ETA cache @ low-latency store ; Customer notification @ messaging ; Delivery outcome @ labels
edge: GPS gaps in tunnels or warehouses | ETA freezes or jumps | Last-known state plus dead-reckoning confidence widening
edge: Peak season hub overload | dwell distribution shifts within days | Rolling dwell quantiles and capacity features
off: Pinball loss and interval coverage ; MAE of P50 ETA in hours
on: Late-without-notice rate ; Customer contacts per shipment
gap: Evaluating only on delivered shipments ; Using the final scan in training features

== last-mile-route-optimization | Last-Mile Route Optimisation | reinforcement-learning,time-series | seconds | staff-principal | a=0.2 k=20
obj: Build daily delivery routes that minimise cost and lateness using learned service times and travel-time distributions.
loss: \min_{R}\;\sum_{r\in R}\left(c_{\text{dist}}(r)+c_{\text{late}}\,\mathbb{E}[\text{lateness}(r)]\right)
con: Time windows ; Vehicle capacity ; Driver hours ; Re-optimisation within 5 seconds mid-day
sn: Inputs | Learned stop service times and travel-time distributions | Fixed average speeds and stop times | Wrong inputs make an optimal solver produce bad routes
sn: Objective | Expected lateness and driver fairness | Distance only | Distance-minimal routes miss time windows
sig: Stop service-time model | predicted minutes per stop by building and parcel type | Realistic plan | Historical stop data
sig: Travel-time distribution | quantiles per road segment and hour | Reliability | Traffic history
sig: Customer time-window flexibility | historical acceptance of window changes | Slack | Preferences
noise: Driver name | handled by capability
noise: Parcel ID | none
base: Savings-algorithm VRP with fixed service times.
prod: ALNS/OR-Tools solver fed by learned service-time and travel-time models, with a learned neighbourhood-selection policy and live re-optimisation.
pipe: Order and address feed @ OMS ; Geocoder @ address service ; Service and travel time models @ GBDT ; VRP solver @ ALNS with ML guidance ; Route publisher @ driver app ; Dispatcher override @ human ; Execution traces @ telemetry
edge: Failed deliveries cascade through the route | later stops all late | Dynamic re-sequencing and buffer insertion
edge: Geocoding error sends driver to wrong location | the driver is sent to a wrong coordinate and loses minutes searching, delaying every later stop | Address confidence scoring and driver-corrected coordinates
off: Cost vs best-known solutions ; Predicted vs actual service time MAE
on: Cost per stop ; On-time delivery rate
gap: Benchmarks with synthetic service times ; Ignoring driver deviations in evaluation

== vehicle-routing-with-time-windows | Fleet Planning & Vehicle Routing with Time Windows | reinforcement-learning | batch | staff-principal | a=0.05 k=10
obj: Plan multi-day fleet assignments across depots for a regional network, minimising cost under capacity and driver-hour constraints.
loss: \min\;\sum_k c_k\,\mathbb{1}[k\ \text{used}]+\sum_{(i,j)}d_{ij}x_{ijk}+\lambda\,\mathrm{Lateness}
con: Planning window of 2 hours overnight ; Mixed fleets ; Regulations on hours ; Re-plan on disruptions
sn: Scale | Decomposition and learned heuristics for thousands of stops | Solving the full problem exactly | Exact solvers time out at scale
sn: Robustness | Plans with buffers and scenarios | Tight deterministic plans | Tight plans fail with the first delay
sig: Demand uncertainty scenarios | sampled order volumes per lane | Robust plan | Scenario generation model
sig: Depot capacity utilisation | dock slots per hour | Feasibility | Real constraints
sig: Driver-hours remaining | regulation tracker | Compliance | Duty rules
noise: Customer name | none
noise: Order creation hour | none
base: Cluster-first route-second heuristic.
prod: Hybrid pipeline: learned clustering and attention-based construction heuristic, followed by LNS improvement under a time budget.
pipe: Order consolidation @ OMS ; Demand scenario generator @ forecast model ; Construction heuristic @ attention model ; LNS improver @ solver ; Constraint checker @ regulation rules ; Planner approval @ human ; Execution feedback @ telematics
edge: Vehicle breakdown mid-plan | stops assigned to the broken vehicle go unserved until a manual recovery plan exists | Fast local repair and spare capacity pool
edge: Regulation change on driving hours | plans become illegal | Rule engine versioning and automated compliance tests
off: Gap to best-known solution ; Plan feasibility rate in simulation
on: Cost per delivered unit ; Late deliveries
gap: Learning on small instances and testing on large ones ; Ignoring execution variance

== dynamic-dispatch-for-ride-gig-couriers | Dynamic Dispatch for Couriers & Gig Drivers | reinforcement-learning | sub-100ms | staff-principal | a=3 k=2
obj: Match new orders to couriers in real time, balancing delivery time, courier earnings and batch efficiency under fluctuating supply.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t \gamma^t\left(-\text{wait}_t-\lambda\,\text{detour}_t+\mu\,\text{fairness}_t\right)\right]
con: Decision every 2-5 seconds ; Courier acceptance probability ; Fairness of earnings ; City-level scale
sn: Horizon | Value function over future supply and demand | Greedy nearest courier | Greedy matches starve future orders
sn: Acceptance | Model acceptance probability in assignment | Assuming couriers always accept | Rejections add large delays
sig: Courier acceptance probability | model per courier-order pair | Match feasibility | Past offers
sig: Spatiotemporal supply-demand ratio | couriers per order in cell-hour | Pricing and positioning | Forecast not actual
sig: Batch compatibility score | detour added by batching | Efficiency | Route estimates
noise: Courier name | none
noise: Order text | none
base: Greedy nearest available courier.
prod: Batched bipartite matching with learned value function (approximate DP) and acceptance model, solved every few seconds per zone.
pipe: Order stream @ Kafka ; Courier state @ location service ; Acceptance and ETA models @ GBDT ; Value-function estimator @ ADP ; Matching solver @ min-cost flow ; Offer service @ courier app ; Outcome logs @ analytics
edge: Sudden rain increases orders and reduces couriers | demand spikes while courier supply drops, so the dispatch queue explodes and waits balloon | Surge incentives and order throttling
edge: GPS spoofing by couriers | false availability | Anomaly detection on location traces
off: Simulated average delivery time and courier idle time ; Acceptance model calibration
on: Delivery time P90 ; Courier earnings per hour
gap: Simulators that assume independent couriers ; Offline policy evaluation without propensities

== warehouse-slotting-optimization | Warehouse Slotting Optimisation | tabular | batch | production-grade | a=0.05 k=3
obj: Assign SKUs to pick locations to cut travel time and congestion, adapting to demand and affinity patterns.
loss: \min_{x}\;\sum_{s}\sum_{l}f_s\,d_l\,x_{sl}+\lambda\sum_{(s,s')}a_{ss'}\,\mathrm{dist}(x_s,x_{s'})
con: Heavy items low ; Hazmat segregation ; Re-slotting labour cost ; Weekly cadence
sn: Affinity | Co-pick affinity in the objective | Velocity-only ABC classes | Items picked together should be near each other
sn: Cost | Include re-slotting labour in the optimisation | Reshuffling the whole warehouse weekly | Move cost can exceed travel savings
sig: Pick frequency forecast | expected picks per SKU next 4 weeks | Fast movers near docks | Forecast as-of
sig: Co-pick affinity matrix | lift of SKU pairs in orders | Travel reduction | Matured orders
sig: Cube and weight attributes | handling constraints | Feasibility | Master data
noise: SKU description | none
noise: Supplier | none
base: ABC slotting by velocity.
prod: MILP with affinity and move-cost terms on a pick-time simulator, solved weekly with incremental re-slotting waves.
pipe: Order lines and pick logs @ WMS ; Demand and affinity features @ Spark ; Slotting optimiser @ MILP ; Move planner @ wave scheduler ; Simulator check @ discrete-event sim ; Supervisor approval @ human ; Productivity tracking @ KPI
edge: Seasonal assortment changes | slotting stale within weeks | Seasonal triggers and rolling re-slot windows
edge: Master data errors in dimensions | infeasible assignments | Master-data validation and scan-based dimensioning
off: Simulated travel distance reduction ; Pick-time estimate accuracy
on: Lines picked per labour hour ; Travel distance per order
gap: Travel savings ignoring congestion ; Using current slots to infer demand

== pick-path-and-wave-planning | Pick-Path & Wave Planning | reinforcement-learning,tabular | seconds | production-grade | a=0.2 k=3
obj: Group orders into waves and sequence picks to meet cut-off times with minimal labour and congestion.
loss: \min\;\sum_{w}\mathrm{PathLength}(w)+\lambda\,\mathrm{Lateness}+\mu\,\mathrm{Congestion}
con: Carrier cut-offs ; Zone capacity ; Pick-station balance ; Re-plan every few minutes
sn: Batching | Order batching optimisation | Single-order picks | Batching cuts travel dramatically
sn: Congestion | Aisle congestion as a constraint | Shortest path per picker | Many pickers choose the same aisle
sig: Order due-time slack | time to carrier cut-off | Priority | Cut-off table
sig: Zone workload | pending lines per zone | Load balance | Real-time
sig: Aisle congestion estimate | pickers per aisle | Delay | Sensors or WMS
noise: Order ID | none
noise: Customer | none
base: First-come-first-served waves with fixed batch size.
prod: Rolling-horizon optimiser with learned travel-time estimates and a heuristic for batching, re-solved when orders arrive.
pipe: Order release @ WMS ; Travel-time model @ regression ; Batch optimiser @ heuristics plus MILP ; Path sequencer @ TSP variants ; Task push @ picker handhelds ; Floor supervisor override @ human ; Completion events @ WMS
edge: Late rush of orders before cut-off | schedule collapses | Priority re-ranking and overflow pickers
edge: Stockout discovered at pick | route becomes invalid | Real-time replan with substitution rules
off: Simulated lines per hour ; Cut-off miss rate
on: Orders shipped on time ; Pick cost per line
gap: Travel time assumptions from empty warehouse ; Ignoring pick errors

== warehouse-robot-fleet-orchestration | Warehouse Robot Fleet Orchestration | reinforcement-learning | sub-100ms | staff-principal | a=5 k=2
obj: Coordinate hundreds of mobile robots to move shelves and totes without deadlocks while maximising throughput.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t \text{throughput}_t-\lambda\,\text{conflicts}_t\right]
con: Safety-critical collision avoidance ; Plan updates under 100 ms ; Battery management ; Traffic deadlocks must be impossible
sn: Safety | Verified safety layer under the learned policy | End-to-end learned control | Learned policies without guarantees can collide
sn: Scale | Hierarchical task assignment and local planning | Centralised joint planning | Joint planning explodes with fleet size
sig: Task-robot assignment cost | travel plus battery cost | Task allocation | Map state
sig: Congestion heatmap | robot density per cell | Rerouting | Short windows
sig: Battery state-of-charge forecast | time to charge | Availability | Battery model
noise: Robot serial number | none
noise: Task creator | none
base: Rule-based traffic management with reservation tables.
prod: Hierarchical system: learned task allocator (graph RL), conflict-based search path planner and a safety shield enforcing hard constraints.
pipe: Order and task queue @ WCS ; Task allocator @ RL policy ; Path planner @ CBS with learned priorities ; Safety shield @ verified rules ; Robot control @ edge controllers ; Operations monitoring @ dashboard ; Telemetry @ analytics
edge: Wireless network drop | robots lose coordination | Local safe-stop behaviour and degraded autonomy
edge: Blocked aisle from fallen items | a blocked aisle creates a deadlock risk as robots keep planning through it | Dynamic obstacle map and replanning
off: Throughput in simulation ; Collision and deadlock count
on: Orders per hour ; Robot utilisation
gap: Training in empty warehouses ; Ignoring human workers in the environment

== package-damage-detection-vision | Package Damage Detection | computer-vision | seconds | foundational | a=0.5 k=1500
obj: Detect damaged parcels at hub induction and unloading to attribute liability and trigger repacking or claims early.
loss: \mathcal{L}=\mathcal{L}_{\text{det}}+\lambda\,\mathrm{CE}_{\text{severity}}
con: Conveyor speed 2 m/s ; Multi-camera views ; Minimal false stops ; Evidence retention for claims
sn: Severity | Severity grading tied to claim thresholds | Binary damaged flag | Claims and actions depend on severity
sn: Coverage | Multi-angle camera tunnel | Single camera | Damage on hidden faces is missed
sig: Dent and tear detection maps | segmentation of damage | Localisation | Annotation protocol
sig: Package type and material | box, polybag, pallet | Context | Classification
sig: Tracking across cameras | parcel identity across views | Aggregation | ReID
noise: Label colour | none
noise: Belt speed fluctuation | process
base: Manual inspection spot checks.
prod: Multi-view detector with parcel tracking and severity head, edge inference at the conveyor and evidence image storage.
pipe: Camera tunnel @ hub conveyor ; Parcel tracker @ multi-view ReID ; Damage detector @ YOLO on edge GPU ; Severity classifier @ small CNN ; Claim record creator @ rules ; Hub supervisor review @ human ; Claims outcomes @ labels
edge: Lighting changes at shift change | detection thresholds break | Auto exposure control and lighting-invariant augmentation
edge: Shiny polybags produce glare | false damage alarms | Polarising filters and glare-aware training data
off: Damage detection recall at 1% false stop ; Severity accuracy
on: Damage claims resolved with evidence ; Damage rate trend
gap: Training on staged damage ; Not testing different shifts

== parcel-sorting-barcode-ocr | Parcel Sorting: Label Reading & Address OCR | computer-vision,nlp | sub-100ms | production-grade | a=2 k=800
obj: Read barcodes and address text from parcels on fast conveyors with high first-pass read rate to reduce manual coding.
loss: \mathcal{L}=\mathcal{L}_{\text{det}}+\mathcal{L}_{\text{CTC}}
con: 99.5% read rate ; 100 ms per parcel ; Damaged and curved labels ; Multi-language addresses
sn: Fallbacks | Barcode first then OCR with address validation | OCR on everything | Barcode is faster and more reliable
sn: Validation | Address validation against postal database | Raw OCR text | OCR output often contains plausible but invalid addresses
sig: Barcode decode confidence | decoder checksum success | Reliability | Hardware
sig: OCR confidence by field | per-field probabilities | Routing | Calibrated
sig: Address validity score | fuzzy match to postal database | Correctness | Database version
noise: Parcel colour | none
noise: Belt ID | none
base: Fixed-mount barcode scanners with manual keying fallback.
prod: Multi-camera capture, detection plus barcode decoder, scene-text OCR with address parser and postal validation, human keying for low confidence.
pipe: Camera array @ sorter ; Label detector @ detector ; Barcode and OCR @ decoders and CTC ; Address parser and validator @ postal rules ; Sort-code assignment @ routing table ; Manual keying @ human ; Misroute feedback @ audits
edge: Handwritten addresses | OCR misreads and misroutes | Handwriting-specific model and keying route
edge: Label under tape reflection | glare hides the barcode so the parcel is missed by the scanner and sent to manual coding | Multi-angle lighting and glare removal
off: First-pass read rate ; Address validation precision
on: Manual keying rate ; Misroute rate
gap: Test images with clean labels ; Not measuring misroutes downstream

== pallet-and-load-dimensioning-vision | Pallet Dimensioning & Load Verification | computer-vision | seconds | production-grade | a=0.1 k=4000
obj: Measure dimensions, weight proxies and load shape from 3D cameras to verify freight declarations and optimise trailer space.
loss: \mathcal{L}=\mathrm{Huber}(\text{dims},\widehat{\text{dims}})+\lambda\,\mathrm{ShapeConsistency}
con: Accuracy within 1 cm ; Throughput on dock ; Revenue dispute evidence ; Calibration drift
sn: Geometry | Depth-sensor point cloud fusion | RGB-only estimation | RGB lacks scale
sn: Revenue | Dimension audit trail for billing | Estimates without evidence | Billing disputes need images and measures
sig: Point-cloud bounding volume | fitted box from fused cloud | Dimensions | Calibration
sig: Overhang and stacking stability | geometric checks | Safety | Rules
sig: Declared vs measured discrepancy | difference to declaration | Billing audit | Tolerance
noise: Pallet colour | none
noise: Forklift operator | none
base: Manual tape measurements.
prod: Calibrated depth cameras with point-cloud segmentation, automatic calibration checks and a discrepancy-flagging service.
pipe: Depth cameras @ dock ; Calibration check @ self-diagnosis ; Segmentation and box fitting @ point-cloud network ; Discrepancy engine @ rules ; Billing update @ TMS ; Dock supervisor @ human ; Dispute evidence @ archive
edge: Shrink-wrap reflections | reflective wrap creates depth noise that corrupts the measured pallet dimensions | Multi-view fusion and outlier removal
edge: Camera drift after bump | systematic error | Daily calibration target check
off: Dimension error distribution ; Discrepancy flag precision
on: Billing corrections captured ; Trailer cube utilisation
gap: Test freight easier than real ; Calibration done only once

== container-port-yard-planning | Container Yard Stacking & Crane Planning | reinforcement-learning | batch | staff-principal | a=0.02 k=5
obj: Assign container slots and sequence crane moves to minimise reshuffles and vessel turnaround time.
loss: \min\;\sum_c \mathbb{E}[\text{rehandles}_c]+\lambda\,\text{turnaround}
con: Vessel schedules ; Container weight and type constraints ; Reefer plugs ; Plan updates every 15 minutes
sn: Prediction | Predicted pickup times for stacking | Stack in arrival order | Late-pickup containers block early ones
sn: Objective | Rehandles and turnaround jointly | Crane productivity alone | Local crane speed gains cause downstream rehandles
sig: Pickup-time prediction | predicted dwell time per container | Stacking order | Consignee history
sig: Stack height and exposure | rehandle risk of position | Cost | Yard state
sig: Vessel stowage plan | planned load sequence | Constraints | Plan version
noise: Container ID | none
noise: Shipping line colour | none
base: Rule-based stacking by vessel and weight class.
prod: Learned dwell predictor feeding a stacking policy (value-function approximation) with a MIP for crane sequencing.
pipe: Gate and vessel data @ TOS ; Dwell predictor @ GBDT ; Stacking policy @ approximate DP ; Crane sequencer @ MIP ; Plan to equipment @ TOS ; Yard planner approval @ human ; Move logs @ telemetry
edge: Vessel arrives early or late | plan invalidated | Rolling-horizon replan with disturbance triggers
edge: Customs holds appear | container immobile at bad slot | Hold-aware slotting and relocation rules
off: Rehandle count in simulation ; Dwell-time prediction error
on: Vessel turnaround time ; Moves per crane hour
gap: Simulator with perfect information ; Ignoring customs variance

== container-dwell-time-prediction | Container Dwell-Time Prediction | tabular,time-series | batch | production-grade | a=0.02 k=3
obj: Predict how long import containers stay in port to plan yard capacity, trucking and demurrage exposure.
loss: \mathcal{L}=-\sum_i\left[\delta_i\log h(t_i)-H(t_i)\right]
con: Censoring for still-in-yard containers ; Daily refresh ; Interpretable for terminal planners ; Data from multiple parties
sn: Censoring | Survival model for containers still in yard | Regression on completed dwell only | Completed-only data underestimates long dwell
sn: Parties | Consignee and customs-broker behaviour | Container attributes only | Behaviour drives release timing
sig: Customs status stage | cleared, hold, pending | Release gating | Event times
sig: Consignee dwell history | median dwell of past boxes | Behaviour | Prior only
sig: Weekend and holiday gap | days until next working day | Operational | Calendar
noise: Container colour | none
noise: Seal number | none
base: Average dwell by shipping line.
prod: Discrete-time survival GBDT with customs-stage features and consignee embeddings.
pipe: Port and customs events @ TOS ; Feature builder @ Spark ; Survival model @ GBDT ; Yard capacity forecast @ aggregation ; Planner dashboard @ BI ; Terminal planner @ human ; Release events @ labels
edge: Customs system outage | no clearance events | Outage flag and widened predictions
edge: Port congestion changes truck availability | dwell lengthens broadly | Congestion index covariates
off: Concordance index ; Calibration of dwell quantiles
on: Yard utilisation forecast error ; Demurrage costs
gap: Training on completed containers only ; Using clearance time as a feature before it happens

== freight-rate-prediction-and-pricing | Freight Rate Prediction & Pricing | tabular,time-series | sub-100ms | production-grade | a=1 k=2
obj: Quote spot and contract freight rates instantly using lane market data, capacity and customer value, balancing win rate and margin.
loss: \mathcal{L}=\mathrm{Huber}(\log r,\log\hat r)+\lambda\,\mathrm{WinProbCalibration}
con: Quote in 100 ms ; Margin floors ; Volatile fuel and capacity ; Auditability of quotes
sn: Market | Lane-level market index and capacity tightness | Own historical rates | Own rates lag the market
sn: Win | Win probability curve vs price | Cost-plus pricing | Pricing without demand response leaves money on the table
sig: Lane market index | rolling spot index per lane | Market level | Index lag
sig: Capacity tightness | load-to-truck ratio | Price pressure | Real-time
sig: Customer price sensitivity | quote-win history | Win curve | Prior
noise: Quote ID | none
noise: Salesperson name | personal
base: Cost-plus quoting with fuel surcharge.
prod: Gradient-boosted rate model with market indices and a win-probability model feeding a margin-maximising price optimiser.
pipe: Quote request @ TMS ; Market feature service @ index store ; Rate model @ LightGBM ; Win-probability model @ logistic GBDT ; Price optimiser @ constrained search ; Sales approval @ human ; Quote outcomes @ CRM
edge: Hurricane disrupts capacity | capacity collapses and spot rates spike beyond anything the model has seen | Event features and wide intervals
edge: Rate data vendor outage | stale market index | Fallback indices and staleness flags
off: MAPE of rate ; Win-curve calibration
on: Margin per load ; Quote win rate
gap: Won quotes only in training ; Using final rate as feature

== carrier-selection-and-tendering | Carrier Selection & Tendering | reinforcement-learning,tabular | seconds | production-grade | a=0.3 k=3
obj: Choose which carrier to tender each load to, using acceptance probability, cost and service history to cut failed tenders.
loss: \min_a\;c_a+\lambda\,(1-p^{\text{accept}}_a)\,c^{\text{fail}}+\mu\,\text{service risk}_a
con: Contract allocations ; Tender time limits ; Service-level agreements ; Fair distribution
sn: Acceptance | Model carrier acceptance probability per load | Following routing guide order | Guide order ignores current capacity
sn: Cost | Expected cost including failed-tender fallback | Lowest contracted rate | Rejections trigger expensive spot fallbacks
sig: Carrier acceptance probability | model per carrier-lane-day | Tender success | History
sig: Carrier on-time performance | rolling OTP | Service | Matured
sig: Capacity signals | carrier posted capacity | Availability | Real-time
noise: Carrier name | encoded in history
noise: Load number | none
base: Routing guide waterfall in contract order.
prod: Acceptance-aware ranking with multi-armed bandit exploration for new carriers, respecting contract allocations.
pipe: Load creation @ TMS ; Candidate carriers @ routing guide ; Acceptance and OTP models @ GBDT ; Tender optimiser @ expected-cost ranker ; Tender API @ carrier portals ; Transport planner @ human ; Outcome logs @ TMS
edge: Carrier changes bid behaviour after rate update | acceptance model stale | Fast retraining and drift alerts
edge: Contract allocation breaches | awarding too many loads to one carrier breaches contract allocations and triggers penalties | Allocation constraints in optimiser
off: Tender acceptance AUC and calibration ; Simulated cost per load
on: First-tender acceptance rate ; Spot spend share
gap: Logs only contain chosen carriers ; Ignoring service impact of cheaper carriers

== supplier-risk-and-disruption-prediction | Supplier Risk & Disruption Prediction | graph,nlp,tabular | batch | staff-principal | a=0.05 k=40
obj: Predict supplier failures and disruptions across tiers by fusing financial, operational, geographic and news signals.
loss: \mathcal{L}=\mathrm{FL}(y,p)+\lambda\,\mathrm{GraphReg}
con: Multi-tier visibility ; Data licensing ; Weekly updates ; Explainable alerts for procurement
sn: Tiers | Sub-tier network propagation of risk | Tier-1 scores only | Disruptions originate at deeper tiers
sn: Signals | Leading indicators (payment delays, news, shipment slippage) | Annual financial ratios | Annual accounts are stale
sig: Payment delay trend | days beyond terms over 6 months | Distress | Matured payments
sig: Shipment slippage trend | on-time delivery rate change | Operations | Receipts
sig: Network concentration | share of volume from a single sub-supplier | Systemic risk | Graph snapshot
noise: Supplier logo | none
noise: Website age | weak
base: Annual financial scoring from a rating vendor.
prod: Heterogeneous supplier graph with GNN risk propagation, news-event NLP signals and a GBDT stacker, providing explanations and mitigation options.
pipe: Internal ERP and external data @ lake ; Entity resolution @ company matching ; Supply network graph @ graph DB ; Risk model @ GNN plus GBDT ; News event extractor @ NLP ; Procurement review @ human ; Disruption outcomes @ labels
edge: Entity resolution merges different suppliers | false risk propagation | Conservative matching with human verification
edge: News false alarms | repeated false alarms from low-quality sources create alert fatigue and ignored warnings | Source reliability weighting and corroboration
off: Precision at top-k suppliers ; Lead time before disruption
on: Disruption cost avoided ; Alternate sourcing lead time
gap: Rare disruptions leave few labels ; Time leakage via news published after the disruption

== supply-chain-news-event-monitoring-llm | Supply-Chain Event Monitoring with LLM Agents | llm-agents,nlp | seconds | production-grade | a=0.02 k=30 s=4 t=350
obj: Monitor global news, port notices and weather to detect events affecting specific lanes and suppliers and propose mitigation actions.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{articles})+\lambda\,\mathrm{Unsupported}
con: Source attribution ; False-alert rate low ; Multilingual sources ; Human approval for actions
sn: Relevance | Map events to the company's network graph | Generic news summaries | Planners need impact on their lanes and suppliers
sn: Verification | Corroboration across independent sources | Single-source alerts | Rumours trigger costly actions
sig: Network impact score | exposure of company flows to event location | Prioritisation | Graph join
sig: Source corroboration count | independent sources reporting | Credibility | Dedup
sig: Event severity classification | severity class | Triage | Taxonomy
noise: Article sentiment | not impact
noise: Social media volume | rumour amplification
base: Keyword alerts on news feeds.
prod: Streaming ingestion, event extraction and clustering, graph-based impact analysis and an agent that proposes actions with cited evidence.
pipe: News and notice feeds @ ingestion ; Event extractor @ LLM structured ; Event clusterer @ embeddings ; Network impact analyser @ graph queries ; Mitigation agent @ LLM with tools ; Planner approval @ human ; Outcome review @ feedback
edge: Duplicate reports of one event | repeated alerts | Event clustering and dedup window
edge: Mistranslation of local-language news | mistranslated place names map the event to the wrong location and the wrong suppliers | Multilingual NER and geocoding confidence
off: Event detection precision and recall ; Impact mapping accuracy
on: Time from event to action ; Alert-to-action ratio
gap: Evaluation set built from major events only ; Counting retrieved events as impactful

== inventory-optimization-multi-echelon | Multi-Echelon Inventory Optimisation | reinforcement-learning,time-series | batch | staff-principal | a=0.1 k=3
obj: Set stocking levels across plants, DCs and stores to hit service targets at minimal total inventory investment.
loss: \min\;\sum_{n}h_n\,\mathbb{E}[I_n^+]\ \text{s.t. }\Pr(\text{stockout}_n)\le\alpha_n
con: Lead-time variability ; Echelon service levels ; Working-capital targets ; Quarterly policy refresh
sn: Network | Guaranteed-service or stochastic multi-echelon model | Independent location safety stocks | Independent buffers over-stock the network
sn: Variability | Lead-time and forecast-error distributions | Mean-based rules | Variability sets safety stock
sig: Demand forecast error distribution | residuals by horizon | Uncertainty | Forecast backtest
sig: Replenishment lead-time distribution | empirical quantiles | Buffer sizing | Delivered times
sig: Holding cost and criticality | cost and service class | Trade-off | Finance data
noise: SKU code | none
noise: Planner | none
base: Single-echelon safety stock formula per node.
prod: Stochastic multi-echelon optimiser with learned demand and lead-time distributions validated by network simulation.
pipe: Network data @ ERP ; Distribution estimators @ forecasting ; Multi-echelon optimiser @ stochastic program ; Simulator @ discrete-event sim ; Policy publisher @ planning tools ; Inventory planner @ human ; Service KPIs @ tracking
edge: Single-sourced component disrupted | policy assumes normal lead times | Disruption scenarios in optimisation
edge: Forecast bias changes after a promotion strategy | a new promotion strategy changes forecast bias so the buffers are sized from wrong errors | Bias-aware error distributions
off: Simulated service level vs inventory ; Cost vs baseline policy
on: Inventory days of supply ; Fill rate
gap: Normal-distribution assumptions on skewed demand ; Not simulating the policy before launch

== safety-stock-and-service-level-optimization | Safety Stock & Service-Level Optimisation | tabular,time-series | batch | foundational | a=0.1 k=2
obj: Allocate a working-capital budget to safety stock across SKUs to maximise overall service level.
loss: \max\;\sum_i w_i\,\mathrm{SL}_i(s_i)\ \text{s.t. }\sum_i c_i s_i\le B
con: Budget cap ; Service differentiation ; Intermittent demand ; Quarterly review
sn: Allocation | Marginal-return allocation across SKUs | Same service level for all | Uniform service wastes capital on low-value items
sn: Distribution | Empirical or fitted non-normal demand-during-lead-time | Normal approximation | Normality fails for intermittent and skewed demand
sig: Demand over lead time distribution | simulated convolution | Buffer size | Lead-time data
sig: Item value and criticality | margin and criticality | Weighting | Master data
sig: Forecast bias | mean error of forecasts | Adjustment | Matured
noise: SKU description | none
noise: Supplier | none
base: Z-score safety stock at a uniform service level.
prod: Marginal analysis optimiser using simulated demand-during-lead-time distributions with differentiated targets.
pipe: Demand and lead-time history @ lake ; Distribution fitter @ empirical bootstrap ; Marginal optimiser @ greedy allocation ; Policy publisher @ planning system ; Planner review @ human ; Service tracker @ KPI ; Feedback to parameters @ refit
edge: Item with few demand observations | unstable distribution | Hierarchical pooling and minimum-data rules
edge: Lead-time shock | buffers insufficient | Lead-time monitor with automatic recomputation
off: Service level at budget in simulation ; Distribution fit quality
on: Fill rate at equal inventory ; Inventory reduction
gap: Normality assumed ; Ignoring correlation between SKUs

== production-planning-and-scheduling | Production Planning & Shop-Floor Scheduling | reinforcement-learning | batch | staff-principal | a=0.02 k=5
obj: Sequence jobs on machines to meet due dates with minimal changeovers and WIP, adapting to breakdowns and rush orders.
loss: \min\;\sum_j w_j T_j+\lambda\sum_m \text{setup}_m
con: Machine eligibility ; Changeover matrices ; Due dates ; Reschedule in under 1 minute
sn: Dynamics | Reactive rescheduling | Static daily plan | Disruptions invalidate static plans
sn: Objective | Weighted tardiness with setup costs | Makespan only | Makespan ignores customer priorities
sig: Setup time matrix | changeover durations | Sequencing | MES data
sig: Machine health state | predicted downtime risk | Reliability | Sensors
sig: Job slack | due date minus remaining processing | Priority | Routing
noise: Job number | none
noise: Operator ID | none
base: Dispatching rules (EDD, SPT).
prod: CP-SAT scheduler with learned processing-time estimates and a neural dispatching policy for fast reactive decisions.
pipe: Orders and BOM @ ERP ; Processing-time model @ GBDT ; CP-SAT scheduler @ constraint solver ; Reactive dispatcher @ RL policy ; Schedule publish @ MES ; Planner override @ human ; Shop-floor feedback @ MES
edge: Machine breakdown | schedule infeasible | Reactive re-sequencing and spare capacity rules
edge: Rush order insertion | tardiness cascades | Priority-aware insertion and impact preview
off: Weighted tardiness vs baseline rules ; Schedule stability
on: On-time delivery ; Changeover time
gap: Using actual processing times known after the fact ; Ignoring maintenance windows

== predictive-maintenance-fleet | Fleet Predictive Maintenance | time-series,tabular | batch | production-grade | a=24 k=5
obj: Predict component failures from telematics and service history to schedule maintenance before breakdowns.
loss: \mathcal{L}=\mathrm{BCE}\text{(failure within horizon)}+\lambda\,\mathrm{CostWeighting}
con: Downtime costs ; Telematics gaps ; Explainable component-level alerts ; Weekly planning
sn: Label | Time-to-failure with maintenance as censoring | Binary failure flag | Preventive replacement censors failures
sn: Cost | Cost-sensitive thresholds per component | Single threshold | Failure and over-maintenance costs differ by part
sig: Sensor degradation trend | slope of vibration, temperature or voltage | Wear | Sensor calibration
sig: Usage intensity | engine hours and load profile | Stress | Telematics
sig: Service history gap | days since last service of the part | Risk | Maintenance records
noise: Vehicle colour | none
noise: Driver ID | personal
base: Fixed-interval maintenance.
prod: Component-wise survival and gradient-boosted models with sensor embeddings, cost-sensitive thresholds and maintenance schedule optimiser.
pipe: Telematics stream @ IoT hub ; Feature builder @ Spark ; Component risk models @ survival GBDT ; Maintenance optimiser @ scheduling ; Workshop booking @ fleet system ; Technician review @ human ; Failure and service records @ labels
edge: Sensor firmware update changes scale | a firmware update rescales sensor values so features shift and predictions degrade | Firmware-aware normalisation
edge: Preventive replacement hides failure labels | model underestimates risk | Censoring-aware survival labels
off: Time-dependent AUC ; Cost savings in simulation
on: Unplanned breakdowns ; Maintenance cost per km
gap: Treating replaced parts as non-failures ; Random split across vehicles over time

== predictive-maintenance-warehouse-equipment | Warehouse Equipment Anomaly Detection | time-series | sub-100ms | production-grade | a=1440 k=1
obj: Detect abnormal vibration, current and temperature in conveyors, sorters and AGVs in real time to prevent line stoppages.
loss: \mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2+\beta\,\mathrm{KL}
con: Edge inference on PLC-adjacent hardware ; Few failure labels ; Low false alarms ; Explanation to technicians
sn: Labels | Unsupervised or semi-supervised on healthy data | Supervised failure classifier | Failures are rare and diverse
sn: Context | Operating-mode-conditional baselines | Global thresholds | Load and speed change signals
sig: Spectral vibration features | band energies and harmonics | Bearing faults | Sampling rate
sig: Motor current signature | harmonic ratios | Electrical faults | Load condition
sig: Residual to healthy model | reconstruction error by mode | Anomaly | Mode label
noise: Raw timestamp | none
noise: Machine serial | encoded in mode
base: Static alarm thresholds on vibration RMS.
prod: Mode-conditional autoencoder or normalising-flow on spectral features at the edge, with technician-facing feature attributions.
pipe: Sensors @ vibration and current ; Edge preprocessor @ spectral transform ; Anomaly model @ autoencoder on edge ; Alert aggregator @ debounce ; Maintenance ticket @ CMMS ; Technician check @ human ; Failure confirmation @ labels
edge: Normal operating mode change | a legitimate change in speed or load makes healthy vibration look anomalous and floods alarms | Mode detection and per-mode baselines
edge: Sensor mounting loosened | spurious signals | Sensor health checks and baseline resets
off: Detection lead time before failure ; False-alarm rate per machine-month
on: Unplanned stoppage minutes ; Maintenance cost
gap: Seeded faults unlike real failures ; Evaluating on healthy periods only

== cold-chain-temperature-excursion-prediction | Cold-Chain Excursion Prediction | time-series | sub-100ms | production-grade | a=96 k=1
obj: Predict temperature excursions in reefer trailers and pharma shipments minutes ahead so interventions save the load.
loss: \mathcal{L}=\mathrm{BCE}(y_{t+h},p_t)+\lambda\,\mathrm{Huber}(T_{t+h},\hat T_{t+h})
con: GDP / HACCP compliance ; Intervention lead time of 15-60 minutes ; Sensor drift ; Audit trail
sn: Physics | Thermal model features (door opens, ambient, setpoint) | Pure sequence model | Physics-informed features generalise across trailers
sn: Action | Alert with a recommended action and time-to-breach | Raw temperature chart | Drivers need what to do and how long they have
sig: Door-open events | duration and count | Heat ingress | Sensor
sig: Ambient vs setpoint delta | outside temp minus setpoint | Load on cooling | Weather
sig: Cooling unit duty cycle | compressor on-time fraction | Capacity | Unit telemetry
noise: Trailer ID | none
noise: Route colour | none
base: Threshold alarms at limit temperatures.
prod: Gray-box thermal model combined with a sequence network predicting time-to-breach, with calibrated alerts to driver and control tower.
pipe: Telemetry stream @ IoT ; Thermal feature builder @ stream ; Time-to-breach model @ gray-box plus GRU ; Alert policy @ calibrated thresholds ; Driver and control tower @ human ; Corrective action log @ audit ; Outcome labels @ quality records
edge: Sensor drift | false alarms or misses | Redundant sensors and drift detection
edge: Door left open during loading | rapid excursion | Context-aware alerting with loading-mode suppression logic
off: Lead time at fixed precision ; Time-to-breach error
on: Product loss from excursions ; Alerts acted upon
gap: Excursion labels incomplete ; Evaluating on loaded routes only

== fuel-consumption-and-eco-routing | Fuel Consumption Prediction & Eco-Routing | tabular,time-series | batch | production-grade | a=2 k=2
obj: Predict vehicle fuel use per route segment and choose routes and speeds that cut fuel and emissions at acceptable time cost.
loss: \mathcal{L}=\mathrm{Huber}(F,\hat F)
con: Time-window feasibility ; Emission reporting ; Vehicle heterogeneity ; Monthly model refresh
sn: Physics | Vehicle dynamics features (grade, mass, speed profile) | Distance only | Fuel depends strongly on grade and load
sn: Trade-off | Cost-optimal route including time cost | Fuel-minimal route | Fuel-minimal routes can break time windows
sig: Road grade profile | elevation along route | Energy | DEM data
sig: Vehicle mass estimate | payload plus tare | Fuel use | Load data
sig: Speed profile variance | stop-go intensity | Efficiency | Traffic
noise: Driver age | personal
noise: Colour | none
base: Fuel per kilometre average per vehicle type.
prod: Physics-informed gradient-boosted fuel model per vehicle class feeding a multi-objective router.
pipe: Telematics and routes @ lake ; Segment feature builder @ GIS join ; Fuel model @ GBDT with physics features ; Eco-router @ multi-objective search ; Plan publisher @ routing system ; Dispatcher @ human ; Actual fuel @ fuel cards
edge: Fuel card data misattributed | fuel purchases are linked to the wrong vehicle, so training labels carry large errors | Reconciliation of fuel cards with telematics
edge: New vehicle model | a vehicle model with no history gets unreliable fuel predictions from the class average | Class-level priors with spec-based features
off: MAPE of fuel per trip ; Realised savings in A/B routes
on: Fuel per delivery ; CO2 per tonne-km
gap: Training on fuel cards with timing error ; Ignoring payload variation

== driver-behaviour-and-safety-scoring | Driver Behaviour & Safety Scoring | time-series | batch | production-grade | a=2 k=20
obj: Score driver safety from telematics and video events to target coaching and reduce accidents without unfair penalties.
loss: \mathcal{L}=\mathrm{PoissonDeviance}(\text{incidents},\hat\lambda)
con: Driver privacy ; Fair normalisation by route and vehicle ; Coaching programme integration ; Union agreements
sn: Normalisation | Events per 100 km normalised by road type and conditions | Raw event counts | Urban routes generate more harsh braking
sn: Action | Coaching targeted at specific behaviours | Single overall rank | Drivers need specific behaviours to change
sig: Harsh events by context | brake and cornering events normalised | Behaviour | Road type
sig: Following distance and distraction | video-based events | Strong predictor | Camera consent
sig: Speeding percentage | share over limit | Risk | Limit map
noise: Driver tenure | confounded
noise: Vehicle plate | none
base: Rule-based scorecard.
prod: Context-normalised event model feeding a Poisson GBDT predicting incident risk, with coach-friendly behaviour breakdowns.
pipe: Telematics and video events @ vendor ; Context enricher @ map matching ; Event normaliser @ stats ; Risk model @ Poisson GBDT ; Coaching recommender @ rules ; Safety manager @ human ; Incident records @ labels
edge: Camera blocked or disabled | a covered or unplugged camera produces no events, so risky drivers look perfectly safe | Coverage monitoring and data-quality flags
edge: Different vehicles have different brake thresholds | vehicle-specific braking thresholds make some drivers look worse for reasons they do not control | Vehicle-type calibration
off: Calibration of incident rate by decile ; Stability of scores
on: Accident rate ; Coaching completion
gap: Incident labels sparse ; Evaluating on drivers who changed behaviour due to coaching
