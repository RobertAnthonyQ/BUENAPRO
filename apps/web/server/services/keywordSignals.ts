function clean(values: unknown, max: number) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => String(value).trim().toLowerCase()).filter(Boolean))].slice(0, max);
}

export function keywordSignals(input: { keywords?: unknown; keyword_phrases?: unknown; keyword_terms?: unknown }) {
  const combined = clean(input.keywords, 30);
  const phrases = clean(input.keyword_phrases, 8).filter((value) => value.split(/\s+/).length >= 2);
  const terms = clean(input.keyword_terms, 10).filter((value) => value.split(/\s+/).length === 1);
  const keywordPhrases = phrases.length ? phrases : combined.filter((value) => value.split(/\s+/).length >= 2).slice(0, 8);
  const keywordTerms = terms.length ? terms : combined.filter((value) => value.split(/\s+/).length === 1).slice(0, 10);
  return {
    keyword_phrases: keywordPhrases,
    keyword_terms: keywordTerms,
    keywords: [...new Set([...keywordPhrases, ...keywordTerms])],
  };
}
