# Real Estate & PropTech, part 1 (use cases 1-25): valuation, listings, leasing and property management
== automated-valuation-model | Automated Valuation Model (AVM) | tabular,computer-vision | seconds | production-grade | a=0.05 k=40
obj: Estimate the market value of a home from its attributes, location, nearby sales and photos, with a confidence range, for lenders, portals and owners.
loss: \mathcal{L}=\mathrm{Huber}(\log\hat{y}-\log y)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.1},y)
con: Median error under 6% with a published confidence score ; Valuation must not use protected attributes or their proxies ; Explainable comparable set for every value ; Re-valuation of a whole market overnight
sn: Target | Sale price at the contract date, adjusted to a common date | Listing price or assessed value | Listing prices are aspirations and assessed values lag the market by years
sn: Local | Micro-market effects such as school zone, street and view | City-level averages | A 10% price gap can exist across one street
sn: Condition | Condition and renovation state from photos and permits | Square footage and bedroom count only | Two identical houses differ by 20% in condition
sig: Comparable sale density | count and recency of sales within 0.5 km and 90 days | Thin markets give wide errors | Only sales that closed before the valuation date
sig: Price per square metre by micro-area | trailing median adjusted for size and type | Anchors the local level | Neighbourhood boundaries must be stable
sig: Condition score from photos | vision model grade of kitchen, bathroom and exterior | Captures the unrecorded | Listing photos are staged and flattering
sig: Renovation permits | permits for kitchen, extension or roof in the last 10 years | Evidence of upgrades | Permit data quality varies by municipality
noise: Listing description adjectives | marketing language with little extra signal
noise: Days since the listing photo upload | portal behaviour, not value
noise: Owner name | no causal link and a privacy risk
base: Hedonic regression on size, rooms, location and age per market, because appraisers recognise it and it gives instant explanations.
prod: Gradient boosting with spatial features and a photo-condition embedding, quantile heads for the range and a comparables retriever to justify each value.
pipe: Property record lookup @ parcel and listing database ; Geospatial features @ PostGIS and H3 cells ; Comparable retriever @ nearest sales index ; Photo condition model @ vision model on GPU ; Value model @ gradient boosting with quantiles ; Confidence calibrator @ isotonic per market ; Valuation log @ lakehouse
edge: Thin market | few sales within the radius | Widen the range and show the lower confidence score instead of a falsely precise value
edge: Unique property | castle, houseboat or large plot | Out-of-distribution flag and routing to a human appraiser
edge: Rapid market shift | prices move 8% in a quarter | Time-trend features from recent sales and shorter training windows
off: Median absolute percentage error by market ; Share of values within 10% of the sale price
on: Appraisal orders avoided ; Value disputes raised by lenders
gap: Training on sales after the valuation date leaks the trend ; Random split lets the same street sit in train and test

== rent-estimation | Rental Price Estimation | tabular | sub-100ms | foundational | a=0.1 k=10
obj: Estimate the market rent for a home or unit so owners, agents and tenants see a credible range.
loss: \mathcal{L}=\mathrm{Huber}(\log\hat{y}-\log y)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.9},y)
con: Response under 80 ms ; Range shown with the estimate ; No protected attributes or proxies ; Daily refresh of market features
sn: Asking vs signed | Signed rents when known | Asking rents only | Asking rents are 3-8% above what is signed
sn: Furnishing | Furnished versus unfurnished segmentation | Pooled rents | Furnishing shifts rent by 10-20%
sn: Amenities | Parking, laundry, pets and utilities included | Bedroom count only | Included utilities change net rent
sig: Local median rent per room | trailing 60-day median in the micro-area | Market anchor | Mix of unit types
sig: Unit size and layout | area and bedrooms | Core attribute | Floor plan errors
sig: Building amenity count | amenities from listings | Premium driver | Text extraction errors
sig: Transit access | walking time to stations | Premium driver | Routing data
noise: Listing title style | marketing
noise: Photo count | portal behaviour
noise: Agent name | irrelevant
base: Median rent per square metre in the postcode, because it is easy to explain and already used.
prod: Gradient boosting with spatial and amenity features, quantile outputs and a segment model for furnished units.
pipe: Listing and lease feed @ ingestion pipeline ; Geospatial features @ H3 index ; Amenity extractor @ text model ; Rent model @ gradient boosting ; Range calibrator @ conformal intervals ; API response @ low-latency service ; Outcome store @ lakehouse
edge: New building | no rent history | Use similar-building priors
edge: Seasonal market | student city peaks in August | Seasonal features
edge: Duplicate listings | inflate the sample | Deduplicate listings
off: MAPE ; Interval coverage
on: Listing price changes after estimate ; Time to lease
gap: Asking rents leak into labels ; Same landlord in train and test

== comparable-sales-selection | Comparable Sales Selection | tabular,recommender | sub-100ms | production-grade | a=0.05 k=20
obj: Select and rank the most similar recent sales for a subject property and adjust them, so valuations and appraisals are defensible.
loss: \mathcal{L}=\mathrm{Triplet}(a,p,n)+\lambda\,\mathrm{Huber}(\hat{y}-y)
con: Comparable set explainable to an appraiser ; Only closed sales before the valuation date ; Response under 100 ms ; Adjustments bounded by policy
sn: Similarity | Learned similarity on what drives price | Distance and size only | A near neighbour with a different school zone is a poor comparable
sn: Recency | Sales recency with time adjustment | Last 12 months equally | Fast markets age comparables quickly
sn: Adjustment | Explicit adjustments for differences | Raw prices | Raw comps ignore a pool or an extra bedroom
sig: Learned property embedding | vector from attributes and photos | Similarity | Training data bias
sig: Sale recency weight | days since sale | Time | Market speed
sig: Same school or tract flag | within the same boundary | Locality | Boundary changes
sig: Adjustment size | percentage adjustment for features | Quality | Estimated by a model
noise: Seller name | irrelevant
noise: Listing agent | irrelevant
noise: Photo order | arbitrary
base: The five nearest recent sales by distance and size, because appraisers do this by hand.
prod: Metric-learned embeddings with approximate nearest neighbour retrieval, then a learned adjustment model and a reranker.
pipe: Subject property features @ property service ; Candidate retrieval @ ANN index of closed sales ; Reranker @ gradient boosting ; Adjustment model @ regression ; Rule check @ policy engine ; Comparable report @ document service ; Feedback capture @ lakehouse
edge: Few comparables | Rural properties have few comparables within any sensible radius | Widen the search criteria in steps and flag the lower confidence to the appraiser
edge: Non-arm's-length sale | family transfer | Filter by deed type
edge: Distressed sale | A distressed sale such as a foreclosure sells below market and drags the adjustment | Mark distressed sales and adjust or exclude them from the comparable pool
off: Agreement with appraiser-chosen comps ; Valuation error from selected comps
on: Appraiser time per report ; Revisions requested
gap: Appraiser comps are biased toward familiar sales ; Future sales leak

== listing-price-recommendation-and-time-to-sell | Listing Price Recommendation & Time-to-Sell | tabular,time-series | seconds | production-grade | a=0.05 k=30
obj: Recommend a listing price and predict the days to sell at different prices so sellers and agents can trade price against time.
loss: \mathcal{L}=-\sum_i\left[\delta_i\log h(t_i\mid x_i,p_i)-\int_0^{t_i}h(u\mid x_i,p_i)\,du\right]
con: Recommendations are advice not valuations ; Price-time curves shown with intervals ; Sellers decide ; No use of protected attributes
sn: Censoring | Unsold listings treated as censored | Dropping withdrawn listings | Dropping unsold listings makes homes look quicker to sell
sn: Price position | Listing price relative to the model value | Absolute price | Over-pricing by 5% matters in a fast market
sn: Season | Seasonality in demand | Averages | Spring and autumn differ
sig: Price to value ratio | listing price divided by AVM value | Core driver | AVM error
sig: Local inventory | active listings per month of sales | Market speed | Definition
sig: Early engagement | views and saves in the first 7 days | Demand signal | Used for updates, not the first price
sig: Seasonal index | month factor by market | Timing | Few years of data
noise: Agent photo count | portal behaviour
noise: Weekday listed | weak
noise: Listing text length | style
base: Median days on market by price band in the postcode, because agents quote it.
prod: Survival model on price position and market state, with a price optimiser maximising expected net proceeds subject to time preference.
pipe: Property and market data @ feature service ; Value baseline @ AVM ; Survival model @ boosted hazard ; Price-time optimiser @ solver ; Advisor view @ agent app ; Seller report @ PDF service ; Outcome feed @ lakehouse
edge: Bidding war | sale price above list | Model of sale-to-list ratio
edge: Price reductions | listing price changes | Time-varying covariates
edge: Off-market sales | Off-market sales have no listing but are in the registry and distort time on market | Exclude off-market sales from time-to-sell training and note them in the data description
off: Concordance ; Calibration of days to sell
on: Median days on market ; Sale-to-list ratio
gap: Withdrawn listings dropped ; Price chosen by agents affects outcomes

== appraisal-review-and-valuation-anomaly-detection | Appraisal Review & Valuation Anomaly Detection | tabular,nlp | seconds | production-grade | a=0.05 k=60
obj: Flag appraisals that look inflated, inconsistent or non-compliant before a lender relies on them.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{v}-v)
con: Reviewer sees the evidence ; Appraiser independence rules ; Review capacity ; Fair treatment of appraisers
sn: Deviation | Gap between appraisal and independent AVM adjusted for confidence | Any gap | Thin markets have wide AVM error
sn: Comparables | Quality of selected comps | Count | Cherry-picked comps are the main issue
sn: Pattern | Appraiser-level patterns over many reports | Single reports | Inflation shows as a pattern
sig: Appraisal to AVM gap | log difference scaled by AVM interval | Core signal | AVM coverage
sig: Comparable selection quality | similarity of chosen vs available comps | Cherry-picking | Comp pool
sig: Appraiser history | past review outcomes | Pattern | Fairness
sig: Narrative inconsistency | text contradicting the data | Quality | Text extraction
noise: Report length | style
noise: Appraiser firm | weak
noise: Photo count | style
base: Review any appraisal more than 10% from the AVM, because lenders use such triggers.
prod: Gradient boosting on gap, comp quality and narrative checks with calibrated risk and a reviewer queue.
pipe: Appraisal report intake @ vendor portal ; Report parser @ document model ; AVM benchmark @ valuation service ; Comparable checker @ ranking model ; Risk model @ boosting ; Reviewer queue @ workflow ; Outcome log @ warehouse
edge: Unique property | A unique property sits outside the range where the independent valuation is reliable | Use wider tolerances for unique properties and say so in the review note
edge: Rising market | In a rising market the independent valuation lags and every appraisal looks too high | Benchmark against a time-adjusted valuation rather than the latest model run
edge: Rural area | Rural areas have few comparables so valuation gaps are noisy | Use adjusted thresholds by area type so rural appraisals are not over-flagged
off: Precision at review capacity ; Recall on confirmed issues
on: Valuation losses avoided ; Review turnaround
gap: Confirmed issues are those that defaulted ; Reviewer bias

== neighbourhood-quality-scoring | Neighbourhood Quality Scoring | tabular,computer-vision | batch | production-grade | a=0.02 k=100
obj: Score each neighbourhood on walkability, amenities, safety perception, noise and change so buyers and investors can compare areas.
loss: \mathcal{L}=\mathrm{MSE}(\hat{y},y)+\lambda\,\mathrm{GraphReg}(z)
con: No scores that proxy race or protected classes ; Method published ; Quarterly refresh ; Fair-housing review
sn: Fairness | Scores built from objective amenity and access data | Crime or demographic proxies | Proxies create redlining risk
sn: Scale | Small-area scores | City averages | Quality varies block to block
sn: Change | Trajectory of an area | Static score | Gentrification matters to investors
sig: Walk time to amenities | routing time to grocery, school and transit | Livability | Map data
sig: Street imagery greenery | tree cover share from street images | Environment | Season
sig: Business openings | net new businesses | Vibrancy | Data feed
sig: Noise exposure | modelled noise from roads and rail | Livability | Model data
noise: Area name | label
noise: Listing agent | irrelevant
noise: Photo brightness | artefact
base: A weighted index of amenity counts, because portals publish similar scores.
prod: Learned scores from amenity access, imagery and trend features, calibrated to resident survey data, with a fair-housing audit.
pipe: Map and amenity data @ OpenStreetMap and local feeds ; Imagery features @ vision model ; Routing features @ routing engine ; Score model @ gradient boosting ; Fairness audit @ bias checks ; Score store @ lakehouse ; API @ low-latency service
edge: New development | A new development has no history so its area score cannot be computed | Use priors from comparable areas and mark the score as provisional
edge: Data gaps | few amenities mapped | Coverage flags
edge: Disputed boundaries | area names differ | Stable grid cells
off: Rank correlation with survey ratings ; Stability across refreshes
on: Search engagement with area filters ; Complaints about scores
gap: Surveys cover wealthy areas ; Proxy features

== price-index-and-market-trend-forecasting | House Price Index & Market Trend Forecasting | time-series | batch | production-grade | a=1 k=2
obj: Produce repeat-sales and hedonic price indices by area and forecast price movement for the next quarters.
loss: \mathcal{L}=\sum_t\mathrm{Pinball}(\hat{q}_{0.9},y_t)+\lambda\,\mathrm{MSE}(\hat{y}_t,y_t)
con: Monthly publication ; Revision policy documented ; Intervals shown ; Reproducible
sn: Quality | Quality-adjusted price movement | Median price | The mix of homes sold changes the median
sn: Lag | Sales recorded with delay | Listing prices only | Listings lead sales
sn: Leading | Mortgage rates, supply and affordability | Past prices alone | Rates drive turning points
sig: Repeat-sales pairs | price change between sales of the same home | Quality control | Few pairs
sig: Mortgage rate | prevailing rate | Affordability | Timing
sig: Active listings | inventory change | Supply | Definition
sig: Search interest | portal search volume | Leading indicator | Noise
noise: Social posts | noise
noise: Single-sale outliers | noise
noise: Agent commentary | opinion
base: Median sale price by area with a naive trend, because press releases use it.
prod: A repeat-sales and hedonic index with a forecast model on rates, supply and search, with intervals and revision control.
pipe: Sales records @ land registry feeds ; Index builder @ repeat-sales regression ; Leading indicators @ market data ; Forecast model @ boosting plus VAR ; Interval engine @ quantile ; Publication @ API and BI ; Archive @ lakehouse
edge: Revisions | late sales change the index | Revision tracking
edge: Thin markets | volatile indices | Pooling
edge: Policy changes | A tax or stamp-duty change shifts prices across the whole market at once | Add policy-event flags and use shorter windows around the change
off: Forecast error by horizon ; Index revision size
on: Users of the index ; Forecast hit rate
gap: Back-test in rising markets ; Look-ahead

== development-site-feasibility-scoring | Development Site Feasibility Scoring | tabular,nlp | seconds | staff-principal | a=0.02 k=200
obj: Screen land parcels for development potential by combining zoning, constraints, comparable projects and market demand.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{r}-r)
con: Zoning data cited ; Screening, not a legal opinion ; Analyst reviews top sites ; Data licences
sn: Constraints | Binding constraints such as height limits, flood and heritage | Parcel size alone | A large site with a heritage overlay may be undevelopable
sn: Yield | Expected margin after cost and absorption | Land price | Cheap land can be unbuildable
sn: Process | Probability of obtaining permits | Assuming approval | Approval risk dominates timelines
sig: Allowable floor area | zoning-derived buildable area | Core | Rule parsing
sig: Constraint overlap | share of the parcel under constraints | Risk | Data
sig: Comparable project yield | margins of recent nearby projects | Market | Sparse
sig: Permit approval history | approval rate for similar applications | Process | Local
noise: Owner | irrelevant
noise: Parcel ID digits | arbitrary
noise: Listing text | marketing
base: Filter parcels by zone and size, then analysts review, because that is how teams work.
prod: Zoning parser with a feasibility model, a residual-land-value calculator and a ranked list with evidence.
pipe: Parcel and zoning data @ GIS ; Rule extractor @ NLP over codes ; Constraint overlay @ geospatial engine ; Feasibility model @ boosting ; Residual value @ financial model ; Analyst shortlist @ web tool ; Outcome log @ warehouse
edge: Zoning change pending | A zoning change is pending and the rules used for scoring may soon be out of date | Flag sites with a pending change and score under both the current and proposed rules
edge: Assemblage | multiple parcels | Combine and re-score
edge: Contaminated land | Contaminated land has an unknown clean-up cost that dominates the feasibility | Flag suspected contamination and require an environmental survey before the site ranks highly
off: PR-AUC on projects that proceeded ; Yield error
on: Sites progressed per analyst-week ; Win rate
gap: Only past proceeding sites labelled ; Outdated codes

== listing-photo-quality-and-room-classification | Listing Photo Quality & Room Classification | computer-vision | sub-100ms | foundational | a=1 k=800
obj: Classify the room type and quality of each listing photo so galleries are ordered well and poor images are flagged to the agent.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{Ordinal}(\hat{q},q)
con: Response under 80 ms per image ; Rooms and quality are labels, not judgements of people ; Privacy blur of faces and plates ; Fair for all property types
sn: Room | Room category from content | Filename or order | Agents upload in random order
sn: Quality | Technical quality: blur, exposure, tilt | Aesthetic opinions | Aesthetic labels are noisy
sn: Privacy | Detect and blur identifiable content | Ignore | Legal and trust risk
sig: Room class probability | vision model output | Ordering | Rare rooms
sig: Blur score | variance of Laplacian | Quality | Scene
sig: Exposure histogram | highlights and shadows | Quality | HDR
sig: Duplicate similarity | near-duplicate images | Redundancy | Crops
noise: File size | depends on compression
noise: Camera brand | irrelevant
noise: Upload time | irrelevant
base: Agent-ordered gallery with blur thresholds, because portals do this.
prod: A multi-task vision model for room class and quality with ordering rules and privacy blur.
pipe: Image upload @ portal ; Preprocessor @ resize and hash ; Room and quality model @ vision model on GPU ; Privacy blur @ detector ; Gallery orderer @ rules ; Agent feedback @ app ; Label feedback @ lakehouse
edge: Floor plans in the gallery | classed as rooms | Class for floor plans
edge: Night shots | Night shots are dark but valid and are scored as poor quality | Condition the quality score on the scene type so legitimate night photos are not penalised
edge: Regional room names | a den, lounge or study is labelled as a bedroom | Map local room vocabulary to a fixed room taxonomy and monitor per-region accuracy
off: Room accuracy ; Quality rank correlation
on: Listing engagement ; Agent reshoot rate
gap: Training on professional photos ; Label noise

== virtual-staging-and-photo-enhancement | Virtual Staging & Photo Enhancement | computer-vision | seconds | production-grade | a=0.1 k=3000
obj: Furnish empty rooms and enhance photos with generative models, clearly labelled, to help buyers imagine the space.
loss: \mathcal{L}=\mathcal{L}_{\text{recon}}+\lambda\,\mathcal{L}_{\text{perceptual}}+\mu\,\mathcal{L}_{\text{adv}}
con: Staged images are labelled ; Structure is never altered ; Disclosure to buyers ; Seller consent
sn: Honesty | Furniture only, with structure preserved | Altering walls, windows or views | Misrepresentation is a legal risk
sn: Fidelity | Geometry-preserving edits | Free generation | Generated rooms drift from reality
sn: Labelling | Visible staged label | Hidden edits | Trust
sig: Structure preservation | edge map similarity | Honesty | Edge detection
sig: Lighting consistency | shadow direction | Realism | Hard
sig: Style fit | style classifier | Appeal | Taste
sig: Disclosure flag | label present | Compliance | Process
noise: Prompt wording | variance
noise: Seed | variance
noise: Render time | none
base: Manual staging by a service, because it is the current practice.
prod: Controlled diffusion with depth and edge conditioning, an automated structure check and a staged label.
pipe: Photo upload @ portal ; Depth and edge extraction @ vision model ; Staging generator @ conditioned diffusion ; Structure checker @ similarity ; Label stamper @ image service ; Agent approval @ app ; Audit log @ store
edge: Wrong scale furniture | Furniture generated at the wrong scale makes the room look unreal or misleading | Derive scale from the depth map and reject images where furniture sizes are implausible
edge: Reflective surfaces | Mirrors and glass produce artefacts in the generated image | Mask reflective surfaces and leave them unedited
edge: Multiple styles | Different rooms in one listing get inconsistent furniture styles | Lock one style across all rooms in the listing
off: Structure similarity ; Human realism ratings
on: Listing views ; Buyer complaints about staging
gap: Evaluation on easy rooms ; Taste differences

== listing-description-generation-with-fair-housing-checks | Listing Description Generation with Fair-Housing Checks | llm-agents,nlp | seconds | production-grade | a=0.1 k=15 s=3 t=400
obj: Draft accurate listing descriptions from structured facts and photos and block language that could breach fair-housing rules.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Facts come from the record only ; Fair-housing phrases blocked ; Agent approves ; Language policy per jurisdiction
sn: Facts | Description built from verified fields | Invented features | A false pool claim is a legal issue
sn: Compliance | Detect discriminatory phrasing | Style filters | Subtle steering is risky
sn: Tone | Plain accurate language | Hype | Hype triggers complaints
sig: Fact match rate | claims equal to record | Accuracy | Rules
sig: Prohibited phrase score | classifier on steering language | Compliance | Context
sig: Agent edit rate | edits | Quality | Habit
sig: Coverage | key features mentioned | Completeness | Taste
noise: Length | style
noise: Emoji count | style
noise: Neighbourhood adjectives | risk
base: Agent-written text from a template, because it is how listings are made.
prod: Structured-to-text generation, a fact verifier and a fair-housing classifier before agent review.
pipe: Listing facts @ listing system ; Photo tags @ vision model ; Description drafter @ LLM ; Fact verifier @ rules ; Fair-housing checker @ classifier ; Agent review @ editor ; Publish @ portal
edge: Missing facts | The property record is sparse and the model fills the gaps with invented features | Ask the agent for missing facts and refuse to describe features that are not in the record
edge: Local terms | Fair-housing rules and terms differ by jurisdiction and a phrase is fine in one place and not another | Apply jurisdiction-specific rule sets and update them with the law
edge: Coded language | Coded language and euphemisms steer buyers without using banned words | Keep updated phrase lists, use a classifier for steering and add examples from complaints
off: Fact accuracy ; Prohibited phrase recall
on: Listing quality ; Complaints
gap: Training on past listings with bias ; Rules change

== home-search-ranking | Home Search Ranking | recommender,tabular | sub-100ms | production-grade | a=15 k=6
obj: Rank homes for a buyer's search by the likelihood of engagement and fit, balancing relevance, freshness and seller fairness.
loss: \mathcal{L}=\mathrm{ListNet}(s,y)+\lambda\,\mathrm{BPR}(\hat{y},y)
con: p99 under 80 ms ; Filters respected exactly ; No steering by protected attributes ; Fresh listings appear within a minute
sn: Intent | Session intent from filters and saves | Clicks only | Clicks reward photos not fit
sn: Fit | Hard match on price, beds and location | Soft score | Mismatched results annoy
sn: Fairness | Equal exposure rules | Pure engagement | Engagement can embed bias
sig: Price fit | position within the buyer's range | Relevance | Range changes
sig: Saved and shared | saves, shares | Interest | Sparse
sig: Listing freshness | hours since listed | Importance | Decay
sig: Commute fit | time to the buyer's workplace | Fit | Routing
noise: Photo count | portal behaviour
noise: Listing agent | irrelevant
noise: Time on page alone | confounded
base: Sort by newest with filters, because portals start this way.
prod: Two-stage retrieval and learning-to-rank on session context with exposure constraints and a freshness boost.
pipe: Query and filters @ search API ; Candidate retrieval @ geo and filter index ; Feature service @ Redis ; Ranker @ gradient boosting ranker ; Fairness re-rank @ constraint rules ; Results @ API ; Click log @ Kafka
edge: Cold start buyer | A new buyer has no history so ranking has little to personalise on | Fall back to popularity within the buyer's filters and refine after the first few actions
edge: Hot listing | everyone sees it | Diversity
edge: Broad search | A broad search returns thousands of homes and the ranker cannot tell the intent | Cluster the session intent from early actions and diversify the first results
off: NDCG@10 ; Calibration of CTR
on: Saves and enquiries per session ; Time to first enquiry
gap: Position bias in clicks ; Offline replay

== property-recommendation-for-cold-start-buyers | Property Recommendation for Cold-Start Buyers | recommender | seconds | production-grade | a=2 k=10
obj: Recommend homes to new buyers from a few early actions or a short questionnaire and refine as signals arrive.
loss: \mathcal{L}=\mathrm{InfoNCE}(u,i)+\lambda\,\mathrm{BPR}(\hat{y},y)
con: Works from 3 actions ; No sensitive inference ; Explainable reasons ; Opt-out
sn: Cold start | Use content features and explicit preferences | Collaborative filtering | No history
sn: Exploration | Show diverse options | Exploit early | Early exploitation locks in wrong taste
sn: Stage | Buyer journey stage | Single profile | Needs change
sig: Questionnaire answers | budget, beds | Preference | Self report
sig: Early views | first 3 views | Taste | Noise
sig: Item embedding | property embedding | Similarity | Quality
sig: Lookalike buyers | similar early patterns | Collaborative | Sparsity
noise: Device | proxy
noise: Referrer | weak
noise: Time of day | none
base: Popular homes in the searched area, because it is safe.
prod: Two-tower model with content features, bandit exploration and reasons for each recommendation.
pipe: Session start @ app ; Preference capture @ questionnaire ; Item embeddings @ batch ; User tower @ online encoder ; ANN retrieval @ vector index ; Bandit re-ranker @ contextual bandit ; Feedback @ stream
edge: Misleading early clicks | Early clicks driven by curiosity mislead the profile | Decay the weight of early actions and weight saves and enquiries above views
edge: Shared accounts | A couple or family shares an account with different tastes | Split the session into several preference profiles and let the user switch
edge: Budget change | The buyer's budget changes and old preferences keep dominating | Update the profile when filters change and decay older signals faster after a budget change
off: Hit rate@20 ; Coverage
on: Enquiry rate for new users ; Return visits
gap: Historical logs biased to popular homes ; Cold users differ

== floor-plan-extraction-from-images | Floor-Plan Extraction from Images | computer-vision | seconds | production-grade | a=0.05 k=1500
obj: Convert floor-plan images into structured rooms, dimensions and layouts for search, valuation and 3D tours.
loss: \mathcal{L}=\mathcal{L}_{\text{seg}}+\lambda\,\mathcal{L}_{\text{CTC}}
con: Area within 3% of stated ; Rooms labelled ; Handles metric and imperial ; Failures routed to review
sn: Geometry | Walls, doors and rooms as vector geometry | Pixels | Downstream tools need vectors
sn: Scale | Scale from dimension text | Assumed scale | Wrong scale breaks area
sn: Variety | Many drawing styles | One style | Models overfit to a template
sig: Wall segmentation | mask quality | Geometry | Clutter
sig: Dimension OCR | numbers on the plan | Scale | OCR errors
sig: Room label OCR | names | Semantics | Languages
sig: Area consistency | sum rooms vs stated | Validation | Rounding
noise: Colour | style
noise: Watermark | noise
noise: Compass | none
base: Manual tracing by operators, because it is accurate and slow.
prod: Segmentation with OCR and a vectoriser, plus consistency checks and a human correction tool.
pipe: Image upload @ portal ; Preprocessor @ normaliser ; Wall and room model @ segmentation model ; OCR @ text recognition ; Vectoriser @ geometry ; Validator @ rules ; Correction tool @ web
edge: Hand-drawn plans | Hand-drawn plans are irregular and the wall detector fails | Detect low-confidence geometry and send the plan to the correction tool
edge: Multi-floor sheets | A sheet holds several floors and they are merged into one | Detect the floor titles, split the sheet and extract each floor separately
edge: Missing dimensions | A plan has no dimension text so the scale cannot be recovered | Ask the agent for one known dimension and mark areas as estimated until then
off: Room IoU ; Area error
on: Manual tracing hours saved ; 3D tour conversion
gap: Training on clean CAD ; Template leak

== duplicate-listing-detection-across-portals | Duplicate Listing Detection Across Portals | graph,computer-vision | batch | production-grade | a=1 k=50
obj: Identify the same property listed by several agents and portals so search shows one entry and statistics count it once.
loss: \mathcal{L}=\mathrm{Contrastive}(z_i,z_j)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: False merges avoided ; Source links kept ; Daily run ; Explainable matches
sn: Identity | Property identity from address, geo and images | Text similarity | Agents rewrite text
sn: Merge | Conservative merge with evidence | Aggressive | A wrong merge hides a listing
sn: Unit | Unit-level identity | Building level | Apartments in one building differ
sig: Address match | normalised address | Strong | Formatting
sig: Image hash similarity | perceptual hash | Strong | Re-edits
sig: Price and size agreement | within tolerance | Support | Changes
sig: Agent relation | same broker | Support | Data
noise: Listing ID | arbitrary
noise: Description order | none
noise: Photo count | none
base: Exact match on normalised address and price, because it is simple.
prod: Blocking, pairwise matching with address, image and attribute features, and graph clustering with merge constraints.
pipe: Listing feeds @ portal ingestion ; Blocking @ geo and address keys ; Pair features @ similarity functions ; Match model @ gradient boosting ; Cluster builder @ graph components ; Merge review @ steward UI ; Canonical store @ database
edge: Two units same address | Several apartments share one address and are merged into one listing | Include the unit number and floor in the identity key and merge only on unit-level evidence
edge: Re-listed property | after withdrawal | Time rules
edge: Agent errors | An agent types the wrong address and the listing is matched to a different property | Check the address against geocoding and image evidence before merging
off: Pair F1 ; Cluster purity
on: Duplicate rate in search ; Complaints
gap: Labelled pairs easy ; Same agents in train and test

== buyer-lead-scoring-and-routing | Buyer Lead Scoring & Routing | tabular | sub-100ms | production-grade | a=0.5 k=8
obj: Score portal enquiries by likelihood to transact and route them to the agent best placed to convert them quickly.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Routing within 80 ms ; Fair distribution among agents ; No protected attributes ; Opt-out respected
sn: Intent | Behavioural intent such as repeated viewings | Form fields | Forms are optional
sn: Match | Agent fit by area and skill | Round robin | Fit improves conversion
sn: Timing | Speed to respond | Quality alone | First response wins
sig: Viewing depth | number of listing views | Intent | Bots
sig: Finance readiness | pre-approval flag | Readiness | Self report
sig: Agent response time | median | Match | Gaming
sig: Area expertise | agent sales in area | Fit | Sparse
noise: Name | irrelevant
noise: Email domain | proxy
noise: Device | proxy
base: Round-robin routing, because it is simple and fair.
prod: Gradient boosting on intent and readiness with an assignment optimiser balancing fit and fairness.
pipe: Enquiry intake @ portal ; Bot filter @ rules ; Lead scoring @ boosting ; Agent matching @ optimiser ; Notification @ push ; CRM sync @ CRM ; Outcome feed @ warehouse
edge: Bot enquiries | Bots send fake enquiries that waste agent time and distort the model | Filter by bot signals and exclude them from training labels
edge: Multiple enquiries | The same buyer sends several enquiries and is counted as many leads | Merge enquiries by person identifier and score the merged lead
edge: Agent unavailable | The best-fit agent is unavailable and the lead waits | Fall back to the next-best available agent and cap the waiting time
off: PR-AUC ; Calibration
on: Lead-to-viewing rate ; Time to first contact
gap: Outcomes only for contacted leads ; Agent quality confounds

== tenant-screening-and-affordability-assessment | Tenant Screening & Affordability Assessment | tabular,nlp | seconds | production-grade | a=0.05 k=40
obj: Assess whether a rental applicant can afford a unit and is likely to pay and care for it, using verified income and history, in a fair and explainable way.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{EqualisedOdds}(\hat{p})
con: Complies with fair-housing and credit-reporting law ; Adverse action reasons given ; No protected attributes or proxies ; Applicants can dispute
sn: Affordability | Verified income to rent ratio | Credit score alone | A thin file is not a risky tenant
sn: Fairness | Group error rates monitored | Overall accuracy | Fair-housing law
sn: Evidence | Verified documents | Self-reported | Fraud
sig: Rent-to-income ratio | rent over verified monthly income | Core | Verification
sig: Rental payment history | on-time rent months | Behaviour | Reporting
sig: Income stability | months in job | Stability | Gig work
sig: Document authenticity | forgery score | Fraud | Quality
noise: Name | protected
noise: Postcode of origin | proxy
noise: Social media | unreliable
base: Income at least three times the rent plus a credit threshold, because landlords use it.
prod: Calibrated model with verified-income features, fairness constraints, reasons and a human review for borderline cases.
pipe: Application intake @ portal ; Document verifier @ OCR and checks ; Feature builder @ rules ; Risk model @ monotone boosting ; Fairness monitor @ audit ; Landlord decision @ workflow ; Dispute handling @ case tool
edge: No credit history | An applicant with no credit history, such as a recent arrival, is scored as high risk | Accept alternative evidence such as rent history and employer letters and route to human review
edge: Housing subsidy | A housing voucher or subsidy changes how income and rent are counted | Apply programme-specific affordability rules instead of the standard ratio
edge: Document forgery | A forged or edited payslip passes a text-only check | Run forensic checks on the document and verify income with the payroll provider
off: AUC ; Group error rates
on: Delinquency rate ; Approval equity
gap: Outcomes only for accepted tenants ; Proxy features

== rent-delinquency-prediction | Rent Delinquency Prediction | tabular,time-series | batch | production-grade | a=1 k=3
obj: Predict which tenants will miss rent in the next month so property managers can reach out early with payment plans.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Outreach supportive not punitive ; No eviction decisions from scores ; Explainable ; Weekly refresh
sn: Early | Signals before the due date | Late-payment flag | By then it is too late
sn: Cause | Distress signs such as job change | Past lateness only | Lateness alone misses new problems
sn: Action | Plans that help | Scores that punish | Trust
sig: Payment timing drift | days late trend | Early | Autopay
sig: Portal activity | payment page visits | Intent | Noise
sig: Rent burden change | rent increase vs income | Stress | Income data
sig: Maintenance disputes | open disputes | Withholding | Logging
noise: Unit number | arbitrary
noise: Name | irrelevant
noise: Lease start day | weak
base: Late fees history flag, because managers already use it.
prod: Gradient boosting on timing, burden and engagement with calibrated risk and a care workflow.
pipe: Ledger and portal data @ property system ; Feature builder @ Spark ; Delinquency model @ boosting ; Care list @ rules ; Outreach tool @ comms ; Outcome feed @ warehouse ; Monitor @ dashboard
edge: Payday timing | different pay cycles | Use cycle
edge: Rent assistance pending | payment delayed | Flag
edge: Dispute | A tenant withholds rent over an unresolved repair and looks like a payment risk | Detect open disputes and move the case to a dispute path instead of a delinquency path
off: PR-AUC ; Calibration
on: Rent collected on time ; Payment plans accepted
gap: Outreach changes outcomes ; Autopay hides risk

== lease-renewal-and-churn-prediction | Lease Renewal & Tenant Churn Prediction | tabular | batch | production-grade | a=0.2 k=5
obj: Predict which tenants will renew so managers can set renewal offers that keep good tenants without leaving rent on the table.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Offers follow rent-control rules ; Fair offers ; Decision 120 days before expiry ; Explainable
sn: Price | Renewal rent vs market | Absolute rent | Tenants compare with the market
sn: Experience | Service experience | Lease terms | Complaints predict leaving
sn: Cost | Turnover cost | Vacancy only | Cost of churn is more than vacancy
sig: Renewal rent gap | proposed minus market | Price | Market data
sig: Maintenance resolution time | median days | Experience | Logging
sig: Tenure | months | Stability | Cohorts
sig: Life events | move signals | Trigger | Data
noise: Unit floor | weak
noise: Name | irrelevant
noise: Lease signing weekday | none
base: Historic renewal rate by building, because managers use it.
prod: Gradient boosting with price-gap and service features, plus an offer optimiser trading rent against churn.
pipe: Lease and service data @ property system ; Market rent feed @ rent model ; Renewal model @ boosting ; Offer optimiser @ solver ; Manager console @ app ; Offer log @ CRM ; Outcome feed @ warehouse
edge: Rent control | Rent-control rules cap the increase and the offer would exceed the legal limit | Apply the cap as a hard constraint in the offer optimiser
edge: Building works | Building works disrupt tenants and raise churn for a period | Add a works flag and offer concessions to affected tenants
edge: Roommate change | A roommate change alters the lease and the renewal history | Track the lease holders and treat a roommate change as its own event
off: PR-AUC ; Calibration
on: Renewal rate ; Net effective rent
gap: Offers bias history ; Seasonality

== maintenance-request-triage-and-dispatch | Maintenance Request Triage & Dispatch | nlp,tabular | seconds | production-grade | a=0.3 k=20
obj: Classify tenant maintenance requests by urgency and trade and dispatch the right technician with the right parts.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{OrdinalCE}(\hat{u},u)
con: Emergencies handled in 1 hour ; Safety cases escalate ; Tenant updates ; Audit
sn: Urgency | Safety and habitability triggers | Tone | Calm messages can describe floods
sn: Trade | Correct trade and parts | Free-text category | Wrong trade wastes a visit
sn: Photo | Images clarify | Text only | Photos change urgency
sig: Safety phrases | gas, leak, no heat | Urgency | Language
sig: Image classifier | leak or mould from photo | Support | Quality
sig: Asset history | past repairs of the unit | Cause | Data
sig: Weather | cold snap | Context | Timing
noise: Tenant name | irrelevant
noise: Request length | style
noise: Time sent | weak
base: Staff triage by phone, because it is the current process.
prod: Multimodal classifier for urgency and trade with parts prediction and a dispatch optimiser.
pipe: Request intake @ app and phone ; Text and image classifier @ multimodal model ; Urgency rules @ rules ; Parts predictor @ boosting ; Dispatcher @ optimiser ; Tenant update @ comms ; Outcome log @ warehouse
edge: Emergency after hours | An emergency arrives after hours when nobody reads the queue | Route urgent categories to the on-call technician and page them automatically
edge: Vague request | A request has too little detail to choose a trade or urgency | Ask the tenant a short follow-up question and request a photo before dispatch
edge: Repeat issue | same problem again | Link
off: Urgency recall ; Trade accuracy
on: First-visit fix rate ; Emergency response time
gap: Labels from staff habits ; Photos missing

== predictive-maintenance-for-building-equipment | Predictive Maintenance for Building Equipment | time-series | batch | production-grade | a=24 k=1
obj: Predict failures of building equipment such as chillers, boilers and lifts from sensor data so repairs happen before breakdowns.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{t}-t)
con: Alerts with lead time of 7 days ; Safety equipment priority ; Explainable ; Maintenance windows
sn: Lead | Early warning with usable lead time | Detecting after failure | Late detection has no value
sn: Context | Operating mode and weather | Raw thresholds | Normal load looks like fault
sn: Cost | Cost of false alarms | Recall only | Callouts cost money
sig: Vibration trend | RMS drift | Wear | Sensors
sig: Efficiency drift | kW per ton | Degradation | Weather
sig: Runtime hours | since service | Age | Logging
sig: Fault codes | controller alarms | Support | Noise
noise: Equipment name | label
noise: Installer | weak
noise: Building colour | none
base: Calendar-based maintenance and alarm thresholds, because it is typical.
prod: Remaining-useful-life and anomaly models per equipment class with context features and a work-order integration.
pipe: Sensor stream @ BMS gateway ; Feature builder @ Flink ; Health model @ time-series model ; Alert ranker @ rules ; Work orders @ CMMS ; Technician app @ mobile ; Outcome log @ lakehouse
edge: Sensor drift | Sensor readings drift over time and normal behaviour looks like a fault | Calibrate against reference readings and monitor per-sensor baselines
edge: Mode change | summer to winter | Mode features
edge: Few failures | Equipment fails rarely so there are few labelled failures | Transfer from similar equipment classes and combine with anomaly scores
off: Lead-time recall ; False alarm rate
on: Unplanned downtime ; Maintenance cost
gap: Maintenance resets history ; Few failures

== dynamic-rent-pricing-for-multifamily | Dynamic Rent Pricing for Multifamily | reinforcement-learning,time-series | batch | staff-principal | a=0.3 k=10
obj: Set daily asking rents by unit type to maximise revenue subject to occupancy and fairness rules.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t\left(\text{rent}_t\,\text{occ}_t-\lambda\,\text{vacancy}_t\right)\right]
con: Rent-control and regulatory limits ; No collusive use of competitor data ; Change limits per day ; Explainable
sn: Demand | Lease-up pace and inquiries | Rent alone | Price is only one lever
sn: Competition | Public competitor rents | Private shared data | Antitrust issues
sn: Horizon | Lease expiries spread across the year | Today's rent | Expiry bunching hurts
sig: Inquiry velocity | inquiries per day | Demand | Noise
sig: Occupancy vs target | gap | Pressure | Definition
sig: Competitor asking rents | public listings | Position | Data
sig: Expiry schedule | lease expiries by month | Future | Accuracy
noise: Unit nickname | none
noise: Photo count | none
noise: Agent | none
base: Manager-set rents reviewed weekly, because it is common.
prod: Demand forecasting plus a constrained pricing policy with exploration inside guardrails.
pipe: Leasing data @ property system ; Competitor listings @ public scrape ; Demand model @ boosting ; Pricing policy @ constrained optimiser ; Guardrails @ rules ; Manager approval @ app ; Outcome log @ warehouse
edge: Rent control | Rent-control law caps rent and the price policy suggests more | Enforce the cap as a hard rule in the pricing policy
edge: New building | A new building is in lease-up with no demand history | Use a lease-up policy with its own targets and priors from similar buildings
edge: Shock event | A shock such as a plant closure cuts demand suddenly | Fall back to a conservative policy and alert the manager when demand drops sharply
off: Revenue lift in simulation ; Demand forecast error
on: Revenue per available unit ; Occupancy
gap: Simulated demand optimistic ; Past prices not random

== short-term-rental-pricing-and-occupancy | Short-Term Rental Pricing & Occupancy Forecasting | time-series,tabular | batch | production-grade | a=1 k=4
obj: Recommend nightly prices and forecast occupancy for short-term rentals around events and seasons.
loss: \mathcal{L}=\sum_t\mathrm{Pinball}(\hat{q}_{0.5},y_t)+\lambda\,\mathrm{Huber}(\hat{p}-p)
con: Local regulations on nights ; Host sets floors ; Daily refresh ; Explainable
sn: Calendar | Events, holidays, school terms | Weekday only | Events dominate
sn: Booking window | Days before the stay | Static price | Late gaps need discounts
sn: Fit | Comparable listings | City average | Quality differs
sig: Event calendar | events nearby | Demand | Data
sig: Booking pace | bookings vs normal | Demand | Noise
sig: Comparable prices | similar listings | Position | Selection
sig: Review score | rating | Quality | Bias
noise: Host name | none
noise: Photo count | weak
noise: Listing title | style
base: Fixed seasonal prices by month, because hosts do this.
prod: Quantile occupancy model with a price optimiser per night and host guardrails.
pipe: Calendar and bookings @ channel manager ; Event feed @ data providers ; Occupancy model @ boosting ; Price optimiser @ solver ; Host controls @ app ; Price push @ channel API ; Outcome log @ warehouse
edge: Local ban | A local ban or cap on short-term nights removes available supply | Load regulation as configuration and cap nights in the occupancy forecast
edge: Event cancelled | A major event is cancelled and the high prices no longer fit demand | Reprice from the event feed as soon as the cancellation is published
edge: New listing | A new listing has no reviews or booking history | Use priors from similar listings and update quickly as bookings arrive
off: Occupancy error ; Revenue vs baseline
on: RevPAR ; Occupancy
gap: Past prices endogenous ; Event noise

== tenant-query-assistant | Property Manager Assistant for Tenant Queries | llm-agents,nlp | seconds | production-grade | a=1 k=30 s=4 t=500
obj: Answer tenants' questions about leases, rules, payments and repairs from the manager's documents and systems and escalate what needs a person.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Answers cite the lease or policy ; No legal advice ; Account data only for the verified tenant ; Escalate disputes
sn: Source | Lease and house rules | General knowledge | Wrong rules cause disputes
sn: Identity | Verified tenant context | Open access | Privacy
sn: Scope | Information and ticket creation | Decisions | Managers decide
sig: Citation validity | clause supports claim | Core | Check
sig: Escalation precision | right refusals | Safety | Over-refusal
sig: Resolution rate | solved without human | Value | Quality
sig: Satisfaction | ratings | Quality | Bias
noise: Message length | style
noise: Emoji | style
noise: Time sent | weak
base: FAQ page and an inbox, because it is the current process.
prod: Retrieval over leases and policies, typed tools for balance and tickets, verifier and escalation.
pipe: Message intake @ app and chat ; Identity resolver @ auth ; Retriever @ hybrid search ; Typed tools @ ledger and tickets ; Answer composer @ LLM ; Verifier @ entailment ; Escalation @ case tool
edge: Legal threat | A tenant writes about a legal dispute and the assistant tries to answer | Detect legal threats and escalate to a manager with no automated reply
edge: Wrong unit | The question concerns a different unit from the one the tenant is verified for | Verify the tenant's unit before reading account data and ask when it is unclear
edge: Injection | embedded instruction | Data
off: Citation validity ; Escalation F1
on: Deflection rate ; Response time
gap: Test on easy questions ; Lease variants

== move-out-damage-assessment-from-photos | Move-Out Damage Assessment from Photos | computer-vision | seconds | production-grade | a=0.05 k=4000
obj: Compare move-in and move-out photos to identify damage beyond normal wear and estimate repair cost for deposit decisions.
loss: \mathcal{L}=\mathcal{L}_{\text{det}}+\lambda\,\mathrm{Ordinal}(\hat{s},s)
con: Tenant can dispute with evidence ; Normal wear separated ; Photos matched by room ; Human sign-off
sn: Wear | Normal wear versus damage | Any change | Deposits cannot cover wear
sn: Alignment | Same view comparisons | Different angles | Misaligned photos mislead
sn: Cost | Repair estimate | Damage flag | Costs drive deductions
sig: Change detection | difference after alignment | Damage | Lighting
sig: Damage class | stain, hole, scratch | Type | Rare
sig: Age of fixture | age | Wear | Records
sig: Repair cost table | local rates | Estimate | Variation
noise: Furniture | removed
noise: Lighting | varies
noise: Camera | varies
base: Manager walk-through with a checklist, because it is the norm.
prod: Alignment, change detection and damage grading with wear rules, cost estimates and a reviewer.
pipe: Photo capture @ inspection app ; Aligner @ geometry ; Damage detector @ vision model ; Wear rules @ rules ; Cost estimator @ table and boosting ; Reviewer @ web ; Report @ PDF
edge: Different lighting | Different lighting between move-in and move-out photos looks like damage | Normalise exposure and compare structure instead of raw colour
edge: Missing photos | Some rooms are missing from the move-out photos | Request the missing photos and mark those rooms as not assessed
edge: Dispute | The tenant disputes the deduction | Provide the matched photos with the change highlighted and route to a person
off: Detection F1 ; Cost error
on: Disputes ; Deposit return time
gap: Posed photos ; Rare damage
