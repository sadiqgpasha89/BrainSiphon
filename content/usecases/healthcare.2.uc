# Healthcare & Life Sciences, part 2 (use cases 23-50)
== polygenic-risk-scoring | Polygenic Risk Scoring | tabular | batch | staff-principal | a=0.00002 k=500
obj: Combine genome-wide variant effects into calibrated disease risk scores that are valid across ancestries and actionable for prevention programmes.
loss: \mathcal{L}=\|y-X\beta\|^2+\lambda\sum_j\left(\beta_j^2/\tau_j^2\right)\ \text{(Bayesian shrinkage priors)}
con: Ancestry portability ; Calibration in absolute risk ; Consent and genomic privacy ; Clinical utility threshold
sn: Portability | Ancestry-aware training and calibration | Scores trained on European cohorts applied universally | Accuracy drops 2-5x in under-represented ancestries
sn: Clinical utility | Absolute risk with net benefit analysis | Relative risk percentiles | Percentiles do not tell if screening is worthwhile
sig: Shrunk SNP effect sizes | LDpred2 or PRS-CS posterior effects | Reduces noise | Use external GWAS only
sig: Ancestry principal components | genetic PCs for calibration | Population structure | Reference panel version
sig: Clinical covariates | age, sex, family history | Combined model | Documented definitions
noise: Raw p-value thresholded SNP lists | unstable
noise: Self-reported ethnicity alone | inaccurate proxy
base: Clumping and thresholding PRS.
prod: Bayesian PRS with ancestry-specific calibration combined with clinical risk factors into absolute 10-year risk, validated in multiple biobanks.
pipe: Genotype data @ array or sequencing ; QC and imputation @ pipeline ; PRS computation @ Bayesian weights ; Ancestry calibration @ PC-based model ; Risk integration @ clinical model ; Genetic counsellor report @ human ; Outcome follow-up @ registry
edge: Sample overlap between GWAS and target | inflated performance | Strict cohort separation and overlap checks
edge: Imputation panel mismatch | missing variants | Variant-coverage checks per genotype platform
off: Variance explained and AUC by ancestry ; Calibration slope
on: Uptake of preventive screening ; Reclassification net benefit
gap: Validating in the same biobank used for GWAS ; Ignoring ancestry differences

== single-cell-rna-cell-type-annotation | Single-Cell RNA Cell-Type Annotation | tabular,graph | batch | production-grade | a=0.00001 k=2000
obj: Annotate millions of cells with cell types automatically, flagging novel populations for biologists.
loss: \mathcal{L}=\mathrm{CE}(y,p)+\lambda\,\mathrm{MMD}(Z_{\text{batch}_a},Z_{\text{batch}_b})
con: Batch effects across labs ; Novel cell types ; Reference atlas versions ; Reproducibility
sn: Batch | Batch-corrected latent space | Raw expression PCA | Batch effects dominate raw PCA clusters
sn: Novelty | Open-set annotation with abstention | Forced classification into known types | New states are forced into wrong labels
sig: Highly variable gene set | selected by dispersion across batches | Signal genes | Fix set at training
sig: Latent embedding from scVI-like model | batch-corrected embedding | Annotation space | Seed variance
sig: Marker gene scores | known marker panel scores | Interpretability | Curated list version
noise: Total UMI count | technical depth
noise: Mitochondrial fraction alone | quality not type
base: Marker-gene rule annotation with clustering.
prod: Probabilistic VAE with reference mapping, kNN label transfer, uncertainty-based novelty detection and curator review.
pipe: Count matrices @ sequencing core ; QC and filtering @ pipeline ; Batch-corrected embedding @ scVI ; Reference mapping @ label transfer ; Novelty detector @ uncertainty ; Biologist review @ human ; Atlas update @ curation
edge: New tissue not in reference | annotations wrong with confidence | Out-of-reference detection and refusal
edge: Doublets mis-annotated | spurious hybrid types | Doublet detection pre-step
off: Macro-F1 across cell types ; Novelty detection AUROC
on: Annotation time per dataset ; Curator corrections
gap: Test batches seen in training ; Cell-type labels derived from same clustering

== wearable-arrhythmia-detection-ecg | Wearable Arrhythmia Detection (ECG/PPG) | time-series | sub-100ms | production-grade | a=1440 k=1
obj: Detect atrial fibrillation and other arrhythmias from wearable signals continuously while limiting false alarms and battery drain.
loss: \mathcal{L}=\mathrm{FL}(y,p)+\lambda\,\mathrm{Calibration}
con: On-device inference under 1 mW budget ; Motion artefacts ; Regulatory clearance ; Alert false positives low
sn: Signal quality | Signal-quality gating before classification | Classifying everything | Motion corrupts PPG and creates false AF
sn: Burden | Episode-level detection with duration criteria | Window-level accuracy | Window metrics overcount short events
sig: RR-interval irregularity | beat-to-beat interval entropy | AF marker | Peak detection quality
sig: PPG morphology quality | pulse waveform SQI | Reliability | Device-specific calibration
sig: Activity context | accelerometer-derived motion level | Artefact control | Sync with signal
noise: Absolute heart rate | wide benign range
noise: Wrist side | device artefact
base: RR-irregularity threshold algorithm.
prod: Quantised 1D CNN with signal-quality gate on-device, with cloud confirmation on a larger model and cardiologist review for flagged episodes.
pipe: Sensor sampling @ wearable ; Signal-quality gate @ on-device ; Arrhythmia CNN @ INT8 on MCU ; Episode aggregator @ duration rules ; Cloud confirmation @ larger model ; Cardiologist review @ human ; Outcome labels @ ECG patches
edge: Tremor or exercise motion | false AF alerts | Activity-aware gating and confirmation window
edge: Firmware update changes sampling | model performance drops | Sampling-invariant preprocessing and release checks
off: Episode sensitivity and PPV ; Alerts per user-month
on: Confirmed AF detection rate ; Alert-induced clinic visits
gap: Test data from clean lab recordings ; Window-level splits sharing patients

== remote-patient-monitoring-anomaly-detection | Remote Patient Monitoring Anomaly Detection | time-series | sub-100ms | production-grade | a=24 k=1
obj: Detect clinically meaningful changes in home-monitoring data (weight, BP, glucose, SpO2) and escalate to care teams with minimal noise.
loss: \mathcal{L}=\sum_t\left[\log\sigma_t+\frac{(x_t-\mu_t)^2}{2\sigma_t^2}\right]
con: Personal baselines ; Missing and irregular measurements ; Care-team capacity ; Patient-friendly alerts
sn: Baseline | Per-patient adaptive baselines | Population thresholds | Normal differs widely between patients
sn: Missingness | Non-adherence as a signal handled separately | Imputing and ignoring gaps | A silent patient may be the sick one
sig: Deviation from personal baseline | robust z-score over 14 days | Change | Window excludes current reading
sig: Trend slope over 3 days | weight gain slope for heart-failure patients | Decompensation | Measurement timing adjustment
sig: Measurement gap duration | days since last reading | Engagement | Distinguish device failure
noise: Single outlier reading | measurement error
noise: Day of week | none
base: Fixed clinical thresholds per vital.
prod: Bayesian state-space per patient with robust updates, condition-specific rules layered on top and care-team tiered queue.
pipe: Device data @ IoT gateway ; Validation @ plausibility checks ; Patient baseline model @ Kalman filter ; Condition rules @ clinical logic ; Care-team queue @ tiering ; Nurse outreach @ human ; Outcome feedback @ admissions
edge: Faulty scale readings | false weight-gain alert | Plausibility and repeat-measure prompts
edge: Care-team capacity drops | fewer nurses are available so the alert queue grows and urgent alerts wait | Capacity-aware ranking by risk
off: Event detection lead time ; Alerts per patient-month
on: Avoided admissions ; Alert response time
gap: Alerts judged only by acted-upon ones ; Retrospective data from engaged patients only

== mental-health-triage-chatbot-safety | Mental-Health Support Chatbot with Safety Triage | llm-agents,nlp | seconds | staff-principal | a=0.5 k=8 s=2 t=250
obj: Provide supportive, evidence-based conversations while detecting crisis signals and escalating to humans immediately and safely.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{SafetyViolation}
con: Crisis detection recall above 99% on high-risk cases ; Never provide diagnosis ; Emergency resource routing ; Clinical oversight
sn: Safety | Separate safety classifier with hard overrides | Relying on the LLM's own judgement | Models can be talked out of safety behaviour
sn: Scope | Supportive skills (CBT-style) within guard rails | Open-ended therapy claims | Unvalidated therapy claims risk harm
sig: Crisis-risk classifier score | calibrated risk of self-harm intent | Escalation trigger | Tune for high recall
sig: Conversation risk trajectory | change in risk over the session | Slow-burn crises | Windowed
sig: Policy adherence rate | fraction of replies within guidelines | Quality | Red-team sets
noise: Chat sentiment average | not risk
noise: Response friendliness rating | not safety
base: Scripted decision-tree chatbot with hotline links.
prod: Dual-model design: crisis classifier and policy engine gate a supportive LLM, with immediate human handoff and region-aware emergency routing.
pipe: Chat gateway @ app ; Crisis classifier @ fine-tuned encoder ; Policy engine @ hard rules ; Supportive LLM @ constrained prompts ; Safety output filter @ guard model ; Human responder handoff @ clinician ; Audit and QA @ clinical review
edge: Indirect or coded crisis language | euphemistic or coded expressions of crisis are not recognised and escalation is missed | Continuous red-teaming and clinician-labelled hard cases
edge: Jailbreak attempts to bypass guardrails | adversarial prompts push the model to produce unsafe content despite safety filters | Layered filters and refusal tests in CI
off: Crisis recall at high risk ; Policy violation rate on red-team set
on: Appropriate escalation rate ; User-reported helpfulness with safety audit
gap: Red-team set written by builders only ; Measuring engagement as success

== symptom-checker-and-care-navigation | Symptom Checker & Care Navigation | llm-agents,tabular | seconds | production-grade | a=0.3 k=6 s=4 t=300
obj: Guide users from symptoms to the right level of care (self-care, GP, urgent, emergency) safely and consistently.
loss: \mathcal{L}=\mathrm{OrdinalCE}(\text{disposition},p)+\lambda\,\mathrm{UnderTriagePenalty}
con: Under-triage minimised ; Clinical protocol alignment ; No diagnosis claims ; Audit of every pathway
sn: Safety | Conservative disposition with red-flag rules | Maximum-likelihood diagnosis | The goal is correct urgency not a diagnosis
sn: Protocol | Clinically authored decision logic with ML assisting | Pure LLM reasoning | Protocols must be auditable and consistent
sig: Red-flag symptom detection | rule-based emergency symptom match | Hard escalation | Clinician-curated list
sig: Symptom-slot completeness | required questions answered | Reliability | Dialogue state
sig: Demographic and history risk | age, pregnancy, chronic disease | Modifies urgency | Self-reported
noise: Chat length | none
noise: Device | none
base: Static questionnaire with branching logic.
prod: Dialogue agent that fills protocol slots via LLM, evaluates clinician-authored triage logic deterministically, and learns follow-up question ordering from outcomes.
pipe: Chat or voice front end @ app ; Symptom extractor @ LLM structured ; Protocol engine @ deterministic logic ; Red-flag overrides @ rules ; Disposition explainer @ LLM constrained ; Clinician review of edge cases @ human ; Outcome follow-up @ surveys
edge: User downplays symptoms | minimised symptom reports lead to a lower urgency disposition than the situation warrants | Conservative defaults and red-flag question insertion
edge: Language and literacy variation | misunderstood questions | Multilingual simple-language tests
off: Under-triage rate on vignette sets ; Agreement with clinician disposition
on: Appropriate care-level match ; Unnecessary ED visits avoided
gap: Vignettes simpler than real patients ; Outcome data biased to those who followed advice

== population-health-risk-stratification | Population Health Risk Stratification | tabular | batch | foundational | a=0.01 k=20
obj: Stratify a health plan population by future cost and avoidable utilisation to target care management where it changes outcomes.
loss: \mathcal{L}=\mathrm{Tweedie}(y,\hat\mu)+\lambda\,\mathrm{FairnessGap}
con: Avoid cost-based bias against underserved groups ; Monthly refresh ; Explainable to care managers ; Capacity-limited programmes
sn: Label | Predict avoidable utilisation or clinical need | Predict cost only | Cost-based labels under-identify groups with less access
sn: Targeting | Expected program benefit | Highest predicted risk | The sickest patients may not benefit from outreach
sig: Chronic condition burden | count and severity of conditions | Need | Diagnoses by claim date
sig: Prior-year utilisation | ED visits and admissions | Utilisation pattern | Window before target
sig: Social-risk indicators | housing, food insecurity screens | Drivers of avoidable events | Consent and accuracy
noise: Prior-year total spend | encodes access disparities
noise: Plan ID | admin
base: HCC risk score.
prod: Gradient-boosted multi-outcome model with fairness constraints and an uplift model for programme assignment.
pipe: Claims and EHR lake @ warehouse ; Feature builder @ Spark ; Risk models @ multi-outcome GBDT ; Fairness audit @ group metrics ; Programme assigner @ uplift and capacity ; Care manager worklist @ human ; Outcomes @ claims
edge: Coding intensity differs across providers | risk scores inflated | Normalise for documentation intensity
edge: New benefit design | utilisation patterns shift | Benefit-aware covariates and retraining triggers
off: Calibration and top-decile capture ; Fairness gaps in selection
on: Avoidable admissions in programme vs control ; Programme cost per outcome
gap: Using cost as proxy for need ; Training on enrolled patients only

== ckd-progression-forecasting | Chronic Kidney Disease Progression Forecasting | time-series,tabular | batch | production-grade | a=0.02 k=10
obj: Forecast eGFR trajectories and kidney failure risk to trigger timely nephrology referral and therapy.
loss: \mathcal{L}=-\sum_i\log p(\text{eGFR}_{i,1:T}\mid x_i)+\lambda\,\mathrm{Survival}
con: Irregular labs ; Explainability for clinicians ; Fairness across race-free equations ; Monthly refresh
sn: Equation | Race-free eGFR equations and consistent assay units | Mixing legacy equations | Inconsistent eGFR definitions create artificial drops
sn: Dynamics | Joint longitudinal and survival model | Separate models | Informative dropout biases separate models
sig: eGFR slope | linear mixed-model slope over 2 years | Progression speed | Observations before index
sig: Albuminuria category | UACR measurement | Strongest risk addition | Latest before index
sig: Blood-pressure control | fraction of readings in target | Modifiable | Outpatient only
noise: Insurance type | proxy
noise: Lab ordering clinic | artefact
base: Kidney failure risk equation (KFRE).
prod: Joint longitudinal-survival deep model with irregular time handling and calibrated 2- and 5-year risk.
pipe: Lab and visit data @ EHR ; Harmoniser @ units and equations ; Trajectory model @ joint model ; Risk calibrator @ isotonic ; Referral rules @ thresholds ; Nephrology review @ human ; Outcomes @ dialysis registry
edge: Lab assay change | step shift in creatinine | Assay-version metadata and harmonisation
edge: Acute kidney injury episode | looks like progression | AKI detection and exclusion windows
off: Time-dependent AUC and calibration ; Trajectory RMSE
on: Timely referrals ; Progression to dialysis
gap: Informative missingness of labs ; Using future labs for baseline slope

== surgical-video-phase-recognition | Surgical Video Phase Recognition | computer-vision | seconds | staff-principal | a=0.01 k=500000
obj: Recognise surgical phases and critical-view events in laparoscopic video for documentation, training and safety checklists.
loss: \mathcal{L}=\mathrm{CE}_{\text{phase}}+\lambda\,\mathrm{TemporalSmoothness}
con: Video privacy ; Real-time overlay under 1 s ; Multi-hospital variation ; Surgeon trust
sn: Temporal | Long-range temporal models | Frame-wise classifiers | Phases are defined by context over minutes
sn: Variation | Cross-hospital technique variation handled | Single-site data | Technique and equipment differ
sig: Instrument presence and state | detected instruments per frame | Phase cue | Detector quality
sig: Temporal context embedding | transformer over 5-minute window | Phase | Window length
sig: Anatomy segmentation | organ masks | Critical view | Annotation consistency
noise: Camera brand | domain
noise: Operating-room lighting | environment
base: Frame-wise CNN with smoothing.
prod: Video transformer with instrument/anatomy auxiliary heads, online smoothing and surgeon-facing timeline.
pipe: Video capture @ OR recorder ; De-identification @ face and audio removal ; Frame encoder @ ViT ; Temporal model @ video transformer ; Event detector @ critical view rules ; Surgeon review UI @ timeline ; Annotation feedback @ expert labels
edge: Smoke and blood obscure view | visibility loss makes the predicted phase flicker between classes | Visibility-aware smoothing
edge: Unexpected complication changes procedure flow | out-of-distribution phases | OOD detector and unknown phase label
off: Phase F1 and boundary tolerance ; Critical-view detection recall
on: Documentation time saved ; Checklist adherence
gap: Frames from the same surgery in train and test ; Annotation inconsistency between surgeons

== dermatology-skin-lesion-triage | Dermatology Skin Lesion Triage | computer-vision | seconds | staff-principal | a=0.02 k=3000
obj: Triage skin lesion photos from primary care and consumers to urgent, routine or reassure, with strong performance across skin tones.
loss: \mathcal{L}=\mathrm{CE}+\lambda\,\mathrm{GroupDRO}
con: Skin-tone fairness (Fitzpatrick I-VI) ; Image-quality variability ; Sensitivity on melanoma ; Regulatory and liability
sn: Fairness | Group-wise performance reported across skin tones | Average accuracy | Datasets are skewed toward light skin
sn: Capture | Capture guidance and quality gating | Any user photo | Blur and lighting dominate errors
sig: Lesion segmentation features | border irregularity, colour variegation | ABCDE logic | Segmentation quality
sig: Dermoscopy vs clinical photo flag | modality | Different distributions | Metadata
sig: Prior lesion comparison | change over time | Evolution | Same-lesion linking
noise: Skin-marker pen ink | shortcut
noise: Image ruler presence | dataset artefact
base: Dermatologist teleconsult.
prod: Ensemble CNN/ViT with quality gate, conformal prediction for uncertainty, and group-balanced fine-tuning, routing uncertain cases to dermatologists.
pipe: Photo capture @ app guidance ; Quality gate @ blur and lighting ; Lesion classifier @ ViT ensemble ; Conformal uncertainty @ prediction sets ; Triage policy @ thresholds ; Dermatologist review @ teledermatology ; Biopsy outcomes @ labels
edge: Dark skin tones underrepresented | lower sensitivity | Targeted data collection and group-wise thresholds
edge: Selection bias to lesions that were biopsied | optimistic accuracy | Prospective validation on consecutive cases
off: Melanoma sensitivity by Fitzpatrick group ; Calibration by group
on: Time to specialist for urgent lesions ; Unnecessary referrals
gap: Public datasets with artefacts ; Validation only on biopsied lesions

== dental-xray-caries-detection | Dental X-Ray Caries & Pathology Detection | computer-vision | seconds | production-grade | a=0.1 k=2000
obj: Highlight caries, bone loss and periapical lesions on dental radiographs to improve diagnostic consistency and patient communication.
loss: \mathcal{L}=\mathcal{L}_{\text{det}}+\mathcal{L}_{\text{seg}}
con: Dentist final decision ; Multi-vendor sensors ; Low latency chairside ; Explainable overlays
sn: Annotation | Consensus of multiple dentists | Single annotator labels | Caries boundaries are subjective
sn: Utility | Overlays plus patient-facing visuals | Black-box labels | Dentists need localisations to trust
sig: Lesion segmentation map | pixel-level mask | Localisation | Annotation protocol
sig: Tooth numbering | FDI tooth identification | Charting | Tooth detection accuracy
sig: Bone-level measurement | distance CEJ to bone | Periodontal staging | Calibrated pixel size
noise: Sensor brand | domain
noise: Image contrast | acquisition
base: Dentist visual reading.
prod: Segmentation network with tooth detection and consensus-calibrated thresholds, running on chairside GPU or cloud API.
pipe: Sensor image @ DICOM or proprietary ; Preprocessor @ normalisation ; Tooth detector @ detection net ; Pathology segmenter @ U-Net variant ; Chart generator @ structured findings ; Dentist review @ human ; Outcome confirmation @ treatment records
edge: Overlapping teeth in bitewings | missed interproximal caries | Multi-view fusion and quality prompts
edge: Sensor firmware changes gamma | detection thresholds drift | Calibration step per sensor
off: Lesion-level sensitivity at fixed FP per image ; Segmentation Dice
on: Diagnostic agreement among dentists ; Treatment acceptance
gap: Single clinic data ; Consensus labels differ from clinical decisions

== stroke-lvo-ct-detection | Stroke Large-Vessel Occlusion CT Detection | computer-vision | seconds | staff-principal | a=0.01 k=100000
obj: Detect large vessel occlusions on CT angiography within minutes and notify stroke teams in parallel to speed thrombectomy.
loss: \mathcal{L}=\mathrm{FL}(y,p)+\lambda\,\mathcal{L}_{\text{seg}}
con: Door-to-notification under 5 minutes ; Sensitivity above 90% ; Mobile alert integration ; 24/7 reliability
sn: Time | End-to-end alert latency as primary metric | Offline accuracy | Minutes matter more than marginal AUC
sn: Workflow | Parallel notification to specialists | Replacing radiologist | Value comes from faster mobilisation
sig: Vessel density asymmetry | hyperdense vessel features | LVO cue | Registration quality
sig: Collateral score | vessel filling in CTA phases | Prognosis | Phase timing
sig: Clot burden estimate | occlusion extent | Triage | Annotation
noise: Patient position | variable
noise: Scanner site | domain
base: Radiologist read with phone call.
prod: 3D CNN for LVO detection on CTA with automated vessel tracking, push alerts to stroke teams and confirmation by radiologist.
pipe: CT acquisition @ scanner ; DICOM routing @ gateway ; Preprocessing @ registration ; LVO detector @ 3D CNN on GPU ; Notification service @ mobile alerts ; Radiologist and neurologist @ human ; Outcome registry @ stroke database
edge: Motion artefacts | missed LVO or false alert | Quality checks and uncertainty flags
edge: Network outage | alerts are delayed or lost when the network link between scanner and cloud fails | On-prem inference and offline queue
off: Sensitivity and specificity for LVO ; Time to alert
on: Door-to-puncture time ; Thrombectomy rate
gap: Retrospective cohorts with selected cases ; Latency measured without network delays

== ultrasound-guidance-and-measurement | Ultrasound Guidance & Auto-Measurement | computer-vision | sub-100ms | staff-principal | a=0.05 k=200000
obj: Provide real-time probe guidance and automatic measurements (fetal biometry, cardiac EF) so non-experts acquire diagnostic-quality scans.
loss: \mathcal{L}=\mathcal{L}_{\text{seg}}+\lambda\,\mathrm{SmoothL1}(\text{measure})
con: 30 fps on handheld devices ; Operator-independent quality ; Regulatory clearance ; Edge inference
sn: Guidance | Closed-loop guidance to the target view | Post-hoc image analysis | Poor scans cannot be fixed after acquisition
sn: Measurement | Uncertainty with measurements | Single-number outputs | Clinicians must know reliability
sig: View-quality score | probability of a standard diagnostic view | Guidance | Calibrated
sig: Anatomical landmark heatmaps | keypoint localisations | Measurement | Landmark annotation
sig: Cardiac phase detection | end-diastole and systole frames | EF computation | Tracking
noise: Gain and depth settings | acquisition variables
noise: Probe vendor | domain
base: Sonographer manual measurements.
prod: Lightweight CNN/transformer with temporal tracking for view classification and landmark regression, distilled to mobile NPU.
pipe: Probe stream @ handheld device ; View classifier @ mobile NPU ; Guidance generator @ direction model ; Landmark tracker @ regression net ; Measurement calculator @ geometry ; Clinician confirmation @ human ; Saved study @ PACS
edge: Patient body habitus reduces image quality | measurement errors | Quality-adaptive guidance and refusal to measure
edge: Probe vendor domain shift | landmark errors | Multi-device calibration data
off: Measurement error vs expert ; View classification accuracy
on: Scan success rate by novice operators ; Time per exam
gap: Training on expert-acquired scans only ; Evaluating after view selection

== patient-similarity-cohort-search | Patient Similarity & Cohort Search | nlp,recommender | seconds | production-grade | a=0.05 k=40
obj: Let clinicians and researchers find similar patients and build cohorts from structured data and notes using natural-language queries.
loss: \mathcal{L}=\mathrm{InfoNCE}(z_p,z_{p^+})
con: Privacy and access control ; Query explanations ; Cohort definitions reproducible ; Fast over 10M patients
sn: Representation | Patient embeddings from codes, labs and notes | Single-table filters | Single-field cohort filters miss complex phenotypes
sn: Reproducibility | Executable cohort definitions from queries | Ad hoc screens | Researchers must reproduce cohorts
sig: Longitudinal code embedding | sequence-based patient embedding | Similarity | Time window
sig: Lab trajectory features | summary of lab trends | Phenotype | Units normalised
sig: Note-derived phenotypes | extracted conditions | Coverage | Negation handling
noise: Patient ID | none
noise: Encounter count alone | utilisation bias
base: SQL cohort filters on diagnosis codes.
prod: Dual retrieval (structured embeddings plus note semantic search) with an LLM translating questions to validated cohort queries.
pipe: Query interface @ web UI ; Query translator @ LLM to SQL and filters ; Patient embedding retrieval @ ANN ; Structured filter engine @ OMOP database ; Cohort validator @ constraint checks ; Researcher review @ human ; Access audit @ logs
edge: Natural-language ambiguity | wrong cohort definition | Show executable definition and require confirmation
edge: Rare disease cohort re-identification risk | small cohorts for rare conditions can re-identify individual patients | k-anonymity thresholds in outputs
off: Cohort precision and recall vs manual chart review ; Retrieval NDCG
on: Time to build cohorts ; Reuse of cohort definitions
gap: Gold cohorts from one disease ; Embeddings trained on the same records used for test

== clinical-decision-support-rag | Clinical Decision Support with RAG | llm-agents,nlp | seconds | staff-principal | a=0.2 k=60 s=3 t=400
obj: Answer clinicians' point-of-care questions by retrieving guidelines and patient context with verified citations.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{evidence})+\lambda\,\mathrm{CitationError}
con: Evidence-based citations only ; Guideline version control ; Patient-data minimisation ; Regulatory classification
sn: Evidence | Retrieval from curated guidelines and trial summaries | Parametric model memory | Medical facts in memory are outdated or wrong
sn: Personalisation | Patient-specific context via FHIR with consent | Generic answers | Dose and contraindication depend on the patient
sig: Citation entailment rate | claims supported by cited passages | Faithfulness | NLI check
sig: Guideline recency | publication date and supersession | Currency | Index metadata
sig: Patient-context grounding | facts used from chart cited | Safety | Source link
noise: Model self-reported certainty | unreliable
noise: Answer length | none
base: UpToDate-style search for clinicians.
prod: Hybrid retrieval over curated medical corpus, chart-aware reasoning LLM with citation verification and abstain-on-weak-evidence policy.
pipe: Question intake @ EHR sidebar ; Chart context fetch @ FHIR with consent ; Evidence retriever @ hybrid search ; Reasoning LLM @ medical model ; Citation verifier @ NLI ; Clinician decision @ human ; Feedback and audit @ QA
edge: Guideline conflict between societies | confident single answer | Present conflicting evidence with sources
edge: Retrieval returns outdated guideline | a superseded guideline is retrieved and the answer recommends outdated care | Supersession metadata and freshness filters
off: Citation entailment rate ; Expert-graded answer accuracy
on: Time to answer ; Clinician adoption and override rate
gap: Benchmarks leak into training data ; Grading answers without checking citations

== patient-portal-message-triage | Patient Portal Message Triage & Drafts | nlp,llm-agents | seconds | production-grade | a=0.3 k=4 s=2 t=250
obj: Classify urgency and route inbound patient messages, drafting safe replies for staff review to cut inbox burden.
loss: \mathcal{L}=\mathrm{OrdinalCE}(\text{urgency},p)+\lambda\left(-\sum_t\log p_\theta(y_t\mid y_{<t},x)\right)
con: Never auto-reply to urgent clinical questions ; Staff approval ; PHI controls ; Response time SLAs
sn: Urgency | Conservative urgency classifier with escalate-on-doubt | Sentiment | Calm messages can describe emergencies
sn: Drafts | Policy- and chart-grounded drafts | Generic reassurance | Wrong reassurance is a safety risk
sig: Red-flag phrase detection | symptom red-flag matching | Escalation | Curated list
sig: Message-intent class | refill, appointment, symptom, billing | Routing | Taxonomy
sig: Chart-context relevance | recent encounters and meds | Draft accuracy | Retrieval
noise: Message length | none
noise: Time of day | none
base: Keyword-based inbox rules.
prod: Fine-tuned classifier with escalate-on-doubt logic and chart-grounded LLM drafts for administrative intents only.
pipe: Portal message @ EHR ; Intent and urgency model @ clinical encoder ; Red-flag rules @ overrides ; Chart retriever @ FHIR ; Draft generator @ LLM ; Staff review @ human ; Outcome feedback @ edits
edge: Message contains multiple intents | one intent ignored | Multi-label intent detection and split routing
edge: Language and literacy variation | messages in other languages or with low literacy are misclassified and misrouted | Multilingual models and review sampling
off: Urgent recall at high precision ; Draft acceptance rate
on: Staff minutes per message ; Time to response for urgent messages
gap: Training labels from inconsistent triage ; Not testing the multi-intent cases

== patient-feedback-sentiment-and-complaints | Patient Feedback & Complaint Mining | nlp | batch | foundational | a=0.05 k=3
obj: Mine surveys, reviews and complaints to surface actionable service and safety issues by unit and theme.
loss: \mathcal{L}=\mathrm{CE}_{\text{topic}}+\lambda\,\mathrm{CE}_{\text{sentiment}}
con: Anonymisation ; Safety-event escalation ; Multilingual ; Monthly leadership reporting
sn: Action | Topic plus sentiment plus unit attribution | Overall sentiment score | Leaders need which unit and which issue
sn: Safety | Safety-relevant mentions routed immediately | Aggregates only | A report of harm should not wait for monthly reports
sig: Topic-level sentiment | sentiment per theme | Actionability | Topic model stable
sig: Unit attribution | location entity extraction | Ownership | Entity linking
sig: Severity flags | harm or safety mention detector | Escalation | Recall priority
noise: Survey length | none
noise: Respondent email | PII
base: NPS and star ratings.
prod: Topic and aspect-sentiment model with safety flagging and trend alerting, plus LLM-written summaries with citations.
pipe: Survey and review feeds @ ingestion ; PII redaction @ NER ; Topic and sentiment @ transformer ; Safety flagger @ classifier ; Trend analyser @ time series ; Quality team review @ human ; Action tracking @ ticketing
edge: Survey response bias (only extremes respond) | only very happy or very unhappy patients respond, skewing the view of service quality | Weighting and complement with passive signals
edge: Sarcasm and cultural idioms | wrong sentiment | Multilingual fine-tuning and review sample
off: Topic F1 and aspect sentiment accuracy ; Safety-flag recall
on: Issues resolved ; Patient satisfaction trend
gap: Labels from star ratings only ; Test data from one language

== hospital-supply-forecasting | Hospital Supply & Consumables Forecasting | time-series | batch | foundational | a=1 k=1
obj: Forecast consumable demand per ward to prevent stock-outs of critical supplies and reduce expiry waste.
loss: \mathcal{L}=\sum_t\left[c_s(y_t-\hat q_t)^+ +c_e(\hat q_t-y_t)^+\right]
con: Critical item service levels ; Expiry dates ; Delivery lead times ; Pandemic surge handling
sn: Drivers | Link usage to census, procedures and case mix | Time-series only | Usage follows patient activity not calendar
sn: Criticality | Service-level targets per item class | Uniform safety stock | Critical items need higher service
sig: Procedure schedule | upcoming surgeries by type | Known usage | Schedule as-of
sig: Census and acuity | patient days by unit and acuity | Consumption | Forecast census
sig: Lead-time variance | supplier delivery variance | Safety stock | Delivered dates
noise: Supplier invoice number | none
noise: Ward name text | encoded by unit
base: Min-max par levels.
prod: Hierarchical forecasts driven by procedure and census forecasts with newsvendor-style service-level policy.
pipe: Usage and PO data @ ERP ; Driver forecasts @ census and OR schedule ; Demand model @ GBDT ; Replenishment policy @ service-level optimiser ; Supply chain planner @ human ; Order system @ ERP ; Stock-out log @ monitoring
edge: Supplier recall | sudden shortage | Recall feed and alternate-product mapping
edge: Surge in infectious disease | PPE demand spikes | Scenario simulation tied to surveillance
off: Weighted pinball loss ; Stock-out probability calibration
on: Critical stock-outs ; Expired inventory value
gap: Censored demand during stock-outs ; Ignoring substitutions

== pharmacy-demand-and-expiry-forecasting | Pharmacy Demand & Expiry Forecasting | time-series,tabular | batch | production-grade | a=1 k=1
obj: Forecast drug demand and manage expiry across pharmacy locations to balance availability and waste, including cold-chain items.
loss: \mathcal{L}=\sum_{t}\rho_q(y_t-\hat y_t)+\lambda\,\mathrm{ExpiryRisk}
con: Controlled substances rules ; Cold-chain handling ; Expiry date tracking ; Shortage substitutions
sn: Substitution | Generic and therapeutic substitution modelled | Per-NDC independent forecasts | Shortages shift demand between equivalents
sn: Age | Stock by expiry date in the state | Total inventory | Short-dated stock must move first
sig: Prescription trend signals | new prescriptions and refills | Demand | Rx data lag
sig: Shortage and recall alerts | supplier shortage feed | Substitution | Feed latency
sig: Days-to-expiry distribution | stock by expiry bucket | Waste risk | Batch tracking
noise: NDC code digits | identifier
noise: Pharmacy name | encoded
base: Min-max reorder with FEFO picking.
prod: Hierarchical demand model with substitution graph and expiry-aware ordering, plus inter-store transfer recommendations.
pipe: Dispense and inventory feed @ pharmacy system ; Substitution graph @ drug classes ; Demand model @ LightGBM ; Expiry-aware optimiser @ MILP ; Transfer recommender @ network model ; Pharmacist approval @ human ; Waste and availability tracking @ KPI
edge: Drug shortage announced | demand shifts to substitute | Substitution matrix updates by shortage events
edge: Cold-chain excursion | stock must be discarded | Temperature logging integration and quarantine triggers
off: Weighted MAPE and pinball loss ; Expiry waste simulation
on: Out-of-stock rate ; Expired stock value
gap: Backtests ignoring shortage events ; Independent item models in shortages

== ambulance-dispatch-and-response-time-optimization | Ambulance Dispatch & Positioning | reinforcement-learning,time-series | sub-100ms | staff-principal | a=0.01 k=3
obj: Choose which ambulance to dispatch and where to reposition idle units to minimise response times and maximise survival coverage.
loss: \min_\pi\;\mathbb{E}\!\left[\sum_t w(\text{priority}_t)\cdot \text{response}_t\right]
con: Decision under 100 ms ; Priority-based response targets ; Crew shift limits ; Geographic equity
sn: Priority | Priority-weighted response objective | Average response time | Averages hide failures for high-priority calls
sn: Demand | Spatiotemporal demand forecasts for repositioning | Static base stations | Demand shifts by hour and event
sig: Spatiotemporal demand intensity | forecast calls per grid cell-hour | Positioning | Forecast not actual
sig: Travel-time estimate | live-traffic ETA | Dispatch | Live feed
sig: Unit availability state | crew and vehicle status | Feasibility | Real-time
noise: Dispatcher ID | personal
noise: Call centre queue length | operational
base: Closest-available-unit dispatch.
prod: Demand forecaster plus approximate dynamic programming for repositioning, and a travel-time-aware assignment optimiser with dispatcher override.
pipe: Emergency call intake @ CAD ; Priority classifier @ NLP on call notes ; Demand forecaster @ spatiotemporal model ; Dispatch optimiser @ assignment solver ; Repositioning policy @ ADP ; Dispatcher decision @ human ; Response time logs @ analytics
edge: Mass-casualty incident | all assumptions break | Incident mode with manual command and fallback rules
edge: GPS outage | vehicle positions go stale so dispatch decisions rely on wrong locations and ETAs | Last-known plus dead reckoning and alerts
off: Simulated response-time percentiles by priority ; Coverage metrics
on: 90th percentile response time ; Cardiac arrest survival
gap: Simulation uses historical calls ignoring policy effects ; Optimising mean rather than tail

== nurse-scheduling-optimization | Nurse Scheduling Optimisation | reinforcement-learning,tabular | batch | production-grade | a=0.1 k=2
obj: Generate fair shift schedules that meet predicted patient demand and skill mix while respecting preferences and labour rules.
loss: \min\;\sum_s \text{understaffing}_s+\lambda\,\text{preference violations}+\mu\,\text{overtime}
con: Labour regulations ; Skill mix and licensure ; Fairness in preferences ; Last-minute changes
sn: Demand | Acuity-based demand forecast | Fixed nurse-to-patient ratios | Acuity changes workload
sn: Fairness | Transparent fairness metrics | Opaque heuristics | Nurses reject unfair schedules
sig: Acuity-weighted demand forecast | workload units per shift | Staffing target | Forecast quality
sig: Preference satisfaction score | fraction of requests honoured | Retention | Fair allocation
sig: Skill coverage per shift | required competencies present | Safety | Credential data
noise: Nurse name | none
noise: Seniority alone | fairness
base: Manual scheduling in spreadsheets.
prod: Constraint programming with acuity forecasts, fairness objectives and a re-optimisation engine for call-outs.
pipe: Census and acuity forecast @ ADT feed ; Constraint model @ CP-SAT ; Preference collector @ staff app ; Schedule optimiser @ solver ; Manager review @ human ; Publish @ HR system ; Call-out re-optimiser @ live
edge: Sudden call-outs | gaps in coverage | Rolling re-optimisation with float pool
edge: Preference gaming | unfair distribution | Fairness constraints and preference budgets
off: Understaffing hours ; Preference satisfaction distribution
on: Overtime cost ; Nurse turnover
gap: Evaluating only on forecast demand ; Ignoring real-world call-outs

== risk-adjustment-hcc-coding | Risk Adjustment & HCC Capture | nlp,tabular | batch | production-grade | a=0.05 k=30
obj: Identify undocumented but clinically supported chronic conditions to ensure accurate risk adjustment, within compliance rules.
loss: \mathcal{L}=\sum_c\mathrm{BCE}(y_c,p_c)+\lambda\,\mathrm{ComplianceRisk}
con: Audit and compliance (RADV) ; Clinician attestation required ; No upcoding ; Documentation evidence
sn: Evidence | Clinical evidence supporting diagnosis (labs, meds) | Pattern guessing | Unsupported codes cause audit penalties
sn: Compliance | Suspect conditions routed to clinicians for assessment | Auto-coding conditions | Only clinicians can diagnose
sig: Medication-diagnosis mismatch | medication implying undocumented condition | Gap finding | Medication dates
sig: Lab-based condition evidence | e.g. HbA1c patterns | Support | Labs before encounter
sig: Prior-year HCC recapture status | chronic conditions to reassess | Completeness | Previous year documentation
noise: Provider productivity | none
noise: Encounter count | none
base: Prior-year diagnosis recapture lists.
prod: Evidence-linked suspecting model producing clinician prompts with chart citations and compliance audit trail.
pipe: Claims and EHR data @ lake ; Evidence extractor @ NLP and rules ; Suspect model @ GBDT ; Prompt generator @ chart citations ; Clinician assessment @ human ; Documentation capture @ EHR ; Compliance audit @ review
edge: Coding guideline changes | previously valid suggestions now non-compliant | Versioned rule sets and compliance regression suite
edge: Overzealous suggestions | clinician alert fatigue | Prioritisation and suggestion budgets
off: Precision of supported suggestions ; Audit pass rate in samples
on: Accurate HCC capture ; RADV audit findings
gap: Success measured by revenue rather than correctness ; Positive labels from prior unaudited coding

== dicom-image-deidentification | Medical Image De-Identification (DICOM) | computer-vision,nlp | batch | production-grade | a=0.02 k=50000
obj: Remove PHI from DICOM headers and burned-in pixel text (and facial features in head scans) at scale for research sharing.
loss: \mathcal{L}=\mathcal{L}_{\text{OCR-det}}+\mathcal{L}_{\text{segmentation}}
con: Zero PHI leakage tolerance ; Preserve clinical information ; Audit of de-id decisions ; Throughput of millions of studies
sn: Pixel PHI | OCR plus detection of burned-in text | Header scrubbing only | Burned-in annotations leak names
sn: Recall | Recall-prioritised redaction with spot-audit | Accuracy | One missed name is a breach
sig: Burned-in text detections | text region detections | PHI removal | Per-modality models
sig: DICOM tag allow-list | retain allowed tags only | Privacy by design | Allow-list governance
sig: Face reconstruction risk | CT/MR facial features present | Re-identification | Defacing algorithm
noise: Study description free text | may contain names
noise: Institution logos | non-PHI
base: Header tag blacklist scrubbing.
prod: Allow-list header processing, ensemble OCR/detector for pixel text, defacing models for head scans and statistical audit sampling.
pipe: DICOM ingest @ PACS export ; Header sanitiser @ allow-list ; Pixel text detector @ OCR ensemble ; Defacing @ 3D model ; Quality audit @ sampling ; Privacy officer review @ human ; Research release @ data room
edge: Unusual modality with new overlay format | an unseen overlay layout hides patient identifiers from the pixel text detector | New-modality validation before release
edge: Ultrasound cine with moving text | frame-level misses | Temporal propagation of detections
off: PHI recall at 99.99% ; Clinical content preservation score
on: Privacy incident count ; Share-readiness throughput
gap: Testing on common modalities only ; Evaluating precision instead of recall

== clinical-text-phi-redaction | Clinical Text PHI Redaction | nlp | batch | foundational | a=0.1 k=8
obj: Redact or pseudonymise PHI in clinical notes consistently so notes can be used for research and model training.
loss: \mathcal{L}=\mathrm{CE}_{\text{token}}+\lambda\,\mathrm{RecallBoost}
con: Recall over 99.5% ; Consistent pseudonyms for longitudinal linking ; Names, dates, IDs, locations ; HIPAA Safe Harbor / Expert determination
sn: Recall | Recall-weighted NER with rule backstops | Balanced F1 | Missing one MRN violates policy
sn: Utility | Consistent date shifting and entity pseudonyms | Replacing with tags | Tags destroy temporal and relational information
sig: NER entity confidence | token-level probabilities | Recall tuning | Calibrated
sig: Pattern-matched IDs | regex for MRN, phone | Backstop | Local formats
sig: Dictionary hit for names | name lists and clinician rosters | Backstop | Updated lists
noise: Note length | none
noise: Clinician specialty | none
base: Regex plus name dictionary.
prod: Transformer NER ensemble with regex and dictionary backstops, consistent pseudonymisation service and sampled human audit.
pipe: Note export @ EHR ; Section parser @ cleaning ; NER ensemble @ clinical transformer ; Rule backstops @ regex and lists ; Pseudonymiser @ date shift and surrogate ; Audit sampler @ human ; Research data release @ approved
edge: Names that are common words (Hope, Rose) | missed or over-redacted | Context-aware NER and dictionary of ambiguous names
edge: OCR noise in scanned notes | missed identifiers | Noise-robust training and confidence-driven review
off: Entity-level recall by type ; Re-identification risk assessment
on: PHI leaks found in audits ; Data availability for research
gap: Evaluation on synthetic or clean notes ; Ignoring rare identifier types

== federated-learning-multi-hospital | Federated Learning Across Hospitals | tabular,computer-vision | batch | staff-principal | a=0.001 k=10000
obj: Train shared clinical models across hospitals without centralising patient data, handling heterogeneity and governance.
loss: \min_w\sum_k\frac{n_k}{n}F_k(w)+\frac{\mu}{2}\|w-w_t\|^2\ \text{(FedProx)}
con: Data stays on site ; Differential privacy budgets ; Non-IID data ; Heterogeneous compute
sn: Heterogeneity | Personalisation layers and FedProx-style regularisation | Plain FedAvg | Non-IID sites make FedAvg diverge
sn: Privacy | Secure aggregation and DP accounting | Assuming federated means private | Gradients can leak training data
sig: Per-site data distribution summaries | label and feature statistics | Drift diagnosis | Privacy-safe summaries
sig: Update norm clipping stats | gradient norms per site | Privacy and stability | DP clipping
sig: Personalised head performance | per-site fine-tuned head | Local utility | Hold-out
noise: Hospital name | none
noise: Number of local epochs | tuning
base: Local models trained per hospital.
prod: Federated training with FedProx, secure aggregation, DP-SGD where required and site-specific fine-tuning heads, with orchestrated governance.
pipe: Site data prep @ local harmonisation ; Local trainer @ on-site GPU ; Secure aggregation @ cryptographic protocol ; Global model server @ aggregator ; Privacy accountant @ DP budget ; Governance board @ approvals ; Site evaluation @ local validation
edge: One site has label shift | global model biased | Site weighting and personalisation
edge: Site drops out mid-round | stalled training | Asynchronous aggregation and straggler tolerance
off: Per-site AUROC vs local-only ; Privacy epsilon spent
on: Sites onboarded ; Model uplift at small hospitals
gap: Evaluating on pooled data only ; No membership inference test

== radiotherapy-autocontouring | Radiotherapy Auto-Contouring | computer-vision | seconds | staff-principal | a=0.01 k=200000
obj: Auto-segment organs at risk and target volumes on CT/MR to cut planning time from hours to minutes with clinician edits.
loss: \mathcal{L}=\mathrm{Dice}+\mathrm{CE}+\lambda\,\mathrm{SurfaceDistance}
con: Clinical acceptability ; Edits tracked ; Multi-vendor CT ; Safety review for plans
sn: Metric | Edit time and clinical acceptability | Dice alone | Dice misses clinically significant boundary errors
sn: Variation | Institution-specific contouring guidelines | One universal style | Practices vary by centre
sig: Organ-at-risk segmentation masks | 3D U-Net masks | Plan inputs | Atlas protocol
sig: Boundary uncertainty maps | ensemble variance at boundaries | Where to review | Calibrated
sig: Anatomy variation flags | unusual anatomy detection | Safety | Rare cases
noise: Scanner brand | domain
noise: Slice thickness | acquisition
base: Atlas-based segmentation.
prod: nnU-Net ensembles with institution fine-tuning, uncertainty maps and in-TPS editing integration.
pipe: CT/MR import @ DICOM ; Preprocessing @ resampling ; Segmentation ensemble @ nnU-Net on GPU ; Uncertainty and QC @ checks ; Contour editor @ TPS plugin ; Physician approval @ human ; Edit logging @ feedback
edge: Metal artefacts | segmentation failure | Artefact detection and manual contouring prompt
edge: Post-surgical anatomy | model assumes normal anatomy | Anomaly flags and mandatory review
off: Dice and 95th-percentile Hausdorff ; Clinician edit time
on: Planning time ; Plan quality indicators
gap: Contours from the same clinicians used to train ; Ignoring rare anatomy

== sleep-staging-from-wearables | Sleep Staging from Wearables | time-series | batch | foundational | a=1 k=100
obj: Infer sleep stages and sleep quality metrics from wrist/ring sensors with accuracy near PSG for coaching and clinical screening.
loss: \mathcal{L}=\mathrm{CE}_{\text{stage}}+\lambda\,\mathrm{TemporalConsistency}
con: Battery-limited sampling ; Diversity of users ; Privacy ; Clinical validation against PSG
sn: Reference | Polysomnography as gold standard | Self-reported sleep | Users misjudge sleep latency and wake time
sn: Context | Temporal models over the night | Epoch-wise classifiers | Stages follow typical progression
sig: Heart-rate variability features | HRV in 30s epochs | Autonomic state | Artifact handling
sig: Movement activity counts | accelerometer activity | Wake detection | Sensor placement
sig: Circadian time prior | clock time and personal chronotype | Stage priors | Timezone
noise: Skin temperature absolute | ambient sensitive
noise: Step counts during the day | not sleep
base: Actigraphy-based sleep/wake algorithm.
prod: Sequence model (transformer/TCN) on HRV and motion with personalisation and PSG-calibrated outputs.
pipe: Sensor streams @ wearable ; Epoch features @ on-device ; Sleep-stage model @ TCN ; Night summary @ metrics ; Coaching logic @ app ; Clinician export @ report ; PSG validation @ study data
edge: Shift workers with irregular sleep | stage priors wrong | Personal circadian adaptation
edge: Wearable worn loosely | poor sensor contact produces noisy signals and unreliable stage estimates | Signal quality scoring and confidence display
off: Cohen's kappa vs PSG ; Wake-after-sleep-onset error
on: Weekly active users ; Clinical referral accuracy
gap: Healthy young validation cohort only ; Epoch-level splits within the same person

== patient-digital-twin-treatment-response | Patient Digital Twin for Treatment Response | reinforcement-learning,time-series | batch | staff-principal | a=0.001 k=40
obj: Simulate individual patient trajectories under alternative treatments using causal models to support shared decision making.
loss: \mathcal{L}=-\log p(Y^{(a)}\mid X)\ \text{with balancing penalty }\mathrm{IPM}(\Phi(X)_{a=0},\Phi(X)_{a=1})
con: Causal validity ; Uncertainty communicated ; Clinician-in-the-loop ; Regulatory and ethical review
sn: Causality | Counterfactual estimation with adjustment for confounding | Predicting outcomes under observed treatment | Treatment assignment is confounded by indication
sn: Validation | Compare with randomised trial effect estimates | Fit on retrospective data only | Retrospective fit can be systematically biased
sig: Pre-treatment covariate balance | propensity overlap diagnostics | Identifiability | Overlap assumption
sig: Biomarker trajectory pre-treatment | longitudinal lab trends | Heterogeneity | Index date
sig: Treatment history sequence | prior therapies | Response context | Order
noise: Post-treatment events | mediators and colliders
noise: Hospital branding | none
base: Population-average treatment effects from trials.
prod: Counterfactual sequence model (CRN/Causal Transformer) trained with balancing, calibrated uncertainty and trial-anchored validation.
pipe: Longitudinal EHR @ OMOP ; Cohort builder @ target-trial emulation ; Causal sequence model @ counterfactual transformer ; Uncertainty module @ ensembles ; Decision-support view @ clinician UI ; Tumour board or clinician @ human ; Outcome tracking @ registry
edge: Hidden confounders | biased individual effects | Sensitivity analyses and trial anchoring
edge: Treatment not seen for similar patients | the model extrapolates outcomes for treatments with no comparable patients in the data | Overlap checks and refusal to estimate
off: Calibration vs RCT subgroup effects ; Policy value via doubly robust estimation
on: Clinician use and agreement ; Patient outcomes in pilot
gap: Training on treated patients only ; Using post-treatment variables as features
