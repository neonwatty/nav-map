import { Project } from 'ts-morph';
import * as path from 'path';
import type { DocPage, DocSection, PropRow } from './types.js';

/**
 * Extract NavMapProps and key type definitions from packages/core
 * using ts-morph for accurate, always-in-sync documentation.
 */
export function generateComponentApi(rootDir: string): DocPage {
  const project = new Project({
    tsConfigFilePath: path.join(rootDir, 'packages/core/tsconfig.json'),
  });

  const coreDir = path.join(rootDir, 'packages/core/src');
  const navMapFile = project.getSourceFileOrThrow(path.join(coreDir, 'components/NavMap.tsx'));
  const typesFile = project.getSourceFileOrThrow(path.join(coreDir, 'types.ts'));

  // Extract NavMapProps interface properties
  const propsInterface = navMapFile.getInterfaceOrThrow('NavMapProps');
  const props: PropRow[] = propsInterface.getProperties().map(prop => ({
    name: prop.getName(),
    type: prop.getType().getText(prop),
    required: !prop.hasQuestionToken(),
    description:
      prop
        .getJsDocs()
        .map(d => d.getDescription().trim())
        .join(' ') || '',
  }));

  // Extract key type definitions from types.ts
  const typeNames = [
    'NavMapGraph',
    'NavMapNode',
    'NavMapEdge',
    'NavMapGroup',
    'NavMapFlow',
    'NavMapFlowStep',
    'ViewMode',
    'EdgeMode',
    'NavMapTheme',
  ];

  const typeSections: DocSection[] = typeNames.reduce<DocSection[]>((acc, name) => {
    const decl = typesFile.getInterface(name) || typesFile.getTypeAlias(name);
    if (!decl) return acc;

    acc.push({
      heading: name,
      content:
        decl
          .getJsDocs()
          .map(d => d.getDescription().trim())
          .join(' ') || `The ${name} type.`,
      codeExample: decl.getText(),
    });
    return acc;
  }, []);

  return {
    slug: 'component-api',
    title: 'NavMap Component API',
    description:
      'Complete API reference for the NavMap React component — props, types, and configuration.',
    keywords: ['nav-map API', 'NavMap props', 'react navigation component', 'NavMapGraph type'],
    sections: [
      {
        heading: 'NavMapProps',
        content:
          'The NavMap component accepts the following props for controlling graph display, view modes, theming, and toolbar visibility.',
        propsTable: props,
      },
      ...typeSections,
    ],
  };
}
