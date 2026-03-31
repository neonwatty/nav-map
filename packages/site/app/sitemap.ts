import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://navmap.neonwatty.com';
  return [{ url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 }];
}
