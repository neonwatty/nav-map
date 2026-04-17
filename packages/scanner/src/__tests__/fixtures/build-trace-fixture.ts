import AdmZip from 'adm-zip';

export function buildTraceFixture(options: {
  navigations: Array<{ url: string; timestamp: number }>;
  actions?: Array<{ method: string; params?: Record<string, unknown>; timestamp: number }>;
}): Buffer {
  const zip = new AdmZip();
  const lines: string[] = [];

  lines.push(
    JSON.stringify({
      type: 'context-options',
      version: 8,
      origin: 'library',
      browserName: 'chromium',
      wallTime: Date.now(),
      monotonicTime: 0,
    })
  );

  let callIdx = 0;

  for (const nav of options.navigations) {
    const callId = `call@${callIdx++}`;
    lines.push(
      JSON.stringify({
        type: 'before',
        callId,
        startTime: nav.timestamp,
        class: 'Frame',
        method: 'goto',
        params: { url: nav.url },
        pageId: 'page@1',
      })
    );
    lines.push(JSON.stringify({ type: 'after', callId, endTime: nav.timestamp + 500 }));
    const screenshotName = `page@1-${nav.timestamp + 600}.jpeg`;
    lines.push(
      JSON.stringify({
        type: 'screencast-frame',
        pageId: 'page@1',
        sha1: screenshotName,
        width: 1280,
        height: 800,
        timestamp: nav.timestamp + 600,
      })
    );
    zip.addFile(`resources/${screenshotName}`, Buffer.from('fake-jpeg'));
  }

  for (const action of options.actions ?? []) {
    const callId = `call@${callIdx++}`;
    lines.push(
      JSON.stringify({
        type: 'before',
        callId,
        startTime: action.timestamp,
        class: 'Locator',
        method: action.method,
        params: action.params ?? {},
        pageId: 'page@1',
      })
    );
    lines.push(JSON.stringify({ type: 'after', callId, endTime: action.timestamp + 100 }));
  }

  zip.addFile('0-trace.trace', Buffer.from(lines.join('\n') + '\n'));
  return zip.toBuffer();
}
