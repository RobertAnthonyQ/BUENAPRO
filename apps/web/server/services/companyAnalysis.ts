import fs from "node:fs";
import path from "node:path";
import analysisConfig from "../../config/company-analysis.json" with { type: "json" };

export type CompanyAnalysisConfig = typeof analysisConfig;

export const companyAnalysisConfig: CompanyAnalysisConfig = analysisConfig;

let promptTemplate: string | null = null;

function promptCandidates(filename: string) {
  return [
    path.resolve(process.cwd(), "prompts", filename),
    path.resolve(process.cwd(), "apps/web/prompts", filename),
    path.resolve(process.cwd(), "../../apps/web/prompts", filename),
    path.resolve("/app/apps/web/prompts", filename),
  ];
}

export function readCompanyAnalysisPrompt() {
  if (promptTemplate) return promptTemplate;
  const filename = companyAnalysisConfig.prompt.filename;
  const found = promptCandidates(filename).find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`No se encontró el prompt versionado ${filename}.`);
  promptTemplate = fs.readFileSync(found, "utf8").trim();
  return promptTemplate;
}

export function renderCompanyAnalysisInput(input: {
  companyName: string;
  sources: Array<{ url: string; text: string }>;
  description?: string;
  catalog: string;
}) {
  const blocks = input.sources
    .map((source) => `<source url=${JSON.stringify(source.url)}>\n${source.text}\n</source>`)
    .join("\n\n");
  return [
    `EMPRESA: ${input.companyName}`,
    `CATÁLOGO CUBSO 2026 (únicos códigos permitidos):\n${input.catalog}`,
    input.description ? `DESCRIPCIÓN DECLARADA:\n${input.description}` : "",
    blocks ? `PÁGINAS PÚBLICAS:\n${blocks}` : "",
  ].filter(Boolean).join("\n\n");
}

export function onboardingGeminiModel() {
  const model = process.env.GEMINI_ONBOARDING_MODEL ?? process.env.GEMINI_MODEL;
  if (!model) throw new Error("Configura GEMINI_ONBOARDING_MODEL o GEMINI_MODEL.");
  return model;
}

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
