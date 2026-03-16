/**
 * Query processor. Normalizes the raw query and extracts key terms for the
 * sparse (keyword) search branch. Optional HyDE is behind ENABLE_HYDE.
 */

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with',
]);

export interface ProcessedQuery {
  normalizedQuery: string;
  keyTerms: string;
}

/**
 * Lowercase, trim, normalize whitespace, and derive key terms for tsquery
 * (strip stop words, join with &).
 */
export function processQuery(rawQuery: string): ProcessedQuery {
  const normalized = rawQuery
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

  const words = normalized
    .split(/\W+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));

  const keyTerms = words.join(' & ').trim() || normalized.replace(/\s+/g, ' & ');

  return { normalizedQuery: normalized, keyTerms };
}
