import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NavMap | Workflow atlas for agents',
  metadataBase: new URL('https://nav-map.neonwatty.com'),
  alternates: { canonical: '/' },
  description:
    'A React workflow atlas for reviewing routes, screenshots, mockups, and live targets.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{children}</body>
    </html>
  );
}
