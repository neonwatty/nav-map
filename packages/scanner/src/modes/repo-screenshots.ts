import path from 'node:path';
import { captureScreenshots } from '../screenshots/capture.js';
import type { NavMapGraph } from './repo-types.js';

export async function attachScreenshots(
  nodes: NavMapGraph['nodes'],
  baseUrl: string,
  screenshotDir: string
): Promise<void> {
  const screenshotPaths = await captureScreenshots(
    nodes.map(n => ({ route: n.route, id: n.id })),
    baseUrl,
    path.resolve(screenshotDir)
  );

  for (const node of nodes) {
    const screenshotPath = screenshotPaths.get(node.id);
    if (screenshotPath) {
      node.screenshot = path.relative(process.cwd(), screenshotPath);
    }
  }
}
