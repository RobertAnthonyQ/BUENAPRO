ALTER TABLE business_lines
  ADD COLUMN keyword_phrases TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN keyword_terms TEXT[] NOT NULL DEFAULT '{}';

-- Compatibilidad con perfiles existentes: una keyword de una palabra es un
-- término fuerte explícito; las de varias palabras siguen siendo frases.
UPDATE business_lines
SET keyword_phrases = ARRAY(
      SELECT keyword FROM unnest(keywords) keyword
      WHERE btrim(keyword) LIKE '% %'
    ),
    keyword_terms = ARRAY(
      SELECT keyword FROM unnest(keywords) keyword
      WHERE btrim(keyword) NOT LIKE '% %'
    );

CREATE INDEX ix_business_lines_keyword_phrases ON business_lines USING gin (keyword_phrases);
CREATE INDEX ix_business_lines_keyword_terms ON business_lines USING gin (keyword_terms);

COMMENT ON COLUMN business_lines.keyword_phrases IS 'Frases exactas de 2 a 4 palabras; no se dividen al puntuar.';
COMMENT ON COLUMN business_lines.keyword_terms IS 'Palabras o siglas fuertes de una sola palabra, elegidas explícitamente.';
