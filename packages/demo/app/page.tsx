import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

type HomePageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

const metrics = [
  { value: '4', label: 'dogfood atlases' },
  { value: '5', label: 'receipt types' },
  { value: '1', label: 'agent loop' },
];

const workflows = [
  {
    name: 'PRcard',
    detail:
      'App routes, HTML mockups, prototypes, target preflight, and audit issues in one atlas.',
    image: '/screenshots/prcard/quick-setup.webp',
  },
  {
    name: 'Bleep',
    detail:
      'Real external app evidence across marketing, browser tool, studio, screenshots, and mockups.',
    image: '/screenshots/bleep.jpeg',
  },
  {
    name: 'Seatify Local',
    detail: 'Local dogfood coverage across marketing, auth, protected routes, and demo flows.',
    image: '/screenshots/seatify-local/home.png',
  },
  {
    name: 'Golden Agent',
    detail:
      'Deterministic reliability gate for inspect, context, probe, diff, and screenshot receipts.',
    image: '/screenshots/golden-agent/home.svg',
  },
];

const proof = [
  {
    title: 'Manifests',
    detail: 'Describe routes, personas, flows, screenshots, HTML mockups, redirects, and auth ids.',
  },
  {
    title: 'Context',
    detail: 'Export compact JSON contracts so agents can reason before touching a browser.',
  },
  {
    title: 'Probe and diff',
    detail: 'Turn live route checks, failures, redirects, and screenshots into auditable receipts.',
  },
  {
    title: 'Viewer',
    detail: 'Render the atlas in React with flow, map, screenshots, Target, and workflow filters.',
  },
];

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  redirectDatasetRequests(params);

  return (
    <main className="landing-shell">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Workflow atlas for agents</p>
          <h1 id="hero-title">NavMap</h1>
          <p className="hero-lede">
            Map routes, mockups, screenshots, live targets, and product flows into one review
            surface. Agents get receipts they can trust; humans get the app shape at a glance.
          </p>
          <div className="hero-actions" aria-label="Primary actions">
            <a className="primary-action" href="/demo">
              Open demo
            </a>
            <a className="secondary-action" href="https://www.npmjs.com/package/@neonwatty/nav-map">
              Install package
            </a>
          </div>
          <dl className="hero-metrics">
            {metrics.map(metric => (
              <div key={metric.label}>
                <dt>{metric.value}</dt>
                <dd>{metric.label}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="hero-preview" aria-label="NavMap product preview">
          <div className="preview-frame">
            <img
              src="/screenshots/prcard/home.webp"
              alt="PRcard home route screenshot inside a NavMap workflow atlas"
            />
          </div>
          <div className="preview-strip" aria-hidden="true">
            <img src="/screenshots/prcard/quick-setup.webp" alt="" />
            <img src="/screenshots/bleep.jpeg" alt="" />
          </div>
        </div>
      </section>

      <section className="landing-band" aria-labelledby="install-title">
        <div className="band-copy">
          <p className="eyebrow">Install</p>
          <h2 id="install-title">Drop a workflow map into any React surface.</h2>
          <p>
            NavMap ships the visual component, scanner CLI, workflow manifests, screenshot receipts,
            probe/diff contracts, and skill-ready templates that make app structure legible to
            humans and agents.
          </p>
        </div>
        <pre className="install-command" aria-label="Install command">
          <code>{`pnpm add @neonwatty/nav-map
pnpm dlx @neonwatty/nav-map-scanner workflow app.workflow.json --inspect --contract`}</code>
        </pre>
      </section>

      <section className="proof-section" aria-labelledby="proof-title">
        <div className="section-heading">
          <p className="eyebrow">Agent loop</p>
          <h2 id="proof-title">Inspect first. Verify next. Keep the receipt.</h2>
          <p>
            The package is built around repeatable proof: workflow inspect, context contracts,
            generated graphs, route probes, and expected-vs-observed diffs.
          </p>
        </div>
        <div className="proof-grid">
          {proof.map(item => (
            <article className="proof-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section" aria-labelledby="workflow-title">
        <div className="section-heading">
          <p className="eyebrow">Dogfood proof</p>
          <h2 id="workflow-title">Prototype, live app, and HTML mockup review in one place.</h2>
          <p>
            NavMap is already carrying real workflow maps for product demos and external app
            dogfood, including unavailable-target receipts that still diff cleanly.
          </p>
        </div>
        <div className="workflow-grid">
          {workflows.map(workflow => (
            <article className="workflow-card" key={workflow.name}>
              <img src={workflow.image} alt={`${workflow.name} workflow screenshot`} />
              <div>
                <h3>{workflow.name}</h3>
                <p>{workflow.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function redirectDatasetRequests(searchParams: SearchParams | undefined) {
  if (!searchParams?.dataset) return;

  const nextParams = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) nextParams.append(key, item);
    } else if (typeof value === 'string') {
      nextParams.set(key, value);
    }
  }

  redirect(`/demo?${nextParams.toString()}`);
}
