# KYC Document Verification (Vision): data and feature specification

> Generated from the blueprint `fintech/kyc-document-verification-vision` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** KYC Document Verification (Vision) · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "KYC Document Verification (Vision)": Verify ID documents in under 3 seconds with tamper, forgery and replay detection to cut manual KYC review by 80%. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Synthetic forgeries in training differ from real attacker craft.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| MRZ checksum validity | ICAO 9303 check digits recomputed from parsed fields | Cheap hard check | Parse the raw MRZ not the cleaned text |   |   |   |
| Template conformity | layout and font match against issuing-authority templates | Forgeries drift from the template | Template version must match issue year |   |   |   |
| Screen-recapture score | frequency-domain artefacts in the image | Screen replays leave moiré | Compression changes the spectrum so augment with JPEG |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Forensics | Font, MRZ checksum, hologram and edge-consistency signals | OCR text accuracy alone | A good forgery has perfect text and wrong physics |
| Recapture | Moiré, screen glare and re-photograph detection | Image sharpness | Attackers submit photos of screens that look sharp |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Image resolution | varies with phone model not authenticity |
| Background colour | uninformative and easy to alter |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| MRZ checksum validity inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: parse the raw MRZ not the cleaned text. |
| Template conformity inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: template version must match issue year. |
| Screen-recapture score inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: compression changes the spectrum so augment with JPEG. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: kyc_document_verification_vision_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: mrz_checksum_validity, type: double, nullable: false }
    - { name: template_conformity, type: double, nullable: false }
    - { name: screen_recapture_score, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on MRZ checksum validity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Template conformity against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as MRZ checksum validity, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE kyc_document_verification_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE kyc_document_verification_detections (
  frame_id TEXT NOT NULL REFERENCES kyc_document_verification_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE kyc_document_verification_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "KYC Document Verification (Vision)": Verify ID documents in under 3 seconds with tamper, forgery and replay detection to cut manual KYC review by 80%. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Compliance shapes the design | PCI DSS restricts where full card numbers may be stored or processed, so features are computed on tokens, not card numbers. Declines often need reason codes, and data protection law (such as GDPR) limits profiling and requires explanations for automated decisions that affect customers. | Explainability and data minimisation are requirements on the baseline model, which is one reason a calibrated logistic regression stays in the system as a fallback. |
| Anti-money-laundering and know-your-customer | Banks must verify who customers are (KYC), monitor transactions for patterns such as structuring and layering, screen names against sanctions and politically exposed person lists, and file suspicious activity reports with regulators within deadlines. Monitoring generates alerts that investigators review; most are false. | The cost of an alert is analyst time and the cost of a miss is regulatory penalty, so evaluation uses alert-to-report ratios and investigator capacity, not accuracy. |
| Back-office documents and reconciliation | Banks still run on invoices, statements, journal entries and ledgers. Reconciliation matches records between systems, extraction pulls fields from documents, and both must tie to totals: line items add up, debits equal credits. | Arithmetic and accounting rules are hard constraints that a model's output can be checked against, which makes them strong validation signals. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: MRZ checksum validity | ICAO 9303 check digits recomputed from parsed fields. Cheap hard check. | Leakage risk to design against: Parse the raw MRZ not the cleaned text. |
| A signal-versus-noise trap in this use case: Forensics | The true signal is font, MRZ checksum, hologram and edge-consistency signals; the common noise is oCR text accuracy alone. | A good forgery has perfect text and wrong physics. |

**Ask the experts**

- [ ] What exactly does "Images processed in a regional VPC" mean in practice for kyc document verification (vision): who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "MRZ checksum validity" and "Template conformity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Manual review rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: synthetic forgeries in training differ from real attacker craft, and who can confirm the cut-off times and splits?
- [ ] How often does "New passport design released" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| KYC / CDD | Know your customer and customer due diligence: verifying identity and assessing risk when onboarding and during the relationship. |
| False decline | A genuine transaction that is wrongly refused, also called a false positive, and a direct cost in revenue and customer trust. |
| PEP | Politically exposed person: someone with a prominent public role who needs extra scrutiny. |
| ISO 20022 | A global standard for financial messages with rich structured data used by modern payment systems. |
| PAN | Primary account number, the 13-19 digit number on the card; storing it is tightly controlled, so systems use tokens instead. |
| BIN | Bank identification number, the first 6-8 digits of a PAN that identify the issuing bank and card product. |
| Issuer | The bank that issued the card to the cardholder and decides whether to approve each authorisation. |
| Acquirer | The bank or processor that handles card payments on behalf of the merchant and routes authorisations to the network. |
| PSP | Payment service provider, a company such as a payment gateway that gives merchants one integration for accepting payments. |
| Card network | The scheme such as Visa or Mastercard that carries authorisation messages between acquirer and issuer and sets dispute rules. |
| OCR / text detection | Finding and reading text in images. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| CTC loss | A loss that aligns a signal such as audio or a line image to its text without frame labels. |
