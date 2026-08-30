#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const coreRoot = path.join(repoRoot, 'packages/core');
const require = createRequire(path.join(coreRoot, 'package.json'));
const reactFlowSource = require.resolve('@xyflow/react/dist/style.css');
const workflowCanvasSource = path.join(coreRoot, 'src/workflow-canvas/workflow-canvas.css');
const destination = path.join(coreRoot, 'dist/index.css');

fs.mkdirSync(path.dirname(destination), { recursive: true });
const reactFlowCss = fs.readFileSync(reactFlowSource, 'utf8').trimEnd();
const workflowCanvasCss = fs.readFileSync(workflowCanvasSource, 'utf8').trimEnd();
fs.writeFileSync(
  destination,
  `${reactFlowCss}\n\n/* Focused WorkflowCanvas */\n${workflowCanvasCss}\n`,
  'utf8'
);
