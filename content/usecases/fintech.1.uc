# FinTech & Payments, part 1 (use cases 1-25)
== real-time-card-upi-fraud-detection | Real-Time Card & UPI Fraud Detection | tabular,graph | sub-10ms | production-grade | a=8 k=2
obj: Block fraudulent authorisations inside the payment auth path while keeping false declines under 0.3% of genuine volume.
loss: \mathcal{L}=\sum_i w_i\,\mathrm{FL}(p_i)+\lambda\,\mathrm{ECE}(p)
con: p99 under 8 ms inside the auth path ; PCI-DSS scope minimisation ; every decline needs a reason code ; 99.99% availability
sn: Velocity | Rolling counts and sums per card, device and merchant over 1m/1h/24h | Lifetime averages and static account age | Lifetime aggregates dilute a burst that lasts 90 seconds
sn: Metrics | PR-AUC at a fixed 0.5% false-positive rate | Accuracy and ROC-AUC on a 0.1% positive class | ROC-AUC reads 0.99 while the operating region is useless
sn: Labels | Labels used only after the chargeback window closes, with unreported recent rows excluded | Treating every transaction not yet reported as fraud as a genuine one | Recent fraud trained as negative teaches the model to ignore this week's attacks
sn: Takeover | Account takeover signals such as a new device, changed contact details and session behaviour | Velocity as the only fraud signal | Quiet takeovers make three ordinary purchases and never trip a velocity rule
sig: Card velocity 1m/1h/24h | count and sum of authorisations in sliding windows keyed by card token | Fraudsters cash out quickly | Windows must close strictly before decision time
sig: Device-card fan-out | distinct cards seen on the device fingerprint in 24h | Mule devices touch many cards | Fingerprint must be hashed at event time, not retro-joined
sig: Merchant risk drift | 7-day chargeback rate of the merchant versus its 90-day baseline | Compromised merchants shift abruptly | Chargebacks mature in 30-90 days so use matured labels only
sig: New device for card | first time this card token is seen on this device fingerprint | Takeover and card testing start on unfamiliar devices | The first-seen table must be built from events before the decision, not from full history
sig: Amount versus card baseline | amount divided by the card's trailing 90-day median ticket | A ten-times-normal basket is unusual for this card even if small in absolute terms | The baseline must exclude the scored transaction and any fraud already known
noise: Cardholder name length | no causal link to fraud, overfits to data-entry quirks
noise: Raw merchant free-text | high cardinality, replaced by MCC and a learned merchant embedding
noise: Issuer country alone | too coarse, mostly proxies for population and creates unfair declines for travellers
base: Calibrated logistic regression on 40 velocity features, because it sets the cost floor and gives instant reason codes.
prod: LightGBM on 300 features plus a GNN-derived device-card embedding, served via Triton with an in-process feature cache.
pipe: Auth gateway @ Envoy gRPC ; Feature store lookup @ Redis cluster ; Graph embedding @ cached GNN vectors ; Fraud scorer @ LightGBM on Triton ; Policy engine @ rules as config ; Case queue @ analyst review tool ; Label store @ Kafka to lakehouse
edge: Flash-sale traffic spike | velocity features flag genuine buyers en masse | Per-merchant adaptive baselines plus an event-calendar feature
edge: Issuer chargeback delay | labels mature 90 days later so recent data looks clean | Survival-aware label imputation and weekly refresh on matured windows
edge: Genuine shopping session | four to nine purchases within minutes look like velocity | Per-card session baselines and step-up authentication between the review and block thresholds
edge: Mule-device ring rotation | fraudsters rotate devices after a block so fan-out resets to zero | Cluster devices by shared payment tokens and IP ranges and carry risk across the cluster
off: PR-AUC at 0.5% FPR ; Recall at fixed review capacity
on: Fraud basis points per volume ; False-decline rate on good customers
gap: Training on confirmed fraud only hides review-queue selection bias ; Random split leaks cardholders across train and test

== credit-default-survival-modeling | Credit Default Survival Modeling | tabular,time-series | batch | production-grade | a=1 k=4
obj: Estimate time-to-default curves per borrower to set provisions, pricing and limits under IFRS 9 / CECL.
loss: \mathcal{L}=-\sum_i\left[\delta_i\log h(t_i\mid x_i)-\int_0^{t_i}h(u\mid x_i)\,du\right]
con: Regulatory explainability and monotonic constraints ; Monthly portfolio refresh in under 2 hours ; Stable under macro regime change ; Full lineage for auditors
sn: Censoring | Right-censored observations modelled explicitly in the likelihood | Dropping open accounts or treating them as non-default | Dropping open loans biases default rates downward by 20-40%
sn: Macro | Macro covariates as scenario inputs for stress tests | Fitting on the last 3 benign years | Benign-era fit collapses at the first downturn
sig: Months-on-book hazard shape | baseline hazard as piecewise-constant by account age | Default risk peaks at known seasoning points | Vintage effects mix with age if not stratified
sig: Utilisation trend 6m | slope of revolving utilisation over 6 months | Distress shows as creeping utilisation | Use statement-date values, never month-end after the fact
sig: Payment-to-minimum ratio | payment divided by minimum due, 3-month rolling | Minimum-only payers default earlier | Delinquency flags computed after default leak the label
noise: Raw ZIP code | proxy for protected classes and unstable, use regional macro features instead
noise: Marketing channel of acquisition | correlates with vintage, not with repayment behaviour
base: Cox proportional hazards with monotone-binned features, because regulators already trust it.
prod: Discrete-time gradient-boosted hazard model with monotone constraints, calibrated per vintage, plus a macro scenario overlay.
pipe: Loan tape ingestion @ Spark on lakehouse ; Vintage feature builder @ point-in-time SQL ; Hazard model @ XGBoost monotone ; Macro scenario overlay @ CECL scenario engine ; Provision publisher @ idempotent tables ; Model risk review @ validation team sign-off
edge: Policy change mid-vintage | approvals shift so the hazard baseline moves | Add policy-version as a stratifier and monitor vintage curves
edge: Moratorium or forbearance | defaults suppressed artificially | Model forbearance as a competing event and keep a separate flag
off: Time-dependent AUC at 12 and 24 months ; Calibration of cumulative default by vintage
on: Provision accuracy versus realised loss ; Capital held versus regulatory minimum
gap: Using current delinquency status instead of status as-of observation time ; Ignoring left truncation of older vintages

== aml-graph-anomaly-detection | AML Graph Anomaly Detection | graph,tabular | batch | staff-principal | a=3 k=3
obj: Surface layering, structuring and circular fund flows that rule-based monitoring cannot see, cutting false-positive alerts by half.
loss: \mathcal{L}=\mathcal{L}_{\text{BCE}}+\beta\,\mathrm{KL}\!\left(q(z\mid G)\,\|\,p(z)\right)
con: SAR filing deadlines of 30 days ; Alert explanations must be human-readable ; Graph of 500M edges refreshed daily ; Audit trail per alert
sn: Topology | Subgraph motifs such as fan-in/fan-out, cycles and shared intermediaries | Per-account transaction amount z-scores alone | Accounts look normal individually, the pattern lives in the structure
sn: Labels | SAR outcomes weighted by investigator disposition | Treating every alert closure as negative | Closed-without-SAR is not proof of legitimacy
sig: Pass-through ratio | outflow within 24h divided by inflow | Layering moves money out fast | Needs transaction timestamps not posting dates
sig: Cycle membership score | count of short cycles through the account in a 14-day window | Round-tripping funds | Windowing must exclude the alerting transaction itself
sig: Counterparty risk propagation | personalised PageRank from known-bad entities | Risk spreads along flows | Seed list must be frozen before the evaluation period
noise: Transaction amount alone | structured amounts are deliberately just below thresholds
noise: Account age | weakly informative and discriminatory in some jurisdictions
base: Gradient-boosted trees on hand-built graph features, which matches current investigator logic and is explainable.
prod: Heterogeneous GraphSAGE with edge-type attention plus a GBDT head on motif features; GNNExplainer subgraph shown on every alert.
pipe: Transaction graph builder @ Spark GraphFrames ; Entity resolution @ blocking plus Splink ; Graph embedding @ PyTorch Geometric ; Alert scorer @ GBDT head ; Alert explainer @ GNNExplainer ; Investigator queue @ case management ; SAR outcome store @ label feedback
edge: Entity resolution splits one customer into two | motif counts halve and ring evades detection | Conservative merge thresholds and a household-level graph view
edge: Sanctions list update | newly designated entities change propagated risk overnight | Incremental re-propagation job triggered on list changes
off: Precision at top-k alerts per analyst ; SAR conversion rate
on: Alert-to-SAR ratio ; Mean time to disposition
gap: Random edge split leaks future flows into training ; Evaluating on alerts rather than all accounts hides missed laundering

== transaction-monitoring-alert-triage-llm | Transaction Monitoring Alert Triage with LLM Agents | llm-agents,nlp | seconds | production-grade | a=2 k=12 s=4 t=450
obj: Auto-summarise and pre-dispose low-risk AML alerts with cited evidence so analysts spend time only on genuinely suspicious cases.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{evidence})+\gamma\,\mathrm{CitationMiss}
con: Every claim must cite a transaction or KYC record ; No customer PII sent outside the VPC ; Human approval for any SAR decision ; p95 under 6 s
sn: Grounding | Answers constructed only from retrieved transaction and KYC facts | Fluent narratives that sound right | An unsupported sentence in a SAR narrative is a regulatory finding
sn: Autonomy | Agent drafts and recommends, human disposes | Fully autonomous closure of alerts | Regulators require accountable human decisions
sig: Evidence coverage | fraction of narrative sentences linked to a source record | Detects hallucination directly | Coverage must be computed on the final text not the draft
sig: Rule-hit context | which scenario fired and its threshold distance | Anchors the investigation | Include scenario version to stay point-in-time
sig: Customer behaviour baseline | 12-month median and MAD of monthly flows | Defines what is unusual for this person | Baseline excludes the alert month
noise: Long free-text KYC notes | stale and contradictory, retrieve structured fields first
noise: Full transaction dump in prompt | blows context and dilutes attention, summarise windows instead
base: Template-based narrative generator with rule-driven pre-disposition, which is auditable and cheap.
prod: Tool-using agent on a private 70B-class model with a typed transaction-query tool, KYC retriever and a verifier that rejects uncited claims.
pipe: Alert intake @ queue consumer ; Evidence retriever @ SQL tools plus vector search ; Planner LLM @ vLLM private model ; Citation verifier @ NLI plus rule checks ; Guardrail filter @ PII and policy ; Analyst workspace @ human approval ; Audit log @ immutable store
edge: Prompt injection inside a payment reference field | agent follows attacker text | Treat all record fields as data, strip instructions, tool allow-lists
edge: Model update changes narrative style | analyst trust drops | Frozen golden set gate and shadow mode before cutover
off: Citation precision and recall ; Disposition agreement with senior analysts
on: Analyst minutes per alert ; Missed-suspicious rate in QA sample
gap: Golden set written by the same team that prompts the model ; Measuring fluency instead of factual support

== account-takeover-detection | Account Takeover Detection | tabular,time-series | sub-100ms | production-grade | a=4 k=3
obj: Detect credential-stuffing and session-hijack logins in real time and step up authentication without adding friction for real users.
loss: \mathcal{L}=\sum_i w_{y_i}\,\mathrm{CE}(p_i,y_i)+\mu\,\mathrm{Brier}(p)
con: Added login latency under 60 ms ; Step-up rate under 2% of sessions ; GDPR-compliant device signals ; Explainable challenges
sn: Behaviour | Typing cadence, navigation order and session continuity | IP reputation alone | Residential proxies make IP reputation near-useless
sn: Sequence | Login followed by immediate payee or address change | Isolated login anomaly | Attackers act within minutes, the sequence is the signal
sig: Device novelty vs history | hamming distance of device fingerprint to the account's top-3 devices | Takeovers come from unfamiliar devices | Fingerprint salt rotation must not create fake novelty
sig: Impossible travel score | geodesic speed between consecutive logins | Physical constraint is hard to fake | Use IP geolocation confidence not raw coordinates
sig: Login failure burst | failed attempts against the account in 15 minutes | Credential stuffing signature | Count attempts before the success only
noise: Browser user-agent string | trivially spoofed, use TLS and canvas entropy features
noise: Time-of-day of login | confounded with timezone, use deviation from the user's own pattern
base: Rule scorecard with velocity and device-novelty thresholds.
prod: Gradient-boosted model on session and sequence features with an LSTM over the last 20 events, served in-process in the auth service.
pipe: Login event gateway @ auth service ; Session feature cache @ Redis ; Sequence encoder @ ONNX LSTM ; ATO scorer @ LightGBM ; Step-up policy @ risk-based MFA rules ; Recovery queue @ support review ; Outcome labels @ user reports and reversals
edge: Corporate VPN rollout | thousands of users appear to travel together | Cohort-level baseline shift detector with automatic dampening
edge: Mobile OS update changes fingerprint | mass false novelty | Fingerprint versioning and fuzzy device match
off: PR-AUC on confirmed ATO ; Step-up rate at fixed recall
on: ATO loss per 10k logins ; Login success rate for good users
gap: Labels come only from users who reported fraud ; Training on post-takeover sessions leaks attacker behaviour

== synthetic-identity-fraud-detection | Synthetic Identity Fraud Detection | graph,tabular | sub-100ms | staff-principal | a=0.3 k=6
obj: Catch fabricated identities built from real and fake attributes at application time, before they bust out on credit lines.
loss: \mathcal{L}=\mathcal{L}_{\text{focal}}+\lambda\sum_{(u,v)\in E}\|z_u-z_v\|^2
con: Decision within 80 ms at application ; FCRA adverse-action reasons ; Consortium data usage limits ; Low false-reject for thin-file genuine applicants
sn: Linkage | Shared SSN, phone, address or device across unrelated applicants | Single-application attribute plausibility | Each synthetic looks plausible alone, the cluster is the tell
sn: Time | Credit-file age versus claimed age and tradeline seeding patterns | Bureau score level | Authorised-user seeding inflates scores artificially
sig: Attribute sharing degree | number of distinct applicants sharing each identity attribute | Rings reuse components | Count only applicants before the current one
sig: Identity age mismatch | claimed DOB age minus credit-file age | Fresh files on adult identities | Needs file-open date from bureau as-of time
sig: Email and phone tenure | first-seen date of the contact point in a data consortium | Real people have long-lived contacts | Consortium lookback must not include future sightings
noise: Credit score at application | gameable via authorised-user tradelines
noise: Applicant income stated | self-reported and unverified
base: Rules over attribute-sharing counts and bureau-file-age mismatches.
prod: Application-time GNN over an identity-attribute bipartite graph plus GBDT on tabular features; scores cached by identity cluster.
pipe: Application gateway @ API ; Identity attribute lookup @ graph store ; Cluster embedding @ GraphSAGE inference ; Risk scorer @ LightGBM ; Decision engine @ policy rules ; Manual review @ fraud analyst queue ; Bust-out labels @ charge-off feed
edge: Legitimate family sharing address and phone | cluster looks like a ring | Household detection and relationship-type edge weights
edge: Labels arrive 12-24 months late | model trains on stale fraud patterns | Use early-warning proxies as auxiliary labels and monitor recency of positives
off: PR-AUC at fixed review rate ; Detection rate by identity cluster
on: Bust-out loss per originated dollar ; Thin-file approval rate
gap: Cluster members split across train and test leak the ring ; Labels only from charged-off accounts miss undetected synthetics

== kyc-document-verification-vision | KYC Document Verification (Vision) | computer-vision,nlp | seconds | production-grade | a=0.2 k=900
obj: Verify ID documents in under 3 seconds with tamper, forgery and replay detection to cut manual KYC review by 80%.
loss: \mathcal{L}=\mathcal{L}_{\text{CE}}^{\text{doc type}}+\mathcal{L}_{\text{BCE}}^{\text{tamper}}+\lambda\,\mathcal{L}_{\text{OCR-CTC}}
con: Images processed in a regional VPC ; Support 200 document types ; Under 3 s end-to-end ; Biometric consent logged
sn: Forensics | Font, MRZ checksum, hologram and edge-consistency signals | OCR text accuracy alone | A good forgery has perfect text and wrong physics
sn: Recapture | Moiré, screen glare and re-photograph detection | Image sharpness | Attackers submit photos of screens that look sharp
sig: MRZ checksum validity | ICAO 9303 check digits recomputed from parsed fields | Cheap hard check | Parse the raw MRZ not the cleaned text
sig: Template conformity | layout and font match against issuing-authority templates | Forgeries drift from the template | Template version must match issue year
sig: Screen-recapture score | frequency-domain artefacts in the image | Screen replays leave moiré | Compression changes the spectrum so augment with JPEG
noise: Image resolution | varies with phone model not authenticity
noise: Background colour | uninformative and easy to alter
base: OCR plus rule checks on MRZ and expiry date.
prod: Document classifier, ViT tamper detector and layout-aware OCR in one TensorRT pipeline; low-confidence cases routed to human review.
pipe: Upload gateway @ presigned object storage ; Quality gate @ blur and glare check ; Document classifier @ EfficientNet TensorRT ; Tamper and OCR models @ ViT plus LayoutLM ; Decision aggregator @ rules and thresholds ; Human review @ KYC ops queue ; Fraud feedback @ confirmed forgeries
edge: New passport design released | classifier sees an unknown template | Open-set detection routes unknowns to review and triggers template onboarding
edge: Low-light images from low-end phones | tamper false positives | Quality gate requests recapture with live guidance
off: Forgery recall at 1% false reject ; OCR field accuracy
on: Manual review rate ; Document fraud passed to downstream
gap: Synthetic forgeries in training differ from real attacker craft ; Test set has the same document templates as train

== liveness-and-deepfake-selfie-detection | Liveness & Deepfake Selfie Detection | computer-vision | seconds | staff-principal | a=0.2 k=1500
obj: Confirm a live human is present and detect injected or generated faces during remote onboarding, defeating presentation and injection attacks.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathcal{L}_{\text{SupCon}}
con: ISO 30107-3 PAD level 2 target ; Works on 5-year-old Android phones ; Bias audit across skin tones ; Under 2.5 s
sn: Attack type | Separate heads for print, replay, mask and virtual-camera injection | One binary real-vs-fake classifier | Binary models overfit one attack and miss the next
sn: Signal | Active challenge plus passive texture and rPPG cues | Face-match score | A deepfake can match the ID photo perfectly
sig: Challenge response latency | time between prompt and head movement | Real humans respond in 300-800 ms | Instrument client-side clocks securely
sig: rPPG pulse signal | blood-flow signal extracted from facial video | Hard to synthesise consistently | Needs lighting normalisation to avoid skin-tone bias
sig: Camera integrity | virtual-camera and emulator detection | Injection bypasses the lens entirely | Collect attestation tokens server-verified
noise: Face-match score | measures identity not liveness
noise: Image brightness | environment artefact that correlates with device tier
base: Active-challenge liveness with a texture CNN.
prod: Multi-head ensemble: temporal ViT for deepfakes, rPPG branch and device attestation; thresholds tuned per attack class.
pipe: Capture SDK @ on-device attestation ; Frame sampler @ edge preprocessing ; PAD ensemble @ ViT plus rPPG on GPU ; Attack-class aggregator @ per-head thresholds ; Decision service @ risk policy ; Fraud ops @ manual review ; Attack library @ red-team samples
edge: New generative model release | detector recall drops overnight | Continuous red-team ingestion and monthly retrain with new attack families
edge: Low-end phone camera noise | genuine users fail liveness | Device-tier-specific thresholds and fallback to assisted flow
off: APCER and BPCER at fixed operating points ; Per-skin-tone error parity
on: Account-opening fraud rate ; Onboarding completion rate
gap: Test attacks generated by the same tool used in training ; Demographic skew in genuine samples masks bias

== credit-scoring-thin-file-alt-data | Credit Scoring for Thin-File Borrowers with Alternative Data | tabular | sub-100ms | production-grade | a=0.1 k=8
obj: Extend fair credit to customers with no bureau history using cash-flow and behavioural data, at default rates equal to prime segments.
loss: \mathcal{L}=\mathrm{BCE}+\lambda_1\,\mathrm{MonotonicityPenalty}+\lambda_2\,\mathrm{DemographicParity}
con: ECOA / fair-lending compliance ; Consent-based data only ; Adverse-action reason codes ; Stable score for 12 months
sn: Cash flow | Income stability, balance buffers and bill-pay regularity from bank data | Phone brand or social graph proxies | Proxy features trigger disparate-impact findings
sn: Reject inference | Augment with reject-inference or randomised approvals | Training only on approved applicants | Selection bias hides the very people you want to approve
sig: Inflow volatility 90d | coefficient of variation of weekly inflows | Stable income repays | Use only transactions before application date
sig: Minimum balance buffer | 10th percentile daily balance over 60 days | Shock-absorbing capacity | Account-aggregator refresh timing must be as-of
sig: Recurring obligation coverage | rent and utility payment on-time rate | Behavioural analogue of bureau history | Match recurring payments only with prior-period data
noise: Device model | proxy for income and protected attributes
noise: App install list | invasive, unstable and legally risky
base: Logistic regression on 25 cash-flow features with monotone constraints.
prod: Monotone gradient boosting with a fairness-constrained post-processing step and reject-inference via a 2% randomised approval cohort.
pipe: Application API @ consent capture ; Account aggregator pull @ open banking ; Cash-flow feature engine @ Flink ; Credit scorer @ monotone GBDT ; Fairness and policy layer @ constraints ; Underwriter exceptions @ review queue ; Repayment outcomes @ labels
edge: Open-banking API outage | features missing at scoring | Defined fallback scorecard on declared data with higher pricing
edge: Gig-economy income seasonality | stability features penalise genuine workers | Seasonality-adjusted volatility and 12-month lookback
off: Gini and KS on out-of-time sample ; Approval-rate parity ratios
on: Bad rate in thin-file cohort ; Incremental approvals at equal loss
gap: Reject inference omitted so scores are overconfident ; Out-of-time split skipped despite macro shifts

== loan-underwriting-copilot | Loan Underwriting Copilot | llm-agents,tabular | seconds | production-grade | a=0.05 k=40 s=5 t=500
obj: Reduce commercial loan underwriting from days to hours by extracting financials, spreading statements and drafting credit memos with evidence links.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{docs})+\lambda\,\mathrm{NumericMismatch}
con: All numbers traceable to a source page ; Underwriter signs the final memo ; Tenant isolation per bank ; Documents up to 300 pages
sn: Numbers | Extracted figures validated by accounting identities | Model-reported figures taken at face value | Balance sheets must balance; a failed identity exposes OCR errors
sn: Retrieval | Section-aware chunking with table preservation | Fixed 512-token chunks | Fixed chunks split financial tables mid-row
sig: Spread reconciliation delta | assets minus liabilities minus equity from extracted values | Catches extraction errors | Run after normalising units and currency
sig: DSCR computation trace | formula plus cell references used | Auditable credit metric | Never let the LLM do arithmetic, use a calculator tool
sig: Covenant clause retrieval | clause text matched to covenant taxonomy | Contract risk drivers | Pin to the executed version of the agreement
noise: Narrative sentiment of the CEO letter | low predictive value and easy to game
noise: Boilerplate risk factors | identical across filings, no discriminative content
base: Rule-based extraction templates plus analyst spreadsheets.
prod: Document-AI layout parser, hybrid retrieval, planner LLM with calculator and spreadsheet tools, deterministic ratio engine, and a verifier for citations.
pipe: Document intake @ object store plus OCR ; Layout parser @ table-aware document AI ; Retriever @ hybrid BM25 plus vectors ; Underwriting agent @ LLM with calculator tool ; Ratio verifier @ deterministic engine ; Credit memo review @ underwriter approval ; Decision log @ audit trail
edge: Scanned statements with merged cells | wrong columns shift every ratio | Table-structure confidence gate and mandatory human spot-check
edge: Restated financials | agent mixes versions | Version-aware retrieval and explicit restatement flags
off: Field-level extraction F1 ; Memo factual-support rate
on: Time to decision ; Underwriter edits per memo
gap: Evaluating on clean PDFs only ; Counting fluent memos as correct without numeric audit

== dynamic-credit-limit-optimization | Dynamic Credit Limit Optimization | reinforcement-learning,tabular | batch | staff-principal | a=0.05 k=5
obj: Raise or lower card limits monthly to maximise risk-adjusted revenue subject to loss and capital constraints.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t\left(\text{revenue}_t-\text{loss}_t-c\cdot\text{capital}_t\right)\right]
con: Regulatory limit-change notices ; Portfolio loss ceiling ; Fairness across segments ; Counterfactual evaluation only
sn: Causality | Uplift of limit change on spend and default (heterogeneous effect) | Correlation of high limit with high spend | High limits are given to people who already spend more
sn: Evaluation | Off-policy evaluation with logged propensities | Back-testing a new policy on historical outcomes | Historical outcomes only exist for the actions taken
sig: Spend-to-limit headroom | peak utilisation divided by limit over 3 cycles | Constrained high-demand customers | Use pre-decision cycles
sig: Early-delinquency hazard | model-predicted 6-month default probability | Risk side of the trade | Score at action time not later
sig: Elasticity estimate | causal forest estimate of spend change per limit step | Who responds to more credit | Needs randomised limit-test cohorts
noise: Raw credit score change | already inside the hazard model
noise: Marketing segment tag | redundant and unstable across campaigns
base: Rule grid using score band and utilisation.
prod: Contextual bandit with a doubly-robust off-policy estimator and Lagrangian risk constraints, learned on a randomised exploration slice.
pipe: Portfolio snapshot @ lakehouse ; Risk and uplift models @ GBDT and causal forest ; Policy optimiser @ constrained bandit ; Constraint checker @ loss and capital limits ; Change publisher @ batch to core banking ; Compliance review @ notice approval ; Outcome tracker @ monthly labels
edge: Recession onset | policy keeps raising limits on stale elasticity | Macro circuit breaker freezes increases and shifts to conservative policy
edge: Logged-policy support gaps | off-policy estimates explode | Clipped importance weights and a 3% randomised exploration slice
off: Doubly-robust policy value estimate ; Constraint violation rate in simulation
on: Revenue per account net of loss ; Share of accounts with limit increases that default
gap: Naive A/B of limit changes confounded by selection ; No exploration data so counterfactuals are unsupported

== collections-propensity-and-next-best-action | Collections Propensity & Next-Best-Action | tabular,reinforcement-learning | batch | production-grade | a=0.3 k=3
obj: Choose the contact channel, time and offer that maximise cure rate per rupee of collection cost while respecting conduct rules.
loss: \mathcal{L}=-\sum_i\sum_a \hat\tau_a(x_i)\,\pi(a\mid x_i)+\lambda\,\mathrm{Cost}(\pi)
con: Contact-frequency and time-of-day regulations ; Hardship customers excluded ; Daily capacity of dialer agents ; Treat customers fairly
sn: Treatment | Uplift per action rather than raw cure probability | Calling the customers most likely to pay anyway | Self-cure customers waste budget and annoy
sn: Conduct | Hard compliance constraints in the optimiser | Post-hoc filtering of recommendations | Filtering after optimisation breaks the objective
sig: Promise-to-pay reliability | share of past promises honoured | Strong behavioural predictor | Promise outcome known only after follow-up date
sig: Channel responsiveness | historic response rate by SMS, call and email | Personal preference | Exclude responses to the current campaign
sig: Days past due and roll rate | current bucket and transition probabilities | Core delinquency state | Bucket at as-of date only
noise: Agent name | memorises individual agents, not strategy
noise: Phone area code | location proxy with fairness risk
base: Propensity-to-pay model sorted by balance.
prod: Uplift model (T-learner with GBDT) feeding a constrained assignment optimiser over channels and agent capacity.
pipe: Delinquency snapshot @ core banking extract ; Uplift scorer @ GBDT T-learner ; Constraint optimiser @ OR-Tools ; Compliance filter @ conduct rules ; Campaign dispatcher @ dialer and SMS ; Agent desk @ human collectors ; Outcome feed @ payments and promises
edge: Hardship flag arrives late | contact made to protected customer | Real-time suppression list check at dispatch
edge: Dialer capacity drops | plan overruns daily cap | Optimiser re-solves on intraday capacity signal
off: Qini coefficient ; Expected cure per contact
on: Cure rate per collection rupee ; Complaint rate
gap: Training on all contacted customers without a holdout ; Cure measured at different horizons across treatments

== payment-routing-optimization | Payment Routing Optimization | reinforcement-learning,tabular | sub-10ms | staff-principal | a=3 k=1
obj: Route each payment to the acquirer or rail that maximises authorisation success at minimum fee, adapting to live outages and issuer behaviour.
loss: \mathcal{L}=\sum_t \text{regret}_t,\;\;\text{regret}_t=\mu^*_{x_t}-\mu_{a_t,x_t}
con: Routing decision under 5 ms ; Acquirer contracts and minimum volume commitments ; Idempotent retries without double charge ; PCI scope unchanged
sn: Exploration | Thompson sampling over acquirer success per (BIN, amount band) | Static priority list by fee | Static lists miss intraday acquirer degradation
sn: Cost | Net expected value = success probability times margin minus fee | Maximising success rate alone | The highest-success route can be the most expensive
sig: Issuer-BIN success posterior | Beta posterior of auth success per (acquirer, BIN) with 30-minute decay | Fresh health signal | Decay must not use future outcomes
sig: Decline code mix | share of soft vs hard declines by route in the last 15 min | Early outage indicator | Treat issuer decline codes consistently
sig: Fee schedule delta | effective interchange and scheme fee difference | Cost term | Contract versions as-of transaction time
noise: Cardholder country alone | already captured by BIN and currency
noise: Merchant category full list | high cardinality with little route-specific signal
base: Priority-ordered failover list with a cost-first policy.
prod: Contextual Thompson sampling with decayed Beta posteriors per segment, a cost-aware reward, and an in-memory routing table refreshed every second.
pipe: Payment intake @ API gateway ; Segment key builder @ BIN and amount features ; Bandit router @ in-memory posteriors ; Fee and constraint check @ contract rules ; Acquirer dispatch @ gateway adapters ; Retry manager @ idempotent cascades ; Outcome stream @ Kafka to posteriors
edge: Acquirer silent failure | success posterior lags real outage | Circuit breaker on timeout rate and fast posterior decay
edge: Retry cascade double-charges | duplicate captures | Idempotency keys end-to-end and a cascade budget
off: Replay-based inverse propensity value ; Regret against oracle on logged data
on: Authorisation rate uplift ; Blended processing cost per transaction
gap: Replay evaluation ignores routes never chosen ; Success measured without separating soft declines from fraud declines

== payment-authorization-rate-uplift | Payment Authorization Rate Uplift (Issuer-Side Retry & Tokenisation) | tabular | sub-100ms | production-grade | a=3 k=1
obj: Recover soft-declined payments by predicting when a retry, network token or 3DS step-up will succeed, lifting authorisation rates by 1-3 points.
loss: \mathcal{L}=\sum_i w_i\,\mathrm{BCE}(y_i,\hat p_i)\quad w_i\propto \text{order value}
con: Retry limits set by card schemes ; Never retry hard declines ; Customer friction budget ; 80 ms decision
sn: Decline semantics | Decline reason code families mapped to retriable vs terminal | Treating all declines the same | Retrying a lost-card decline damages issuer trust
sn: Timing | Optimal retry delay depends on reason (insufficient funds vs network) | Immediate blind retries | Immediate retry rarely changes the issuer's answer
sig: Decline code family | normalised scheme response code group | Determines retriability | Map codes per scheme and version
sig: Time to payday proximity | days since typical salary credit for the segment | Funds-availability proxy | Compute from past cycles not future credits
sig: Prior retry outcomes | success rate of previous retries for this BIN and code | Issuer-specific behaviour | Exclude the current retry chain
noise: Customer email domain | no relation to authorisation outcome
noise: Cart item names | high-dimensional, adds little over value and category
base: Fixed retry schedule per decline code.
prod: GBDT predicting retry success per (delay, route) and choosing the best action under a friction budget, with network-token upgrade as an action.
pipe: Decline intake @ payment gateway ; Decline normaliser @ scheme code map ; Retry-success model @ LightGBM ; Action selector @ friction budget policy ; Retry scheduler @ delayed queue ; Outcome logging @ Kafka ; Experiment holdout @ randomised control
edge: Scheme rule change | retry now violates network limits | Rules-as-config with automated compliance tests
edge: Seasonal salary peaks | success window shifts | Calendar features and daily recalibration
off: Retry-success AUC ; Incremental auths in logged randomised holdout
on: Recovered revenue ; Issuer decline-rate trend
gap: Observational retry data confounded by who was retried ; No holdout so lift is not separable from natural recovery

== chargeback-dispute-prediction-and-automation | Chargeback Dispute Prediction & Evidence Automation | tabular,nlp | seconds | production-grade | a=0.05 k=30
obj: Predict which disputes are winnable and auto-assemble the evidence package, raising representment win rate while cutting handling cost.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\cdot \text{amount}^{0.5}
con: Network-specific evidence deadlines ; Merchant data residency ; Win-rate versus cost ceilings ; Template compliance per scheme
sn: Win drivers | Reason-code-specific evidence completeness (delivery proof, 3DS, usage logs) | Overall dispute amount | Amount alone ignores what the network needs to see
sn: Economics | Expected recovery minus handling cost | Contesting every dispute | Low-value losing disputes cost more than they return
sig: Evidence completeness score | fraction of required evidence fields present for the reason code | Direct driver of outcome | Compute at submission time only
sig: 3DS liability shift flag | whether the transaction authenticated with 3DS | Shifts liability to issuer | Verify with the authentication record not merchant claim
sig: Delivery confirmation lag | delivery timestamp minus order timestamp | Proof timeline | Courier updates arrive later; use ones available at filing
noise: Customer complaint text sentiment | emotive but not decisive in network rules
noise: Dispute filing weekday | spurious calendar effect
base: Rule table by reason code with a standard evidence template.
prod: Win-probability GBDT plus an LLM that fills scheme-specific evidence templates from order, shipping and device logs under a schema validator.
pipe: Dispute intake @ network webhook ; Evidence retriever @ order and logistics APIs ; Win-probability model @ GBDT ; Evidence composer @ LLM with schema check ; Compliance validator @ scheme rules ; Specialist review @ disputes team ; Outcome feed @ network results
edge: Network deadline in 7 days | late evidence rejected | Deadline-aware prioritisation queue
edge: Template hallucinated fields | rejected submissions | Strict JSON-schema output and source-linked fields only
off: Win-prediction PR-AUC ; Evidence-field accuracy
on: Representment win rate ; Cost per dispute handled
gap: Training only on disputes the team chose to contest ; Outcome labels delayed by 45-120 days

== merchant-risk-scoring-onboarding | Merchant Risk Scoring at Onboarding | tabular,graph,nlp | seconds | production-grade | a=0.01 k=60
obj: Score new merchants for fraud, regulatory and credit risk during onboarding, auto-approving the safe majority within a minute.
loss: \mathcal{L}=\mathrm{CE}(y,p)+\lambda\,\mathrm{ExpectedCostGap}
con: Prohibited-business screening ; Beneficial-owner verification ; Decision in under 60 s for 80% ; Explainable declines
sn: Website truth | Website content versus declared MCC and products | Declared business description | Fraudulent merchants declare benign categories
sn: Network | Ownership and director links to previously terminated merchants | Single-entity KYB checks | Terminated merchants reappear under new entities
sig: MCC-site mismatch | classifier probability that the site belongs to the declared MCC | Misdeclaration is a risk marker | Crawl at onboarding time and freeze
sig: Shared-director risk | max risk score among entities sharing directors or addresses | Re-registration pattern | Graph snapshot as-of application
sig: Projected volume anomaly | declared monthly volume versus category quantiles | Overstated or understated volume | Declared value not observed future volume
noise: Company name length | no signal
noise: Incorporation month | spurious seasonality
base: KYB checklist rules with sanctions screening.
prod: Multi-signal model combining website text classifier, graph features and GBDT, with LLM-extracted business summary for analysts.
pipe: Onboarding form @ web API ; Website crawler and classifier @ transformer ; Entity graph lookup @ graph DB ; Merchant risk model @ GBDT ; Policy decision @ prohibited-list rules ; Risk analyst review @ queue ; Portfolio outcomes @ chargeback and fraud feed
edge: Website behind login | crawler sees nothing | Request demo credentials and treat missing content as risk feature
edge: Reseller platform onboarding sub-merchants | concentration risk hidden | Aggregate exposure features at the parent level
off: PR-AUC on later fraud or chargeback ; Auto-approval precision
on: Time to onboard ; Merchant fraud rate at 90 days
gap: Outcomes only observed for approved merchants ; Crawl snapshot differs from what the merchant showed at onboarding

== sanctions-name-screening-fuzzy-matching | Sanctions Name Screening with Fuzzy Matching | nlp | sub-100ms | production-grade | a=4 k=1
obj: Screen payments and customers against sanctions lists with high recall across transliterations while cutting false hits by 60%.
loss: \mathcal{L}=\mathrm{TripletLoss}(a,p,n)+\lambda\,\mathrm{BCE}(\text{match})
con: Recall must be near 100% on true listed names ; 50 ms per name ; List updates live within 15 minutes ; Explainable matches
sn: Recall | Cross-script, phonetic and token-order tolerant matching | Exact or edit-distance-only matching | Transliteration variants (Mohammed, Muhammad) defeat edit distance
sn: Context | Secondary identifiers such as DOB, country and entity type | Name similarity alone | Common names generate floods of false hits
sig: Phonetic-embedding similarity | cosine of character-aware name embeddings | Handles transliteration | Evaluate on held-out alias families
sig: Secondary identifier agreement | DOB, nationality and ID overlap score | Disambiguates common names | Missing values must be neutral not negative
sig: Alias-graph distance | shortest alias path between the query and list entity | Catches known aliases | Alias updates versioned by list date
noise: Name length | length-biased distance artefacts
noise: Payment amount | irrelevant for list membership
base: Jaro-Winkler with token-sort and a fixed threshold.
prod: Two-stage: candidate generation with n-gram ANN index then a cross-encoder re-ranker trained on adjudicated hits, with calibrated thresholds per list.
pipe: Screening API @ gRPC ; Name normaliser @ transliteration and cleaning ; Candidate generation @ n-gram ANN ; Cross-encoder reranker @ distilled transformer ; Threshold policy @ per-list calibration ; Compliance queue @ adjudication ; Adjudication labels @ feedback store
edge: List delta with 10k new entries | index rebuild stalls | Incremental index with blue-green swap
edge: Names in unseen scripts | embedding fails | Script-specific tokenisers and fallback to phonetic keys
off: Recall at fixed review volume ; False-hit rate per 1000 screens
on: Analyst hours per 1000 screens ; Missed true match incidents
gap: Test set made of synthetic typos only ; Threshold tuned on one list and applied to all

== customer-support-chatbot-banking | Banking Customer Support Assistant | llm-agents,nlp | seconds | production-grade | a=1.5 k=10 s=3 t=300
obj: Resolve 60% of banking support contacts end-to-end with a safe assistant, handing over complex or risky intents to humans with full context.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x,\text{KB})+\lambda\,\mathrm{PolicyViolation}
con: Never state balances without authentication ; PII redaction before the model ; Regulatory disclosure wording ; p95 under 4 s
sn: Intent | Calibrated intent router with abstain option | Always answering | Wrong confident answers on money matters create liability
sn: Actions | Tool calls with confirmation for state-changing actions | Free-text promises to fix things | The model cannot commit the bank to actions
sig: Intent confidence margin | gap between top-2 intent probabilities | Abstain or clarify when ambiguous | Calibrate on production traffic
sig: Auth level of session | verified level at the time of the request | Gates which tools are allowed | Re-check on every tool call
sig: Knowledge freshness | document last-updated date in citation | Stale policy answers | Index with effective dates
noise: Chat length | not a quality signal
noise: Thumbs-up rate alone | biased toward fast replies, not correct ones
base: Intent classifier with FAQ retrieval and canned answers.
prod: Router plus RAG assistant on a mid-size LLM with authenticated tool calls (balance, card block), policy filter and handoff packager.
pipe: Chat gateway @ websocket service ; Redaction layer @ PII detector ; Intent router @ fine-tuned classifier ; RAG assistant @ LLM with tools ; Policy and disclosure check @ guardrail ; Agent handoff @ human takeover ; Conversation analytics @ eval pipeline
edge: Customer asks to dispute a transaction | model offers wrong process | Dispute intents routed to deterministic flow, not generation
edge: Outage causes ticket surge | LLM costs spike and queue grows | Cached answers for incident FAQs and priority routing
off: Resolution accuracy on golden conversations ; Policy-violation rate
on: Containment with CSAT parity ; Escalation quality
gap: Containment counts abandoned chats as resolved ; Golden set drawn only from easy intents

== financial-document-extraction-invoices | Financial Document & Invoice Extraction | computer-vision,nlp | seconds | foundational | a=0.5 k=400
obj: Extract line items, totals and tax from invoices, receipts and statements with 98% field accuracy and straight-through processing above 70%.
loss: \mathcal{L}=\mathrm{CE}_{\text{token}}+\lambda\,\mathrm{ArithmeticConsistency}
con: Support 40 languages ; Totals must reconcile ; Under 5 s per document ; Audit trail of extractions
sn: Validation | Arithmetic and cross-field consistency checks | Per-token OCR confidence | A confident wrong digit is worse than a low-confidence right one
sn: Layout | Layout-aware models using position and structure | Plain text OCR to LLM | Reading order breaks tables and totals
sig: Subtotal-tax-total identity | sum of lines times tax rate versus total | Catches misread digits | Rounding rules per currency
sig: Vendor template memory | per-vendor field position priors | Repeated layouts extract better | Template drift when vendors redesign
sig: Field confidence margin | calibrated probability of top candidate versus runner-up | Routes ambiguous fields | Calibrate per field type
noise: Logo detection | not an extraction target
noise: Document colour | irrelevant to fields
base: OCR plus regex templates per vendor.
prod: LayoutLMv3 or document-VLM with constrained decoding to a JSON schema, validation rules, and active learning on human corrections.
pipe: Upload intake @ email and API ; Image cleanup @ deskew and denoise ; Layout extractor @ document VLM ; Validation engine @ arithmetic rules ; ERP posting @ idempotent API ; Exception queue @ AP clerk ; Correction feedback @ active learning set
edge: Handwritten annotations over printed totals | totals mis-extracted | Detect overwrites and route to human
edge: Multi-currency invoice | wrong tax rule applied | Currency-aware validators and explicit currency field
off: Field-level exact match ; Straight-through rate at 99% precision
on: Cost per processed document ; Posting error rate
gap: Test set from the same vendors as train ; STP counted without downstream error audit

== cash-flow-forecasting-smb | Cash-Flow Forecasting for Small Businesses | time-series,tabular | batch | production-grade | a=1 k=2
obj: Forecast 13-week cash positions per SMB account to power overdraft alerts, lending offers and working-capital advice.
loss: \mathcal{L}=\sum_{t}\sum_{q\in\{.1,.5,.9\}}\rho_q\!\left(y_t-\hat y_t^{(q)}\right)
con: 5M businesses forecast nightly ; Prediction intervals required ; Invoice-level explainability ; Cold-start for 6-week-old accounts
sn: Structure | Decompose into recurring obligations, receivables and discretionary flows | One global ARIMA per account | Aggregate series hide predictable obligations
sn: Uncertainty | Quantile forecasts with coverage checks | Point forecasts | Overdraft decisions need the 10th percentile not the mean
sig: Recurring payment schedule | detected periodic outflows with amount and day pattern | Predictable skeleton of cash flow | Detect only on data before forecast origin
sig: Receivable ageing | open invoices by days outstanding and payer behaviour | Timing of inflows | Use invoice status as-of origin
sig: Seasonality index by sector | normalised monthly pattern for the business sector | Cold-start prior | Fit on rolling windows to avoid regime leakage
noise: Business name | no information on cash flow
noise: Account holder age | weak and unstable
base: Seasonal naive plus recurring-payment calendar.
prod: Global temporal fusion transformer with static sector embeddings and detected-recurrence covariates, conformal calibration on top.
pipe: Transaction ingestion @ bank feeds ; Recurrence detector @ Spark job ; Feature builder @ point-in-time store ; Quantile forecaster @ TFT on GPU ; Conformal calibrator @ coverage tuning ; Alert publisher @ idempotent tables ; Customer actions @ outcome tracking
edge: Large one-off tax payment | forecast breaks | Calendar of statutory dates as known-future covariates
edge: New account with 6 weeks of data | volatile forecast | Hierarchical prior from sector peers with shrinkage
off: Weighted quantile loss ; Interval coverage at 80%
on: Avoided overdraft incidents ; Offer take-up of working-capital products
gap: Random cross-validation across time ; Forecast origin features include the forecast period

== personal-finance-categorisation | Transaction Categorisation & Merchant Enrichment | nlp | sub-100ms | foundational | a=6 k=1
obj: Assign accurate spend categories and clean merchant names to every transaction in real time so budgeting and insights are trustworthy.
loss: \mathcal{L}=\mathrm{CE}(y,p)+\lambda\,\mathrm{UserCorrectionConsistency}
con: 99% availability ; Under 40 ms per transaction ; Multi-lingual messy descriptors ; User overrides must stick
sn: Descriptor | Merchant-name normalisation before classification | Classifying raw bank strings | Strings like AMZN MKTP US*2K4 hide the real merchant
sn: Feedback | User corrections as high-weight labels | Treating all labels equal | Users are the ground truth for their own categories
sig: Normalised merchant ID | resolved merchant from alias dictionary and embedding | Anchors category | Resolution table versioned
sig: Amount-and-cadence pattern | amount bucket plus recurrence | Separates subscriptions from one-offs | Compute from user's prior history only
sig: MCC from card network | network category code when available | Strong prior | Often missing for bank transfers
noise: Transaction ID | random identifier
noise: Exact timestamp second | no category information
base: Keyword and MCC rules.
prod: Distilled multilingual transformer on normalised descriptors plus user-specific override layer and merchant-entity resolution.
pipe: Transaction feed @ Kafka ; Descriptor cleaner @ rule normaliser ; Merchant resolver @ embedding lookup ; Category classifier @ distilled BERT ; User override layer @ per-user rules ; Feedback collector @ correction events
edge: New merchant never seen | classified wrongly with high confidence | Open-set threshold routes to nearest-neighbour plus review
edge: Bank changes descriptor format | accuracy collapses overnight | Format-drift monitor and fast alias-dictionary patching
off: Macro-F1 across categories ; Merchant resolution accuracy
on: User correction rate ; Budget feature engagement
gap: Test split by transaction not by merchant ; Category taxonomy changes between train and test

== spend-insights-and-nudges-recommender | Spend Insights & Financial Nudges Recommender | recommender,tabular | batch | production-grade | a=0.5 k=2
obj: Deliver the one financial nudge per week that a user is most likely to act on and benefit from, without notification fatigue.
loss: \mathcal{L}=-\sum_{(u,n)}\left[r_{un}\log\sigma(s_{un})+(1-r_{un})\log(1-\sigma(s_{un}))\right]+\lambda\,\mathrm{FatiguePenalty}
con: Regulatory suitability for financial prompts ; Frequency caps ; No dark patterns ; Quiet hours
sn: Benefit | Estimated financial benefit to the user, not just click probability | Maximising taps | Clickbait nudges erode trust and complaints rise
sn: Fatigue | Per-user notification budget and recency decay | Sending whenever a rule fires | Over-notification drives opt-outs permanently
sig: Savings-gap estimate | gap between current savings rate and goal trajectory | Relevance of saving nudge | Uses balances as-of nudge time
sig: Subscription creep | new recurring charges relative to last quarter | Actionable saving | Detection before notification date
sig: Nudge response history | open and action rate by nudge type | Personal preference | Exclude the nudge under evaluation
noise: Notification open within 1 second | accidental opens
noise: Device language | weak correlation to preferences
base: Rule-triggered nudges ranked by priority.
prod: Two-tower candidate model plus a multi-objective ranker (action probability, benefit, fatigue) with a weekly budget optimiser.
pipe: Insight generator @ Spark rules ; Candidate retrieval @ two-tower ; Multi-objective ranker @ GBDT ; Budget optimiser @ constrained selection ; Suitability filter @ compliance rules ; Push dispatcher @ notification service ; Response events @ analytics
edge: Month-end paycheck day | all users get saving nudges simultaneously | Staggered sends and capacity-aware scheduler
edge: User in financial hardship | savings nudge is inappropriate | Hardship signals suppress certain nudge classes
off: NDCG on action events ; Benefit-weighted precision
on: Goal progress per active user ; Opt-out rate
gap: Training on opens rather than helpful actions ; Position bias from always-top placement

== fraud-ring-detection-community | Fraud Ring Detection via Community Detection | graph | batch | staff-principal | a=3 k=2
obj: Find coordinated fraud rings across accounts, devices and merchants for batch takedown rather than one-at-a-time blocking.
loss: \mathcal{L}=-\sum_{(u,v)\in E}\log\sigma(z_u^\top z_v)-\sum_{(u,w)\notin E}\log\sigma(-z_u^\top z_w)+\lambda\,\mathrm{Modularity}
con: Ring decisions need human sign-off ; Graph of 1B edges ; Weekly full run plus daily incremental ; Low collateral damage
sn: Structure | Dense bipartite cores and temporal burst co-activity | Individual account anomaly scores | Coordinated actors keep each account just under thresholds
sn: Scale | Incremental community updates | Rebuilding the full graph daily | Full rebuilds cannot meet daily cadence at 1B edges
sig: Shared-resource density | share of accounts in a cluster sharing devices or payment instruments | Ring cohesion | Resource IDs hashed at event time
sig: Temporal co-burst | correlation of activity bursts among cluster members | Scripted behaviour | Bin windows before labels
sig: Cluster age and growth | rate of new accounts joining the cluster | Rings grow in waves | Snapshot cluster membership per day
noise: Cluster size alone | large benign communities exist (families, offices)
noise: Edge weights from raw amounts | dominated by whales
base: Connected components on shared device or card edges.
prod: Leiden community detection on a weighted heterogeneous graph with GNN node scores, ring-level classifier, and incremental updates via streaming edges.
pipe: Edge extractor @ Spark ; Graph builder @ GraphFrames ; Community detection @ Leiden on GPU ; Ring classifier @ GBDT ; Ring dossier builder @ evidence summary ; Takedown review @ fraud ops ; Outcome labels @ confirmed rings
edge: Corporate NAT merges unrelated users | giant false component | Edge down-weighting for high-degree shared resources
edge: Fraud actors split rings after takedown | detection decays | Track ring lineage and monitor re-formation signatures
off: Ring-level precision and recall ; Normalised mutual information on labelled rings
on: Accounts removed per ring ; Repeat-fraud rate after takedown
gap: Evaluating on rings found by the same heuristic ; Time leakage via edges created after the label date

== mule-account-detection | Money Mule Account Detection | graph,tabular | batch | production-grade | a=3 k=2
obj: Identify accounts used to move proceeds of fraud (mules) before cash-out, using flow shape and onboarding signals.
loss: \mathcal{L}=\mathrm{FL}(p,y)+\lambda\,\mathrm{GraphSmoothness}(p,G)
con: Case disposition within 48h ; Customer-friendly account holds ; Fair treatment of students and new migrants ; Daily scoring
sn: Flow shape | In-and-out within hours with many unrelated senders | Total monthly volume | Mules have modest volume with unusual dwell time
sn: Cohort | New-account behaviour in first 14 days | Long-run history | Mule accounts are young; history does not exist yet
sig: Dwell time of funds | median seconds between credit and debit | Mules pass funds through | Compute on settled transactions
sig: Sender diversity | distinct unrelated senders to the account in 7 days | Collection point pattern | Exclude known family/household links
sig: Beneficiary fan-out | new payees added in the first 30 days | Cash-out routes | Count payees before the alert
noise: Account balance snapshot | mules keep balance near zero by design
noise: Age of customer | weak and risks bias
base: Rules on inbound-outbound ratio in first 30 days.
prod: Bipartite GNN over payer-payee flows with temporal edges plus GBDT on account-level features; scored daily with fast re-score on risky events.
pipe: Payment event stream @ Kafka ; Flow feature builder @ Flink ; Account graph @ temporal graph store ; Mule scorer @ GNN plus GBDT ; Hold policy @ friction rules ; Investigation queue @ fraud analysts ; Confirmed mule labels @ bank consortium
edge: Genuine marketplace seller receives many payments | flagged as mule | Seller verification feature and merchant-like profile
edge: Mule accounts rotate after first alert | behavioural drift | Graph-level features that persist across account changes
off: PR-AUC at fixed review capacity ; Detection lead time before cash-out
on: Mule accounts closed before cash-out ; False hold rate
gap: Positives only from accounts already investigated ; Features computed after the account was closed

== insider-trading-surveillance | Insider Trading & Market Abuse Surveillance | nlp,time-series,graph | batch | staff-principal | a=2 k=6
obj: Detect suspicious trading ahead of material news by linking trader activity, communications and corporate events for compliance review.
loss: \mathcal{L}=\mathrm{BCE}+\lambda\,\mathrm{Calibration}+\mu\,\mathrm{AlertBudgetPenalty}
con: Records retention per MiFID II / SEC rules ; Chinese-wall boundaries ; Alert volume under compliance capacity ; Explainable timeline per alert
sn: Timing | Abnormal returns and positioning in the window before announcements | Absolute trade size | Large benign trades are common; timing relative to news is the signal
sn: Linkage | Communications or relationship links between trader and insider | Trade pattern alone | Without links, many alerts are coincidence
sig: Pre-announcement abnormal return | cumulative abnormal return relative to a market model | Informed trading shows before news | Event dates must be public timestamps
sig: Position change vs baseline | deviation from the trader's historical position in the name | Unusual conviction | Baseline excludes the window
sig: Communication proximity | graph distance and message volume to insiders | Information channel | Respect chinese-wall data scoping
noise: P&L of the trade | outcome-based, not the cause
noise: Number of trades per day | dominated by market makers
base: Threshold rules on volume and price moves before news.
prod: Event-study features feeding a GBDT, graph features from comms metadata, and an LLM timeline summariser for compliance analysts.
pipe: Trade and news ingestion @ Kafka ; Event-study feature job @ Spark ; Relationship graph @ comms metadata ; Abuse scorer @ GBDT ; Timeline summariser @ LLM with citations ; Compliance analyst review @ case tool ; Disposition labels @ feedback
edge: Earnings season floods alerts | review queue overflows and genuine cases age out | Per-event alert budget with ranking and sampling
edge: Rumour-driven moves with no inside source | analysts chase alerts that have no information channel | Public-news timestamp check before alerting
off: Precision at analyst capacity ; Recall on historical enforcement cases
on: Alerts per confirmed case ; Review time per alert
gap: Enforcement cases are a tiny biased positive set ; News timestamps not point-in-time
