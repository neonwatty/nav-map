#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const coreRoot = path.join(repoRoot, 'packages/core');
const require = createRequire(path.join(coreRoot, 'package.json'));
const source = require.resolve('@xyflow/react/dist/style.css');
const destination = path.join(coreRoot, 'dist/index.css');

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(source, destination);
