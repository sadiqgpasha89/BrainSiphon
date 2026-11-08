# Supply Chain & Logistics, part 2 (use cases 26-50)
== freight-fraud-and-cargo-theft-detection | Freight Fraud & Cargo Theft Detection | graph,tabular | batch | staff-principal | a=0.1 k=10
obj: Detect fictitious pickups, identity-theft carriers and strategic cargo theft before loads are tendered or while in transit.
loss: \mathcal{L}=\mathrm{FL}(y,p)+\lambda\,\mathrm{GraphReg}
con: Decision before tender in seconds ; Carrier onboarding checks ; Legal evidence ; Low friction for legitimate carriers
sn: Identity | Carrier identity continuity (phone, email, bank, insurer) | Single registration checks | Fraudsters cloned dormant legitimate carriers
sn: Behaviour | Pickup and route anomalies against lane norms | Static watch lists | Lists lag new fraud rings
sig: Contact-detail change velocity | changes to phone, email and bank in 30 days | Takeover marker | Event-time snapshots
sig: Carrier-network overlap | shared contacts with flagged carriers | Ring signal | Graph as-of
sig: Route and dwell deviation | deviation from planned route and unscheduled stops | In-transit theft | GPS quality
noise: Carrier name length | none
noise: Truck colour | none
base: Watch lists plus manual carrier vetting.
prod: Graph features and GBDT at tender time plus streaming route-deviation detection with automatic escalation.
pipe: Tender request @ TMS ; Carrier identity graph @ graph DB ; Fraud model @ GBDT ; Tender gate @ policy ; GPS stream monitor @ Flink ; Security desk @ human ; Incident outcomes @ labels
edge: Legitimate carrier updates bank details | false takeover alarm | Out-of-band verification workflow and risk tiering
edge: GPS jamming by thieves | jammers blank the tracker so the load disappears from the map just when theft happens | Gap-based alerts and last-known-state escalation
off: Precision at security desk capacity ; Detection lead time
on: Cargo loss value ; Carrier onboarding time
gap: Few labelled thefts with bias to detected cases ; Features computed after incident reports

== customs-hs-code-classification | Customs HS-Code Classification | nlp | sub-100ms | production-grade | a=0.5 k=3
obj: Classify goods into Harmonised System codes from descriptions and invoices to accelerate clearance and avoid duties disputes.
loss: \mathcal{L}=\sum_{\ell}\mathrm{CE}_{\ell}+\lambda\,\mathrm{HierarchyConsistency}
con: 6-10 digit codes by country ; Tariff updates annually ; Explainability for brokers ; Penalties for misclassification
sn: Hierarchy | Predict chapter, heading and subheading hierarchically | Flat 10,000-way classification | Hierarchy gives graceful degradation to the correct heading
sn: Rules | Apply legal notes and general rules of interpretation | Pure text similarity | Classification is rule-governed, not purely semantic
sig: Hierarchical code probabilities | per-level probabilities | Routing | Calibration
sig: Material and function attributes | extracted attributes | Determines heading | Extractor accuracy
sig: Tariff note rule hits | matched legal notes | Compliance | Version
noise: Invoice number | none
noise: Seller name | encoded in prior shipments
base: Keyword lookup tables used by brokers.
prod: Hierarchical transformer with attribute extraction, rule-based tariff-note checks and broker review for low confidence.
pipe: Invoice or product description @ API ; Attribute extractor @ NER ; Hierarchical classifier @ transformer ; Tariff rule checker @ legal notes ; Broker review @ human ; Declaration builder @ customs system ; Ruling feedback @ customs decisions
edge: Annual HS revision changes code structure | codes are renumbered each revision so stale mappings produce wrong classifications | Versioned tariff schedules and correspondence tables
edge: Vague descriptions (parts) | generic part descriptions fit many headings and the model picks a confident wrong one | Clarification requests and abstention
off: Top-1 accuracy at 6 and 8 digits ; Calibration for auto-accept
on: Auto-classification rate ; Duty adjustments from audits
gap: Training on past broker mistakes ; Ignoring tariff version differences

== trade-compliance-denied-party-screening | Trade Compliance: Denied-Party & Export Control Screening | nlp,graph | sub-100ms | production-grade | a=0.5 k=3
obj: Screen shipment parties, vessels and end users against restricted lists and ownership chains with high recall and manageable false hits.
loss: \mathcal{L}=\mathrm{Triplet}+\lambda\,\mathrm{BCE}
con: Near-100% recall on listed parties ; 50% ownership rule ; List updates within hours ; Evidence retention
sn: Ownership | Beneficial-ownership graph traversal | Name matching only | Restricted parties hide behind subsidiaries
sn: Matching | Transliteration-robust fuzzy matching | Exact match | Name variants slip through exact matching
sig: Fuzzy name similarity | learned embedding similarity | Candidate hits | Alias coverage
sig: Ownership share to restricted parties | aggregated percentage | 50% rule | Registry data
sig: Country and goods risk | destination and ECCN risk | Context | Version
noise: Document language | none
noise: Shipment weight | none
base: Exact and edit-distance matching against lists.
prod: Candidate generation by n-gram ANN, cross-encoder re-ranker, ownership graph engine and case management with decision audit.
pipe: Shipment party data @ TMS ; Name normaliser @ transliteration ; Candidate retrieval @ n-gram ANN ; Re-ranker @ cross-encoder ; Ownership graph check @ registry graph ; Compliance officer @ human ; Decision audit @ immutable log
edge: List update adds many entities | index lag causes missed hits | Streaming index update and re-screening of open shipments
edge: Registry data gaps for ownership | missing registry records break the ownership chain so a restricted parent is not found | Unknown ownership flagged as risk
off: Recall at fixed review volume ; Ownership chain accuracy
on: False-hit workload ; Violations avoided
gap: Test on easy names ; No evaluation on ownership-evasion cases

== freight-invoice-audit | Freight Invoice Audit & Overcharge Detection | tabular,nlp | batch | foundational | a=0.5 k=5
obj: Audit carrier invoices against contracts, shipment data and accessorial rules to recover overcharges before payment.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{amount})
con: Contract versions ; Accessorial dispute evidence ; Payment cycle deadlines ; Carrier relationships
sn: Contract | Rate computed from contract and shipment attributes | Comparing to historic average | History includes past errors
sn: Evidence | Shipment events (POD, scans) to validate accessorials | Invoice text alone | Detention charges need timestamps
sig: Expected-rate delta | invoice minus computed contract rate | Overcharge | Contract version
sig: Accessorial evidence match | event proof for each accessorial | Validity | Event completeness
sig: Duplicate invoice similarity | near-duplicate detection | Duplicates | Window
noise: Carrier name | encoded in contract
noise: Invoice page count | none
base: Tolerance-based comparison to quoted rate.
prod: Contract-rating engine plus anomaly model for unusual accessorials, dispute auto-drafting and recovery tracking.
pipe: Invoice ingestion @ EDI and OCR ; Contract rating @ rules engine ; Accessorial validator @ event match ; Anomaly model @ GBDT ; Dispute drafter @ LLM with evidence ; AP specialist @ human ; Recovery tracking @ finance
edge: Contract amendments mid-year | wrong rate computed | Effective-date contract store
edge: Missing shipment events | valid charges disputed | Evidence availability flag before dispute
off: Overcharge detection precision ; Recovered amount per audited invoice
on: Recovery rate ; Dispute cycle time
gap: Training on invoices already audited ; Ignoring carrier dispute outcomes

== reverse-logistics-returns-flow-optimization | Reverse Logistics Disposition Optimisation | tabular,reinforcement-learning | batch | production-grade | a=0.2 k=3
obj: Decide for each returned item whether to restock, refurbish, liquidate, donate or recycle, maximising recovered value.
loss: \max_{a}\;\mathbb{E}[\text{recovery}(a\mid x)]-\text{cost}(a)
con: Grading consistency ; Warehouse capacity ; Brand and safety policies ; Time-to-shelf
sn: Value | Expected recovery by disposition option | Default restock | Restocking damaged items harms customers
sn: Grading | Learned grade prediction from photos and returns reasons | Manual-only grading | Manual grading is slow and inconsistent
sig: Condition grade prediction | grade from images | Disposition | Labelled grades
sig: Resale price model | expected resale value by channel | Value | Market data
sig: Processing cost by route | labour and shipping cost | Cost | Rate card
noise: Return reason text length | none
noise: Customer name | none
base: Rule-based disposition by category.
prod: Vision-based grading plus a value model per channel and a disposition optimiser under capacity limits.
pipe: Return receipt @ WMS ; Grading photos @ station cameras ; Grade model @ CNN ; Value and cost models @ GBDT ; Disposition optimiser @ MILP ; Warehouse operator @ human ; Recovery outcomes @ sales
edge: Safety-recalled products | restocked by mistake | Recall list check as hard constraint
edge: Seasonal glut of returns | capacity overflow | Dynamic routing to third-party processors
off: Recovery value uplift vs rules ; Grade accuracy
on: Recovery rate ; Days to resale
gap: Resale prices assumed constant ; Ignoring grade disagreement

== delivery-time-slot-optimization | Delivery Time-Slot Pricing & Allocation | reinforcement-learning,tabular | sub-100ms | production-grade | a=1 k=2
obj: Offer and price delivery slots at checkout to steer demand toward cheaper-to-serve slots without hurting conversion.
loss: \max_{p}\;\mathbb{E}\!\left[\text{conv}(p)\cdot(\text{margin}-\text{cost}(\text{slot}))\right]
con: Capacity per slot ; Fairness in pricing ; 50 ms ; Customer experience
sn: Cost | Marginal route cost of adding a stop | Flat slot pricing | Cost depends on where the existing route is
sn: Choice | Customer slot-choice model | Assuming a single preferred slot | Customers trade price vs convenience
sig: Marginal insertion cost | extra route time of the new stop | Slot cost | Routes as-of
sig: Slot capacity remaining | slots left per window | Scarcity | Real-time
sig: Customer slot-choice propensity | choice model probability | Demand | History
noise: Customer name | none
noise: Basket ID | none
base: Fixed slot prices by time of day.
prod: Dynamic slot-pricing policy using a multinomial choice model and route-insertion cost estimator, with caps to keep prices predictable.
pipe: Checkout request @ API ; Insertion-cost estimator @ routing engine ; Choice model @ MNL ; Slot pricer @ optimiser ; Slot display @ UI ; Booking service @ capacity DB ; Outcome logs @ analytics
edge: Cost estimates stale as routes change | slots mispriced | Short cache TTL and cost refresh triggers
edge: Price perception complaints | fluctuating slot prices are perceived as unfair and damage trust in the brand | Price-change caps and clear UI
off: Simulated margin and utilisation ; Choice model log-loss
on: Route cost per delivery ; Conversion rate
gap: Simulation uses fixed demand regardless of price ; Ignoring cannibalisation across slots

== first-attempt-delivery-failure-prediction | First-Attempt Delivery Failure Prediction | tabular | sub-100ms | foundational | a=2 k=2
obj: Predict which deliveries will fail on the first attempt and intervene (confirm availability, safe-place, locker) to cut costly re-deliveries.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\cdot c_{\text{redelivery}}
con: Customer consent for messages ; Real-time before route lock ; Explainable ; Low false interventions
sn: Action | Choose an intervention by uplift | Prediction only | A prediction without a cheap fix creates no value
sn: Context | Address-level history (access, concierge) | Customer-level only | Access issues are tied to the address
sig: Address delivery history | past first-attempt success at the address | Access | Matured
sig: Time-window vs customer availability | predicted at-home probability | Failure | Preferences
sig: Delivery instructions quality | structured instruction present | Access info | Parsing
noise: Order number | none
noise: Courier name | personal
base: Send reminder to all customers.
prod: GBDT with address embeddings and uplift-based intervention selection, integrated with routing for safe-place or locker redirection.
pipe: Out-for-delivery list @ OMS ; Address features @ feature store ; Failure model @ GBDT ; Intervention selector @ uplift ; Messaging service @ SMS ; Route adjustment @ dispatcher ; Delivery outcome @ POD
edge: New housing development | no address history | Geospatial neighbours as prior
edge: Message fatigue | customers ignore | Contact caps and dynamic channel choice
off: AUC and calibration ; Uplift on failure rate
on: First-attempt success rate ; Cost per redelivery avoided
gap: Interventions not randomised ; Counting rescheduled deliveries as failures

== address-parsing-and-geocoding | Address Parsing & Geocoding | nlp | sub-100ms | production-grade | a=2 k=1
obj: Convert messy free-text addresses into structured, geocoded locations with confidence for routing and delivery.
loss: \mathcal{L}=\mathrm{CE}_{\text{BIO}}+\lambda\,\mathrm{Haversine}(\hat x,x)
con: Multi-script addresses ; 30 ms ; Landmark-based addressing ; Privacy
sn: Structure | Sequence tagging into components then gazetteer matching | Direct string to coordinates | Components allow validation and fallback
sn: Confidence | Geocode confidence and area uncertainty | Single coordinate | Wrong coordinates cause failed deliveries
sig: Component tags | locality, street, landmark | Structure | Tagging
sig: Gazetteer match score | fuzzy match to locality database | Disambiguation | Database version
sig: Delivery-trace correction | GPS where drivers actually stopped | Ground truth | Outlier filter
noise: Order time | none
noise: Customer name | none
base: Regex address parser and commercial geocoder.
prod: Transformer tagger with gazetteer retrieval, delivery-trace-informed geocoding corrections and uncertainty polygons.
pipe: Address input @ checkout ; Normaliser @ transliteration ; Tagger @ transformer ; Gazetteer matcher @ ANN ; Geocode refiner @ trace model ; Confidence policy @ rules ; Correction feedback @ driver stops
edge: New development absent from gazetteer | new housing areas are missing from the gazetteer so geocodes land on the wrong centroid | Trace learning and landmark text support
edge: Duplicate locality names | mismatched region | Region disambiguation using customer context
off: Component F1 ; Geocode error percentile distances
on: Failed delivery due to address ; Time spent searching for the address
gap: Test set with clean addresses ; Using geocoder output as labels

== proof-of-delivery-photo-verification | Proof-of-Delivery Photo Verification | computer-vision | seconds | production-grade | a=0.5 k=1500
obj: Verify delivery photos (parcel at door, correct location, no sensitive content) to prevent fraud and disputes.
loss: \mathcal{L}=\mathrm{BCE}+\lambda\,\mathrm{Contrastive}
con: Fast feedback to driver ; Privacy of homes and people ; Duplicate photo detection ; Offline capture
sn: Authenticity | Duplicate and reuse detection plus geotag consistency | Visual plausibility alone | Fraudulent drivers reuse photos
sn: Privacy | Blur faces and sensitive details at capture | Storing raw images | Privacy breaches create liability
sig: Parcel-in-scene detection | parcel detected near door | Delivery evidence | Detector
sig: Photo reuse similarity | perceptual hash vs recent photos | Fraud | Window
sig: Geotag distance to address | distance between photo location and address | Location proof | GPS accuracy
noise: Photo brightness | environment
noise: Phone model | device
base: Driver self-reported POD with signature.
prod: On-device quality and privacy filters with server-side authenticity checks (hash, geotag, parcel detection).
pipe: Driver app capture @ mobile ; On-device privacy blur @ edge model ; Quality gate @ blur check ; Authenticity checks @ hash and geotag ; Parcel detector @ small CNN ; Dispute handling @ human ; Outcome labels @ customer claims
edge: Poor lighting at night | rejected genuine photos | Low-light enhancement and relaxed thresholds
edge: Apartments with no clear door | parcel not visible | Alternative evidence types (concierge signature)
off: Fraud detection recall ; False rejection of genuine PODs
on: Not-received claims ; Driver rework rate
gap: Synthetic fraud unlike real ; Test photos from daytime only

== drone-and-av-delivery-path-planning | Drone & Autonomous Vehicle Delivery Planning | reinforcement-learning,computer-vision | sub-100ms | staff-principal | a=0.02 k=100
obj: Plan safe, energy-feasible paths for delivery drones and sidewalk robots in dynamic environments with regulatory constraints.
loss: \min_\pi\;\mathbb{E}\!\left[\sum_t c_{\text{energy}}+\lambda_1 c_{\text{risk}}+\lambda_2 c_{\text{time}}\right]
con: Airspace and no-fly rules ; Battery limits ; Real-time perception ; Safety certification
sn: Safety | Verified safety layer over learned planner | Pure learned navigation | Learned planners lack guarantees
sn: Energy | Wind-aware energy model | Distance-based range | Wind can halve range
sig: Wind and weather forecast | forecast along path | Energy and safety | Forecast
sig: Obstacle map confidence | perception uncertainty | Collision risk | Calibration
sig: Battery state and reserve | remaining energy vs plan | Feasibility | Battery model
noise: Package colour | none
noise: Customer ID | none
base: A* planning on static map with fixed reserves.
prod: Sampling-based planner with learned cost maps, energy model, and runtime assurance monitor that enforces safe fallback behaviours.
pipe: Mission request @ dispatch ; Airspace and weather check @ services ; Path planner @ MPC with learned costs ; Runtime assurance @ safety monitor ; Vehicle autopilot @ edge ; Remote operator @ human oversight ; Flight logs @ analytics
edge: GPS loss | drift and unsafe position | Visual-inertial fallback and return-to-home
edge: Sudden gusts | energy shortfall | Dynamic replan and landing zones
off: Collision and violation counts in simulation ; Energy prediction error
on: Mission success rate ; Incidents per 10k flights
gap: Simulation without realistic wind ; Training in static environments

== supply-chain-digital-twin-simulation | Supply-Chain Digital Twin & Scenario Simulation | reinforcement-learning,time-series | batch | staff-principal | a=0.01 k=20
obj: Maintain a calibrated simulation of the end-to-end network to test policies and disruption responses before applying them.
loss: \min_\theta\;\mathrm{Distance}\!\left(S_\theta,\ S_{\text{observed}}\right)
con: Calibration to observed KPIs ; Simulate months in minutes ; Scenario library ; Governance
sn: Calibration | Calibrate to distributions of lead times and demand | Use averages | Averages remove the variability that causes failures
sn: Validation | Back-test against known disruptions | Face-validity review | Plausible simulations can be wrong
sig: Calibrated lead-time distributions | fitted per lane | Realism | Data quality
sig: Policy parameters | order-up-to levels and rules | What-if | Config
sig: Disruption scenario library | catalogued events | Stress tests | Curated
noise: Single-day anomalies | outliers
noise: Planner opinion | subjective
base: Spreadsheet scenario models.
prod: Agent-based and discrete-event simulation calibrated with Bayesian inference, with surrogate models for fast policy search.
pipe: Network data @ lake ; Calibrator @ Bayesian inference ; Simulator @ discrete-event ; Surrogate model @ neural surrogate ; Policy search @ optimisation ; Executive review @ human ; Realised KPIs @ back-test
edge: Structural change in network (new DC) | calibration invalid | Structural-change flags and recalibration
edge: Optimistic assumptions in scenarios | policy fails in reality | Adversarial scenario generation and stress tests
off: KPI reproduction error ; Back-test of disruption responses
on: Policy decisions informed ; Realised vs simulated improvements
gap: Calibration and validation on same period ; Ignoring behavioural responses

== control-tower-anomaly-detection | Supply-Chain Control Tower Anomaly Detection | time-series,graph | sub-100ms | production-grade | a=0 k=2
obj: Detect abnormal events across orders, shipments and inventory in real time and prioritise by business impact.
loss: \mathcal{L}=\sum_t\left[\log\hat\sigma_t+\frac{(y_t-\hat\mu_t)^2}{2\hat\sigma_t^2}\right]
con: Millions of entities ; Alert dedup ; Impact ranking ; Self-serve rules for planners
sn: Impact | Rank anomalies by revenue at risk | Rank by statistical score | Statistical outliers may not matter
sn: Dedup | Group related alerts into incidents | One alert per entity | Alert floods hide root causes
sig: Residual to expected milestone time | actual minus predicted | Delay | Predictor
sig: Revenue-at-risk | value of downstream orders affected | Priority | Graph join
sig: Alert correlation cluster | shared cause across entities | Root cause | Clustering
noise: Entity ID | none
noise: Alert text | none
base: Static threshold alerts on late milestones.
prod: Streaming expected-state models per entity class, graph-based impact propagation and incident clustering.
pipe: Event stream @ Kafka ; Expected-state models @ per-entity ; Anomaly scorer @ residual statistics ; Impact propagator @ graph ; Incident clusterer @ similarity ; Control-tower analyst @ human ; Resolution outcomes @ labels
edge: Upstream outage causes thousands of simultaneous anomalies | one upstream outage triggers thousands of correlated alerts that bury the root cause | Correlation clustering and incident mode
edge: Milestone data missing from a partner | a partner stops sending milestones so shipments look late when they are simply unreported | Partner data-quality scoring
off: Precision at top alerts by impact ; Incident clustering purity
on: Time to detect disruptions ; Revenue protected
gap: Labels from alerts people acted upon ; No evaluation on correlated bursts

== order-promising-atp-optimization | Order Promising (ATP/CTP) Optimisation | tabular,reinforcement-learning | sub-100ms | production-grade | a=2 k=3
obj: Commit delivery dates and inventory to orders in real time, balancing profitability, priority customers and fulfilment feasibility.
loss: \max\;\sum_o v_o\,\mathbb{1}[\text{promise}_o]\ \text{s.t. inventory and capacity}
con: Decision in 100 ms ; Priority tiers ; Allocation rules ; Partial fulfilment policy
sn: Allocation | Reserve inventory for high-value demand | First-come-first-served | FCFS gives scarce stock to low-value orders
sn: Feasibility | Capable-to-promise includes production and transport capacity | Stock-only ATP | Capacity limits delivery dates
sig: Available-to-promise by node | stock net of reservations | Feasibility | Real-time
sig: Customer value tier | value and priority | Allocation | CRM
sig: Expected demand for scarce items | forecast demand | Reservation | Forecast
noise: Order ID | none
noise: Customer name | none
base: Rule-based ATP checks on available stock.
prod: Optimisation-based promising with demand-aware reservation levels and fast heuristic for real-time orders.
pipe: Order request @ OMS ; ATP service @ inventory view ; Reservation optimiser @ MIP ; Promise calculator @ lead-time model ; Allocation executor @ stock reservation ; Customer service @ human override ; Fulfilment outcomes @ tracking
edge: Inventory accuracy issues | promises broken | Inventory confidence buffers
edge: Concurrent orders for the last units | race conditions | Idempotent reservations with optimistic locking
off: Simulated revenue and service level ; Promise accuracy
on: On-time-in-full rate ; Revenue from priority orders
gap: Simulations without demand uncertainty ; Counting promises not fulfilled

== cross-dock-scheduling | Cross-Dock Door & Wave Scheduling | reinforcement-learning | batch | production-grade | a=0.05 k=3
obj: Assign inbound and outbound trucks to doors and sequence handling to minimise dwell and labour in cross-dock facilities.
loss: \min\;\sum_{t}\text{dwell}_t+\lambda\,\text{walking}+\mu\,\text{lateness}
con: Door capacity ; Truck arrival uncertainty ; Labour shifts ; Departure deadlines
sn: Uncertainty | Arrival-time prediction in schedule | Planned arrivals as truth | Trucks arrive early and late
sn: Flow | Minimise goods travel between doors | Minimise door count | Walking distance drives labour
sig: Truck arrival ETA distribution | predicted arrival with uncertainty | Planning | Telematics
sig: Inbound-outbound flow matrix | volume between lanes | Door assignment | Plan
sig: Labour availability | workers per shift | Capacity | Roster
noise: Truck plate | none
noise: Carrier logo | none
base: First-come-first-served door assignment.
prod: Stochastic door-assignment MIP with ETA model, rolling-horizon re-optimisation and dock-yard visibility.
pipe: Appointments and ETAs @ yard system ; ETA model @ GBDT ; Door assignment @ stochastic MIP ; Work scheduler @ labour planner ; Dock supervisor @ human ; Execution logs @ WMS ; Dwell metrics @ KPI
edge: Truck arrives hours late | schedule cascade | Rolling replan and buffer doors
edge: Load content differs from ASN | wrong lane assignment | ASN confidence and scanning verification
off: Simulated dwell time ; ETA error
on: Truck dwell hours ; Cross-dock labour hours per pallet
gap: Planning with perfect arrival knowledge ; Ignoring ASN errors

== warehouse-labour-forecasting | Warehouse Labour Demand Forecasting | time-series | batch | foundational | a=1 k=1
obj: Forecast labour hours needed by task and shift from order inflow and process mix to plan staffing and overtime.
loss: \mathcal{L}=\sum_t\rho_{0.7}(y_t-\hat y_t)
con: Shift notice rules ; Skill mix ; Peak season variability ; Weekly planning
sn: Drivers | Convert order forecast to task workload using engineered standards | Time series of hours alone | Hours depend on order mix
sn: Productivity | Learned productivity rates by task and experience | Static standards | Productivity shifts with new hires
sig: Forecast order lines by type | lines by category | Workload | Forecast
sig: Task standard times | engineered times | Conversion | Standards version
sig: Staffing experience mix | share of new workers | Productivity | Roster
noise: Day of month | none
noise: Employee ID | personal
base: Hours = orders x fixed standard.
prod: Order-driven workload model with learned productivity and quantile hours forecasts feeding the staffing optimiser.
pipe: Order forecast @ planning ; Workload converter @ standards ; Productivity model @ regression ; Hours forecaster @ quantile GBDT ; Staffing optimiser @ roster solver ; Manager approval @ human ; Actual hours @ WMS
edge: New automation reduces labour needs | model overestimates | Change-point detection and process-version flags
edge: Peak-season temporary workers | low productivity | Experience-aware productivity curves
off: Weighted pinball loss on hours ; Overtime hours in simulation
on: Overtime percentage ; Labour cost per unit
gap: Forecasting hours that were constrained by staffing ; Ignoring productivity ramp

== load-consolidation-and-bin-packing | Load Consolidation & 3D Bin Packing | reinforcement-learning | batch | production-grade | a=0.1 k=5
obj: Pack orders into containers and trailers to minimise empty space while respecting weight, stacking and delivery order.
loss: \min\;\#\text{containers}+\lambda\,\text{unload penalties}
con: Axle weight limits ; Fragile and stacking rules ; Delivery sequence ; Solve in seconds
sn: Constraints | Physical and sequence constraints as part of the solver | Volume-only packing | Volume-feasible plans can be unstable or undeliverable
sn: Heuristics | Learned packing heuristics with local search | Exact MIP at scale | Exact methods do not scale
sig: Item dimensions and fragility class | master data | Packing | Accuracy
sig: Delivery sequence rank | unload order | Accessibility | Route plan
sig: Axle load distribution | weight balance | Safety | Calc
noise: Item name | none
noise: Customer | none
base: First-fit decreasing by volume.
prod: Learned placement policy (attention) with beam search and local improvement, constraint checker for stability and legal axle loads.
pipe: Order and item data @ OMS ; Dimension validator @ master data ; Packing policy @ attention model ; Local search @ improvement heuristic ; Constraint verifier @ physics rules ; Loader instructions @ handheld ; Load outcomes @ feedback
edge: Wrong item dimensions | packing infeasible on dock | Dimension audits and scan-based verification
edge: Late additions to the load | last-minute additions invalidate the packing plan and force an unplanned full repack | Incremental repacking with minimal changes
off: Container count vs baseline ; Constraint violation rate
on: Trailer utilisation ; Loading time
gap: Benchmarks with random boxes ; Ignoring unloading sequence

== supplier-quality-defect-prediction | Supplier Quality & Defect Prediction | tabular | batch | production-grade | a=0.1 k=5
obj: Predict incoming lot defect risk to focus inspections and supplier development on the lots and suppliers that matter.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{impact})
con: Inspection capacity ; Regulatory traceability ; Supplier confidentiality ; Lot-level decisions
sn: Sampling | Risk-based inspection selection | Uniform sampling | Uniform sampling wastes effort on reliable suppliers
sn: Leading | Process indicators from supplier (SPC, audits) | Final defect counts only | Counts arrive after the damage
sig: Supplier historical defect rate | PPM trend | Reliability | Matured
sig: Process-capability indicators | Cpk from supplier data | Process stability | Data sharing
sig: Material or tooling change flags | change notices | Risk | Notice timing
noise: Supplier name | encoded
noise: Order number | none
base: Fixed AQL inspection plans.
prod: Lot-level defect model with Bayesian supplier priors driving dynamic inspection levels and corrective action prioritisation.
pipe: Receipts and inspection data @ QMS ; Supplier features @ Spark ; Defect model @ GBDT ; Inspection planner @ risk-based rules ; Quality engineer @ human ; Supplier scorecards @ portal ; Defect outcomes @ labels
edge: Supplier changes process without notice | an unannounced process change shifts defect rates and the model stays blind until escapes occur | Change-detection on process signals and audits
edge: Inspection reduces defects through deterrence | inspection itself reduces defects, so labels shift and the model underestimates risk | Hold-out inspection fraction
off: Defect capture rate at fixed inspection effort ; Calibration
on: Escaped defects ; Inspection cost
gap: Defects only observed for inspected lots ; Using post-inspection information

== visual-quality-inspection-line | Visual Quality Inspection on the Production Line | computer-vision | sub-100ms | production-grade | a=1 k=2000
obj: Detect surface defects and assembly errors on products at line speed with minimal false rejects.
loss: \mathcal{L}=\mathcal{L}_{\text{recon}}+\lambda\,\mathcal{L}_{\text{feature-distance}}
con: Line speed of 10 parts/s ; Few defect examples ; Stable lighting ; Explainable reject decisions
sn: Data | Anomaly detection trained on good samples | Supervised defect classifier | Defect examples are rare and diverse
sn: Optics | Lighting and camera design first | Algorithm fixes for bad imaging | Garbage imaging limits any model
sig: Anomaly score map | patch-feature distance to normal | Localises defects | Normal set coverage
sig: Part pose and alignment | registration residual | Reduces false alarms | Fixtures
sig: Defect-class classifier | few-shot classes | Root cause | Labels
noise: Conveyor vibration noise | environment
noise: Background texture | fixture
base: Rule-based machine vision with templates.
prod: PatchCore-style anomaly detector with few-shot defect classifier on edge GPUs, with active learning from operator decisions.
pipe: Camera and lighting @ station ; Registration @ alignment ; Anomaly model @ PatchCore on edge GPU ; Defect classifier @ few-shot ; Reject actuator @ PLC ; Quality engineer @ human ; Defect library @ labels
edge: Product variant change | false rejects on new design | Variant-aware models and quick enrolment of golden samples
edge: Lighting degrades over weeks | gradual false alarms | Light monitor with auto-calibration
off: Defect recall at 0.5% false reject ; Localisation accuracy
on: Escape rate ; Scrap and rework cost
gap: Test defects staged not natural ; Normal samples from one lighting setup

== bom-and-part-matching-llm | BOM Parsing & Part Matching with LLMs | nlp,llm-agents | batch | production-grade | a=0.02 k=25
obj: Normalise bills of materials and match parts to approved suppliers and alternatives to speed sourcing and cut errors.
loss: \mathcal{L}=\mathrm{InfoNCE}(\text{part},\text{catalogue part})+\lambda\,\mathrm{SchemaViolation}
con: Parametric correctness (a 10k resistor is not 1k) ; Traceability ; Millions of parts ; Engineer sign-off
sn: Parametrics | Parse parameters and units, validate against specs | Semantic similarity only | Embedding similarity confuses near values
sn: Verification | Deterministic checks of electrical or mechanical parameters | Trusting LLM matches | A plausible wrong match ships defective product
sig: Parameter equality checks | numeric tolerance comparisons | Correctness | Unit normalisation
sig: Manufacturer part number match | exact MPN with cross-reference | Identity | Catalogue
sig: Embedding similarity of descriptions | text embedding score | Candidates | Domain tuning
noise: Line item position | none
noise: Engineer initials | none
base: Exact MPN matching and manual lookup.
prod: Retrieval with domain-tuned embeddings, LLM parameter extraction into schema, deterministic parametric validators and engineer approval.
pipe: BOM upload @ PLM ; Parser and normaliser @ schema extraction ; Candidate retrieval @ vector plus keyword ; Matching LLM @ structured output ; Parametric validator @ rules ; Engineer approval @ human ; Sourcing feedback @ outcomes
edge: Unit ambiguity (mm vs inch) | wrong dimension accepted | Unit normalisation and unit-conflict blocks
edge: Obsolete part numbers | matches to discontinued parts | Lifecycle status check in candidate filter
off: Match precision at 99% ; Parameter extraction accuracy
on: BOM processing time ; Mismatch incidents
gap: Test BOMs cleaner than production ; Exact-match labels only

== procurement-price-forecasting | Procurement Price & Commodity Cost Forecasting | time-series | batch | production-grade | a=1 k=1
obj: Forecast input costs (commodities, freight, components) to time purchases, hedges and contract negotiations.
loss: \mathcal{L}=\sum_{h}\sum_q\rho_q\!\left(p_{t+h}-\hat p_{t+h}^{(q)}\right)
con: Regime changes ; Few observations for custom parts ; Scenario support ; Audit trail
sn: Drivers | Link to index prices, FX and energy | Univariate extrapolation | Component prices follow input costs
sn: Uncertainty | Quantile forecasts and scenarios | Point forecasts | Buying decisions depend on tail risk
sig: Index price lag features | commodity index lags | Cost pass-through | Publication timing
sig: FX rate forecast | currency scenarios | Import cost | Forecast
sig: Contract price formula | indexation clauses | Mechanical link | Contract data
noise: Supplier name | none
noise: Quote reference | none
base: Last price plus inflation assumption.
prod: Pass-through models per component family with quantile forecasting, scenario generator and contract-formula engine.
pipe: Prices and indices @ lake ; Contract formulas @ contract store ; Pass-through model @ regression with lags ; Quantile forecaster @ GBDT ; Scenario engine @ simulation ; Buyer dashboard @ human ; Realised prices @ tracking
edge: Supply shock (war, embargo) | historical relationships break | Regime detection and scenario overlays
edge: Index definition changes | lag features invalid | Index versioning and mapping tables
off: Weighted quantile loss ; Directional accuracy
on: Savings vs budget ; Hedge effectiveness
gap: Using revised index values in training ; Evaluating on stable periods only

== spend-classification-taxonomy | Spend Classification & Taxonomy Mapping | nlp | batch | foundational | a=0.1 k=3
obj: Classify invoice and PO lines into a unified category taxonomy to unlock spend visibility and savings analysis.
loss: \mathcal{L}=\mathrm{CE}_{\text{L1}}+\mathrm{CE}_{\text{L2}}+\mathrm{CE}_{\text{L3}}
con: 5-level taxonomy (UNSPSC) ; Multiple languages ; Millions of lines ; Active learning from analysts
sn: Hierarchy | Hierarchical classification with abstention | Flat classifier | Hierarchy gives partial credit and safe fallbacks
sn: Feedback | Analyst corrections as labels | Static training set | Taxonomy needs continuous learning
sig: Line description embedding | text embedding | Category | Language handling
sig: Supplier primary category | supplier industry | Prior | Supplier master
sig: Unit price and UoM | price per unit | Disambiguation | Currency conversion
noise: Invoice number | none
noise: Cost centre code | org structure
base: Keyword rules and supplier-to-category lookup.
prod: Hierarchical transformer with supplier priors, confidence-based review queue and continual learning from corrections.
pipe: Spend data ingestion @ ERP ; Cleaner @ normalisation ; Hierarchical classifier @ transformer ; Supplier prior merge @ Bayesian ; Analyst review @ human ; Taxonomy store @ MDM ; Savings analytics @ BI
edge: New category emerges | forced into wrong class | Open-set detection and taxonomy proposals
edge: Generic descriptions ("services") | unpredictable class | Supplier and amount context with abstention
off: Level-3 accuracy and macro-F1 ; Coverage at 95% precision
on: Spend classified automatically ; Analyst hours saved
gap: Training labels from earlier rule-based mappings ; Ignoring class imbalance

== contract-intelligence-llm | Contract Intelligence & Obligation Extraction | llm-agents,nlp | seconds | production-grade | a=0.02 k=100 s=3 t=400
obj: Extract clauses, obligations, prices and renewal dates from supplier and logistics contracts and answer questions with citations.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{clauses})+\lambda\,\mathrm{ClauseMiss}
con: Citations to page and clause ; Confidential data stays private ; Version history ; Lawyer review for high-risk clauses
sn: Structure | Clause segmentation and hierarchy-aware retrieval | Page-level chunking | Obligations span cross-references
sn: Review | High-risk clause flags go to counsel | Auto-approval | Legal risk needs human judgement
sig: Clause recall | share of ground-truth clauses retrieved | Completeness | Annotated set
sig: Cross-reference resolution | linked defined terms | Correctness | Parser
sig: Renewal and notice date extraction | normalised dates | Operational value | Date format handling
noise: Contract title | uninformative
noise: Law firm footer | none
base: Keyword search over PDFs.
prod: Layout-aware parsing, clause-level index, LLM extraction into a schema with citations, and a lawyer-in-the-loop for risk clauses.
pipe: Contract repository @ CLM ; Layout parser @ document AI ; Clause indexer @ hybrid search ; Extraction LLM @ schema output ; Citation verifier @ span check ; Counsel review @ human ; Obligation tracker @ calendar
edge: Amendments override base terms | outdated clause cited | Document-family versioning and precedence rules
edge: Scanned contracts with poor OCR | missed obligations | OCR quality scores and manual verification path
off: Clause-level F1 ; Citation accuracy
on: Time to answer contract questions ; Missed renewal incidents
gap: Test contracts of a single template ; Counting extraction without verifying citations

== demand-shaping-supply-aligned | Supply-Aligned Demand Shaping | reinforcement-learning,tabular | batch | staff-principal | a=0.05 k=3
obj: Shape promotions and pricing to steer demand toward items and weeks where supply is plentiful, reducing stock-outs and waste.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t \text{margin}_t-\lambda\,\text{unmet}_t-\mu\,\text{excess}_t\right]
con: Brand price rules ; Promotion calendars locked weeks ahead ; Supply plan visibility ; Fairness
sn: Coupling | Joint demand and supply decisions | Independent promo and supply planning | Promotions that ignore supply cause stock-outs
sn: Causality | Causal promo uplift per item | Correlation of promo and sales | Promotions target already-popular items
sig: Supply availability forecast | projected availability by week | Constraint | Supplier commitments
sig: Promo uplift estimate | causal effect | Lever | Randomised tests
sig: Cross-item substitution | demand transfer matrix | Side effects | Estimated
noise: Promo ID | none
noise: Store manager | none
base: Promotion calendar set by category managers.
prod: Causal uplift and substitution models feeding a joint promotion–supply optimiser with scenario robustness.
pipe: Supply plan and forecasts @ planning ; Uplift and substitution models @ causal ML ; Joint optimiser @ MILP ; Scenario robustness check @ simulation ; Category manager review @ human ; Promotion execution @ POS ; Outcome tracking @ KPI
edge: Supply plan slips after promotion is locked | promo drives stock-outs | Contingency promo levers and early-warning triggers
edge: Competitor reacts with price cuts | uplift collapses | Competitive monitoring and adaptive replanning
off: Simulated margin and service level ; Uplift calibration
on: Stock-outs during promotions ; Waste on promoted items
gap: Promo uplift from non-randomised data ; Static supply assumptions

== carbon-footprint-estimation-logistics | Logistics Carbon Footprint Estimation | tabular | batch | foundational | a=1 k=2
obj: Estimate emissions per shipment, lane and product to report accurately and steer decisions toward lower-carbon options.
loss: \mathcal{L}=\mathrm{Huber}(E,\hat E)
con: GLEC / ISO 14083 compliance ; Primary vs modelled data transparency ; Audit trail ; Scope 3 reporting
sn: Data | Prefer primary telematics fuel data over default factors | Default emission factors everywhere | Defaults miss load factor and route effects
sn: Allocation | Allocate by weight-distance with load factor | Equal per shipment | Allocation affects incentives
sig: Load factor | utilisation of vehicle capacity | Efficiency | Weight data
sig: Mode and vehicle class | mode, fuel type, Euro class | Factor | Fleet data
sig: Actual vs planned distance | distance driven | Accuracy | Telematics
noise: Shipment ID | none
noise: Customer name | none
base: Default emission factors by mode times distance.
prod: Hybrid estimator using primary fuel data when available and ML-calibrated factors otherwise, with uncertainty and audit lineage.
pipe: Shipment and telematics data @ lake ; Distance and load calculator @ geospatial ; Emission factor service @ versioned factors ; ML calibrator @ GBDT ; Allocation engine @ rules ; Sustainability reviewer @ human ; Report generator @ BI
edge: Missing primary data for subcontracted legs | defaults used silently | Data-quality tiers displayed with estimates
edge: Emission factor update | restated history | Factor versioning and restatement policy
off: Error vs metered fuel data ; Coverage of primary data
on: Verified emissions coverage ; Reduction from lane decisions
gap: Validated only on own fleet ; Ignoring empty running

== railway-network-train-delay-prediction | Railway Network Train Delay Prediction | time-series,graph | sub-100ms | staff-principal | a=0.5 k=3
obj: Predict train delays and propagation across the network to support dispatchers and passenger information.
loss: \mathcal{L}=\sum_i\rho_{0.5}(y_i-\hat q^{50}_i)+\rho_{0.9}(y_i-\hat q^{90}_i)
con: Real-time updates every 30 s ; Safety-critical separation ; Delay propagation through shared infrastructure ; Explainable to dispatchers
sn: Propagation | Graph-based delay propagation along track and rolling stock links | Per-train independent models | Delays cascade through shared resources
sn: Timetable | Timetable buffers and dwell supplements | Planned time only | Buffers absorb a lot of delay
sig: Current delay and buffer ahead | delay minus remaining buffer | Propagation | Timetable data
sig: Conflicting train graph | trains sharing blocks soon | Cascade | Block occupancy
sig: Weather and works | speed restrictions | Exogenous | Notices
noise: Train ID digits | none
noise: Driver | personal
base: Delay persistence (current delay carried forward).
prod: Spatio-temporal GNN with timetable features and quantile outputs, feeding a dispatcher decision view and passenger information.
pipe: Train position feed @ signalling ; Timetable and graph builder @ network model ; Delay propagation model @ ST-GNN ; Quantile calibrator @ conformal ; Dispatcher view @ control centre ; Passenger info @ apps ; Actual times @ labels
edge: Signalling failure | positions stale | Staleness handling and fallback to timetable
edge: Major disruption | learned patterns invalid | Disruption mode and simulation-based predictions
off: MAE and quantile coverage at 10-60 minutes ; Cascade detection recall
on: Dispatcher intervention success ; Passenger information accuracy
gap: Training on normal days only ; Using actual times that were revised after the fact
