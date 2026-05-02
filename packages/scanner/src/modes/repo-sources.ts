import { glob } from 'glob';
import type { RepoFramework } from './repo-types.js';

export async function discoverSourceFiles(
  projectDir: string,
  framework: RepoFramework
): Promise<string[]> {
  const allSourceFiles = await glob(
    framework === 'nextjs-app' ? 'app/**/*.{tsx,jsx}' : 'pages/**/*.{tsx,jsx}',
    {
      cwd: projectDir,
      ignore: ['**/node_modules/**'],
    }
  );

  const componentFiles = await glob('components/**/*.{tsx,jsx}', {
    cwd: projectDir,
    ignore: ['**/node_modules/**'],
  });
  allSourceFiles.push(...componentFiles);

  return allSourceFiles;
}
