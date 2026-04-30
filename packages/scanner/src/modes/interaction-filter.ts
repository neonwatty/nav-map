export interface InteractiveCandidate {
  id: string;
  text: string;
}

const defaultUnsafeInteractionPatterns = [
  'delete',
  'remove',
  'sign out',
  'logout',
  'log out',
  'submit',
  'buy',
  'purchase',
  'checkout',
  'subscribe',
  'confirm',
  'save',
];

export function isSafeInteractionText(
  text: string,
  options: { include?: string[]; exclude?: string[] } = {}
): boolean {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!normalized) return false;

  const include = options.include ?? [];
  if (include.length > 0 && !include.some(pattern => matchesPattern(normalized, pattern))) {
    return false;
  }

  const exclude = [...defaultUnsafeInteractionPatterns, ...(options.exclude ?? [])];
  return !exclude.some(pattern => matchesPattern(normalized, pattern));
}

export function dedupeInteractionCandidates(
  candidates: InteractiveCandidate[]
): InteractiveCandidate[] {
  const seen = new Set<string>();
  const deduped: InteractiveCandidate[] = [];

  for (const candidate of candidates) {
    const key = candidate.text.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

function matchesPattern(value: string, pattern: string): boolean {
  const normalizedPattern = pattern.toLowerCase().trim();
  if (!normalizedPattern) return false;
  return value.includes(normalizedPattern);
}
