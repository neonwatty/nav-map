import { describe, it, expect } from 'vitest';
import { parseReport } from '../ingest/parseReport.js';
import sampleReport from './fixtures/sample-report.json';

describe('parseReport', () => {
  it('extracts test runs from a Playwright JSON report', () => {
    const runs = parseReport(sampleReport);
    expect(runs).toHaveLength(2);
  });

  it('extracts name, specFile, status, and duration for each run', () => {
    const runs = parseReport(sampleReport);
    const first = runs[0];
    expect(first.name).toBe('Admin dashboard loads');
    expect(first.specFile).toBe('tests/core-admin.spec.ts');
    expect(first.status).toBe('passed');
    expect(first.duration).toBe(4500);
  });

  it('extracts trace path from attachments', () => {
    const runs = parseReport(sampleReport);
    expect(runs[0].tracePath).toBe('/project/test-results/core-admin-dashboard/trace.zip');
  });

  it('marks failed tests correctly', () => {
    const runs = parseReport(sampleReport);
    const failed = runs.find(r => r.name === 'User management table');
    expect(failed?.status).toBe('failed');
  });

  it('generates a deterministic id from specFile + name', () => {
    const runs = parseReport(sampleReport);
    expect(runs[0].id).toBeTruthy();
    expect(runs[0].id).not.toBe(runs[1].id);
    const runs2 = parseReport(sampleReport);
    expect(runs[0].id).toBe(runs2[0].id);
  });

  it('returns empty array for report with no suites', () => {
    const empty = { config: {}, suites: [], stats: {} };
    expect(parseReport(empty)).toEqual([]);
  });

  it('extracts tests from nested suites (describe blocks)', () => {
    const nestedReport = {
      suites: [
        {
          title: 'outer.spec.ts',
          file: 'tests/outer.spec.ts',
          specs: [],
          suites: [
            {
              title: 'describe block',
              file: 'tests/outer.spec.ts',
              specs: [
                {
                  title: 'nested test',
                  file: 'tests/outer.spec.ts',
                  tests: [
                    {
                      status: 'expected',
                      results: [
                        {
                          status: 'passed',
                          duration: 100,
                          startTime: '2026-04-17T00:00:00Z',
                          attachments: [],
                        },
                      ],
                    },
                  ],
                },
              ],
              suites: [],
            },
          ],
        },
      ],
    };
    const runs = parseReport(nestedReport);
    expect(runs).toHaveLength(1);
    expect(runs[0].name).toBe('nested test');
  });

  it('normalizes skipped status correctly', () => {
    const skippedReport = {
      suites: [
        {
          title: 'skip.spec.ts',
          file: 'tests/skip.spec.ts',
          specs: [
            {
              title: 'skipped test',
              file: 'tests/skip.spec.ts',
              tests: [
                {
                  status: 'skipped',
                  results: [
                    {
                      status: 'skipped',
                      duration: 0,
                      startTime: '2026-04-17T00:00:00Z',
                      attachments: [],
                    },
                  ],
                },
              ],
            },
          ],
          suites: [],
        },
      ],
    };
    const runs = parseReport(skippedReport);
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe('skipped');
  });
});
