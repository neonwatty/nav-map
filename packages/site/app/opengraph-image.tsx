import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'nav-map — Interactive Navigation Map Visualization';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        background: '#06060c',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: 72, fontWeight: 800, color: '#e0e0ec' }}>nav-map</div>
      <div
        style={{
          fontSize: 28,
          color: '#8888a8',
          marginTop: 16,
          maxWidth: 700,
          textAlign: 'center',
        }}
      >
        Interactive navigation map visualization for Next.js apps
      </div>
    </div>,
    { ...size }
  );
}
