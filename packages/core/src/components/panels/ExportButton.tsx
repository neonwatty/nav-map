import { useState, useRef, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useNavMapContext } from '../../hooks/useNavMap';

interface ExportButtonProps {
  graphName?: string;
}

export function ExportButton({ graphName = 'nav-map' }: ExportButtonProps) {
  const { isDark } = useNavMapContext();
  const { getNodes } = useReactFlow();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const exportSVG = async () => {
    setIsExporting(true);
    try {
      const rfContainer = document.querySelector('.react-flow__viewport');
      if (!rfContainer) return;

      const svgNS = 'http://www.w3.org/2000/svg';
      const allNodes = getNodes();

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const node of allNodes) {
        const w = node.measured?.width ?? 180;
        const h = node.measured?.height ?? 140;
        let nx = node.position.x,
          ny = node.position.y;
        if (node.parentId) {
          const parent = allNodes.find(n => n.id === node.parentId);
          if (parent) {
            nx += parent.position.x;
            ny += parent.position.y;
          }
        }
        minX = Math.min(minX, nx);
        minY = Math.min(minY, ny);
        maxX = Math.max(maxX, nx + w);
        maxY = Math.max(maxY, ny + h);
      }

      const padding = 40;
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;

      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('xmlns', svgNS);
      svg.setAttribute('width', String(width));
      svg.setAttribute('height', String(height));
      svg.setAttribute('viewBox', `${minX - padding} ${minY - padding} ${width} ${height}`);

      const bg = document.createElementNS(svgNS, 'rect');
      bg.setAttribute('width', '100%');
      bg.setAttribute('height', '100%');
      bg.setAttribute('fill', isDark ? '#0a0a0f' : '#f4f5f8');
      svg.appendChild(bg);

      const edgeSvg = rfContainer.querySelector('.react-flow__edges');
      if (edgeSvg) svg.appendChild(edgeSvg.cloneNode(true) as SVGElement);

      const nodesContainer = rfContainer.querySelector('.react-flow__nodes');
      if (nodesContainer) {
        const fo = document.createElementNS(svgNS, 'foreignObject');
        fo.setAttribute('x', String(minX - padding));
        fo.setAttribute('y', String(minY - padding));
        fo.setAttribute('width', String(width));
        fo.setAttribute('height', String(height));
        fo.appendChild(nodesContainer.cloneNode(true) as HTMLElement);
        svg.appendChild(fo);
      }

      const serializer = new XMLSerializer();
      const blob = new Blob([serializer.serializeToString(svg)], { type: 'image/svg+xml' });
      downloadBlob(blob, `${graphName}.svg`);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const exportPNG = async () => {
    setIsExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const rfElement = document.querySelector('.react-flow') as HTMLElement;
      if (!rfElement) return;

      const canvas = await html2canvas(rfElement, {
        backgroundColor: isDark ? '#0a0a0f' : '#f4f5f8',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      canvas.toBlob(blob => {
        if (blob) downloadBlob(blob, `${graphName}.png`);
      }, 'image/png');
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        disabled={isExporting}
        style={{
          background: isDark ? '#14141e' : '#fff',
          border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
          borderRadius: 6,
          padding: '5px 12px',
          fontSize: 12,
          color: isDark ? '#888' : '#666',
          cursor: isExporting ? 'wait' : 'pointer',
          opacity: isExporting ? 0.6 : 1,
        }}
      >
        {isExporting ? 'Exporting...' : 'Export'}
      </button>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: isDark ? '#14141e' : '#fff',
            border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
            borderRadius: 8,
            padding: 4,
            zIndex: 30,
            minWidth: 140,
            boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.1)',
          }}
        >
          <button onClick={exportSVG} style={dropdownItemStyle(isDark)}>
            Export as SVG
          </button>
          <button onClick={exportPNG} style={dropdownItemStyle(isDark)}>
            Export as PNG (2x)
          </button>
        </div>
      )}
    </div>
  );
}

function dropdownItemStyle(isDark: boolean): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    background: 'none',
    border: 'none',
    borderRadius: 4,
    padding: '8px 12px',
    fontSize: 12,
    color: isDark ? '#c8c8d0' : '#333',
    cursor: 'pointer',
    textAlign: 'left',
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
