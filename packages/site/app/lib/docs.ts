import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src/data/docs');

export interface DocPageData {
  slug: string;
  title: string;
  description: string;
  sections: DocSection[];
  keywords: string[];
}

export interface DocSection {
  heading: string;
  content: string;
  codeExample?: string;
  propsTable?: PropRow[];
}

export interface PropRow {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
}

export function getDocData(slug: string): DocPageData | null {
  const filePath = path.join(DATA_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function getAllDocMeta(): { slug: string; title: string }[] {
  return collectJsonFiles(DATA_DIR, '');
}

function collectJsonFiles(dir: string, prefix: string): { slug: string; title: string }[] {
  const results: { slug: string; title: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      results.push(...collectJsonFiles(path.join(dir, entry.name), `${prefix}${entry.name}/`));
    } else if (entry.name.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(path.join(dir, entry.name), 'utf-8'));
      results.push({ slug: data.slug, title: data.title });
    }
  }
  return results;
}
