# Public Safety & Security, part 1 (use cases 1-21): emergency calls and dispatch, fire and disaster response, investigations and evidence support, road safety
# Vendor-neutral. No model scores a named individual or identifies a person by face or biometrics, outputs are leads or drafts for a human decision, evidence originals are never altered and every tool use is logged against the case.
== emergency-call-taker-assist | Emergency Call Taker Assist | nlp,llm-agents | sub-100ms | advanced | a=20 k=40
obj: Listen to emergency calls in real time and show call takers a structured list of what has been said and which questions remain, so critical details are captured faster while the call taker decides every action.
con: Prompts appear within 2 s of speech ; The call taker confirms every field ; No automatic dispatch or priority change ; Handles the top 12 languages ; 5K concurrent calls
sn: Role | A prompt list for the call taker | An automatic classifier that sets priority | Emergencies need human judgement and accountability
sn: Label | Fields confirmed by call takers | Transcripts alone | Transcripts contain errors and no outcome
sn: Language | Accents, stress and background noise in test data | Clean studio audio | Real calls are noisy and urgent
sig: Incident type cues | words and phrases indicating fire, injury or crime | Protocol selection | From speech and text
sig: Location mentions | places and landmarks said by the caller | Location prompt | From the transcript
sig: Missing protocol questions | required questions not yet asked | Prompt | From the protocol
sig: Distress and urgency cues | breathing, shouting and keywords | Attention flag | From audio and text
noise: Caller name | personal data
noise: Call length | weak link
noise: Phone model | irrelevant
base: Call takers typing notes while following paper or screen protocols, because it is the current practice.
prod: A streaming transcription and extraction service with a suggested-question panel and field pre-fill that the call taker accepts or edits, with a full log for quality review.
pipe: Call audio stream @ telephony ; Speech recognition @ streaming ASR ; Entity and cue extraction @ NLP model ; Protocol gap check @ rules ; Suggested prompts @ call taker screen ; Call taker confirmation @ CAD ; Quality review @ weekly
edge: Heavy accent | transcription errors appear in key words | Confidence flags and original audio replay
edge: Caller panic | the story is disordered | Short clarifying prompts and no inference beyond the words
edge: ASR outage | the transcript service fails | Instant fallback to manual protocols
off: Entity extraction accuracy on labelled calls ; Latency ; Prompt usefulness in call taker reviews
on: Time to capture the address ; Calls with missing key fields ; Call taker workload
gap: Automatic priority setting ; Clean-audio testing ; Using transcripts as truth

== caller-location-verification | Caller Location Verification | nlp,tabular | seconds | foundational | a=10 k=6
obj: Combine spoken addresses, device location and map data to propose the most likely incident location for the call taker to confirm, and flag conflicts between sources.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Candidate locations within 3 s ; The call taker confirms before dispatch ; Conflicts shown not hidden ; Indoor and rural accuracy reported ; 5M calls per year
sn: Truth | The confirmed dispatch location | The first device fix | Device fixes can be wrong indoors
sn: Output | A ranked list with uncertainty | One pin | A wrong pin delays response
sn: Privacy | Location used for this call only | Retained histories | Location histories reveal movements
sig: Device location accuracy radius | reported fix and accuracy | Candidate | From the carrier
sig: Address text match | match between spoken address and the gazetteer | Candidate | From geocoding
sig: Landmark and road mentions | named landmarks and road names | Disambiguation | From transcripts
sig: Distance between sources | gap between device and spoken locations | Conflict flag | Computed
noise: Caller name | personal data
noise: Carrier name | weak link
noise: Phone model | irrelevant
base: The device location shown on a map and the call taker's verbal check, because it is the standard process.
prod: A fusion ranker over device fixes, geocoded addresses and landmark matches with an uncertainty radius, shown on the call taker's map with conflict warnings.
pipe: Device fix intake @ NG911 location services ; Address geocoding @ gazetteer ; Landmark resolution @ NLP and gazetteer ; Candidate ranking @ learned ranker ; Conflict flagging @ rules ; Call taker confirmation @ CAD map ; Outcome tracking @ monthly
edge: Rural address | the gazetteer is incomplete | Landmark matching and a wider uncertainty circle
edge: High-rise caller | the floor is unknown | A floor prompt and building data
edge: Spoofed location | the device fix is wrong on purpose | Conflict flags and verbal confirmation
off: Rank accuracy against confirmed locations ; Median error in metres ; Conflict flag precision
on: Time to confirm a location ; Responder wrong-address events ; Calls needing a second location check
gap: Single-pin output ; Retaining location histories ; Trusting the first device fix

== ems-demand-forecasting | Emergency Medical Demand Forecasting | time-series | batch | foundational | a=96 k=2
obj: Forecast ambulance demand by area and hour from aggregated call volumes, weather and events so staffing and posting plans match likely demand.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Hourly forecast per zone for 14 days ; Aggregated counts only ; Interval output ; Events and weather as inputs ; 200 zones
sn: Data | Aggregated call counts by zone and hour | Individual patient data | Not needed for staffing
sn: Use | Staffing and posting | A prediction of who will call | The goal is capacity not people
sn: Fairness | Equal coverage across zones | Coverage matching past demand only | Past demand reflects who calls
sig: Same time last week calls | calls in the same hour in past weeks | Anchor | Aligned
sig: Weather and heat alerts | temperature and storm alerts | Demand driver | From weather
sig: Events and holidays | event calendar | Demand driver | From calendars
sig: Population and age mix of the zone | zone-level demographics | Base rate | Aggregated
noise: Dispatcher name | irrelevant
noise: Unit name | an identifier
noise: Call text | not needed for volume
base: Same hour last week demand by zone, because planners use it today.
prod: A hierarchical forecaster with weather and event covariates, intervals and a staffing translator that converts demand to unit-hours with coverage targets.
pipe: Call count extraction @ CAD ; Aggregation @ batch ; Feature build @ weather and calendar joins ; Forecast model @ gradient boosting ; Interval estimate @ quantile heads ; Staffing view @ planning tool ; Accuracy tracking @ weekly
edge: Heatwave | demand moves outside history | Heat features and wider intervals
edge: Mass event | a concert causes spikes | Event features
edge: CAD change | call coding changes | Versioned mappings
off: Weighted quantile loss by zone ; Peak error ; Coverage of intervals
on: Response times ; Unit-hours idle ; Coverage gaps by zone
gap: Individual-level prediction ; Past demand as the coverage target ; Single-value forecasts

== ambulance-posting-optimisation | Ambulance Posting Optimisation | reinforcement-learning,tabular | seconds | advanced | a=30 k=4
obj: Recommend where idle ambulances should wait so expected response times are short across all areas, as advice for the dispatch supervisor.
con: Coverage targets in every zone ; Supervisor approves moves ; Crew rest and shift rules respected ; Re-plan on every status change ; 400 vehicles
sn: Objective | Expected response time with a coverage floor | Average response time | Averages leave some areas poorly covered
sn: Constraint | Crew rules and legal coverage | Pure optimisation | Practical limits matter
sn: Evaluation | Simulation of historical demand | Raw before-and-after | Demand varies by day
sig: Unit status and location | available units and positions | State | From AVL
sig: Demand forecast by zone | expected calls | Need | From forecast
sig: Travel time estimates | road travel times | Cost | From traffic data
sig: Coverage gaps | zones outside the target time | Priority | Computed
noise: Crew name | irrelevant
noise: Vehicle number | an identifier
noise: Station nickname | an artefact
base: Fixed post locations by time of day, because they are the standard deployment.
prod: A dynamic coverage optimiser using forecast demand and live unit positions with a simulation for testing, producing ranked move suggestions with their effect on coverage.
pipe: Unit and call data @ CAD and AVL ; Demand forecast @ time-series model ; Coverage model @ travel time engine ; Move optimiser @ solver ; Supervisor review @ dispatch console ; Crew message @ mobile data terminal ; Simulation review @ monthly
edge: Major incident | many units are committed | Surge mode and mutual aid view
edge: Crew fatigue | crew shifts overrun the legal limit | Rest rules in the model
edge: Road closure | travel times change | Live network updates
off: Coverage in simulation ; Response time at the 90th percentile ; Suggestion acceptance
on: Response time ; Zones below target ; Unit travel distance
gap: Average-time objectives ; Ignoring crew rules ; Raw before-and-after comparisons

== dispatch-unit-recommendation | Dispatch Unit Recommendation | tabular | sub-100ms | advanced | a=50 k=6
obj: Suggest which available units to send to an incident by estimated arrival time, capability and coverage left behind, for the dispatcher to accept or change.
con: Recommendation within 100 ms ; Dispatcher decides every assignment ; Capability and jurisdiction rules enforced ; Reasons shown for each suggestion ; 1K incidents per hour
sn: Goal | Fast arrival with coverage kept | Closest unit always | The closest unit may leave an area uncovered
sn: Rules | Jurisdiction and capability as hard rules | Learned preferences | Wrong crews waste minutes
sn: Control | Dispatcher accept or override | Automatic assignment | Dispatch carries accountability
sig: Estimated travel time | predicted arrival time | Core | From the routing engine
sig: Unit capability | skills and equipment | Constraint | From the register
sig: Coverage impact | effect on zone coverage | Trade-off | From the coverage model
sig: Unit status reliability | how reliable the status is | Risk | From telemetry
noise: Dispatcher name | irrelevant
noise: Crew name | irrelevant
noise: Call text wording | not routing
base: The closest available unit by straight-line distance or the computer's nearest unit list, because it is the CAD default.
prod: A scoring service that combines predicted arrival, capability and coverage impact into ranked suggestions with reasons, logging each acceptance or override.
pipe: Incident and unit state @ CAD ; Arrival time model @ routing engine ; Coverage impact @ coverage model ; Rules filter @ rule engine ; Ranked suggestions @ dispatcher console ; Dispatcher choice logged @ CAD ; Override review @ monthly
edge: Stale unit status | the unit has already moved | Status freshness checks
edge: Multi-agency incident | several agencies are needed | Cross-agency rule sets
edge: Network failure | the service is not reachable | Fallback to the CAD default
off: Arrival time error ; Capability rule compliance ; Agreement with experienced dispatchers
on: Time to assignment ; Dispatcher overrides ; Coverage gaps created
gap: Automatic assignment ; Closest-unit-only logic ; No reasons shown

== multilingual-call-interpretation-assist | Multilingual Call Interpretation Assist | nlp | sub-100ms | advanced | a=20 k=20
obj: Provide live transcription and translation hints for calls in other languages while a human interpreter is connected, so key facts reach the call taker sooner.
con: A qualified interpreter is joined for every call in another language ; Machine translation is shown only as a hint ; Addresses and numbers displayed in the original script ; Latency under 2 s ; 30 languages
sn: Role | A hint for the call taker | A replacement for interpreters | Mistranslation can cost lives
sn: Test | Real emergency speech in each language | Studio audio | Stress and dialect change the error profile
sn: Coverage | A fallback when quality is low | A single language model | Some languages have poor data
sig: Language identification confidence | confidence in the language | Routing | From the classifier
sig: Number and address confidence | confidence in digits and places | Critical | From the ASR
sig: Translation quality estimate | estimated translation quality | Hint reliability | From the quality model
sig: Interpreter availability | connected and waiting interpreters | Process | From the telephony system
noise: Caller name | personal data
noise: Carrier | irrelevant
noise: Call length | weak link
base: A telephone interpreter service connected to the call, because it is the current approach.
prod: A language identification and ASR pipeline that shows source text and a labelled translation hint with confidence, connects the interpreter immediately and logs both.
pipe: Audio stream @ telephony ; Language identification @ classifier ; Speech recognition @ ASR ; Translation hint @ MT model ; Confidence labelling @ rules ; Interpreter connection @ telephony ; Quality review @ monthly
edge: Dialect | the speech recogniser fails on the dialect | Confidence flags and interpreter only
edge: Code switching | the caller changes language | Multi-language detection
edge: Rare language | no model exists | Interpreter-only path
off: Digit and address accuracy ; Translation hint quality ; Language identification accuracy
on: Time to key facts ; Interpreter wait time ; Mistranslation incidents
gap: Replacing interpreters ; Studio-audio testing ; Unlabelled machine translation

== non-emergency-call-diversion | Non-Emergency Call Diversion | nlp | seconds | foundational | a=0.5 k=6
obj: Identify calls that are not emergencies and offer other channels or services, while ensuring that any doubt goes to a call taker.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Any call that might be an emergency stays with a call taker ; Recall of true emergencies above 99.9% ; Diversion only with the caller's agreement ; Equal treatment across languages ; 3M calls per year
sn: Safety | A very high recall of emergencies | Average accuracy | One missed emergency is unacceptable
sn: Choice | The caller can always ask for a person | Forced diversion | Forced diversion harms people who need help
sn: Fairness | Equal diversion rates and errors across languages | Only English tested | Errors fall on some communities
sig: Emergency keyword and cue score | words and tones suggesting danger | Safety gate | From speech and text
sig: Caller request type | information, report or complaint | Route | Classified
sig: Service availability | open alternative services | Option | From directories
sig: Language and confidence | language and transcript confidence | Reliability | From ASR
noise: Caller name | personal data
noise: Time of day | weak link
noise: Phone model | irrelevant
base: A menu asking callers to press a key if it is not an emergency, because it is the usual approach.
prod: A conservative classifier that diverts only high-confidence non-emergencies after consent, with immediate transfer on any doubt and a monitored miss-rate by language.
pipe: Call intake @ telephony ; Speech recognition @ ASR ; Emergency cue gate @ classifier ; Diversion offer @ voice assistant ; Consent check @ rules ; Alternative service handoff @ directory ; Miss-rate review @ weekly
edge: Hidden emergency | the caller understates the danger | Conservative thresholds and a person-first policy
edge: Language gap | the model is weaker in some languages | Disable diversion where error rates are high
edge: ASR error | the key word is misheard | Confidence-based transfer
off: Emergency recall ; Diversion precision ; Error parity by language
on: Non-emergency calls to call takers ; Missed emergencies ; Caller satisfaction
gap: Forced diversion ; Accuracy as the metric ; English-only evaluation

== building-fire-inspection-prioritisation | Building Fire Inspection Prioritisation | tabular | batch | foundational | a=0.2 k=5
obj: Rank buildings for fire safety inspections by likelihood and consequence of fire from building data and past incidents so inspectors visit the highest-risk premises first.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Building-level risk with the drivers ; Inspections by fire officers ; Random visits kept to find model errors ; Fairness audited by area ; 150K buildings
sn: Label | Fires and serious violations found at inspections | Complaints | Complaints depend on who reports
sn: Level | Building and occupancy | Occupant-level scoring | People are not scored
sn: Selection | A mix of ranked and random inspections | Ranked only | Ranked-only data hides model errors
sig: Building age and construction | age, materials and height | Hazard | From the register
sig: Occupancy type | residential, commercial or assembly | Consequence | From permits
sig: Past inspections and violations | findings and time since last visit | Prior | From inspections
sig: Fire protection systems | sprinklers and alarms | Mitigation | From inspections
noise: Owner name | personal data
noise: Neighbourhood name | a proxy
noise: Inspector name | irrelevant
base: Inspection frequency set by occupancy class, because it is the regulatory baseline.
prod: A calibrated risk model with consequence weighting, a reserved random sample and route planning for inspectors, with parity checks by area.
pipe: Building and inspection data @ fire records ; Feature build @ aggregated history ; Fire risk model @ gradient boosting ; Consequence weighting @ rules ; Inspection route plan @ optimiser ; Inspector visit @ field app ; Parity audit @ annual
edge: New building | the building has no inspection history | Occupancy-based priors and a first-visit rule
edge: Data gaps | the register lacks the construction type | Missing flags and wider bands
edge: Feedback loop | visits shape future data | Random inspections
off: Violations found per inspection ; Calibration ; Detection parity across areas
on: Serious violations found ; Fires in inspected buildings ; Time since last inspection of high-risk sites
gap: Scoring occupants ; Ranked-only sampling ; Complaint-based labels

== wildfire-camera-detection | Wildfire Smoke Detection from Cameras | computer-vision | seconds | advanced | a=10 k=500
obj: Detect early smoke plumes in tower camera feeds and alert fire dispatchers with the image evidence so crews arrive while fires are small.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Alert with an image loop within 60 s of first visible smoke ; A person confirms before dispatch ; False alarms under 2 per camera per week ; Works day and night ; 1K cameras
sn: Label | Smoke confirmed by dispatchers and later reports | Cloud and fog images | Weather resembles smoke
sn: Action | A human-verified alert | An automatic dispatch | Wrong dispatches waste scarce crews
sn: Privacy | Landscape cameras with masked private areas | Cameras that view homes | Privacy masks are required
sig: Smoke probability by region | model score on image regions | Core signal | Calibrated
sig: Plume growth over frames | growth and drift of the plume | Confirms smoke | From frame sequences
sig: Weather and fire danger | wind, humidity and fire danger rating | Prior | From weather
sig: Camera health | image quality and obstruction | Reliability | From the camera
noise: Camera name | an identifier
noise: Operator name | irrelevant
noise: Image file name | an artefact
base: Human lookouts, public reports and satellite hot spot alerts, because they are the current methods.
prod: A smoke detection model on camera loops with temporal confirmation, a verification screen for dispatchers and a feedback loop that retrains on confirmed events and false alarms.
pipe: Camera loop capture @ tower cameras ; Privacy masking @ image processing ; Smoke detection @ vision model ; Temporal confirmation @ plume tracker ; Dispatcher verification @ alert console ; Incident creation @ CAD ; Retraining @ monthly
edge: Fog and dust | the model sees false plumes | Weather-aware models and time confirmation
edge: Night fires | smoke is not visible | Infrared channels and light flare detection
edge: Camera outage | coverage is lost | Health alarms and coverage maps
off: Time to detection on known fires ; False alarms per camera-week ; Recall by distance
on: Fire size at first attack ; Detection time ; Dispatcher false alarm workload
gap: Automatic dispatch ; Weather confusion ignored ; No privacy masks

== evacuation-route-planning | Evacuation Route Planning | graph,reinforcement-learning | seconds | advanced | a=5 k=4
obj: Compute evacuation routes and staging that account for road capacity, hazards and vulnerable populations, so planners and commanders test and choose plans.
con: Plans consider residents with mobility needs from consented registers ; Commanders approve every instruction ; Simulations compare plans in minutes ; Road closures update the model live ; 500K residents
sn: Constraint | Road capacity and contraflow limits | Free-flow speed | Evacuation traffic exceeds normal capacity
sn: Equity | Plans covering people without cars | Car-owner assumptions | Some residents cannot self-evacuate
sn: Role | Planning and decision support | Autonomous instructions | Public instructions need command authority
sig: Road capacity and closures | live capacity of roads | Constraint | From traffic data
sig: Hazard spread forecast | predicted fire or flood extent | Timing | From hazard models
sig: Population by area and mode | residents and transport availability | Demand | From census and registers
sig: Shelter and staging capacity | places available | Constraint | From operations
noise: Planner name | irrelevant
noise: Exercise label | an artefact
noise: Map style | an artefact
base: Pre-planned zone evacuation maps and orders, because they are the standard preparation.
prod: A traffic simulation with an optimiser for route and timing plans, vulnerable resident coverage and a command view for approval and live replan.
pipe: Network and hazard data @ GIS and hazard models ; Population and need model @ aggregated registers ; Evacuation simulation @ traffic model ; Plan optimiser @ solver ; Commander review @ incident command tool ; Alert wording @ approved templates ; Exercise review @ annual
edge: Blocked road | a planned route is cut by a hazard | Live replanning
edge: Hazard faster than forecast | the timeline shrinks | Scenario ranges and shelter-in-place options
edge: Missing data | the register is out of date | Register freshness checks
off: Clearance time in simulation ; Coverage of vulnerable residents ; Replan time
on: Evacuation clearance time ; Residents without transport assisted ; Exercise findings
gap: Free-flow assumptions ; Car-owner assumptions ; Automatic public instructions

== disaster-damage-satellite-assessment | Disaster Damage Assessment from Satellite Imagery | computer-vision | batch | advanced | a=10 k=500
obj: Map damaged buildings, roads and flooding from satellite and aerial images after disasters so responders prioritise rescue and supplies.
con: Damage maps within 12 hours of imagery ; Hazards flagged for immediate human review ; Field teams verify ; Building-level results with uncertainty ; 1M buildings per event
sn: Truth | Field-verified damage | Image tags | Roofs can look fine when buildings are unsafe
sn: Priority | Hazard and people at risk first | Damage counts | Counts do not rank urgency
sn: Fairness | Equal coverage across neighbourhoods | Imagery where it is available only | Poor coverage hides needs
sig: Damage class scores | model scores per building | Core signal | Calibrated
sig: Flood extent | water detected in images | Hazard | From radar and optical
sig: Access and road status | blocked roads | Logistics | From imagery
sig: Population exposure | residents in the area | Priority | Aggregated
noise: Image vendor | irrelevant
noise: Tile name | an identifier
noise: Analyst name | irrelevant
base: Ground surveys and aerial reconnaissance reports, because they are the current methods.
prod: A damage classification pipeline for buildings and roads with calibrated scores, a priority map weighted by exposure and a verification process with field teams.
pipe: Imagery intake @ satellite and aircraft providers ; Co-registration @ imagery processing ; Damage detection @ vision model ; Priority weighting @ rules ; Field verification @ rapid assessment teams ; Map publication @ incident command ; Accuracy review @ after action
edge: Cloud cover | the area cannot be seen | Radar and aircraft fallbacks
edge: Debris confusion | rubble looks like intact buildings | Multi-angle images and field samples
edge: Coverage gaps | some areas have no imagery | Explicit coverage maps
off: Damage class accuracy ; Recall of severe damage ; Coverage parity
on: Time to a damage map ; Rescue tasks prioritised ; Resources sent to the right areas
gap: Counts as priority ; Image tags as truth ; Hidden coverage gaps

== emergency-alert-geo-targeting | Emergency Alert Geo-Targeting | tabular,graph | seconds | foundational | a=0.5 k=4
obj: Help alert authors draw alert areas that cover the hazard and people at risk without over-alerting, using hazard forecasts and population data.
con: The authorised officer approves every alert ; Areas shown with the share of people covered and over-alerted ; Alert text from approved templates ; Languages and accessible formats supported ; 100 alerts per year
sn: Goal | Cover people at risk with minimal over-alerting | The largest area | Over-alerting causes alert fatigue
sn: Control | An authorised officer sends | An automatic alert | Alerts carry legal and safety weight
sn: Access | Multiple languages and formats | Text only | Many residents need other formats
sig: Hazard extent forecast | forecast footprint with uncertainty | Area | From hazard models
sig: Population by cell | residents per area | Coverage | Aggregated
sig: Cell tower coverage | service areas of towers | Delivery | From operators
sig: Vulnerable community channels | languages and accessible channels | Reach | From registers
noise: Officer name | irrelevant
noise: Alert id | an identifier
noise: Map colour | an artefact
base: Alert areas drawn by hand on a map, because it is the usual process.
prod: A planning tool that proposes polygons from the hazard forecast with coverage and over-alert estimates, then routes the officer's approved alert through every channel and language.
pipe: Hazard forecast intake @ hazard models ; Polygon proposal @ geospatial model ; Coverage estimate @ population data ; Officer approval @ alerting system ; Template and translation @ approved library ; Channel dispatch @ alert gateway ; Post-alert review @ after action
edge: Moving hazard | the extent changes | Update prompts and revised alerts
edge: Cell tower gaps | some areas are not reached | Other channels
edge: Language gap | an alert is missing a language | Template library coverage checks
off: Coverage of true at-risk areas ; Over-alert rate ; Time to build an alert
on: Alert area precision ; Time to send ; Complaints about missed alerts
gap: Largest-area alerts ; Automatic sending ; Text-only alerts

== incident-situation-report-agent | Incident Situation Report Agent | llm-agents,nlp | seconds | advanced | a=0.1 k=60
obj: Compile situation reports for incident commanders from radio logs, dispatch events, field reports and maps, with every statement linked to its source and the time.
con: Every statement cites a source and time ; The agent cannot send orders or alerts ; Commanders approve before sharing outside ; Report refresh every 10 minutes ; 50 concurrent incidents
sn: Source | Time-stamped logs and reports | Model inference | Commanders need facts not guesses
sn: Role | Compilation and summary | Decision making | Commanders decide
sn: Freshness | Age shown for every item | A single snapshot | Situations change quickly
sig: Event timeline | ordered events with times | Spine | From CAD
sig: Resource status | units and assets by status | Context | From CAD
sig: Hazard and map layers | hazard extent and closures | Context | From GIS
sig: Report conflict flags | disagreements between sources | Caution | From checks
noise: Author name | irrelevant
noise: Report length | weak link
noise: Formatting | an artefact
base: A human scribe compiling a situation report from radio and phone updates, because it is the current practice.
prod: A retrieval and summarisation agent that builds a time-stamped sitrep with citations and conflict flags and offers it for the commander to edit and approve.
pipe: Event and report intake @ CAD and field apps ; Entity and time extraction @ NLP ; Conflict check @ rules ; Draft sitrep @ LLM with citations ; Commander review @ incident tool ; Distribution @ approved channels ; After-action review @ post-incident
edge: Conflicting reports | two sources disagree | Show both with times
edge: Radio outage | field updates stop arriving | Staleness flags
edge: Sensitive information | the report contains victim details | Redaction before distribution
off: Statement faithfulness to sources ; Omission of critical events ; Conflict detection
on: Time to produce a sitrep ; Commander corrections ; Briefing accuracy
gap: Uncited statements ; Agent-issued orders ; Single snapshots

== investigator-case-file-assistant | Investigator Case File Search and Summary Assistant | llm-agents,nlp | seconds | advanced | a=0.1 k=60
obj: Let investigators search and summarise large case files, reports and statements with links to the original text, without ranking suspects or suggesting guilt.
con: Every summary line links to the source passage ; No suspect ranking or guilt language ; Access follows case permissions and is logged ; Investigator verifies before use ; Search over 5M pages within 5 s
sn: Role | Search and summary | Judgement of suspects | Prejudging people harms justice
sn: Evidence | Links to the exact passage | A free summary | Errors in a case file can mislead a case
sn: Privacy | Need-to-know access with logs | Wide access | Case files hold sensitive data about many people
sig: Document type and date | statement, report or lab result | Filter | From the records system
sig: Entity mentions | people, places and objects named | Navigation | From NER
sig: Timeline events | events with dates | Orientation | From extraction
sig: Contradiction flags | passages that disagree | Review aid | From checks
noise: Officer name | irrelevant
noise: Page count | weak link
noise: File name | an artefact
base: Keyword search over scanned PDFs and manual indexing, because it is the current approach.
prod: A retrieval and summarisation assistant with a timeline and entity view, contradiction flags shown neutrally and a full access log, with disclosure support for the defence process.
pipe: Document ingestion @ records and evidence systems ; OCR and parsing @ document model ; Entity and timeline extraction @ NLP ; Index @ vector and keyword ; Answer with links @ LLM with citations ; Access logging @ audit store ; Disclosure export @ case workflow
edge: Poor scan | OCR errors hide key text | Quality flags and original viewing
edge: Missing documents | the case file is incomplete | State the gaps
edge: Leading questions | the user phrases a biased question | Neutral phrasing guidance and logging
off: Retrieval accuracy on judged queries ; Faithfulness of summaries ; Entity extraction accuracy
on: Time to review a case file ; Missed documents ; Disclosure errors
gap: Suspect ranking ; Summaries without links ; Wide access to case files

== evidence-document-ocr-deduplication | Evidence Document OCR and Deduplication | computer-vision,nlp | batch | foundational | a=1 k=20
obj: Convert scanned evidence into searchable text, remove exact and near duplicates and keep the chain of custody, so reviewers see each item once.
con: Originals are never modified ; Every derived file links to its original with a hash ; Duplicates grouped not deleted ; Reviewer can see every duplicate ; 10M pages per year
sn: Integrity | Hashes and logs of every transformation | A cleaned copy only | Courts need the chain of custody
sn: Dedup | Group near duplicates with the evidence link | Delete duplicates | Deleting evidence is not permitted
sn: Quality | OCR confidence shown | Text without confidence | Wrong text can mislead review
sig: Content hash and similarity | hashes and text similarity | Duplicate grouping | From pipelines
sig: OCR confidence | confidence per page and region | Reliability | From OCR
sig: Document metadata | source and date | Context | From intake
sig: Handwriting detection | whether text is handwritten | Method | From the model
noise: Examiner name | irrelevant
noise: File name | an artefact
noise: Scan device | an artefact
base: Manual review of every scanned page, because it is the current practice.
prod: An OCR and similarity pipeline that keeps originals and hashes, groups near duplicates for reviewers and shows page-level confidence with originals one click away.
pipe: Scan intake @ evidence system ; Hashing @ integrity service ; OCR @ document model ; Near-duplicate grouping @ similarity search ; Reviewer view @ review tool ; Chain of custody log @ audit store ; Quality sampling @ monthly
edge: Handwritten notes | OCR is unreliable | Flags and manual review
edge: Redacted copies | near duplicates differ on purpose | Redaction-aware grouping
edge: Large batch | scan volumes spike after a raid | Queue management
off: OCR accuracy by document type ; Duplicate grouping precision ; Hash integrity checks
on: Review hours per case ; Duplicates reviewed twice ; Integrity incidents
gap: Deleting duplicates ; Modifying originals ; OCR without confidence

== audio-video-evidence-transcription-search | Audio and Video Evidence Transcription and Search | nlp,computer-vision | batch | advanced | a=2 k=100
obj: Transcribe recorded interviews and bodycam audio and make them searchable by time and phrase, with speaker turns marked, so reviewers find relevant moments without watching everything.
con: Originals unchanged with hashes ; Transcripts labelled as machine-generated ; Reviewer verifies any passage used in a case ; No voice identification of individuals ; 50K hours per year
sn: Integrity | Original recordings and hashes preserved | Edited clips as the source | Courts need originals
sn: Labels | Speaker turns without identity | Voice identification | Biometric identification is out of scope
sn: Accuracy | Word error rates reported by condition | One headline number | Accuracy varies with noise and accent
sig: ASR confidence | confidence per segment | Reliability | From ASR
sig: Speaker turn boundaries | change of speaker | Navigation | From diarisation
sig: Keyword and phrase match | query hits with time | Search | From the index
sig: Audio quality | noise and clipping | Reliability | From signal analysis
noise: Officer name | irrelevant
noise: File name | an artefact
noise: Device model | an artefact
base: Staff listening to recordings and typing transcripts, because it is the current method.
prod: A transcription and diarisation pipeline with a searchable index, confidence and original audio linked to each line, and strict labelling as machine output.
pipe: Recording intake @ evidence system ; Hashing @ integrity service ; Speech recognition @ ASR ; Speaker turn marking @ diarisation ; Search index @ keyword and vector ; Reviewer playback @ review tool ; Audit log @ evidence store
edge: Overlapping speech | overlapping words are lost | Confidence flags and manual review
edge: Poor audio | the error rate rises | Quality warnings
edge: Language mix | speakers switch languages | Multi-language models
off: Word error rate by condition ; Search recall ; Timestamp accuracy
on: Review time per hour of audio ; Missed relevant moments ; Transcript corrections
gap: Voice identification ; Single accuracy figures ; Treating machine transcripts as evidence

== patrol-workload-allocation | Patrol Workload Allocation from Calls for Service | time-series,tabular | batch | advanced | a=96 k=3
obj: Allocate patrol hours across areas and shifts to match calls-for-service workload and response time targets, using aggregated demand and never scoring individuals or places for crime propensity.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Workload from calls for service not from arrests ; No individual or place-level crime prediction ; Supervisors and community boards review plans ; Equity audit of presence and stops ; 150 beats
sn: Data | Calls for service by area and hour | Arrest or stop counts | Enforcement data reflects where officers were sent
sn: Goal | Response time and community requests | Predicted crime hot spots | Hot spot prediction creates feedback loops
sn: Oversight | Community review and equity audits | Internal use only | Public safety needs legitimacy
sig: Calls for service workload | counts by beat and hour | Workload | From CAD
sig: Call handling time | time per call by type | Workload | From CAD
sig: Response time gap to target | gap to the target | Priority | Computed
sig: Events and holidays | calendar | Demand shift | From calendars
noise: Officer name | irrelevant
noise: Offender data | prohibited
noise: Arrest counts | an enforcement artefact
base: Fixed beat staffing by shift, because it is the traditional allocation.
prod: A workload forecast and allocation optimiser that sets patrol hours to meet response targets, with an equity review and a community-facing summary.
pipe: Calls and handling times @ CAD ; Workload forecast @ time-series model ; Allocation optimiser @ solver ; Equity checks @ rules ; Supervisor and board review @ governance meeting ; Roster update @ scheduling ; Outcome review @ quarterly
edge: Reporting bias | some areas report less | Reporting rate checks
edge: Event surge | demand rises on weekends | Event features
edge: Policy change | call types are re-coded | Versioned mappings
off: Workload forecast error ; Response time target attainment ; Equity metric by area
on: Response times ; Beats below target ; Community complaints about presence
gap: Crime prediction ; Arrest counts as demand ; No community review

== recovered-property-matching | Recovered Property Matching | tabular,computer-vision | batch | foundational | a=0.2 k=10
obj: Match found and recovered items with stolen property reports using descriptions, serial numbers and photos so owners get their property back sooner.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Matches proposed to a property officer ; Return only after owner verification ; Serial numbers matched exactly where present ; Photos used only for item matching ; 300K items
sn: Evidence | Serial numbers and distinctive marks | Text descriptions alone | Descriptions are vague
sn: Action | A match for an officer to verify | An automatic release | Wrong releases cause harm
sn: Privacy | Item data only | Owner profiles | Not needed for matching
sig: Serial number match | exact or near match | Strong evidence | From records
sig: Image similarity | similarity of item photos | Support | From the vision model
sig: Description similarity | text similarity | Support | From NLP
sig: Time and place proximity | where and when reported and found | Context | From records
noise: Owner name | personal data
noise: Reporter name | personal data
noise: Report channel | weak link
base: Manual comparison of found property logs with theft reports, because it is the current process.
prod: A matching service with exact serial match, image and text similarity ranking and an officer verification step before any return.
pipe: Report and found item intake @ property systems ; Normalisation @ text and image processing ; Matching @ similarity ranker ; Candidate list @ property officer tool ; Owner verification @ workflow ; Return and logging @ records ; Outcome tracking @ monthly
edge: Common items | many phones look the same | Serial and mark requirements
edge: Poor photos | images cannot be compared | Quality flags
edge: Duplicate reports | the same theft is filed twice | Duplicate linking
off: Rank accuracy on confirmed matches ; Precision at the officer review size ; Time to match
on: Items returned ; Days to return ; Wrong releases
gap: Automatic release ; Description-only matching ; Owner profiling

== tip-line-triage | Public Tip Line Triage | nlp | seconds | foundational | a=0.3 k=6
obj: Classify and route tips and reports from the public by topic and urgency so urgent safety information reaches a person immediately and the rest is queued sensibly.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Possible imminent danger goes to a person at once ; Recall of urgent tips above 99% ; Anonymity of tipsters preserved ; No scoring of named people ; 500K tips per year
sn: Urgency | Potential imminent harm | Topic only | An urgent tip can be on any topic
sn: Privacy | Tipster anonymity protected | Identifiable logs | Tipsters will stop reporting
sn: Action | Route to the right unit | A verdict about a person | A tip is an unverified claim
sig: Urgency cue score | threats, locations and timing words | Escalation | From text
sig: Topic class | fraud, drugs, safety or other | Routing | Classified
sig: Specificity | names, places and times given | Actionability | From extraction
sig: Duplicate or related tip | similar earlier tips | Linking | From similarity
noise: Tipster name | personal data
noise: Channel | weak link
noise: Message length | weak link
base: A human reading every tip in order of arrival, because it is the current practice.
prod: A classifier with an urgent-first rule layer, anonymised text storage, topic routing and duplicate linking, with sampled human review of all classes.
pipe: Tip intake @ web, app and phone ; Identity removal @ redaction ; Urgency gate @ rules and model ; Topic routing @ classifier ; Duplicate linking @ similarity ; Unit queue @ case system ; Review sample @ weekly
edge: Coded language | threats are not obvious | Human sampling and lexicon updates
edge: Malicious tip | a tip targets an innocent person | Verification before action
edge: Language variety | slang confuses the model | Multilingual and dialect testing
off: Urgent recall ; Routing accuracy ; Duplicate linking precision
on: Time to urgent tip action ; Unrouted tips ; Tipster trust measures
gap: Scoring named people ; Identifiable logs ; Topic-only routing

== forensic-lab-backlog-prioritisation | Forensic Lab Backlog Prioritisation | tabular,reinforcement-learning | batch | advanced | a=0.3 k=4
obj: Plan the order of forensic analysis requests by statutory deadlines, case seriousness and lab capacity to cut turnaround for urgent cases, with analysts and prosecutors able to override.
con: Statutory and court deadlines as rules ; No ranking by suspect characteristics ; Analysts and prosecutors can reprioritise ; Capacity by discipline ; 60K requests per year
sn: Goal | Deadlines met and the most serious cases prioritised | Fastest throughput | Throughput can leave urgent cases waiting
sn: Rules | Legal deadlines are fixed | Model predictions of urgency | The law sets deadlines
sn: Fairness | Equal treatment of equal cases | Priority for some neighbourhoods | Unequal priority harms justice
sig: Days to court or statutory deadline | time remaining | Priority | From case systems
sig: Case seriousness class | offence class | Priority | From case systems
sig: Analysis effort estimate | estimated hours by test | Planning | From history
sig: Capacity by discipline | analyst hours available | Constraint | From the lab system
noise: Suspect name | personal data
noise: Neighbourhood | a proxy
noise: Submitting officer | irrelevant
base: First-come first-served queues with manual escalation, because it is the typical process.
prod: A scheduler with deadline and seriousness rules, effort estimates and capacity limits that proposes a queue for the lab manager and tracks equal treatment.
pipe: Request intake @ lab system ; Effort model @ gradient boosting ; Rule and deadline engine @ rules ; Scheduler @ constraint solver ; Lab manager review @ planning board ; Queue update @ lab system ; Turnaround review @ monthly
edge: Late urgent request | a case jumps the queue | Priority insertion with reasons
edge: Equipment outage | lab capacity drops after a breakdown | Re-plan and notify requesters
edge: Estimate error | effort is underestimated | Updated estimates and buffers
off: Deadline attainment ; Effort estimate error ; Turnaround by case class
on: Cases past deadline ; Turnaround time ; Backlog size
gap: Fastest-throughput objectives ; Ranking by neighbourhood ; Model-set legal deadlines

== crash-hotspot-network-screening | Crash Hotspot Network Screening | tabular | batch | foundational | a=0.2 k=5
obj: Rank road segments and junctions for safety treatment by expected crash frequency and severity beyond what is normal for similar sites, so engineers fix the sites with the greatest safety potential.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Empirical Bayes adjustment for random variation ; Severity-weighted ranking ; Engineers review each site ; Annual run for 200K sites
sn: Method | Expected crashes adjusted for similar sites | Raw crash counts | Raw counts chase random spikes
sn: Severity | Weighted by injury severity | Counts of all crashes | A fatal crash outweighs many minor ones
sn: Action | A treatment list with cost-effectiveness | A hot spot map | Engineers need ranked treatments
sig: Crash history by severity | observed crashes over years | Anchor | From crash records
sig: Traffic exposure | vehicle and pedestrian volumes | Exposure | From counts
sig: Road geometry and speed | curvature, lanes and speed limit | Expected risk | From road data
sig: Site type | junction type, rural or urban | Reference group | From the register
noise: Reporting officer | irrelevant
noise: Driver demographic details | not a site property
noise: Crash number | an identifier
base: Sites with the highest crash counts over three years, because it is the simple screening rule.
prod: A safety performance model with empirical Bayes ranking, severity weights and treatment cost-effectiveness views, reviewed by road safety engineers.
pipe: Crash and exposure data @ road safety records ; Reference group setup @ GIS ; Safety performance model @ negative binomial regression ; Empirical Bayes ranking @ statistics ; Treatment matching @ rules ; Engineer review @ road safety team ; Outcome evaluation @ before after studies
edge: Underreporting | minor crashes are missed | Severity-focused ranking
edge: Changes at a site | the layout changed recently | Change dates and trimming of history
edge: Sparse data | rural sites have few crashes | Pooling and priors
off: Stability of ranking across years ; Calibration of expected crashes ; Treatment effect in follow-up
on: Killed and seriously injured counts ; Cost per crash avoided ; Sites treated at the highest potential
gap: Raw crash counts ; Ignoring exposure ; Mapping without actions
