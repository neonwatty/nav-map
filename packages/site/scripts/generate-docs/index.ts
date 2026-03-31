import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { writeDocPage } from './types.js';
import { generateComponentApi } from './component-api.js';
import { generateCliPages } from './cli-pages.js';
import { generateViewModePages } from './view-pages.js';
import {
  generateGettingStarted,
  generateKeyboardShortcuts,
  generateAnalytics,
} from './static-pages.js';

const __dirname = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../..');
const OUT_DIR = path.resolve(__dirname, '../../src/data/docs');

function main() {
  console.log('Generating docs...');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pages = [
    generateGettingStarted(),
    generateComponentApi(ROOT),
    ...generateCliPages(),
    generateKeyboardShortcuts(),
    ...generateViewModePages(),
    generateAnalytics(),
  ];

  for (const page of pages) {
    writeDocPage(OUT_DIR, page);
  }

  console.log(`\nGenerated ${pages.length} doc pages.`);
}

main();
