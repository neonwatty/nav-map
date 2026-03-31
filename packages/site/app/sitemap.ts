import type { MetadataRoute } from 'next';
import { getAllDocMeta } from '@/lib/docs';
import { getAllGallerySlugs } from '@/lib/gallery';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://navmap.neonwatty.com';
  const now = new Date();

  const docPages = getAllDocMeta().map(doc => ({
    url: `${baseUrl}/docs/${doc.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const galleryPages = getAllGallerySlugs().map(slug => ({
    url: `${baseUrl}/gallery/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...docPages,
    { url: `${baseUrl}/gallery`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...galleryPages,
  ];
}
