import * as fs from 'fs';
import * as path from 'path';

const GALLERY_DIR = path.join(process.cwd(), 'public/gallery');

export interface GalleryEntry {
  appName: string;
  appSlug: string;
  description: string;
  githubUrl: string;
  liveUrl?: string;
  framework: string;
  stats: { routes: number; edges: number; groups: number };
}

export interface GalleryData extends GalleryEntry {
  graph: Record<string, unknown>;
}

/** Return metadata for every gallery entry (without the heavy graph payload). */
export function getGalleryEntries(): GalleryEntry[] {
  if (!fs.existsSync(GALLERY_DIR)) return [];

  const entries: GalleryEntry[] = [];
  for (const d of fs.readdirSync(GALLERY_DIR, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const dataPath = path.join(GALLERY_DIR, d.name, 'data.json');
    if (!fs.existsSync(dataPath)) continue;
    const raw = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    entries.push({
      appName: raw.appName,
      appSlug: raw.appSlug,
      description: raw.description,
      githubUrl: raw.githubUrl,
      liveUrl: raw.liveUrl,
      framework: raw.framework,
      stats: raw.stats,
    });
  }
  return entries;
}

/** Load full gallery data (including graph) for a single slug. */
export function getGalleryData(slug: string): GalleryData | null {
  const dataPath = path.join(GALLERY_DIR, slug, 'data.json');
  if (!fs.existsSync(dataPath)) return null;
  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  return {
    appName: raw.appName,
    appSlug: raw.appSlug,
    description: raw.description,
    githubUrl: raw.githubUrl,
    liveUrl: raw.liveUrl,
    framework: raw.framework,
    stats: raw.stats,
    graph: raw.graph,
  };
}

/** Return all gallery slugs (used by generateStaticParams). */
export function getAllGallerySlugs(): string[] {
  if (!fs.existsSync(GALLERY_DIR)) return [];

  return fs
    .readdirSync(GALLERY_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => fs.existsSync(path.join(GALLERY_DIR, d.name, 'data.json')))
    .map(d => d.name);
}
