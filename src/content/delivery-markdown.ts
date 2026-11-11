/** Markdown form of the delivery guide: committed as docs/DELIVERY_GUIDE.md and served at /delivery.md. */
import {
  LIFECYCLE_PHASES,
  ROLE_IDS,
  ROLE_LIFECYCLE,
  ROLE_META,
  ROLE_OWNS,
  type PhaseId,
} from '../lib/roles';
import {
  ALL_STEPS,
  ASSURANCE,
  BLUEPRINT_ANCHORS,
  DELIVERY_PHASES,
  FRAMEWORKS,
  FRAMEWORK_NOTE,
  GLOSSARY,
  HOW_TO_USE,
  MONITORING,
  OWASP_LLM,
  PARTNERS,
  PARTNER_IDS,
  PARTY_IDS,
  REFERENCE_PLAN_NOTE,
  RHYTHM,
  TEAM_RULE,
  TEAM_SHAPES,
  VARIANTS,
  partyLabel,
  raciFor,
  type PartyId,
} from './delivery';

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (head: string[], rows: string[][]) => [
  `| ${head.join(' | ')} |`,
  `| ${head.map(() => '---').join(' | ')} |`,
  ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`),
];
const names = (ids: readonly PartyId[]) => ids.map(partyLabel).join(', ');
/** The anchor GitHub gives a heading: lower case, punctuation dropped, each space a hyphen. */
const anchor = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/ /g, '-');
const phaseHeading = (p: { n: number; name: string }) => `Phase ${p.n} · ${p.name}`;

export function deliveryMarkdown(siteUrl = 'https://sadiqgpasha89.github.io/BrainSiphon'): string {
  const out: string[] = [];
  const add = (...lines: string[]) => out.push(...lines);
  const refs = (anchors: readonly (keyof typeof BLUEPRINT_ANCHORS)[]) =>
    anchors.map((a) => `${BLUEPRINT_ANCHORS[a]} (\`#${a}\`)`).join('; ');

  add(
    '# BrainSiphon delivery guide: from project scoping to deployment and monitoring',
    '',
    `> One path, ${DELIVERY_PHASES.length} phases and ${ALL_STEPS.length} steps, that takes any BrainSiphon use case from a named business problem to a monitored production service. Every step says who does it, who takes part, when, how, what it produces and where to read in the blueprint.`,
    '',
    `Interactive version, with your use case selected and a progress checklist: ${siteUrl}/delivery`,
    '',
    '<!-- Generated from src/content/delivery.ts by `npm run guide:build`. Edit that file, not this one. -->',
    '',
    '## Contents',
    '',
    '- [How to use this guide](#how-to-use-this-guide)',
    '- [The path at a glance](#the-path-at-a-glance)',
    '- [Who is involved](#who-is-involved)',
    '- [RACI by phase](#raci-by-phase)',
    ...DELIVERY_PHASES.map((p) => `- [${phaseHeading(p)}](#${anchor(phaseHeading(p))})`),
    '- [Meeting rhythm](#meeting-rhythm)',
    '- [Evaluation, guardrails and governance: where each is covered](#evaluation-guardrails-and-governance-where-each-is-covered)',
    '- [Frameworks and regulations: a crosswalk](#frameworks-and-regulations-a-crosswalk)',
    '- [Monitoring after go-live](#monitoring-after-go-live)',
    '- [Adapting to your team](#adapting-to-your-team)',
    '- [Adapting to the kind of use case](#adapting-to-the-kind-of-use-case)',
    '- [Every deliverable, in order](#every-deliverable-in-order)',
    '- [Glossary](#glossary)',
    '',
  );

  add('## How to use this guide', '');
  HOW_TO_USE.forEach((h, i) => add(`${i + 1}. **${h.title}.** ${h.body}`));
  add(
    '',
    'A blueprint is the worked answer for one use case. This guide is the order to do the work in, and it is the same for all of them. Wherever a step says “read”, it names the section of the blueprint to open; on the website those are links once you select a use case.',
    '',
  );

  add('## The path at a glance', '');
  add(
    ...table(
      ['Phase', 'Goal', 'Led by', 'Accountable', 'When', 'Ends with'],
      DELIVERY_PHASES.map((p) => [
        `**${p.n} · ${p.name}**`,
        p.goal,
        partyLabel(p.lead),
        partyLabel(p.accountable),
        p.weeks,
        p.gate.name,
      ]),
    ),
  );
  add('', REFERENCE_PLAN_NOTE, '');

  add('## Who is involved', '');
  add(
    'Two groups. **Business partners** own the problem, the data, the rules and the money. **Delivery roles** design, build, verify and run the system. On a small team one person holds several roles (see [Adapting to your team](#adapting-to-your-team)).',
    '',
    '### Business partners',
    '',
  );
  add(
    ...table(
      ['Partner', 'What they do', 'How you work with them', 'When they are needed', 'Decisions that are theirs'],
      PARTNER_IDS.map((id) => {
        const p = PARTNERS[id];
        return [`**${p.label}**`, p.does, p.how, p.when, p.decides];
      }),
    ),
  );
  add('', '### Delivery roles', '');
  add(
    ...table(
      ['Role', 'Owns', 'Works on'],
      ROLE_IDS.map((r) => [`**${ROLE_META[r].label}**`, ROLE_OWNS[r], ROLE_META[r].focus]),
    ),
  );
  add('', '### What each delivery role does in each phase', '');
  for (const r of ROLE_IDS) {
    add(`**${ROLE_META[r].label}**`, '');
    for (const p of LIFECYCLE_PHASES) {
      const text = ROLE_LIFECYCLE[r][p.id as PhaseId];
      if (text) add(`- Phase ${p.id.slice(1)}: ${text}`);
    }
    add('');
  }

  add('## RACI by phase', '');
  add(
    '**R** does the work (owns at least one step). **A** answers for the phase result. **C** takes part in a step, or calls or signs the gate. **I** is kept informed. A dot means no part in that phase. Derived from the steps below.',
    '',
  );
  add(
    ...table(
      ['Party', ...DELIVERY_PHASES.map((p) => `${p.n} ${p.short}`)],
      PARTY_IDS.map((id) => [partyLabel(id), ...DELIVERY_PHASES.map((p) => raciFor(p, id) || '·')]),
    ),
  );
  add('');

  for (const p of DELIVERY_PHASES) {
    add(`## ${phaseHeading(p)}`, '');
    add(
      `**Goal.** ${p.goal}`,
      '',
      `- **When:** ${p.weeks}`,
      `- **Led by:** ${partyLabel(p.lead)}`,
      `- **Accountable:** ${partyLabel(p.accountable)}`,
      `- **Kept informed:** ${names(p.informed)}`,
      `- **Before you start:** ${p.entry}`,
      '',
    );
    add(
      ...table(
        ['Step', 'What', 'Owner', 'When', 'Output'],
        p.steps.map((s) => [s.id, s.title, partyLabel(s.owner), s.when, s.output]),
      ),
    );
    add('');
    for (const s of p.steps) {
      add(`### ${s.id} ${s.title}`, '');
      add(`- **Owner:** ${partyLabel(s.owner)}`, `- **With:** ${names(s.with)}`, `- **When:** ${s.when}`, '- **How:**');
      s.how.forEach((h, i) => add(`  ${i + 1}. ${h}`));
      add(`- **Output:** ${s.output}`);
      add(`- **Read in the blueprint:** ${refs(s.read)}`);
      if (s.note) add(`- **Variation:** ${s.note}`);
      add('');
    }
    add(`### ${p.gate.name}`, '');
    add(
      `Called by: ${partyLabel(p.gate.convenedBy)}. Signed by: ${names(p.gate.signedBy)}. Every line is evidence that must exist.`,
      '',
    );
    for (const c of p.gate.checks) add(`- [ ] ${c}`);
    add('', `### Common mistakes in Phase ${p.n}`, '');
    for (const t of p.traps) add(`- ${t}`);
    add('');
  }

  add('## Meeting rhythm', '');
  add(
    ...table(
      ['Meeting', 'When', 'Who', 'Purpose'],
      RHYTHM.map((m) => [`**${m.meeting}**`, m.when, m.who, m.purpose]),
    ),
  );
  add('');

  add('## Evaluation, guardrails and governance: where each is covered', '');
  add(
    'The concerns people ask about by name. Each row lists the steps that deal with it and the blueprint sections that hold the detail. It is an index over the steps above, not extra work.',
    '',
  );
  add(
    ...table(
      ['Concern', 'The question it answers', 'Guide steps', 'Read in the blueprint'],
      ASSURANCE.map((a) => [`**${a.concern}**`, a.question, a.steps.join(', '), refs(a.read)]),
    ),
  );
  add('');

  add('## Frameworks and regulations: a crosswalk', '');
  add(
    'What the main AI frameworks ask for, and where this guide and the blueprints already do it. Each blueprint adds the obligations of its own industry in its governance section.',
    '',
  );
  add(
    ...table(
      ['Framework', 'What it is', 'What it asks for', 'Guide steps', 'Read in the blueprint'],
      FRAMEWORKS.map((f) => [`**${f.name}**`, f.kind, f.asks, f.steps.join(', '), refs(f.read)]),
    ),
  );
  add('', '### OWASP Top 10 for LLM Applications, item by item', '');
  add(
    ...table(
      ['Item', 'Risk', 'Control used here', 'Guide steps'],
      OWASP_LLM.map((o) => [o.id, `**${o.risk}**`, o.control, o.steps.join(', ')]),
    ),
  );
  add('', FRAMEWORK_NOTE, '');

  add('## Monitoring after go-live', '');
  add(
    'Uptime is one layer of seven. A model can be available, fast and wrong, so each layer has its own owner and its own response. The blueprint’s Metrics catalogue lists the specific metrics, targets and alerts for the use case.',
    '',
  );
  add(
    ...table(
      ['Layer', 'What to watch', 'Owner', 'How often', 'What to do when it moves'],
      MONITORING.map((m) => [`**${m.layer}**`, m.watch, partyLabel(m.owner), m.cadence, m.action]),
    ),
  );
  add('');

  add('## Adapting to your team', '');
  for (const t of TEAM_SHAPES) add(`- **${t.name}.** ${t.who} ${t.how}`);
  add('', TEAM_RULE, '');

  add('## Adapting to the kind of use case', '');
  add(
    'The phases and gates stay the same. What changes is where the effort goes. Each blueprint names its pattern at the top of the page.',
    '',
  );
  add(...table(['Kind of use case', 'What changes'], VARIANTS.map((v) => [`**${v.kind}**`, v.changes])));
  add('');

  add('## Every deliverable, in order', '');
  for (const p of DELIVERY_PHASES) {
    add(`**Phase ${p.n} · ${p.name}**`, '');
    for (const s of p.steps) add(`- [ ] ${s.id} ${s.output} (${partyLabel(s.owner)})`);
    add(`- [ ] ${p.gate.name}, signed by ${names(p.gate.signedBy)}`, '');
  }

  add('## Glossary', '');
  for (const g of GLOSSARY) add(`- **${g.term}.** ${g.meaning}`);
  add('');

  return out.join('\n');
}
