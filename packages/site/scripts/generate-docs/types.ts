import * as fs from 'fs';
import * as path from 'path';

export interface DocPage {
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

/**
 * Write a DocPage to a JSON file under `outDir`.
 * Slugs like "cli/scan" produce nested dirs: outDir/cli/scan.json
 */
export function writeDocPage(outDir: string, page: DocPage) {
  const filePath = path.join(outDir, `${page.slug}.json`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(page, null, 2));
  console.log(`  Generated: ${page.slug}.json`);
}
