import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { scanRepo } from '../modes/repo.js';

export function createScanCommand(): Command {
  return new Command('scan')
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
}
