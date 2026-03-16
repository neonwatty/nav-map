export function parseHtmlLinks(html: string, baseUrl: string): { href: string; text: string }[] {
  const results: { href: string; text: string }[] = [];
  const seen = new Set<string>();

  let origin: string;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return results;
  }

  // Match <a ...href="..."...>...</a> (handles single and double quotes, and self-closing)
  const anchorRegex = /<a\s[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(html)) !== null) {
    const rawHref = match[1] ?? match[2] ?? '';
    // Strip HTML tags from inner text
    const text = (match[3] ?? '').replace(/<[^>]*>/g, '').trim();

    if (!rawHref) continue;

    let resolved: URL;
    try {
      resolved = new URL(rawHref, baseUrl);
    } catch {
      continue;
    }

    // Same-origin only
    if (resolved.origin !== origin) continue;

    const href = resolved.toString();
    if (seen.has(href)) continue;
    seen.add(href);

    results.push({ href, text });
  }

  return results;
}
