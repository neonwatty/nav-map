import fs from 'node:fs';
import path from 'node:path';
import type { ResolvedConfig } from '../config.js';
import { crawlUrl } from './crawl.js';
import type { CrawlDiagnostics, CrawlOptions } from './crawl.js';
import { autoLogin, closeBrowser } from './auto-auth.js';

export interface GenerateResult {
  outputPath: string;
  nodeCount: number;
  edgeCount: number;
  groupCount: number;
  diagnostics?: CrawlDiagnostics;
}

export interface GenerateOptions {
  headless?: boolean;
}

export function createCrawlOptions(
  config: ResolvedConfig,
  context?: import('playwright').BrowserContext
): CrawlOptions {
  return {
    startUrl: config.url,
    name: config.name,
    screenshotDir: config.screenshotDir,
    maxPages: config.maxPages,
    interactions: config.interactions,
    maxInteractionsPerPage: config.maxInteractionsPerPage,
    includeInteraction: config.includeInteraction,
    excludeInteraction: config.excludeInteraction,
    context,
  };
}

export async function runGenerate(
  config: ResolvedConfig,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const { headless = true } = options;
  let context: import('playwright').BrowserContext | undefined;

  try {
    // Step 1: Auto-login if auth is configured
    if (config.auth) {
      console.log(`Logging in to ${config.auth.loginUrl}...`);
      context = await autoLogin({
        loginUrl: config.auth.loginUrl,
        email: config.auth.email,
        password: config.auth.password,
        selectors: config.auth.selectors,
        headless,
      });
      console.log('Login successful.\n');
    }

    // Step 2: Crawl
    console.log(`Crawling ${config.url}...`);
    const graph = await crawlUrl(createCrawlOptions(config, context));

    // Step 3: Write output
    const outputPath = path.resolve(config.output);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));

    return {
      outputPath,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      groupCount: graph.groups.length,
      diagnostics: graph.meta.diagnostics,
    };
  } finally {
    if (context) {
      await closeBrowser(context);
    }
  }
}
