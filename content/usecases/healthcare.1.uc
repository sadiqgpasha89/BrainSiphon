# Healthcare & Life Sciences, part 1 (use cases 1-25)
== sepsis-early-warning | Sepsis Early-Warning System | time-series,tabular | sub-100ms | staff-principal | a=24 k=3
obj: Alert clinicians hours before sepsis onset from streaming vitals and labs, with alert burden low enough that nurses keep trusting it.
loss: \mathcal{L}=\sum_t w_t\,\mathrm{BCE}(y_t,p_t)\quad w_t\ \text{emphasises the 6h pre-onset window}
con: Alert fatigue budget under 1 alert per 10 patient-days ; Works on EHR data with irregular sampling ; Clinical explainability ; FDA SaMD change control
sn: Label | Onset defined by Sepsis-3 criteria with clinician-adjudicated times | Billing-code sepsis labels | Billing codes lag and misplace onset by hours
sn: Metric | Lead time at fixed alert burden | AUROC over all hours | Late alerts carry no clinical value yet inflate AUROC
sig: Lactate and trend | latest lactate and 6h slope | Hypoperfusion marker | Use result time not draw time
sig: Missingness pattern | counts of vitals measured in last 4h | Clinicians measure more when worried | Treat as signal only if the process is stable across sites
sig: SIRS and qSOFA drift | change in composite score over 3h | Deterioration trajectory | Compute from charted times
noise: Admission diagnosis text | encodes clinician suspicion that already knows the label
noise: Antibiotic orders | order placed after suspicion leaks the label
base: Modified early warning score with fixed thresholds.
prod: Gradient-boosted model on irregularly sampled features with a GRU-D sequence branch, per-unit thresholds calibrated for alert burden.
pipe: HL7 FHIR stream @ integration engine ; Feature aggregator @ Flink windows ; Sepsis scorer @ GRU-D plus GBDT ; Alert policy @ per-unit thresholds ; Clinician alert @ EHR in-basket ; Review and feedback @ clinician response ; Outcome labels @ adjudicated cases
edge: New lab analyser changes units | lactate values shift tenfold for some wards | Unit-normalisation layer with range checks at ingest
edge: Alert fatigue after threshold change | clinicians start ignoring alerts | Burden dashboard and caps per shift with staged threshold changes
off: Lead time at 0.5 alerts per 100 patient-days ; Positive predictive value at fixed sensitivity
on: Time to antibiotics after alert ; Sepsis mortality and alert override rate
gap: Labels set after the intervention are partly caused by it ; Retrospective validation on a single hospital

== icu-deterioration-prediction | ICU & Ward Deterioration Prediction | time-series | sub-100ms | production-grade | a=12 k=3
obj: Predict cardiac arrest, ICU transfer or death within 12 hours for ward patients so rapid-response teams can intervene early.
loss: \mathcal{L}=\mathrm{FL}(p_t,y_t)+\lambda\,\mathrm{Calibration}
con: Hourly refresh ; Interpretable risk drivers ; Low false-alarm load ; Bedside latency under 1 s
sn: Horizon | Calibrated risk at multiple horizons (4h, 12h, 24h) | Single binary event within admission | Clinicians need timing to decide on action
sn: Context | Care-goal and DNR status aware outcomes | Death anywhere counted equally | Expected deaths under palliative care are not deterioration to prevent
sig: Vital-sign trend z-scores | deviation of HR, RR, SpO2 from patient baseline | Early instability | Baseline excludes the prediction window
sig: Oxygen support escalation | change in FiO2 or device level | Respiratory decline | Charted times
sig: Nurse concern flag | structured concern assessment | Human gestalt | Present only if recorded before event
noise: Total length of stay so far | proxies for severity but biases late
noise: Bed number | location artefact
base: NEWS2 score thresholds.
prod: Transformer over irregular multivariate time series with time-embeddings, calibrated across horizons and units.
pipe: Bedside monitor feed @ HL7 ; Feature windowing @ stream processor ; Deterioration model @ temporal transformer ; Calibration layer @ per-unit isotonic ; Rapid-response alerts @ paging ; Clinician review @ care team ; Outcome registry @ labels
edge: Sensor disconnects during bathing | vital gaps look like stability | Missingness-aware model and sensor-status feature
edge: Care-limit order changes | model flags patients on comfort care | Care-goal feature and suppression rules
off: AUROC and AUPRC by horizon ; Calibration slope by unit
on: Unplanned ICU transfers ; Cardiac arrests on wards
gap: Retrospective labels include interventions caused by model-driven alerts ; Leakage via future-charted vitals

== readmission-risk-prediction | 30-Day Readmission Risk Prediction | tabular,nlp | batch | foundational | a=0.05 k=40
obj: Identify discharges at highest risk of 30-day readmission and match them to transitional-care interventions within capacity.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GroupCalibration}
con: Fairness across demographics ; Daily scoring at discharge ; Explainable factors for care managers ; Intervention capacity limits
sn: Actionability | Modifiable risk factors (follow-up booking, med reconciliation) | Fixed demographics driving risk | Care teams cannot change age or prior history
sn: Targeting | Risk and expected benefit of the intervention | Highest-risk patients only | Some high-risk patients will not benefit
sig: Prior-year admissions | count of admissions in prior 12 months | Strongest predictor | Exclude the index stay
sig: Discharge summary risk phrases | NLP-extracted unresolved issues | Context in notes | Only notes signed before discharge
sig: Follow-up appointment scheduled | appointment within 7 days booked | Modifiable factor | Booked before discharge time
noise: Insurance plan code alone | proxy for socioeconomic status with fairness risk
noise: Discharge weekday | operational artefact
base: LACE index.
prod: Gradient-boosted model with note-derived features, post-hoc calibration, plus an uplift layer for intervention assignment.
pipe: EHR extract @ nightly FHIR ; Feature builder @ Spark ; Note extractor @ clinical NLP ; Readmission model @ LightGBM ; Care-manager worklist @ prioritiser ; Intervention team @ human outreach ; Readmission outcomes @ claims
edge: Planned readmissions counted as failures | model learns wrong risk | Exclude planned readmissions per CMS logic
edge: Patients readmitted elsewhere | missing outcomes | Health-information-exchange linkage for outcomes
off: AUROC and calibration ; Net benefit at capacity
on: 30-day readmission rate in treated vs control ; Care-manager time per avoided readmission
gap: Labels hide admissions at other hospitals ; Using discharge-day features recorded after the decision

== chest-xray-triage-vision | Chest X-Ray Triage | computer-vision | seconds | staff-principal | a=0.05 k=8000
obj: Prioritise radiology worklists by flagging critical findings (pneumothorax, large effusion) on chest radiographs within seconds of acquisition.
loss: \mathcal{L}=\sum_k w_k\,\mathrm{BCE}(y_k,p_k)+\lambda\,\mathrm{Calibration}
con: Regulatory clearance as SaMD ; Sensitivity above 95% for critical classes ; DICOM-native integration ; Multi-vendor scanners
sn: Prevalence | Calibrate and report for deployment prevalence | Balanced test sets | Balanced sets overstate positive predictive value
sn: Shortcuts | Detect confounders such as tubes, markers and portable machines | Overall AUC | Models learn hospital-specific markers not pathology
sig: Finding probability per class | multi-label probabilities | Triage priority | Calibrated per site
sig: Image quality score | positioning and exposure adequacy | Reliability | Apply before inference
sig: Prior comparison change | difference from prior study | Acute vs chronic | Prior must be before exam
noise: Patient age in pixels metadata | shortcut feature
noise: Scanner manufacturer | domain artefact
base: Radiologist first-in-first-out reading.
prod: DenseNet/ViT multi-label model fine-tuned across multi-site data with test-time calibration, DICOM routing and worklist re-prioritisation.
pipe: DICOM receiver @ PACS gateway ; Quality gate @ view check ; Findings model @ ViT on GPU ; Calibration and thresholds @ per-site ; Worklist prioritiser @ RIS integration ; Radiologist reading @ human ; Discrepancy feedback @ final reports
edge: New scanner vendor | image statistics shift and sensitivity drops | Site onboarding validation and domain-adaptive calibration
edge: Portable bedside films with lines and tubes | false positives on devices | Device-aware training data and error analysis
off: Sensitivity at fixed specificity per site ; Calibration at deployment prevalence
on: Time to report for critical findings ; Missed critical findings
gap: Single-site training and testing ; Labels extracted from reports with NLP errors

== diabetic-retinopathy-screening | Diabetic Retinopathy Screening | computer-vision | seconds | production-grade | a=0.02 k=5000
obj: Screen fundus photographs for referable diabetic retinopathy in primary care, with a safe referral path for ungradable images.
loss: \mathcal{L}=\mathrm{CE}(y_{\text{grade}},p)+\lambda\,\mathrm{Ordinal}
con: Sensitivity above 90% and specificity above 85% ; Works with handheld cameras ; Offline-capable clinics ; Ungradable image handling
sn: Gradeability | Image-quality gate with recapture guidance | Forcing a grade on every image | Poor images produce confident wrong grades
sn: Labels | Adjudicated consensus of multiple graders | Single-grader labels | Inter-grader disagreement is high for mild disease
sig: Lesion-level evidence | microaneurysm and haemorrhage detection maps | Explains grades | Annotate with expert segmentation
sig: Image quality score | focus, illumination and field coverage | Gate | Calibrated on device types
sig: Ordinal grade probability | distribution over disease grades | Referral decision | Calibrate thresholds by population
noise: Image brightness | device effect
noise: Patient ID | none
base: Ophthalmologist grading with tele-review.
prod: Ordinal CNN/ViT ensemble with quality gate and lesion attention maps, on-device inference for clinics with cloud fallback.
pipe: Fundus capture @ handheld camera ; Quality assessor @ on-device CNN ; Grading ensemble @ ViT and CNN ; Referral policy @ threshold and ungradable rules ; Clinic app @ result UI ; Ophthalmology review @ remote queue ; Outcome follow-up @ referrals
edge: Dilated vs undilated pupils | image quality differs across clinics | Quality gate tuned per device and recapture prompts
edge: Population shift (different ethnic fundus pigmentation) | sensitivity gap | Balanced multi-ethnic validation before rollout
off: Sensitivity and specificity for referable DR ; Ungradable rate
on: Screening completion rate ; Time to ophthalmology referral
gap: Validation on tertiary-hospital images only ; Image selection excluded ungradable cases

== pathology-slide-cancer-detection | Whole-Slide Pathology Cancer Detection | computer-vision | seconds | staff-principal | a=0.01 k=500000
obj: Assist pathologists by detecting and localising tumour regions in gigapixel whole-slide images to prioritise and speed up diagnosis.
loss: \mathcal{L}=\mathrm{BCE}_{\text{slide}}+\lambda\,\mathrm{MIL\text{-}attention}
con: 100,000x100,000 pixel slides ; Weak slide-level labels ; Stain variation across labs ; Pathologist remains decision maker
sn: Supervision | Multiple-instance learning with attention on tiles | Tile-level labels from heuristic masks | Heuristic masks encode annotator bias
sn: Stain | Stain normalisation and augmentation across scanners | One lab's staining | Stain shifts reduce performance 10-20 points
sig: Tile attention scores | attention-weighted tile importance | Localises tumour | Check heatmap fidelity against annotations
sig: Foundation-model tile embeddings | pretrained pathology encoder features | Strong representation | Frozen vs finetuned tradeoff
sig: Slide-level uncertainty | ensemble variance | Triage low confidence | Calibrate
noise: Slide background area | irrelevant
noise: Scanner serial | artefact
base: Pathologist microscopy review.
prod: Foundation-model tile encoder with attention-MIL aggregation, stain-robust training and viewer integration with heatmaps and uncertainty.
pipe: Slide scanner output @ WSI storage ; Tissue segmentation and tiling @ preprocessing ; Tile encoder @ pathology foundation model ; MIL aggregator @ attention head ; Heatmap and report @ viewer overlay ; Pathologist review @ human ; Outcome concordance @ final diagnosis
edge: Scanner firmware update changes colour profile | model sensitivity drops | Stain-normalisation monitors and recalibration set per scanner
edge: Rare tumour subtype | missed detection | Rare-subtype test set and uncertainty-based review routing
off: Slide-level AUROC and FROC for localisation ; Calibration by site
on: Time to diagnosis ; Second-opinion rate
gap: Training on a single institution ; Labels from consensus panel not routine practice

== radiology-report-generation-llm | Radiology Report Drafting with Multimodal LLMs | llm-agents,computer-vision | seconds | staff-principal | a=0.05 k=9000 s=2 t=500
obj: Draft structured radiology findings and impressions from images and priors for radiologist edit, cutting dictation time without introducing errors.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},I)+\lambda\,\mathrm{CheXbertMismatch}
con: Radiologist signs every report ; Hallucination intolerance ; PHI stays within hospital cloud ; Latency under 10 s
sn: Factuality | Clinical-entity-level factual checks (CheXbert / RadGraph) | BLEU or ROUGE | N-gram metrics reward fluent templated text with wrong findings
sn: Role | Draft assistant with uncertainty flags | Autonomous report | An unsigned autonomous report is a patient-safety risk
sig: Finding-entity F1 | F1 over extracted clinical entities | Factual accuracy | Extraction model validated
sig: Laterality and negation checks | rule-based consistency check | Dangerous error type | Deterministic checks
sig: Prior-comparison grounding | statements referencing prior studies verified | Temporal accuracy | Prior retrieval correctness
noise: Report length | not accuracy
noise: Style similarity to training reports | masks factual errors
base: Template reports populated from classifier outputs.
prod: Vision encoder plus LLM fine-tuned on paired reports, retrieval of priors, deterministic safety checks (laterality, negation) and radiologist-in-the-loop editing.
pipe: Study intake @ PACS ; Image encoder @ ViT ; Prior retrieval @ RIS lookup ; Report drafter @ multimodal LLM ; Safety checker @ rule and entity checks ; Radiologist edit and sign @ human ; Edit feedback @ training data
edge: Hallucinated comparison to a nonexistent prior | misleading statement | Prior-grounding verifier blocks unsupported comparisons
edge: Left/right swap | wrong-side finding | Laterality consistency check against image orientation metadata
off: Entity-level F1 and laterality error rate ; Radiologist edit distance
on: Reporting time per study ; Addendum rate
gap: Reference reports contain errors too ; Test studies overlap with training patients

== clinical-note-summarization-ambient-scribe | Ambient Clinical Scribe & Note Summarisation | llm-agents,nlp | seconds | production-grade | a=0.2 k=600 s=3 t=400
obj: Transcribe clinic visits and draft SOAP notes and patient instructions for clinician review, returning hours to clinicians each week.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{UnsupportedFact}
con: Patient consent recorded ; Medical-term ASR accuracy ; Clinician edits every note ; HIPAA-compliant processing
sn: Faithfulness | Every statement traceable to transcript spans | Fluent plausible notes | Unsupported statements enter the legal record
sn: Diarisation | Speaker roles (clinician, patient, family) | Single transcript stream | Misattributed symptoms are wrong history
sig: Span-level support | fraction of note statements linked to transcript | Faithfulness | Alignment algorithm
sig: Medical entity accuracy | drug names and doses correct | Safety | Formulary dictionary
sig: Clinician edit ratio | edits per note section | Utility | Excludes formatting edits
noise: Small talk | not clinical
noise: Note verbosity | burden
base: Clinician dictation and templates.
prod: Streaming medical ASR with diarisation, chunked summarisation with span grounding, structured EHR field extraction and review UI.
pipe: Audio capture @ exam-room device ; ASR and diarisation @ streaming model ; Note drafter @ clinical LLM ; Grounding checker @ span alignment ; Clinician review @ EHR editor ; EHR writer @ FHIR API ; Edit feedback @ evaluation set
edge: Multilingual visit with interpreter | transcript mixes languages | Language ID and interpreter-aware diarisation
edge: Patient declines recording midway | consent boundary violated | Consent state machine halting capture immediately
off: Unsupported-statement rate ; Medical entity F1
on: Documentation time per visit ; Clinician satisfaction
gap: Judging notes by fluency ; Test visits from a single specialty

== icd-cpt-medical-coding-automation | Medical Coding Automation (ICD-10 / CPT) | nlp | batch | production-grade | a=0.05 k=30
obj: Assign accurate diagnosis and procedure codes from clinical documentation to speed billing and cut denials, with coder oversight.
loss: \mathcal{L}=\sum_{c}\mathrm{BCE}(y_c,p_c)\ \text{(extreme multi-label)}+\lambda\,\mathrm{HierarchyPenalty}
con: 70,000 ICD-10 codes ; Auditable evidence spans ; Payer-specific rules ; Coder review for low confidence
sn: Evidence | Span-level evidence per code for audit | Document-level predictions | Auditors need the sentence that justifies each code
sn: Long tail | Hierarchical code structure and retrieval for rare codes | Flat softmax over all codes | Most codes appear fewer than 10 times
sig: Evidence span match | highlighted text span linked to code | Auditability | Span annotation
sig: Code hierarchy consistency | parent-child and exclusion rules | Validity | Code-set version as-of date
sig: Documentation completeness flags | missing specificity detected | Denial risk | Rule library
noise: Billing department code history | leaks previous coding decisions
noise: Document length | none
base: Rule-based computer-assisted coding with keyword dictionaries.
prod: Long-document transformer with label-attention and code-description retrieval, rules for code-set validity, confidence routing to coders.
pipe: Encounter documents @ EHR export ; Document assembler @ section parser ; Coding model @ long-context transformer ; Rules validator @ NCCI and code-set ; Coder queue @ low-confidence review ; Claim submission @ billing system ; Denial feedback @ payer responses
edge: Annual code-set update | invalid or deprecated codes assigned | Versioned code-sets and regression tests at update
edge: Copy-forward notes carry stale diagnoses | copied-forward text makes the model assign codes for conditions that are no longer present | Temporal grounding and copy-forward detection
off: Micro-F1 and macro-F1 on rare codes ; Audit-ready evidence precision
on: First-pass acceptance rate ; Days in accounts receivable
gap: Silver labels from past coding errors ; Evaluating on common codes only

== prior-authorization-automation | Prior Authorization Automation | llm-agents,nlp | seconds | production-grade | a=0.02 k=80 s=4 t=350
obj: Assemble clinical evidence against payer policies to auto-approve straightforward prior authorisation requests and speed up the rest.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{policy},\text{chart})+\lambda\,\mathrm{PolicyViolation}
con: Payer policy versions change monthly ; Evidence citations required ; Humans decide denials ; Turnaround under 24 hours
sn: Policy | Policy criteria as structured checklists with citations | Generic reasoning from memory | Policies are specific; guesses create wrongful denials
sn: Denials | Only humans may deny | Auto-denial | Automated denial raises regulatory and ethical issues
sig: Criteria coverage | share of policy criteria with chart evidence | Decision basis | Evidence retrieval accuracy
sig: Policy version match | policy in force at request date | Correctness | Effective-date lookup
sig: Approval confidence | calibrated probability criteria met | Routing | Calibrated per payer
noise: Physician specialty prestige | none
noise: Request channel | none
base: Manual review by nurses against PDF policies.
prod: Policy-to-checklist compiler, chart evidence retriever, LLM criteria checker with citations and human-in-the-loop for uncertain or denial recommendations.
pipe: Request intake @ payer portal or fax OCR ; Policy retriever @ versioned policy store ; Evidence retriever @ chart FHIR ; Criteria checker @ LLM with citations ; Decision router @ confidence policy ; Nurse reviewer @ human ; Outcome feedback @ appeals
edge: Policy PDF format changes | parser breaks and checklists go stale | Policy-ingestion monitors and diff alerts
edge: Missing chart documents | false unmet criteria | Request more information path instead of denial recommendation
off: Criteria-level accuracy ; Approval precision at 99%
on: Auto-approval rate ; Turnaround time
gap: Training on historical approvals biased by prior reviewers ; Evaluating without policy-version control

== claims-denial-prediction | Claims Denial Prediction & Prevention | tabular | batch | foundational | a=0.1 k=20
obj: Predict which claims will be denied before submission and fix root causes (coding, eligibility, documentation) to raise clean-claim rate.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{claim value})
con: Payer-specific rules ; Explainable edits for billers ; Daily claim volume ; Real-time pre-submission checks
sn: Root cause | Predict denial reason categories | Binary denial flag | Different reasons need different fixes
sn: Payer | Payer-specific models or interactions | One global model | Each payer has distinct adjudication rules
sig: Payer-code historical denial rate | denial rate for payer and procedure code | Payer behaviour | Matured claims
sig: Eligibility verification state | eligibility check result recency | Common denial | Verified before submission
sig: Documentation completeness | required attachments present | Rule compliance | Checklist
noise: Biller ID | personal habits
noise: Claim line order | none
base: Claim scrubber rules.
prod: Reason-aware GBDT per payer cluster with SHAP-based fix suggestions and an edit-prioritisation queue.
pipe: Claim draft @ billing system ; Scrubber rules @ pre-checks ; Denial model @ LightGBM per payer ; Fix recommender @ SHAP and rules ; Biller worklist @ human ; Submission gateway @ clearinghouse ; Remittance feedback @ 835 files
edge: Payer silently changes policy | model overpredicts denials | Payer-change detector on remittance patterns
edge: Underpayments not recorded as denials | partial payments are labelled as accepted so the model never learns underpayment patterns | Payment-variance label expansion
off: AUC by payer ; Precision of top-fix suggestions
on: Clean claim rate ; Denial write-offs
gap: Mature labels only after 60 days ; Training across payers with changed rules

== healthcare-fraud-waste-abuse-detection | Healthcare Fraud, Waste & Abuse Detection | graph,tabular | batch | staff-principal | a=0.05 k=30
obj: Detect upcoding, phantom billing and kickback networks in provider claims to reduce improper payments and focus audits.
loss: \mathcal{L}=\mathrm{FL}(p,y)+\lambda\,\mathrm{GraphReg}
con: Due-process for providers ; Audit evidence ; Peer-group comparisons ; Monthly scoring of 1B claim lines
sn: Peer | Provider behaviour relative to specialty and region peers | Absolute billing volume | Large legitimate practices bill more
sn: Network | Referral and billing network structures | Provider-level features only | Kickback rings show only in links
sig: E/M code distribution skew | share of high-level visit codes vs peers | Upcoding | Peer baseline per specialty
sig: Impossible services per day | hours of services billed per provider-day | Phantom billing | Time models per code
sig: Referral concentration | share of referrals to a single entity | Kickback | Referral graph snapshot
noise: Patient volume alone | size effect
noise: Provider age | none
base: Statistical outlier reports versus peer averages.
prod: Peer-adjusted anomaly scores, GNN over referral networks and a GBDT stacker, with auditor-facing evidence packs.
pipe: Claims lake @ warehouse ; Peer-group builder @ clustering ; Anomaly features @ Spark ; Network model @ GNN ; Risk stacker @ GBDT ; Audit selection @ investigator queue ; Recovery outcomes @ audit results
edge: New billing guidance changes code norms | peer baselines shift | Guidance-aware re-baselining and effective-date flags
edge: Specialty mix of small group practice | outlier false flags | Sub-specialty peer groups
off: Precision at audit capacity ; Recovery per audit hour
on: Improper payments recovered ; Audit hit rate
gap: Positives only from audited providers ; Time leakage via post-audit data

== patient-no-show-prediction | Patient No-Show Prediction & Overbooking | tabular | batch | foundational | a=0.3 k=2
obj: Predict appointment no-shows to target reminders and apply safe overbooking that raises utilisation without long waits.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Equity (do not penalise transport-limited patients) ; Reminder consent ; Daily scheduling ; Explainable
sn: Action | Intervene with supportive actions (transport, reminders) | Punitive double-booking by risk | Penalising high-risk patients widens disparities
sn: Calibration | Calibrated probabilities for overbooking maths | Rank-only models | Overbooking needs actual probabilities
sig: Prior no-show history | rate over last 12 months | Behavioural | Excludes the appointment
sig: Lead time to appointment | days between booking and visit | Forgetting risk | Booking date
sig: Transport and weather disruption | forecast and transit indices | Barrier | Forecast not actual
noise: Patient zip code alone | socioeconomic proxy
noise: Appointment slot ID | none
base: Reminder 24h before every appointment.
prod: Calibrated GBDT with SMS/call intervention uplift and a stochastic overbooking optimiser capped by wait-time constraints.
pipe: Schedule extract @ EHR ; Feature builder @ Spark ; No-show model @ LightGBM ; Uplift reminder selector @ T-learner ; Overbooking optimiser @ stochastic program ; Scheduler review @ clinic staff ; Attendance outcomes @ EHR
edge: Public transport strike | a transport disruption causes mass no-shows far outside the modelled distribution | Event covariates and flexible rescheduling
edge: Telehealth conversion | physical-visit baselines change | Visit-type specific models
off: Calibration error and AUC ; Utilisation vs wait in simulation
on: No-show rate ; Patient wait time
gap: Ignoring that reminders change outcomes ; Evaluating on rank not calibration

== or-scheduling-and-case-duration-prediction | OR Scheduling & Surgical Case Duration Prediction | tabular,time-series | batch | production-grade | a=0.1 k=3
obj: Predict surgical case durations and sequence operating-room blocks to cut overtime and idle time.
loss: \mathcal{L}=\sum_i\rho_{0.7}(y_i-\hat q_i)
con: Surgeon preferences ; Equipment availability ; Emergency add-ons ; Safety turnover times
sn: Distribution | Quantile predictions of duration with surgeon effects | Mean duration | Mean-based schedules overrun half the time
sn: Scheduling | Stochastic optimisation using duration uncertainty | Deterministic slotting | Variance drives overtime
sig: Surgeon-procedure history | surgeon's median duration for procedure | Largest driver | Window before case date
sig: Patient complexity indicators | BMI, ASA class, comorbidity count | Duration modifiers | Pre-op data
sig: Team and room factors | resident presence, room type | Efficiency | Rosters as-of
noise: Case booking time of day | none
noise: Surgeon seniority number | weak
base: Surgeon-booked duration estimates.
prod: Quantile GBDT with surgeon random effects feeding a stochastic OR block scheduler.
pipe: Case booking data @ OR system ; Feature builder @ Spark ; Duration quantile model @ LightGBM ; Scheduler @ stochastic MILP ; Day-of-surgery adjuster @ live updates ; OR manager review @ human ; Actual times @ anaesthesia records
edge: New surgical technique | durations unknown | Procedure-family priors and early-update posterior
edge: Emergency cases displace schedule | cascading overruns | Reserve capacity based on emergency arrival model
off: Pinball loss ; Overtime minutes in simulation
on: Overtime hours ; OR utilisation
gap: Using actual durations booked after the fact ; Ignoring emergency cases in simulations

== bed-capacity-and-ed-demand-forecasting | ED Demand & Bed Capacity Forecasting | time-series | batch | production-grade | a=1 k=2
obj: Forecast ED arrivals, admissions and discharges hourly to staff, open beds and divert flow before crowding hits.
loss: \mathcal{L}=\sum_{t}\sum_q\rho_q\!\left(y_t-\hat y_t^{(q)}\right)
con: Hourly updates ; Surge scenarios ; Interpretable for bed managers ; Multiple sites
sn: Hierarchy | Forecast arrivals, length of stay and discharge separately | Direct census forecast | Census = arrivals minus discharges and each has different drivers
sn: Surge | Event and epidemic covariates | Historical seasonality only | Outbreaks break seasonality
sig: Syndromic surveillance signals | ILI, RSV regional counts | Early surge | Reporting lag
sig: Discharge-before-noon rate | share of discharges by noon | Capacity release | Unit-level
sig: Weather and event calendar | temperature extremes, mass gatherings | Arrival shocks | Forecast values
noise: Day-of-month | none
noise: Hospital CEO name | none
base: Same-hour-last-week averages.
prod: Hierarchical probabilistic forecasts (arrivals, LOS, discharges) combined by simulation, with scenario-based surge planning.
pipe: ADT feed @ HL7 ; Feature builder @ stream and batch ; Arrival forecaster @ probabilistic GBDT ; LOS and discharge model @ survival ; Census simulator @ Monte Carlo ; Bed management dashboard @ operations ; Actual census @ ADT
edge: Epidemic surge | forecasts underpredict persistently | Surveillance covariates and regime-change detector
edge: ADT feed outage | the census feed goes stale so forecasts run on outdated bed occupancy | Data freshness alarms and fallback to last-known plus uncertainty
off: Hourly census WAPE ; Interval coverage
on: ED boarding hours ; Diversion hours
gap: Backtesting only in non-surge periods ; Using realised discharge info in forecasts

== emergency-department-triage-nlp | ED Triage Acuity Assistant | nlp,tabular | seconds | production-grade | a=0.1 k=3
obj: Suggest ESI acuity levels from triage notes, vitals and history to reduce under-triage and variability between nurses.
loss: \mathcal{L}=\mathrm{OrdinalCE}(y,p)+\lambda\,\mathrm{UnderTriagePenalty}
con: Asymmetric cost (under-triage is worse) ; Nurse override always available ; Latency under 2 s ; Bias audit
sn: Asymmetry | Under-triage penalised more than over-triage | Symmetric loss | Missing a critical patient is far costlier
sn: Inputs | Structured vitals plus chief complaint text | Free text alone | Vitals carry objective deterioration signals
sig: Vital-sign abnormality count | number of out-of-range vitals | Acuity | Age-adjusted ranges
sig: Chief-complaint risk phrases | embeddings of complaint text | Red-flag symptoms | De-identified notes
sig: Arrival mode | ambulance vs walk-in | Acuity prior | Recorded at arrival
noise: Triage nurse ID | personal bias
noise: Time to triage | operational
base: Manual ESI assignment.
prod: Ordinal gradient-boosted model with transformer-encoded complaint text, asymmetric loss and a nurse-facing explanation.
pipe: Triage form @ EHR ; Text encoder @ clinical BERT ; Acuity model @ ordinal GBDT ; Safety rules @ red-flag overrides ; Nurse display @ suggestion UI ; Nurse decision @ final ESI ; Outcome labels @ admission and ICU
edge: Atypical presentation in women or elderly | atypical symptom descriptions under-triage these patients relative to classic presentations | Subgroup performance monitoring and targeted data
edge: Pandemic symptom surge | distribution shift | Context features and rapid recalibration
off: Under-triage rate at fixed over-triage ; Weighted kappa
on: Under-triage events ; Time to treatment for high acuity
gap: Labels reflect nurse biases ; Evaluating agreement not outcome

== drug-drug-interaction-and-adverse-event-prediction | Drug-Drug Interaction & Adverse-Event Prediction | graph,tabular | sub-100ms | staff-principal | a=3 k=2
obj: Warn prescribers of clinically significant interactions and predicted adverse events in real time while minimising alert fatigue.
loss: \mathcal{L}=\mathrm{BCE}(y_{ij},\sigma(z_i^\top R z_j))+\lambda\,\mathrm{SeverityWeight}
con: 30 ms in the order-entry flow ; Alert override rate monitored ; Knowledge-base versioning ; Patient-specific context
sn: Context | Patient-specific risk (renal function, age, co-meds) | Generic pairwise interaction lists | Most generic alerts are overridden as irrelevant
sn: Severity | Severity-tiered alerting | All interactions equal | Alert fatigue buries critical warnings
sig: Interaction knowledge-graph embedding | link-prediction score between drugs | Novel interactions | Training on known pairs only
sig: Renal and hepatic function context | eGFR and liver labs | Dose-related risk | Latest result before order
sig: Polypharmacy count | number of concurrent active meds | Risk multiplier | Active medication list
noise: Prescriber specialty alone | not mechanism
noise: Order entry time | none
base: Commercial DDI database with severity tiers.
prod: Knowledge-graph link-prediction model combined with patient-context GBDT, tiered alerts and override-feedback learning.
pipe: Order entry hook @ CPOE ; Medication list service @ FHIR ; Interaction scorer @ KG embedding ; Context risk model @ GBDT ; Alert tiering @ severity rules ; Prescriber display @ inline alert ; Override feedback @ analytics
edge: New drug approvals | unknown to graph | Rapid ingestion path from labels and curated updates
edge: Alert override culture | clinicians click through | Tiering and silent logging for low-severity pairs
off: AUROC on held-out interaction pairs ; Alert precision at severe tier
on: Preventable adverse drug events ; Alert override rate
gap: Held-out pairs share drugs with train pairs ; Labels from literature, not real-world outcomes

== medication-adherence-prediction-and-nudges | Medication Adherence Prediction & Nudges | tabular,reinforcement-learning | batch | production-grade | a=0.5 k=2
obj: Identify patients likely to stop therapy and choose the supportive nudge that most improves adherence within a contact budget.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\;\text{and}\;\max_\pi\mathbb{E}[\text{adherence}]\ \text{s.t. contacts}\le B
con: Consent for outreach ; Equity in nudges ; Contact fatigue ; Evidence-based messages
sn: Uplift | Which nudge raises adherence for whom | Predicting non-adherence only | Prediction without action design wastes budget
sn: Measure | Proportion of days covered with refill gaps | Single refill event | One late refill is not abandonment
sig: Refill gap pattern | days late on past refills | Early disengagement | Matured fills only
sig: Cost-sharing change | copay change at fill | Financial barrier | Plan year
sig: Side-effect reports | patient-reported or call-centre notes | Reason to stop | Consent
noise: Pharmacy ID | channel
noise: Message send time | confounded
base: Automated refill reminders for everyone.
prod: Adherence hazard model with contextual bandit over nudge types (SMS, call, pharmacist), budgeted by contacts per week.
pipe: Pharmacy fill data @ claims ; Adherence features @ Spark ; Hazard model @ GBDT survival ; Nudge bandit @ Thompson sampling ; Outreach platform @ SMS and call ; Pharmacist follow-up @ human ; Refill outcomes @ pharmacy feed
edge: Patient switches pharmacies | appears non-adherent | Cross-pharmacy fill linkage
edge: Therapy intentionally stopped by clinician | wasted outreach | Discontinuation-reason flag from EHR
off: PDC prediction error ; Off-policy value of nudge policy
on: Proportion of days covered ; Outreach cost per adherent patient
gap: Missing fills at other pharmacies counted as non-adherence ; Non-random past outreach

== clinical-trial-patient-matching | Clinical Trial Patient Matching | nlp,llm-agents | batch | production-grade | a=0.02 k=80 s=3 t=300
obj: Match patients to eligible trials by reasoning over structured and unstructured records against inclusion and exclusion criteria.
loss: \mathcal{L}=\sum_c\mathrm{BCE}(y_c,p_c)\ \text{(criterion-level)}+\lambda\,\mathrm{Calibration}
con: Criterion-level explanations ; Patient privacy ; Recall priority with coordinator review ; Trial registry updates daily
sn: Granularity | Criterion-by-criterion evidence extraction | Overall eligible score | Coordinators verify criteria individually
sn: Temporal | Time-aware criteria (within 6 months) | Ever-flags | Eligibility depends on dates
sig: Criterion evidence link | chart snippet per criterion | Verification | Snippet retrieval
sig: Temporal window satisfaction | event date vs criterion window | Correctness | Date normalisation
sig: Unknown-criteria count | criteria lacking data | Follow-up needed | Honest unknowns
noise: Trial sponsor | none
noise: Patient age exact decimals | none
base: Keyword search over problem lists.
prod: Criteria parser to structured logic, retrieval and LLM evidence extraction per criterion, deterministic logic evaluator and coordinator review.
pipe: Trial registry sync @ ClinicalTrials feed ; Criteria parser @ LLM to logic ; Chart retriever @ FHIR and notes ; Evidence extractor @ LLM with citations ; Logic evaluator @ deterministic ; Coordinator review @ human ; Enrolment outcomes @ feedback
edge: Ambiguous criteria wording | inconsistent interpretation | Coordinator-approved criterion library
edge: Missing outside records | patients wrongly excluded | Unknown state preserved, not treated as fail
off: Criterion-level F1 ; Recall of eligible patients
on: Patients screened per coordinator hour ; Enrolment rate
gap: Gold set from a single disease area ; Treating unknown as ineligible

== drug-discovery-molecular-property-prediction | Molecular Property Prediction for Drug Discovery | graph | batch | staff-principal | a=0.001 k=10
obj: Predict ADMET and activity properties from molecular graphs to prioritise synthesis and cut wet-lab cycles.
loss: \mathcal{L}=\sum_{t}m_{it}\left(y_{it}-\hat y_{it}\right)^2\ \text{(masked multitask)}+\lambda\,\mathrm{Evidential}
con: Scaffold-split generalisation ; Uncertainty estimates ; Sparse assay data ; Medicinal chemist trust
sn: Splits | Scaffold or time splits | Random molecule splits | Random splits leak near-analogues and inflate results
sn: Uncertainty | Calibrated uncertainty and applicability domain | Point predictions | Chemists need to know when not to trust the model
sig: Pretrained molecular graph embedding | GNN encoder pretrained on millions of molecules | Transfer | Check overlap with test scaffolds
sig: Physicochemical descriptors | logP, TPSA, MW | Prior knowledge | Calculation tool version
sig: Assay noise estimate | replicate variance | Label quality | Use for weighting
noise: Molecule ID | arbitrary
noise: Vendor of compound | batch effect
base: Random forest on ECFP fingerprints.
prod: Multitask GNN (D-MPNN) with pretraining, ensembling for uncertainty and active-learning loop selecting compounds to test.
pipe: Assay database @ ELN export ; Standardiser @ RDKit ; Graph encoder @ D-MPNN ; Multitask head @ ADMET endpoints ; Uncertainty and domain check @ ensemble ; Chemist review @ human ; New assay results @ active learning
edge: Out-of-domain scaffold | confident wrong predictions | Applicability-domain detector and flagged predictions
edge: Assay protocol change | a changed assay protocol shifts label values so the model learns a moving target | Assay-version covariate and re-baseline
off: Scaffold-split RMSE and AUROC ; Uncertainty calibration
on: Synthesis cycles to hit ; Hit rate of selected compounds
gap: Random split leakage ; Averaging across assays with different noise

== virtual-screening-docking-surrogate | Virtual Screening with Docking Surrogates | graph,computer-vision | batch | staff-principal | a=0.0005 k=20
obj: Screen billion-molecule libraries by training fast surrogate models on docking scores, then dock only the top fraction.
loss: \mathcal{L}=\mathrm{MSE}(f(m),\text{dock}(m))+\lambda\,\mathrm{RankLoss}
con: Compute budget ; Target-specific models ; Enrichment at top 0.1% ; Reproducible docking
sn: Metric | Enrichment factor at the top fraction | Global RMSE of docking scores | Only the top tail matters for screening
sn: Ground truth | Experimental confirmation of top picks | Docking as truth | Docking scores correlate weakly with binding
sig: Surrogate rank score | model predicted docking rank | Prioritisation | Calibrate on top tail
sig: Pocket descriptors | binding-site features | Target conditioning | Structure version
sig: Library diversity coverage | cluster coverage among selected | Avoid redundancy | Clustering
noise: Molecular weight alone | confounds docking scores
noise: Compound supplier | none
base: Dock a random subset and a fixed filter cascade.
prod: Iterative active-learning loop: GNN surrogate, dock top predictions, retrain, with diversity selection and experimental validation.
pipe: Library ingest @ enumerated molecules ; Surrogate model @ GNN on GPU ; Selection @ acquisition function ; Docking @ GPU docking cluster ; Rescoring @ physics or ML ; Chemist triage @ human ; Assay results @ validation
edge: Receptor conformation changes | surrogate trained on wrong pocket | Ensemble of receptor conformers
edge: Docking failures on some molecules | failed docking runs leave missing labels that bias the surrogate toward easy molecules | Failure-aware labelling and imputation
off: Enrichment factor at 0.1% ; Hit-rate in docking top-k
on: Compounds docked per hit ; Experimental hit rate
gap: Training and test molecules share scaffolds ; Equating docking score with binding affinity

== genomic-variant-pathogenicity-classification | Genomic Variant Pathogenicity Classification | tabular,nlp | batch | staff-principal | a=0.00005 k=100
obj: Classify variants of uncertain significance with calibrated evidence under ACMG guidelines to speed diagnostic reporting.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{EvidenceCalibration}
con: Clinical-grade reproducibility ; ACMG evidence mapping ; Ancestry-aware allele frequencies ; Curator sign-off
sn: Ancestry | Ancestry-specific allele frequency | Global allele frequency only | Variants common in one ancestry are mislabelled rare
sn: Circularity | Separate training sets from evidence used in prediction | Using ClinVar labels with ClinVar-derived features | Circularity inflates performance
sig: Population allele frequency | gnomAD frequency by ancestry | Rarity evidence | Frequency database version
sig: Conservation and structure scores | evolutionary conservation, AlphaFold-based features | Functional impact | Tool version
sig: Gene-level constraint | LOEUF or missense constraint | Gene tolerance | Version
noise: Variant rsID text | identifier
noise: Submitter name | label provenance
base: ACMG rule-based classification.
prod: Calibrated ensemble of conservation, structure and population features mapped to ACMG evidence strength, with curator workflow.
pipe: VCF intake @ pipeline ; Annotation @ VEP ; Feature store @ versioned annotations ; Pathogenicity model @ calibrated ensemble ; ACMG evidence mapper @ rules ; Curator review @ human ; ClinVar submission @ feedback
edge: Database version update changes frequencies | reclassification of reported variants | Versioned annotations and reclassification alerts
edge: Under-represented ancestry | inflated pathogenic calls | Ancestry-aware calibration
off: Calibration against expert classifications ; AUROC by gene
on: VUS rate ; Time to report
gap: Gene-level leakage between train and test ; Circular training labels
