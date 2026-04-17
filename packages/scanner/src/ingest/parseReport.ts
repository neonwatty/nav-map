import { createHash } from 'node:crypto';
import type { TestStatus } from '@neonwatty/nav-map';

export interface TestRunMeta {
  id: string;
  name: string;
  specFile: string;
  status: TestStatus;
  duration: number;
  startTime: string;
  tracePath: string | null;
}

interface ReportSpec {
  title: string;
  file: string;
  tests?: Array<{
    status: string;
    results?: Array<{
      status: string;
      duration: number;
      startTime: string;
      attachments?: Array<{
        name: string;
        contentType: string;
        path?: string;
      }>;
    }>;
  }>;
}

interface ReportSuite {
  title: string;
  file: string;
  specs?: ReportSpec[];
  suites?: ReportSuite[];
}

function makeId(specFile: string, name: string): string {
  return createHash('sha256').update(`${specFile}::${name}`).digest('hex').slice(0, 12);
}

function normalizeStatus(resultStatus: string): TestStatus {
  if (resultStatus === 'passed') return 'passed';
  if (resultStatus === 'skipped') return 'skipped';
  return 'failed';
}

function extractFromSuite(suite: ReportSuite): TestRunMeta[] {
  const runs: TestRunMeta[] = [];

  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const result = test.results?.[0];
      if (!result) continue;

      const traceAttachment = result.attachments?.find(
        a => a.name === 'trace' && a.contentType === 'application/zip'
      );

      runs.push({
        id: makeId(spec.file, spec.title),
        name: spec.title,
        specFile: spec.file,
        status: normalizeStatus(result.status),
        duration: result.duration,
        startTime: result.startTime,
        tracePath: traceAttachment?.path ?? null,
      });
    }
  }

  for (const child of suite.suites ?? []) {
    runs.push(...extractFromSuite(child));
  }

  return runs;
}

export function parseReport(report: Record<string, unknown>): TestRunMeta[] {
  const suites = report.suites as ReportSuite[] | undefined;
  if (!Array.isArray(suites)) {
    if (report.suites !== undefined) {
      console.warn(
        'parseReport: report.suites is not an array — is this a Playwright JSON report?'
      );
    }
    return [];
  }

  const runs: TestRunMeta[] = [];
  for (const suite of suites) {
    runs.push(...extractFromSuite(suite));
  }
  return runs;
}
