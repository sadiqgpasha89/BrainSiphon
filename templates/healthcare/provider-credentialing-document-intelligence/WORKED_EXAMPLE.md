# Provider Credentialing Document Intelligence: worked example

> Run on synthetic data with `extraction` engine, seed 68277, knobs {"n_train": 1270}, in 22.3 s on Python 3.13.18. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Ingest provider applications and supporting evidence, classify each document, extract fields with page-level provenance, validate completeness and reconcile values across sources so credentialing staff review a ready evidence packet instead of raw paperwork.

**Constraints that shape the design.** Every extracted fact links to its source page, region and extraction confidence; The system never approves a credential or grants a privilege and staff verify all evidence; Discrepancies are queued and never auto-resolved

**Label in this use case.** For "Provider Credentialing Document Intelligence": Ingest provider applications and supporting evidence, classify each document, extract fields with page-level provenance, validate completeness and reconcile values across sources so credentialing staff review a ready evidence packet instead of raw paperwork. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Splitting train and test by page and not by provider.

## 2. Choose the signals

Your strongest signal is **Field confidence** (calibrated extraction confidence per field and document). Its rule: Calibrate on held-out document groups. In the starter, the closest executable idea is **token shape**: capitalisation and digit pattern of a token. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A new template is the normal case in production. Rules written for one layout score 1.000 there and 0.000 on a new one; the tagger drops from 1.000 to 0.500.

## 4. Baseline against the stronger design

Labelling 30 documents of the new layout lifts the tagger to 1.000, recovering 0.500 of the 0.500 it lost. The field that breaks first on the new layout is the one with no fixed shape.

| Result | Value |
|---|---|
| Macro-F1, rules on their own layout | 1.000 |
| Macro-F1, rules on an unseen layout | 0.000 |
| Macro-F1, tagger on seen layouts | 1.000 |
| Macro-F1, tagger on an unseen layout | 0.500 |
| Macro-F1 after 30 labelled documents of the new layout | 1.000 |

## 5. An edge case from the blueprint

**Low-quality scan.** fields are misread. Planned response: Confidence threshold routes the document to manual keying with the image attached. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Measure on layouts held out of training, build the loop that turns a failed extraction into a labelled example, and route low-confidence fields to a person.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `train_docs` | 1270 |
| `test_docs_each` | 400 |
| `adaptation_docs` | 30 |
| `rules_seen_layout.INVOICE_ID.precision` | 1 |
| `rules_seen_layout.INVOICE_ID.recall` | 1 |
| `rules_seen_layout.INVOICE_ID.f1` | 1 |
| `rules_seen_layout.DATE.precision` | 1 |
| `rules_seen_layout.DATE.recall` | 1 |
| `rules_seen_layout.DATE.f1` | 1 |
| `rules_seen_layout.AMOUNT.precision` | 1 |
| `rules_seen_layout.AMOUNT.recall` | 1 |
| `rules_seen_layout.AMOUNT.f1` | 1 |
| `rules_seen_layout.VENDOR.precision` | 1 |
| `rules_seen_layout.VENDOR.recall` | 1 |
| `rules_seen_layout.VENDOR.f1` | 1 |
| `rules_seen_layout.macro_f1` | 1 |
| `rules_seen_layout.document_exact_match` | 1 |
| `rules_unseen_layout.INVOICE_ID.precision` | 0 |
| `rules_unseen_layout.INVOICE_ID.recall` | 0 |
| `rules_unseen_layout.INVOICE_ID.f1` | 0 |
| `rules_unseen_layout.DATE.precision` | 0 |
| `rules_unseen_layout.DATE.recall` | 0 |
| `rules_unseen_layout.DATE.f1` | 0 |
| `rules_unseen_layout.AMOUNT.precision` | 0 |
| `rules_unseen_layout.AMOUNT.recall` | 0 |
| `rules_unseen_layout.AMOUNT.f1` | 0 |
| `rules_unseen_layout.VENDOR.precision` | 0 |
| `rules_unseen_layout.VENDOR.recall` | 0 |
| `rules_unseen_layout.VENDOR.f1` | 0 |
| `rules_unseen_layout.macro_f1` | 0 |
| `rules_unseen_layout.document_exact_match` | 0 |
| `tagger_seen_layouts.INVOICE_ID.precision` | 1 |
| `tagger_seen_layouts.INVOICE_ID.recall` | 1 |
| `tagger_seen_layouts.INVOICE_ID.f1` | 1 |
| `tagger_seen_layouts.DATE.precision` | 1 |
| `tagger_seen_layouts.DATE.recall` | 1 |
| `tagger_seen_layouts.DATE.f1` | 1 |
| `tagger_seen_layouts.AMOUNT.precision` | 1 |
| `tagger_seen_layouts.AMOUNT.recall` | 1 |
| `tagger_seen_layouts.AMOUNT.f1` | 1 |
| `tagger_seen_layouts.VENDOR.precision` | 1 |
| `tagger_seen_layouts.VENDOR.recall` | 1 |
| `tagger_seen_layouts.VENDOR.f1` | 1 |
| `tagger_seen_layouts.macro_f1` | 1 |
| `tagger_seen_layouts.document_exact_match` | 1 |
| `tagger_unseen_layout.INVOICE_ID.precision` | 1 |
| `tagger_unseen_layout.INVOICE_ID.recall` | 1 |
| `tagger_unseen_layout.INVOICE_ID.f1` | 1 |
| `tagger_unseen_layout.DATE.precision` | 0 |
| `tagger_unseen_layout.DATE.recall` | 0 |
| `tagger_unseen_layout.DATE.f1` | 0 |
| `tagger_unseen_layout.AMOUNT.precision` | 1 |
| `tagger_unseen_layout.AMOUNT.recall` | 1 |
| `tagger_unseen_layout.AMOUNT.f1` | 1 |
| `tagger_unseen_layout.VENDOR.precision` | 0 |
| `tagger_unseen_layout.VENDOR.recall` | 0 |
| `tagger_unseen_layout.VENDOR.f1` | 0 |
| `tagger_unseen_layout.macro_f1` | 0.5 |
| `tagger_unseen_layout.document_exact_match` | 0 |
| `tagger_unseen_after_adaptation.INVOICE_ID.precision` | 1 |
| `tagger_unseen_after_adaptation.INVOICE_ID.recall` | 1 |
| `tagger_unseen_after_adaptation.INVOICE_ID.f1` | 1 |
| `tagger_unseen_after_adaptation.DATE.precision` | 1 |
| `tagger_unseen_after_adaptation.DATE.recall` | 1 |
| `tagger_unseen_after_adaptation.DATE.f1` | 1 |
| `tagger_unseen_after_adaptation.AMOUNT.precision` | 1 |
| `tagger_unseen_after_adaptation.AMOUNT.recall` | 1 |
| `tagger_unseen_after_adaptation.AMOUNT.f1` | 1 |
| `tagger_unseen_after_adaptation.VENDOR.precision` | 1 |
| `tagger_unseen_after_adaptation.VENDOR.recall` | 1 |
| `tagger_unseen_after_adaptation.VENDOR.f1` | 1 |
| `tagger_unseen_after_adaptation.macro_f1` | 1 |
| `tagger_unseen_after_adaptation.document_exact_match` | 1 |
| `unseen_layout_drop` | 0.5 |
| `adaptation_recovers` | 0.5 |

</details>
