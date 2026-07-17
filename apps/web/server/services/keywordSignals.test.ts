import test from "node:test";
import assert from "node:assert/strict";
import { keywordSignals } from "./keywordSignals.ts";

test("conserva señales tipadas explícitas", () => {
  assert.deepEqual(
    keywordSignals({
      keywords: ["dato anterior"],
      keyword_phrases: ["asesoría legal"],
      keyword_terms: ["arbitraje"],
    }),
    {
      keyword_phrases: ["asesoría legal"],
      keyword_terms: ["arbitraje"],
      keywords: ["asesoría legal", "arbitraje"],
    },
  );
});

test("clasifica el arreglo legado sin dividir frases", () => {
  assert.deepEqual(
    keywordSignals({ keywords: ["servicio de software", "software"] }),
    {
      keyword_phrases: ["servicio de software"],
      keyword_terms: ["software"],
      keywords: ["servicio de software", "software"],
    },
  );
});
