import fs from 'node:fs';
import { isLoginPage, normalizeRoute, type PageRecord, type RoutePattern } from './dedup.js';
import { parseTrace } from './trace-parser.js';
import type { AggregatedTraceNavigations, TraceEntry } from './record-types.js';

export async function aggregateTraceNavigations(
  traces: TraceEntry[],
  routePatterns?: RoutePattern[]
): Promise<AggregatedTraceNavigations> {
  const pages = new Map<string, PageRecord>();
  const edgeSet = new Map<string, { source: string; target: string; visitCount: number }>();
  const flows: { name: string; steps: string[] }[] = [];
  let baseUrl: string | undefined;

  for (const trace of traces) {
    if (!fs.existsSync(trace.tracePath)) {
      console.warn(`  Trace not found: ${trace.tracePath}`);
      continue;
    }

    console.log(`  Parsing: ${trace.testName} (${trace.tracePath})`);

    const { navigations } = await parseTrace(trace.tracePath);
    const events = navigations.map(n => ({ url: n.url, timestamp: n.timestamp }));
    if (events.length === 0) continue;

    if (!baseUrl && events.length > 0) {
      try {
        const u = new URL(events[0].url);
        baseUrl = `${u.protocol}//${u.host}`;
      } catch {
        /* ignore */
      }
    }

    const flowSteps: string[] = [];
    let prevNodeId: string | null = null;

    for (const event of events) {
      let pathname: string;
      try {
        if (event.url.startsWith('/')) {
          pathname = event.url.split('?')[0].split('#')[0];
        } else {
          pathname = new URL(event.url).pathname;
        }
      } catch {
        continue;
      }

      if (isLoginPage(event.url)) continue;

      const normalized = normalizeRoute(pathname, routePatterns);
      if (!normalized) continue;

      if (!pages.has(normalized.id)) {
        pages.set(normalized.id, {
          id: normalized.id,
          route: normalized.route,
          label: normalized.label,
          group: normalized.group,
        });
      }

      if (prevNodeId && prevNodeId !== normalized.id) {
        const edgeKey = `${prevNodeId}->${normalized.id}`;
        const existing = edgeSet.get(edgeKey);
        if (existing) {
          existing.visitCount++;
        } else {
          edgeSet.set(edgeKey, {
            source: prevNodeId,
            target: normalized.id,
            visitCount: 1,
          });
        }
      }

      if (flowSteps[flowSteps.length - 1] !== normalized.id) {
        flowSteps.push(normalized.id);
      }

      prevNodeId = normalized.id;
    }

    if (flowSteps.length >= 1) {
      flows.push({ name: trace.testName, steps: flowSteps });
    }
  }

  return { pages, edgeSet, flows, baseUrl };
}
