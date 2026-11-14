# Pack: Knowledge Tracing & Student Modelling (EdTech)

An **institution onboarding package**: LTI 1.3 launch and deep linking, OneRoster rostering and reconciliation, xAPI and Caliper ingestion with replay, QTI mapping, canonical identifiers and LMS-to-SIS identity reconciliation,
executable consent, retention and deletion, mastery updates with offline sync, the **grade firewall**, a role and scope permission model, and group fairness assessment.

```bash
cd fde-packs/edtech/knowledge-tracing-student-modeling
python3 -m pytest tests -q        # 24 tests
```

| File | What it is |
|------|------------|
| `src/edu_integration/lti13.py` | Launch validation (RS256, nonce, deployment, message type), deep-linking response |
| `src/edu_integration/oneroster.py` | Paging, CSV bundle, roster reconciliation, enrolment duplicates and transfers, year rollover |
| `src/edu_integration/xapi.py` | xAPI validation and mapping, Caliper mapping, idempotent event store with replay |
| `src/edu_integration/qti.py` | QTI item parsing and response scoring |
| `src/edu_integration/identity.py` | Canonical ids; LMS-SIS reconciliation by strong keys only, with a review queue and audit |
| `src/edu_integration/consent.py` | Consent by age, withdrawal, processing gate, deletion across every store, retention |
| `src/edu_integration/mastery.py` | BKT updates, offline synchronisation, the grade firewall |
| `src/edu_integration/permissions.py` | Institution, district, school, teacher, student and guardian scopes |
| `src/edu_integration/fairness.py` | Group AUC and calibration gaps |
| `docs/institution-onboarding.md` | The onboarding checklist, interface by interface |

No LMS or SIS vendor has been connected. The LTI and OneRoster code follows the specifications' structure; certify against IMS Global's test suites and the customer's platform before relying on it.
