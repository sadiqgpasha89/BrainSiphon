# Institution onboarding package

An FDE should be able to configure an institution, connect its LMS and SIS, map its curriculum and validate its permission structure **without designing the integration independently**.
Work the checklist in order; each step has the code that does it and the evidence that proves it.

## 1. Interfaces and what each is for

| Interface | Purpose | Direction | Code | Customer owner |
|-----------|---------|-----------|------|----------------|
| **LTI 1.3 / Advantage** launch and deep linking | Learner and teacher enter the tool from the LMS without a second login; teacher picks content | LMS -> tool | `lti13.py` | LMS administrator |
| **OneRoster 1.2** (REST or CSV) | Who the students, teachers, classes and enrolments are; the SIS is the system of record | SIS -> tool | `oneroster.py` | SIS / data office |
| **xAPI** (and **Caliper**) | What learners did: answers, attempts, completions | LMS or tool -> LRS / tool | `xapi.py` | LMS administrator / vendor |
| **QTI 2.1/3.0** | The assessment items: stem, choices, correct response, the skills measured | Assessment platform -> tool | `qti.py` | Assessment team |
| Curriculum and skill taxonomy | Which skills exist, how they relate, how this institution names them | Curriculum office -> tool | section 4 | Curriculum lead |
| Adaptive-learning service and teacher dashboard | Where mastery goes: practice selection, interventions | tool -> apps | contracts | Product / teachers |
| Gradebook | **Read-only boundary**: mastery never becomes a grade automatically | tool -> teacher -> gradebook | `mastery.GradeFirewall` | Teachers / registrar |

## 2. LTI 1.3 setup

1. Register the tool in the LMS (Canvas, Moodle, Blackboard, D2L, Schoology, Google Classroom via LTI): obtain the **issuer**, **client id**, **deployment id(s)**, the platform's **OIDC auth URL**, **token URL** and **JWKS URL**; give the platform the tool's login-initiation URL, redirect (launch) URL and public JWKS.
2. `LaunchValidator` accepts a launch only if: RS256 signature verifies against the platform's registered key, audience is the tool's client id, token not expired, **nonce matches the login request and is single-use**, `version` is `1.3.0`, `deployment_id` is registered, `message_type` is supported, and `resource_link` is present for resource-link launches.
3. Roles map to permissions: Instructor and TeachingAssistant roles -> teacher view; Learner -> student view; nothing else is trusted.
4. Deep linking: the teacher picks content; `deep_link_response` returns an RS256-signed `LtiDeepLinkingResponse` with the content items and the platform's `data` echoed.
5. Rotate the tool key by publishing both keys in the tool JWKS during overlap.

## 3. Rostering and identity

- Pull users, classes, enrolments, orgs and academic sessions with `oneroster.paged` (limit/offset, `X-Total-Count`) or the CSV bundle.
- `oneroster.reconcile`: create, update, **deactivate on `tobedeleted`**, and report `missing_from_feed` **without deleting**: a record that vanishes twice in a row is deactivated by a person-approved job.
- `oneroster.enrolment_changes`: duplicate enrolments, ended and future enrolments, and possible transfers (a learner leaving one class of a course for another).
- **Canonical ids** (`identity.canon`): `stu_`, `cls_`, `crs_`, `ins_`, `ass_`, `ski_` + a stable hash. The model and every store use canonical ids only.
- **LMS to SIS identity**: link on a strong key (the SIS id carried in the LMS record, or a unique institutional email). Name similarity alone **only creates a review item**: two children called Sam Lee in one school is ordinary. Every link is audited with its evidence.
- Student transfers between schools keep the canonical id and its mastery; year rollover closes old classes and opens new ones (`year_rollover`); mastery is the learner's, not the class's.

## 4. Curriculum and skill taxonomy mapping

| Step | Detail |
|------|--------|
| Obtain | The institution's standards (national, state, board, or local) and the platform's skill ids |
| Map | One row per (institution skill id -> platform skill id) with a relationship: equal, narrower, broader, prerequisite-of. Keep it versioned; a curriculum change is a new version, and mastery migrates by the mapping (see the blueprint's skill-mapping edge case) |
| Items | Each QTI item lists the skills it measures (`<meta name="skills" ...>`); unmapped skills are reported, not dropped |
| Regions | Different regions need different maps; keep one map file per institution |

## 5. Events: xAPI, Caliper, replay and offline

- `xapi.validate_statement` requires actor (exactly one identifier), verb IRI, object, UUID id, ISO timestamp, scaled score in [-1, 1]. `to_learner_event` maps to the internal event.
- `from_caliper` maps `AssessmentItemEvent`, `AssessmentEvent`, `GradeEvent` and navigation.
- `EventStore` is idempotent by event id; `replay(learner)` returns the history by event time then sequence.
- **Offline apps**: events carry device id, per-device sequence and client time. `OfflineSync` accepts out of order, drops duplicates by (device, sequence), flags implausible clocks, and **recomputes mastery from the merged history** so the answer does not depend on arrival order.

## 6. How mastery updates, and what it is allowed to do

`mastery.BKT.update` shows the mechanics: a correct answer raises the posterior by the guess/slip model, an incorrect one lowers it, and a gap decays the estimate (the "returns after a long break" edge case).
The production model replaces BKT behind the same call.
**Grade firewall**: `GradeFirewall.propose` creates a *proposal for teacher review*; `write_grade` refuses any source except `teacher`; `teacher_decides` requires the teacher to state the official value (the model's estimate is not copied) and records a note. Attempted direct writes are counted and alerted.
Teacher overrides and feedback are labels for retraining and for the fairness review.

## 7. Permissions

`permissions.Org` encodes institution -> district -> school -> class -> student, with teacher, student, guardian and admin scopes.
A district admin sees schools in their district only; a school admin only their school; a teacher only their classes; a student only themselves; a guardian only their children;
**platform staff have no default access to learner data**: support access is a break-glass procedure with a logged reason. Test every role against every other institution's data before go-live.

## 8. Minors, guardian consent, retention and deletion (executable)

- `consent.ConsentRegistry`: consent age per jurisdiction (US COPPA 13, EU default 16, UK 13, India DPDP 18: confirm the rule with the institution's counsel); a learner below the age needs guardian consent; withdrawal is immediate; `gate()` stops processing a learner without consent for the purpose.
- `consent.Stores`: every store that holds learner data (events, mastery, features, backups, analytics, logs) registers a **deletion hook and a retention period**. `delete_learner` runs them all and reports per store; a store that errors makes the request `complete: false`, so it cannot be marked done. `run_retention` purges expired data.
- Test: delete a learner and search every store for the canonical id.

## 9. Fairness and institution-specific validation

`fairness.group_report`: AUC and calibration-in-the-large per group, gaps against the best group, **small groups reported as too small to assess** instead of passing. Which groups, thresholds and what to do about a gap are the institution's decisions; the report is evidence for their review.
Validate on each institution's own data before enabling the model there, and again at the start of each school year.

## 10. Onboarding checklist for one institution

1. [ ] Contract, data-processing agreement, consent model and jurisdiction confirmed; DPO contact recorded
2. [ ] LTI registration done; launch tested as teacher and as learner; replay rejected
3. [ ] OneRoster pull works; reconcile run shows creates, updates, deactivations, no deletions; duplicate enrolments reviewed
4. [ ] LMS to SIS links audited; review queue empty or owned
5. [ ] Skill taxonomy mapped and signed by the curriculum lead; unmapped skills list empty
6. [ ] Items imported (QTI); every item has skills
7. [ ] xAPI/Caliper events flowing; replay twice produces identical mastery
8. [ ] Offline sync tested with a device that was offline for a week
9. [ ] Permission matrix tested for every role and cross-institution access
10. [ ] Deletion tested across every store; retention job scheduled
11. [ ] Grade firewall verified: no write path to the gradebook except a teacher action
12. [ ] Fairness report reviewed by the institution; sign-off recorded
13. [ ] Teachers trained on mastery, uncertainty and override; feedback channel open
