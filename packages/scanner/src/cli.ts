import { Command } from 'commander';
import { scanRepo } from './modes/repo.js';
import { crawlUrl } from './modes/crawl.js';
import { runAuth } from './modes/auth.js';
import { recordTests } from './modes/record.js';
import { recordFlows } from './modes/record-flows.js';
import { loadConfig, validateConfig, applyDefaults } from './config.js';
import { runGenerate } from './modes/generate.js';
import { startServer } from './modes/serve.js';
import path from 'node:path';
import fs from 'node:fs';

const program = new Command();

program
  .name('nav-map')
  .description('Generate nav-map.json from a Next.js app or URL')
  .version('0.1.0');

program
  .command('scan')
  .description('Scan a Next.js project directory to generate a navigation map')
  .argument('<dir>', 'Path to the Next.js project root')
  .option('-o, --output <path>', 'Output file path', 'nav-map.json')
  .option('-s, --screenshots', 'Capture screenshots of each page', false)
  .option('--base-url <url>', 'Base URL for screenshots (e.g. http://localhost:3000)')
  .option('--screenshot-dir <dir>', 'Directory for screenshots', 'nav-screenshots')
  .option('-n, --name <name>', 'Project name for the graph')
  .option('--no-shared-nav', 'Skip shared nav detection')
  .action(async (dir: string, opts) => {
    const projectDir = path.resolve(dir);

    if (!fs.existsSync(projectDir)) {
      console.error(`Error: Directory not found: ${projectDir}`);
      process.exit(1);
    }

    console.log(`Scanning ${projectDir}...`);

    try {
      const graph = await scanRepo({
        projectDir,
        name: opts.name,
        screenshots: opts.screenshots,
        baseUrl: opts.baseUrl,
        screenshotDir: opts.screenshotDir,
        detectSharedNav: opts.sharedNav !== false,
      });

      const outputPath = path.resolve(opts.output);
      fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
      console.log(`\nWrote ${outputPath}`);
      console.log(`  Nodes: ${graph.nodes.length}`);
      console.log(`  Edges: ${graph.edges.length}`);
      console.log(`  Groups: ${graph.groups.length}`);
    } catch (err) {
      console.error('Scan failed:', err);
      process.exit(1);
    }
  });

program
  .command('crawl')
  .description('Crawl a live URL to generate a navigation map')
  .argument('<url>', 'Starting URL to crawl')
  .option('-o, --output <path>', 'Output file path', 'nav-map.json')
  .option('--screenshot-dir <dir>', 'Directory for screenshots', 'nav-screenshots')
  .option('-n, --name <name>', 'Project name for the graph')
  .option('--max-pages <n>', 'Maximum number of pages to crawl', '50')
  .action(async (url: string, opts) => {
    console.log(`Crawling ${url}...`);

    try {
      const graph = await crawlUrl({
        startUrl: url,
        name: opts.name,
        screenshotDir: opts.screenshotDir,
        maxPages: parseInt(opts.maxPages, 10),
      });

      const outputPath = path.resolve(opts.output);
      fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
      console.log(`\nWrote ${outputPath}`);
      console.log(`  Nodes: ${graph.nodes.length}`);
      console.log(`  Edges: ${graph.edges.length}`);
      console.log(`  Groups: ${graph.groups.length}`);
    } catch (err) {
      console.error('Crawl failed:', err);
      process.exit(1);
    }
  });

program
  .command('auth')
  .description('Log in to a website interactively and save auth state')
  .argument('<url>', 'URL to open for login')
  .option('-o, --output <path>', 'Output file for auth state', 'auth.json')
  .action(async (url: string, opts) => {
    try {
      await runAuth({ url, output: opts.output });
    } catch (err) {
      console.error('Auth failed:', err);
      process.exit(1);
    }
  });

program
  .command('record')
  .description('Record navigation from E2E test runs against a live app')
  .option('--playwright-config <path>', 'Path to Playwright config file', 'playwright.config.ts')
  .option('--storage-state <path>', 'Path to auth storage state file')
  .option('--routes <path>', 'Path to routes.json from a prior nav-map scan')
  .option('--screenshot-dir <dir>', 'Directory for screenshots', 'nav-screenshots')
  .option('-o, --output <path>', 'Output file path', 'nav-map.json')
  .option('-n, --name <name>', 'Project name for the graph')
  .action(async opts => {
    console.log('Recording navigation from E2E tests...\n');

    try {
      const graph = await recordTests({
        playwrightConfig: opts.playwrightConfig,
        storageState: opts.storageState,
        routesJson: opts.routes,
        screenshotDir: opts.screenshotDir,
        output: opts.output,
        name: opts.name,
      });

      const outputPath = path.resolve(opts.output);
      fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
      console.log(`\nWrote ${outputPath}`);
      console.log(`  Nodes: ${graph.nodes.length}`);
      console.log(`  Edges: ${graph.edges.length}`);
      console.log(`  Groups: ${graph.groups.length}`);
      console.log(`  Flows: ${graph.flows?.length ?? 0}`);
    } catch (err) {
      console.error('Record failed:', err);
      process.exit(1);
    }
  });

program
  .command('record-flows')
  .description('Run Playwright tests from a flows directory and record navigation with screenshots')
  .requiredOption('--flows-dir <dir>', 'Directory containing Playwright .spec.ts test files')
  .requiredOption('--base-url <url>', 'Base URL for the app under test')
  .option('--storage-state <path>', 'Path to auth storage state file')
  .option('--routes <path>', 'Path to existing nav-map.json to merge with')
  .option('--screenshot-dir <dir>', 'Directory for screenshots', 'nav-screenshots')
  .option('-o, --output <path>', 'Output file path', 'nav-map.json')
  .option('-n, --name <name>', 'Project name for the graph')
  .option('--fail-on-test-errors', 'Exit non-zero if any tests fail')
  .action(async opts => {
    console.log('Recording flows from Playwright tests...\n');
    try {
      const graph = await recordFlows({
        flowsDir: opts.flowsDir,
        baseUrl: opts.baseUrl,
        storageState: opts.storageState,
        routesJson: opts.routes,
        screenshotDir: opts.screenshotDir,
        output: opts.output,
        name: opts.name,
        failOnTestErrors: opts.failOnTestErrors,
      });

      const outputPath = path.resolve(opts.output);
      fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
      console.log(`\nWrote ${outputPath}`);
      console.log(`  Nodes: ${graph.nodes.length}`);
      console.log(`  Edges: ${graph.edges.length}`);
      console.log(`  Groups: ${graph.groups.length}`);
      console.log(`  Flows: ${graph.flows?.length ?? 0}`);
    } catch (err) {
      console.error('Record-flows failed:', err);
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('Load nav-map.config.json, auto-login if configured, crawl, and output nav-map.json')
  .option('-c, --config <path>', 'Path to config file', 'nav-map.config.json')
  .option('--headed', 'Run browser in headed mode (useful for debugging login)')
  .action(async opts => {
    try {
      const raw = loadConfig(opts.config);
      const errors = validateConfig(raw);
      if (errors.length > 0) {
        console.error('Config validation errors:');
        for (const err of errors) {
          console.error(`  - ${err}`);
        }
        process.exit(1);
      }

      const config = applyDefaults(raw);
      const result = await runGenerate(config, { headless: !opts.headed });

      console.log(`\nWrote ${result.outputPath}`);
      console.log(`  Nodes: ${result.nodeCount}`);
      console.log(`  Edges: ${result.edgeCount}`);
      console.log(`  Groups: ${result.groupCount}`);
    } catch (err) {
      console.error('Generate failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('serve')
  .description('Start a local viewer for a nav-map.json file')
  .argument('[file]', 'Path to nav-map.json', 'nav-map.json')
  .option('-p, --port <port>', 'Port number', '3333')
  .option('--screenshot-dir <dir>', 'Directory containing screenshots')
  .action((file: string, opts) => {
    try {
      startServer({
        jsonPath: file,
        screenshotDir: opts.screenshotDir,
        port: parseInt(opts.port, 10),
      });
    } catch (err) {
      console.error('Serve failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
