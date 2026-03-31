import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';

export const metadata: Metadata = {
  metadataBase: new URL('https://navmap.neonwatty.com'),
  title: {
    default: 'nav-map — Interactive Navigation Map Visualization',
    template: '%s | nav-map',
  },
  description:
    "Visualize your Next.js app's navigation architecture with interactive graphs, flow animations, and group focus modes.",
  openGraph: {
    type: 'website',
    siteName: 'nav-map',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://navmap.neonwatty.com' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
