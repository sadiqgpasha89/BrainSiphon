import {
  ASSURANCE,
  DELIVERY_PHASES,
  DELIVERY_TEMPLATES,
  FRAMEWORKS,
  FRAMEWORK_NOTE,
  GLOSSARY,
  MONITORING,
  OWASP_LLM,
  PARTNERS,
  PARTNER_IDS,
  PARTY_IDS,
  RHYTHM,
  TEAM_RULE,
  TEAM_SHAPES,
  VARIANTS,
  partyLabel,
  raciFor,
  type Raci,
} from '../../content/delivery';
import { ROLE_IDS, ROLE_META, ROLE_OWNS } from '../../lib/roles';
import { withBase } from '../../lib/site';
import { DOWNLOAD_BUNDLES } from '../../content/downloads-meta';
import { BlueprintRefs, StepLinks } from './GuideLinks';

const RACI_TONE: Record<Raci, string> = {
  A: 'bg-accent-soft text-accent',
  'A/R': 'bg-accent-soft text-accent',
  R: 'bg-signal-soft text-signal',
  C: 'text-ink',
  I: 'text-dim',
  '': 'text-dim',
};

function Block({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-12 scroll-mt-24 border-t border-line pt-10">
      <h2 id={`${id}-h`} className="text-2xl font-semibold tracking-tight text-ink">
        {title}
      </h2>
      {intro && <p className="mt-2 max-w-3xl text-mute">{intro}</p>}
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  );
}

const Wrap = ({ children, testid }: { children: React.ReactNode; testid?: string }) => (
  <div className="card overflow-x-auto" data-testid={testid}>
    {children}
  </div>
);

/** The parts of the guide that do not change with the reader's choices: people, RACI, rhythm, monitoring, variants, glossary. */
export function DeliveryReference() {
  return (
    <>
      <Block
        id="assurance"
        title="Evaluation, guardrails and governance: where each is covered"
        intro="The concerns people ask about by name. Each row lists the steps that deal with it and the blueprint sections that hold the detail for your use case. It is an index over the steps above, not extra work."
      >
        <Wrap testid="assurance-table">
          <table className="bs-table min-w-[48rem]">
            <thead>
              <tr>
                <th>Concern</th>
                <th>The question it answers</th>
                <th>Guide steps</th>
                <th>Read in the blueprint</th>
              </tr>
            </thead>
            <tbody>
              {ASSURANCE.map((a) => (
                <tr key={a.concern}>
                  <td className="font-medium !text-ink">{a.concern}</td>
                  <td>{a.question}</td>
                  <td>
                    <span className="flex flex-wrap gap-1">
                      <StepLinks ids={a.steps} />
                    </span>
                  </td>
                  <td>
                    <span className="flex flex-wrap gap-1">
                      <BlueprintRefs anchors={a.read} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Wrap>
      </Block>

      <Block
        id="frameworks"
        title="Frameworks and regulations: a crosswalk"
        intro="What the main AI frameworks ask for, and where this guide and the blueprints already do it. Each blueprint adds the obligations of its own industry in its governance section."
      >
        <Wrap testid="frameworks-table">
          <table className="bs-table min-w-[52rem]">
            <thead>
              <tr>
                <th>Framework</th>
                <th>What it is</th>
                <th>What it asks for</th>
                <th>Guide steps</th>
                <th>Read in the blueprint</th>
              </tr>
            </thead>
            <tbody>
              {FRAMEWORKS.map((f) => (
                <tr key={f.id}>
                  <td className="font-medium !text-ink">{f.name}</td>
                  <td>{f.kind}</td>
                  <td>{f.asks}</td>
                  <td>
                    <span className="flex flex-wrap gap-1">
                      <StepLinks ids={f.steps} />
                    </span>
                  </td>
                  <td>
                    <span className="flex flex-wrap gap-1">
                      <BlueprintRefs anchors={f.read} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Wrap>
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-dim">
            OWASP Top 10 for LLM Applications, item by item
          </h3>
          <div className="mt-2">
            <Wrap testid="owasp-table">
              <table className="bs-table min-w-[40rem]">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Risk</th>
                    <th>Control used here</th>
                    <th>Guide steps</th>
                  </tr>
                </thead>
                <tbody>
                  {OWASP_LLM.map((o) => (
                    <tr key={o.id}>
                      <td className="font-mono text-xs">{o.id}</td>
                      <td className="font-medium !text-ink">{o.risk}</td>
                      <td>{o.control}</td>
                      <td>
                        <span className="flex flex-wrap gap-1">
                          <StepLinks ids={o.steps} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Wrap>
          </div>
        </div>
        <p className="text-sm text-mute">{FRAMEWORK_NOTE}</p>
      </Block>

      <Block
        id="people"
        title="Who is involved"
        intro="Two groups. Business partners own the problem, the data, the rules and the money. Delivery roles design, build, verify and run the system. On a small team one person holds several roles."
      >
        <Wrap testid="partners-table">
          <table className="bs-table min-w-[52rem]">
            <thead>
              <tr>
                <th>Business partner</th>
                <th>What they do</th>
                <th>How you work with them</th>
                <th>When</th>
                <th>Their decisions</th>
              </tr>
            </thead>
            <tbody>
              {PARTNER_IDS.map((id) => (
                <tr key={id}>
                  <td className="font-medium !text-ink">{PARTNERS[id].label}</td>
                  <td>{PARTNERS[id].does}</td>
                  <td>{PARTNERS[id].how}</td>
                  <td>{PARTNERS[id].when}</td>
                  <td>{PARTNERS[id].decides}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Wrap>
        <Wrap testid="roles-table">
          <table className="bs-table min-w-[40rem]">
            <thead>
              <tr>
                <th>Delivery role</th>
                <th>Owns</th>
                <th>Works on</th>
              </tr>
            </thead>
            <tbody>
              {ROLE_IDS.map((r) => (
                <tr key={r}>
                  <td className="font-medium !text-ink">{ROLE_META[r].label}</td>
                  <td>{ROLE_OWNS[r]}</td>
                  <td>{ROLE_META[r].focus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Wrap>
        <p className="text-sm text-mute">
          To see only one role’s steps, choose it under “Your role” at the top of this page.
        </p>
      </Block>

      <Block
        id="raci"
        title="RACI by phase"
        intro="R does the work. A answers for the phase result. C takes part in a step, or calls or signs the gate. I is kept informed. The matrix is derived from the steps above, so it cannot disagree with them."
      >
        <Wrap testid="raci-table">
          <table className="bs-table min-w-[44rem]">
            <thead>
              <tr>
                <th>Party</th>
                {DELIVERY_PHASES.map((p) => (
                  <th key={p.id} className="!text-center">
                    {p.n} · {p.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PARTY_IDS.map((id) => (
                <tr key={id}>
                  <td className="font-medium !text-ink">{partyLabel(id)}</td>
                  {DELIVERY_PHASES.map((p) => {
                    const v = raciFor(p, id);
                    return (
                      <td key={p.id} className="!text-center">
                        <span
                          className={`inline-block min-w-8 rounded px-1.5 py-0.5 font-mono text-xs ${RACI_TONE[v]}`}
                        >
                          {v || '·'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Wrap>
      </Block>

      <Block
        id="rhythm"
        title="Meeting rhythm"
        intro="The meetings that keep the work moving, and when each one happens."
      >
        <Wrap>
          <table className="bs-table min-w-[44rem]">
            <thead>
              <tr>
                <th>Meeting</th>
                <th>When</th>
                <th>Who</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {RHYTHM.map((m) => (
                <tr key={m.meeting}>
                  <td className="font-medium !text-ink">{m.meeting}</td>
                  <td>{m.when}</td>
                  <td>{m.who}</td>
                  <td>{m.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Wrap>
      </Block>

      <Block
        id="monitoring"
        title="Monitoring after go-live"
        intro="Uptime is one layer of seven. A model can be available, fast and wrong, so each layer has its own owner and its own response. The Metrics catalogue in each blueprint lists the specific metrics, targets and alerts."
      >
        <Wrap testid="monitoring-table">
          <table className="bs-table min-w-[48rem]">
            <thead>
              <tr>
                <th>Layer</th>
                <th>What to watch</th>
                <th>Owner</th>
                <th>How often</th>
                <th>When it moves</th>
              </tr>
            </thead>
            <tbody>
              {MONITORING.map((m) => (
                <tr key={m.layer}>
                  <td className="font-medium !text-ink">{m.layer}</td>
                  <td>{m.watch}</td>
                  <td>{partyLabel(m.owner)}</td>
                  <td>{m.cadence}</td>
                  <td>{m.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Wrap>
      </Block>

      <Block
        id="templates"
        title="Executable delivery templates and implementation packages"
        intro="Standardized, downloadable deliverables covering client discovery, production architecture contracts, data engineering pipelines, and low-latency serving microservices."
      >
        <ul className="mb-3 flex flex-wrap gap-3 text-sm" data-testid="template-bundles">
          {DOWNLOAD_BUNDLES.map((b) => (
            <li key={b.id} className="card p-3">
              <a
                className="font-semibold text-signal underline"
                href={withBase(`/downloads/${b.zip}`)}
                download
              >
                {b.title} (.zip)
              </a>
              <p className="mt-1 max-w-xs text-xs text-mute">{b.note}</p>
            </li>
          ))}
          <li className="card p-3">
            <a className="font-semibold text-signal underline" href={withBase('/downloads/manifest.json')}>
              File manifest with SHA-256 checksums
            </a>
            <p className="mt-1 max-w-xs text-xs text-mute">
              Verify any download against the manifest of this release.
            </p>
          </li>
        </ul>
        <Wrap>
          <table className="bs-table min-w-[48rem]">
            <thead>
              <tr>
                <th>Code</th>
                <th>Phase</th>
                <th>Deliverable Title</th>
                <th>Owner</th>
                <th>File Location</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {DELIVERY_TEMPLATES.map((t) => (
                <tr key={t.code}>
                  <td className="font-mono text-xs font-semibold !text-signal">{t.code}</td>
                  <td>{t.phaseId}</td>
                  <td className="font-medium !text-ink">{t.title}</td>
                  <td>{partyLabel(t.ownerRole)}</td>
                  <td className="font-mono text-xs">
                    <a className="text-signal underline" href={withBase(`/downloads/${t.file}`)} download>
                      {t.file.replace('delivery/templates/', '')}
                    </a>
                  </td>
                  <td className="text-xs text-mute">{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Wrap>
      </Block>

      <Block
        id="adapt"
        title="Adapting the guide"
        intro="The phases and gates stay the same. What changes is how many people hold the roles, and where the effort goes."
      >
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-dim">To your team</h3>
          <ul className="mt-2 grid gap-3 md:grid-cols-3">
            {TEAM_SHAPES.map((t) => (
              <li key={t.name} className="card p-4 text-sm">
                <p className="font-semibold text-ink">{t.name}</p>
                <p className="mt-2 text-mute">{t.who}</p>
                <p className="mt-2 text-mute">{t.how}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-ink">{TEAM_RULE}</p>
        </div>
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-dim">To the kind of use case</h3>
          <Wrap>
            <table className="bs-table mt-2 min-w-[36rem]">
              <thead>
                <tr>
                  <th>Kind of use case</th>
                  <th>What changes</th>
                </tr>
              </thead>
              <tbody>
                {VARIANTS.map((v) => (
                  <tr key={v.kind}>
                    <td className="font-medium !text-ink">{v.kind}</td>
                    <td>{v.changes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Wrap>
        </div>
      </Block>

      <Block id="glossary" title="Glossary">
        <dl className="grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
          {GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt className="font-semibold text-ink">{g.term}</dt>
              <dd className="text-mute">{g.meaning}</dd>
            </div>
          ))}
        </dl>
      </Block>
    </>
  );
}
