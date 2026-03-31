import type { Metadata } from 'next';
import styles from './page.module.css';
import CopyInstall from '../components/CopyInstall';
import FeatureCard from '../components/FeatureCard';
import ScrollReveal from '../components/ScrollReveal';
import { JsonLd } from '../components/JsonLd';

export const metadata: Metadata = {};

const FEATURES = [
  {
    title: 'Hierarchy View',
    description:
      "See your app's route structure as a top-down tree. Groups collapse and expand with a double-click. Collapse All / Expand All in one click.",
    videoSrc: '/videos/hierarchy-view.webm',
    tag: 'Default View',
    tagColor: 'blue' as const,
  },
  {
    title: 'Search with Preview',
    description:
      'Cmd+K to search pages. See screenshot thumbnails, neighbor counts, and group badges. Press Enter for a smooth camera flight to the result.',
    videoSrc: '/videos/search-preview.webm',
    tag: 'Navigation',
    tagColor: 'purple' as const,
  },
  {
    title: 'Flow Visualization',
    description:
      'Select a user flow to see it laid out as a step-by-step journey. Animate flows to walk through user paths one node at a time.',
    videoSrc: '/videos/flow-view.webm',
    tag: 'Analysis',
    tagColor: 'green' as const,
  },
  {
    title: 'Smart Edge Routing',
    description:
      'Three edge modes \u2014 smooth curves, obstacle-aware routing that avoids groups, or corridor bundling that groups related connections.',
    videoSrc: '/videos/edge-modes.webm',
    tag: 'Layout',
    tagColor: 'orange' as const,
  },
  {
    title: 'Group Focus Mode',
    description:
      'Double-click any group to zoom in and isolate it. Everything else dims away. Double-click again to zoom back out.',
    videoSrc: '/videos/group-focus.webm',
    tag: 'Interactive',
    tagColor: 'blue' as const,
  },
  {
    title: 'Gallery Viewer',
    description:
      'Double-click nodes to browse flow step screenshots in a filmstrip viewer. See exactly what users see at each step of a journey.',
    videoSrc: '/videos/gallery-viewer.webm',
    tag: 'Visual',
    tagColor: 'green' as const,
  },
];

const CAPABILITIES = [
  {
    icon: '\u21A9',
    title: 'Ctrl+Z Undo',
    desc: 'Accidentally drag a node? Undo restores position and group membership.',
  },
  {
    icon: '\u2B21',
    title: 'Semantic Zoom',
    desc: 'Nodes switch between detailed cards and compact pills as you zoom in and out.',
  },
  {
    icon: '\u2318K',
    title: 'Fuzzy Search',
    desc: 'Search nodes by label, route, or group with instant highlighting.',
  },
  {
    icon: '\u2328',
    title: 'Keyboard Nav',
    desc: 'Arrow keys, Escape, shortcuts for every action. Full keyboard control.',
  },
  {
    icon: '\u25D1',
    title: 'Dark & Light',
    desc: 'Automatic theme detection. Respects system preferences.',
  },
  {
    icon: '\u2913',
    title: 'Export',
    desc: 'Export your nav map as a PNG image for docs and presentations.',
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'nav-map',
          description: 'Interactive navigation map visualization for Next.js apps and websites',
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Any',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          url: 'https://navmap.neonwatty.com',
          codeRepository: 'https://github.com/neonwatty/nav-map',
          sameAs: [
            'https://www.npmjs.com/package/@neonwatty/nav-map',
            'https://github.com/neonwatty/nav-map',
            'https://neonwatty.com',
          ],
        }}
      />

      <div className={styles.noiseOverlay} />

      {/* ═══ HERO ═══ */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroGlow2} />

        <div className={styles.heroBadge}>
          <span className={styles.dot} />
          Open Source &middot; MIT License
        </div>

        <h1 className={styles.heroTitle}>
          <span className={styles.gradient}>nav-map</span>
        </h1>

        <p className={styles.heroTagline}>
          Interactive navigation map visualization for Next.js apps and websites
        </p>

        <CopyInstall />

        <div className={styles.heroLinks}>
          <a className={styles.heroLink} href="https://github.com/neonwatty/nav-map">
            GitHub
          </a>
          <a className={styles.heroLink} href="https://www.npmjs.com/package/@neonwatty/nav-map">
            npm
          </a>
          <a className={styles.heroLink} href="#">
            Live Demo
          </a>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className={styles.section}>
        <ScrollReveal>
          <div className={styles.sectionLabel}>Features</div>
        </ScrollReveal>
        <ScrollReveal>
          <h2 className={styles.sectionTitle}>See your app from every angle</h2>
        </ScrollReveal>
        <ScrollReveal>
          <p className={styles.sectionSub}>
            Multiple visualization modes, interactive exploration, and deep navigation insights
          </p>
        </ScrollReveal>

        <div className={styles.features}>
          {FEATURES.map(f => (
            <ScrollReveal key={f.title}>
              <FeatureCard
                title={f.title}
                description={f.description}
                videoSrc={f.videoSrc}
                tag={f.tag}
                tagColor={f.tagColor}
              />
            </ScrollReveal>
          ))}
        </div>

        {/* ── Capabilities ── */}
        <div className={styles.capabilities}>
          {CAPABILITIES.map(c => (
            <ScrollReveal key={c.title}>
              <div className={styles.capability}>
                <div className={styles.capabilityIcon}>{c.icon}</div>
                <h4>{c.title}</h4>
                <p>{c.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ═══ QUICK START ═══ */}
      <section className={styles.codeSection}>
        <ScrollReveal>
          <div className={styles.sectionLabel}>Quick Start</div>
        </ScrollReveal>
        <ScrollReveal>
          <h2 className={styles.sectionTitleSmall}>Three lines to launch</h2>
        </ScrollReveal>
        <ScrollReveal>
          <p className={styles.sectionSub}>Drop-in React component. Works with any Next.js app.</p>
        </ScrollReveal>

        <ScrollReveal>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <div className={styles.codeDot} />
              <div className={styles.codeDot} />
              <div className={styles.codeDot} />
              <span>page.tsx</span>
            </div>
            <div className={styles.codeBody}>
              <span className={styles.kw}>import</span> {'{ '}
              <span className={styles.comp}>NavMap</span>
              {' }'} <span className={styles.kw}>from</span>{' '}
              <span className={styles.str}>&apos;@neonwatty/nav-map&apos;</span>;
              <br />
              <br />
              <span className={styles.cmt}>// Scan your app or provide JSON manually</span>
              <br />
              <span className={styles.kw}>const</span> graph ={' '}
              <span className={styles.kw}>await</span> fetch(
              <span className={styles.str}>&apos;/nav-map.json&apos;</span>
              ).then(r =&gt; r.json());
              <br />
              <br />
              <span className={styles.cmt}>// That&apos;s it</span>
              <br />
              &lt;<span className={styles.comp}>NavMap</span>{' '}
              <span className={styles.attr}>graph</span>={'{graph}'}{' '}
              <span className={styles.attr}>screenshotBasePath</span>=
              <span className={styles.str}>&quot;/screenshots&quot;</span> /&gt;
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className={styles.footer}>
        <p>
          <a href="https://github.com/neonwatty/nav-map">GitHub</a>
          {' \u00B7 '}
          <a href="https://www.npmjs.com/package/@neonwatty/nav-map">npm</a>
          {' \u00B7 '}
          MIT License
          {' \u00B7 '}
          Built by <a href="https://github.com/neonwatty">neonwatty</a>
        </p>
      </footer>
    </>
  );
}
