#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const maxLines = 300;
const roots = ['packages/core/src', 'packages/scanner/src'];
const extensions = new Set(['.ts', '.tsx']);

const baseline = new Map(
  Object.entries({
    'packages/core/src/components/NavMap.test.tsx': 356,
    'packages/core/src/components/NavMap.tsx': 489,
    'packages/core/src/components/NavMapShell.tsx': 303,
    'packages/core/src/components/panels/ConnectionPanel.test.tsx': 552,
    'packages/core/src/components/panels/ConnectionPanel.tsx': 834,
    'packages/core/src/components/panels/WorkflowOverview.tsx': 492,
    'packages/core/src/hooks/useGraphStyling.test.ts': 486,
    'packages/core/src/hooks/useLiveReadiness.ts': 313,
    'packages/core/src/utils/artifactPreview.test.ts': 415,
    'packages/core/src/workflowManifest.test.ts': 760,
    'packages/core/src/workflowManifest.ts': 689,
    'packages/scanner/src/__tests__/context.test.ts': 485,
    'packages/scanner/src/__tests__/probe.test.ts': 559,
    'packages/scanner/src/__tests__/workflow.test.ts': 385,
    'packages/scanner/src/modes/auth-state.ts': 444,
    'packages/scanner/src/modes/context.ts': 486,
    'packages/scanner/src/modes/probe.ts': 809,
    'packages/scanner/src/modes/workflow.ts': 383,
  })
);

const failures = [];
const seen = new Set();

for (const root of roots) {
  for (const file of listSourceFiles(path.join(repoRoot, root))) {
    const relativePath = path.relative(repoRoot, file);
    const lineCount = countEffectiveLines(fs.readFileSync(file, 'utf8'));
    const allowed = baseline.get(relativePath) ?? maxLines;
    seen.add(relativePath);

    if (lineCount > allowed) {
      failures.push(`${relativePath}: ${lineCount} effective lines; allowed ${allowed}`);
    }
  }
}

for (const baselinePath of baseline.keys()) {
  if (!seen.has(baselinePath)) {
    failures.push(`${baselinePath}: baseline entry does not match a source file`);
  }
}

if (failures.length > 0) {
  console.error(
    `Max-lines check failed. New files must stay at or below ${maxLines} lines; baseline files may not grow.`
  );
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Max-lines check passed for ${seen.size} files. Baseline exceptions: ${baseline.size}.`
);

function listSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(entryPath));
      continue;
    }
    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }
  return files;
}

function countEffectiveLines(source) {
  let count = 0;
  let inBlockComment = false;

  for (const rawLine of source.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;

    while (line.length > 0) {
      if (inBlockComment) {
        const end = line.indexOf('*/');
        if (end === -1) {
          line = '';
          break;
        }
        line = line.slice(end + 2).trim();
        inBlockComment = false;
        continue;
      }

      if (line.startsWith('//')) {
        line = '';
        break;
      }

      if (line.startsWith('/*')) {
        const end = line.indexOf('*/', 2);
        if (end === -1) {
          line = '';
          inBlockComment = true;
          break;
        }
        line = line.slice(end + 2).trim();
        continue;
      }

      count += 1;
      break;
    }
  }

  return count;
}
