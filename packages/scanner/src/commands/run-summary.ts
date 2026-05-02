interface GraphSummaryInput {
  nodes: unknown[];
  edges: unknown[];
  groups: unknown[];
  flows?: unknown[];
  meta?: Record<string, unknown> & {
    diagnostics?: {
      crawl?: {
        attemptedPages: number;
        successfulPages: number;
        failedPages: unknown[];
        screenshotFailures: unknown[];
        maxPagesReached: boolean;
      };
    };
  };
}

export interface IngestSummaryInput {
  outputPath: string;
  testCount: number;
  routesCovered: number;
  routesUncovered: number;
}

export function formatGraphRunSummary(outputPath: string, graph: GraphSummaryInput): string {
  const lines = [
    '',
    `Wrote ${outputPath}`,
    'Summary:',
    `  Routes: ${graph.nodes.length}`,
    `  Edges: ${graph.edges.length}`,
    `  Groups: ${graph.groups.length}`,
  ];

  if (graph.flows) lines.push(`  Flows: ${graph.flows.length}`);

  const crawl = graph.meta?.diagnostics?.crawl;
  if (crawl) {
    lines.push(`  Pages attempted: ${crawl.attemptedPages}`);
    lines.push(`  Pages succeeded: ${crawl.successfulPages}`);
    lines.push(`  Page failures: ${crawl.failedPages.length}`);
    lines.push(`  Screenshot failures: ${crawl.screenshotFailures.length}`);
    if (crawl.maxPagesReached) lines.push('  Limit reached: yes');
  }

  return lines.join('\n');
}

export function formatIngestRunSummary(result: IngestSummaryInput): string {
  return [
    '',
    `Wrote ${result.outputPath}`,
    'Summary:',
    `  Tests processed: ${result.testCount}`,
    `  Routes covered: ${result.routesCovered}`,
    `  Routes uncovered: ${result.routesUncovered}`,
  ].join('\n');
}
