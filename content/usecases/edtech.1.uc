# EdTech, part 1 (use cases 1-25)
== knowledge-tracing-student-modeling | Knowledge Tracing & Student Modelling | time-series,tabular | sub-100ms | production-grade | a=25 k=1
obj: Estimate each learner's evolving mastery per skill from their answer history to drive practice selection and progress reports.
loss: \mathcal{L}=-\sum_t\left[y_t\log \hat p_t+(1-y_t)\log(1-\hat p_t)\right]
con: Update after every answer in under 30 ms ; Millions of learners ; Interpretable mastery per skill ; Cold-start for new skills
sn: Model | Interpretable BKT/PFA or attention-based KT with skill mapping | Deep model without skill structure | Opaque models predict next answers but can't explain mastery
sn: Leakage | Split by student and by time | Random interaction splits | Random splits leak a student's own future answers
sn: Calibration | Mastery probabilities calibrated per skill | Raw model scores shown to learners as mastery | An overconfident 95% that is really 70% makes the tutor stop practice too early
sn: Practice selection | Treating practice choice as depending on the model itself | Assuming answers come from random exercises | The tutor gives weak skills more practice, so naive accuracy comparisons across skills mislead
sig: Recent correctness with recency weighting | exponentially weighted correct rate per skill | Estimates how well the learner knows the skill right now | Order by timestamp not insertion
sig: Item difficulty parameter | IRT difficulty of the question | Separates easy from hard | Calibrate on other students
sig: Time-since-last-practice | gap since skill practice | Captures forgetting, so mastery decays between sessions | Use server-side timestamps because device clocks drift
sig: Prior failures on the skill | count of earlier wrong answers on the same skill | Persistent difficulty is among the strongest predictors of the next miss | Count only answers given before the current one
sig: Question difficulty from other learners | smoothed correct rate of the question among training students | Separates hard questions from weak learners | Compute on training students only, never including the learner being scored
noise: Student ID embedding | memorises individuals, fails for new students
noise: Total questions answered | confounded with engagement
noise: Session length in minutes | reflects when the learner logged in rather than what they know
base: Bayesian Knowledge Tracing per skill with fitted guess and slip.
prod: Attentive knowledge tracing (SAKT/AKT) with IRT-style item embeddings and forgetting, distilled to a small online model with state cached per learner.
pipe: Answer event stream @ Kafka ; Learner state cache @ Redis ; KT model @ attention model on CPU ; Mastery calibrator @ isotonic ; Practice selector @ downstream service ; Progress API @ app ; Interaction logs @ lakehouse
edge: New curriculum remaps skills | historical mastery becomes mislabelled | Skill-mapping versioning and mastery migration jobs
edge: Shared device with multiple siblings | one learner's mastery polluted by another | Profile switching UI and anomaly detection on response patterns
edge: Learner returns after a long break | mastery estimates are stale and overconfident | Decay mastery by time since practice and ask a short diagnostic before assigning new work
edge: Guessing on multiple-choice questions | correct answers overstate mastery | Model guess and slip rates per item type and require consistent success before declaring mastery
off: AUC and RMSE on next-response prediction (student-split) ; Calibration by skill
on: Learning gain per hour ; Practice efficiency
gap: Predicting next answers with student leakage ; Ignoring that practice choice depends on the model

== adaptive-learning-path-recommendation | Adaptive Learning Path Recommendation | recommender,reinforcement-learning | sub-100ms | production-grade | a=20 k=2
obj: Recommend the next activity for each learner that maximises mastery gain while sustaining engagement and respecting prerequisites.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t \gamma^t\,\Delta\text{mastery}_t\right]\ \text{s.t. prerequisites}
con: Prerequisite graph ; Curriculum standards ; 50 ms ; Explainable to teachers
sn: Objective | Learning gain (mastery delta) | Click-through or time-on-task | Engagement-optimised paths are entertaining but don't teach
sn: Structure | Prerequisite graph constraints | Pure collaborative filtering | CF suggests popular content the learner isn't ready for
sig: Zone of proximal development fit | probability of success near 70% | Productive difficulty | Calibrated KT
sig: Prerequisite satisfaction | mastery of required skills | Readiness | Graph
sig: Recent frustration indicators | quick abandon and repeated failures | Fatigue | Event features
noise: Content popularity | rich-get-richer
noise: Device type | weak
base: Fixed sequence by curriculum with teacher assignments.
prod: Contextual bandit over eligible activities using KT mastery estimates, prerequisite masks and learning-gain reward from pre/post assessments.
pipe: Learner state @ KT service ; Eligible activity filter @ prerequisite graph ; Candidate scorer @ GBDT ; Bandit policy @ Thompson sampling ; Teacher constraints @ rules ; Activity delivery @ app ; Learning-gain labels @ assessments
edge: Mastery estimates wrong for a learner | path too easy or too hard | Confidence-aware selection and diagnostic checks
edge: Teacher assigns different content | system and teacher fight | Teacher-in-the-loop overrides honoured as constraints
off: Off-policy estimate of learning gain ; Prerequisite violation rate
on: Mastery gain per week ; Completion and retention
gap: Optimising engagement instead of learning ; Offline evaluation with confounded assignments

== irt-calibration-and-adaptive-testing | IRT Item Calibration & Computerised Adaptive Testing | tabular | sub-100ms | staff-principal | a=3 k=1
obj: Calibrate item parameters from response data and run adaptive tests that estimate ability precisely with fewer questions.
loss: \mathcal{L}=-\sum_{i,j}\left[y_{ij}\log P_{ij}+(1-y_{ij})\log(1-P_{ij})\right],\ P_{ij}=c_j+\frac{1-c_j}{1+e^{-a_j(\theta_i-b_j)}}
con: Test security and item exposure control ; Fairness (DIF) ; Real-time item selection ; Psychometric defensibility
sn: Selection | Maximum-information selection with exposure control | Random or fixed forms | Adaptive tests need 40-60% fewer items
sn: Fairness | Differential item functioning analysis | Overall accuracy | Biased items disadvantage groups
sig: Item information at current ability | Fisher information of item | Selection | Ability estimate precision
sig: Item exposure rate | share of test-takers seeing the item | Security | Sympson-Hetter control
sig: DIF statistic by group | Mantel-Haenszel or IRT-based | Fairness | Group definitions
noise: Test-taker ID | none
noise: Item position effects | calibrate separately
base: Fixed-form tests scored by number correct.
prod: 3PL/GPCM calibration with Bayesian estimation, CAT with content balancing and exposure control, and DIF monitoring for all items.
pipe: Response data @ test platform ; Item calibration @ Bayesian IRT ; Ability estimator @ EAP ; Item selector @ max-information with constraints ; Exposure controller @ Sympson-Hetter ; Score reporter @ psychometrics ; DIF monitor @ analysis
edge: Items leaked online | item parameters drift and scores inflate | Exposure monitoring and rapid item retirement
edge: Small calibration samples for new items | unstable parameters | Pretest items in unscored slots with sequential calibration
off: Standard error of ability at test length ; Item fit statistics
on: Test length for target precision ; Score validity evidence
gap: Calibrating on self-selected samples ; Ignoring DIF

== automated-essay-scoring | Automated Essay Scoring | nlp | seconds | production-grade | a=0.05 k=6
obj: Score essays against rubrics with human-level agreement and give actionable feedback, with transparency and fairness.
loss: \mathcal{L}=\mathrm{OrdinalMSE}(y,\hat y)+\lambda\,\mathrm{RubricTraitLoss}
con: Agreement with expert raters (QWK) ; Bias auditing across groups ; Gaming resistance ; Teacher override
sn: Traits | Trait-level scoring (organisation, evidence, language) | Single holistic score | Students and teachers need diagnostic feedback
sn: Robustness | Test against adversarial and off-topic essays | Agreement on typical essays | Models reward length and big words
sig: Rubric trait scores | multi-head trait predictions | Feedback | Annotated rubric
sig: Discourse coherence features | coherence model score | Organisation | Parser quality
sig: Prompt relevance | semantic match to the prompt | Off-topic detection | Embeddings
noise: Essay length alone | gameable
noise: Rare word counts | gameable
base: Feature-based regression on length, grammar and vocabulary.
prod: Fine-tuned transformer with trait heads plus an adversarial detector, calibrated against multi-rater consensus, with human review for low confidence.
pipe: Essay submission @ LMS ; Preprocessing @ cleaning ; Trait scorer @ fine-tuned encoder ; Adversarial detector @ classifier ; Calibration and confidence @ ordinal ; Teacher review @ human ; Rater labels @ feedback
edge: Essay topics change between years | score distribution shifts | Prompt-specific calibration and anchor essays
edge: Students learn to game surface features | scores inflate without quality | Adversarial training and gaming detectors
off: Quadratic weighted kappa vs raters ; Subgroup score differences
on: Teacher time saved ; Student revision quality
gap: Training on single-rater scores ; Not testing bias across dialects

== short-answer-grading-llm | Short-Answer Grading with LLMs | llm-agents,nlp | seconds | production-grade | a=0.2 k=3 s=2 t=200
obj: Grade free-text answers against rubrics with explanations, giving consistent scoring and instant feedback at scale.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{rubric},\text{answer})
con: Consistency across runs ; Rubric-grounded reasoning ; Teacher audit ; Student appeals
sn: Rubric | Rubric-conditioned grading with reference answers | Free-form LLM grading | Free-form grading is inconsistent across runs
sn: Calibration | Calibrate to human graders per question | Trust model scores | LLMs are lenient on fluent wrong answers
sig: Rubric-criterion match | per-criterion judgment | Transparency | Rubric design
sig: Grader agreement with teachers | kappa per question | Reliability | Sample
sig: Self-consistency across samples | agreement over 3 runs | Stability | Sampling
noise: Answer length | not correctness
noise: Student writing style | bias
base: Keyword matching and regex rubrics.
prod: Criterion-level LLM grading with reference answers, self-consistency checks, per-question calibration on teacher-graded samples and an appeals path.
pipe: Answer intake @ LMS ; Rubric loader @ question bank ; Grader LLM @ structured output ; Self-consistency check @ multiple samples ; Calibration layer @ per-question ; Teacher spot-check @ human ; Appeals @ human
edge: Unconventional but correct answers | marked wrong against reference | Low-confidence routing and rubric updates
edge: Prompt injection inside student answers | inflated scores | Treat answers as data, strip instructions, and structured output only
off: Agreement (QWK) vs teachers ; Run-to-run consistency
on: Time to feedback ; Appeal rate
gap: Rubrics too vague to test ; Calibration data from easy questions

== programming-assignment-feedback-llm | Programming Assignment Feedback | llm-agents,nlp | seconds | production-grade | a=0.3 k=10 s=3 t=300
obj: Give students hints and explanations on code submissions that guide learning without revealing full solutions.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{code,tests})+\lambda\,\mathrm{SolutionLeak}
con: Do not give the full solution ; Reproducible tests ; Safe code execution ; Fast feedback
sn: Hints | Graduated hints tied to failing tests and misconceptions | Rewriting the student's code | Rewriting robs the learning moment
sn: Verification | Run tests in a sandbox and ground hints on failures | LLM reasoning alone | LLMs misjudge program behaviour
sig: Failing test signature | which tests fail and how | Diagnosis | Test design
sig: Misconception classifier | common error pattern match | Targeted hint | Taxonomy
sig: Solution-leak score | similarity of hint to reference solution | Policy | Check
noise: Code style only | not correctness
noise: Variable names | noise
base: Autograder pass/fail output.
prod: Sandboxed test execution, misconception detection and LLM hint generation constrained by a leak checker with hint-level escalation.
pipe: Submission @ LMS ; Sandbox runner @ containers ; Failure analyser @ test traces ; Hint generator @ LLM ; Leak and safety check @ filters ; Student view @ IDE panel ; Learning analytics @ events
edge: Student code tries to escape the sandbox | security incident | Strict sandboxing and resource limits
edge: Hint reveals the whole solution | assignment integrity lost | Leak checker and hint-level limits
off: Hint helpfulness in rated studies ; Leak rate
on: Resubmission success rate ; Time to solve
gap: Evaluating hints on correctness alone ; Ignoring hint abuse patterns

== ai-tutor-socratic | Socratic AI Tutor | llm-agents | seconds | staff-principal | a=3 k=8 s=3 t=250
obj: Provide a tutor that guides learners with questions and scaffolding aligned to curriculum, rather than handing over answers.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{dialogue,curriculum})+\lambda\,\mathrm{AnswerLeak}
con: Age-appropriate safety ; Curriculum-correct content ; Do not leak final answers prematurely ; Teacher visibility
sn: Pedagogy | Scaffolded questioning and misconception handling | Answer-giving chatbot | Handing over answers short-circuits learning
sn: Correctness | Verify maths and facts with tools | LLM arithmetic and recall | Tutors that confidently teach wrong content harm learners
sig: Student mastery estimate | KT mastery state | Adapts difficulty | Calibration
sig: Hint-ladder state | hint level used | Scaffold | Dialogue state
sig: Answer-leak rate | fraction of turns revealing answers early | Pedagogy | Check
noise: Chat length | not learning
noise: Student sentiment alone | not learning
base: Fixed hint sequences per problem.
prod: Tutor LLM with pedagogical policy, KT-informed adaptivity, calculator and verifier tools, safety filters and teacher dashboards.
pipe: Student message @ app ; Safety and age filter @ classifier ; Dialogue manager @ policy ; Tutor LLM @ constrained ; Maths and fact verifier @ tools ; Student response @ stream ; Teacher dashboard @ analytics
edge: Student pastes homework to get the answer | tutor gives full solution | Intent detection and scaffold-only policy
edge: Safety issues disclosed in chat (distress) | a learner discloses distress in chat and the tutor carries on with the lesson, ignoring the safeguarding need | Safeguarding classifier and escalation to staff
off: Pedagogical quality rubric scores ; Answer-leak rate
on: Learning gain vs control ; Teacher-reported usefulness
gap: Judging tutor on helpfulness ratings ; Evaluating without learning outcomes

== math-solution-step-verification | Math Solution Step Verification | llm-agents,nlp | seconds | staff-principal | a=1 k=4 s=3 t=300
obj: Check each step of a student's mathematical working for validity and pinpoint the first error with an explanation.
loss: \mathcal{L}=\mathrm{CE}_{\text{step validity}}+\lambda\,\mathrm{ErrorLocalisation}
con: Formal correctness ; Handwritten and typed input ; Equivalent forms ; Fast feedback
sn: Verification | Symbolic engines verify equivalence of steps | LLM judgement of steps | LLMs accept plausible but invalid steps
sn: Localisation | First-error localisation | Final-answer match | Right answers can follow flawed reasoning
sig: Step equivalence check | CAS equivalence of consecutive steps | Validity | Parsing
sig: Rule-application classifier | which rule was used | Error type | Taxonomy
sig: Solution-path similarity | closeness to valid solution paths | Alternative methods | Graph
noise: Handwriting style | not content
noise: Time per step | weak
base: Final-answer matching.
prod: Math OCR/parsing to expressions, CAS-based step verification, LLM explanations grounded in the failing rule.
pipe: Student work input @ photo or keyboard ; Math parser @ OCR and LaTeX ; Step verifier @ CAS ; Error classifier @ model ; Explanation generator @ LLM ; Student feedback @ UI ; Teacher analytics @ errors
edge: Valid alternative method not in reference | a correct but unconventional method does not match the reference and is marked wrong | Equivalence checking rather than path matching
edge: Handwriting OCR error changes a symbol | false error flagged | OCR confidence and confirm-parse step
off: Step-level accuracy ; First-error localisation accuracy
on: Revision rate after feedback ; Teacher grading time
gap: Test problems from training distribution ; Judging only final answers

== handwritten-exam-ocr-grading | Handwritten Exam OCR & Grading Assistance | computer-vision,nlp | seconds | production-grade | a=0.05 k=1500
obj: Digitise handwritten exam scripts and assist graders by locating answers, reading text and pre-scoring objective parts.
loss: \mathcal{L}=\mathcal{L}_{\text{CTC}}+\lambda\,\mathcal{L}_{\text{layout}}
con: Handwriting diversity ; Strict accuracy for marks ; Grader review ; Privacy of student scripts
sn: Review | Show OCR with confidence so graders verify | Silent auto-grading | OCR errors change marks
sn: Layout | Answer-region detection and question mapping | Full-page OCR | Layout errors assign answers to wrong questions
sig: Region-to-question mapping | layout model confidence | Correct association | Template
sig: OCR confidence per word | calibrated confidence | Review routing | Calibration
sig: Pre-score agreement | auto-score vs grader | Quality | Sample
noise: Paper colour | scan
noise: Pen colour | scan
base: Manual grading of paper scripts.
prod: Layout-aware handwriting recognition with calibrated confidences, auto-marking for objective items, grader UI with highlights.
pipe: Script scanning @ scanner ; Layout detection @ detector ; Handwriting OCR @ transformer ; Auto-marker @ rules ; Confidence router @ review policy ; Grader UI @ human ; Marks export @ SIS
edge: Cross-outs and overwrites | OCR reads the wrong answer | Strike-through detection and low-confidence routing
edge: Scripts scanned crooked or with missing pages | answers mapped wrongly | Page-integrity checks and alignment
off: Word error rate by writer group ; Marks agreement with graders
on: Grading turnaround ; Re-mark rate
gap: Test handwriting from few writers ; Not testing messy scans

== pronunciation-assessment-speech | Pronunciation & Speaking Assessment | nlp,time-series | seconds | production-grade | a=1 k=300
obj: Assess spoken language for pronunciation, fluency and prosody with phoneme-level feedback for learners across accents.
loss: \mathcal{L}=\mathcal{L}_{\text{CTC}}+\lambda\,\mathrm{GOP\ regression}
con: Accent fairness ; Noisy environments ; Low latency feedback ; Child speech
sn: Reference | Score relative to intelligible communication, not a single native accent | Native-accent matching | Penalises legitimate accents
sn: Granularity | Phoneme-level feedback with confidence | Overall score only | Learners need what to fix
sig: Goodness-of-pronunciation per phoneme | GOP scores | Specific errors | Aligner quality
sig: Fluency features | pause patterns, speech rate | Fluency | Segmentation
sig: Prosody contour match | pitch and stress patterns | Naturalness | Normalisation
noise: Speaker gender | bias
noise: Microphone type | channel
base: ASR word-error rate vs target text.
prod: Self-supervised speech encoder with phoneme recognition and GOP scoring, calibrated against human raters across accent groups.
pipe: Audio capture @ app ; VAD and noise suppression @ front end ; Phoneme recogniser @ wav2vec 2.0 ; Pronunciation scorer @ GOP model ; Feedback generator @ rules and LLM ; Learner UI @ feedback ; Rater labels @ calibration
edge: Child speech differs from adult | models trained on adult speech score children unfairly low on pronunciation | Age-specific models and calibration
edge: Noisy classrooms | recognition errors | Noise-robust training and quality checks
off: Correlation with human raters by accent group ; Phoneme error detection F1
on: Speaking improvement per month ; Learner retention
gap: Training mostly on native speakers ; Rater disagreement ignored

== conversational-language-practice-agent | Conversational Language Practice Agent | llm-agents,nlp | seconds | production-grade | a=2 k=6 s=2 t=200
obj: Provide a patient conversation partner that adapts to the learner's level, corrects errors gently and tracks vocabulary growth.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{level,goal})
con: CEFR-level control ; Correction without discouraging ; Cultural sensitivity ; Safe content for minors
sn: Level | Control output complexity to the learner's CEFR level | Native-level responses | Too-hard replies stop learning
sn: Feedback | Selective, delayed correction | Correcting every error | Over-correction reduces willingness to speak
sig: Learner CEFR estimate | model estimate from output | Adaptation | Calibration
sig: Error pattern frequency | recurring error types | Targeted practice | Taxonomy
sig: New-vocabulary exposure | words introduced and retained | Growth | Memory model
noise: Session length | not learning
noise: Learner sentiment | weak
base: Scripted dialogues with multiple-choice responses.
prod: Level-controlled LLM dialogue with error detection, delayed recasts, vocabulary tracking linked to spaced repetition.
pipe: Learner speech or text @ app ; ASR or text input @ front end ; Level estimator @ classifier ; Dialogue LLM @ constrained ; Error detector @ grammar model ; Feedback scheduler @ policy ; Progress store @ learner model
edge: Learner asks off-topic or unsafe questions | agent leaves scope | Scope guardrails and redirect
edge: Dialect and slang mismatch | learner confused | Dialect settings and explanation modes
off: Level-appropriateness rating ; Error detection F1
on: Proficiency gains ; Weekly active practice
gap: Judging by fluency of the bot ; Measuring minutes not proficiency

== reading-fluency-assessment-asr | Reading Fluency Assessment for Children | nlp,time-series | seconds | production-grade | a=0.3 k=200
obj: Measure oral reading fluency (words correct per minute, accuracy) from child audio to identify struggling readers early.
loss: \mathcal{L}=\mathcal{L}_{\text{CTC}}+\lambda\,\mathrm{Alignment}
con: Child speech ASR ; Classroom noise ; Privacy of minors ; Teacher-friendly reports
sn: Alignment | Align reading to known passages | Open-vocabulary ASR | Alignment captures omissions and substitutions
sn: Fairness | Evaluate across dialects and ages | Overall WER | Child and dialect speech differ widely
sig: Words correct per minute | aligned correct words per minute | Fluency | Timing
sig: Miscue types | omissions, substitutions, repetitions | Diagnostics | Alignment
sig: Self-correction rate | self-corrections | Metacognition | Detection
noise: Voice pitch | age effect
noise: Background chatter | channel
base: Teacher stopwatch assessment.
prod: Child-tuned speech model with forced alignment to passage text, miscue classification and teacher dashboards.
pipe: Audio capture @ tablet ; Noise suppression @ front end ; Child ASR @ conformer fine-tuned ; Passage aligner @ forced alignment ; Miscue classifier @ model ; Teacher report @ dashboard ; Teacher scores @ labels
edge: Classroom noise from other students | misrecognised words | Beam-forming mics and speaker verification
edge: Dialect pronunciation counted as errors | legitimate dialect pronunciations are counted as errors and learners are scored unfairly | Dialect-aware lexicons
off: WCPM correlation with teacher scores ; Miscue detection F1
on: Early identification of reading difficulty ; Intervention rate
gap: Adult speech used for evaluation ; Single dialect test set

== student-dropout-early-warning | Student Dropout & Attrition Early Warning | tabular,time-series | batch | production-grade | a=0.1 k=3
obj: Identify learners at risk of dropping out weeks ahead and trigger supportive interventions that actually help.
loss: \mathcal{L}=-\sum_i\left[\delta_i\log h(t_i)-H(t_i)\right]
con: Equity (avoid labelling disadvantaged students) ; Explainable to advisors ; Intervention capacity ; Privacy
sn: Action | Predict + uplift for interventions | Risk score only | Advisors need which action helps whom
sn: Fairness | Audit subgroup performance and impact | Maximise AUC | Biased flagging stigmatises groups
sig: Engagement decay | trend in logins and submissions | Disengagement | Window
sig: Assessment trajectory | grade trends | Struggle | As-of
sig: Support-contact history | advisor contacts | Context | Consent
noise: Demographic proxies | fairness risk
noise: Student ID | none
base: Rule-based alerts on missed deadlines.
prod: Discrete-time survival model with fairness audits and an uplift layer to match students to interventions within advisor capacity.
pipe: LMS and SIS data @ lake ; Feature builder @ Spark ; Dropout hazard model @ GBDT survival ; Uplift allocator @ T-learner ; Advisor worklist @ human ; Outreach tracking @ CRM ; Retention outcomes @ labels
edge: Term break creates apparent disengagement | holiday breaks look like disengagement and trigger a wave of false warnings | Calendar-aware features
edge: Intervention creates stigma when visible to peers | visible outreach labels students and creates stigma that harms rather than helps | Private outreach and opt-in
off: Time-dependent AUC and calibration ; Subgroup error parity
on: Retention rate in treated vs control ; Advisor contacts per saved student
gap: Interventions confound labels ; Using demographic proxies

== course-recommendation-career-paths | Course & Career Path Recommendation | recommender,graph | sub-100ms | production-grade | a=2 k=3
obj: Recommend courses and learning paths aligned with learner goals and labour-market skills, balancing interest and career outcomes.
loss: \mathcal{L}=\mathrm{BPR}+\lambda\,\mathrm{GoalAlignment}
con: Diversity and fairness ; Prerequisites ; Up-to-date skills data ; Explainable
sn: Goals | Goal-conditioned recommendations | Popularity-based | Popular courses don't fit individual goals
sn: Outcomes | Optimise completion and outcomes | Clicks | Clicks pick shiny courses learners abandon
sig: Skill-gap vector | target role skills minus current skills | Direction | Skills graph
sig: Course completion likelihood | predicted completion for learner | Realism | Calibration
sig: Market demand for skill | job-posting trends | Value | Data freshness
noise: Course title popularity | rich-get-richer
noise: Learner device | weak
base: Collaborative filtering on enrolments.
prod: Goal-aware two-tower retrieval with a skills knowledge graph, completion-aware ranking and explanations referencing skill gaps.
pipe: Learner profile @ feature store ; Skills graph lookup @ graph store ; Candidate retrieval @ two-tower ; Ranker @ GBDT ; Prerequisite filter @ rules ; Recommendation API @ app ; Enrolment and completion logs @ events
edge: Skills taxonomy changes | embeddings misaligned | Taxonomy versioning and mapping
edge: Gender-stereotyped recommendations | unfair career steering | Fairness audits and counterfactual testing
off: NDCG and completion-weighted hit rate ; Fairness gaps
on: Completion rate ; Career outcome follow-up
gap: Training on enrolments that reflect past recommendations ; Ignoring fairness drift

== skill-graph-and-job-matching | Skill Graph Extraction & Job Matching | nlp,graph | batch | production-grade | a=0.1 k=10
obj: Build a skill graph from courses, resumes and job postings, and match learners to roles with explainable skill overlaps.
loss: \mathcal{L}=\mathrm{CE}_{\text{NER}}+\lambda\,\mathrm{InfoNCE}(\text{person},\text{role})
con: Taxonomy mapping (ESCO/O*NET) ; Bias in job data ; Privacy of resumes ; Fresh skills
sn: Normalisation | Map free-text skills to a canonical taxonomy | Raw keyword overlap | Synonyms and levels break overlap
sn: Levels | Proficiency level not only presence | Binary skill flags | "Used Python once" differs from expert
sig: Canonical skill entities | linked entities | Matching basis | Linking
sig: Proficiency estimate | evidence-based level | Fit | Evidence
sig: Skill co-occurrence graph | graph embeddings | Adjacent skills | Updates
noise: Resume formatting | noise
noise: Names | bias
base: Keyword matching of resumes to postings.
prod: Skill NER and entity linking to a taxonomy, proficiency estimation from evidence, graph embeddings for matching with explanations.
pipe: Documents (resumes, courses, jobs) @ ingestion ; Skill extractor @ NER ; Entity linker @ taxonomy ; Proficiency estimator @ model ; Matching model @ two-tower ; Candidate UI @ explanations ; Outcome tracking @ placements
edge: Emerging skills not in taxonomy | invisible to matching | Taxonomy proposal pipeline
edge: Biased historical hiring data | matching replicates bias | Fairness constraints and blind features
off: Skill extraction F1 ; Match NDCG
on: Placement rate ; Time to match
gap: Evaluating on taxonomy-covered skills only ; Using hiring outcomes as truth

== content-difficulty-estimation | Learning Content Difficulty Estimation | nlp,tabular | batch | foundational | a=0.1 k=3
obj: Estimate difficulty of questions, passages and videos from text and response data so content is correctly levelled.
loss: \mathcal{L}=\mathrm{Huber}(b,\hat b)
con: Cold-start items without responses ; Age-appropriateness ; Multilingual ; Calibration to IRT scale
sn: Calibration | Align text-based predictions to IRT difficulty | Readability formula only | Formulas don't predict question difficulty
sn: Cold-start | Predict then update with responses | Wait for data | New items need placement immediately
sig: Linguistic complexity features | syntactic and lexical complexity | Text difficulty | Parser
sig: Cognitive demand tag | Bloom level classifier | Task type | Labels
sig: Early response statistics | first 30 responses | Update | Sample size
noise: Item length alone | weak
noise: Author | weak
base: Readability scores (Flesch-Kincaid).
prod: Transformer difficulty regressor calibrated to IRT scale with Bayesian updating from first responses.
pipe: Content ingestion @ CMS ; Feature extraction @ NLP ; Difficulty regressor @ transformer ; Response collector @ events ; Bayesian updater @ posterior ; Content tagging @ metadata ; Editor review @ human
edge: Cultural references make items harder for some groups | biased difficulty | DIF checks and content review
edge: Curriculum change shifts expected level | difficulty mislabelled | Version tags and re-calibration
off: RMSE vs IRT difficulty ; Rank correlation
on: Placement accuracy ; Learner frustration rate
gap: Calibration on one population ; Ignoring DIF

== question-generation-llm | Question Generation with LLMs | llm-agents,nlp | seconds | production-grade | a=0.05 k=5 s=3 t=250
obj: Generate curriculum-aligned questions with correct answers, plausible distractors and difficulty tags for teacher review.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{objective,context})+\lambda\,\mathrm{Unanswerable}
con: Factual correctness ; Alignment to learning objectives ; Bias and sensitivity ; Teacher approval
sn: Verification | Solve generated questions independently to check answers | Trust generated keys | Generated answer keys are wrong 5-15% of the time
sn: Alignment | Retrieval from approved materials | Open-world generation | Ungrounded questions test content not taught
sig: Independent solve agreement | solver matches key | Correctness | Solver quality
sig: Objective-match score | classifier alignment to objective | Alignment | Taxonomy
sig: Distractor plausibility | model-estimated selection rate | Quality | Calibration
noise: Question length | weak
noise: Style | weak
base: Template-based question banks.
prod: Retrieval-grounded generation, independent solver verification, distractor ranking and difficulty prediction before teacher approval.
pipe: Objective and material selection @ UI ; Retriever @ approved content ; Question generator @ LLM ; Solver verifier @ independent model ; Difficulty and distractor ranker @ models ; Teacher approval @ human ; Item bank @ metadata
edge: Wrong answer key accepted | students are taught or graded incorrectly | Verification by independent solvers and teacher spot-checks
edge: Culturally biased examples | exclusion of groups | Bias review and diversification prompts
off: Key correctness rate ; Teacher acceptance rate
on: Teacher time saved ; Item quality after pilot
gap: Evaluating without a solver check ; Fluency judged as quality

== mcq-distractor-generation | MCQ Distractor Generation | nlp | seconds | foundational | a=0.05 k=3
obj: Produce plausible but incorrect options that reflect common misconceptions to make multiple-choice items diagnostic.
loss: \mathcal{L}=-\sum_t\log p_\theta(d_t\mid d_{<t},q,a)+\lambda\,\mathrm{MisconceptionAlign}
con: Distractors must be wrong but plausible ; No ambiguous correct answers ; Misconception taxonomy ; Teacher control
sn: Diagnosis | Distractors map to specific misconceptions | Random wrong answers | Plausible distractors reveal thinking errors
sn: Validity | Ensure only one correct option | Fluent distractors | Accidentally correct distractors invalidate items
sig: Misconception tag | taxonomy mapping | Diagnostic value | Labelling
sig: Option selection rate | observed rate on pilots | Quality | Pilot data
sig: Ambiguity check | solver finds multiple correct | Validity | Solver
noise: Option length | cue
noise: Position of correct option | bias
base: Heuristic distractors from nearby numbers or terms.
prod: Misconception-conditioned generation with solver-based ambiguity detection and selection-rate learning from pilots.
pipe: Item stem and key @ item bank ; Misconception retriever @ taxonomy ; Distractor generator @ LLM ; Ambiguity checker @ solver ; Quality ranker @ GBDT ; Teacher edits @ human ; Pilot statistics @ feedback
edge: Distractor is arguably correct | students penalised unfairly | Multi-solver ambiguity check and review
edge: Distractor leaks the answer by style | test-wise students guess | Style normalisation across options
off: Distractor selection-rate coverage ; Ambiguity detection recall
on: Item discrimination index ; Teacher edit rate
gap: Evaluating by fluency ; No pilot data

== ai-text-and-plagiarism-detection | Plagiarism & AI-Generated Text Detection | nlp | seconds | production-grade | a=0.05 k=8
obj: Detect copied and AI-generated submissions with calibrated confidence and evidence, minimising wrongful accusations.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: False accusations are harmful ; Non-native writer fairness ; Evidence-based process ; Student appeal
sn: Evidence | Source matching and revision history | AI-detector score alone | Detectors have meaningful false positives, especially for non-native writers
sn: Process | Use writing-process signals (drafts) | Final text only | Process shows authorship better than style
sig: Source overlap evidence | matched sources and spans | Plagiarism | Index coverage
sig: Revision-history pattern | typing and revision events | Authorship process | Consent
sig: Style shift vs student baseline | stylometric distance from previous work | Anomaly | Baseline
noise: Perplexity alone | unreliable
noise: Text length | confound
base: Text-matching software (Turnitin-style).
prod: Source matching with calibrated style-shift and process signals, presented as evidence for human review rather than verdicts.
pipe: Submission @ LMS ; Source matcher @ fingerprint index ; Style-shift model @ stylometry ; Process signals @ editor logs ; Evidence aggregator @ report ; Instructor review @ human ; Appeal outcomes @ labels
edge: Non-native writers flagged at higher rates | unfair accusations | Subgroup calibration and no-verdict reporting
edge: Paraphrasing tools evade matching | paraphrasing tools rewrite copied text and recall drops for lexical matching | Semantic matching and process evidence
off: Calibration and subgroup FPR ; Source recall
on: Confirmed cases per flagged ; Appeal overturn rate
gap: Training on AI text from older models ; Ignoring subgroup effects

== proctoring-cheating-detection | Remote Proctoring & Cheating Detection | computer-vision,tabular | seconds | production-grade | a=0.05 k=5000
obj: Detect suspicious behaviour during remote exams (second person, devices, impersonation) with human review of flagged segments, protecting privacy and fairness.
loss: \mathcal{L}=\sum_k\mathrm{BCE}(y_k,p_k)
con: Privacy and consent ; Bias across skin tones and disabilities ; Human review of all flags ; Bandwidth constraints
sn: Review | Flags as review aids, never automatic penalties | Auto-fail on detection | False flags harm students
sn: Fairness | Evaluate across skin tones, lighting and disabilities | Overall accuracy | Face models fail for darker skin in poor light
sig: Multiple-face detection | additional person in frame | Collusion | Detector quality
sig: Gaze-away duration | time looking off-screen | Weak cue | Disability confounds
sig: Prohibited-device detection | phone or notes detection | Cheating tool | Object detector
noise: Head movement alone | disabilities and habits
noise: Eye blink rate | weak
base: Human live proctoring.
prod: Lightweight on-device detectors with server-side review prioritisation, accessibility accommodations and human adjudication.
pipe: Webcam and screen feed @ exam client ; On-device detectors @ face and object models ; Flag aggregator @ rules ; Review prioritiser @ model ; Human proctor @ review ; Decision and appeal @ process ; Case outcomes @ labels
edge: Students with disabilities have atypical gaze or movement | disproportionate flags | Accommodation profiles and relaxed thresholds
edge: Poor bandwidth drops frames | missing evidence or false flags | Quality indicators and degraded-mode policy
off: Flag precision by subgroup ; Review-time per flag
on: Confirmed integrity violations ; Student complaint rate
gap: Test set staged cheating ; Ignoring subgroup false-positive rates

== exam-timetabling-optimization | Exam Timetabling Optimisation | reinforcement-learning | batch | production-grade | a=0.001 k=5
obj: Schedule exams across rooms and slots to minimise student clashes and back-to-back loads while satisfying room capacity and accessibility needs.
loss: \min\;\sum_{s}\text{clashes}_s+\lambda\,\text{consecutive exams}_s+\mu\,\text{room cost}
con: Hard constraints (no clashes, capacity) ; Accessibility rooms ; Invigilator availability ; Run in minutes
sn: Constraints | Constraint programming with soft objective | Greedy assignment | Greedy leaves clashes that need manual repair
sn: Fairness | Balance student load | Minimise total exams per day only | Some students get brutal days
sig: Student conflict matrix | pairs of exams sharing students | Clashes | Enrolment data
sig: Room capacity and accessibility | rooms by features | Feasibility | Master data
sig: Invigilator availability | staffing constraints | Feasibility | Roster
noise: Exam code | none
noise: Lecturer | none
base: Manual scheduling with spreadsheets.
prod: CP-SAT model with learned room-usage estimates and local search to resolve late changes.
pipe: Enrolment and exam data @ SIS ; Conflict matrix builder @ batch ; Timetable solver @ CP-SAT ; Accessibility checker @ constraints ; Staff roster merger @ HR ; Registrar approval @ human ; Change management @ re-solve
edge: Late enrolment changes create new clashes | timetable invalid | Incremental re-solve minimising changes
edge: Room becomes unavailable | a room closes late and the displaced exam needs urgent rescheduling without new clashes | Spare-room buffers and quick reassign
off: Clash count and student-load fairness ; Solve time
on: Complaints from clashes ; Manual repair hours
gap: Hard constraints missing from test data ; Ignoring late changes

== classroom-allocation-and-timetable | Course Timetabling & Classroom Allocation | reinforcement-learning | batch | production-grade | a=0.001 k=5
obj: Allocate courses to times and rooms to maximise utilisation and student/teacher preferences under capacity and accessibility constraints.
loss: \min\;\text{preference violations}+\lambda\,\text{room waste}+\mu\,\text{gaps}
con: Hard constraints ; Multi-campus travel ; Enrolment forecasts ; Term-planning timelines
sn: Demand | Forecast enrolment before allocating rooms | Use last year's room sizes | Demand shifts by programme
sn: Preferences | Weighted student and teacher preferences | Ignoring gaps | Gaps reduce attendance
sig: Enrolment forecast | predicted course enrolment | Capacity | Model
sig: Travel time between rooms | campus distances | Feasibility | Maps
sig: Teacher preferences | availability windows | Soft constraints | Survey
noise: Course name | none
noise: Department | weak
base: Previous year's timetable with manual edits.
prod: Enrolment forecasting plus ILP or CP-SAT timetabling with preference weights and iterative improvement.
pipe: Enrolment forecast @ ML ; Constraint model builder @ SIS data ; Timetable solver @ CP-SAT ; Preference scorer @ weights ; Registrar review @ human ; Publication @ SIS ; Utilisation analytics @ BI
edge: Enrolment under-forecast | under-forecast enrolment allocates a room that is too small on the first day of term | Safety margins and flexible rooms
edge: Campus travel not modelled | back-to-back classes impossible | Travel-time constraints
off: Preference satisfaction and room utilisation ; Forecast MAPE
on: Utilisation rate ; Student gap hours
gap: Optimising on forecasts without uncertainty ; Ignoring accessibility needs

== teacher-copilot-lesson-planning | Teacher Copilot for Lesson Planning | llm-agents | seconds | production-grade | a=0.2 k=10 s=3 t=500
obj: Draft lesson plans, differentiated materials and rubrics aligned with standards, saving teacher prep time while keeping teachers in control.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{standards,context})+\lambda\,\mathrm{StandardMisalign}
con: Standards alignment ; Age-appropriate content ; Teacher editing ; Copyright
sn: Alignment | Retrieval from standards and approved resources | Free generation | Plans must map to the curriculum
sn: Differentiation | Scaffolds for varied levels | One-size plans | Classes vary widely
sig: Standards alignment score | classifier coverage | Fit | Taxonomy
sig: Reading-level match | text complexity | Accessibility | Tools
sig: Teacher edit distance | edits made | Quality | Logging
noise: Plan length | not quality
noise: Fancy formatting | cosmetic
base: Teachers adapt shared templates.
prod: Standards-grounded drafting with resource retrieval, differentiation generator, copyright filter and teacher edit loop.
pipe: Teacher request @ app ; Standards retriever @ curriculum DB ; Lesson drafter @ LLM ; Differentiation generator @ LLM ; Alignment and level check @ classifiers ; Teacher edit @ human ; Usage feedback @ analytics
edge: Hallucinated references to non-existent resources | teachers waste time | Citation validation to approved library
edge: Cultural bias in examples | examples reflect one culture and exclude or confuse parts of the class | Review prompts and diverse example banks
off: Standards-alignment accuracy ; Teacher acceptance rate
on: Prep time saved ; Plan reuse
gap: Judging plans by polish ; Evaluating without teachers

== curriculum-alignment-tagging | Curriculum Standards Alignment & Tagging | nlp | batch | foundational | a=0.05 k=4
obj: Tag content and assessments with curriculum standards and skills automatically, enabling precise search and gap analysis.
loss: \mathcal{L}=\sum_k\mathrm{BCE}(y_k,p_k)+\lambda\,\mathrm{HierarchyConsistency}
con: Many frameworks and versions ; Multi-label hierarchy ; Teacher review ; Frequent updates
sn: Hierarchy | Hierarchical multi-label classification | Flat tagging | Hierarchy handles large label spaces
sn: Versions | Crosswalks between standard versions | Re-tag from scratch | Standards change often
sig: Content-standard semantic similarity | embedding similarity | Candidates | Domain tuning
sig: Verb and cognitive level | action verb taxonomy | Level match | Extraction
sig: Existing tag co-occurrence | related tags | Consistency | Data
noise: Content title only | insufficient
noise: Author | none
base: Manual tagging by curriculum specialists.
prod: Bi-encoder retrieval over standards with cross-encoder re-ranking and hierarchy-aware decoding, reviewer-in-the-loop.
pipe: Content intake @ CMS ; Text extraction @ parsers ; Candidate retrieval @ bi-encoder ; Re-ranker @ cross-encoder ; Hierarchy resolver @ decoding ; Specialist review @ human ; Tag store @ metadata
edge: New standards version published | old tags orphaned | Crosswalk tables and bulk re-mapping
edge: Content spanning multiple subjects | single-label assumption fails | Multi-label outputs with confidence
off: Precision and recall at k per level ; Reviewer acceptance
on: Tagging cost per item ; Search success
gap: Test content similar to training ; Ignoring version differences

== engagement-prediction-notifications | Learner Engagement Prediction & Notifications | tabular,reinforcement-learning | batch | production-grade | a=1 k=1
obj: Predict lapse risk and send the right reminder at the right time to keep learners practising, without notification fatigue.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t(\text{practice}_t-\kappa\,\text{optout}_t)\right]
con: Frequency caps ; Wellbeing considerations for minors ; Consent ; Streak design ethics
sn: Wellbeing | Optimise learning minutes not raw opens | Streak pressure | Aggressive streaks cause anxiety and churn
sn: Treatment | Uplift of nudge vs no nudge | Predict lapse then notify | Notifying already-active users wastes goodwill
sig: Lapse hazard | probability of missing the next 3 days | Targeting | Survival
sig: Preferred study time | personal time-of-day | Timing | History
sig: Notification fatigue | recent notifications and ignores | Cap | Counters
noise: Device type | weak
noise: Account age | confounded
base: Daily reminder at a fixed time.
prod: Survival-based lapse model plus contextual bandit for timing and message type with uplift gating.
pipe: Activity events @ stream ; Lapse features @ Flink ; Hazard model @ GBDT ; Timing and message bandit @ Thompson ; Frequency arbiter @ caps ; Push service @ notification ; Outcomes @ events
edge: Exam week changes study patterns | predictions off | Calendar and school-term features
edge: Parents manage devices of young learners | notifications go to the wrong person | Role-aware routing
off: Off-policy value estimate ; Calibration of lapse hazard
on: Weekly active practice minutes ; Opt-out rate
gap: Optimising opens ; No holdouts for uplift
