import type { DocPage, DocSection, PropRow } from './types.js';

interface CliCommand {
  name: string;
  slug: string;
  description: string;
  usage: string;
  args?: { name: string; description: string; required: boolean }[];
  options: PropRow[];
  keywords: string[];
}

const CLI_COMMANDS: CliCommand[] = [
  {
    name: 'scan',
    slug: 'cli/scan',
    description:
      'Scan a Next.js project directory to generate a navigation map with page nodes, edges, and groups.',
    usage: 'npx @neonwatty/nav-map-scanner scan <dir>',
    args: [{ name: 'dir', description: 'Path to the Next.js project root', required: true }],
    options: [
      opt('-o, --output', 'string', 'Output file path', 'nav-map.json'),
      opt('-s, --screenshots', 'boolean', 'Capture screenshots of each page', 'false'),
      opt('--base-url', 'string', 'Base URL for screenshots (e.g. http://localhost:3000)'),
      opt('--screenshot-dir', 'string', 'Directory for screenshots', 'nav-screenshots'),
      opt('-n, --name', 'string', 'Project name for the graph'),
      opt('--no-shared-nav', 'boolean', 'Skip shared nav detection'),
    ],
    keywords: ['scan directory', 'generate nav map', 'Next.js scanner', 'repo scan'],
  },
  {
    name: 'crawl',
    slug: 'cli/crawl',
    description:
      'Crawl a live website by URL and generate a navigation map by visiting pages with a headless browser.',
    usage: 'npx @neonwatty/nav-map-scanner crawl <url>',
    args: [{ name: 'url', description: 'The URL to start crawling from', required: true }],
    options: [
      opt('-o, --output', 'string', 'Output file path', 'nav-map.json'),
      opt('--screenshot-dir', 'string', 'Directory for screenshots', 'nav-screenshots'),
      opt('-n, --name', 'string', 'Project name for the graph'),
      opt('--max-pages', 'number', 'Maximum pages to crawl', '50'),
    ],
    keywords: ['crawl website', 'URL crawler', 'headless browser', 'site crawl'],
  },
  {
    name: 'record',
    slug: 'cli/record',
    description:
      'Record user navigation flows using Playwright, capturing page transitions and screenshots.',
    usage: 'npx @neonwatty/nav-map-scanner record',
    options: [
      opt(
        '--playwright-config',
        'string',
        'Path to Playwright config file',
        'playwright.config.ts'
      ),
      opt('--storage-state', 'string', 'Path to Playwright storage state for auth'),
      opt('--routes', 'string', 'Comma-separated routes to record'),
      opt('--screenshot-dir', 'string', 'Directory for screenshots', 'nav-screenshots'),
      opt('-o, --output', 'string', 'Output file path', 'nav-map.json'),
      opt('-n, --name', 'string', 'Project name for the graph'),
    ],
    keywords: ['record flows', 'Playwright recording', 'e2e navigation', 'user flow capture'],
  },
  {
    name: 'record-flows',
    slug: 'cli/record-flows',
    description:
      'Run pre-defined flow scripts from a directory and record navigation transitions with screenshots.',
    usage: 'npx @neonwatty/nav-map-scanner record-flows --flows-dir <dir> --base-url <url>',
    options: [
      opt('--flows-dir', 'string', 'Directory containing flow scripts', undefined, true),
      opt('--base-url', 'string', 'Base URL of the running application', undefined, true),
      opt('--storage-state', 'string', 'Path to Playwright storage state for auth'),
      opt('--routes', 'string', 'Comma-separated routes to include'),
      opt('--screenshot-dir', 'string', 'Directory for screenshots', 'nav-screenshots'),
      opt('-o, --output', 'string', 'Output file path', 'nav-map.json'),
      opt('-n, --name', 'string', 'Project name for the graph'),
      opt('--fail-on-test-errors', 'boolean', 'Exit with error code if any flow script fails'),
    ],
    keywords: ['flow scripts', 'automated flows', 'record-flows', 'test navigation'],
  },
  {
    name: 'generate',
    slug: 'cli/generate',
    description:
      'Generate a nav-map.json from a configuration file (nav-map.config.json) that defines scan + crawl + record steps.',
    usage: 'npx @neonwatty/nav-map-scanner generate',
    options: [
      opt('-c, --config', 'string', 'Path to the config file', 'nav-map.config.json'),
      opt('--headed', 'boolean', 'Run browsers in headed mode for debugging'),
    ],
    keywords: ['generate config', 'config-driven', 'nav-map.config.json', 'local-first'],
  },
  {
    name: 'serve',
    slug: 'cli/serve',
    description:
      'Start a local dev server to preview a nav-map.json file in the browser with the NavMap component.',
    usage: 'npx @neonwatty/nav-map-scanner serve [file]',
    args: [{ name: 'file', description: 'Path to nav-map.json file', required: false }],
    options: [
      opt('-p, --port', 'number', 'Port to serve on', '3333'),
      opt('--screenshot-dir', 'string', 'Directory containing screenshots', 'nav-screenshots'),
    ],
    keywords: ['serve preview', 'local dev server', 'preview nav map', 'dev server'],
  },
  {
    name: 'auth',
    slug: 'cli/auth',
    description:
      'Launch a headed browser to log in and save authentication state for use with record and crawl commands.',
    usage: 'npx @neonwatty/nav-map-scanner auth <url>',
    args: [{ name: 'url', description: 'Login page URL', required: true }],
    options: [opt('-o, --output', 'string', 'Output path for auth state JSON', 'auth.json')],
    keywords: ['authentication', 'login state', 'storage state', 'browser auth'],
  },
];

/** Helper to build a PropRow for a CLI option. */
function opt(
  name: string,
  type: string,
  description: string,
  defaultVal?: string,
  required = false
): PropRow {
  return { name, type, required, default: defaultVal, description };
}

/** Build a single doc page for one CLI command. */
function buildCliPage(cmd: CliCommand): DocPage {
  const sections: DocSection[] = [
    {
      heading: 'Usage',
      content: `\`\`\`bash\n${cmd.usage}\n\`\`\``,
    },
  ];

  if (cmd.args && cmd.args.length > 0) {
    sections.push({
      heading: 'Arguments',
      content: cmd.args
        .map(a => `- **${a.name}** ${a.required ? '(required)' : '(optional)'} — ${a.description}`)
        .join('\n'),
    });
  }

  sections.push({
    heading: 'Options',
    content: `All available options for the \`${cmd.name}\` command.`,
    propsTable: cmd.options,
  });

  return {
    slug: cmd.slug,
    title: `CLI: ${cmd.name}`,
    description: cmd.description,
    keywords: cmd.keywords,
    sections,
  };
}

/** Generate doc pages for all 7 CLI commands. */
export function generateCliPages(): DocPage[] {
  return CLI_COMMANDS.map(buildCliPage);
}
