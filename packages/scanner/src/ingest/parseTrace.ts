import AdmZip from 'adm-zip';

export interface TraceAction {
  method: string;
  params: Record<string, unknown>;
  timestamp: number;
  route?: string;
}

export interface TraceScreenshot {
  sha1: string;
  timestamp: number;
  width: number;
  height: number;
}

export interface TraceResult {
  routes: string[];
  actions: TraceAction[];
  screenshots: TraceScreenshot[];
  resourceBuffers: Map<string, Buffer>;
}

interface TraceEvent {
  type: string;
  callId?: string;
  startTime?: number;
  endTime?: number;
  class?: string;
  method?: string;
  params?: Record<string, unknown>;
  pageId?: string;
  sha1?: string;
  width?: number;
  height?: number;
  timestamp?: number;
}

function stripBaseUrl(url: string, baseUrl: string): string {
  if (!baseUrl) return url;
  if (url.startsWith(baseUrl)) {
    const path = url.slice(baseUrl.length);
    return path.startsWith('/') ? path : `/${path}`;
  }
  return url;
}

export function parseTrace(traceBuffer: Buffer, baseUrl: string): TraceResult {
  const zip = new AdmZip(traceBuffer);
  const traceEntry = zip.getEntry('0-trace.trace');

  if (!traceEntry) {
    const entries = zip.getEntries().map(e => e.entryName);
    console.warn(`parseTrace: 0-trace.trace not found in ZIP. Entries: ${entries.join(', ')}`);
    return { routes: [], actions: [], screenshots: [], resourceBuffers: new Map() };
  }

  const content = traceEntry.getData().toString('utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  const routes: string[] = [];
  const actions: TraceAction[] = [];
  const screenshots: TraceScreenshot[] = [];
  let currentRoute: string | undefined;

  for (const line of lines) {
    let event: TraceEvent;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    if (event.type === 'before' && event.method === 'goto' && event.params?.url) {
      const route = stripBaseUrl(event.params.url as string, baseUrl);
      routes.push(route);
      currentRoute = route;
      actions.push({
        method: 'goto',
        params: { url: event.params.url },
        timestamp: event.startTime ?? 0,
        route,
      });
    } else if (event.type === 'before' && event.method && event.method !== 'goto') {
      actions.push({
        method: event.method,
        params: event.params ?? {},
        timestamp: event.startTime ?? 0,
        route: currentRoute,
      });
    } else if (event.type === 'screencast-frame' && event.sha1) {
      screenshots.push({
        sha1: event.sha1 ?? '',
        timestamp: event.timestamp ?? 0,
        width: event.width ?? 0,
        height: event.height ?? 0,
      });
    }
  }

  const resourceBuffers = new Map<string, Buffer>();
  for (const s of screenshots) {
    const entry = zip.getEntry(`resources/${s.sha1}`);
    if (entry) {
      resourceBuffers.set(s.sha1, entry.getData());
    }
  }

  return { routes, actions, screenshots, resourceBuffers };
}
