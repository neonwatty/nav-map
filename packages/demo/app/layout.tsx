import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NavMap Demo',
  description: 'Interactive navigation map demo',
  metadataBase: new URL('https://nav-map.neonwatty.com'),
  openGraph: {
    title: 'Nav Map — See how your app fits together',
    description: 'Explore application routes, flows, and user journeys.',
    type: 'website',
    url: 'https://nav-map.neonwatty.com/',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Nav Map — connected application routes and user journeys',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nav Map — See how your app fits together',
    images: [
      { url: '/og-image.png', alt: 'Nav Map — connected application routes and user journeys' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <nav className="project-navigation" aria-label="Project navigation">
          <span>Nav Map</span>
          <a href="https://neonwatty.com/projects/">All projects</a>
          <a href="https://neonwatty.com/posts/">Blog</a>
        </nav>
        <div className="demo-content">{children}</div>
      </body>
    </html>
  );
}
