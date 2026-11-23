# Body-Worn Camera Footage Redaction Assistant: data and feature specification

> Generated from the blueprint `public-safety/bodycam-footage-redaction-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Body-Worn Camera Footage Redaction Assistant · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Body-Worn Camera Footage Redaction Assistant": Suggest blurs for faces, plates, screens and bystander audio in footage prepared for release so staff review redactions faster and releases protect privacy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Modifying originals.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Face and plate detections | detected regions | Redaction | From vision |   |   |   |
| Screen and document detection | phones and screens in view | Redaction | From vision |   |   |   |
| Audio speaker segments | bystander speech | Redaction | From audio models |   |   |   |
| Exemption category | legal basis | Reason | From the rule base |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Integrity | Original footage preserved with hashes | Edited copies as the source | Courts need originals |
| Role | Suggest and speed up review | Fully automatic release | Wrongful release can endanger people |
| Evidence | Reason codes for each redaction | A bare blur | Releases can be challenged |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Officer name | irrelevant |
| Camera serial | an identifier |
| File name | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Face and plate detections inputs | Emergency communications | Computer-aided dispatch (CAD) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from vision. |
| Screen and document detection inputs | Operations and investigations leadership | Records management and evidence systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from vision. |
| Audio speaker segments inputs | Chief data and ethics officer | Court case management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from audio models. |
| Exemption category inputs | Emergency communications | Computer-aided dispatch (CAD) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the rule base. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: bodycam_footage_redaction_assistant_inputs.v1
owner: emergency-communications@example.com
system_of_record: Computer-aided dispatch (CAD)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: face_and_plate_detections, type: double, nullable: false }
    - { name: screen_and_document_detection, type: double, nullable: false }
    - { name: audio_speaker_segments, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Face and plate detections and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Screen and document detection against Computer-aided dispatch (CAD)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Face and plate detections, traces back to Computer-aided dispatch (CAD); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE bodycam_footage_redaction_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE bodycam_footage_redaction_detections (
  frame_id TEXT NOT NULL REFERENCES bodycam_footage_redaction_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE bodycam_footage_redaction_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Public safety covers emergency calls, dispatch, disaster response, road safety, physical security and the courts. Seconds matter, errors cost lives or liberty, and the data describes people at their worst moments, so systems support trained professionals and are built with strict limits on identification, profiling and secondary use. For this use case, "Body-Worn Camera Footage Redaction Assistant": Suggest blurs for faces, plates, screens and bystander audio in footage prepared for release so staff review redactions faster and releases protect privacy. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Records are sensitive and need strict retention | Incident, victim and witness records are among the most sensitive data a state holds. Access is logged, retention limits are enforced and data is shared only as the law allows. | Aggregated and de-identified data should be used for analytics wherever possible. |
| Courts and justice need transparency | Case scheduling, document handling and records support the courts, but decisions about guilt, sentence and bail belong to judges. Tools must be transparent and open to challenge. | A tool that influences a liberty decision needs a legal basis, validation and disclosure to the parties. |
| Road safety depends on exposure and context | Crash risk depends on road design, speed, traffic, weather and user mix, and crashes are rare events. Analysis works at the location and segment level and avoids singling out drivers. | Targeting individuals from location history raises privacy and fairness concerns. |
| Detection, segmentation and measurement | Classification says whether something is present; detection says where; segmentation outlines it pixel by pixel; measurement turns outlines into numbers such as lengths and volumes. Each has its own metrics and tolerances, and real-time use adds latency limits on edge hardware. | Choose the task and metric from the decision: a triage flag needs sensitivity, a surgical plan needs boundary accuracy. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Face and plate detections | Detected regions. Redaction. | Leakage risk to design against: From vision. |
| A signal-versus-noise trap in this use case: Integrity | The true signal is original footage preserved with hashes; the common noise is edited copies as the source. | Courts need originals. |

**Ask the experts**

- [ ] What exactly does "Originals never modified" mean in practice for body-worn camera footage redaction assistant: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Face and plate detections" and "Screen and document detection", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Review hours per released hour" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: modifying originals, and who can confirm the cut-off times and splits?
- [ ] How often does "Fast motion" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Redaction | Removing sensitive text from a document. |
| Video analytics | Software that finds events in camera video. |
| E-discovery | Finding and reviewing electronic documents for a case. |
| Bail | Release of an accused person before trial. |
| CAD | Computer-aided dispatch: the system used to record calls and assign units. |
| Triage | Sorting incidents by urgency. |
| Response time | The time from call to arrival of help. |
| Incident command | A system for managing response at the scene. |
| Vision Zero | A strategy to eliminate road deaths and serious injuries. |
| Speed management | Setting and enforcing speeds to cut harm. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Re-identification | Recognising the same person or object across different camera views. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Word error rate (WER) | Errors in recognised speech divided by the number of reference words. |
| CTC loss | A loss that aligns a signal such as audio or a line image to its text without frame labels. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
