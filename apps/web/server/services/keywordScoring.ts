import { companyAnalysisConfig, normalizeSearchText } from "./companyAnalysis.ts";

const scoring = companyAnalysisConfig.keyword_scoring;

export type KeywordHit = { keyword: string; match: "exact_phrase" | "strong_term"; points: number };

function uniqueNormalized(values: string[]) {
  return [...new Set(values.map(normalizeSearchText).filter(Boolean))];
}

/** Referencia determinista del motor, compartida por tests y reglas SQL. */
export function scoreBusinessLine(description: string, keywordPhrases: string[], keywordTerms: string[]) {
  const document = normalizeSearchText(description);
  const paddedDocument = ` ${document} `;
  const matchedPhrases = uniqueNormalized(keywordPhrases)
    .filter((phrase) => phrase.includes(" ") && paddedDocument.includes(` ${phrase} `));
  const wordsCoveredByPhrases = new Set(matchedPhrases.flatMap((phrase) => phrase.split(" ")));
  const termHits = uniqueNormalized(keywordTerms)
    .filter((term) => !term.includes(" "))
    .filter((term) => !wordsCoveredByPhrases.has(term) && paddedDocument.includes(` ${term} `))
    .map((keyword) => ({ keyword, match: "strong_term" as const, points: scoring.strong_term }));
  const phraseHits = matchedPhrases.map((keyword) => ({ keyword, match: "exact_phrase" as const, points: scoring.exact_phrase }));
  const phrasePoints = phraseHits.reduce((total, hit) => total + hit.points, 0);
  const termPoints = Math.min(scoring.term_cap, termHits.reduce((total, hit) => total + hit.points, 0));
  return { points: Math.min(scoring.total_cap, phrasePoints + termPoints), hits: [...phraseHits, ...termHits] };
}

/** Calcula una sola vez el mejor fit entre las líneas del segmento del contrato. */
export function keywordFitLateralSql(tenantParam: number) {
  return `
  LEFT JOIN LATERAL (
    WITH doc AS (
      SELECT trim(regexp_replace(translate(lower(coalesce(c.descripcion,'')), 'áéíóúñü', 'aeiounu'), '[^a-z0-9]+', ' ', 'g')) AS value
    ), eligible_lines AS (
      SELECT bl.id, bl.nombre, bl.keyword_phrases, bl.keyword_terms
      FROM company_profiles cp
      JOIN business_lines bl ON bl.profile_id = cp.id AND bl.is_active = true
      WHERE cp.tenant_id = $${tenantParam} AND cp.is_active = true
        AND c.cubso_segmento = ANY(bl.cubso_segmentos)
    ), phrase_signals AS (
      SELECT el.id, el.nombre, phrase AS original,
        trim(regexp_replace(translate(lower(phrase), 'áéíóúñü', 'aeiounu'), '[^a-z0-9]+', ' ', 'g')) AS normalized
      FROM eligible_lines el CROSS JOIN LATERAL unnest(el.keyword_phrases) phrase
    ), phrase_hits AS (
      SELECT DISTINCT s.id, s.nombre, s.original, s.normalized, ${scoring.exact_phrase}::int AS points
      FROM phrase_signals s CROSS JOIN doc
      WHERE s.normalized LIKE '% %'
        AND strpos(' ' || doc.value || ' ', ' ' || s.normalized || ' ') > 0
    ), covered_words AS (
      SELECT DISTINCT ph.id, word
      FROM phrase_hits ph CROSS JOIN LATERAL unnest(string_to_array(ph.normalized, ' ')) word
    ), term_signals AS (
      SELECT el.id, el.nombre, term AS original,
        trim(regexp_replace(translate(lower(term), 'áéíóúñü', 'aeiounu'), '[^a-z0-9]+', ' ', 'g')) AS normalized
      FROM eligible_lines el CROSS JOIN LATERAL unnest(el.keyword_terms) term
    ), term_hits AS (
      SELECT DISTINCT s.id, s.nombre, s.original, s.normalized, ${scoring.strong_term}::int AS points
      FROM term_signals s CROSS JOIN doc
      WHERE s.normalized NOT LIKE '% %'
        AND strpos(' ' || doc.value || ' ', ' ' || s.normalized || ' ') > 0
        AND NOT EXISTS (SELECT 1 FROM covered_words cw WHERE cw.id=s.id AND cw.word=s.normalized)
    ), line_scores AS (
      SELECT el.id AS business_line_id, el.nombre AS business_line_name,
        LEAST(${scoring.total_cap},
          COALESCE((SELECT sum(points) FROM phrase_hits ph WHERE ph.id=el.id),0)
          + LEAST(${scoring.term_cap}, COALESCE((SELECT sum(points) FROM term_hits th WHERE th.id=el.id),0))
        )::int AS keyword_points,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('keyword', original, 'match', 'exact_phrase', 'points', points) ORDER BY original) FROM phrase_hits ph WHERE ph.id=el.id),'[]'::jsonb)
        || COALESCE((SELECT jsonb_agg(jsonb_build_object('keyword', original, 'match', 'strong_term', 'points', points) ORDER BY original) FROM term_hits th WHERE th.id=el.id),'[]'::jsonb) AS keyword_hits
      FROM eligible_lines el
    )
    SELECT * FROM line_scores ORDER BY keyword_points DESC, business_line_id LIMIT 1
  ) fit ON true`;
}
