import { NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/server/auth/tenant";
import { query } from "@/server/db/client";
import { ensureServerEnv } from "@/server/env";
import {
  companyAnalysisConfig,
  normalizeSearchText,
  onboardingGeminiModel,
  readCompanyAnalysisPrompt,
  renderCompanyAnalysisInput,
} from "@/server/services/companyAnalysis";
import { readCompanyWebsite, type CompanyWebsitePage } from "@/server/services/companyWebsite";

type Segment = { codigo: string; nombre: string; enabled: boolean };
type Evidence = { source_url: string; excerpt: string };
type BusinessLine = {
  name: string;
  keywords: string[];
  keyword_phrases: string[];
  keyword_terms: string[];
  cubso_segmentos: string[];
  evidence: Evidence[];
};

async function suggestWithGemini(input: {
  name: string;
  description: string;
  pages: CompanyWebsitePage[];
  segments: Segment[];
}) {
  ensureServerEnv();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Configura GEMINI_API_KEY para analizar la empresa.");
  const model = onboardingGeminiModel();
  const catalog = input.segments.map((s) => `${s.codigo}: ${s.nombre}`).join("\n");
  const userInput = renderCompanyAnalysisInput({
    companyName: input.name,
    description: input.description,
    sources: input.pages,
    catalog,
  });
  const startedAt = Date.now();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: readCompanyAnalysisPrompt() }] },
        contents: [{ role: "user", parts: [{ text: userInput }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            required: ["summary", "business_lines"],
            properties: {
              summary: { type: "STRING" },
              business_lines: {
                type: "ARRAY", minItems: 1, maxItems: 5,
                items: {
                  type: "OBJECT",
                  required: ["name", "keyword_phrases", "keyword_terms", "cubso_segmentos", "evidence"],
                  properties: {
                    name: { type: "STRING" },
                    keyword_phrases: { type: "ARRAY", minItems: 5, maxItems: 8, items: { type: "STRING" } },
                    keyword_terms: { type: "ARRAY", minItems: 4, maxItems: 10, items: { type: "STRING" } },
                    cubso_segmentos: { type: "ARRAY", minItems: 1, maxItems: 3, items: { type: "STRING", enum: input.segments.map((s) => s.codigo) } },
                    evidence: {
                      type: "ARRAY", minItems: 1, maxItems: 3,
                      items: { type: "OBJECT", required: ["source_url", "excerpt"], properties: { source_url: { type: "STRING" }, excerpt: { type: "STRING" } } },
                    },
                  },
                },
              },
            },
          },
          temperature: 0.1,
          maxOutputTokens: 3200,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) throw new Error("El asistente no pudo generar sugerencias.");
  const payload = await response.json();
  const parsed = JSON.parse(String(payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"));
  const allowedCodes = new Set(input.segments.map((s) => s.codigo));
  const forbidden = new Set(companyAnalysisConfig.keyword_scoring.forbidden_terms);
  const providerText = normalizeSearchText(`${input.name} ${input.description} ${input.pages.map((page) => page.text).join(" ")}`);
  const isLegalProvider = /\b(abogad[oa]s?|estudio juridico|firma legal|servicios legales|asesoria legal|derecho corporativo)\b/.test(providerText);
  const seen = new Set<string>();
  const lines: BusinessLine[] = (Array.isArray(parsed.business_lines) ? parsed.business_lines : []).slice(0, 5).map((line: any) => {
    const clean = (values: unknown, kind: "phrase" | "term") => [...new Set((Array.isArray(values) ? values : [])
      .map((value) => String(value).trim().toLowerCase()).filter((value) => {
        const normalized = normalizeSearchText(value);
        if (!normalized || seen.has(normalized)) return false;
        const words = normalized.split(" ");
        if (kind === "phrase" ? words.length < 2 || words.length > 4 : words.length !== 1 || forbidden.has(normalized)) return false;
        seen.add(normalized); return true;
      }))];
    const keyword_phrases = clean(line?.keyword_phrases, "phrase").slice(0, 8);
    const keyword_terms = clean(line?.keyword_terms, "term").slice(0, 10);
    const requestedCodes = [...new Set<string>((Array.isArray(line?.cubso_segmentos) ? line.cubso_segmentos : []).map(String).filter((code: string) => allowedCodes.has(code)))].slice(0, 3);
    const lineText = normalizeSearchText(`${line?.name ?? ""} ${keyword_phrases.join(" ")} ${keyword_terms.join(" ")}`);
    const cubso_segmentos = isLegalProvider && !/\b(capacitacion|formacion|curso|software|desarrollo tecnologico)\b/.test(lineText)
      ? allowedCodes.has("80") ? ["80"] : requestedCodes
      : requestedCodes;
    return {
      name: String(line?.name ?? "").trim().slice(0, 90),
      keyword_phrases,
      keyword_terms,
      keywords: [...keyword_phrases, ...keyword_terms],
      cubso_segmentos,
      evidence: (Array.isArray(line?.evidence) ? line.evidence : []).slice(0, 3).map((item: any) => ({ source_url: String(item?.source_url ?? "").slice(0, 500), excerpt: String(item?.excerpt ?? "").trim().slice(0, 280) })).filter((item: Evidence) => item.source_url && item.excerpt),
    };
  }).filter((line: BusinessLine) => line.name && line.keyword_phrases.length >= 3 && line.keyword_terms.length >= 1 && line.cubso_segmentos.length);
  if (!lines.length) throw new Error("El análisis no produjo líneas de negocio verificables.");
  console.info("company_analysis", JSON.stringify({ model, prompt_version: companyAnalysisConfig.prompt.version, pages: input.pages.map((p) => ({ url: p.url, chars: p.text.length })), latency_ms: Date.now() - startedAt, business_lines: lines.length }));
  return { summary: String(parsed.summary ?? "").trim().slice(0, 280), business_lines: lines };
}

async function segments2026() {
  const result = await query<Segment>(`SELECT s.codigo, s.nombre, EXISTS (SELECT 1 FROM mvp_enabled_cubso_segments e WHERE e.codigo=s.codigo AND e.anio=s.anio AND e.enabled=true) AS enabled FROM cat_cubso_segmentos s WHERE s.anio=2026 ORDER BY s.codigo::int`);
  if (!result.rows.length) throw new Error("El catálogo CUBSO 2026 todavía no está sincronizado.");
  return result.rows;
}

export async function POST(request: NextRequest) {
  await requireTenantId();
  const body = await request.json();
  const name = String(body.name ?? "").trim().slice(0, 160);
  const description = String(body.description ?? "").trim().slice(0, 5_000);
  const website = String(body.website ?? "").trim().slice(0, 500);
  if (!name) return NextResponse.json({ error: "Ingresa el nombre de la empresa." }, { status: 400 });
  if (!website && !description) return NextResponse.json({ error: "Agrega una web o una descripción de los servicios." }, { status: 400 });
  try {
    const segments = await segments2026();
    let websiteError: string | undefined;
    let pages: CompanyWebsitePage[] = [];
    if (website) {
      try { pages = (await readCompanyWebsite(website)).pages; }
      catch (error) {
        websiteError = error instanceof Error ? error.message : "No pudimos leer la web.";
        if (!description) throw error;
      }
    }
    const suggestion = await suggestWithGemini({ name, description, pages, segments });
    return NextResponse.json({ data: { ...suggestion, segments, source: pages.length ? "website" : "description", source_pages: pages.map((page) => ({ url: page.url, chars: page.text.length })), website_error: websiteError } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No pudimos analizar la empresa." }, { status: 422 });
  }
}
