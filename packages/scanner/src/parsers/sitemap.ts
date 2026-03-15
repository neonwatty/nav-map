export function parseSitemap(xml: string): string[] {
  const urls: string[] = [];

  // Match <loc>...</loc> elements (works for both regular sitemaps and sitemap index files)
  const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;

  let match: RegExpExecArray | null;
  while ((match = locRegex.exec(xml)) !== null) {
    const url = match[1]?.trim();
    if (url) {
      urls.push(url);
    }
  }

  return urls;
}
