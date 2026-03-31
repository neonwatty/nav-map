import type { DocSection } from './docs';
import { PropsTable } from '../../components/PropsTable';
import { CodeBlock } from '../../components/CodeBlock';

const sectionStyles: Record<string, React.CSSProperties> = {
  heading: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    marginTop: 40,
    marginBottom: 12,
    color: 'var(--text-primary)',
  },
  content: {
    fontSize: 15,
    fontWeight: 300,
    lineHeight: 1.7,
    color: 'var(--text-secondary)',
    marginBottom: 8,
  },
};

export function renderSections(sections: DocSection[]) {
  return sections.map((section, i) => (
    <section key={i}>
      <h2 style={sectionStyles.heading}>{section.heading}</h2>
      {/* Content from our own static JSON at build time — safe to render */}
      <div
        style={sectionStyles.content}
        dangerouslySetInnerHTML={{ __html: markdownLite(section.content) }}
      />
      {section.propsTable && <PropsTable rows={section.propsTable} />}
      {section.codeExample && <CodeBlock code={section.codeExample} />}
    </section>
  ));
}

/** Minimal markdown conversion for inline formatting only. */
function markdownLite(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(
      /`([^`]+)`/g,
      '<code style="font-family:var(--font-mono);font-size:13px;background:var(--bg-elevated);padding:2px 6px;border-radius:4px">$1</code>'
    )
    .replace(/\n/g, '<br />');
}
