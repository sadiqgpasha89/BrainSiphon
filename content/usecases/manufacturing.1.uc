# Manufacturing & Industrial, part 1 (use cases 1-21): quality and inspection, predictive maintenance and reliability, process and yield optimisation
# Vendor-neutral. Models advise above the machine safety layer, no model output bypasses an interlock, workers are not identified in vision data and a named engineer approves any recipe or setpoint change.
== visual-defect-inspection | Visual Defect Inspection | computer-vision | sub-100ms | advanced | a=20 k=300
obj: Detect surface and assembly defects on parts moving on a line from camera images, classify the defect type and reject or flag the part before it ships.
con: Decision within 80 ms at line speed ; Escape rate below 0.5% at a false reject rate under 2% ; Every reject keeps its image and model version for traceability ; Operators can override and relabel ; 600 parts per minute per line
sn: Label | Defects confirmed by quality engineers with type and location | Operator rejects at the line | Operators reject for many reasons including doubt
sn: Data | Images from every shift, lot and lighting condition | One clean batch | Models trained on a good week fail on a bad lens
sn: Threshold | Set from the cost of an escape against a false reject | Accuracy | Accuracy hides the rare defects that matter
sig: Defect probability map | model score per image region | Locates and sizes the defect | Calibrate per defect class
sig: Part pose and fixture state | position and orientation of the part in frame | Reduces false alarms | From the fixture sensors
sig: Lighting and lens drift indicators | image brightness and focus statistics | Warns of camera drift | Track per camera
sig: Upstream process context | tool, material lot and recent process alarms | Explains the defect | Join from MES by part id
noise: Operator name | not a defect cause
noise: Image file timestamp alone | no link to the defect
noise: Background clutter | an acquisition artefact
base: A rule-based vision check with fixed thresholds on edges and area, because it is stable and shows what a learned model must beat.
prod: A detection and segmentation model on an edge GPU per line with calibrated per-class thresholds, an active-learning loop from operator corrections and a drift monitor on image statistics.
pipe: Image capture and trigger @ line camera ; Quality gate on image @ blur and lighting check ; Defect detection @ vision model on edge GPU ; Calibrated thresholds @ per class cut-offs ; Reject or flag @ PLC interface ; Operator review and relabel @ HMI ; Retrain queue @ active learning
edge: Lighting change | brightness shifts and false rejects rise | Lighting statistics monitored and automatic recalibration alerts
edge: New product variant | the model has never seen the part | Variant detection and a fallback to a human check
edge: Rare defect | too few examples to learn | Synthetic augmentation plus an anomaly score for unseen patterns
off: Recall at fixed false reject rate per defect class ; Escape rate on held-out lots ; Calibration by class
on: Customer escapes per million ; False reject cost ; Inspection labour hours
gap: Training on operator rejects as truth ; One lot for all training ; Evaluating on random frames from the same lot

== weld-seam-inspection | Weld Seam Inspection | computer-vision,time-series | seconds | advanced | a=2 k=500
obj: Assess weld quality from seam images and process signals such as current and voltage, so weak welds are caught in line and rework is targeted.
con: Weld judged within 5 s of completion ; Escape rate under 0.2% for structural welds ; Process signals stored with each weld ; Destructive test results used to recalibrate monthly ; 40K welds per day
sn: Label | Destructive and X-ray test results linked to the weld | Visual operator judgement | Appearance does not always match strength
sn: Signals | Image features together with current and voltage curves | Images alone | Many weak welds look fine on the surface
sn: Sampling | Test samples across tools and shifts | Samples from convenient parts | Convenience hides drift
sig: Bead geometry score | width, height and continuity from the image | Visible defects | Camera calibration needed
sig: Current and voltage curve shape | distance of the curve from a golden curve | Process deviation | Align by weld phase
sig: Electrode wear count | welds since last tip dress | Quality decay | From the controller
sig: Material stack and coating | sheet thickness and coating class | Changes the right parameters | From the order
noise: Welder name | not a quality driver
noise: Image resolution tweaks | an acquisition choice
noise: Time of day alone | confounded with shift
base: Tolerance bands on current and voltage per weld programme, because they are the standard controls and the benchmark.
prod: A multimodal model combining bead image features and process curves with a calibrated pass, rework or test-sample decision, plus a link to electrode wear counters.
pipe: Weld image and curve capture @ weld controller ; Curve alignment @ signal processing ; Bead feature model @ vision model ; Combined quality model @ gradient boosting ; Decision and routing @ MES rules ; Test sample feedback @ lab results ; Model update @ monthly retrain
edge: Electrode wear | quality drifts slowly | Wear count features and a tip dress trigger
edge: Unusual coating | new material changes the signal | Material features and a guard band for new stacks
edge: Missing curve data | the controller drops samples | Fall back to image-only with a lower confidence rating
off: Recall on destructive-test failures ; Escape rate by weld class ; Calibration of the pass decision
on: Rework per thousand welds ; Destructive tests needed ; Weld-related warranty claims
gap: Using visual judgement as strength labels ; Ignoring wear ; Sampling only easy parts

== pcb-solder-joint-inspection | PCB Solder Joint Inspection | computer-vision | sub-100ms | foundational | a=5 k=200
obj: Classify solder joints and component placement on circuit boards from 2D and 3D images so shorts, opens and tombstones are caught before test.
con: Decision within 80 ms per board panel region ; Escape rate under 0.1% ; Defect class reported with the reference designator ; Programme change for a new board in under 4 hours ; 900 boards per hour
sn: Label | Test results and repair data linked to joint position | Machine reject flags | Machines over-reject for marginal joints
sn: Variation | Components from many suppliers and reels | A single golden board | Real boards differ by reel and lot
sn: Action | Repair guidance with location | A reject flag | Repair stations need to know which joint
sig: Joint shape and volume | 3D height map statistics per joint | Core quality signal | Needs calibrated height
sig: Component offset and rotation | placement offsets against the pad | Placement errors | From the placement file
sig: Stencil and paste measurement | paste volume from the printer inspection | Upstream cause | Join by board id
sig: Reflow profile summary | peak temperature and time above liquidus | Process cause | From the oven log
noise: Board serial number | an identifier
noise: Operator on shift | not a defect driver
noise: Silkscreen colour | no link to quality
base: Golden-board comparison with fixed tolerances per joint, because it is the incumbent in many lines.
prod: A joint-level classifier on 2D and 3D features with per-package thresholds, linked paste and reflow signals for root cause, and a programme generator from the placement file.
pipe: Board image and height capture @ inspection machine ; Joint extraction @ geometry mapping ; Joint classifier @ vision model ; Package thresholds @ calibration table ; Repair guidance @ repair station display ; Process cause link @ paste and oven data ; Feedback from test @ nightly join
edge: New package type | no training examples | Geometry-based rules with human review until enough examples exist
edge: Warped board | height maps are distorted | Warp compensation and a quality flag
edge: Reel change | joint appearance shifts | Reel-aware features and monitoring by supplier lot
off: Recall and precision per defect class ; Escape rate against in-circuit test ; Programme setup time
on: Boards failing at test ; Repair time ; False call rate at inspection
gap: Trusting machine rejects as labels ; One golden board ; Ignoring upstream paste data

== inline-quality-prediction-from-process-data | Inline Quality Prediction from Process Data | tabular,time-series | seconds | advanced | a=6 k=20
obj: Predict a lot or part's final quality result from process parameters while it is still being made so engineers can adjust or divert before value is added.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Prediction available before the next process step ; Explanation of the top drivers shown to the operator ; Model retrained on each new product family ; No automatic parameter changes ; 100K lots per day
sn: Label | Final test or inspection results aligned to the lot | Interim readings | Interim values are not the customer's requirement
sn: Alignment | Process data aligned to the part by time and position | Averages over the shift | Averages hide the excursion that caused the defect
sn: Use | Advice to engineers with reasons | A black-box reject | Plants will not trust a reject without a cause
sig: Parameter deviation from the recipe | difference between actual and recipe values per step | Excursion detector | Align by step
sig: Dwell and cycle time | time in each step against the standard | Process stress | From MES timestamps
sig: Material lot properties | supplier test values for the input lot | Input variation | Join by lot
sig: Equipment state indicators | wear, calibration age and last maintenance | Drift driver | From CMMS
noise: Operator name | not a process driver
noise: Lot number | an identifier
noise: Day of week alone | confounded
base: Control charts on the key parameters with fixed limits, because engineers use them and the model should add value beyond them.
prod: Gradient boosting on aligned process features with monotonic constraints where physics is known, calibrated probabilities, and SHAP-style reasons shown beside the lot in the MES screen.
pipe: Process data capture @ historian ; Alignment to part or lot @ batch joins ; Feature build @ per-step aggregates ; Quality model @ gradient boosting ; Reason display @ MES screen ; Engineer action log @ MES ; Outcome labels @ test results join
edge: New recipe | no examples for the new settings | Use physics-based priors and a conservative threshold
edge: Sensor drift | a calibrated sensor slowly shifts | Drift detection and calibration events as features
edge: Late test results | labels arrive weeks later | Provisional labels and a long-window retrain
off: AUC and calibration by product family ; Recall at fixed intervention capacity ; Lead time before the next step
on: Scrap and rework rate ; Lots diverted early ; Engineer response time
gap: Averaging process data over the shift ; Using interim readings as labels ; Random splits across lots

== spc-drift-detection | Statistical Process Control Drift Detection | time-series | seconds | foundational | a=60 k=1
obj: Detect slow drifts and shifts in process measurements earlier than classic control charts while keeping the false alarm rate low enough for operators to act.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Alert false alarm rate under one per line per week ; Interpretable charts operators know ; Limits per product and tool ; 50K measurement streams
sn: Method | Charts that detect small shifts such as CUSUM and EWMA | Shewhart limits only | Slow drifts stay within the limits for days
sn: Context | Limits set per product, tool and material | One limit for all | Mixed populations give wide limits and missed shifts
sn: Action | A reason code tied to a response plan | An alarm | Alarms without a plan are ignored
sig: CUSUM statistic | cumulative sum of deviations from the target | Detects small shifts | Reset after corrective action
sig: EWMA residual | exponentially weighted moving residual | Smooth drift signal | Tune the weight per process
sig: Run-rule violations | counts of Western Electric rule hits | Familiar to operators | Combine with the model score
sig: Tool and chamber identifier | measurements split by tool | Finds the bad tool | Segment before charting
noise: Operator name | not a cause
noise: Measurement timestamp precision | an artefact
noise: Product colour | no link
base: Shewhart X-bar and R charts with standard run rules, because they are the quality standard.
prod: Per-stream EWMA and CUSUM detectors with change-point detection on tool-segmented data, a response-plan link for each alarm type and a dashboard for engineers.
pipe: Measurement ingestion @ historian ; Stream segmentation by tool and product @ stream processor ; Drift detectors @ CUSUM EWMA change-point ; Alarm scoring @ gradient boosting ; Response plan lookup @ quality system ; Operator acknowledgement @ HMI ; Limit review @ quarterly
edge: Planned recipe change | the process shifts on purpose | Recipe change events reset the baseline
edge: Gauge error | measurement system drifts | Gauge repeatability checks and a measurement-system alert
edge: Seasonal effect | ambient changes move the process | Add ambient features and wider limits for that season
off: Average run length to detect a seeded shift ; False alarms per stream per month ; Alarm precision
on: Time from drift onset to action ; Out-of-spec output ; Operator alarm acknowledgement rate
gap: One limit for mixed populations ; Alarms with no response plan ; Ignoring gauge error

== quality-escape-root-cause-agent | Quality Escape Root-Cause Agent | llm-agents,tabular | seconds | staff-principal | a=0.05 k=60
obj: When a defect reaches a customer or a late test, trace the affected lots through genealogy, line data and supplier records, rank likely causes and draft the containment and corrective action plan for the quality engineer.
con: Containment lists generated from genealogy data and verified by an engineer ; The agent has read-only access to plant systems ; Hold actions require quality approval ; Every cause is linked to its evidence ; First report within 30 minutes of a complaint
sn: Scope | Genealogy-defined affected lots | A guessed date range | A wide guess ships good parts to scrap and a narrow one ships bad parts to customers
sn: Cause | Evidence from process, material and tool data | A plausible story from the complaint text | Plausible causes waste investigation days
sn: Action | A containment recommendation with quantities and locations | A summary | Quality teams need lists to act
sig: Genealogy coverage | lots linked to the suspect part, material or tool | Defines containment | Needs complete traceability
sig: Process excursion overlap | alarms and excursions on the affected lots | Cause evidence | Align by lot and station
sig: Supplier lot association | incoming material lots shared by affected parts | Material cause | Join by lot
sig: Past similar escapes | earlier cases with confirmed causes | Hypothesis source | Only confirmed causes
noise: Complaint wording | emotional language is not evidence
noise: Customer size | not a cause
noise: Complaint channel | an artefact
base: A manual eight-discipline report built by quality engineers from MES queries, because it is the current practice and the time benchmark.
prod: An agent with read-only tools for genealogy, process data and supplier records that builds the affected-lot set, ranks cause hypotheses with citations and drafts the containment and corrective-action plan for approval.
pipe: Complaint intake @ quality system ; Genealogy trace @ MES read tool ; Process and supplier evidence @ read-only tools ; Hypothesis ranking @ agent with evidence citations ; Containment draft @ LLM with templates ; Engineer approval @ quality console ; Action tracking @ corrective action system
edge: Incomplete genealogy | some lots cannot be linked | State the gap and propose a wider containment option
edge: Multiple causes | two independent excursions overlap | Show all hypotheses with evidence strength
edge: Contradicting data | process and test data disagree | Flag the conflict and request a sample check
off: Containment recall on audited escapes ; Cause ranking accuracy against confirmed root causes ; Citation faithfulness
on: Time to containment ; Parts shipped after a known issue ; Escape recurrence
gap: Guessing the affected lots ; Giving the agent hold authority ; Trusting a plausible story without evidence

== supplier-quality-risk-scoring | Supplier Quality Risk Scoring | tabular | batch | foundational | a=0.5 k=8
obj: Score incoming supplier lots and suppliers for quality risk so inspection effort goes to the risky ones and good suppliers flow through faster.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Skip-lot rules must satisfy the quality agreement ; Scores explained to supplier quality engineers ; Critical parts are never fully skipped ; Daily scoring for 500K inbound lots
sn: Label | Incoming inspection failures and line-side defects traced to the lot | Late deliveries | Delivery issues are a separate problem
sn: History | Supplier and part-level history with recent weighting | Supplier averages | Averages hide a recent decline
sn: Action | Inspection level set by risk and criticality | A blacklist | Blunt lists create supply risk
sig: Recent failure rate | failures in the last 10 lots for the part and supplier | Strong predictor | Exclude the lot being scored
sig: Supplier change events | tooling, site or process changes at the supplier | Risk driver | From supplier notices
sig: Certificate and audit status | audit score and age of certificates | Compliance signal | From the supplier system
sig: Transit and storage conditions | temperature or shock records for sensitive parts | Damage risk | From logistics data
noise: Supplier name | an identifier
noise: Purchase order number | an identifier
noise: Buyer name | irrelevant
base: Fixed inspection levels by part criticality and supplier rating, because it follows the quality plan.
prod: Gradient boosting on part, supplier and lot features with calibrated risk, mapped to inspection levels with guard rules, plus a supplier scorecard view.
pipe: Receipt and inspection data @ ERP and QMS ; Supplier feature build @ lakehouse ; Risk model @ gradient boosting ; Inspection level mapping @ rules with guard bands ; Receiving instruction @ warehouse system ; Result capture @ QMS ; Retrain @ monthly
edge: New supplier | the supplier has no history | Start at full inspection and relax with evidence
edge: Single-source part | the supplier cannot be switched | Use the score for support and audit rather than exclusion
edge: Change not notified | the supplier changes the process silently | Look for sudden shifts in measurement distributions
off: Recall of failing lots at the inspection budget ; Calibration ; Escapes missed in skipped lots
on: Inspection hours ; Line stops from incoming defects ; Skip-lot share
gap: Using supplier averages only ; Skipping critical parts ; Treating late delivery as quality

== remaining-useful-life-rotating-equipment | Remaining Useful Life Prediction for Rotating Equipment | time-series | batch | advanced | a=24 k=4
obj: Estimate the remaining useful life of pumps, motors, gearboxes and fans from vibration, temperature and operating history so replacements are planned before failure.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Lead time of at least 14 days for planned work ; Predictions with intervals ; Failure modes labelled in the CMMS ; Retrain per asset class ; Scoring of 100K assets daily
sn: Label | Confirmed failure times with failure mode from work orders | Replacement dates | Parts are often replaced early
sn: Censoring | Assets still running are censored observations | Dropping unfailed assets | That biases life toward short values
sn: Operating context | Load and speed history with the life model | Calendar age | Duty cycle drives wear
sig: Vibration band energy trend | trend in bearing and gear frequency band energy | Degradation sign | Per asset class and speed
sig: Temperature rise over load | temperature minus the load-expected value | Friction and lubrication | Condition on load
sig: Operating hours at high load | hours above the rated load fraction | Wear accumulation | From the historian
sig: Maintenance history | lubrication, alignment and rebuilds | Resets the clock | From the CMMS
noise: Asset tag | an identifier
noise: Vendor name alone | confounded with age
noise: Technician name | not a failure cause
base: A time-based replacement schedule from manufacturer guidance, because it is the policy the model must improve.
prod: A survival or degradation model per asset class using condition indicators and load history, with prediction intervals, calibrated risk by horizon and a planner view ranking work by risk and criticality.
pipe: Condition data capture @ historian ; Indicator extraction @ signal processing ; Life model @ survival and degradation model ; Interval and calibration @ conformal calibration ; Risk ranking @ criticality join ; Work order proposal @ CMMS ; Failure feedback @ labels
edge: Few failures | little data for rare assets | Pool by asset class and use physics priors
edge: Sensor fault | indicators jump | Sensor health checks before scoring
edge: Repair resets the asset | life restarts after a rebuild | Maintenance events reset state features
off: Error in remaining life at 14 and 30 days ; Calibration of intervals ; Early warning rate on held-out failures
on: Unplanned downtime hours ; Planned versus emergency repairs ; Spare parts held
gap: Dropping censored assets ; Using replacement date as failure ; Random splits across assets over time

== vibration-anomaly-detection | Vibration Anomaly Detection | time-series | seconds | foundational | a=48 k=5
obj: Detect unusual vibration patterns on machines against their own healthy baseline so engineers investigate before a fault becomes a failure.
loss: \mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2
con: Per-asset baselines by operating state ; Alarm false rate under 1 per asset per month ; Explanation by frequency band ; Edge scoring for 20K sensors
sn: Baseline | Healthy behaviour by speed and load state | One threshold per machine | Vibration changes with operating state
sn: Explanation | Which frequency band moved | An anomaly score alone | Engineers need to know where to look
sn: Validation | Replay on known faults | Self-reported detection | Without faults you do not know the miss rate
sig: Band energy ratio | energy in the bearing and gear bands against the baseline | Fault location | Per machine type
sig: Kurtosis and crest factor | impulsiveness of the signal | Early bearing damage | Window size matters
sig: Operating state | speed and load clusters | Conditioning | From controller tags
sig: Cross-machine peer deviation | difference from similar machines in the same state | Context | Peers must be healthy
noise: Machine name | an identifier
noise: Sensor installation date | weak link
noise: Shift number | not a cause
base: Fixed alarm limits on overall velocity per machine class, because ISO severity charts are the common practice.
prod: An autoencoder or isolation forest per operating state on spectral features with calibrated scores and band-level explanations, run on edge devices and reviewed by condition-monitoring engineers.
pipe: Vibration capture @ edge gateway ; Spectral feature extraction @ signal processing ; State assignment @ clustering ; Anomaly scoring @ autoencoder ; Band explanation @ feature attribution ; Engineer review @ monitoring console ; Fault feedback @ labels
edge: Process change | normal behaviour changes | State clustering and baseline refresh on approved changes
edge: Sensor mounting loosens | spurious spikes | Mounting health checks and signal quality flags
edge: Start-up transients | false alarms during ramp-up | Exclude transients using state tags
off: Detection rate on replayed faults ; False alarms per asset-month ; Lead time before failure
on: Faults found before failure ; Engineer time per alarm ; Unplanned stops
gap: One threshold for all states ; No fault replay ; Alarms without explanation

== maintenance-technician-copilot | Maintenance Technician Copilot | llm-agents,nlp | seconds | advanced | a=2 k=50
obj: Give technicians grounded answers from manuals, work-order history and asset data on a phone or tablet, with step-by-step procedures and safety notes, so repairs are faster and more consistent.
con: Every answer cites the manual page or work order ; Safety lockout steps are always shown from the controlled source ; The copilot cannot close work orders or change settings ; Works in poor connectivity with offline manuals ; Answer within 5 s
sn: Source | Controlled manuals and the asset's own history | General model knowledge | Wrong torque or voltage values cause injuries
sn: Safety | Procedures retrieved from approved lockout documents | Paraphrased safety steps | Paraphrase loses critical details
sn: Memory | Closed work orders with confirmed fixes | Open tickets | Open tickets record the symptom not the cure
sig: Asset model match | the exact asset model and revision | Retrieves the right manual | From the CMMS
sig: Symptom similarity | match to past work orders with the fix | Suggests precedent | Confirmed fixes only
sig: Manual revision date | currency of the retrieved document | Avoids old procedures | From document control
sig: Technician certification | qualifications held | Gates risky steps | From training records
noise: Technician chat style | not a diagnostic signal
noise: Work-order age | not a fix signal
noise: Photo resolution | an artefact
base: Keyword search over manuals and work orders, because it measures how much retrieval alone helps.
prod: A retrieval-grounded copilot with asset-aware search, cited step lists, controlled safety content, photo input for part identification and a feedback button that captures confirmed fixes.
pipe: Question and photo intake @ mobile app ; Asset resolution @ CMMS lookup ; Document and history retrieval @ hybrid search ; Grounded procedure @ LLM with citations ; Safety content injection @ controlled source ; Technician feedback @ app ; Fix capture @ CMMS
edge: Conflicting manuals | two revisions disagree | Prefer the latest and flag the conflict to document control
edge: Missing manual | no document for the asset | Say so and route to an expert
edge: Prompt injection in a work-order note | a note tries to change instructions | Treat notes as data with tool allow-lists
off: Citation faithfulness on audited answers ; Retrieval hit rate for confirmed fixes ; Safety step accuracy
on: Mean time to repair ; First-time fix rate ; Expert escalations
gap: Paraphrasing safety steps ; No revision control ; Learning from open tickets

== work-order-failure-code-classification | Work Order Failure Code Classification | nlp | seconds | foundational | a=1 k=3
obj: Assign standard failure codes and causes to maintenance work orders from technician text so reliability analysis rests on consistent data.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Technician confirms the suggested code ; Codes follow the company taxonomy ; Multilingual text supported ; 20K work orders per day
sn: Taxonomy | A stable approved code list | Free text categories | Reports need consistent codes
sn: Label | Codes reviewed by reliability engineers | Whatever the technician picked in a hurry | Hurried picks are often the default
sn: Use | Suggestions with confidence | Auto-assigned codes | Wrong codes corrupt reliability analysis
sig: Component and symptom terms | named parts and symptoms in the text | Primary evidence | Maintain a synonym list
sig: Asset class | the type of asset | Restricts valid codes | From the CMMS
sig: Action verbs | replaced, adjusted, cleaned | Distinguishes the cause from the action | Parse the action text
sig: Previous codes on the asset | recent failure codes | Prior | Use as a weak hint
noise: Technician name | irrelevant
noise: Text length | not the code
noise: Priority level alone | weak link
base: Keyword rules mapping common terms to codes, because reliability teams already use similar lists.
prod: A multilingual text classifier constrained by asset class, with confidence-based auto-suggest and an audit sample, plus a monthly code quality report.
pipe: Work order intake @ CMMS ; Text normalisation @ language detection ; Code classifier @ transformer ; Asset class constraint @ rule filter ; Suggestion in form @ CMMS UI ; Technician confirmation @ click ; Quality audit @ monthly sample
edge: Slang and abbreviations | the classifier misreads the text | Site-specific lexicons and a review loop
edge: Multiple failures in one order | several codes apply | Allow multiple codes with a primary
edge: New equipment | codes are missing | An other bucket and a prompt to the taxonomy owner
off: Top-one and top-three accuracy by asset class ; Agreement with engineer review ; Calibration
on: Share of work orders with a valid code ; Time spent coding ; Reliability analysis rework
gap: Training on hurried default picks ; Auto-assigning without review ; Ignoring asset class

== spare-parts-criticality-classification | Spare Parts Criticality Classification | tabular | batch | foundational | a=0.1 k=10
obj: Classify spare parts by the downtime cost of being out of stock and by failure likelihood, so stocking policy covers critical parts at the right level.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Criticality decisions reviewed by reliability engineers ; Safety-critical parts always held ; Annual review with quarterly updates ; 200K part numbers
sn: Impact | Downtime cost if the part is missing | Part price | Cheap parts can stop a line
sn: Likelihood | Failure rate from history and installed base | Usage alone | Usage reflects past stocking not need
sn: Substitutes | Interchangeable parts counted | Part by part view | Substitutes change true criticality
sig: Equipment downtime cost | cost per hour of the asset the part serves | Impact | From finance and production
sig: Failure rate of the part | failures per unit-year | Likelihood | From work orders
sig: Lead time and single source | supplier lead time and sourcing options | Resupply risk | From purchasing
sig: Interchangeability | alternative part availability | Reduces criticality | From the part master
noise: Part description length | not importance
noise: Warehouse bin | irrelevant
noise: Vendor name | an identifier
base: An ABC analysis by annual spend, because it is the common starting point.
prod: A model scoring impact and likelihood to classify parts, with a stocking rule per class and a review list for engineers, plus a link to the lead-time risk.
pipe: Part and usage data @ ERP and CMMS ; Impact and likelihood features @ batch ; Criticality model @ gradient boosting ; Stocking rule @ policy table ; Engineer review @ planning tool ; Stock policy update @ ERP ; Outcome tracking @ stock-outs
edge: Rarely used critical part | there is little usage history | Expert override with a reason
edge: Equipment retired | demand disappears | Retirement events and write-off review
edge: Supplier exit | the lead time jumps | Supplier risk feed into criticality
off: Agreement with engineer criticality ; Stock-out rate in critical class ; Calibration of failure likelihood
on: Critical stock-outs ; Inventory value ; Emergency purchase cost
gap: Classifying by spend alone ; Ignoring substitutes ; No expert review

== unplanned-downtime-root-cause-agent | Unplanned Downtime Root-Cause Agent | llm-agents,time-series | seconds | advanced | a=0.5 k=40
obj: After a line stop, assemble the alarm sequence, operator notes, maintenance history and process data into a ranked list of probable causes and a draft downtime report for the shift lead.
con: Evidence is cited from plant systems ; The agent has no write access to control systems ; The shift lead confirms the cause code ; Draft available within 2 minutes of restart ; Handles 5K stops per day
sn: Sequence | The order of alarms and states around the stop | A single stop code | The first alarm often hides the real cause
sn: Evidence | Data from the stop and similar past stops | The operator's guess | A guess repeats the same cause code
sn: Output | A cause code and a short report | A long narrative | Shift leads need a quick decision
sig: First-out alarm | the earliest alarm in the stop sequence | Points to the trigger | Needs accurate clocks
sig: Similar stop precedent | match to past stops with confirmed cause | Source of hypotheses | Confirmed causes only
sig: Recent maintenance and changeover | work performed on the machine in 48 hours | Often related | From the CMMS
sig: Operator note content | free text left at the stop | Context | Treat as data
noise: Operator name | not a cause
noise: Shift label alone | confounded
noise: Stop duration alone | not a cause
base: Assign the cause code from the machine's stop reason alone, because it is the existing data capture.
prod: An agent with read-only tools for alarms, states, notes and history that proposes ranked causes with evidence and drafts the downtime report for confirmation.
pipe: Stop event intake @ MES ; Alarm sequence build @ stream data ; Precedent retrieval @ search ; Cause ranking @ agent with evidence ; Report draft @ LLM ; Shift lead confirmation @ HMI ; Pareto reporting @ analytics
edge: Cascading stops | one cause triggers many | Group by the first-out event
edge: Missing notes | no operator input | Rely on alarm sequence and state it is incomplete
edge: Wrong clocks | alarms appear out of order | Clock quality checks and time alignment
off: Cause accuracy against confirmed codes ; Report faithfulness ; Time to a confirmed cause
on: Mean time to restart ; Share of stops with a verified cause ; Repeat stops
gap: Using the stop reason as truth ; Long narratives ; Trusting unsynchronised clocks

== oee-loss-attribution | OEE Loss Attribution | tabular,time-series | batch | foundational | a=1 k=5
obj: Attribute lost production time and output to causes such as stops, speed loss and quality so improvement effort targets the largest loss buckets.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Loss definitions follow the plant standard ; Attribution reconciles to total lost hours ; Per-line and per-shift views ; 2K lines in the daily run
sn: Definition | A single loss taxonomy across lines | Local definitions | You cannot compare lines with different rules
sn: Coverage | Short stops captured automatically | Operator-logged stops only | Small stops are missed and add up
sn: Action | Pareto of causes with a cost | An OEE percentage | A percentage alone does not show where to act
sig: Stop duration and frequency | number and length of stops by cause | Availability loss | From machine states
sig: Speed versus ideal | achieved rate against the ideal rate | Performance loss | Ideal rate from engineering
sig: Reject count by cause | rejects by quality class | Quality loss | From inspection
sig: Changeover duration | minutes between product runs | Planned loss | From schedules
noise: Operator name | not a cause
noise: Shift label alone | confounded
noise: Machine age | weak link
base: A manual OEE calculation from operator logs and counts, because it is the standard practice.
prod: Automated state classification from machine signals with a hierarchical loss tree, anomaly flags for unexplained loss and a weekly Pareto with cost.
pipe: Machine state capture @ PLC and historian ; Stop classification @ rules and model ; Loss tree @ batch aggregation ; Unexplained loss flag @ anomaly model ; Pareto and cost @ BI dashboard ; Action tracking @ improvement system ; Quality join @ MES
edge: Micro-stops | many stops under 30 seconds | Capture automatically with a minimum threshold
edge: Product mix change | the ideal rate varies | Product-specific ideal rates
edge: Missing states | gaps in machine data | Flag the missing time and exclude from rate calculations
off: Reconciliation of lost time ; Classification accuracy against audits ; Unexplained loss share
on: OEE improvement on targeted lines ; Time spent producing the report ; Loss closed per quarter
gap: Operator-logged stops only ; Local definitions ; Reporting a percentage without a Pareto

== process-setpoint-optimisation-yield | Process Setpoint Optimisation for Yield | reinforcement-learning,tabular | seconds | staff-principal | a=6 k=15
obj: Recommend setpoint adjustments on a continuous or batch process to raise yield and cut energy while staying within safe operating limits.
con: Recommendations bounded by validated safe limits ; Operator or engineer approves each change ; A model output cannot write directly to the controller ; Simulation test before use ; Recommendation every 5 minutes for 300 units
sn: Safety | Hard limits enforced in code outside the model | A model that learns the limits | A learned limit can be wrong in a rare state
sn: Causality | Effects estimated from controlled variation and physics | Correlations in historical data | Operators move setpoints for reasons the data does not show
sn: Evaluation | Matched runs and staged rollout | Before and after averages | Raw material changes confound the result
sig: Current setpoint distance from the optimum region | position relative to the learned yield surface | Direction of change | Constrained by limits
sig: Feed quality indicators | measured properties of the incoming material | Context | Lab and inline analysers
sig: Ambient and utility conditions | temperature, pressure and cooling water state | Context | Include timestamps
sig: Equipment fouling indicator | trend in heat transfer or pressure drop | Slow drift | Per asset
noise: Operator name | not a process variable
noise: Batch number | an identifier
noise: Day of week alone | confounded
base: Standard operating setpoints with manual tuning by experienced operators, because they are the benchmark for any gain.
prod: A constrained optimiser over a learned process model with uncertainty, advice-only first, a staged rollout with matched controls and a safety layer that clips any recommendation to approved limits.
pipe: Process data capture @ historian ; Process model @ gradient boosting with uncertainty ; Constrained optimiser @ bounded search ; Safety clip @ rules in code ; Advisory display @ operator HMI ; Operator action log @ MES ; Matched control evaluation @ analytics
edge: Unfamiliar feed | the model extrapolates | Uncertainty gating and fallback to standard setpoints
edge: Actuator saturation | the advice cannot be followed | Include actuator limits in the optimiser
edge: Operator ignores advice | the effect cannot be measured | Track acceptance and analyse by group
off: Predicted versus achieved yield on matched runs ; Safety clip rate ; Model error in unseen operating regions
on: Yield improvement against matched controls ; Energy per unit ; Off-spec output
gap: Letting the model learn safety limits ; Reading correlations as causes ; Comparing before and after

== soft-sensor-hard-to-measure-quantities | Soft Sensor for Hard-to-Measure Quantities | tabular,time-series | seconds | advanced | a=12 k=6
obj: Estimate quantities such as composition, viscosity or moisture that are measured rarely in a lab from fast process signals, so control and quality decisions can be made in real time.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Estimates with an uncertainty range ; Lab values override the estimate when available ; Drift detection with retraining triggers ; Latency under 2 s ; 5K soft sensors
sn: Target | Lab measurements aligned to the process time they represent | Lab sample time | Samples reflect the process earlier than they are logged
sn: Delay | Dynamic features that model the process delay | Instantaneous values only | Material takes time to move through the plant
sn: Trust | Uncertainty and automatic fallback | A point estimate | Operators stop trusting a sensor that is wrong once
sig: Lagged process signals | lagged temperature, flow and pressure features aligned to residence time | Primary drivers | Residence time from the process
sig: Recent lab residual | error of the last lab values against the estimate | Online correction | Needs timely lab entry
sig: Feed property indicators | measurements of the incoming material | Context | From analysers
sig: Equipment state | fouling and wear indicators | Drift driver | From maintenance data
noise: Lab technician | not a process variable
noise: Sample bottle number | an identifier
noise: Report time | a logging artefact
base: A linear model on a few process variables fitted to lab data, because it is common and easy to maintain.
prod: A dynamic model such as gradient boosting with lag features or a small recurrent network, with uncertainty, bias correction from each new lab value and drift monitoring.
pipe: Process and lab data join @ historian and LIMS ; Time alignment @ residence-time shift ; Soft sensor model @ gradient boosting ; Uncertainty and bias correction @ online update ; Output to control and HMI @ OPC UA ; Drift monitor @ residual checks ; Retrain @ triggered
edge: Process change | the relation changes | Drift alarm and a fallback to lab-only
edge: Missing sensor input | a tag drops out | Imputation limits and a confidence downgrade
edge: Lab method change | measured values shift overnight | Method change events and a recalibration
off: Error against held-out lab values ; Coverage of intervals ; Drift detection delay
on: Off-spec batches ; Lab samples per week ; Control loop variability
gap: Using sample time as process time ; Point estimates only ; No fallback

== batch-cycle-time-reduction | Batch Cycle-Time Reduction | tabular | batch | advanced | a=1 k=12
obj: Predict the shortest safe cycle time for each batch from raw material properties and early readings so batch processes finish sooner without hurting quality.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Quality limits are not relaxed ; Recommendations reviewed by process engineers ; Cycle time predictions with intervals ; 50K batches per year
sn: Objective | Time saved at constant quality | Time saved | Faster batches that fail are slower overall
sn: Signal | Early-stage readings that predict the end state | Final readings | Final readings are too late to act on
sn: Control | Matched comparisons across materials | Raw averages | Material lot changes drive cycle time
sig: Early reaction rate indicators | slope of temperature and conversion in the first phase | Predicts duration | Per recipe
sig: Raw material assay values | lab properties of the input lot | Variation driver | From QC
sig: Equipment condition | fouling and heating capacity | Slows the process | From maintenance data
sig: Ambient conditions | temperature and humidity | Minor driver | Condition on season
noise: Batch number | an identifier
noise: Operator name | not a driver
noise: Report timestamp | an artefact
base: The standard cycle time from the master recipe, because it is the planning basis.
prod: A regression model on early readings and input properties predicting the end-point time with intervals, a policy proposing shorter hold times within validated limits and a staged trial.
pipe: Batch data capture @ historian and batch system ; Early-phase features @ batch features ; Cycle-time model @ gradient boosting ; Policy within limits @ rules ; Engineer review @ planning tool ; Trial batches @ matched controls ; Outcome tracking @ quality results
edge: New raw material supplier | the properties change | Supplier features and a conservative interval
edge: Equipment fouling | cycle time grows | Fouling features and a maintenance trigger
edge: Quality drift | shorter cycles reduce quality slowly | Quality guard on trial batches with automatic rollback
off: Cycle-time error and interval coverage ; Quality outcomes on trial batches ; Time saved against matched controls
on: Average cycle time ; Batches per month ; Off-spec batches
gap: Optimising time without quality ; Using final readings ; Raw averages across materials

== scrap-rework-prediction | Scrap and Rework Prediction | tabular | seconds | foundational | a=3 k=10
obj: Predict which parts or lots will be scrapped or reworked from upstream data so engineers can intervene early and plan rework capacity.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Predictions available before the costly operation ; Reasons shown to engineers ; Retrain monthly ; 300K parts per day
sn: Label | Scrap and rework with a cause code | Any later delay | Delays have many causes
sn: Cost | Predictions weighted by the cost of the operation | Equal weights | A scrapped late-stage part costs far more than an early one
sn: Timing | Features known before the decision | Final measurements | Final measurements leak
sig: Upstream measurement deviations | out-of-tolerance flags on earlier operations | Defect precursors | By part id
sig: Tool life and changeover count | parts since last tool change | Wear | From the machine
sig: Material lot properties | incoming test values | Variation | By lot
sig: Operator-independent environment | temperature and humidity at the station | Process effect | From sensors
noise: Operator name | not a cause
noise: Part serial | an identifier
noise: Shift label alone | confounded
base: Historical scrap rate by product and machine, because it sets the minimum to beat.
prod: Gradient boosting on part-level upstream features with cost-weighted thresholds and reason codes, plus a rework capacity forecast.
pipe: Part data and genealogy @ MES ; Feature build @ per-part aggregates ; Scrap model @ gradient boosting ; Cost-weighted threshold @ rules ; Reason display @ station HMI ; Rework planning @ planning tool ; Outcome labels @ nightly
edge: New product | no scrap history | Product family priors and conservative thresholds
edge: Inspection change | the labels shift after the change | Version the inspection plan and retrain
edge: Hidden rework | rework is not recorded | Audit coverage and enforce capture
off: Cost-weighted recall at fixed review capacity ; Calibration ; Lead time before the costly step
on: Scrap cost ; Rework hours ; Parts diverted early
gap: Using final measurements ; Equal cost weights ; Ignoring unrecorded rework

== injection-moulding-parameter-tuning | Injection Moulding Parameter Tuning | reinforcement-learning,tabular | seconds | advanced | a=6 k=10
obj: Suggest machine parameter changes for injection moulding to hold part quality as material and temperature drift, reducing setup time and scrap.
con: Suggested changes within validated ranges ; The setter approves each change ; Part quality checks after every change ; Suggestion within 10 s of a drift alert ; 800 machines
sn: Drift | Changes in melt viscosity and tool temperature tracked per cycle | Fixed parameters all day | Material and temperature drift continuously
sn: Search | A small, safe set of parameter moves | Free exploration | Exploration on a production run makes scrap
sn: Evidence | Part quality measurements after each move | Machine reported success | Machine status does not show part quality
sig: Cavity pressure curve features | peak and integral of the cavity pressure curve | Fill and pack quality | Per tool
sig: Cycle time and cushion | injection cycle time and cushion size | Process stability | From the machine
sig: Melt and mould temperatures | measured temperatures per zone | Material state | Sensor drift check
sig: Material lot and moisture | resin lot and drying records | Variation source | From the dryer log
noise: Machine name | an identifier
noise: Setter name | not a driver
noise: Shot counter | a counter
base: Manual adjustments by setters guided by a parameter sheet, because it reflects tacit expertise and the benchmark.
prod: A contextual bandit over a small safe move set with cavity-pressure and quality feedback, setter approval and a rollback on any quality drop.
pipe: Cycle data capture @ machine controller ; Drift detection @ cavity pressure features ; Move proposal @ constrained bandit ; Safe range check @ rules ; Setter approval @ HMI ; Part quality check @ inspection ; Learning update @ nightly
edge: Tool wear | optimal parameters shift slowly | Tool-life features and a maintenance trigger
edge: New material | prior moves do not apply | Material-specific starting ranges
edge: Sensor failure | cavity data is wrong | Signal checks and a fallback to manual
off: Quality hold rate after suggested moves ; Move acceptance and success ; Drift detection lead time
on: Scrap rate ; Setup time ; Setter interventions per shift
gap: Free exploration in production ; Trusting machine status as quality ; Ignoring tool wear

== wafer-yield-excursion-detection | Wafer Yield Excursion Detection | tabular,time-series | batch | staff-principal | a=3 k=40
obj: Detect and attribute yield excursions in semiconductor or electronics fabs to a tool, step or lot from inline metrology and fault data, so engineers contain them within hours.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Excursion detection within 4 hours of metrology ; Tool and step attribution with evidence ; Analysts confirm before tool hold ; Handles 100M data points per day
sn: Attribution | Commonality analysis across tool and step histories | Correlation with a single metric | Many steps co-vary and mislead
sn: Metrology | Inline and test data tied to the wafer path | Lot averages | Averages dilute a single bad chamber
sn: Action | A ranked hold recommendation | An alarm | Fabs need a tool and step to act
sig: Tool commonality score | share of bad wafers sharing a tool or chamber against the base rate | Primary attribution | Needs the wafer path
sig: Metrology deviation | deviation of inline measurements from target | Early indicator | Per step
sig: Fault detection summary | FDC alarm counts on the path | Process signals | Per tool
sig: Time since maintenance | hours since preventive maintenance | Drift driver | From the CMMS
noise: Lot name | an identifier
noise: Operator name | not a driver
noise: Wafer slot number alone | weak link
base: Manual commonality analysis by yield engineers with a spreadsheet, because it is the standard practice.
prod: Automated commonality and a gradient boosting model on path and metrology features with ranked tools and steps, confidence and evidence charts for the yield engineer.
pipe: Wafer path and metrology ingestion @ MES and metrology ; Path join @ lakehouse ; Excursion detector @ statistical tests ; Attribution model @ gradient boosting ; Ranked tool and step list @ analyst console ; Hold decision @ engineer ; Outcome tracking @ yield system
edge: Several tools involved | interaction effects | Pairwise commonality and a human review
edge: Metrology delay | data arrives late | Provisional alerts and later confirmation
edge: New product ramp | baselines shift | Product-specific baselines and a ramp mode
off: Attribution accuracy on past excursions ; Detection delay ; False hold rate
on: Wafers affected per excursion ; Time to containment ; Yield loss
gap: Lot-level averages ; Single metric correlation ; Alarms without a tool and step

== recipe-change-impact-assessment | Recipe Change Impact Assessment | tabular | batch | advanced | a=0.02 k=15
obj: Estimate the effect of a proposed recipe or parameter change on yield, quality and energy from past changes and process models, so engineers prioritise and de-risk trials.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Estimates with uncertainty and the evidence base ; Change control approval remains mandatory ; Model results never replace validation trials ; Weekly refresh of 2000 open change proposals
sn: Causality | Past changes with matched controls | Before and after on all lots | Other factors changed at the same time
sn: Uncertainty | Wide intervals when few precedents exist | A point estimate | Overconfidence wastes a trial
sn: Use | Prioritising which trials to run | Approving changes by model | Validation is mandatory
sig: Similar past changes | changes of the same type on similar products | Precedent | By parameter and product family
sig: Sensitivity from the process model | modelled change in output per parameter unit | Mechanism | Needs a validated model
sig: Operating window margin | distance of the new setting from limits | Risk | From the recipe
sig: Equipment capability | actuator and sensor range | Feasibility | From engineering data
noise: Engineer name | not a driver
noise: Change request number | an identifier
noise: Ticket text length | weak link
base: Expert judgement in a change review board, because it is the current gate and the benchmark.
prod: A causal effect model trained on matched historical changes with uncertainty, a ranked trial plan by expected value and a link to the change record.
pipe: Change records and outcomes @ change system and MES ; Matching and effect estimation @ causal model ; Process model simulation @ validated model ; Uncertainty estimate @ ensemble ; Trial ranking @ planning tool ; Change board review @ board console ; Outcome capture @ results
edge: No precedent | the change type is novel | Wide intervals and a pilot-first rule
edge: Hidden confounder | another change happened at the same time | Check the change log and use matched controls
edge: Model misuse | the board treats results as approval | Show the intervals and the required validation steps
off: Calibration of effect estimates on past trials ; Interval coverage ; Rank correlation with realised value
on: Trials with positive results ; Time to validate changes ; Failed trials
gap: Before-and-after comparisons ; Point estimates only ; Treating the model as approval
