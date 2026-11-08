# Retail & E-Commerce, part 2 (use cases 29-50)
== cart-abandonment-and-basket-completion | Cart Abandonment & Basket Completion | tabular,recommender | sub-100ms | foundational | a=3 k=2
obj: Predict abandonment in-session and trigger the least intrusive intervention (shipping clarity, saved cart, add-ons) that lifts completed checkouts.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\;\text{and uplift: }\tau(x)=\mathbb{E}[Y(1)-Y(0)\mid x]
con: Interventions must not discount unnecessarily ; 50 ms per page ; Respect cookie consent ; Cap messages per user
sn: Intervention | Uplift on checkout completion per intervention type | Abandonment propensity | Discounting buyers who would have purchased burns margin
sn: Friction | Shipping cost reveal, payment errors and form friction | Page-view counts | The step that failed is the lever
sig: Shipping-cost shock | shipping fee as a share of cart value at reveal | Top abandonment reason | Compute at the reveal event
sig: Payment error count | declines and validation errors in-session | Friction | Count before intervention
sig: Return-visit pattern | number of cart revisits in 48 hours | Intent | Session stitching consent
noise: Number of pages viewed | confounded with browsing
noise: Referrer domain | channel artefact
base: Exit-intent popup with a fixed discount.
prod: Real-time propensity model with uplift-based intervention selection and a margin-aware discount budget.
pipe: Session events @ web SDK ; Session feature builder @ Flink ; Abandonment scorer @ GBDT ; Uplift selector @ T-learner ; Intervention service @ UI messaging ; Experiment holdout @ A/B platform ; Order outcomes @ Kafka
edge: Payment provider outage looks like abandonment | spurious interventions | Error-rate feature and suppression during incidents
edge: Discount arbitrage by repeat abandoners | users learn to abandon carts deliberately to trigger discounts, leaking margin | Per-user discount cooldowns
off: Qini and AUUC ; Intervention calibration
on: Checkout completion rate ; Margin per recovered cart
gap: Non-random past interventions ; Counting recovered carts that would have converted anyway

== send-time-optimization | Notification Send-Time & Frequency Optimisation | reinforcement-learning,time-series | batch | production-grade | a=2 k=1
obj: Choose when and how often to send push, email and SMS per user to maximise engagement without driving opt-outs.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t \gamma^t\,(r^{\text{engage}}_t-\kappa\,\mathbb{1}_{\text{optout},t})\right]
con: Quiet hours and regulation ; Per-channel caps ; Opt-out is permanent loss ; 10M users nightly
sn: Long-term | Value of future engagement including opt-out risk | Open rate of the next message | Maximising opens drives fatigue and unsubscribes
sn: Exploration | Randomised time slots with bandit exploration | Fixed per-user best hour from history | History only contains previously chosen times
sig: Hourly engagement profile | per-user open probability by hour with shrinkage | Timing | Windowed history before the send
sig: Fatigue state | messages in last 7 days and recent ignores | Saturation | Rolling count excl. current send
sig: Opt-out hazard | modelled probability of unsubscribe | Cost term | Calibrated per channel
noise: Device type | weak
noise: Account age | confounded with fatigue
base: Fixed 10 AM local-time sends.
prod: Contextual bandit per user with hierarchical shrinkage, opt-out hazard model and frequency-budget optimiser.
pipe: Engagement events @ Kafka ; User feature builder @ Spark ; Hazard and open models @ GBDT ; Contextual bandit @ Thompson sampling ; Budget optimiser @ per-user caps ; Message scheduler @ queue ; Outcome logging @ analytics
edge: Time-zone change when travelling | quiet-hours breach | Device-time-zone signal with last-active time
edge: Large campaign collisions | users receive many messages same hour | Global per-user rate arbiter
off: Off-policy estimate of engagement and opt-out ; Calibration of hazard
on: Engaged sessions per message ; Unsubscribe rate
gap: Optimising opens inflated by privacy-proxy pre-fetch ; Logged policy lacks exploration

== loyalty-offer-optimization | Loyalty Programme Offer Optimisation | reinforcement-learning,recommender | batch | production-grade | a=0.1 k=2
obj: Choose personalised points, tier and reward offers that raise lifetime value subject to a programme cost budget.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t(\text{margin}_t-\text{cost}_t)\right]\ \text{s.t. cost}\le B
con: Programme liability accounting ; Fairness across tiers ; Offer expiry rules ; Weekly cadence
sn: Incrementality | Incremental spend from the offer | Redemption rate | Redeemers were mostly going to buy anyway
sn: Long horizon | Customer lifetime value in the reward objective | One-purchase ROI | Short-term ROI misses habit formation
sig: Reward elasticity | spend response to reward intensity | Optimisation input | Randomised test cells
sig: Tier proximity | gap to next tier threshold | Motivation | Rolling spend as-of
sig: Breakage propensity | probability points expire unused | Liability | Historic expiry rates
noise: Number of offers received | exposure artefact
noise: Email domain | unrelated
base: Rules by tier and last purchase date.
prod: Offline-RL with conservative Q-learning on logged offers, with randomised exploration cohort and budget-constrained allocation.
pipe: Member 360 @ lakehouse ; Elasticity and LTV models @ GBDT ; Offer policy @ conservative offline RL ; Budget allocator @ constrained solver ; Offer publisher @ CRM ; Programme finance review @ liability check ; Redemption tracking @ POS
edge: Points liability spikes | unexpected finance exposure | Liability cap with real-time accrual monitor
edge: Offer eligibility conflicts across brands | the optimiser issues offers that the brand rules make invalid at redemption | Central eligibility service
off: Off-policy value (FQE) ; Incremental spend in holdout
on: Incremental margin per programme dollar ; Active member retention
gap: Logged data lacks randomisation ; Measuring redemption not lift

== shelf-monitoring-vision | Shelf Monitoring & Planogram Compliance | computer-vision | seconds | production-grade | a=0.05 k=2000
obj: Detect out-of-stock, misplaced and non-compliant products from shelf photos and robot images to cut lost sales.
loss: \mathcal{L}=\mathcal{L}_{\text{det}}+\mathcal{L}_{\text{cls}}+\lambda\,\mathcal{L}_{\text{planogram}}
con: Works on phone and robot images ; New SKUs weekly ; Edge inference in store ; Task creation within minutes
sn: Open-set | Few-shot SKU recognition via embeddings | Closed-set classifier retrained per SKU | Weekly new SKUs make closed-set retraining impossible
sn: Action | Output prioritised tasks by lost-sales estimate | Raw detections | Store staff need a task list not boxes
sig: Facing count vs planogram | detected facings minus planned facings | Compliance | Accurate planogram version
sig: Empty-slot detection | empty gaps along the shelf edge | Out-of-stock | Occlusion handling
sig: Price-tag OCR match | tag price vs system price | Pricing compliance | Tag detection quality
noise: Shelf lighting colour | environment
noise: Camera model | device artefact
base: Periodic manual audits with checklists.
prod: Detector plus SKU-embedding retrieval for open-set recognition, planogram-diff engine and prioritised task generator; models on edge GPUs.
pipe: Image capture @ store devices ; Edge detector @ YOLO on Jetson ; SKU recogniser @ embedding retrieval ; Planogram diff @ rules engine ; Task prioritiser @ lost-sales model ; Store associate app @ human tasks ; Resolution feedback @ completion events
edge: Promotional displays off planogram | false non-compliance | Promo-calendar-aware planogram versions
edge: Poor connectivity | tasks reach store staff late because uploads and results are delayed | Offline queueing with edge inference
off: Detection mAP and SKU top-1 accuracy ; Task precision
on: On-shelf availability ; Lost sales recovered
gap: Evaluation on clean shelf photos ; Different stores than training only in appearance

== checkout-free-store-vision | Checkout-Free Store Vision | computer-vision | sub-100ms | staff-principal | a=0.01 k=100000
obj: Track shoppers and pick/put events with camera and weight sensors to produce accurate virtual baskets without checkout.
loss: \mathcal{L}=\mathcal{L}_{\text{reid}}+\mathcal{L}_{\text{action}}+\lambda\,\mathcal{L}_{\text{basket-consistency}}
con: Billing accuracy above 99.5% ; Privacy (no face ID) ; Real-time inside store ; Hardware cost per store
sn: Fusion | Fuse vision with shelf weight and RFID | Vision only | Occlusion in crowded aisles breaks vision-only
sn: Tracking | Person tracks via appearance and spatial continuity | Face recognition | Faces are privacy-unsafe and unnecessary
sig: Weight-delta match | measured shelf weight change vs SKU weight | Disambiguates picks | Calibrated load cells
sig: Hand-item interaction score | action recogniser output | Pick vs touch | Temporal context
sig: Track-merge confidence | cross-camera ReID similarity | Basket assignment | Spatial constraints
noise: Shopper clothing colour | changes and collides
noise: Time-in-store | not a basket signal
base: Sensor-only smart shelves with manual app checkout.
prod: Multi-camera tracking with edge fusion of vision, weight and RFID, probabilistic basket reconstruction and exception review for low-confidence baskets.
pipe: Camera streams @ edge cluster ; Person tracker @ multi-camera ReID ; Action recogniser @ video transformer ; Sensor fusion @ Bayesian basket model ; Basket validator @ confidence rules ; Exception review @ remote operators ; Billing @ payment service
edge: Crowded store at peak | track swaps between shoppers | Conservative merge thresholds and review of ambiguous baskets
edge: Sensor calibration drift | wrong item weights | Self-calibration jobs and health alarms
off: Basket-level exact match ; Item-level precision and recall
on: Billing disputes per 1000 baskets ; Exception review rate
gap: Training data from staged shoppers ; Ignoring rare multi-shopper interactions

== store-traffic-and-staffing-forecast | Store Traffic & Staffing Forecast | time-series | batch | foundational | a=1 k=1
obj: Forecast footfall and transactions per store-hour to build schedules that match labour to demand.
loss: \mathcal{L}=\sum_t\rho_{0.5}(y_t-\hat y_t)+\lambda\,\mathrm{ScheduleChurn}
con: Labour laws on scheduling notice ; Break rules ; Service-level targets ; Weekly schedule publication
sn: Granularity | Hourly forecasts with event covariates | Daily forecasts spread evenly | Peaks within the day drive service failures
sn: Constraints | Forecast feeds an optimiser with labour rules | Forecast-only deliverable | A forecast without scheduling logic does not help managers
sig: Hourly seasonality profile | day-of-week by hour baseline | Rhythm | Decay old seasons
sig: Local event calendar | sports, concerts, holidays nearby | Demand shocks | Known in advance
sig: Weather forecast | forecast rain or heat at store | Footfall shifts | Use forecast not actual
noise: Store manager | not demand
noise: Previous week's staffing | feeds back on service
base: Same-hour-last-week with seasonal factor.
prod: Hierarchical gradient-boosted hourly model with event covariates feeding a shift-scheduling MILP respecting labour rules.
pipe: Traffic counters and POS @ stream ; Feature builder @ calendar and weather ; Hourly forecaster @ LightGBM ; Demand-to-labour converter @ service curves ; Shift optimiser @ MILP ; Manager review @ schedule approval ; Actuals comparison @ KPI
edge: Counter sensor outage | hours of footfall are missing so the forecaster trains on gaps | Imputation and sensor health flags
edge: Last-minute call-outs | schedule infeasible | Re-optimisation with flexible shift pool
off: Hourly WAPE ; Service-level breach simulation
on: Labour cost percent of sales ; Wait time breaches
gap: Using actual weather instead of forecast ; Evaluating at daily instead of hourly level

== competitor-price-intelligence | Competitor Price Intelligence & Matching | nlp,computer-vision | batch | production-grade | a=0.02 k=10
obj: Continuously match own SKUs to competitor listings and track prices and availability reliably for pricing teams.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{AttributeConflict}
con: Legal scraping boundaries ; Match precision above 98% ; Daily refresh for 5M SKUs ; Handle variants and bundles
sn: Matching | Attribute-aware matching with pack and variant checks | Title similarity | Different pack sizes have near-identical titles
sn: Freshness | Observation timestamp and availability state | Last seen price | A price on an out-of-stock page is not a competitive price
sig: Match confidence | calibrated pair probability | Gating | Per-category calibration
sig: Availability state | in-stock, backorder, out-of-stock | Price validity | Parse structured data
sig: Unit price normalisation | price per unit/weight | Comparability | Unit extraction accuracy
noise: Page layout features | scraper artefact
noise: Competitor logo | none
base: Exact match on GTIN with manual spreadsheets.
prod: Crawl and structured extraction, multimodal pair matching with attribute conflict checks, confidence-gated price index.
pipe: Crawler fleet @ headless browsers ; Extraction @ schema and LLM fallback ; Candidate matcher @ ANN ; Pair classifier @ GBDT ; Price index builder @ validity filters ; Pricing analyst review @ low-confidence queue ; Price feed @ pricing engine
edge: Competitor changes page layout | extractor returns nulls | Extraction health monitors and LLM fallback
edge: Dynamic competitor pricing by user location | inconsistent observations | Multi-location sampling and median
off: Match precision and recall ; Extraction field accuracy
on: Price-index coverage ; Pricing action accuracy
gap: Precision measured on GTIN-matched easy pairs ; Stale prices counted as fresh

== search-relevance-llm-judge-evaluation | Search Relevance Evaluation with LLM Judges | llm-agents,nlp | batch | production-grade | a=0.001 k=20
obj: Replace expensive human relevance labelling with calibrated LLM judges to evaluate ranking changes daily at scale.
loss: \mathcal{L}=-\sum_i\log p_\theta(r_i\mid q_i,d_i)+\lambda\,\mathrm{Calibration}(\hat r,r_{\text{human}})
con: Agreement with human raters ; Bias auditing (position, verbosity) ; Cost per judgement ; Reproducibility
sn: Calibration | Judge calibrated against a human-labelled anchor set | Using judge scores raw | LLM judges are consistently lenient on fluent but wrong results
sn: Rubric | Structured rubric with attribute checks | Single vague score | Vague prompts give unstable scores
sig: Judge-human agreement | Cohen's kappa on anchor set | Judge reliability | Refresh anchors quarterly
sig: Rubric attribute coverage | fraction of query attributes verified | Specific checking | Parse attributes deterministically
sig: Inter-judge variance | disagreement across prompts and seeds | Uncertainty | Sampling at fixed temperature
noise: Judge self-reported confidence | uncalibrated
noise: Length of justification | not accuracy
base: Click-based implicit relevance metrics.
prod: Ensemble of rubric-driven LLM judges with anchor-set calibration, pairwise preference mode and confidence-weighted aggregation.
pipe: Query-result sampler @ log pipeline ; Rubric prompt builder @ attribute parser ; LLM judge ensemble @ batch inference ; Calibrator @ isotonic on anchors ; Metric aggregator @ NDCG and win-rate ; Search team review @ report ; Anchor set refresh @ human raters
edge: Judge model update | judge scores shift after a model upgrade so metrics are not comparable over time | Pin judge versions and re-calibrate on anchors
edge: Long-tail queries misjudged | evaluation misses tail regressions | Stratified sampling with tail quotas
off: Kappa vs humans ; Ranking-delta agreement
on: Release decisions matching later A/B outcomes ; Evaluation cost per experiment
gap: Judge and ranker share a base model ; Anchor set not representative of the tail

== sponsored-products-ads-ranking | Sponsored Products Ads Ranking | recommender,tabular | sub-100ms | staff-principal | a=10 k=3
obj: Rank sponsored listings in marketplace search by expected value to buyer, seller and platform in a second-price style auction.
loss: \mathcal{L}=\mathrm{BCE}(y_{\text{click}},p)+\mathrm{BCE}(y_{\text{conv}},q)\quad\text{rank by }b\cdot p\cdot q\cdot v
con: Calibrated pCTR/pCVR for billing ; Relevance floor for ads ; Auction latency 30 ms ; Advertiser budget pacing
sn: Calibration | Well-calibrated probabilities used in the auction | Ranking-only AUC | Billing needs calibrated probabilities
sn: Relevance | Relevance gate before auction | Highest bidder wins | Irrelevant ads damage organic trust
sig: Query-ad relevance | cross-encoder relevance score | Eligibility | Same model as organic
sig: Historical ad CTR with shrinkage | Bayesian smoothed CTR | Prior | Window before auction
sig: Budget pacing multiplier | fraction of budget remaining vs time | Fairness over the day | Real-time state
noise: Advertiser name | favouritism risk
noise: Bid amount in training | leaks the auction mechanism
base: Rank by bid times historical CTR.
prod: Multi-task DCN with calibration layers, relevance gate, quality score and pacing multipliers feeding a generalised second-price auction.
pipe: Search request @ gateway ; Ad candidate retrieval @ keyword and embedding ; Relevance gate @ cross-encoder ; pCTR pCVR model @ multi-task DCN ; Auction and pricing @ GSP engine ; Pacing controller @ budget service ; Impression and click logs @ Kafka
edge: New advertiser with no history | CTR estimates unstable | Hierarchical priors and exploration budgets
edge: Click fraud on ads | bills advertisers wrongly | Invalid-traffic filters before billing
off: Log-loss and calibration error ; Relevance-gated NDCG
on: Ad revenue per search ; Advertiser ROAS
gap: Click logs shaped by the incumbent auction ; Miscalibration by traffic segment

== out-of-stock-substitution | Out-of-Stock Substitution Recommendations | recommender | sub-100ms | production-grade | a=1 k=3
obj: Offer the best in-stock substitute when a grocery or retail item is unavailable, preserving the order and customer trust.
loss: \mathcal{L}=\mathrm{BPR}(u,i,j)+\lambda\,\mathrm{AcceptanceCalibration}
con: Dietary and allergy constraints ; Price tolerance ; Real-time stock ; Pickers need instant decisions
sn: Acceptance | Learn from accepted and rejected substitutions | Content similarity only | Similar items are often rejected because of brand loyalty
sn: Constraints | Hard rules for allergens and diet | Soft similarity | A wrong allergen substitution is a safety incident
sig: Historic substitution acceptance | acceptance rate for the item pair | Direct signal | Matured pairs
sig: Price delta and unit size delta | relative price and size difference | Tolerance | Normalised units
sig: User substitution tolerance | personal acceptance history | Personalisation | Excludes the current order
noise: Item popularity | picks popular not suitable
noise: Picker ID | personal habit
base: Same-category cheapest in-stock item.
prod: Pairwise ranker trained on substitution outcomes with constraint filters and real-time stock-aware candidate generation.
pipe: Stock event @ inventory stream ; Candidate generator @ similarity index ; Constraint filter @ allergen and diet rules ; Acceptance ranker @ GBDT ; Picker app @ UI ; Customer approval @ app prompt ; Outcome logging @ Kafka
edge: Inventory data inaccurate | substitute also missing | Stock confidence score and fallback list
edge: Allergen data missing for new product | unsafe candidate | Missing-data means exclude for restricted users
off: Top-1 acceptance prediction ; Constraint violation rate
on: Substitution acceptance rate ; Refunds due to substitutions
gap: Acceptance logged only for offered items ; Safety constraints not tested separately

== fresh-produce-waste-forecasting | Fresh Produce Waste & Order Forecasting | time-series,tabular | batch | production-grade | a=1 k=1
obj: Forecast daily demand and shelf-life decay for perishables to cut waste while keeping availability above target.
loss: \mathcal{L}=\sum_t\left[c_w(\hat q_t-y_t)^+ +c_s(y_t-\hat q_t)^+\right]+\lambda\,\mathrm{ShelfLifePenalty}
con: Shelf-life windows ; Supplier delivery cut-offs ; Markdown rules ; Store-level orders daily
sn: Asymmetry | Newsvendor critical ratio per item | Symmetric loss | Waste cost and stock-out cost differ by item
sn: Age | Inventory ageing profile in the state | Total stock | Old stock sells differently and expires soon
sig: Stock-by-age vector | units by remaining shelf life | Waste risk | Snapshot at order time
sig: Weather-temperature forecast | forecast temperature | Demand for seasonal fresh | Forecast not actual
sig: Promo and holiday calendar | planned events | Demand spikes | Known at order time
noise: Supplier name | encoded by lead time
noise: Day-of-month | spurious
base: Rolling average ordering with a safety factor.
prod: Quantile gradient boosting with age-aware state feeding a newsvendor policy and a markdown trigger for near-expiry stock.
pipe: POS and stock feed @ lakehouse ; Age-profile builder @ batch job ; Demand quantile model @ LightGBM ; Order optimiser @ newsvendor rule ; Markdown trigger @ expiry rules ; Store ordering @ ERP ; Waste tracking @ KPI
edge: Supplier delivers poorer shelf life | produce arrives with less remaining life and spoils before the forecast sell-through | Receipt-quality capture and supplier scorecard
edge: Heatwave | demand and spoilage shift | Weather-aware spoilage factor
off: Weighted pinball and expected waste ; Availability at policy
on: Waste percentage ; In-stock rate
gap: Backtest ignores shelf-life state ; Censored demand at stock-out

== vendor-lead-time-prediction | Vendor Lead-Time Prediction | tabular,time-series | batch | foundational | a=0.2 k=1
obj: Predict real delivery lead times per vendor, lane and item to set accurate safety stock and avoid stock-outs.
loss: \mathcal{L}=\sum_i\rho_{0.9}(y_i-\hat q_i)
con: Sparse history for new vendors ; Disruption events ; Weekly refresh ; Buyer-facing explanation
sn: Promise vs actual | Actual delivery distribution not promised dates | Vendor-quoted lead time | Quoted times are systematically optimistic
sn: Tail | Upper quantiles for risk | Mean lead time | Safety stock is driven by the tail
sig: Vendor on-time history | rolling on-time rate and variance | Reliability | Window before PO date
sig: Lane congestion indicator | port or lane delay index | External delay | As-of index
sig: Order size vs vendor capacity | PO quantity over vendor usual | Capacity strain | Normalise by vendor
noise: PO number | arbitrary
noise: Buyer name | personal habits
base: Vendor-quoted lead time plus a fixed buffer.
prod: Quantile gradient boosting with vendor hierarchical priors and disruption features, producing lead-time distributions for the replenishment engine.
pipe: PO and receipt data @ ERP ; Feature builder @ Spark ; Quantile lead-time model @ LightGBM ; Distribution publisher @ planning service ; Buyer dashboard @ explanation ; Disruption monitor @ news and port feeds ; Receipt feedback @ ERP
edge: Port strike | lead times jump suddenly | Disruption feeds and manual override
edge: New vendor | no delivery history exists so the model gives overconfident lead-time estimates | Category-level priors with wide intervals
off: Quantile loss at 90th percentile ; Coverage of intervals
on: Stock-out events ; Safety stock reduction
gap: Using received dates for undelivered open orders ; Ignoring partial shipments

== gift-recommendations-llm | Gift Recommendation Assistant | llm-agents,recommender | seconds | foundational | a=0.1 k=10 s=3 t=350
obj: Help users find gifts for recipients and occasions through a short conversation with grounded product suggestions.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{GroundingMiss}
con: Budget and delivery date constraints ; Age-appropriate content ; No fabricated items ; Seasonal traffic spikes
sn: Slots | Structured gift brief (recipient, occasion, budget, deadline) | Free text only | Missing budget or date makes results useless
sn: Delivery | Delivery-date feasibility in ranking | Relevance only | A perfect gift that arrives late is a failure
sig: Gift-brief completeness | filled slots out of required | Dialogue state | Slot extractor accuracy
sig: Deadline feasibility | whether delivery date meets occasion date | Hard filter | Live carrier promises
sig: Recipient interest match | interest embedding vs item embedding | Relevance | Self-reported interests
noise: Chat tone | stylistic only
noise: Sender browsing history | not the recipient
base: Curated gift guides by price.
prod: Slot-filling dialogue manager with LLM and catalogue retrieval, delivery feasibility filter and diversified suggestions.
pipe: Chat interface @ web and app ; Slot extractor @ LLM structured output ; Candidate retrieval @ hybrid search ; Feasibility filter @ delivery and budget rules ; Suggestion composer @ LLM ; Grounding check @ ID verification ; Conversion tracking @ analytics
edge: Seasonal peak (festival) | traffic rises ten-fold and LLM cost and latency blow past budget | Pre-computed gift sets and cache for common briefs
edge: Sensitive occasions (bereavement) | tone-deaf suggestions | Occasion classifier with tone rules
off: Slot-filling accuracy ; Constraint satisfaction rate
on: Gift conversion rate ; Delivery-on-time rate
gap: Evaluating on easy briefs ; Missing deadline constraints in test

== virtual-try-on | Virtual Try-On | computer-vision | seconds | staff-principal | a=0.1 k=2500
obj: Render garments, glasses or makeup on a user's photo or live camera realistically enough to cut returns.
loss: \mathcal{L}=\mathcal{L}_{\text{perceptual}}+\mathcal{L}_{\text{adv}}+\lambda\,\mathcal{L}_{\text{identity}}
con: Under 3 s for photo or 30 fps live ; Privacy of user images ; Body-inclusive across sizes ; Mobile GPU
sn: Fidelity | Garment-warping with body parsing and diffusion refinement | Simple overlay | Overlays ignore drape and size
sn: Fit | Size-aware rendering | One-size render | Users judge fit from the rendering
sig: Body keypoints and parsing | pose and segmentation masks | Alignment | Robust to clothing
sig: Garment geometry features | measurements and fabric type | Drape | Catalogue data quality
sig: Identity preservation score | face and body identity similarity | Quality | Metric gaming risk
noise: Photo background | removed
noise: Image EXIF | privacy
base: 2D overlay with scaling.
prod: Pose-guided warping network with latent diffusion refinement, distilled for mobile and a cloud path for high quality.
pipe: Photo or camera capture @ mobile ; Pose and parsing @ edge model ; Garment warping @ GAN or diffusion on GPU ; Refinement @ latent diffusion ; Quality gate @ artifacts detector ; Delivery to app @ CDN ; Usage analytics @ events
edge: Diverse body shapes underrepresented | renders look unrealistic for under-represented body types, harming trust and fairness | Balanced datasets and fairness audits per body type
edge: User uploads someone else’s photo | processing a third party’s image without consent creates a privacy violation | Consent prompts and on-device processing option
off: FID and identity similarity ; Human preference on fit realism
on: Return rate of try-on users ; Conversion lift
gap: Evaluated on studio models only ; Realism rated by internal staff

== voice-shopping | Voice Shopping (ASR + NLU) | nlp | seconds | production-grade | a=0.5 k=60
obj: Understand spoken shopping requests, resolve products and handle reorders reliably across accents and noisy environments.
loss: \mathcal{L}=\mathcal{L}_{\text{CTC}}+\mathrm{CE}_{\text{intent}}+\lambda\,\mathrm{CE}_{\text{slot}}
con: Under 1.5 s response ; 12 languages and accents ; Privacy of audio ; Confirmation before purchase
sn: Entity | Catalogue-biased ASR and entity resolution | Generic ASR text | Product and brand names are rare words for generic ASR
sn: Safety | Explicit confirmation for purchases | Direct ordering from ASR text | ASR errors become wrong orders
sig: Contextual biasing list | user history and catalogue entity prior | Boosts product names | Updated frequently
sig: ASR confidence by span | token-level confidence | Ambiguity detection | Calibrated
sig: Reorder intent confidence | likelihood the request is a repeat purchase | Safe automation | Order history as-of
noise: Speaker gender | unrelated
noise: Audio duration | weak
base: Generic ASR plus keyword search.
prod: Streaming conformer ASR with contextual biasing, joint NLU for intent and slots, entity linking and confirmation dialogue.
pipe: Audio stream @ device ; Streaming ASR @ conformer on GPU ; Contextual biasing @ entity prior ; NLU intent and slots @ joint model ; Entity resolver @ catalogue index ; Confirmation dialogue @ voice UI ; Order service @ checkout API
edge: Background noise from kitchen | ASR errors on product names lead to wrong or empty search results | Noise-robust training and clarification prompts
edge: Homophone brand names | similar-sounding brands are confused and the wrong product is added | Personal history prior and confirmation
off: WER on entity spans ; Intent and slot F1
on: Voice order success rate ; Correction rate
gap: Test audio recorded in quiet rooms ; WER averaged over non-entity words

== category-page-ranking | Category & Browse Page Ranking | recommender | sub-100ms | production-grade | a=8 k=4
obj: Order products on category and browse pages to maximise conversion, balancing popularity, personalisation, margin and new-item exposure.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{ListwisePenalty}
con: Merchandising pins and bans ; 40 ms ; Fair exposure to new sellers ; Stable ordering (no flicker)
sn: Position | Position-debiased learning and interleaving tests | Raw CTR | Top slots always win clicks
sn: Stability | Consistent ordering between pages and sessions | Fully real-time reordering | Flickering order frustrates users
sig: Debiased CTR | position-adjusted click-through rate | Quality | Propensity from randomisation
sig: Margin and stock depth | contribution margin and stock | Business constraint | As-of stock
sig: Newness exploration bonus | UCB bonus for low-exposure items | Cold items | Budget limit
noise: Item ID | arbitrary
noise: Total page views | popularity loop
base: Best-seller sort with merchandiser pins.
prod: Two-stage LTR with propensity weighting, margin-aware re-rank, exploration slots and a stability regulariser.
pipe: Page request @ API ; Category candidate fetch @ index ; Feature lookup @ feature store ; LTR ranker @ LambdaMART ; Business re-rank @ pins and margin ; Exploration allocator @ bandit ; Impression logs @ Kafka
edge: Merchandiser pin overrides model on bad item | poor experience | Pin expiry and guardrail alerts
edge: Stock-out in top ranks | top-ranked items are unavailable so shoppers hit dead-ends and bounce | Live inventory filter and demotion
off: Debiased NDCG ; Interleaving sensitivity
on: Category conversion rate ; Revenue per visit
gap: Position bias unaddressed ; Offline metric favours incumbent ranker

== buy-box-seller-ranking | Buy-Box & Seller Offer Ranking | tabular,recommender | sub-100ms | production-grade | a=4 k=2
obj: Select which seller wins the featured offer for each product based on price, speed, reliability and customer-experience.
loss: \mathcal{L}=\mathrm{BCE}(\text{conversion},p)+\lambda\,\mathrm{FairnessPenalty}
con: Transparent seller policy ; Anti-gaming ; 30 ms ; Regulatory fairness
sn: Value | Landed price, delivery speed and defect risk jointly | Lowest price wins | Cheapest sellers with poor fulfilment cause returns
sn: Gaming | Robust features resistant to manipulation | Raw seller-reported speed | Reported speeds are inflated
sig: Landed price percentile | price plus shipping percentile | Value | Include taxes
sig: Seller defect rate | order defect rate over 60 days | Quality | Matured outcomes
sig: Delivery promise reliability | actual vs promised ratio | Trust | Seller-level shrinkage
noise: Seller review count | gameable
noise: Seller registration age | weak
base: Rule-based lowest landed price with minimum performance.
prod: Conversion-and-experience model producing expected customer value per offer, with seller-health gating and exploration for new sellers.
pipe: Product page request @ API ; Offer fetch @ offer store ; Seller metrics lookup @ feature store ; Offer value model @ GBDT ; Fairness and policy gate @ rules ; Winner selection @ ranker ; Outcome logs @ stream
edge: Seller price manipulation timed with ranking refresh | sellers game the refresh window with brief price cuts to win the featured offer | Randomised windows and anomaly detection
edge: New seller never wins | cold-start inequity | Exploration share for qualified new sellers
off: Predicted vs realised conversion ; Customer-value regret
on: Defect rate of buy-box orders ; Seller diversity
gap: Outcomes confounded by Buy Box position ; Seller metrics gamed

== price-elasticity-causal-estimation | Price Elasticity Estimation (Causal) | tabular | batch | staff-principal | a=0.1 k=2
obj: Estimate causal price elasticities per category and segment for pricing and promotion decisions using experiments and quasi-experiments.
loss: \hat\theta=\arg\min_\theta\sum_i\left(\tilde Y_i-\theta(X_i)\tilde T_i\right)^2\ \text{(double ML)}
con: Interpretable confidence intervals ; Few randomised tests ; Heterogeneity by segment ; Legal price testing limits
sn: Identification | Randomised price tests or valid instruments | Regression of quantity on price | Price endogeneity gives wrong signs
sn: Heterogeneity | Heterogeneous effects with honest uncertainty | One average elasticity | Segments differ by 3x
sig: Randomised price cell assignment | experiment arm ID | Valid identification | Randomisation integrity
sig: Cost-shock instrument | supplier cost changes | Instrument for price | Exclusion restriction
sig: Segment descriptors | category, brand tier, customer segment | Heterogeneity | Pre-treatment only
noise: Page views | post-treatment variable
noise: Basket size | post-treatment
base: Log-log OLS elasticity.
prod: Double machine learning with causal forests, experiment-calibrated priors and uncertainty-aware downstream consumption.
pipe: Experiment platform @ price tests ; Panel builder @ lakehouse ; Nuisance models @ GBDT ; DML estimator @ causal forest ; Uncertainty calibration @ bootstrap ; Elasticity store @ versioned tables ; Pricing consumers @ optimisers
edge: Competitor price reaction during test | contaminated effect | Competitor price covariates and shorter tests
edge: Stock-outs in test cells | stock-outs censor sales in some price cells and bias elasticity estimates | Availability filters and censoring correction
off: Calibration against holdout experiments ; Coverage of confidence intervals
on: Pricing lift realised vs predicted ; Experiment cost saved
gap: Conditioning on post-treatment variables ; Overlap failures in observational data

== order-routing-fulfilment-selection | Order Routing & Fulfilment Node Selection | reinforcement-learning,tabular | sub-100ms | staff-principal | a=1 k=3
obj: Choose the warehouse or store that fulfils each order to minimise shipping cost and delay while protecting inventory for future demand.
loss: \min_a\;\text{ship cost}(a)+\lambda\,\text{delay}(a)+\mu\,\text{opportunity cost of stock}(a)
con: Decision in 50 ms ; Split-shipment limits ; Store pick capacity ; Real-time inventory accuracy
sn: Opportunity cost | Inventory value at the node for future orders | Cheapest shipping only | Using scarce stock now causes later stock-outs
sn: Accuracy | Inventory confidence-weighted availability | Treating system stock as truth | Phantom inventory causes cancellations
sig: Node inventory confidence | probability the item is truly available | Cancellation risk | Cycle-count based
sig: Shipping cost and zone | carrier rate to destination zone | Cost term | Rate table as-of
sig: Node pick capacity utilisation | orders pending vs capacity | Delay risk | Real-time
noise: Order ID parity | none
noise: Customer name | none
base: Nearest node with stock.
prod: Cost-to-serve optimiser (MIP) with learned stock opportunity values and cancellation-risk model, solved per order in milliseconds.
pipe: Order event @ order service ; Inventory view @ confidence service ; Cost and capacity lookup @ rate tables ; Node selector @ MIP solver ; Opportunity-cost model @ value function ; Fulfilment instruction @ WMS ; Outcome tracking @ delays and cancels
edge: Phantom inventory at store | cancel and re-route | Confidence scores and verification pick policy
edge: Peak promotion | capacity exceeded at best nodes | Capacity-aware soft penalties
off: Simulated total cost-to-serve ; Cancellation rate prediction
on: Cost per order ; On-time delivery rate
gap: Simulator uses perfect inventory ; Ignoring split-shipment customer experience

== pre-purchase-return-risk | Pre-Purchase Return Risk & Prevention | tabular,recommender | sub-100ms | production-grade | a=2 k=2
obj: Predict the likelihood a specific order line will be returned and use gentle interventions (fit info, alternate size) to prevent avoidable returns.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{return cost})
con: Do not discourage genuine purchases ; Transparent nudges ; 50 ms ; Fairness
sn: Intervention | Uplift of nudges on avoidable returns | Return propensity | Some returns are unavoidable and some customers keep anyway
sn: Reason | Predict returns by reason code (fit, quality, expectation) | Binary return flag | Different reasons need different actions
sig: Bracketing behaviour | multiple sizes of same item in cart | Intentional return | Cart state at time
sig: Item return-rate by size | historic return rate for that item size | Fit risk | Matured outcomes
sig: Reviews mention fit | share of reviews flagging fit issues | Product expectation | Review snapshot
noise: Cart creation hour | none
noise: Browser | none
base: Show item-level return-rate badges.
prod: Multi-reason GBDT for return risk plus uplift-based nudge selection and size recommendation hook.
pipe: Cart event @ web and app ; Risk feature fetch @ feature store ; Return-reason model @ multi-class GBDT ; Uplift nudge selector @ T-learner ; Nudge UI @ product page ; Size recommender @ fit service ; Return outcomes @ ledger
edge: Intended bracketing for try-at-home | suppressed incorrectly | Cohort rules for try-at-home segment
edge: Nudges reduce sales in some categories | nudges create doubt and lower conversion in categories where returns were fine | Guardrail on conversion with automatic rollback
off: Reason-level AUC ; Uplift on return rate
on: Net revenue after returns ; Avoidable-return rate
gap: Training on observational nudges ; Ignoring conversion cost of nudges

== ugc-content-moderation-marketplace | Marketplace UGC Moderation | computer-vision,nlp | sub-100ms | production-grade | a=1 k=100
obj: Block prohibited listings, images and messages at submission while minimising wrongful removals.
loss: \mathcal{L}=\sum_k\mathrm{BCE}(y_k,p_k)+\lambda\,\mathrm{Calibration}
con: Policy per country ; Appeals within 48 hours ; Multi-modal content ; 80 ms synchronous gate
sn: Policy | Per-policy classifiers and thresholds by region | One toxic or not model | Policies differ by market and category
sn: Adversarial | Perceptual hashing plus adversarial augmentation | Static keyword list | Sellers use leetspeak and image text to evade
sig: Multi-label policy scores | per-policy probabilities | Routing | Calibrated per region
sig: Hash match to known-bad | perceptual hash distance | Cheap high-precision filter | Hash refresh
sig: Account trust level | prior violations and tenure | Context | As-of
noise: Listing length | none
noise: Posting time | none
base: Keyword lists and manual review.
prod: Multimodal policy classifier with perceptual hash prefilter, per-region thresholds, human review for the uncertain band and appeals loop.
pipe: Submission API @ listing service ; Hash prefilter @ perceptual hash index ; Multimodal classifier @ ViT and text encoder ; Policy engine @ region thresholds ; Moderator review @ uncertain queue ; Appeals handling @ human ; Label feedback @ audit
edge: New scam trend | a novel scam pattern is not in training data so recall drops until retraining | Rapid labelling pipeline and rule hotfix channel
edge: Culturally ambiguous content | inconsistent enforcement | Region-specific guidelines and reviewer calibration
off: Per-policy precision and recall ; Appeal overturn rate
on: Prohibited content exposure ; Wrongful removal rate
gap: Labels from reviewer disagreement unresolved ; Static test set

== experimentation-cuped-sequential-testing | Experimentation: CUPED & Sequential Testing | tabular | batch | staff-principal | a=1 k=1
obj: Speed up online experiments with variance reduction and valid always-on sequential testing so teams ship decisions faster without false positives.
loss: \hat\tau_{\text{CUPED}}=\bar Y_1-\bar Y_0-\theta(\bar X_1-\bar X_0),\quad\theta=\frac{\mathrm{Cov}(Y,X)}{\mathrm{Var}(X)}
con: Type-I error control ; Many concurrent experiments ; Metric definitions governed ; Auditability of decisions
sn: Variance | Pre-experiment covariates for variance reduction | Running longer | Longer tests delay decisions and still have noisy tails
sn: Peeking | Always-valid p-values (mSPRT) | Repeated t-tests while peeking | Peeking inflates false positives to 30%
sig: Pre-period metric covariate | user metric in 28 days before assignment | CUPED covariate | Strictly pre-assignment
sig: Sample-ratio mismatch statistic | chi-square on arm sizes | Data quality | Per-experiment automatic check
sig: Novelty decay curve | effect by exposure day | Effect durability | Cohort exposure start
noise: Post-exposure covariates | bias the effect
noise: Unplanned subgroup analyses | false discoveries
base: Fixed-horizon t-test on mean metrics.
prod: Automated analysis service with CUPED, SRM checks, mSPRT sequential monitoring, multiple-testing control and ratio-metric delta method.
pipe: Assignment logs @ experiment platform ; Metric computation @ Spark ; Variance reduction @ CUPED service ; Sequential tester @ always-valid inference ; SRM and quality checks @ validators ; Decision dashboard @ experiment UI ; Learnings archive @ knowledge base
edge: Interference between treatment and control (marketplace) | treated sellers or buyers affect control through shared inventory, biasing the measured effect | Cluster or switchback randomisation
edge: Metric definition drift | inconsistent decisions | Versioned metric registry
off: False-positive rate on A/A tests ; Variance reduction percentage
on: Time to decision ; Win-rate vs holdout outcomes
gap: Using post-treatment covariates ; Ignoring SRM warnings
