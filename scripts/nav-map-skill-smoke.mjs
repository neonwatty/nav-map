import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const skillDir = path.join(repoRoot, 'skills/nav-map');
const templatesDir = path.join(repoRoot, 'templates/nav-map');
const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-map-skill-smoke-'));
const scannerBin = path.join(repoRoot, 'packages/scanner/bin/nav-map.js');
const requiredCommands = ['workflow', 'context', 'auth-state', 'probe', 'diff'];
const forbiddenPatterns = [
  /"cookies"\s*:/i,
  /"localStorage"\s*:/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /client[_-]?secret/i,
  /service[_-]?role/i,
  /private[_-]?key/i,
  /bearer\s+[a-z0-9._-]+/i,
];

function main() {
  assertFile(path.join(skillDir, 'SKILL.md'));
  assertFile(path.join(skillDir, 'agents/openai.yaml'));
  assertFile(path.join(templatesDir, 'agent-receipt.md'));

  validateSkill();
  validateOpenAiYaml();
  validateTemplates();
  validateCliHelp();
  validateTemplateContracts();

  console.log('NavMap skill smoke passed');
}

function validateSkill() {
  const skill = readText(path.join(skillDir, 'SKILL.md'));
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/);
  assert(frontmatter, 'SKILL.md must include YAML frontmatter');
  assert(/name:\s*nav-map/.test(frontmatter[1]), 'skill name must be nav-map');
  assert(/description:.*workflow/i.test(frontmatter[1]), 'description should mention workflow use');
  assert(
    skill.includes('nav-map workflow <manifest> --inspect --contract'),
    'skill must include inspect command'
  );
  assert(
    skill.includes('Do not inspect, print, commit, or summarize'),
    'skill must include auth storage safety'
  );
}

function validateOpenAiYaml() {
  const yaml = readText(path.join(skillDir, 'agents/openai.yaml'));
  assert(/display_name:\s*['"]NavMap['"]/.test(yaml), 'openai.yaml must name NavMap');
  assert(yaml.includes('$nav-map'), 'openai.yaml default prompt must mention $nav-map');
  assertSafeText('skills/nav-map/agents/openai.yaml', yaml);
}

function validateTemplates() {
  const files = fs
    .readdirSync(templatesDir)
    .filter(file => file.endsWith('.workflow.json'))
    .sort();
  assert(files.length >= 3, 'expected at least three workflow templates');

  for (const file of files) {
    const relative = `templates/nav-map/${file}`;
    const text = readText(path.join(templatesDir, file));
    assertSafeText(relative, text);
    const manifest = JSON.parse(text);
    assert(manifest.version === 'workflow-atlas/1.0', `${relative} must use workflow-atlas/1.0`);
    assert(typeof manifest.name === 'string' && manifest.name, `${relative} must have a name`);
    assert(
      Array.isArray(manifest.nodes) && manifest.nodes.length > 0,
      `${relative} must have nodes`
    );
    assert(Array.isArray(manifest.edges), `${relative} must have edges`);
    assert(Array.isArray(manifest.flows), `${relative} must have flows`);
  }
}

function validateCliHelp() {
  const help = execFileSync('node', [scannerBin, '--help'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  for (const command of requiredCommands) {
    assert(help.includes(command), `nav-map --help should include ${command}`);
  }
}

function validateTemplateContracts() {
  fs.mkdirSync(artifactDir, { recursive: true });
  const files = fs
    .readdirSync(templatesDir)
    .filter(file => file.endsWith('.workflow.json'))
    .sort();

  for (const file of files) {
    const outputPath = path.join(artifactDir, `${file}.inspect.json`);
    execFileSync(
      'node',
      [
        scannerBin,
        'workflow',
        path.join(templatesDir, file),
        '--inspect',
        '--contract',
        '--output',
        outputPath,
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8',
      }
    );
    const contract = JSON.parse(readText(outputPath));
    assert(
      contract.kind === 'workflow-inspect',
      `${file} should produce workflow-inspect contract`
    );
    assert(contract.summary.valid === true, `${file} should inspect as valid`);
  }
}

function assertSafeText(label, text) {
  for (const pattern of forbiddenPatterns) {
    assert(
      !pattern.test(text),
      `${label} contains forbidden secret/auth-storage pattern: ${pattern}`
    );
  }
}

function assertFile(filePath) {
  assert(fs.existsSync(filePath), `${path.relative(repoRoot, filePath)} must exist`);
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main();
