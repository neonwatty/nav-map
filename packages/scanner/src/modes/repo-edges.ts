import path from 'node:path';
import { parseNextjsLinks } from '../parsers/nextjs.js';
import type { NavMapGraph, RepoRoute } from './repo-types.js';

export function buildStaticEdges(
  projectDir: string,
  routeMap: Map<string, RepoRoute>,
  routeLookup: Map<string, string>,
  sourceFiles: string[]
): NavMapGraph['edges'] {
  const edges: NavMapGraph['edges'] = [];
  const edgeSet = new Set<string>();

  for (const file of sourceFiles) {
    const fullPath = path.join(projectDir, file);
    const links = parseNextjsLinks(fullPath, projectDir);

    let sourcePageId: string | undefined;
    for (const [id, info] of routeMap) {
      if (file === info.filePath || file.startsWith(path.dirname(info.filePath) + '/')) {
        sourcePageId = id;
        break;
      }
    }

    for (const link of links) {
      const targetId = routeLookup.get(link.targetRoute);
      if (!targetId || !sourcePageId) continue;
      if (sourcePageId === targetId) continue;

      const edgeKey = `${sourcePageId}->${targetId}`;
      if (edgeSet.has(edgeKey)) continue;
      edgeSet.add(edgeKey);

      edges.push({
        id: `e-${sourcePageId}-${targetId}`,
        source: sourcePageId,
        target: targetId,
        label: link.label,
        type: link.type,
        sourceCode: {
          file: link.sourceFile,
          line: link.sourceLine,
          component: link.component,
        },
      });
    }
  }

  return edges;
}
