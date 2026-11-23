# Body-Worn Camera Footage Redaction Assistant: model card and data card

> Generated from the blueprint `public-safety/bodycam-footage-redaction-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Body-Worn Camera Footage Redaction Assistant · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Editors blurring frame by frame in video tools, because it is the current process.
- **Production model:** A tracking and detection pipeline that proposes blur regions across frames and audio mute segments in a review interface with reasons and a release gate.
- **Intended use:** Suggest blurs for faces, plates, screens and bystander audio in footage prepared for release so staff review redactions faster and releases protect privacy.
- **Out of scope:** - Officer name: irrelevant.<br>- Camera serial: an identifier.<br>- File name: an artefact.
- **Primary metrics:** - Recall of faces and plates<br>- Over-blur rate<br>- Reviewer correction rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Area and call type<br>- Language and accessibility need<br>- Incident severity and time of day<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Fast motion<br>- Reflections<br>- Long footage
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including rare incident types, small language communities, rural areas and major events; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Suggest blurs for faces, plates, screens and bystander audio in footage prepared for release so staff review redactions faster and releases protect privacy.
- **Label:** For "Body-Worn Camera Footage Redaction Assistant": Suggest blurs for faces, plates, screens and bystander audio in footage prepared for release so staff review redactions faster and releases protect privacy. The reference kit's label: An image is positive when it contains the finding (a defect, a lesion, a tampered region). Labels are per image; images of the same item share a group. Design around this trap first: Modifying originals.
- **Sources:** - **Source:** Face and plate detections inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from vision.<br>- **Source:** Screen and document detection inputs<br>**Owner:** Operations and investigations leadership<br>**System Of Record:** Records management and evidence systems<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from vision.<br>- **Source:** Audio speaker segments inputs<br>**Owner:** Chief data and ethics officer<br>**System Of Record:** Court case management<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from audio models.<br>- **Source:** Exemption category inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the rule base.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Modifying originals<br>- Automatic release<br>- Redactions with no reason code
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
