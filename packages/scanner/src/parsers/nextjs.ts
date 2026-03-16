import { Project, SyntaxKind, Node } from 'ts-morph';
import path from 'path';

interface ParsedLink {
  targetRoute: string;
  label?: string;
  type: 'link' | 'redirect' | 'router-push';
  sourceFile: string;
  sourceLine: number;
  component?: string;
}

export function parseNextjsLinks(filePath: string, projectDir: string): ParsedLink[] {
  try {
    const project = new Project({
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        allowJs: true,
        jsx: 4, // JsxEmit.ReactJSX
      },
    });

    const sourceFile = project.addSourceFileAtPath(filePath);
    const relativeFilePath = path.relative(projectDir, filePath);
    const links: ParsedLink[] = [];

    // --- 1. Find all <Link> JSX elements and extract href ---

    const jsxOpeningElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement);
    const jsxSelfClosingElements = sourceFile.getDescendantsOfKind(
      SyntaxKind.JsxSelfClosingElement
    );

    for (const element of [...jsxOpeningElements, ...jsxSelfClosingElements]) {
      const tagName = element.getTagNameNode().getText();
      if (tagName !== 'Link') continue;

      const hrefAttr = element.getAttribute('href');
      if (!hrefAttr || !Node.isJsxAttribute(hrefAttr)) continue;

      const initializer = hrefAttr.getInitializer();
      if (!initializer) continue;

      let targetRoute: string | undefined;

      if (Node.isStringLiteral(initializer)) {
        // href="/"
        targetRoute = initializer.getLiteralValue();
      } else if (Node.isJsxExpression(initializer)) {
        const expression = initializer.getExpression();
        if (!expression) continue;

        if (Node.isStringLiteral(expression)) {
          // href={"/about"}
          targetRoute = expression.getLiteralValue();
        } else if (Node.isIdentifier(expression)) {
          // href={someVar} — try to resolve in same file
          targetRoute = resolveIdentifier(sourceFile, expression.getText());
        } else if (Node.isNoSubstitutionTemplateLiteral(expression)) {
          // href={`/about`} — template literal with no expressions
          targetRoute = expression.getLiteralValue();
        }
        // Skip template literals with expressions (dynamic routes)
      }

      if (!targetRoute) continue;

      // Try to extract text label from Link children
      let label: string | undefined;
      if (Node.isJsxOpeningElement(element)) {
        const parent = element.getParent();
        if (Node.isJsxElement(parent)) {
          label = extractTextContent(parent);
        }
      }

      // Try to determine enclosing component name
      const component = findEnclosingComponent(element);

      const link: ParsedLink = {
        targetRoute,
        type: 'link',
        sourceFile: relativeFilePath,
        sourceLine: element.getStartLineNumber(),
      };
      if (label) link.label = label;
      if (component) link.component = component;

      links.push(link);
    }

    // --- 2. Find router.push(...) and router.replace(...) calls ---

    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of callExpressions) {
      const expr = call.getExpression();

      if (Node.isPropertyAccessExpression(expr)) {
        const methodName = expr.getName();
        const objectText = expr.getExpression().getText();

        if ((methodName === 'push' || methodName === 'replace') && objectText === 'router') {
          const args = call.getArguments();
          if (args.length === 0) continue;

          const firstArg = args[0];
          if (Node.isStringLiteral(firstArg)) {
            const component = findEnclosingComponent(call);

            const link: ParsedLink = {
              targetRoute: firstArg.getLiteralValue(),
              type: 'router-push',
              sourceFile: relativeFilePath,
              sourceLine: call.getStartLineNumber(),
            };
            if (component) link.component = component;

            links.push(link);
          }
        }
      }
    }

    // --- 3. Find redirect(...) calls ---

    for (const call of callExpressions) {
      const expr = call.getExpression();

      if (Node.isIdentifier(expr) && expr.getText() === 'redirect') {
        const args = call.getArguments();
        if (args.length === 0) continue;

        const firstArg = args[0];
        if (Node.isStringLiteral(firstArg)) {
          const component = findEnclosingComponent(call);

          const link: ParsedLink = {
            targetRoute: firstArg.getLiteralValue(),
            type: 'redirect',
            sourceFile: relativeFilePath,
            sourceLine: call.getStartLineNumber(),
          };
          if (component) link.component = component;

          links.push(link);
        }
      }
    }

    return links;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: could not parse ${filePath}: ${message}`);
    return [];
  }
}

/**
 * Try to resolve an identifier to a string value by searching for
 * variable declarations in the same source file.
 */
function resolveIdentifier(
  sourceFile: ReturnType<Project['addSourceFileAtPath']>,
  name: string
): string | undefined {
  const variableDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
  for (const decl of variableDeclarations) {
    if (decl.getName() === name) {
      const initializer = decl.getInitializer();
      if (initializer && Node.isStringLiteral(initializer)) {
        return initializer.getLiteralValue();
      }
    }
  }
  return undefined;
}

/**
 * Extract plain text content from a JsxElement's children.
 * Concatenates string literal children and JsxText nodes.
 */
function extractTextContent(jsxElement: Node): string | undefined {
  if (!Node.isJsxElement(jsxElement)) return undefined;

  const parts: string[] = [];

  for (const child of jsxElement.getJsxChildren()) {
    if (Node.isJsxText(child)) {
      const text = child.getText().trim();
      if (text) parts.push(text);
    } else if (Node.isJsxElement(child)) {
      // Recurse into nested elements to find text
      const nested = extractTextContent(child);
      if (nested) parts.push(nested);
    } else if (Node.isJsxSelfClosingElement(child)) {
      // Self-closing elements have no text children
      continue;
    } else if (Node.isJsxExpression(child)) {
      const expression = child.getExpression();
      if (expression && Node.isStringLiteral(expression)) {
        parts.push(expression.getLiteralValue());
      }
    }
  }

  const result = parts.join(' ').trim();
  return result || undefined;
}

/**
 * Walk up the AST to find the nearest enclosing function/arrow function component name.
 */
function findEnclosingComponent(node: Node): string | undefined {
  let current: Node | undefined = node.getParent();

  while (current) {
    // function MyComponent() { ... }
    if (Node.isFunctionDeclaration(current)) {
      const name = current.getName();
      if (name) return name;
    }

    // const MyComponent = () => { ... }  or  const MyComponent = function() { ... }
    if (Node.isVariableDeclaration(current)) {
      const initializer = current.getInitializer();
      if (
        initializer &&
        (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer))
      ) {
        return current.getName();
      }
    }

    current = current.getParent();
  }

  return undefined;
}
