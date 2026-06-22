import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

type HomePageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

const metrics = [
  { value: '4', label: 'workflow datasets' },
  { value: '3', label: 'review modes' },
  { value: '1', label: 'agent-readable atlas' },
];

const workflows = [
  {
    name: 'PRcard',
    detail: 'App routes, HTML mockups, prototypes, target preflight, and audit issues in one map.',
    image: '/screenshots/prcard/quick-setup.webp',
  },
  {
    name: 'Deckchecker',
    detail: 'Speaker workflow screenshots with saved previews and route-level affordances.',
    image: '/screenshots/deckchecker-speaker/upload.png',
  },
  {
    name: 'Seatify Local',
    detail: 'Local dogfood coverage across marketing, auth, protected routes, and demo flows.',
    image: '/screenshots/seatify-local/home.png',
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
            Turn routes, mockups, screenshots, live targets, and product flows into a navigable
            review surface that agents can inspect without losing the shape of the app.
          </p>
          <div className="hero-actions" aria-label="Primary actions">
            <a className="primary-action" href="/demo">
              Open demo
            </a>
            <a className="secondary-action" href="https://www.npmjs.com/package/@neonwatty/nav-map">
              Package
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
            <img src="/screenshots/seatify-local/demo-lab.png" alt="" />
          </div>
        </div>
      </section>

      <section className="landing-band" aria-labelledby="install-title">
        <div className="band-copy">
          <p className="eyebrow">Install</p>
          <h2 id="install-title">Drop a workflow map into any React surface.</h2>
          <p>
            NavMap ships the visual component, scanner outputs, workflow manifests, screenshot
            receipts, and review affordances that make app structure legible to humans and agents.
          </p>
        </div>
        <pre className="install-command" aria-label="Install command">
          <code>pnpm add @neonwatty/nav-map</code>
        </pre>
      </section>

      <section className="workflow-section" aria-labelledby="workflow-title">
        <div className="section-heading">
          <p className="eyebrow">Examples</p>
          <h2 id="workflow-title">Prototype, live app, and HTML mockup review in one place.</h2>
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
