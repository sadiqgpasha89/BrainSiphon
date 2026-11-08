# EdTech, part 2 (use cases 26-50)
== spaced-repetition-scheduling | Spaced Repetition Scheduling | time-series,reinforcement-learning | sub-100ms | production-grade | a=30 k=1
obj: Schedule reviews of vocabulary, facts and skills at the moment forgetting is likely, maximising retention per minute of study.
loss: \mathcal{L}=-\sum_t\left[y_t\log R_t+(1-y_t)\log(1-R_t)\right],\ R_t=\exp\!\left(-\Delta t/S_t\right)
con: Per-item memory state for millions of learners ; Scheduling in 20 ms ; Daily review caps ; Interpretable intervals
sn: Memory | Item-level stability and difficulty (DSR/FSRS style) | Fixed Leitner intervals | Items differ in difficulty and learners in memory strength
sn: Target | Retention target (e.g. 90%) tuned to workload | Maximal frequency | More reviews waste time without more retention
sig: Elapsed time since last review | days since review | Forgetting | Server time
sig: Item stability estimate | model memory stability | Interval | Fit
sig: Recent review outcome history | last four grades | State | Order
noise: Card text length | weak
noise: Deck name | none
base: Fixed expanding intervals (SM-2).
prod: FSRS-style memory model trained on review logs, scheduler targeting a desired retention with workload smoothing, personalised per learner.
pipe: Review events @ app ; Memory state store @ key-value ; Memory model @ DSR ; Scheduler @ target retention ; Workload balancer @ caps ; Review queue @ app ; Review logs @ lakehouse
edge: Learner returns after months away | backlog of thousands of due items | Triage by retention loss and gradual re-entry plan
edge: Clock changes or time zones | intervals miscomputed | Server-side time and timezone-aware day boundaries
off: Log-loss and calibration of recall predictions ; Retention at fixed workload
on: Retention at 30 days ; Study minutes per retained item
gap: Predicting recall on items that scheduling selected ; Ignoring review-order effects

== lecture-video-segmentation-and-summarization | Lecture Video Segmentation & Summarisation | nlp,computer-vision | seconds | production-grade | a=0.2 k=20000
obj: Segment lectures into topics, generate chapters, summaries and quiz points so learners can navigate and review efficiently.
loss: \mathcal{L}=\mathrm{CE}_{\text{boundary}}+\lambda\left(-\sum_t\log p_\theta(y_t\mid y_{<t},x)\right)
con: Long videos (2 hours) ; ASR noise on technical terms ; Faithful summaries ; Cost per hour of video
sn: Segmentation | Topic boundaries from transcript embeddings plus slide changes | Fixed-length chunks | Fixed chunks cut mid-concept
sn: Faithfulness | Summaries grounded in transcript spans | Free summarisation | Hallucinated statements mislead learners
sig: Transcript topic-shift score | embedding distance between windows | Boundaries | ASR quality
sig: Slide-change detection | visual change in slides | Chapter cue | Frame sampling
sig: Term glossary alignment | domain terms recognised | ASR repair | Glossary
noise: Speaker filler words | noise
noise: Video resolution | weak
base: Fixed 5-minute chapters with auto-captions.
prod: Domain-adapted ASR, topic segmentation using transcript and slides, map-reduce summarisation with span citations.
pipe: Video upload @ platform ; ASR with glossary biasing @ Whisper-class ; Slide and scene detector @ vision ; Segmenter @ topic model ; Summariser @ LLM with citations ; Chapter UI @ player ; Learner interaction @ events
edge: Technical terms mis-transcribed | summary introduces wrong terms | Glossary biasing and post-ASR correction
edge: Lecture with live whiteboard writing | live whiteboard teaching has no slides so chapter boundaries lack visual cues | Whiteboard OCR and speech-only fallback
off: Boundary F1 ; Summary faithfulness rate
on: Chapter navigation usage ; Time to find content
gap: Evaluating on clean slides-only talks ; Judging summaries by fluency

== multilingual-lecture-captioning | Multilingual Lecture Captioning & Translation | nlp | seconds | production-grade | a=0.5 k=5000
obj: Provide accurate live and recorded captions and translations for lectures in many languages with technical vocabulary.
loss: \mathcal{L}=\mathcal{L}_{\text{CTC}}+\lambda\,\mathcal{L}_{\text{translation}}
con: Live latency under 3 s ; Accessibility standards ; Code-switching ; Domain vocabulary
sn: Domain | Course glossary biasing | Generic ASR | Technical terms are rare words
sn: Latency | Streaming with revision policy | Full-file ASR only | Live captions need low latency with minimal flicker
sig: Contextual biasing list | slide text and glossary | Term accuracy | Extraction
sig: Word confidence | calibrated confidence | Highlight uncertain | Calibration
sig: Translation quality estimate | QE score | Review routing | Model
noise: Speaker volume | channel
noise: Room reverberation | channel
base: Platform auto-captions.
prod: Streaming ASR with biasing from slides and glossaries, punctuation and diarisation, and MT with terminology constraints and quality estimation.
pipe: Audio stream @ lecture capture ; Streaming ASR @ conformer ; Contextual biasing @ glossary ; Punctuation and diarisation @ models ; MT with terminology @ NMT ; Caption display @ player ; Correction feedback @ editors
edge: Code-switching between two languages | transcription breaks | Multilingual models with language ID per segment
edge: Names of local people and places | repeated errors | Name lists and user corrections
off: Word error rate on domain terms ; Live latency and flicker rate
on: Caption accuracy complaints ; Accessibility compliance
gap: Test set lacks code-switching ; Technical terms excluded from WER

== admissions-and-student-support-chatbot | Admissions & Student Support Assistant | llm-agents,nlp | seconds | production-grade | a=0.5 k=8 s=3 t=250
obj: Answer applicants' and students' questions about admissions, fees, deadlines and services accurately, escalating to staff when needed.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{KB})+\lambda\,\mathrm{PolicyError}
con: Accuracy on deadlines and fees ; Version-aware policies ; Multilingual ; Sensitive cases escalated
sn: Freshness | Retrieval from versioned official sources | Static training data | Deadlines and fees change every year
sn: Escalation | Confidence and topic-based handoff | Always answering | Wrong answers about visas or fees cause real harm
sig: Source recency | effective date of cited document | Correctness | Metadata
sig: Answer support rate | claims supported by cited documents | Faithfulness | NLI
sig: Escalation precision | handoffs that needed staff | Efficiency | Review
noise: Chat length | weak
noise: Greeting style | none
base: FAQ search and email support.
prod: RAG assistant over versioned official content with citation verification, sensitive-topic router and staff handoff with context.
pipe: Chat gateway @ web and WhatsApp ; Intent and risk router @ classifier ; Retriever @ hybrid search ; Answer LLM @ grounded ; Citation verifier @ entailment ; Staff handoff @ human ; Feedback and gaps @ analytics
edge: Policy changed this week | assistant quotes the old deadline | Change feed triggers re-index and shows effective dates
edge: Applicants ask about individual admission chances | assistant overpromises | Refusal policy and referral to official channels
off: Answer correctness on golden FAQs ; Citation support rate
on: Deflection with satisfaction ; Wrong-answer complaints
gap: Golden set not updated for the new cycle ; Counting deflection as success

== admissions-application-scoring-fairness | Admissions Application Scoring with Fairness Controls | tabular,nlp | batch | staff-principal | a=0.001 k=40
obj: Support holistic review by summarising applications and flagging evidence, with strict fairness controls and no automated decisions.
loss: \mathcal{L}=\mathrm{CE}+\lambda\,\mathrm{DemographicParity}+\mu\,\mathrm{EqualisedOdds}
con: Legal compliance on protected attributes ; Human decision-making ; Transparency to applicants ; Audit trail
sn: Role | Decision support and evidence summarisation | Automated admit/reject | Automated decisions have legal and ethical risk
sn: Bias | Audit and mitigate proxy bias in features | Remove protected attributes only | Proxies reproduce historical bias
sig: Structured evidence summary | extracted achievements and context | Reviewer efficiency | Extraction accuracy
sig: Context-adjusted achievement | achievement relative to opportunity | Fairness | Context data
sig: Inter-reviewer agreement | reviewer consistency | Quality | Review data
noise: Essay prestige phrases | privilege proxy
noise: Extracurricular counts | privilege proxy
base: Manual review with rubrics.
prod: LLM-based evidence summarisation with human review, fairness audits of features, and reviewer calibration dashboards.
pipe: Application ingest @ portal ; Document parser @ OCR and NLP ; Evidence extractor @ LLM ; Fairness audit @ group metrics ; Reviewer workspace @ human decision ; Calibration analytics @ BI ; Outcomes @ enrolment
edge: Historical admits encode past bias | model replicates bias | Do not train on historical decisions; use rubric-based evidence only
edge: Applicants attempt to game with AI-written essays | summaries inflated | Authenticity checks and context signals
off: Reviewer agreement and time saved ; Subgroup selection-rate audits
on: Reviewer throughput ; Diversity of admitted class
gap: Training on past admissions decisions ; Fairness measured only on a single attribute

== scholarship-matching | Scholarship & Financial Aid Matching | recommender,tabular | batch | foundational | a=0.05 k=5
obj: Match students to scholarships they are eligible for and likely to win, improving access and application quality.
loss: \mathcal{L}=\mathrm{BPR}+\lambda\,\mathrm{EligibilityPenalty}
con: Hard eligibility rules ; Fairness ; Deadline-aware ; Privacy of financial data
sn: Eligibility | Rule-based hard filters then learned ranking | Pure similarity | Ineligible matches waste time
sn: Win | Rank by win probability and effort | Maximum award | Effort-aware ranking improves expected funding
sig: Eligibility rule satisfaction | structured criteria match | Gate | Parsing
sig: Historical win likelihood | past winners profile | Win probability | Bias
sig: Deadline proximity | days to deadline | Urgency | Calendar
noise: Student name | none
noise: Application length | weak
base: Search filters for scholarships.
prod: Eligibility engine plus ranker of win probability and effort, with LLM extraction of criteria from scholarship text.
pipe: Scholarship ingestion @ crawlers and partner feeds ; Criteria extractor @ LLM ; Eligibility engine @ rules ; Win-probability ranker @ GBDT ; Matching API @ app ; Student application @ human ; Outcomes @ labels
edge: Criteria changed after listing | students apply to ineligible awards | Criteria versioning and re-checks
edge: Historical winner bias favours privileged profiles | past winners skew toward privileged profiles so rankings reproduce that unfairness | Fairness constraints and exposure floors
off: NDCG on awarded scholarships ; Eligibility precision
on: Funds awarded per student ; Application completion
gap: Training on historical winners with bias ; Ignoring eligibility errors

== learner-confusion-and-affect-detection | Learner Confusion & Affect Detection | time-series,computer-vision | sub-100ms | production-grade | a=10 k=20
obj: Infer confusion, frustration and boredom from interaction signals (and optional consented video) to adapt help in real time.
loss: \mathcal{L}=\mathrm{CE}(y,p)+\lambda\,\mathrm{Calibration}
con: Privacy and consent (especially minors) ; Interaction-only default ; Cross-cultural validity ; Low false alarms
sn: Signals | Interaction patterns (hesitation, rapid guessing) | Facial emotion recognition | Facial expressions are poor, biased proxies for learning states
sn: Labels | Teacher or self-report labels with noise handling | Single-annotator labels | Affect labels are subjective
sig: Response latency anomaly | time vs personal baseline | Hesitation | Baseline
sig: Rapid-guessing flag | answers faster than reading time | Disengagement | Timing
sig: Help-request pattern | hint requests | Confusion | Event logs
noise: Facial action units alone | weak and biased
noise: Mouse speed | device
base: Teacher observation in class.
prod: Interaction-based sequence model with personal baselines, optional on-device consented video features and conservative intervention policy.
pipe: Interaction events @ client ; Baseline tracker @ per-learner ; Affect model @ sequence model ; Intervention policy @ adaptive help ; Learner UI @ hints ; Teacher view @ dashboard ; Self-report labels @ feedback
edge: Slow readers flagged as confused | unnecessary interruptions | Reading-speed normalisation
edge: Cultural differences in expression | biased predictions | Interaction-only default and subgroup audits
off: Macro-F1 vs self-reports ; Subgroup parity
on: Help acceptance ; Learning gain with adaptive support
gap: Labels from lab settings ; Using faces without validation

== peer-grouping-collaborative-learning | Peer Grouping for Collaborative Learning | graph,tabular | batch | foundational | a=0.01 k=3
obj: Form study groups and pair students to maximise learning and inclusion using skills, schedules and interaction history.
loss: \max\;\sum_g \text{group value}(g)\ \text{s.t. size and schedule constraints}
con: Group-size limits ; Avoid isolating students ; Schedule compatibility ; Teacher control
sn: Composition | Complementary skills with schedule fit | Homogeneous ability grouping | Mixed-skill groups benefit both with scaffolding
sn: Inclusion | Avoid pairing patterns that isolate students | Optimise average score only | Averages hide exclusion
sig: Skill complementarity | difference in mastery profile | Peer benefit | KT
sig: Schedule overlap | shared availability | Feasibility | Calendar
sig: Prior collaboration outcomes | past group success | History | Data
noise: Student name | none
noise: Seat position | weak
base: Random or alphabetical grouping.
prod: Constrained group optimisation (ILP) over complementarity and schedule fit with fairness constraints and teacher adjustments.
pipe: Student profiles @ LMS ; Compatibility scorer @ GBDT ; Group optimiser @ ILP ; Fairness checks @ constraints ; Teacher adjustment @ human ; Group formation @ LMS ; Outcome tracking @ analytics
edge: Absent students break groups | groups too small | Substitution rules and rebalancing
edge: Group conflict | learning stalls | Feedback loop and regrouping triggers
off: Simulated group value and balance ; Teacher acceptance rate
on: Group task outcomes ; Peer-reported collaboration quality
gap: Optimising averages ; No collaboration outcome data

== discussion-forum-qa-and-moderation | Discussion Forum Q&A & Moderation | nlp,llm-agents | sub-100ms | production-grade | a=1 k=3
obj: Auto-answer repeated questions with citations, surface expert answers, and moderate toxic or off-topic posts.
loss: \mathcal{L}=\mathrm{BCE}(\text{toxic},p)+\lambda\,\mathrm{InfoNCE}(\text{question},\text{answer})
con: Age-appropriate moderation ; Accuracy of answers ; Instructor control ; Low false removals
sn: Duplicates | Semantic duplicate detection with linked answers | Keyword search | Duplicates phrase the same doubt differently
sn: Moderation | Contextual toxicity (not word lists) | Profanity filters | Learners discuss sensitive topics legitimately
sig: Question similarity | embedding similarity to past questions | Dedup | Domain tuning
sig: Answer quality votes and instructor tags | endorsements | Trust | Vote bias
sig: Toxicity probability | classifier score | Moderation | Calibration
noise: Post length | weak
noise: Poster name | none
base: Keyword search and manual moderators.
prod: Dual-encoder retrieval with answer ranker, grounded LLM answers on course materials with instructor-approved status, and context-aware moderation.
pipe: New post @ forum ; Moderation classifier @ transformer ; Duplicate retriever @ dual encoder ; Answer ranker @ cross-encoder ; Grounded answer LLM @ course materials ; Instructor approval @ human ; Forum update @ posting
edge: AI answer contradicts the instructor | an automated answer contradicts the instructor's view and confuses learners | Instructor-approved answers take precedence
edge: Sensitive posts (self-harm) hidden by moderation | missed support need | Safeguarding escalation path
off: Duplicate retrieval MRR ; Moderation F1
on: Time to first answer ; Instructor workload
gap: Training on toxic data from other domains ; No check of AI answer correctness

== doubt-ticket-routing | Doubt & Help Ticket Routing | nlp | sub-100ms | foundational | a=0.5 k=3
obj: Route student doubts to the best available teacher or TA by topic and expertise, minimising wait and improving resolution.
loss: \mathcal{L}=\mathrm{CE}_{\text{topic}}+\lambda\,\mathrm{Assignment\ cost}
con: SLA targets ; Teacher availability ; Fair load distribution ; Language preferences
sn: Matching | Match topic, language and teacher expertise | Round robin | Wrong expert wastes time
sn: Load | Account for load and SLA | Best expert for all | Overloads the top experts
sig: Topic classification | topic probabilities | Routing | Taxonomy
sig: Teacher expertise vector | past resolutions per topic | Matching | History
sig: Current queue load | pending tickets | Capacity | Real-time
noise: Student name | none
noise: Ticket length | weak
base: Round-robin assignment by subject.
prod: Topic and language classifier with an assignment optimiser balancing expertise, load and SLA, plus automated first-response suggestions.
pipe: Ticket intake @ app ; Topic and language classifier @ transformer ; Expertise lookup @ teacher profiles ; Assignment optimiser @ min-cost matching ; Teacher inbox @ human ; Resolution feedback @ ratings ; Reassign rules @ SLA monitor
edge: Exam-eve surge | a surge the night before exams floods the queue and response times explode | Surge staffing alerts and auto-triage
edge: Misclassified topic sends to wrong teacher | slow resolution | Quick reassignment and confidence-based triage
off: Routing accuracy and resolution time ; SLA breach rate
on: Time to first response ; Resolution satisfaction
gap: Teacher feedback biased ; Ignoring load fairness

== gamification-reward-optimization | Gamification & Reward Optimisation | reinforcement-learning | batch | production-grade | a=2 k=1
obj: Tune badges, streaks and rewards to increase sustained learning effort without manipulative or anxiety-inducing design.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t(\text{learning minutes}_t-\kappa\,\text{anxiety signals}_t)\right]
con: Ethical design for minors ; Intrinsic motivation ; Fairness ; Long-term retention
sn: Objective | Learning outcomes and wellbeing | Daily active users | DAU optimisation encourages compulsive design
sn: Experimentation | Long holdouts | Short A/B tests | Short tests reward novelty effects
sig: Intrinsic engagement proxy | voluntary extra practice | Healthy motivation | Definition
sig: Streak anxiety indicators | drop-off after breaking a streak | Harm | Event patterns
sig: Learning-gain surrogate | mastery change | Outcome | KT
noise: Badge count | vanity metric
noise: Session length | not learning
base: Fixed points per activity and streak bonuses.
prod: Contextual bandit over reward schemes with wellbeing guardrails, long holdouts and learning-gain reward.
pipe: Activity events @ stream ; Learner features @ store ; Reward policy @ bandit ; Wellbeing guardrail @ constraints ; Reward delivery @ app ; Experiment platform @ long holdouts ; Learning outcomes @ assessments
edge: Rewards crowd out intrinsic motivation | engagement drops when rewards stop | Fade rewards and measure post-removal behaviour
edge: Streak break leads to churn | learners who lose a streak give up entirely, creating a visible drop-off spike | Streak freeze mechanics tested with guardrails
off: Off-policy estimate of learning gain ; Guardrail violations
on: Learning gain per active week ; 90-day retention
gap: Rewarding time-on-app ; Short experiments only

== placement-test-and-cold-start-onboarding | Placement Test & Cold-Start Onboarding | tabular,reinforcement-learning | sub-100ms | production-grade | a=0.3 k=2
obj: Estimate a new learner's level in a few questions to place them in the right starting content and initialise the learner model.
loss: \min\;\mathbb{E}\!\left[(\hat\theta-\theta)^2\right]\ \text{subject to a question budget}
con: Under 10 questions ; Frustration risk ; Multiple skills ; Cheating resistance
sn: Efficiency | Adaptive placement via expected information gain | Fixed placement form | Fixed forms waste questions
sn: Prior | Use registration context as a prior | Start from zero knowledge | Priors cut questions needed
sig: Expected information gain per item | EIG of next question | Selection | IRT
sig: Prior from age and grade | demographic prior | Initial ability | Consent
sig: Response time pattern | time per response | Guessing | Timing
noise: Device type | weak
noise: Time of day | weak
base: Fixed 20-question placement test.
prod: Bayesian adaptive placement with IRT item bank, informative priors and early stopping, feeding KT initialisation.
pipe: Registration data @ app ; Prior builder @ priors ; Item selector @ EIG ; Ability estimator @ Bayesian update ; Stopping rule @ precision ; Learner model init @ KT ; Placement outcome @ analytics
edge: Learners guess randomly | ability overestimated | Guessing models and response-time filters
edge: Anxious learners abandon the test | lost onboarding | Friendly pacing and early-exit rules
off: Placement accuracy vs full test ; Questions to target precision
on: Day-7 retention ; Early mastery gain
gap: Evaluating on motivated volunteers ; Ignoring guessing

== mastery-curriculum-sequencing-rl | Mastery-Based Curriculum Sequencing | reinforcement-learning | batch | staff-principal | a=0.1 k=3
obj: Learn long-horizon curriculum sequences that maximise mastery across a skill graph, accounting for prerequisites and forgetting.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t\,\Delta\mathrm{mastery}_t\right]\ \text{s.t. prerequisite DAG}
con: Offline learning from logs ; Safety (no harmful sequences) ; Interpretability for teachers ; Simulators are imperfect
sn: Evaluation | Off-policy evaluation with simulators validated on data | Trust the simulator | Student simulators are crude
sn: Safety | Conservative offline RL | Online exploration on children | Experiments must be low-risk
sig: Prerequisite readiness | mastery of parent skills | Gate | DAG
sig: Forgetting-adjusted mastery | decayed mastery | Review timing | Memory model
sig: Expected gain of an activity | model-estimated gain | Reward | KT
noise: Activity popularity | feedback loop
noise: Learner ID | none
base: Fixed curriculum order.
prod: Conservative offline RL (CQL) with KT-based state, prerequisite masks and teacher-in-the-loop constraints.
pipe: Learner logs @ lakehouse ; Learner state @ KT features ; Offline RL trainer @ CQL ; Safety constraints @ prerequisite masks ; Policy service @ sequencing API ; Teacher review @ human ; A/B and holdouts @ outcomes
edge: Distribution shift when the policy changes behaviour | value estimates wrong | Pessimism and gradual rollout with monitoring
edge: Simulator optimism | policy looks better than real | Validate on randomised pilots
off: Doubly robust value estimate ; Prerequisite violation rate
on: Mastery gain vs control ; Teacher override rate
gap: Simulator trained on the same logs as the policy ; Ignoring confounding by teacher assignment

== learning-outcome-uplift-modeling | Learning Outcome Uplift Modelling | tabular | batch | staff-principal | a=0.05 k=3
obj: Estimate which learners benefit from which interventions (tutoring, nudges, resources) to allocate scarce support effectively.
loss: \hat\tau(x)=\mathbb{E}[Y(1)-Y(0)\mid x]\ \text{via causal forests}
con: Randomised pilots ; Ethical allocation ; Small samples ; Explainability to educators
sn: Allocation | Allocate by estimated benefit and need | Highest predicted risk | The highest risk may not benefit
sn: Ethics | Equity-aware allocation | Pure efficiency | Efficiency can neglect disadvantaged groups
sig: Pre-intervention mastery | baseline mastery | Heterogeneity | Window
sig: Engagement history | prior engagement | Responsiveness | Window
sig: Context variables | class and school context | Moderators | Data
noise: Post-intervention variables | collider bias
noise: Teacher ID | personal
base: Provide support to the lowest-scoring students.
prod: Causal forests on randomised pilots with equity constraints and policy-learning for allocation.
pipe: Pilot data @ randomised trials ; Feature builder @ Spark ; Uplift model @ causal forest ; Policy learner @ allocation ; Equity check @ constraints ; Educator decision @ human ; Outcome follow-up @ assessments
edge: Small pilots produce noisy effects | unstable allocation | Shrinkage and uncertainty-aware allocation
edge: Intervention spillover to peers | treated students share help with untreated peers, biasing the estimated effect | Cluster randomisation
off: Qini or policy value on holdout ; CI coverage
on: Learning gain per support hour ; Equity metrics
gap: Using observational assignment data ; Ignoring spillover

== accessibility-alt-text-and-captioning | Accessibility: Alt Text & Content Adaptation | computer-vision,nlp | seconds | production-grade | a=0.1 k=500
obj: Generate high-quality alt text for educational images, diagrams and equations and adapt content for learners with disabilities.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{image,context})+\lambda\,\mathrm{Hallucination}
con: WCAG compliance ; Accurate STEM diagram descriptions ; Human review for exams ; Multilingual
sn: Context | Alt text conditioned on lesson context | Generic captions | A graph needs its trend described not "a chart"
sn: Accuracy | Verify numbers and relationships | Fluent descriptions | Wrong descriptions mislead blind learners
sig: Diagram type classifier | chart, circuit, geometry | Description template | Taxonomy
sig: OCR and equation parse | text and math in image | Content | OCR quality
sig: Description factuality | consistency with data/tables | Safety | Source data
noise: Image file name | none
noise: Image size | weak
base: Manual alt text by instructors.
prod: Diagram-aware captioning with OCR and chart parsing, structured descriptions and human review for assessments.
pipe: Content images @ CMS ; Diagram classifier @ CNN ; OCR and chart parser @ vision ; Description generator @ VLM ; Factuality check @ data consistency ; Accessibility reviewer @ human ; Publish @ LMS
edge: Complex diagrams (circuits) mis-described | learners misled | Specialist templates and mandatory review
edge: Exam images reveal answers in alt text | descriptions of exam images reveal the answers to sighted and unsighted learners alike | Exam mode with controlled descriptions
off: Human-rated description usefulness ; Numeric accuracy
on: Accessibility issue backlog ; Learner feedback
gap: Evaluated on photos not diagrams ; Judging fluency not accuracy

== child-safe-content-filtering | Child-Safe Content Filtering | nlp,computer-vision | sub-100ms | production-grade | a=10 k=20
obj: Filter text, images and chat in learning environments for age-inappropriate and unsafe content, with low over-blocking of educational material.
loss: \mathcal{L}=\sum_k w_k\,\mathrm{BCE}(y_k,p_k)
con: Age bands ; Legal compliance (COPPA, GDPR-K) ; Educational context (biology, history) ; Fast inline decisions
sn: Context | Educational-context-aware moderation | Keyword blocklists | Blocklists block biology and history lessons
sn: Escalation | Safeguarding signals routed to staff | Block and forget | Disclosures of harm require human follow-up
sig: Category scores by age band | age-conditioned policy | Appropriate thresholds | Policy definition
sig: Educational-context score | topic and source trust | Reduce over-blocking | Classifier
sig: Contact-risk signals | adult-to-minor patterns | Grooming risk | Privacy
noise: Message length | weak
noise: Emoji count | weak
base: Keyword blocklists and manual moderation.
prod: Multimodal classifiers with age-band thresholds, educational-context scoring and a safeguarding escalation pipeline with trained staff.
pipe: Content and chat @ platform ; Text and image classifiers @ multimodal models ; Context scorer @ topic model ; Age-band policy @ thresholds ; Safeguarding queue @ trained staff ; Parent and teacher controls @ settings ; Audit log @ compliance
edge: Medical biology textbook flagged | learning blocked | Educational-source allow-lists and context scoring
edge: Coded language among teens | coded slang among teenagers evades filters and risky content is missed | Continuous lexicon updates with moderator feedback
off: Per-category precision and recall ; Over-blocking rate on curriculum content
on: Unsafe content exposure ; Educator complaints about over-blocking
gap: Test data without educational content ; Ignoring age-band differences

== student-pii-redaction-learning-data | Student PII Redaction in Learning Data | nlp | batch | foundational | a=0.1 k=5
obj: Remove or pseudonymise student PII in submissions, chats and transcripts before using them for analytics or model training.
loss: \mathcal{L}=\mathrm{CE}_{\text{NER}}+\lambda\,\mathrm{RecallBoost}
con: FERPA / GDPR compliance ; Recall over 99% on direct identifiers ; Consistent pseudonyms ; Multilingual
sn: Recall | Recall-first redaction with rule backstops | Balanced F1 | A missed name is a privacy breach
sn: Utility | Consistent pseudonyms | Replacing with tags | Consistency preserves analytic value
sig: NER entity probabilities | token confidence | Recall tuning | Calibration
sig: Student roster match | names from the class roster | High-precision catch | Roster freshness
sig: Contextual identifiers | school, teacher and location mentions | Re-identification | Rules
noise: Text length | weak
noise: Language | weak
base: Regex and dictionary scrubbing.
prod: Transformer NER ensemble with roster-based matching, consistent pseudonymisation and sampled human audits.
pipe: Data export @ LMS ; Normaliser @ cleaning ; NER ensemble @ transformer ; Roster matcher @ lookup ; Pseudonymiser @ consistent mapping ; Audit sampler @ human ; Analytics release @ data warehouse
edge: Common-word names (Rose, Hope) | missed or over-redacted | Roster priors and context-aware NER
edge: Indirect identifiers combine into re-identification | combinations of school, class and event details allow re-identification of a student | k-anonymity and quasi-identifier checks
off: Entity recall by type ; Re-identification risk estimates
on: PII leaks in audits ; Data availability for analytics
gap: Evaluation on synthetic names ; Ignoring quasi-identifiers

== grading-triage-for-teacher-workload | Grading Triage & Teacher Workload Optimisation | nlp,tabular | batch | foundational | a=0.1 k=4
obj: Prioritise which student work teachers should grade manually and which can be auto-graded or sampled, reducing workload without hurting quality.
loss: \min\;\text{manual hours}\ \text{s.t. grading error}\le\epsilon
con: Quality assurance sampling ; Teacher trust ; Student appeals ; Edge cases flagged
sn: Triage | Confidence-based routing with audited samples | Auto-grade everything | Unchecked errors compound
sn: Audit | Random audits of auto-graded items | Trust model confidence | Confidence drifts silently
sig: Grader confidence | calibrated confidence | Routing | Calibration
sig: Item type risk | stakes of the assessment | Policy | Metadata
sig: Disagreement across graders | ensemble disagreement | Flag | Models
noise: Student name | bias
noise: Submission time | weak
base: Teachers grade everything manually.
prod: Calibrated multi-grader ensemble with risk-tiered routing and random audit sampling, teacher dashboards for overrides.
pipe: Submissions @ LMS ; Auto-graders @ rubric models ; Confidence calibrator @ isotonic ; Routing policy @ risk tiers ; Teacher queue @ human ; Audit sampler @ random ; Grade publication @ SIS
edge: Model drifts on new question types | auto grades silently worse | Audit sampling alarms and per-type calibration
edge: High-stakes exam items | must be human-graded | Risk tiers with mandatory human review
off: Grading error vs experts at routing thresholds ; Calibration
on: Teacher hours saved ; Appeal rate
gap: Evaluating on easy items ; Auditing only flagged items

== oral-exam-viva-llm | Oral Exam & Viva Assessment with LLMs | llm-agents,nlp | seconds | staff-principal | a=0.02 k=300 s=4 t=250
obj: Conduct structured oral assessments where an AI asks follow-up questions to probe understanding, with transcripts graded by rubric and reviewed by instructors.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{rubric,dialogue})+\lambda\,\mathrm{RubricMisalign}
con: Fairness across accents ; Consent for recording ; Instructor review of scores ; Anti-cheating
sn: Probing | Adaptive follow-ups to test depth | Static question list | Adaptive questioning is harder to prepare for or fake
sn: Fairness | Score content not accent or fluency | Holistic impressions | Accent bias affects ASR and judgments
sig: Rubric criterion evidence | transcript spans per criterion | Scoring | Transcript quality
sig: Follow-up depth reached | levels of probing | Understanding | Dialogue
sig: ASR confidence | word-level confidence | Reliability | Calibration
noise: Speaking speed | not understanding
noise: Filler words | not understanding
base: Instructors conduct oral exams individually.
prod: Voice dialogue agent with rubric-driven adaptive probing, accent-robust ASR, transcript-based scoring and instructor review.
pipe: Student audio @ exam client ; Streaming ASR @ accent-robust ; Dialogue agent @ LLM with rubric ; Follow-up policy @ depth controller ; Transcript scorer @ rubric model ; Instructor review @ human ; Appeals @ human
edge: ASR errors on technical terms | student penalised for transcription errors | Show transcript to instructors with low-confidence highlights
edge: Student attempts to manipulate the agent | inflated scoring | Prompt-injection defences and instructor review
off: Agreement with instructor scores ; Accent-group score parity
on: Instructor hours saved ; Student fairness perception
gap: Calibrated on a few instructors ; ASR errors ignored in evaluation

== code-plagiarism-detection | Source-Code Plagiarism Detection | nlp,graph | batch | foundational | a=0.05 k=8
obj: Detect collusion and copying in programming assignments robustly to renaming and restructuring, with evidence for review.
loss: \mathcal{L}=\mathrm{Triplet}(\text{same logic})+\lambda\,\mathrm{BCE}
con: Common starter code ; Obfuscation ; Fair investigations ; Scale to large courses
sn: Structure | AST and data-flow similarity | Token or text similarity | Renaming defeats text similarity
sn: Baseline | Remove starter code and common solutions | Raw similarity | Short problems have many identical solutions
sig: AST subtree similarity | normalised AST matches | Copying | Normalisation
sig: Rare-structure overlap | shared unusual constructs | Collusion | Corpus statistics
sig: Submission-time proximity | timing of similar submissions | Collusion | Timestamps
noise: Variable names | easily changed
noise: Comments | easily changed
base: MOSS-style winnowing token fingerprints.
prod: AST and data-flow embeddings with rarity weighting, starter-code removal and instructor-facing evidence diffs.
pipe: Submissions @ LMS ; Starter-code remover @ diff ; AST normaliser @ parser ; Similarity model @ code embeddings ; Rarity weighting @ corpus stats ; Instructor review @ human ; Case outcomes @ labels
edge: Highly constrained tiny assignments | many unavoidable matches | Problem-level baselines and rarity weighting
edge: AI-generated solutions similar across students | false collusion flags | Provenance evidence and instructor judgment
off: Precision and recall on seeded and adjudicated cases ; Evidence quality
on: Confirmed cases per flagged ; Instructor review time
gap: Seeded plagiarism too simple ; Ignoring common solutions

== classroom-vision-engagement-analytics | Classroom Engagement Analytics (Vision) | computer-vision | seconds | staff-principal | a=0.05 k=5000
obj: Provide teachers with class-level engagement and participation insights from privacy-preserving, on-device video analysis.
loss: \mathcal{L}=\mathrm{CE}(\text{activity},p)
con: Strict privacy (no individual identification) ; Consent from parents ; On-device processing ; No student ranking
sn: Privacy | Aggregate, on-device, non-identifying metrics | Cloud video analysis of individuals | Individual surveillance harms trust and wellbeing
sn: Validity | Validate against learning outcomes | Engagement scores as truth | Attention posture is a weak proxy for learning
sig: Class-level activity mix | proportion in discussion/work/lecture | Context | Classifier
sig: Teacher-student interaction rate | interaction events | Participation | Detection
sig: Aggregate head-orientation distribution | class-level only | Attention proxy | Aggregation
noise: Individual facial expressions | invalid and invasive
noise: Seating position | weak
base: Teacher self-observation and occasional peer observation.
prod: On-device activity recognition producing only aggregate, anonymised class-level metrics with strict retention and teacher-controlled usage.
pipe: Classroom camera @ edge device ; On-device detector @ pose model ; Aggregate computation @ privacy layer ; Class-level metrics @ dashboard ; Teacher reflection @ human ; Governance review @ school board ; Outcome correlation @ research
edge: Parents object to cameras | programme must stop | Opt-in consent and non-camera alternatives
edge: Metrics misused to evaluate teachers | harmful incentives | Governance policy limiting use and aggregated reporting
off: Activity-classification accuracy ; Privacy audit (no re-identification)
on: Teacher reflection usage ; Correlation with learning outcomes
gap: Engagement proxies unvalidated ; Evaluating on staged classes

== adaptive-reading-text-simplification | Adaptive Reading & Text Simplification | nlp,llm-agents | seconds | production-grade | a=1 k=5 s=2 t=300
obj: Adapt reading passages to each learner's reading level while preserving meaning, with vocabulary supports and comprehension checks.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x,\text{level})+\lambda\,\mathrm{MeaningDrift}
con: Meaning preservation ; Grade-level control ; Copyright ; Dyslexia-friendly formats
sn: Meaning | Verify simplified text preserves key facts | Fluent simplification | Simplification can drop or alter facts
sn: Level | Controlled readability with a validated metric | Readability formulas | Formulas poorly reflect actual difficulty
sig: Reading-level estimate | model-based readability | Level match | Calibration
sig: Key-fact retention | NLI-checked fact coverage | Fidelity | Fact extraction
sig: Vocabulary-support coverage | glossed difficult words | Support | Lexicon
noise: Sentence count | weak
noise: Passage length | weak
base: Leveled readers prepared by publishers.
prod: Level-conditioned simplification with fact-retention verification, vocabulary glosses and comprehension question generation.
pipe: Source passage @ content bank ; Level estimator @ reading model ; Simplifier @ LLM ; Fact-retention checker @ NLI ; Vocabulary glosser @ lexicon ; Teacher approval @ human ; Learner comprehension @ analytics
edge: Simplification removes critical nuance | misleads learners | Fact-retention verifier and teacher review for key texts
edge: Poetry and literary text | meaning changes with simplification | Content-type guardrails to avoid simplifying literature
off: Fact retention rate ; Level accuracy vs human raters
on: Comprehension scores ; Reading time
gap: Evaluating fluency not fidelity ; Ignoring literary text

== vocabulary-level-estimation | Vocabulary Size & Level Estimation | tabular,nlp | sub-100ms | foundational | a=0.2 k=2
obj: Estimate a learner's vocabulary size and unknown words quickly to select appropriate texts and drills.
loss: \mathcal{L}=\sum_w\mathrm{BCE}(k_w,\hat p_w)\quad\hat p_w=\sigma(\theta-b_w)
con: Few test items ; Word frequency bias ; L1 transfer ; Quick onboarding
sn: Model | Estimate item response by word frequency and cognates | Self-reported knowledge | Self-assessment is inflated
sn: Transfer | Account for first-language cognates | Frequency only | Cognates inflate knowledge for some L1s
sig: Word frequency band | log frequency | Difficulty | Corpus
sig: Cognate indicator | L1-L2 similarity | Transfer | Dictionaries
sig: Response time | time to respond | Knowledge confidence | Timing
noise: Word length | weak
noise: Part of speech | weak
base: Standard vocabulary level tests (fixed words).
prod: Adaptive yes/no and meaning-recall tasks with a Bayesian word-knowledge model per learner, L1-aware priors and pseudo-word correction.
pipe: Test items @ adaptive selector ; Response collector @ app ; Word-knowledge model @ Bayesian IRT ; Pseudo-word correction @ guess adjustment ; Level report @ learner profile ; Text recommender @ downstream ; Longitudinal updates @ learner model
edge: Learners overclaim knowledge | learners claim to know words they do not, inflating the estimated vocabulary size | Pseudo-word penalties
edge: L1 with no data | a first language with no data gives poor priors and wrong estimates at the start | Language-family priors and quick updating
off: Prediction of held-out word knowledge ; Correlation with proficiency tests
on: Text-difficulty match ; Learning gain
gap: Frequency bands only ; No L1 variation

== credential-fraud-verification | Credential & Certificate Fraud Detection | computer-vision,nlp,graph | seconds | production-grade | a=0.02 k=900
obj: Detect forged diplomas, transcripts and certificates in admissions and hiring flows by combining document forensics, issuer verification and network signals.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Issuer database coverage ; Privacy ; Cross-border documents ; Low false positives for genuine applicants
sn: Verification | Verify with issuer systems and signatures first | Visual forensics alone | A perfect forgery passes visual checks
sn: Network | Diploma-mill and repeated-template detection | Single-document view | Mills issue thousands of similar documents
sig: Issuer verification result | direct verification status | Strongest evidence | API availability
sig: Template conformity | font and layout vs issuer template | Forgery | Template library
sig: Diploma-mill match | institution accreditation and mill list | Risk | Data freshness
noise: Document colour | scan
noise: Paper texture photo | scan
base: Manual verification by calling institutions.
prod: Document forensics, issuer API and digital-signature checks, institution graph for mills, and human review of uncertain cases.
pipe: Document upload @ applicant portal ; Forensics model @ tamper detector ; Issuer verification @ API and signatures ; Institution graph check @ accreditation data ; Risk scorer @ GBDT ; Verification specialist @ human ; Outcomes @ labels
edge: Institution closed or merged | genuine document cannot be verified | Historical registry and alternative verification channels
edge: New digital credential formats | new digital credential formats have no templates and verification coverage drops | Verifiable-credential standards and format onboarding
off: Forgery detection recall at low FP ; Verification coverage
on: Fraudulent credentials caught ; Verification turnaround
gap: Synthetic forgeries differ from real ones ; Bias toward institutions with APIs

== learning-analytics-teacher-insights | Teacher Dashboard Insights & Alerts | tabular,llm-agents | seconds | foundational | a=0.5 k=5 s=3 t=300
obj: Summarise class and student learning data into prioritised, actionable insights for teachers, such as who needs help on which concept.
loss: \mathcal{L}=\mathrm{RankLoss}(\text{insights by teacher action})
con: Teacher time budget ; Accuracy of insights ; Privacy ; Explainability
sn: Actionability | Insights tied to an action and a student group | Dashboards of raw metrics | Teachers lack time to interpret raw charts
sn: Priority | Rank by expected learning impact | Rank by anomaly score | Anomalies may not matter educationally
sig: Concept-level class mastery gaps | share below mastery by concept | Reteach target | KT
sig: At-risk student cluster | similar struggle patterns | Small-group intervention | Clustering
sig: Insight usefulness score | teacher acts on insight | Feedback | Logging
noise: Raw clicks | noise
noise: Login counts | weak
base: Static dashboards with filters.
prod: Insight generation over mastery data with impact ranking, LLM narrative with data citations and feedback-driven ranking.
pipe: Learning data @ lakehouse ; Mastery and clustering @ analytics ; Insight generator @ rules and models ; Impact ranker @ GBDT ; Narrative writer @ LLM with citations ; Teacher view @ dashboard ; Action logging @ feedback
edge: Small classes produce noisy insights | misleading alerts | Minimum-sample rules and uncertainty
edge: LLM narrative misstates a statistic | teacher acts on wrong info | Numbers computed by tools and cited in text
off: Insight precision rated by teachers ; Narrative numeric accuracy
on: Insights acted on ; Student outcomes in classes using insights
gap: Rating insights without outcome follow-up ; Not testing small classes
