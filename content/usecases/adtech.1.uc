# AdTech & Marketing, part 1 (use cases 1-25)
== real-time-bidding-bid-optimization | Real-Time Bidding Bid Optimisation | reinforcement-learning,tabular | sub-10ms | staff-principal | a=40 k=1
obj: Compute the bid for every impression opportunity that maximises campaign value under budget and KPI constraints within the auction deadline.
loss: \max_b\;\mathbb{E}\!\left[(v\cdot p_{\text{conv}}-\text{price})\cdot \mathbb{1}[\text{win}(b)]\right]\ \text{s.t. spend}\le B
con: Response under 8 ms of a 100 ms exchange timeout ; 1M bid requests per second peak ; Calibrated probabilities ; Budget never exceeded ; Campaign budgets paced by a primal-dual or PID controller updated every few seconds ; First-price auctions with bid shading ; In-flight spend reserved across the 50 to 500 ms win-notice delay
sn: Calibration | Calibrated pCTR and pCVR used in the bid formula | Ranking-only models | Bid = value times probability so miscalibration directly loses money
sn: Landscape | Model the win-price distribution per segment | Fixed bid multipliers | The market clearing price moves by hour and publisher
sn: Pacing | Primal-dual or PID controller updating a per-campaign shadow-price multiplier every few seconds from live spend streams | Predicting pCTR and pCVR well while the budget burns out by mid-morning | An accurate bid on a campaign with no budget left is worth nothing and spend must follow the traffic curve
sn: Auction type | First-price bid shading from a censored clearing-price model | Bidding true value in a first-price auction | You overpay by the whole gap between your value and the clearing price
sig: Calibrated pCVR | predicted conversion probability after isotonic calibration | Value estimate | Calibrate on delayed-feedback-corrected labels
sig: Win-rate curve | win probability as a function of bid for the segment | Bid landscape | Censored data below the observed bids
sig: Pacing multiplier | budget remaining relative to the ideal pacing curve | Spend control | Real-time state
sig: Clearing-price density | survival regression on won and lost bids per exchange and segment | Shading target between the second-highest expected bid and the advertiser valuation | Lost bids are right-censored, so fitting on won bids only makes the price look too high
sig: In-flight spend reserve | sum of submitted bids whose win notice (burl) has not arrived | Stops overspend during the notice delay | Counting only billed wins lets a traffic spike overspend the budget
noise: Raw user-agent string | high cardinality, sparse and unstable
noise: Bid request ID | random identifier
base: Linear bidding: bid = base value times pCTR times a pacing factor.
prod: Calibrated GBDT or DCN pCVR, a learned win-price model and a Lagrangian bid optimiser with a feedback pacing controller. Bids are shaded from a censored clearing-price model and scaled by a campaign multiplier that the pacer updates every few seconds, with in-flight spend reserved until the win notice arrives.
pipe: Bid request listener @ Envoy gRPC ; Feature assembly @ in-process cache ; pCTR pCVR model @ ONNX CPU ; Bid optimiser @ Lagrangian formula ; Pacing controller @ budget service ; Bid responder @ OpenRTB ; Win and loss logs @ Kafka
edge: Exchange changes auction type from second to first price | bids systematically overpay for weeks | Detect clearing-price shift and retrain win-price model with bid shading
edge: Delayed conversions arrive days after the impression | recent traffic looks worse than it is | Delayed-feedback model with elapsed-time features
edge: Win notices delayed or dropped | budget accounting lags and the campaign overspends | Reserve in-flight spend per bid, expire unreconciled reservations and reconcile against exchange billing daily
edge: Pacer integral wind-up after an outage | the multiplier saturates and floods or starves spend after recovery | Clamp and reset the integrator, rate-limit multiplier changes and fall back to a flat conservative multiplier
off: Log-loss and calibration error ; Offline simulated value under budget
on: Cost per acquisition ; Return on ad spend
gap: Training only on won impressions ignores the censored losing bids ; Offline replay cannot reproduce the market response to new bids

== ctr-prediction-ads | Ad Click-Through Rate Prediction | tabular,recommender | sub-10ms | staff-principal | a=40 k=1
obj: Predict click probability for each ad candidate with calibrated outputs at millions of requests per second.
loss: \mathcal{L}=-\sum_i\left[y_i\log p_i+(1-y_i)\log(1-p_i)\right]
con: 2 ms inference budget ; Sparse categorical features with billions of IDs ; Online learning for freshness ; Calibration by segment
sn: Features | Feature crosses learned by DCN or DeepFM with hashed embeddings | Handcrafted crosses only | Manual crosses cannot cover billions of ID pairs
sn: Freshness | Hourly incremental updates | Daily retrain only | New ads cold-start badly under daily retraining
sn: Position | Position-aware training and a randomised exploration slice | Learning click rates from logs ranked by the old model | The model learns the old ranking and punishes ads that were never shown on top
sn: Calibration | Calibrated probabilities per placement because the auction multiplies them by bids | Optimising AUC only | A well-ranked but miscalibrated score misprices every auction
sig: Ad-user embedding interaction | dot product of ad and user embeddings | Captures personal relevance that ids alone cannot | Embedding versions must match between training and serving
sig: Historical CTR with smoothing | Bayesian-smoothed CTR by ad and placement | A strong prior for ads with some history | Count only impressions before the scored one
sig: Context features | placement, device, hour | Placement and time change click propensity a lot | All known at request time
sig: Position at display | slot number where the ad was shown, used in training and set to the top slot at serving | Separates how good the ad is from how visible it was | Forgetting to neutralise it at serving time double-counts the position
sig: Ad age and impression count | hours since first impression and log of impressions so far | Tells the model how far to trust the ad's own history | Computed from impressions strictly before the scored one
noise: Impression ID | random
noise: Advertiser name text | high cardinality duplicate of advertiser ID
noise: Raw user agent string | thousands of rare variants that hash into noise, device class already carries the signal
base: Logistic regression with hashed feature crosses.
prod: DCN-v2 with embedding tables sharded across hosts, FTRL-style online updates for the head and quantised CPU serving.
pipe: Ad request @ ad server ; Feature hashing @ in-process ; Embedding lookup @ sharded tables ; DCN-v2 scorer @ ONNX INT8 ; Calibration layer @ per-segment isotonic ; Candidate ranking @ auction ; Click logs @ Kafka
edge: Embedding table updates mid-serving cause version skew | scores jump for a fraction of traffic | Versioned atomic embedding swaps with canary traffic
edge: New creative format with no history | CTR underestimated and never gets exposure | Exploration budget and content-based priors
edge: Accidental taps counted as clicks | mobile banner mis-taps inflate CTR and reward misleading creatives | Filter clicks with very short dwell time from labels and history
edge: Traffic shift after a site redesign | placement mix changes and calibration drifts for a segment | Per-placement calibration refreshed hourly with an alarm on expected versus observed clicks
off: AUC, log-loss and normalised cross-entropy ; Calibration by placement
on: Revenue per mille ; Advertiser CTR satisfaction
gap: Position bias unmodelled so the model learns the old ranking ; Training on clicks that include accidental taps

== cvr-prediction-delayed-feedback | Conversion Rate Prediction with Delayed Feedback | tabular,time-series | sub-100ms | staff-principal | a=20 k=1
obj: Predict conversion probability when conversions arrive minutes to weeks after the click, without biasing toward fast converters.
loss: \mathcal{L}=-\sum_i\left[y_i\log\left(p_i\,\lambda_i e^{-\lambda_i d_i}\right)+(1-y_i)\log\left(1-p_i+p_i e^{-\lambda_i d_i}\right)\right]
con: Fresh model within hours ; Attribution-window changes ; Long-tail delays ; Calibration for bidding
sn: Delay | Delay model jointly learned with conversion probability | Labelling unconverted recent clicks as negatives | Recent negatives are mostly not-yet-converted
sn: Windows | Fixed observation window for evaluation labels | Mixed windows across cohorts | Mixed windows make metrics incomparable
sig: Elapsed time since click | seconds since click at label time | Delay modelling | Server clock
sig: Product category delay profile | median delay by vertical | Prior for delay | Matured cohorts
sig: Click quality features | dwell time on landing page | Intent | Consent
noise: Click ID | random
noise: Campaign creation date | cohort artefact
base: Train on conversions within a fixed 24-hour window.
prod: Delayed-feedback model (DFM or ES-DFM) with fake-negative weighting, hourly updates and a calibration head tied to bid optimisation.
pipe: Click and conversion streams @ Kafka ; Label joiner @ Flink with delay windows ; Delay-aware trainer @ GPU incremental ; CVR scorer @ ONNX ; Calibration layer @ isotonic ; Bidding service @ pCVR consumer ; Late-conversion corrections @ reprocessing
edge: Attribution partner changes lookback window | label definition changes silently | Window version in features and backfill labels
edge: Tracking outage drops conversion postbacks | model learns that conversion fell | Postback volume monitors and training exclusion windows
off: Calibration at matured labels ; Log-loss on mature cohorts
on: Cost per acquisition after full attribution ; Spend efficiency
gap: Evaluating on immature labels ; Dropping late conversions from evaluation sets

== budget-pacing-controller | Campaign Budget Pacing | reinforcement-learning,time-series | sub-10ms | advanced | a=40 k=1
obj: Spread campaign spend smoothly over the flight so budgets neither exhaust early nor underdeliver, adapting to traffic fluctuations.
loss: \min\;\sum_t\left(S_t-S^*_t\right)^2+\lambda\,\mathrm{ThrottleVariance}
con: Overspend tolerance under 1% ; Decision on every bid ; Multi-campaign interactions ; Distributed counters
sn: Control | Feedback controller on forecast traffic | Fixed daily caps | Traffic is non-stationary and caps run out in the morning
sn: Quality | Pace toward high-value impressions | Uniform throttling | Uniform throttling wastes budget on low-value traffic
sig: Spend error vs target curve | actual minus ideal cumulative spend | Control signal | Distributed counters lag
sig: Traffic forecast | expected requests per minute | Planning | Forecast quality
sig: Win-rate response | change in win rate to bid multiplier | Controller gain | Estimated online
noise: Campaign name | none
noise: Advertiser tenure | none
base: Even throttling at a fixed probability.
prod: PID-style pacing with traffic forecast feedforward and a quality-aware throttle that preferentially buys high-value impressions.
pipe: Spend counters @ Redis sharded ; Traffic forecaster @ lightweight model ; Pacing controller @ PID with feedforward ; Throttle policy @ probability and bid multiplier ; Bid service @ consumer ; Billing reconciliation @ batch ; Pacing metrics @ monitoring
edge: Counter lag across data centres allows overspend | the budget is exceeded in minutes | Conservative global limits and per-region reservations
edge: Traffic outage then recovery | controller overreacts and bursts spend | Anti-windup limits and ramp caps
off: Spend-curve tracking error ; Delivery vs budget
on: Budget utilisation ; Overspend percentage
gap: Testing controllers on smooth traffic only ; Ignoring distributed counter delay

== first-price-bid-shading | First-Price Auction Bid Shading | reinforcement-learning,tabular | sub-10ms | staff-principal | a=40 k=1
obj: Shade bids below private value in first-price auctions to retain surplus while preserving win rate.
loss: \max_b\;(v-b)\cdot\Pr(\text{win}\mid b,x)
con: Per-request latency under 1 ms ; Win-price feedback only on wins (or sometimes losses) ; Per-exchange differences ; Stability
sn: Censoring | Estimate the win-price distribution with censored regression | Regress on winning prices only | Winners-only data biases the landscape low
sn: Segmentation | Segment-specific shading functions | One global shading factor | Competition differs by publisher and placement
sig: Predicted clearing price | distribution quantiles of the market price | Shading | Exchange feedback
sig: Value estimate | expected impression value | Upper bound | Calibrated
sig: Competition intensity | recent win rate at multipliers | Aggressiveness | Windowed
noise: Bid request ID | none
noise: Page URL query strings | high-cardinality
base: Bid a fixed fraction (0.8) of value.
prod: Censored distribution model of clearing price (e.g. mixture density network) with optimisation of expected surplus per request.
pipe: Bid request @ exchange ; Value model @ pCVR times value ; Clearing-price model @ MDN ; Shade optimiser @ analytic solve ; Floor and cap rules @ constraints ; Bid response @ OpenRTB ; Outcome feedback @ win notices
edge: Exchange hides losing bid information | model cannot learn the upper tail | Exploration bids and sampling of losses where available
edge: Competitors adapt to shading | clearing prices drift quickly | Drift monitors and rapid retraining
off: Surplus per impression in replay ; Win-price likelihood
on: Cost per won impression at equal win rate ; Surplus uplift
gap: Training on win prices only ; Replay assumes competitors do not react

== floor-price-optimization-publisher | Publisher Floor-Price Optimisation | tabular,reinforcement-learning | sub-100ms | advanced | a=30 k=1
obj: Set per-impression floor prices to raise publisher yield without suppressing fill or driving buyers away.
loss: \max_{f}\;\mathbb{E}\!\left[\max(\text{bid}_{(1)},\text{bid}_{(2)},f)\cdot\mathbb{1}[\text{bid}_{(1)}\ge f]\right]
con: Latency 30 ms ; Buyer fairness ; Header-bidding complexity ; Avoid long-term demand loss
sn: Bidders | Model buyer response to floors over time | Optimise single-auction revenue | Buyers learn and lower bids if floors rise
sn: Evaluation | Randomised floor experiments | Counterfactual from logs | Logged auctions never saw other floors
sig: Predicted top-bid distribution | quantiles of the highest bid | Floor candidates | Censored by earlier floors
sig: Placement and context value | page type and position | Value | Context
sig: Buyer demand elasticity | bids' response to floor change | Long run | Experiments
noise: Impression ID | none
noise: Page title | text noise
base: Static floors by placement.
prod: Distributional top-bid model with contextual bandit floor selection and a long-term demand guardrail.
pipe: Ad request @ SSP ; Context features @ cache ; Top-bid distribution model @ quantile GBDT ; Floor optimiser @ bandit ; Auction execution @ SSP ; Revenue logs @ stream ; Buyer response monitor @ analytics
edge: Demand partners reduce bids after repeated high floors | yield declines after initial gains | Long-horizon holdouts and elasticity monitoring
edge: Floor too high causes unsold inventory | fill rate collapses | Fill-rate guardrail and automatic backoff
off: Simulated revenue under logged-bid distributions ; Calibration of top-bid quantiles
on: Revenue per thousand impressions ; Fill rate
gap: Counterfactual revenue using bids from different floors ; Ignoring bidder adaptation

== audience-lookalike-modeling | Lookalike Audience Modelling | tabular,recommender | batch | advanced | a=0.1 k=3
obj: Find users who resemble a seed audience at scale for acquisition campaigns, with privacy-safe features.
loss: \mathcal{L}=\mathrm{BCE}(\text{seed vs non-seed})+\lambda\,\mathrm{Calibration}
con: Privacy and consent ; Seed size variation ; Daily refresh for 1B users ; Avoid sensitive attributes
sn: Seeds | Seed quality filters and weighting | Treat all seed users equally | Low-value seeds teach the model to find low-value users
sn: Objective | Optimise for downstream conversion not seed similarity | Similarity to seeds alone | Similar users may never convert
sig: User embedding similarity | cosine to seed centroid or cluster mix | Similarity | Embedding drift
sig: Engagement recency | days since last activity | Reach quality | Window
sig: Seed conversion propensity | model-based seed value | Weighting | Matured
noise: Raw user ID | none
noise: Sensitive attribute proxies | policy risk
base: Rule-based demographic and interest segments.
prod: Two-tower user embeddings with seed-weighted positive-unlabeled learning and a conversion-calibrated ranking head.
pipe: User features @ feature store ; Seed ingestion @ advertiser upload ; Seed quality filter @ rules ; PU learning model @ GBDT or two-tower ; Audience scorer @ batch ; Audience export @ DSP ; Performance feedback @ campaign results
edge: Tiny seed list (<1,000) | model overfits and returns narrow audience | Minimum-size handling and broad-prior blending
edge: Seed includes bots or test users | audience is polluted | Seed anomaly filters
off: Lift in conversion rate vs random ; Calibration of audience scores
on: Cost per acquisition by audience size ; Reach at target CPA
gap: Positive-unlabeled bias ignored ; Evaluation only on seed-similar metrics

== identity-resolution-cookieless | Identity Resolution in a Cookieless World | graph,tabular | batch | staff-principal | a=0.2 k=3
obj: Link devices and first-party identifiers into privacy-compliant identity clusters for measurement and addressability.
loss: \mathcal{L}=\mathrm{BCE}(\text{same person})+\lambda\,\mathrm{TransitivityPenalty}
con: Consent and privacy law ; Deterministic and probabilistic linking ; Fraud resistance ; Cluster stability
sn: Evidence | Deterministic logins first, probabilistic only with confidence | Aggressive probabilistic merging | False merges attribute actions to the wrong person
sn: Stability | Stable cluster IDs across updates | Rebuild IDs each run | Changing IDs break frequency capping and measurement
sig: Deterministic link strength | shared login or hashed email | Strong evidence | Hash salting
sig: Co-occurrence patterns | shared IP and time patterns | Probabilistic link | Shared networks
sig: Household vs individual score | probability devices belong to one person | Granularity | Context
noise: IP address alone | shared networks
noise: Device model | weak
base: Cookie syncing and last-touch matching.
prod: Graph-based identity clustering with link confidence, constrained clustering to avoid merging large components, and consent-aware filters.
pipe: Identifier events @ stream ; Consent filter @ policy ; Link scorer @ GBDT ; Graph builder @ edge store ; Constrained clustering @ Leiden ; ID service @ lookup API ; Quality audits @ human
edge: Public WiFi merges unrelated users | giant false clusters | Down-weight high-degree shared signals
edge: User withdraws consent | links must be removed | Deletion propagation pipeline with SLAs
off: Link precision and recall on deterministic holdout ; Cluster purity
on: Match rate ; Frequency capping accuracy
gap: Evaluating on deterministic links that inflate probabilistic accuracy ; Ignoring household effects

== contextual-targeting-page-classification | Contextual Targeting & Page Classification | nlp | sub-100ms | advanced | a=30 k=4
obj: Classify page and video content into IAB topics and sentiment in real time to target ads without user identifiers.
loss: \mathcal{L}=\sum_k\mathrm{BCE}(y_k,p_k)
con: Classification latency under 50 ms with caching ; Multilingual ; New pages constantly ; Brand-safety coupling
sn: Freshness | Fast pre-classification on crawl with caching | Classify on every ad request | Per-request classification is too slow and costly
sn: Granularity | Page-level and entity-level topics | Domain-level labels | Domains host diverse content
sig: Page text embedding | text encoder embedding | Topic | Cleaning
sig: Entity and keyword extraction | NER and keyphrases | Targeting keys | Quality
sig: Title and URL tokens | URL path tokens | Cheap early signal | Regex
noise: Navigation boilerplate | repeated across pages
noise: Comment sections | off-topic and risky
base: Domain-level category lists.
prod: Distilled multilingual classifier with page cache keyed by canonical URL, async crawl and refresh, and fallback to URL-based classifier.
pipe: Ad request URL @ SSP ; Page cache lookup @ Redis ; Fallback URL classifier @ lightweight ; Crawler and content extractor @ async ; Topic classifier @ distilled transformer ; Segment mapper @ taxonomy ; Performance logs @ analytics
edge: Breaking news page not yet crawled | ads shown with no context signal | Fallback URL classifier and fast-crawl priority queue
edge: Single-page apps change content without URL change | stale classification | Content-hash keyed caching and refresh
off: Macro-F1 on IAB taxonomy ; Cache hit rate
on: Contextual campaign CPA vs behavioural ; Addressable inventory share
gap: Evaluating on clean article pages only ; Taxonomy version mismatch

== brand-safety-content-classification | Brand-Safety Content Classification | nlp,computer-vision | sub-100ms | advanced | a=30 k=40
obj: Detect unsafe or unsuitable content (violence, hate, adult, misinformation) near ads at page, video and stream level with fine-grained brand controls.
loss: \mathcal{L}=\sum_k w_k\,\mathrm{BCE}(y_k,p_k)
con: Advertiser-defined suitability tiers ; Video frames and audio ; Precision to avoid over-blocking publishers ; Appeals
sn: Granularity | Floor vs suitability tiers with brand-specific thresholds | Binary safe/unsafe | Brands differ in risk appetite
sn: Over-blocking | Measure publisher revenue loss from false blocks | Maximise recall only | Over-blocking destroys inventory value
sig: Category probabilities | multi-label scores per risk category | Controls | Calibration
sig: Video-frame risk aggregation | max and mean frame risk | Video decisions | Sampling rate
sig: Page-level context | headline and surrounding text | Context | Cleaning
noise: Ad slot position | none
noise: Publisher size | none
base: Keyword blocklists.
prod: Multimodal classifier with calibrated category scores, brand-specific thresholds and human review for appeals, cached at page/video level.
pipe: Content crawl and frames @ ingest ; Text classifier @ transformer ; Video classifier @ frame and audio models ; Score aggregator @ per-category ; Brand policy engine @ thresholds ; Appeals review @ human ; Block logs @ analytics
edge: News about sensitive events gets blocked broadly | news publishers lose revenue | Context-aware classification separating reporting from endorsement
edge: Adversarial text obfuscation by bad actors | unsafe pages pass | Character normalisation and visual text detection
off: Per-category precision and recall ; False block rate on news
on: Brand-safety incident rate ; Publisher revenue retention
gap: Training on keyword-labelled data ; Test sets lacking news edge cases

== invalid-traffic-detection | Invalid Traffic (IVT) Detection | tabular,graph | sub-100ms | advanced | a=40 k=2
obj: Identify bot, hijacked-device and click-farm traffic across impressions and clicks before billing and bidding on it.
loss: \mathcal{L}=\mathrm{FL}(p,y)+\lambda\,\mathrm{Calibration}
con: Pre-bid decision in 5 ms ; Post-bid refunds ; MRC accreditation standards ; Adversarial adaptation
sn: Scale | Aggregate traffic-pattern features (per IP, device, app) | Per-event rules | Individual events look human, the aggregates do not
sn: Adversary | Retrain on new tactics frequently | Static models | Fraud evolves in days
sig: IP and device request velocity | requests per minute per entity | Bots are fast | Window before request
sig: Click-to-install time distribution | time between click and install | Click injection | Matured installs
sig: Traffic source anomaly score | deviation from publisher historical patterns | Site fraud | Baselines
noise: User-agent text | trivially faked
noise: Referrer URL | forgeable
base: Blocklists and rule-based filters.
prod: Two-stage: fast pre-bid GBDT on aggregates, post-bid deep graph model for delayed refunds, with active learning from refund disputes.
pipe: Event stream @ Kafka ; Entity aggregates @ Flink ; Pre-bid IVT scorer @ GBDT ; Post-bid graph model @ GNN ; Policy engine @ block or refund ; Fraud analyst @ human ; Dispute outcomes @ labels
edge: Legitimate traffic spike from viral content | flagged as bot flood | Publisher-baseline and content-event features
edge: Sophisticated bots mimic human timing | bots that replicate human timing and mouse patterns evade the rules and recall falls | Device attestation and behavioural biometrics where available
off: Precision and recall at fixed spend blocked ; Refund accuracy
on: Invalid traffic rate ; Advertiser refund requests
gap: Labels only from detected fraud ; Training on stale tactics

== click-fraud-and-bot-detection-search | Click Fraud Detection for Search Ads | tabular,time-series | sub-100ms | advanced | a=2 k=2
obj: Detect competitor clicking and click farms on paid search to protect advertisers' budgets and keep trust.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{CPC})
con: Real-time filtering within billing ; Appeals ; Low false positives for genuine users ; Advertiser reporting
sn: Intent | Post-click behaviour (bounce, dwell, conversion) | Click count per IP | Click farms rotate IPs
sn: Value | Weight by cost per click | Equal weighting | Expensive clicks matter most
sig: Post-click dwell and bounce | seconds on landing page | Intent | Consent
sig: Advertiser-competitor click pattern | repeated clicks from rivals' networks | Malicious | Known competitors
sig: Session-level click sequence | click timing patterns | Automation | Window
noise: Query text | not fraud signal
noise: Advertiser industry | none
base: IP-based click-count rules.
prod: Session-level model with post-click features and network-level clustering, plus advertiser-specific thresholds.
pipe: Click stream @ ad server ; Session builder @ Flink ; Click-fraud model @ GBDT ; Network cluster detector @ graph ; Billing filter @ refund logic ; Advertiser report @ dashboard ; Investigation @ human
edge: Mobile carrier NAT aggregates many users | IP-based false positives | Device-level and session-level features instead of IP-only
edge: Advertisers dispute filtered clicks | advertisers dispute why clicks were filtered, eroding trust without clear evidence | Transparent reporting and evidence
off: Precision at fixed recall of confirmed fraud ; Spend saved
on: Filtered spend share ; Advertiser complaint rate
gap: Confirmed fraud sample biased to obvious cases ; Features computed after billing

== creative-optimization-bandits | Creative Optimisation with Bandits | reinforcement-learning | sub-100ms | advanced | a=10 k=1
obj: Choose which creative variant to show each user to maximise conversions, learning quickly while exploring new variants.
loss: \text{regret}_T=\sum_{t=1}^T\left(\mu^*_{x_t}-\mu_{a_t,x_t}\right)
con: Few impressions per variant ; Creative fatigue ; Brand guidelines ; Fast learning
sn: Exploration | Thompson sampling with contextual priors | A/B test with fixed split | Fixed splits waste traffic on losers
sn: Fatigue | Time-decaying creative performance | Stationary assumption | Creatives wear out
sig: Variant posterior CTR | Beta posterior by context | Selection | Prior
sig: Creative age and exposures | frequency per user | Fatigue | Counts
sig: Creative attributes | colour, copy tone, format | Generalisation | Annotation
noise: Creative file name | none
noise: Designer | none
base: Even rotation, then manual pick of the winner.
prod: Contextual Thompson sampling with attribute-based priors for new creatives and decay for fatigue.
pipe: Ad request @ ad server ; Context features @ cache ; Bandit selector @ Thompson sampling ; Creative renderer @ template ; Impression and click logs @ stream ; Posterior updater @ online ; Creative review @ marketing team
edge: Early random luck promotes a poor creative | allocation collapses on a noisy winner | Minimum exploration floor and prior shrinkage
edge: Brand guideline violations in generated creatives | unapproved creative shown | Approval gating before entering the bandit
off: Offline replay regret ; Posterior calibration
on: Conversion rate lift vs rotation ; Creative refresh cycle
gap: Replay with non-uniform logging ; Ignoring non-stationarity

== genai-creative-generation | GenAI Ad Creative Generation | llm-agents,computer-vision | seconds | advanced | a=0.05 k=500 s=3 t=300
obj: Generate on-brand headlines, copy and image variants at scale and filter them by predicted performance and policy.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{brief})+\lambda\,\mathrm{PolicyViolation}
con: Brand voice consistency ; Ad policy compliance ; IP safety ; Human approval for new brand templates
sn: Selection | Generate many, score by predicted performance and compliance | Ship the first generation | Quality varies widely between samples
sn: Brand | Brand guidelines as retrieval context and checks | Generic prompts | Off-brand copy hurts trust
sig: Predicted CTR of creative | performance model score | Ranking | Calibration
sig: Policy classifier score | policy violation probability | Safety | Taxonomy
sig: Brand-similarity score | embedding similarity to brand corpus | Consistency | Corpus
noise: Output length | not a performance driver
noise: Model temperature | tuning
base: Human copywriters with templates.
prod: Retrieval-augmented generation with brand guidelines, many candidates scored by a performance and policy ranker, human approval workflow.
pipe: Campaign brief @ marketing UI ; Brand context retriever @ vector store ; Generator LLM and image model @ GPU ; Policy and brand filter @ classifiers ; Performance ranker @ CTR model ; Marketer approval @ human ; Live performance @ feedback
edge: Generated claims are legally unsupported | regulatory violations | Claim verification against approved claims library
edge: Generated image with trademarked element | a generated image contains a trademarked element, creating intellectual-property risk | IP detection filters and provenance
off: Policy pass rate ; Predicted CTR rank correlation with realised
on: Creative production time ; CTR vs human baseline
gap: Predicted CTR trained on human-made creatives ; Measuring volume instead of lift

== pre-launch-creative-performance-prediction | Pre-Launch Creative Performance Prediction | computer-vision,tabular | seconds | advanced | a=0.05 k=800
obj: Predict how well an image or video creative will perform before spending, so weak creatives are fixed or dropped.
loss: \mathcal{L}=\mathrm{Huber}(\text{CTR},\widehat{\text{CTR}})+\lambda\,\mathrm{RankLoss}
con: Cold-start creatives ; Rank-ordering accuracy matters ; Explainable feedback to designers ; Creative formats vary
sn: Ranking | Rank creatives within campaign/context | Absolute CTR regression | Absolute CTR varies by context far more than by creative
sn: Explanation | Attribute-level feedback (focal point, text size) | Opaque score | Designers need actionable guidance
sig: Visual embedding | image or video encoder embedding | Content | Domain tuning
sig: Attention heatmap | saliency prediction | Focus | Model
sig: Text-overlay legibility | OCR text size and contrast | Readability | OCR
noise: File size | none
noise: Upload timestamp | none
base: Heuristic checklists (text ratio, logo size).
prod: Multimodal encoder with contextual ranking head trained on within-campaign pairs, and attribute explanations from interpretable heads.
pipe: Creative upload @ studio ; Format checker @ rules ; Embedding model @ ViT or video encoder ; Ranking head @ pairwise model ; Attribute explainer @ interpretable heads ; Designer feedback @ UI ; Live performance @ labels
edge: New visual trends shift performance drivers | predictions stale | Trend monitoring and frequent retraining
edge: Context mismatch between train and use | the context at use differs from training so creative rankings flip unexpectedly | Context features and per-vertical models
off: Pairwise ranking accuracy ; Spearman correlation with realised CTR
on: Share of top creatives chosen ; Wasted spend on weak creatives
gap: Training data confounded by budget and targeting ; Absolute error reported instead of ranking quality

== multi-touch-attribution | Multi-Touch Attribution | tabular,time-series | batch | staff-principal | a=0.5 k=3
obj: Estimate each marketing touchpoint's causal contribution to conversion for budget decisions, beyond last-click bias.
loss: \mathcal{L}=\mathrm{BCE}(\text{conversion}\mid\text{path})+\lambda\,\mathrm{ShapleyConsistency}
con: Privacy-limited user paths ; Cross-device gaps ; Causal validity ; Decision-ready within a day
sn: Causality | Calibrate attribution against incrementality experiments | Take model credits as truth | Correlational credit overweights retargeting
sn: Paths | Sequence-aware credit allocation | Rule-based last-click | Last-click ignores upper-funnel influence
sig: Path sequence embedding | RNN or transformer over touchpoints | Influence | Windows
sig: Channel time-decay | recency weighting | Credit | Fit
sig: Experiment-calibrated lift | geo or user holdout results | Anchors credit | Experiments
noise: Click IDs | none
noise: Number of ad impressions raw | exposure artefact
base: Last-click and linear attribution.
prod: Sequence model for conversion probability with Shapley credit, calibrated by incrementality holdouts and constrained to match experiment lifts.
pipe: Touchpoint logs @ lake ; Path builder @ identity graph ; Conversion model @ transformer ; Credit allocation @ Shapley sampling ; Experiment calibrator @ lift matching ; Marketer dashboard @ BI ; Budget decisions @ human
edge: Retargeting touches gets credit for already-converting users | channel overvalued | Incrementality calibration and holdout cells
edge: Privacy changes remove user-level paths | user-level paths disappear under privacy changes so the sequence model is starved of input | Aggregate-level modelling and modelled conversions
off: Calibration against holdout lift ; Conversion AUC
on: ROAS from reallocated budget ; Agreement with experiments
gap: Evaluating attribution by conversion prediction alone ; No incrementality anchor

== marketing-mix-modeling-bayesian | Bayesian Marketing Mix Modelling | time-series | batch | staff-principal | a=1 k=2
obj: Estimate channel-level incremental ROI and saturation curves from aggregate data to guide cross-channel budgets.
loss: y_t=\alpha+\sum_c\beta_c\,\mathrm{Hill}\!\left(\mathrm{Adstock}(x_{c,t})\right)+\gamma^\top z_t+\varepsilon_t
con: Aggregate weekly data ; Priors from experiments ; Multicollinearity ; Stakeholder trust
sn: Identification | Calibrate with lift tests via priors | Fit only observational data | Collinear channels are not separable without experiments
sn: Dynamics | Adstock carryover and saturation curves | Linear spend effects | Returns diminish and carry over
sig: Adstock decay parameter | geometric carryover per channel | Lag effect | Prior
sig: Saturation half-saturation point | Hill curve parameter | Diminishing returns | Spend range
sig: Seasonality and baseline | trend and holidays | Baseline | Calendar
noise: Daily noise in spend | aggregated weekly
noise: Creative-level data | too granular
base: Linear regression of sales on channel spend.
prod: Hierarchical Bayesian MMM with experiment-informed priors, time-varying coefficients and budget optimiser using posterior samples.
pipe: Spend and outcome data @ warehouse ; Feature builder @ adstock transform ; Bayesian model @ PyMC or NumPyro ; Calibration with lift tests @ priors ; Budget optimiser @ posterior simulation ; Marketing leadership @ human ; Post-campaign validation @ holdouts
edge: Spend moves in lockstep across channels | channel effects unidentifiable | Staggered tests and informative priors
edge: Structural break (new product launch) | baseline shifts | Change-point terms and re-estimation
off: Out-of-sample MAPE ; Posterior calibration vs experiments
on: ROAS of reallocated budget ; Forecast accuracy of planned outcomes
gap: Overfitting with many parameters on short history ; Treating posterior mean as certain

== incrementality-geo-experiments | Geo Experiments & Incrementality Testing | tabular,time-series | batch | staff-principal | a=0.01 k=2
obj: Design and analyse geo-based holdout tests that measure true incremental effect of ads when user-level tracking is unavailable.
loss: \hat\tau=\arg\min\;\sum_t\left(y_{\text{treat},t}-\sum_j w_j y_{j,t}\right)^2\ \text{(synthetic control)}
con: Few geos ; Spillover ; Power and duration ; Cost of holding out
sn: Design | Matched geo pairs or synthetic control and power analysis | Random split of a few geos | With few geos random splits are badly imbalanced
sn: Inference | Time-based bootstrap and placebo tests | Naive t-tests on geo means | Autocorrelation inflates significance
sig: Pre-period fit quality | RMSE of synthetic control | Credibility | Window
sig: Geo similarity features | pre-period trends and covariates | Matching | Data
sig: Spillover exposure | cross-border exposure | Bias | Geography
noise: Geo name | none
noise: Population only | insufficient matching
base: Pre/post comparison in test regions.
prod: Synthetic control with Bayesian structural time series, power simulation for design and spillover-aware geo selection.
pipe: Geo-level outcome data @ warehouse ; Geo matcher @ synthetic control ; Power simulator @ Monte Carlo ; Test execution @ ad platform ; Effect estimator @ BSTS ; Analyst review @ human ; Results registry @ knowledge base
edge: Concurrent campaigns contaminate holdout geos | measured lift is biased | Campaign calendar checks and exclusion rules
edge: Insufficient power for small effect | inconclusive tests | Power simulation and longer duration planning
off: Placebo test false positive rate ; Pre-period fit
on: Decision agreement with later tests ; Test cost per decision
gap: Using post-period information in matching ; Ignoring spillover

== uplift-modeling-campaign | Uplift Modelling for Campaigns | tabular | batch | advanced | a=0.3 k=2
obj: Target ads or offers only to users whose conversion probability rises because of the treatment, to maximise incremental conversions.
loss: \hat\tau(x)=\mu_1(x)-\mu_0(x),\quad\text{policy: treat if }\hat\tau(x)>c
con: Randomised control required ; Budget ; Consent ; Fairness
sn: Targets | Four segments: persuadables, sure things, lost causes, sleeping dogs | Propensity targeting | Propensity targets sure things who convert anyway
sn: Evaluation | Qini and AUUC on randomised holdout | AUC of conversion | AUC does not measure incremental value
sig: Treatment propensity (known) | randomisation probability | IPW | Design
sig: Pre-treatment engagement | activity before campaign | Heterogeneity | Window
sig: Prior campaign response | response history | Persuadable signal | Exclude current
noise: Post-treatment actions | collider bias
noise: Campaign ID | none
base: Target top conversion-propensity users.
prod: Causal forest or DR-learner with 10% randomised holdout and budget-constrained policy.
pipe: User features @ feature store ; Randomised assignment @ platform ; Uplift model @ DR-learner ; Policy optimiser @ budget solver ; Audience activation @ DSP ; Marketing analyst @ human ; Incremental measurement @ holdout
edge: Spillover between treated and control users | uplift is underestimated | Cluster randomisation where interference exists
edge: Treatment fatigue over time | the treatment effect decays as users tire of the ads, invalidating older estimates | Periodic re-estimation and exposure covariates
off: Qini coefficient ; AUUC on holdout
on: Incremental conversions per spend ; Sleeping-dog rate
gap: Training on non-randomised past targeting ; Using conversion AUC for model choice

== ltv-based-bidding | LTV-Based Bidding | tabular,time-series | batch | staff-principal | a=0.2 k=3
obj: Bid for acquisition using predicted customer lifetime value rather than first-purchase value to unlock profitable growth.
loss: \mathcal{L}=\mathrm{ZILN}(y;\pi,\mu,\sigma)+\lambda\,\mathrm{Calibration}
con: Early LTV signal within days ; Calibration by cohort ; Privacy ; Bidding systems consume predictions in real time
sn: Horizon | Predict 12-month value from first 7-day signals | Wait for observed LTV | Waiting delays bid learning by months
sn: Bias | Calibrate predicted LTV against matured cohorts | Use early predictions uncorrected | Early-signal models are overconfident
sig: First-week engagement | sessions and purchases in 7 days | Early LTV | Window
sig: Acquisition source | channel and campaign | Quality | Prior
sig: Product-mix at acquisition | category of first purchase | Value | Product
noise: Install timestamp precise | none
noise: Device colour | none
base: Bid on first-order value.
prod: Early-signal ZILN GBDT predicting 12-month LTV, calibrated on matured cohorts, feeding bid multipliers per campaign.
pipe: Event data @ lake ; Early-signal features @ Spark ; LTV model @ ZILN GBDT ; Cohort calibrator @ isotonic ; Bid multiplier service @ DSP API ; Marketer review @ human ; Matured LTV @ labels
edge: Seasonal acquisition cohorts have different value | LTV predictions drift | Seasonality features and cohort calibration
edge: Product change alters retention | early signals mislead | Change-point detection and retrain
off: Normalised Gini of LTV ranking ; Cohort calibration error
on: Realised LTV to CAC ratio ; Payback period
gap: Immature labels in evaluation ; Training on one season

== frequency-cap-optimization | Frequency Cap & Exposure Optimisation | tabular,reinforcement-learning | sub-100ms | advanced | a=15 k=1
obj: Decide how often to show ads to each user to maximise conversions while limiting wasted impressions and annoyance.
loss: \max_{f}\;\sum_i \text{conv}_i(f_i)-\lambda\,\text{cost}(f_i)-\mu\,\text{annoyance}(f_i)
con: Cross-device counting ; Consent ; Real-time counters ; Publisher caps
sn: Response | User-level diminishing returns curve | One global cap | Optimal frequency differs hugely across users
sn: Counting | Cross-device frequency estimation | Per-device counts | Users see the same ad on several devices
sig: Marginal conversion gain | conversion probability change per exposure | Saturation | Experiments
sig: Recent exposure count | impressions in 24h and 7d | Frequency | Counters
sig: User responsiveness | prior response to the advertiser | Personalised cap | History
noise: Creative ID | none
noise: Ad slot ID | none
base: Global daily cap of 3 impressions.
prod: Per-user response-curve model with a bandit-chosen cap and shared cross-device exposure counters.
pipe: Ad request @ DSP ; Exposure counters @ Redis ; Response-curve model @ GBDT ; Cap policy @ bandit ; Bid decision @ bidder ; Exposure logging @ Kafka ; Experiment holdouts @ analytics
edge: Counter inconsistency across regions | over-exposure to users | Regional replication with conservative caps
edge: Users on shared devices | caps applied to the wrong person | Household-aware modelling
off: Estimated incremental conversions vs wasted exposures ; Response curve calibration
on: Cost per incremental conversion ; Complaint rate
gap: Observational frequency effects confounded by targeting ; Counting only same-device exposure

== cross-device-graph | Cross-Device Graph for Measurement | graph | batch | staff-principal | a=0.1 k=3
obj: Link devices belonging to the same person or household to unify reach, frequency and attribution measurement.
loss: \mathcal{L}=\mathrm{BCE}(\text{linked})+\lambda\,\mathrm{GraphReg}
con: Privacy law compliance ; Probabilistic links labelled as such ; Quality metrics per link type ; Daily refresh
sn: Precision | Link precision with calibrated confidence | Maximal link recall | Wrong links inflate reach and break attribution
sn: Scope | Household vs person vs device levels | Single ambiguous cluster | Different uses need different granularity
sig: Shared login events | authenticated co-occurrence | Gold-standard links | Hashing
sig: IP co-occurrence over time | repeated shared networks | Probabilistic | Public IP filter
sig: Behavioural similarity | co-browsing patterns | Soft evidence | Consent
noise: Device brand | weak
noise: Screen resolution | weak
base: IP-matching households.
prod: Link prediction GNN with deterministic anchors, calibrated confidence and cluster-size constraints.
pipe: Device event logs @ lake ; Deterministic anchor extractor @ rules ; Candidate generation @ blocking ; Link scorer @ GNN ; Constrained clusterer @ community detection ; Graph API @ service ; Quality audit @ ground-truth panels
edge: Large shared networks (offices) | large shared networks merge unrelated devices into mega-clusters that wreck frequency counts | Cluster size caps and edge down-weighting
edge: Device resale | old links persist | Link time-to-live and decay
off: Link precision and recall on panel truth ; Reach estimation error
on: Reach measurement accuracy ; Overlap with panel
gap: Evaluating on deterministic links only ; Static graph evaluated over time

== email-subject-line-optimization | Email Subject Line & Send Optimisation | nlp,reinforcement-learning | seconds | foundational | a=0.2 k=1
obj: Choose subject lines that lift real engagement and conversions rather than opens inflated by privacy features.
loss: \mathcal{L}=\mathrm{BCE}(\text{click},p)+\lambda\,\mathrm{Calibration}
con: Brand and compliance ; Open-rate measurement distortions ; Consent ; Fast iteration
sn: Metric | Clicks and conversions as reward | Open rate | Mail privacy features auto-open messages
sn: Generation | Generate variants and select via bandit | Pick by predicted opens | Predicted opens learned from distorted data
sig: Subject embedding features | semantic embedding of subject | Content | Encoder
sig: Audience segment affinity | segment response to themes | Personalisation | History
sig: Send-time context | local time and weekday | Context | Time zone
noise: Emoji count alone | spurious
noise: Subject length | weak
base: A/B test of two subjects by open rate.
prod: LLM-generated variant pool scored by a click-based response model and chosen via a contextual bandit with brand filters.
pipe: Campaign brief @ marketing tool ; Variant generator @ LLM ; Brand and compliance filter @ rules ; Response model @ GBDT ; Bandit selector @ Thompson ; Send service @ ESP ; Click and conversion logs @ analytics
edge: Auto-opens inflate engagement for one segment | bandit favours wrong subjects | Use click-based rewards and bot-open filtering
edge: Spam-trigger phrasing | deliverability drops | Deliverability checks in the filter
off: Click-prediction AUC ; Off-policy value estimate
on: Click-through and conversion rate ; Unsubscribe rate
gap: Training on opens ; Ignoring deliverability effects

== search-ads-keyword-generation-llm | Search Ads Keyword & Copy Generation | llm-agents,nlp | seconds | advanced | a=0.05 k=10 s=3 t=250
obj: Generate keyword sets, match types and ad copy for search campaigns from a landing page and goal, with quality and policy controls.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{page})+\lambda\,\mathrm{PolicyViolation}
con: Keyword relevance and negative keywords ; Trademark rules ; Budget awareness ; Search policy compliance
sn: Grounding | Keywords derived from the page and search-term data | Free generation | Ungrounded keywords waste spend
sn: Negatives | Negative-keyword suggestions are as important as positives | Positive keywords only | Irrelevant queries drain budgets
sig: Search volume and CPC estimates | planner data | Economics | Source
sig: Keyword-page relevance | semantic similarity | Quality | Embeddings
sig: Historical query performance | search-term reports | Learning | Window
noise: Keyword count | quantity not quality
noise: Landing page footer | boilerplate
base: Template keywords from product titles.
prod: Landing-page-grounded generation, volume and CPC enrichment, relevance filter and negative-keyword miner using search-term data.
pipe: Landing page crawl @ fetch ; Keyword generator @ LLM ; Volume and CPC enrichment @ planner API ; Relevance and policy filter @ classifier ; Negative miner @ search terms ; Marketer approval @ human ; Campaign performance @ labels
edge: Trademark keywords of competitors | policy or legal violations | Trademark lists and policy filters
edge: Broad keywords match irrelevant queries | broad-match keywords attract irrelevant queries and the budget is wasted on non-buyers | Match-type defaults and aggressive negatives
off: Relevance precision ; CPA of generated vs manual keywords
on: Time to launch ; Cost per acquisition
gap: Evaluating on volume without conversions ; Ignoring negative keywords

== query-ad-relevance-matching | Query–Ad Relevance Matching | nlp,recommender | sub-100ms | advanced | a=10 k=2
obj: Score semantic relevance between queries and ads to gate eligibility and improve quality scores.
loss: \mathcal{L}=\mathrm{BCE}(y,\sigma(f(q,a)))+\lambda\,\mathrm{Distillation}
con: 10 ms scoring with cached ad embeddings ; Multi-language ; Click-labelled bias ; Explainable to advertisers
sn: Labels | Human relevance judgments plus debiased clicks | Clicks only | Clicks reflect position and creative appeal
sn: Serving | Dual-encoder retrieval and cross-encoder rerank of top few | Cross-encoder for all | Cross-encoder cost is prohibitive
sig: Dual-encoder similarity | query and ad embedding cosine | Fast match | Ad embedding refresh
sig: Cross-encoder score | joint transformer relevance | Precision | Distillation
sig: Keyword match type | exact, phrase, broad | Intent | Rules
noise: Ad ID | none
noise: Bid amount | leaks auction
base: Keyword match with match-type rules.
prod: Distilled cross-encoder with dual-encoder candidate retrieval, calibrated relevance used as an eligibility gate.
pipe: Search query @ gateway ; Ad candidate retrieval @ ANN ; Dual-encoder scorer @ distilled ; Cross-encoder reranker @ small transformer ; Relevance gate @ thresholds ; Auction @ ranker ; Judgement feedback @ raters
edge: Brand queries for competitors | ads shown against policy | Competitor-brand rules in gate
edge: Multilingual queries with code-mixing | relevance poorly estimated | Multilingual encoders and fallbacks
off: AUC against human judgments ; NDCG of relevance-ranked ads
on: Ad quality complaints ; CTR at constant revenue
gap: Training on clicks biased by position ; Test queries easier than live
