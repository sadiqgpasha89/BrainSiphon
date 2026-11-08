# Authoring a Build Playbook

A playbook turns a blueprint into something an intermediate engineer can execute. One directory per use case:

```
content/playbooks/<domain>/<use-case-key>/
  playbook.yaml        authored content (validated by src/content/playbook.ts and the Zod PlaybookSchema)
  starter/             real code that runs offline on synthetic data
    make_data.py       synthetic generator with the traps the blueprint warns about
    features.py ...    whatever the use case needs; keep it readable and short
    baseline.py        baseline vs challenger with the evaluation discipline from the blueprint
    test_starter.py    the executable exit gates (pytest); numbers here are quoted in playbook.yaml
    requirements.txt   exact versions (copy of ../../requirements.txt)
```

The directory name must equal the use case key in `content/usecases/<domain>.N.uc`, otherwise `validate:content` fails
(orphan check). Adding a playbook also raises the bar for the use case itself: **>= 4 signal-vs-noise rows, >= 5
high-signal features, >= 3 noisy features, >= 4 edge cases, and no cell under 3 words** in its `.uc` entry.

## The template (every section is required)

| Section (`playbook.yaml` key) | What it must contain |
|---|---|
| `summary` | what the engineer will have built, and which milestones the starter covers vs which need their platform |
| `prerequisites` | `skills` (3+), `tools` (2+); `effort` is derived from the milestone days unless you override it |
| `domainKnowledge` | `overview` (why the domain shapes the solution); `concepts` (5+, each `explanation` and `whyItMatters` for this use case); `glossary` (15+ unique terms, each defined in plain words for a newcomer); `askTheExperts` (3+ questions to put to the people who know the domain). Accuracy matters more than volume: define only what you can state correctly, and prefer the terms a newcomer will hear in the first meeting |
| `data` | `strategy`; `datasets` (1+, each with url, license/access, what it gives, a real caveat); `synthetic` (file, description, knobs); `sample` rows copied from the generator's real output; `label` definition incl. delay |
| `milestones` | `M0..Mn` in order (6+), each with `days`, `tasks`, `deliverable`, and a `gate` of `{metric, threshold, how}` where the threshold is a number the starter's tests actually enforce |
| `starter` | `runtime`, `run` commands, `expected` output (real numbers from a run), `files` (each with a purpose) |
| `workedExample` | `scenario`, 4+ `steps` traced with real numbers from the starter, and an `outcome` |
| `tests` | 4+ authored rows (test, tool/command, pass criterion); two generic rows (load test, game-day) are derived |
| `decisions` | 2+ questions with 2+ options each (`chooseWhen`) and a `default` |
| `pitfalls` | 4+ rows, each tied to a milestone (`at: M2`) with mistake, symptom (measured where possible) and fix |
| `first30Days` | optional: derived from the blueprint's metrics and edge cases if omitted |

## Rules that keep it honest

1. **Numbers come from runs.** Every figure in `expected`, `workedExample`, gates and pitfalls must be copied from the starter's
   actual output. Re-run after any change to the generator.
2. **Gates are executable.** If a milestone gate says "pytest -k leakage passes", that test exists.
3. **Datasets must be real and reachable.** Only list a dataset you opened. `npm run check:links` fetches every URL.
4. **Plant the traps.** The synthetic data must contain the failure modes the blueprint names (label delay, leakage, position
   bias, censoring, injected instructions, ...) so each lesson is demonstrated, not asserted.
5. **Hold the test set out.** Split by time, student, patient, product or case as the domain demands, and test that the split is clean.
6. **No stubs.** `TODO`, `FIXME` and `NotImplementedError` in starter code fail the content gate. LLM-based kits may use a
   deterministic stand-in for the model, but must say so in `summary` and keep the harness real.
7. **Say what you could not verify.** Synthetic results are easier than production; the playbook states it.

## Check your work

```bash
python -m venv .venv && source .venv/bin/activate && pip install -r content/playbooks/requirements.txt
npm run validate:content          # schema, depth rules, orphan check, starter stub check
PYTHON=$(which python) npm run test:playbooks -- <domain>
npm run check:links               # dataset URLs
```
