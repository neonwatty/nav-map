import { useRef, useState, useEffect, type ReactNode } from 'react';

interface ContainerWarningProps {
  children: ReactNode;
}

export function ContainerWarning({ children }: ContainerWarningProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasZeroHeight, setHasZeroHeight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setHasZeroHeight(entry.contentRect.height === 0);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'visible' }}
    >
      {hasZeroHeight && (
        <div
          data-navmap-warning
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            padding: '16px 20px',
            background: '#fff3cd',
            color: '#664d03',
            border: '1px solid #ffecb5',
            borderRadius: 8,
            fontFamily: 'system-ui, sans-serif',
            fontSize: 14,
            lineHeight: 1.5,
            overflow: 'visible',
          }}
        >
          <strong>NavMap:</strong> Container has no height. The parent element must have an explicit
          height (e.g. <code>height: 100vh</code>) for the graph to render.
        </div>
      )}
      {children}
    </div>
  );
}
