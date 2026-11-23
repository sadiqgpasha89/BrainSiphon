# Public Safety & Security, part 2 (use cases 22-50): road safety, physical security operations, courts and justice administration, scams online harm and victim support, oversight and agent governance
# Vendor-neutral. No model scores a named individual or identifies a person by face or biometrics, outputs are leads or drafts for a human decision, evidence originals are never altered and every tool use is logged against the case.
== enforcement-image-quality-triage | Traffic Enforcement Image Quality Triage | computer-vision | batch | foundational | a=1 k=100
obj: Check the quality of images from speed and red-light cameras so unusable images are removed early and reviewers see clear evidence, with every violation decided by a trained reviewer.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: The model never decides a violation ; Unusable images are logged with the reason ; Plates of non-violations are discarded on schedule ; Reviewer sees the original image ; 2M images per month
sn: Role | Quality triage before human review | A violation classifier | Penalties need a person and proof
sn: Privacy | Short retention and masking for non-violations | Keeping all images | Images of lawful drivers are personal data
sn: Fairness | Equal image quality checks across sites | Rules tuned on one site | Camera conditions differ widely
sig: Image sharpness and exposure | blur, glare and exposure | Usability | From the image
sig: Plate legibility | readable plate region | Usability | From the vision model
sig: Frame completeness | vehicle, signal and marking visible | Evidence completeness | From the vision model
sig: Camera health history | past quality issues at the site | Prior | From maintenance
noise: Driver identity | personal data
noise: Vehicle make alone | weak link
noise: Time of day alone | weak link
base: Reviewers opening every image and rejecting poor ones, because it is the current process.
prod: A quality classifier that sorts images into usable, borderline and unusable with reasons, sends borderline images to a reviewer and drives camera maintenance tickets.
pipe: Image intake @ enforcement cameras ; Quality scoring @ vision model ; Reason coding @ rules ; Reviewer queue @ enforcement tool ; Discard schedule @ retention policy ; Camera maintenance ticket @ asset system ; Site parity review @ quarterly
edge: Night glare | headlights wash out the plate | Exposure flags and camera adjustments
edge: Rain on lens | the image is blurred | Weather flags and cleaning tickets
edge: New camera type | the model has not seen the sensor | Site calibration and monitoring
off: Agreement with reviewers on usability ; Reason code accuracy ; Quality parity by site
on: Reviewer time per valid case ; Unusable images reviewed ; Camera downtime
gap: Automatic violation decisions ; Long image retention ; Single-site tuning

== near-miss-video-detection | Near-Miss Detection from Anonymised Video | computer-vision | batch | advanced | a=10 k=200
obj: Detect conflicts between road users at junctions from anonymised video trajectories so engineers see danger before crashes occur.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Video reduced to anonymous tracks at the edge ; No plate or face storage ; Conflict severity measured by time-to-collision ; Weekly site reports ; 300 junctions
sn: Metric | Time-to-collision and post-encroachment time | Raw video clips | Clips need people to watch
sn: Privacy | Anonymous trajectories only | Stored video | Video identifies people
sn: Link | Conflicts validated against crash history | Conflicts alone | The link to crashes shows value
sig: Road user trajectories | positions and speeds of users | Basis | From tracking
sig: Time-to-collision | predicted time to collision | Severity | Computed
sig: User type | pedestrian, cyclist or vehicle | Context | From classification
sig: Signal phase | state of signals | Context | From controllers
noise: Vehicle plate | personal data
noise: Face features | prohibited
noise: Clothing colour | irrelevant
base: Crash records and occasional manual conflict studies, because they are the standard evidence.
prod: An edge pipeline that converts video to anonymous trajectories, computes conflict indicators and delivers site reports with junction diagrams for engineers.
pipe: Video capture @ junction cameras ; Edge anonymisation @ tracking model ; Trajectory store @ time-series store ; Conflict computation @ rules ; Site report @ BI tool ; Engineer review @ road safety team ; Treatment evaluation @ before after
edge: Occlusion | a bus hides a crossing | Multi-camera views
edge: Tracking errors | users are swapped | Track quality filters
edge: Night video | detection drops | Low-light models and flagged periods
off: Track accuracy ; Conflict indicator correlation with crashes ; Detection recall by user type
on: Severe conflicts per day ; Treatment effect ; Crashes at monitored sites
gap: Stored video ; Counting conflicts with no validation ; Face or plate features

== road-weather-hazard-alerting | Road Weather Hazard Alerting | time-series | seconds | foundational | a=96 k=3
obj: Forecast ice, flooding and low visibility on road segments from sensors and weather models and alert maintenance teams and drivers in time to treat or warn.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Segment forecasts for the next 6 hours ; Alerts to winter service within 10 minutes of threshold ; Message signs set by named operators ; Sensor failures detected ; 20K road segments
sn: Truth | Road surface sensors and patrol reports | Air temperature alone | Pavement temperature differs
sn: Action | Treatment and warning plans | A forecast | Teams need what to do and where
sn: Reliability | Sensor health checks | Trusting every sensor | Sensors fail in winter
sig: Pavement temperature forecast | predicted surface temperature | Ice risk | From models
sig: Precipitation type and timing | rain, snow and freezing rain | Hazard | From radar
sig: Surface moisture | wet or dry surface | Ice risk | From sensors
sig: Visibility readings | fog and spray | Hazard | From sensors
noise: Sensor name | an identifier
noise: Operator name | irrelevant
noise: Alert wording | an artefact
base: Weather service forecasts and fixed treatment triggers, because they are the standard winter service rules.
prod: A segment-level surface model with sensor assimilation and quantile outputs that triggers treatment suggestions and message sign proposals for operator approval.
pipe: Sensor and weather ingestion @ road weather stations ; Surface model @ physics and learning ; Hazard classification @ model ; Alert and treatment suggestion @ rules ; Operator approval @ traffic centre ; Sign and crew messages @ operations ; Verification @ post event
edge: Sensor outage | a station reports nothing | Neighbour inference and a flag
edge: Micro-climate | a bridge freezes before the road | Segment-specific features
edge: Late alert | the forecast was too slow | Lead-time tracking and rule tuning
off: Ice event recall and lead time ; False alert rate ; Calibration
on: Ice-related crashes ; Salt use ; Time to treat
gap: Air temperature as the only input ; Forecasts with no actions ; Trusting failing sensors

== pedestrian-safety-intervention-ranking | Pedestrian Safety Intervention Ranking | tabular | batch | advanced | a=0.2 k=6
obj: Rank crossings and streets for safety treatments by estimated crash risk reduction per cost, so budgets go to the interventions that save most lives.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Benefit-cost ranking with uncertainty ; Equity weighting for areas with less safe infrastructure ; Engineers and communities review lists ; Annual run for 100K sites
sn: Metric | Expected reduction in serious injuries per cost | Crash counts only | Counts ignore exposure and treatment effect
sn: Equity | Equity weights shown separately | Hidden weights | Policies must be transparent
sn: Evidence | Treatment effects from studies | Assumed effects | Assumed effects mislead
sig: Pedestrian exposure | pedestrian volumes | Exposure | From counts
sig: Vehicle speed and volume | speeds and flows | Hazard | From counts
sig: Crash history by severity | recorded crashes | Prior | From crash records
sig: Treatment effect estimates | crash reduction factors | Benefit | From research
noise: Reporting officer | irrelevant
noise: Street name | an identifier
noise: Photo name | an artefact
base: Treat sites with the most crashes in the last three years, because it is the simple rule.
prod: A crash risk model with treatment effects and cost, equity views and a ranked list for engineers with uncertainty ranges.
pipe: Crash, count and road data @ road safety records ; Risk model @ regression ; Treatment effect library @ research database ; Benefit-cost ranking @ optimiser ; Equity view @ rules ; Engineer and community review @ planning ; Outcome study @ before after
edge: Low exposure data | pedestrian counts are missing | Estimated exposure with flags
edge: New design | few evaluations exist | Wider ranges
edge: Cost changes | project costs rise | Updated estimates
off: Calibration of risk ; Ranking stability ; Treatment effect checks in follow-up
on: Serious injuries per budget ; Equity of treated areas ; Sites treated per year
gap: Crash counts as the objective ; Hidden equity weights ; Assumed treatment effects

== crash-report-narrative-classification | Crash Report Narrative Classification | nlp | batch | foundational | a=0.2 k=6
obj: Classify crash report narratives into contributing factors and scenarios so engineers and policy teams study causes beyond the coded fields.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Multi-label factors with confidence ; Names and plates removed before analysis ; Sample audited by safety analysts ; Quarterly run for 500K reports
sn: Label | Factors coded by trained analysts | Officer checkboxes | Checkboxes are inconsistent
sn: Privacy | Redacted narratives | Named narratives | Names add risk without value
sn: Use | Pattern analysis for engineers | Blame assignment | The goal is system safety
sig: Narrative text | description of the crash | Factors | From the report
sig: Coded fields | road, weather and vehicle types | Context | From the form
sig: Location context | junction type and speed limit | Context | From GIS
sig: Severity | injury level | Priority | From the report
noise: Officer name | irrelevant
noise: Driver name | personal data
noise: Report length | weak link
base: Analysts reading narratives for sample studies, because it is the current method.
prod: A multi-label classifier with redaction and analyst review samples, producing factor counts by location and scenario for safety engineers.
pipe: Report intake @ crash database ; Redaction @ pattern and model ; Factor classifier @ transformer ; Confidence filter @ rules ; Analyst sample review @ safety team ; Pattern reports @ BI tool ; Re-labelling @ annual
edge: Vague narrative | the text lacks causes | Abstain and flag
edge: New factor | e-scooter crashes appear | Open category and review
edge: Template changes | the form changes | Versioned mappings
off: Factor accuracy by class ; Redaction recall ; Agreement with analysts
on: Time to study a pattern ; Causes found outside codes ; Treatment targeting
gap: Checkbox-only labels ; Named analysis ; Blame framing

== perimeter-intrusion-detection | Perimeter Intrusion Detection | computer-vision,time-series | sub-100ms | advanced | a=20 k=300
obj: Detect people or vehicles crossing fences and restricted lines at facilities from cameras and sensors and alert the security desk with a short clip, without identifying people.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Alert within 3 s with a clip ; A security officer verifies before response ; No facial recognition ; False alarms under 3 per camera per week ; 2K cameras
sn: Label | Verified intrusions and confirmed false alarms | Raw motion events | Motion triggers fire on animals and weather
sn: Privacy | Detection of presence and behaviour only | Identity | Identification is out of scope
sn: Action | A verified alert for response | An automatic lockdown | Wrong lockdowns disrupt operations and safety
sig: Object class and crossing | person or vehicle crossing a line | Core signal | From the vision model
sig: Fence and sensor events | vibration or fibre sensor alarms | Corroboration | From sensors
sig: Weather and lighting | rain, wind and darkness | Reliability | From sensors
sig: Time and schedule context | authorised work windows | Context | From access plans
noise: Officer name | irrelevant
noise: Camera model | an artefact
noise: Image file name | an artefact
base: Motion detection and fence sensors with a guard checking each alarm, because it is the current setup.
prod: A detector with line-crossing rules, sensor corroboration and a clip view for guards, plus tuning from feedback on false alarms.
pipe: Camera and sensor capture @ site systems ; Object detection @ edge vision model ; Crossing logic @ rules ; Sensor corroboration @ event fusion ; Alert with clip @ security console ; Officer verification @ security desk ; Feedback and retraining @ monthly
edge: Wildlife | animals trigger alerts | Object classes and size filters
edge: Storm | wind and rain produce noise | Weather-aware thresholds
edge: Camera tampering | the view is blocked | Camera health alerts
off: Intrusion recall in trials ; False alarms per camera-week ; Alert latency
on: Verified intrusions ; Guard time on false alarms ; Response time
gap: Facial recognition ; Automatic lockdown ; Motion events as labels

== abandoned-object-detection | Abandoned Object Detection in Transit Stations | computer-vision | seconds | advanced | a=10 k=300
obj: Detect bags or objects left unattended in stations and alert operations staff to check them, without tracking or identifying the people who left them.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Alert within 30 s of the object being static for the set time ; Staff verify on site ; Anonymised detection only ; False alarms under 1 per camera per day ; 3K cameras
sn: Rule | Static object with no nearby owner for a set time | Any static object | Benches and bins create false alarms
sn: Privacy | No person tracking for identity | Following people through stations | Tracking is a surveillance step beyond need
sn: Action | A staff check | A station closure | Closures need a human decision
sig: Static object detection | objects not moving | Core signal | From vision
sig: Owner proximity | whether people stay near the object | Abandonment | From anonymised tracks
sig: Dwell time | time static | Rule | Computed
sig: Crowd density | people in the area | Context | From counts
noise: Staff name | irrelevant
noise: Camera model | an artefact
noise: Clothing colour | irrelevant
base: Staff patrols and passenger reports, because they are the standard process.
prod: A detector with owner proximity and dwell rules, an alert queue with image clips and a feedback channel to reduce false alarms from fixed items.
pipe: Camera capture @ station cameras ; Object detection @ edge vision model ; Owner proximity logic @ anonymised tracker ; Dwell rule @ rules ; Alert queue @ operations console ; Staff check @ mobile app ; Review @ monthly
edge: Rush hour | crowds hide owners | Crowd-aware dwell times
edge: Cleaning carts | equipment looks abandoned | Allow-lists for staff items
edge: Lighting change | detection drops | Camera calibration checks
off: Detection of staged objects ; False alarms per camera-day ; Time to alert
on: Objects verified ; Staff time on false alarms ; Response time
gap: Tracking people ; Static object alerts with no owner logic ; Automatic closure

== crowd-density-flow-monitoring | Crowd Density and Flow Monitoring | computer-vision | seconds | foundational | a=30 k=100
obj: Estimate crowd density and flow in public spaces and venues from anonymised counts so operators open exits, add staff or slow entry before crowding becomes dangerous.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Density estimates every 10 s ; Thresholds set by safety planners ; Counts only with no identity ; Operators decide every intervention ; 200 zones
sn: Metric | People per square metre and flow rate | Total attendance | Danger depends on local density
sn: Privacy | Counts and heat maps | Face recognition | Identification is not needed for safety
sn: Action | Operator interventions and warnings | Automatic gate closure | Closures can create danger
sig: Density per zone | estimated people per square metre | Core | From vision
sig: Flow direction and speed | movement patterns | Early warning | From optical flow
sig: Capacity of exits and corridors | exit width and capacity | Constraint | From plans
sig: Event schedule | start and end times | Context | From operators
noise: Event name | an identifier
noise: Camera brand | an artefact
noise: Clothing colour | irrelevant
base: Staff observation and ticket counts, because they are the current monitoring.
prod: A density estimation model with exit capacity logic and early warning thresholds, shown to the operations room with recommended actions.
pipe: Camera capture @ venue cameras ; Density estimation @ vision model ; Flow analysis @ optical flow ; Threshold logic @ safety rules ; Operations room display @ console ; Operator action log @ event system ; After-event review @ debrief
edge: Occlusion | people hide each other | Multi-camera fusion
edge: Night events | low light affects counts | Low-light models and thermal options
edge: Sensor failure | a zone goes dark | Health alarms and manual coverage
off: Count error by density band ; Alert lead time ; Zone coverage
on: Crowd incidents ; Time to open exits ; Staff deployment accuracy
gap: Identification of people ; Total attendance as the metric ; Automatic gate closure

== access-system-fault-anomaly | Door and Access System Fault Detection | time-series | batch | foundational | a=1 k=4
obj: Detect failing readers, doors forced or held open, and tailgating patterns at the door level so facilities fix faults and reduce security gaps, without profiling individual people.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Analysis at the door and reader level ; No individual employee scoring ; Facilities and security review alerts ; Event data retained for 90 days ; 50K doors
sn: Unit | Doors and readers | Employees | Employee surveillance harms trust and needs legal basis
sn: Label | Fault tickets and verified events | Alarms alone | Alarms include many false triggers
sn: Action | Maintenance and procedure fixes | Disciplinary action from scores | Not an intended use
sig: Door open duration | time doors stay open | Fault or misuse | From controllers
sig: Reader error rate | failed reads and retries | Reader fault | From readers
sig: Forced or held alarms | door alarms | Security event | From controllers
sig: Peak flow pattern | counts at entry times | Tailgating risk | Aggregated
noise: Employee name | personal data
noise: Badge number | an identifier
noise: Department | weak link
base: Alarm responses and periodic maintenance rounds, because they are the standard process.
prod: A door-level anomaly model with fault classification and a maintenance work order link, with aggregation that prevents individual-level views.
pipe: Controller event capture @ access control system ; Aggregation by door @ batch ; Anomaly model @ change point and classifier ; Fault classification @ rules ; Work order @ facilities system ; Security review @ security team ; Outcome tracking @ monthly
edge: Firmware update | event codes change | Versioned code maps
edge: Construction work | doors are held open on purpose | Work order awareness
edge: Peak events | many entries at once | Event calendar features
off: Fault detection against tickets ; False alerts per door-month ; Time to repair
on: Door downtime ; Security gaps closed ; Maintenance cost
gap: Employee scoring ; Alarm counts as labels ; Disciplinary use of scores

== security-camera-health-monitoring | Security Camera Health Monitoring | computer-vision,time-series | batch | foundational | a=1 k=20
obj: Detect blurred, blocked, misaligned or offline cameras from image statistics and network data so coverage is kept and failures are fixed before incidents need the footage.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Health score per camera updated hourly ; Reasons such as blur, tilt or blocked ; Work orders created for confirmed faults ; No content analysis of people ; 50K cameras
sn: Label | Faults confirmed by technicians | Offline pings only | A camera can be online and useless
sn: Scope | Image quality and position | Content of the scene | Content analysis is out of scope
sn: Action | A repair route | A report | Technicians need a plan
sig: Sharpness trend | focus measure over time | Blur | From image statistics
sig: View change | difference from a reference view | Misalignment | From images
sig: Brightness and contrast | exposure statistics | Obstruction or failure | From images
sig: Network state | bitrate and packet loss | Offline | From network data
noise: Camera name | an identifier
noise: Installer name | irrelevant
noise: Vendor | irrelevant
base: Periodic manual checks of camera views and offline alerts, because they are the standard process.
prod: A health model on image statistics and network data with reason codes, a repair priority by site importance and a work order link.
pipe: Image statistics and network data @ video management system ; Health model @ classifier ; Reason coding @ rules ; Priority by site @ rules ; Work order @ facilities system ; Technician confirmation @ field app ; Retraining @ quarterly
edge: Seasonal light change | exposure shifts | Seasonal baselines
edge: Planned moves | cameras are repositioned on purpose | Change record link
edge: Network congestion | the video bitrate drops during congestion | Network faults separated
off: Fault detection recall ; Reason accuracy ; False tickets
on: Camera uptime ; Time to repair ; Footage gaps found in incidents
gap: Offline pings only ; Scene content analysis ; Reports with no repair plan

== security-incident-report-triage | Security Incident Report Triage | nlp | seconds | foundational | a=0.2 k=6
obj: Classify and route facility security incident reports by type and severity so serious reports reach managers quickly and trends are visible across sites.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Serious incidents notify a manager within 5 minutes ; Names removed from analytics ; Multi-label output ; Monthly audit of classification ; 100K reports per year
sn: Label | Types and severity set by security managers | Officer free-text only | Free text varies in style
sn: Severity | Potential harm | Outcome only | Near misses matter
sn: Privacy | Redacted analytics | Named analytics | Names deter reporting
sig: Incident keywords | words describing theft, assault or damage | Type | From text
sig: Location type | entrance, car park or office | Context | From the form
sig: Severity cues | injury, weapon or threat terms | Severity | From text
sig: Repeat location | repeat incidents at the site | Pattern | Aggregated
noise: Reporter name | personal data
noise: Report length | weak link
noise: Shift label | weak link
base: Managers reading every report in the shift summary, because it is the current process.
prod: A multi-label classifier with a rule layer for serious terms, redaction and trend dashboards by site and type, with sampled human review.
pipe: Report intake @ security system ; Redaction @ pattern and model ; Rule layer for serious terms @ rules ; Classifier @ transformer ; Routing @ workflow ; Trend dashboard @ BI tool ; Sample audit @ monthly
edge: Slang and abbreviations | the classifier misreads text | Lexicon updates
edge: New incident type | the taxonomy lacks it | Other bucket and review
edge: Missing details | the report is short | Abstain and prompt for details
off: Serious incident recall ; Category accuracy ; Redaction recall
on: Time to notify managers ; Trend detection ; Reports reclassified by managers
gap: Outcome-only severity ; Named analytics ; No rule layer for serious cases

== court-scheduling-optimisation | Court Hearing Scheduling Optimisation | tabular,reinforcement-learning | batch | advanced | a=0.5 k=4
obj: Schedule hearings and courtrooms to cut waiting time and adjournments while respecting statutory timelines, judge availability and accessibility needs.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Statutory timelines are hard constraints ; Judges and registrars can override ; Accessibility and interpreter needs honoured ; Weekly schedule for 500 courtrooms
sn: Goal | Hearings that proceed without adjournment | Fully booked rooms | Overbooking causes wasted attendance
sn: Rules | Legal timelines and rights | Learned priorities | The law sets timelines
sn: Fairness | Equal access to hearing dates | Priority for some parties | Equal justice is required
sig: Case type and expected duration | hearing length by type | Planning | From history
sig: Participant needs | interpreters and accessibility | Constraint | From the case file
sig: Statutory deadline | days to the legal limit | Priority | From rules
sig: Adjournment risk | share of similar hearings adjourned | Buffering | From history
noise: Party name | personal data
noise: Lawyer name | irrelevant
noise: Case number | an identifier
base: Registry staff scheduling by availability and rules of thumb, because it is the current approach.
prod: A scheduling optimiser with duration and adjournment models, hard legal constraints, accessibility needs and a registrar review step.
pipe: Case and calendar data @ court system ; Duration and risk model @ gradient boosting ; Constraint model @ legal rules ; Schedule optimiser @ solver ; Registrar review @ scheduling tool ; Notification @ parties ; Outcome review @ quarterly
edge: Urgent application | a priority hearing arrives | Insertion with a re-plan
edge: Judge absence | a calendar slot disappears | Fast reassignments
edge: Interpreter shortage | a language is unavailable | Interpreter-aware scheduling
off: Feasibility of schedules ; Duration error ; Adjournment rate
on: Time to hearing ; Adjournments ; Courtroom utilisation
gap: Overbooking for utilisation ; Learned legal timelines ; Unequal priority

== court-document-classification-redaction | Court Document Classification and Redaction | nlp,computer-vision | batch | foundational | a=1 k=20
obj: Classify filings by type and suggest redactions of personal data required by court rules so clerks process documents faster and releases comply.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Clerks review all redactions before release ; Sealed material is never released ; Recall of required personal data above 99% on test sets ; Original retained ; 3M filings per year
sn: Risk | Missed redactions | Over-redaction | Missed redactions harm people and over-redaction hurts open justice
sn: Authority | The clerk and the rules | The model | Court rules decide what is redacted
sn: Evidence | The rule cited for each redaction | A bare mask | Parties can challenge
sig: Document type | motion, order or exhibit | Routing | From the classifier
sig: Personal data entities | names, IDs and birthdates | Redaction | From NER
sig: Sealed or restricted flags | case and document flags | Block | From case system
sig: Rule match | which redaction rule applies | Rationale | From the rule base
noise: Lawyer name | irrelevant
noise: Filing date alone | weak link
noise: File name | an artefact
base: Clerks reviewing and marking every document by hand, because it is the current process.
prod: A document classifier with suggested redactions and rule citations in a clerk review tool, a block on sealed material and a full log.
pipe: Filing intake @ e-filing ; Classification @ model ; Personal data detection @ NER ; Rule matching @ rule base ; Clerk review @ redaction tool ; Release gate @ case system ; Audit log @ archive
edge: Scans and handwriting | text is hard to read | Manual review flags
edge: Rule change | redaction rules are updated | Versioned rules
edge: Sealed attachment | an exhibit is sealed | Gate on flags
off: Recall of required redactions ; Over-redaction rate ; Classification accuracy
on: Clerk time per filing ; Redaction errors after release ; Filing turnaround
gap: Redaction with no rule cited ; Releasing without a gate ; Automatic release

== legal-aid-eligibility-screening | Legal Aid Eligibility Screening | tabular,llm-agents | seconds | foundational | a=0.2 k=20
obj: Help people check whether they may qualify for legal aid and prepare their documents, with the formal decision made by an officer.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Rules from the legal text with the rule shown ; The assistant never decides ; Result says may qualify ; Officer decides and the applicant can appeal ; 1M screenings per year
sn: Logic | Deterministic rules | A learned predictor | Eligibility is set by law
sn: Role | Explaining and preparing | Deciding | A decision needs an officer and appeal rights
sn: Access | Plain language and many languages | One format | Legal aid serves people with barriers
sig: Income and asset rule match | tests against thresholds | Core | From rules
sig: Case type match | matter types covered | Core | From rules
sig: Missing documents | documents still needed | Next step | From the checklist
sig: Urgency flags | deadlines and risk of harm | Priority | From the user
noise: Applicant name | personal data
noise: Device | irrelevant
noise: Time of day | irrelevant
base: A static eligibility page and phone appointment with intake staff, because it is the current process.
prod: A rules engine with a conversational layer that asks missing questions, lists documents and books officer review, with urgent cases routed to a person.
pipe: User answers @ web or phone assisted ; Rules engine @ legal rules as code ; Missing information check @ rules ; Explanation @ LLM with controlled text ; Urgent case routing @ rules ; Officer review @ case system ; Rule update process @ policy team
edge: Rule change | thresholds change | Versioned rules and tests
edge: Complex family | assets are shared | Route to an officer
edge: Urgent hearing | a deadline is close | Immediate human contact
off: Rule engine accuracy ; Explanation faithfulness ; Urgent routing recall
on: Eligible people reached ; Incomplete applications ; Officer time per case
gap: Learned eligibility ; Decisions by the assistant ; One-language service

== interpreter-assignment-optimisation | Court Interpreter Assignment Optimisation | tabular,reinforcement-learning | batch | foundational | a=0.5 k=3
obj: Assign interpreters to hearings by language, qualification, location and availability so hearings are not delayed and interpreter time is used well.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Qualification rules as hard constraints ; Conflicts of interest checked ; Coordinator approves assignments ; Weekly plan for 3K interpreters
sn: Constraint | Qualification and conflict rules | Preference scoring | Wrong interpreters harm cases
sn: Goal | Hearings covered and travel limited | Fewest interpreters used | Overuse causes burnout
sn: Fallback | Remote interpreting when needed | Adjournment | Delays harm parties
sig: Language and dialect needs | languages and dialects required | Match | From the case file
sig: Interpreter qualifications | certification and specialisms | Constraint | From the register
sig: Availability and travel time | calendar and distance | Feasibility | From the system
sig: Hearing duration estimate | expected length | Planning | From history
noise: Interpreter name | personal data
noise: Party name | personal data
noise: Case number | an identifier
base: Coordinators phoning interpreters from a list, because it is the current process.
prod: An assignment optimiser with qualification and conflict constraints, remote options and a coordinator approval step with shortage forecasts.
pipe: Hearing and language needs @ court system ; Interpreter register @ HR and register ; Constraint model @ rules ; Assignment optimiser @ solver ; Coordinator approval @ scheduling tool ; Notifications @ messaging ; Shortage forecast @ monthly
edge: Rare language | very few interpreters exist | Remote pool and early booking
edge: Last-minute cancellation | the interpreter drops out | Fast backup assignments
edge: Conflict of interest | the interpreter knows a party | Conflict checks before assignment
off: Coverage rate ; Constraint violation rate ; Travel time
on: Hearings delayed for interpreters ; Interpreter utilisation ; Cost per hearing
gap: Ignoring conflicts ; Preference-only scoring ; No backup pool

== court-backlog-forecasting | Court Backlog Forecasting | time-series | batch | foundational | a=1 k=2
obj: Forecast filings, disposals and backlog by court and case type so judicial resources and funding plans reflect expected demand.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Monthly forecast for 24 months ; Scenarios for new rules and resources ; Aggregated case counts only ; Reviewed by court administrators ; 300 courts
sn: Flow | Filings, disposals and age of the backlog | Backlog counts only | The age matters for fairness
sn: Scenario | Capacity and rule change scenarios | A single trend | Policies change flows
sn: Privacy | Aggregated counts | Case-level data | Not needed
sig: Filing counts by type | monthly new cases | Inflow | From the case system
sig: Disposal rate by type | monthly closures | Outflow | From the case system
sig: Judicial capacity | judge and registrar days | Constraint | From planning
sig: Law and procedure changes | new rules and thresholds | Shift | From policy
noise: Judge name | irrelevant
noise: Party name | personal data
noise: Case number | an identifier
base: Last year's filings and disposals scaled by trend, because it is the common planning approach.
prod: A stock and flow forecast by case type with capacity and policy scenarios and an age profile of the backlog for administrators.
pipe: Aggregated counts @ case system ; Cleaning @ batch ; Flow model @ time-series model ; Scenario engine @ simulation ; Age profile @ analytics ; Administrator review @ planning meeting ; Accuracy tracking @ quarterly
edge: Law change | new offences create filings | Policy scenario inputs
edge: Data change | case coding is revised | Versioned mappings
edge: Pandemic or disruption | courts close for several weeks | Event flags
off: Filing forecast error ; Backlog age error ; Scenario usefulness
on: Backlog age ; Time to disposal ; Resource planning accuracy
gap: Backlog counts only ; Single-scenario plans ; Case-level data in planning

== hearing-record-transcription-summary | Hearing Record Transcription and Summary Assistant | nlp,llm-agents | batch | advanced | a=2 k=100
obj: Produce draft transcripts and summaries of recorded hearings for court staff to check, with every summary line linked to the time in the recording.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: The official record remains the certified transcript ; Drafts labelled as machine-generated ; Every summary line links to a timestamp ; Staff verify before use in decisions ; 100K hours per year
sn: Status | A draft aid | The official record | Certified records have legal weight
sn: Evidence | Timestamp links | A free summary | Errors in a summary can mislead
sn: Accuracy | Word error rates by speaker and noise | One headline number | Quality varies by courtroom
sig: ASR confidence | confidence per segment | Reliability | From ASR
sig: Speaker role turns | judge, counsel or witness turns | Navigation | From diarisation by role
sig: Legal term lexicon match | recognition of legal terms | Accuracy | From glossaries
sig: Audio quality | noise and overlap | Reliability | From audio
noise: Party name | personal data
noise: Courtroom name | an identifier
noise: File name | an artefact
base: Human stenographers and recorders producing transcripts, because they produce the official record.
prod: A transcription and summarisation pipeline for draft use with role-labelled turns, timestamp-linked summaries and a review interface for court staff.
pipe: Recording intake @ court recording system ; Speech recognition @ ASR ; Role labelling @ diarisation ; Summary draft @ LLM with timestamps ; Staff review @ review tool ; Distribution as draft @ case system ; Quality sampling @ monthly
edge: Overlapping speech | text is garbled | Confidence flags and playback links
edge: Interpreted testimony | two languages appear | Language-aware segments
edge: Technical terms | the model misreads terms | Court glossaries
off: Word error rate by condition ; Summary faithfulness ; Timestamp accuracy
on: Time to a draft ; Staff correction time ; Errors found in summaries
gap: Treating drafts as official ; Summaries with no timestamps ; One accuracy number

== scam-report-triage | Scam Report Triage | nlp,graph | seconds | foundational | a=0.2 k=6
obj: Cluster and prioritise scam reports from the public by type, amount and links between reports so investigators find campaigns and victims get the right support.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Victim support information given at once ; Campaign clusters shown to investigators ; Names removed from analysis ; Triage within 1 minute ; 1M reports per year
sn: Aim | Support victims and find campaigns | Pursue victims | Victims should get help not blame
sn: Cluster | Shared phone numbers, wallets and templates | Single reports in isolation | Campaigns appear across many reports
sn: Privacy | Minimised personal data | Full copies of messages everywhere | Messages contain private data
sig: Scam type cues | romance, investment or impersonation | Routing | From text
sig: Loss amount and recency | amount and timing | Urgency | From the report
sig: Shared indicators | phone numbers, wallets and domains | Clustering | From extraction
sig: Payment channel | bank, card or crypto | Recovery routing | From the report
noise: Victim name | personal data
noise: Message tone | weak link
noise: Report length | weak link
base: Reports reviewed one by one by analysts, because it is the current process.
prod: A classifier with indicator extraction and graph clustering, a victim support route with bank liaison for recent losses and an investigator view of campaigns.
pipe: Report intake @ reporting portal ; Redaction and extraction @ NLP ; Type classification @ transformer ; Indicator graph @ graph store ; Urgent recovery route @ rules ; Investigator view @ case tool ; Feedback @ monthly
edge: Mixed scams | a report has several types | Multi-label routing
edge: Victim in distress | the report shows harm | Support route and human contact
edge: Duplicate reports | the same case is reported twice | Duplicate linking
off: Type accuracy ; Cluster purity ; Time to bank liaison
on: Funds recovered ; Time to victim support ; Campaigns identified
gap: Reports in isolation ; Victim-blaming outputs ; Full message copies everywhere

== phishing-takedown-prioritisation | Phishing Site Takedown Prioritisation | tabular,nlp | seconds | foundational | a=1 k=5
obj: Rank reported phishing sites and scam domains for takedown by victim reach and brand or government impersonation so scarce takedown effort lands where harm is highest.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Takedown requests reviewed by an analyst ; Evidence pack for each request ; Legitimate sites protected by checks ; Ranking every 5 minutes ; 100K reports per month
sn: Label | Sites confirmed malicious by analysts | Reports alone | Reports include mistakes
sn: Harm | Reach and impersonation of public bodies | Count of sites | Some sites hurt many more people
sn: Safety | Checks to avoid takedown of legitimate sites | Blind blocking | Wrongful takedowns harm businesses
sig: Page similarity to known brands | visual and text similarity | Impersonation | From the vision model
sig: Domain age and registration pattern | age and registration features | Risk | From DNS data
sig: Report volume and spread | number of distinct reporters | Reach | From reports
sig: Hosting provider response | takedown history by host | Effort | From history
noise: Reporter name | personal data
noise: Site owner name | personal data
noise: Report text length | weak link
base: First-come first-served takedown requests, because it is the common queue.
prod: A ranking model with a verification step, an evidence pack builder and tracking of takedown time by hosting provider.
pipe: Report and feed intake @ reporting portal and threat feeds ; Page analysis @ vision and NLP ; Maliciousness model @ gradient boosting ; Harm ranking @ rules ; Analyst verification @ analyst console ; Takedown request @ provider channels ; Outcome tracking @ weekly
edge: Compromised legitimate site | a real business is hacked | Owner notification instead of takedown
edge: Fast-flux domains | sites move quickly | Domain-level actions
edge: New brand | the model has not seen it | Brand library updates
off: Precision at analyst capacity ; Recall of confirmed phishing ; Wrongful flag rate
on: Time to takedown ; Victims reached before takedown ; Wrongful takedowns
gap: Blind blocking ; First-come queues ; Report-only labels

== online-harm-report-triage | Online Harm Report Triage | nlp | seconds | advanced | a=0.3 k=6
obj: Classify reports of online abuse and harassment by type and urgency so people at risk reach a human fast and referral partners get the right cases, with no automatic decisions on content or users.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Possible risk to life goes to a person at once ; Reviewer wellbeing protections for hard content ; No automatic account or content action ; Equal handling across languages ; 300K reports per year
sn: Urgency | Risk of harm to a person | Content volume | Volume does not show danger
sn: Role | Triage and routing | Takedown or sanction decisions | Those need human and legal judgement
sn: Wellbeing | Limits on exposure to graphic content for staff | Unlimited reviewing | Harm to reviewers is real
sig: Threat and self-harm cues | words indicating danger | Escalation | From text
sig: Harm type | harassment, hate, grooming or other | Routing | Classified
sig: Reporter vulnerability flags | minors or at-risk reporters | Priority | From the report form
sig: Evidence completeness | whether links and screenshots are present | Actionability | From the report
noise: Reporter name | personal data
noise: Platform name alone | weak link
noise: Report length | weak link
base: A human reading reports in arrival order, because it is the current process.
prod: A classifier with an urgent-first rule layer, blurring of graphic content, routing to specialist teams and a sample audit for fairness by language.
pipe: Report intake @ portal and helpline ; Redaction and blurring @ pattern and vision ; Urgency gate @ rules and model ; Harm classifier @ transformer ; Specialist routing @ workflow ; Reviewer queue @ case tool ; Audit sample @ weekly
edge: Coded language | threats are hidden | Human sampling and lexicon updates
edge: Multiple languages | one report mixes languages | Multilingual models
edge: Graphic content | reviewers see disturbing material | Blurring and exposure limits
off: Urgent recall ; Routing accuracy ; Error parity by language
on: Time to a human for urgent reports ; Reviewer exposure hours ; Cases referred to the right partner
gap: Automatic sanctions ; Volume as urgency ; Unlimited reviewer exposure

== missing-person-report-routing | Missing Person Report Completeness and Routing | tabular,nlp | seconds | advanced | a=0.2 k=6
obj: Check missing person reports for missing details, link them to related reports and route them to the right team, with every case treated as urgent by a human who decides the response.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Every report goes to a person immediately ; The tool never lowers priority ; Completeness prompts in plain language ; Linking results reviewed by officers ; 100K reports per year
sn: Safety | Human review of every report | Auto-prioritising by predicted risk | Risk scores can wrongly delay a search
sn: Role | Completeness and routing | Risk assessment of the person | Risk assessment is a human judgement
sn: Privacy | Need-to-know access | Wide sharing | Reports contain sensitive details
sig: Missing fields | key details not yet collected | Prompt | From the form
sig: Duplicate and linked reports | the same person reported twice | Linking | From matching
sig: Jurisdiction and location | where the person was last seen | Routing | From GIS
sig: Contact attempts logged | attempts made so far | Case status | From the case system
noise: Person name | personal data
noise: Reporter name | personal data
noise: Report channel | weak link
base: Intake officers using checklists, because it is the standard process.
prod: A completeness and duplicate-linking assistant that prompts for missing details and routes each case to a team, with no ranking of urgency and a full log.
pipe: Report intake @ case system ; Completeness check @ rules ; Duplicate matching @ similarity search ; Jurisdiction routing @ GIS ; Officer review @ case tool ; Follow-up prompts @ reporter channel ; Audit log @ archive
edge: Conflicting details | reports disagree on key facts | Show both and ask an officer
edge: Cross-border case | the person may have moved | Partner agency routing
edge: Sensitive circumstances | the report includes risk information | Handled by specialists
off: Completeness of key fields ; Duplicate matching precision ; Time to routing
on: Time to first action ; Duplicate reports found ; Missing details after intake
gap: Predicted risk scores ; Lowering priority automatically ; Wide access

== victim-support-demand-forecasting | Victim Support Service Demand Forecasting | time-series | batch | foundational | a=1 k=2
obj: Forecast demand for helplines, advocates and shelters from aggregated counts so staffing and partnerships meet need.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Aggregated counts only ; Weekly forecast for 26 weeks ; No individual-level data ; Scenarios for events and policy changes ; 100 service areas
sn: Privacy | Counts with small-cell suppression | Case-level data | Case data endangers survivors
sn: Use | Staffing and funding | Targeting people | The goal is capacity
sn: Context | Calendar, policy and events | History only | Demand shifts with events
sig: Past service contacts | counts by service and week | Anchor | Aggregated
sig: Holidays and major events | calendar | Demand shifts | From calendars
sig: Policy and funding changes | programme changes | Shifts | From policy
sig: Local population changes | population by area | Base rate | From statistics
noise: Client name | personal data
noise: Case number | an identifier
noise: Counsellor name | irrelevant
base: Last year's counts by month scaled by a trend, because it is the usual approach.
prod: A hierarchical forecaster on aggregated counts with scenario inputs and a staffing view, with suppression rules for small cells.
pipe: Aggregated counts @ service providers ; Small-cell suppression @ privacy rules ; Feature build @ calendar and policy joins ; Forecast model @ gradient boosting ; Scenario ranges @ simulation ; Planner view @ BI tool ; Accuracy tracking @ quarterly
edge: Reporting change | providers change definitions | Versioned definitions
edge: Awareness campaign | contacts jump after a campaign | Campaign flags
edge: Service outage | counts drop for operational reasons | Outage flags
off: Forecast error by service area ; Interval coverage ; Peak detection
on: Wait times ; Unanswered contacts ; Staffing accuracy
gap: Case-level modelling ; Using forecasts to target people ; History-only forecasts

== community-safety-feedback-analysis | Community Safety Feedback Analysis | nlp,llm-agents | batch | foundational | a=0.2 k=20
obj: Group and summarise residents' safety concerns from surveys, meetings and reports by theme and area with quotes linked to the source, so priorities reflect community voices.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every theme links to example comments ; Minority views shown ; Names removed ; Officials and community partners review ; 100K comments
sn: Method | Transparent themes with counts and examples | A single summary | A summary can hide minority views
sn: Fairness | Equal weight to each respondent | Weighting by volume | Organised groups can flood channels
sn: Privacy | Redacted comments | Named analysis | Names deter participation
sig: Theme assignment | which theme a comment belongs to | Grouping | From clustering
sig: Area aggregate | counts by area | Priority | Aggregated
sig: Duplicate and campaign detection | near-identical comments | Weighting | From similarity
sig: Sentiment and stance | support, concern or neutral | Position | From the classifier
noise: Respondent name | personal data
noise: Comment length | weak link
noise: Channel alone | weak link
base: Staff reading comments and summarising by hand, because it is the current process.
prod: A clustering and summarisation pipeline with campaign detection, representative quotes and a community review step before publication.
pipe: Comment intake @ surveys and meetings ; Redaction @ pattern and model ; Theme clustering @ embeddings ; Stance classification @ classifier ; Summary draft @ LLM with quotes ; Community review @ partner meeting ; Publication @ community report
edge: Campaign flood | many copies arrive | Campaign flags
edge: Translation | comments arrive in other languages | Multilingual embeddings
edge: Sensitive disclosures | comments reveal harm | Safeguarding routes
off: Theme coherence ; Quote faithfulness ; Stance accuracy
on: Analysis time ; Community trust in summaries ; Minority themes surfaced
gap: Single summaries ; Counting campaign copies as views ; Named analysis

== ai-tool-impact-assessment-register | AI Tool Impact Assessment and Public Register | llm-agents,tabular | seconds | advanced | a=0.1 k=40
obj: Guide teams through a structured impact assessment for each AI tool before use, check it for gaps, and publish a register entry that states purpose, limits, data and oversight.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: No tool goes live without an approved assessment ; Assessments check the purpose, data, bias tests and human oversight ; Register entries are public in plain language ; Reassessment on every material change ; 200 tools
sn: Gate | An approval step tied to deployment | Optional guidance | Optional steps are skipped
sn: Content | Purpose, data, group impacts and oversight | A generic checklist | Risks differ by tool
sn: Transparency | A public plain-language entry | An internal file | Trust needs visibility
sig: Assessment completeness | required sections completed | Gate | From the form
sig: Data sensitivity class | data categories used | Risk tier | From the catalogue
sig: Decision impact on people | whether people are affected directly | Risk tier | From the assessment
sig: Change events | model, data or scope changes | Reassessment | From release records
noise: Author name | irrelevant
noise: Document length | weak link
noise: Template version | an artefact
base: Word templates reviewed by a committee, because it is the common governance process.
prod: A guided assessment tool with completeness and consistency checks, risk tiers that set required controls, a public register generator and automatic reassessment triggers.
pipe: Assessment intake @ governance portal ; Completeness and consistency checks @ rules and LLM ; Risk tier @ rules ; Approval workflow @ governance board ; Register publication @ public site ; Change trigger @ release pipeline ; Annual review @ governance office
edge: Scope creep | a tool is used for a new purpose | Purpose binding and a reassessment gate
edge: Vendor update | a supplier changes the model | Change notices and gate
edge: Vague answers | the assessment is thin | Checks that return it for work
off: Gaps found in audited assessments ; Reassessment trigger recall ; Register accuracy
on: Tools with approved assessments ; Time to approval ; Incidents from unassessed tools
gap: Optional assessments ; Generic checklists ; Internal-only registers

== public-safety-tool-bias-error-audit | Public Safety Tool Bias and Error Audit | tabular | batch | staff-principal | a=0.2 k=8
obj: Audit each deployed tool for error rates, outcome gaps and drift across groups and areas, test with held-out reviews and report results to an oversight board with the power to pause a tool.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Every deployed tool audited at least every 6 months ; Group data used for audit only and never in decisions ; Oversight board can pause a tool ; Results published in summary ; 100 tools
sn: Metric | Error rates and outcomes by group and area | Overall accuracy | Averages hide gaps
sn: Truth | Independent reviews of samples | Outputs checked by the same tool | Circular checks hide errors
sn: Action | Pause, retrain or retire by rule | A report | Audits need consequences
sig: Error rate by group | false positives and negatives | Disparity | From reviewed samples
sig: Outcome rate by group | review or action rates by group | Disparity | From audit data
sig: Input and output drift | changes in data and scores | Drift | From logs
sig: Override and complaint rates | reversals and complaints | Trust | From the case system
noise: Tool name | an identifier
noise: Author name | irrelevant
noise: Report format | an artefact
base: Annual internal reviews of selected tools, because they are the current oversight.
prod: An audit service that draws samples, collects independent reviews, computes agreed metrics and sends threshold breaches to the oversight board with a pause procedure.
pipe: Decision and outcome logs @ tool logs ; Sample draw @ audit sampling ; Independent review @ review panel ; Metric computation @ audit service ; Threshold evaluation @ rules ; Board decision and pause @ governance workflow ; Public summary @ register
edge: Small groups | metrics are noisy | Confidence intervals and pooled periods
edge: Missing group data | groups are not recorded | Approved proxy methods for audit only
edge: Vendor opacity | the supplier will not share logs | Contract clauses and a block on use
off: Detection of seeded disparities ; Sample review agreement ; Time to board action
on: Tools audited ; Disparities found and fixed ; Tools paused
gap: Overall accuracy only ; Self-checking outputs ; Reports with no consequence

== biometric-use-control-gateway | Biometric Use Control Gateway | tabular,llm-agents | sub-100ms | staff-principal | a=0.1 k=10
obj: Enforce the agency policy on biometric tools by blocking face recognition and similar identification in all analytics and agents, logging any attempted use and routing approved exceptions to named legal approvers.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Policy enforced at the gateway outside any model ; Face identification is blocked by default ; Exceptions need a legal approval recorded ; Every attempt logged ; Decision within 50 ms
sn: Enforcement | A gateway with policy as code | Developer guidelines | Guidelines can be ignored
sn: Scope | All analytics, agents and vendor tools | Only internal systems | Vendors can embed identification
sn: Evidence | An immutable record of blocks and exceptions | Annual attestations | Oversight needs logs
sig: Request type | identification, detection or counting | Policy rule | From the request
sig: Data type | face, voice, gait or other biometric | Policy rule | From the catalogue
sig: Approval record | legal approval id | Exception | From the policy store
sig: Calling system and purpose | which system and purpose code | Context | From the request
noise: Developer name | irrelevant
noise: Request wording | not policy
noise: Team size | irrelevant
base: Policy documents and annual compliance reviews, because they are the usual controls.
prod: A policy gateway that classifies requests, blocks identification calls by default, records exceptions with approvals and reports attempts to the oversight board.
pipe: Request interception @ API gateway ; Request classification @ rules and model ; Policy decision @ policy as code ; Block or route to approval @ gateway ; Immutable log @ append-only store ; Anomaly review @ analytics ; Board report @ quarterly
edge: Vendor embedded feature | a tool includes identification | Contract and gateway block
edge: Misclassification | a counting call looks like identification | Appeal path and review
edge: Emergency request | an urgent use is requested | Legal approval path with logging
off: Policy test coverage ; Block rate on seeded identification calls ; Latency at p99
on: Blocked attempts ; Exceptions approved ; Time to approve valid requests
gap: Guidelines only ; Internal-only scope ; No logs of attempts

== bodycam-footage-redaction-assistant | Body-Worn Camera Footage Redaction Assistant | computer-vision,nlp | batch | advanced | a=2 k=100
obj: Suggest blurs for faces, plates, screens and bystander audio in footage prepared for release so staff review redactions faster and releases protect privacy.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Originals never modified ; Staff review all suggested redactions ; Every redaction is logged with its legal reason ; Release gate blocks unreviewed files ; 200K hours per year
sn: Integrity | Original footage preserved with hashes | Edited copies as the source | Courts need originals
sn: Role | Suggest and speed up review | Fully automatic release | Wrongful release can endanger people
sn: Evidence | Reason codes for each redaction | A bare blur | Releases can be challenged
sig: Face and plate detections | detected regions | Redaction | From vision
sig: Screen and document detection | phones and screens in view | Redaction | From vision
sig: Audio speaker segments | bystander speech | Redaction | From audio models
sig: Exemption category | legal basis | Reason | From the rule base
noise: Officer name | irrelevant
noise: Camera serial | an identifier
noise: File name | an artefact
base: Editors blurring frame by frame in video tools, because it is the current process.
prod: A tracking and detection pipeline that proposes blur regions across frames and audio mute segments in a review interface with reasons and a release gate.
pipe: Footage intake @ evidence system ; Hashing @ integrity service ; Detection and tracking @ vision model ; Audio segmentation @ speech model ; Reviewer redaction tool @ review UI ; Release gate @ evidence system ; Audit log @ archive
edge: Fast motion | blurs lose the face | Dense tracking and manual checks
edge: Reflections | faces appear in mirrors and windows | Reflection-aware detection
edge: Long footage | review time is large | Prioritised segments
off: Recall of faces and plates ; Over-blur rate ; Reviewer correction rate
on: Review hours per released hour ; Privacy incidents after release ; Release turnaround
gap: Modifying originals ; Automatic release ; Redactions with no reason code

== records-system-misuse-detection | Records System Misuse Detection | tabular,time-series | batch | advanced | a=1 k=6
obj: Detect unusual access to police and justice databases that may be misuse, such as lookups with no case link, and send leads to professional standards for review.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Leads reviewed by professional standards staff ; No action from a score alone ; Case link and purpose checks first ; Access to this system itself is logged ; 100K staff
sn: Label | Confirmed misuse from investigations | Alert counts | Alerts include normal rare lookups
sn: Rule | Access without a legitimate case link or purpose | Unusual volume alone | Busy staff look up many records
sn: Fairness | Equal scrutiny across roles and units | Targeting some groups | Unequal scrutiny harms trust
sig: Case link present | whether a case or purpose is recorded | Core | From logs
sig: Lookup pattern | lookups of celebrities, relatives or colleagues | Risk | From matching rules
sig: Volume against role peers | queries compared with peers | Anomaly | From logs
sig: Time and location of access | out-of-hours access | Context | From logs
noise: Staff name | personal data in the model
noise: Rank alone | weak link
noise: Unit name alone | weak link
base: Periodic audits of random queries, because it is the standard control.
prod: A rules and model hybrid that flags lookups with no valid purpose and unusual patterns relative to role peers, with a review workflow and fairness monitoring.
pipe: Access log intake @ records systems ; Purpose and case-link check @ rules ; Peer comparison @ anomaly model ; Lead ranking @ rules ; Standards review @ case tool ; Outcome capture @ case system ; Fairness review @ annual
edge: Shift work | access at night is normal | Role and shift features
edge: Cross-unit support | staff work outside their unit | Assignment data
edge: Alert fatigue | too many leads arrive | Priority ranking and tuning
off: Precision at review capacity ; Recall on seeded misuse ; Parity across units
on: Misuse found ; Time to detect ; Leads closed as normal
gap: Action from scores ; Volume-only rules ; Unequal scrutiny

== public-safety-agent-action-guardrails | Public Safety Agent Action Guardrails | llm-agents,tabular | seconds | staff-principal | a=0.3 k=40
obj: Control and audit every action AI agents take in public safety systems such as CAD, records and evidence, enforce approval tiers and give oversight bodies a replayable record.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Policy enforced in a gateway outside the model ; Agents never dispatch units, change priorities, identify people or alter evidence ; Approvals by named roles ; Immutable action log ; Kill switch per agent ; Audit queries over 90 days answered within 5 s
sn: Enforcement | A tool gateway with policy as code | Prompt instructions | Prompts can be bypassed by crafted input
sn: Scope | Least privilege per agent and tool | Shared service accounts | One mistake should not reach critical systems
sn: Evidence | An append-only log with context | A summary report | Oversight bodies and courts need replay
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
