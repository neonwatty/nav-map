import fs from 'node:fs';
import path from 'node:path';

export const NAV_MAP_PROJECT_VERSION = 'nav-map-project/1.0' as const;
export const NAV_MAP_PROJECT_FILE = '.nav-map/project.json';

export type NavMapProjectSource =
  | { type: 'repo'; directory: string }
  | { type: 'workflow'; manifest: string }
  | { type: 'url'; url: string };

export interface NavMapProjectEnvironment {
  baseUrl: string;
}

export interface NavMapProject {
  version: typeof NAV_MAP_PROJECT_VERSION;
  id: string;
  name: string;
  source: NavMapProjectSource;
  artifacts: {
    graph: string;
    screenshots: string;
    receipts: string;
  };
  defaultEnvironment?: string;
  environments?: Record<string, NavMapProjectEnvironment>;
}

export interface LoadedNavMapProject {
  rootDir: string;
  projectPath: string;
  project: NavMapProject;
}

export interface InitProjectOptions {
  rootDir?: string;
  id?: string;
  name?: string;
  manifest?: string;
  url?: string;
  baseUrl?: string;
}

export interface InitProjectReceipt {
  version: 'nav-map-init-receipt/1.0';
  status: 'created' | 'reused';
  projectPath: string;
  project: {
    id: string;
    name: string;
    sourceType: NavMapProjectSource['type'];
    defaultEnvironment?: string;
  };
  createdFiles: string[];
  reusedFiles: string[];
  warnings: string[];
  nextActions: string[];
}

export interface OpenTarget {
  jsonPath: string;
  screenshotDir?: string;
  project?: LoadedNavMapProject;
}

export interface ResolvedProjectEnvironment {
  id?: string;
  baseUrl?: string;
}

const DEFAULT_ARTIFACTS: NavMapProject['artifacts'] = {
  graph: '.nav-map/generated/nav-map.json',
  screenshots: '.nav-map/generated/screenshots',
  receipts: '.nav-map/generated/receipts',
};

export function initProject(options: InitProjectOptions = {}): InitProjectReceipt {
  const rootDir = path.resolve(options.rootDir ?? '.');
  requireDirectory(rootDir);
  if (options.manifest && options.url) {
    throw new Error('Choose either --manifest or --url, not both.');
  }

  const projectDir = path.join(rootDir, '.nav-map');
  const projectPath = path.join(rootDir, NAV_MAP_PROJECT_FILE);
  const ignorePath = path.join(projectDir, '.gitignore');

  if (fs.existsSync(projectPath)) {
    const loaded = loadProject(rootDir);
    assertRequestedValuesMatch(loaded, options);
    return buildInitReceipt(loaded, 'reused', [], [NAV_MAP_PROJECT_FILE]);
  }

  const packageName = readPackageName(rootDir);
  const name = normalizeName(options.name ?? packageName ?? path.basename(rootDir));
  const id = normalizeProjectId(options.id ?? packageName ?? name);
  const source = buildSource(rootDir, options);
  const environmentUrl = options.baseUrl ?? (source.type === 'url' ? source.url : undefined);
  const project: NavMapProject = {
    version: NAV_MAP_PROJECT_VERSION,
    id,
    name,
    source,
    artifacts: { ...DEFAULT_ARTIFACTS },
    ...(environmentUrl
      ? {
          defaultEnvironment: 'local',
          environments: { local: { baseUrl: validateHttpUrl(environmentUrl, 'base URL') } },
        }
      : {}),
  };

  validateProject(project);
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(projectPath, `${JSON.stringify(project, null, 2)}\n`, { flag: 'wx' });
  const createdFiles = [NAV_MAP_PROJECT_FILE];
  if (ensureProjectIgnore(ignorePath)) createdFiles.push('.nav-map/.gitignore');

  return buildInitReceipt({ rootDir, projectPath, project }, 'created', createdFiles, []);
}

export function loadProject(rootOrProjectPath: string): LoadedNavMapProject {
  const resolved = path.resolve(rootOrProjectPath);
  const projectPath =
    fs.existsSync(resolved) && fs.statSync(resolved).isFile()
      ? resolved
      : path.join(resolved, NAV_MAP_PROJECT_FILE);
  if (!fs.existsSync(projectPath)) {
    throw new Error(`NavMap project not found: ${projectPath}. Run "nav-map init" first.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Unable to read NavMap project ${projectPath}: ${error instanceof Error ? error.message : error}`,
      { cause: error }
    );
  }
  const project = validateProject(parsed);
  const rootDir = path.dirname(path.dirname(projectPath));
  return { rootDir, projectPath, project };
}

export function resolveOpenTarget(input?: string, cwd = process.cwd()): OpenTarget {
  const explicit = input ? path.resolve(cwd, input) : undefined;
  if (explicit && fs.existsSync(explicit) && fs.statSync(explicit).isFile()) {
    if (
      path.basename(explicit) === 'project.json' &&
      path.basename(path.dirname(explicit)) === '.nav-map'
    ) {
      return openTargetForProject(loadProject(explicit));
    }
    return { jsonPath: explicit };
  }

  const projectRoot = explicit ?? path.resolve(cwd);
  if (fs.existsSync(projectRoot) && fs.statSync(projectRoot).isDirectory()) {
    const projectPath = path.join(projectRoot, NAV_MAP_PROJECT_FILE);
    if (fs.existsSync(projectPath)) return openTargetForProject(loadProject(projectRoot));
  }

  if (!input) {
    const legacyGraph = path.join(path.resolve(cwd), 'nav-map.json');
    if (fs.existsSync(legacyGraph)) return { jsonPath: legacyGraph };
  }

  if (explicit && !fs.existsSync(explicit)) {
    throw new Error(`Open target not found: ${explicit}`);
  }
  throw new Error(
    `No initialized NavMap project found in ${projectRoot}. Run "nav-map init" first.`
  );
}

export function validateProject(value: unknown): NavMapProject {
  const project = asRecord(value);
  if (!project) throw new Error('NavMap project must be a JSON object.');
  if (project.version !== NAV_MAP_PROJECT_VERSION) {
    throw new Error(`Project version must be "${NAV_MAP_PROJECT_VERSION}".`);
  }
  const id = normalizeProjectId(project.id);
  const name = normalizeName(project.name);
  const source = validateSource(project.source);
  const artifactsRecord = asRecord(project.artifacts);
  if (!artifactsRecord) throw new Error('Project artifacts must be an object.');
  const artifacts = {
    graph: validateRelativePath(artifactsRecord.graph, 'artifacts.graph'),
    screenshots: validateRelativePath(artifactsRecord.screenshots, 'artifacts.screenshots'),
    receipts: validateRelativePath(artifactsRecord.receipts, 'artifacts.receipts'),
  };

  const environments = validateEnvironments(project.environments);
  const defaultEnvironment = optionalString(project.defaultEnvironment, 'defaultEnvironment');
  if (defaultEnvironment && !environments?.[defaultEnvironment]) {
    throw new Error(`defaultEnvironment references unknown environment "${defaultEnvironment}".`);
  }

  return {
    version: NAV_MAP_PROJECT_VERSION,
    id,
    name,
    source,
    artifacts,
    ...(defaultEnvironment ? { defaultEnvironment } : {}),
    ...(environments ? { environments } : {}),
  };
}

export function resolveProjectEnvironment(
  loaded: LoadedNavMapProject,
  requestedEnvironment?: string
): ResolvedProjectEnvironment {
  const id = requestedEnvironment ?? loaded.project.defaultEnvironment;
  if (!id) return {};
  const environment = loaded.project.environments?.[id];
  if (!environment) {
    const available = Object.keys(loaded.project.environments ?? {});
    throw new Error(
      `Unknown project environment "${id}".${available.length > 0 ? ` Available: ${available.join(', ')}.` : ''}`
    );
  }
  return { id, baseUrl: environment.baseUrl };
}

export function resolveProjectFilePath(loaded: LoadedNavMapProject, relativePath: string): string {
  return resolveProjectPath(loaded.rootDir, relativePath);
}

function buildSource(rootDir: string, options: InitProjectOptions): NavMapProjectSource {
  if (options.manifest) {
    return {
      type: 'workflow',
      manifest: toProjectRelativePath(rootDir, options.manifest, 'manifest'),
    };
  }
  if (options.url) return { type: 'url', url: validateHttpUrl(options.url, 'URL') };
  return { type: 'repo', directory: '.' };
}

function validateSource(value: unknown): NavMapProjectSource {
  const source = asRecord(value);
  if (!source) throw new Error('Project source must be an object.');
  if (source.type === 'repo') {
    return { type: 'repo', directory: validateRelativePath(source.directory, 'source.directory') };
  }
  if (source.type === 'workflow') {
    return { type: 'workflow', manifest: validateRelativePath(source.manifest, 'source.manifest') };
  }
  if (source.type === 'url') {
    return { type: 'url', url: validateHttpUrl(source.url, 'source.url') };
  }
  throw new Error('Project source.type must be repo, workflow, or url.');
}

function validateEnvironments(
  value: unknown
): Record<string, NavMapProjectEnvironment> | undefined {
  if (value === undefined) return undefined;
  const record = asRecord(value);
  if (!record || Object.keys(record).length === 0) {
    throw new Error('Project environments must be a non-empty object when provided.');
  }
  const environments: Record<string, NavMapProjectEnvironment> = {};
  for (const [id, environmentValue] of Object.entries(record)) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`Invalid environment id "${id}".`);
    const environment = asRecord(environmentValue);
    if (!environment) throw new Error(`Environment "${id}" must be an object.`);
    environments[id] = { baseUrl: validateHttpUrl(environment.baseUrl, `${id}.baseUrl`) };
  }
  return environments;
}

function openTargetForProject(loaded: LoadedNavMapProject): OpenTarget {
  const jsonPath = resolveProjectPath(loaded.rootDir, loaded.project.artifacts.graph);
  const screenshotDir = resolveProjectPath(loaded.rootDir, loaded.project.artifacts.screenshots);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Project graph not found: ${jsonPath}. Run "nav-map sync" first.`);
  }
  return { jsonPath, screenshotDir, project: loaded };
}

function buildInitReceipt(
  loaded: LoadedNavMapProject,
  status: InitProjectReceipt['status'],
  createdFiles: string[],
  reusedFiles: string[]
): InitProjectReceipt {
  return {
    version: 'nav-map-init-receipt/1.0',
    status,
    projectPath: relativeForReceipt(loaded.rootDir, loaded.projectPath),
    project: {
      id: loaded.project.id,
      name: loaded.project.name,
      sourceType: loaded.project.source.type,
      ...(loaded.project.defaultEnvironment
        ? { defaultEnvironment: loaded.project.defaultEnvironment }
        : {}),
    },
    createdFiles,
    reusedFiles,
    warnings: [],
    nextActions: ['nav-map sync', 'nav-map open'],
  };
}

function assertRequestedValuesMatch(
  loaded: LoadedNavMapProject,
  options: InitProjectOptions
): void {
  const mismatches: string[] = [];
  if (options.id && normalizeProjectId(options.id) !== loaded.project.id) mismatches.push('id');
  if (options.name && normalizeName(options.name) !== loaded.project.name) mismatches.push('name');
  if (options.manifest) {
    const requested = toProjectRelativePath(loaded.rootDir, options.manifest, 'manifest');
    if (loaded.project.source.type !== 'workflow' || loaded.project.source.manifest !== requested) {
      mismatches.push('manifest');
    }
  }
  if (options.url) {
    const requested = validateHttpUrl(options.url, 'URL');
    if (loaded.project.source.type !== 'url' || loaded.project.source.url !== requested) {
      mismatches.push('url');
    }
  }
  if (options.baseUrl) {
    const requested = validateHttpUrl(options.baseUrl, 'base URL');
    const current = loaded.project.defaultEnvironment
      ? loaded.project.environments?.[loaded.project.defaultEnvironment]?.baseUrl
      : undefined;
    if (current !== requested) mismatches.push('base-url');
  }
  if (mismatches.length > 0) {
    throw new Error(
      `Existing ${NAV_MAP_PROJECT_FILE} conflicts with requested ${mismatches.join(', ')}. Edit or move it explicitly; init will not overwrite it.`
    );
  }
}

function ensureProjectIgnore(ignorePath: string): boolean {
  const required = ['auth/', 'generated/'];
  const existing = fs.existsSync(ignorePath) ? fs.readFileSync(ignorePath, 'utf8') : '';
  const lines = new Set(
    existing
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
  );
  const missing = required.filter(line => !lines.has(line));
  if (missing.length === 0) return false;
  const prefix = existing && !existing.endsWith('\n') ? '\n' : '';
  fs.appendFileSync(ignorePath, `${prefix}${missing.join('\n')}\n`);
  return true;
}

function toProjectRelativePath(rootDir: string, input: string, field: string): string {
  const resolved = path.resolve(rootDir, input);
  if (!isWithin(rootDir, resolved)) throw new Error(`${field} must stay inside the project root.`);
  return validateRelativePath(path.relative(rootDir, resolved).split(path.sep).join('/'), field);
}

function resolveProjectPath(rootDir: string, relativePath: string): string {
  const resolved = path.resolve(rootDir, relativePath);
  if (!isWithin(rootDir, resolved))
    throw new Error('Project artifact path escaped the project root.');
  return resolved;
}

function validateRelativePath(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${field} must be a relative path.`);
  const trimmed = value.trim();
  if (trimmed.includes('\\') || path.posix.isAbsolute(trimmed) || path.win32.isAbsolute(trimmed)) {
    throw new Error(`${field} must be a portable relative path using forward slashes.`);
  }
  const normalized = path.posix.normalize(trimmed);
  if (normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`${field} must stay inside the project root.`);
  }
  return normalized;
}

function normalizeProjectId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error('Project id must be a non-empty string.');
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!normalized) throw new Error('Project id must contain letters or numbers.');
  return normalized;
}

function normalizeName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error('Project name must be non-empty.');
  return value.trim();
}

function validateHttpUrl(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be a URL.`);
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error(`${field} must be a valid URL.`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${field} must use http or https.`);
  }
  return parsed.toString().replace(/\/$/, '');
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be non-empty.`);
  return value.trim();
}

function readPackageName(rootDir: string): string | undefined {
  const packagePath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(packagePath)) return undefined;
  try {
    const parsed = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as { name?: unknown };
    return typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : undefined;
  } catch {
    return undefined;
  }
}

function requireDirectory(directory: string): void {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new Error(`Project directory not found: ${directory}`);
  }
}

function relativeForReceipt(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

function isWithin(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  return (
    resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
