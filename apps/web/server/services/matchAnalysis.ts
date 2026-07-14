import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pool } from "@/server/db/client";
import { ensureServerEnv } from "@/server/env";

const PROMPT_VERSION = "match_analysis_v2";
const SCORE_BANDS = {
  verde: [85, 100],
  ambar: [50, 84],
  gris: [30, 49],
  rojo: [0, 29],
} as const;
const STATES = new Set([
  "cumple",
  "cumple_con_accion",
  "no_cumple",
  "requiere_revision",
]);
const CATEGORIES = new Set([
  "experiencia_economica",
  "experiencia",
  "personal_clave",
  "formacion",
  "licencia",
  "seguro",
  "equipamiento",
  "certificacion",
  "documentacion",
  "identidad",
  "otro",
]);

type JsonRecord = Record<string, unknown>;
type Verdict = keyof typeof SCORE_BANDS;
type Requirement = {
  requisito: string;
  categoria: string;
  estado: string;
  critico: boolean;
  gap: string | null;
  accion: string | null;
};

export type DirectMatchAnalysisResult =
  | { skipped: "unchanged"; match_id: number }
  | { match_id: number; verdict: Verdict; score: number };

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function clip(value: unknown, limit: number): string | null {
  const text =
    typeof value === "string" ? value.trim() : String(value ?? "").trim();
  if (!text) return null;
  if (text.length <= limit) return text;
  const cut = text
    .slice(0, limit)
    .replace(/\s+\S*$/, "")
    .trim();
  return `${cut || text.slice(0, limit)}…`;
}

function canonicalHash(value: unknown): string {
  // El payload usado aquí es una lista ordenada de strings, equivalente al
  // canonical_hash del worker para facets_hash.
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function clampScore(verdict: Verdict, score: number): number {
  const [low, high] = SCORE_BANDS[verdict];
  return Math.max(low, Math.min(high, Math.trunc(score)));
}

function economicCapacity(profile: JsonRecord): number {
  return Math.max(
    0,
    ...Object.values(record(profile.econ_experience_json))
      .map(Number)
      .filter(Number.isFinite),
  );
}

function requiredEconomicAmount(facets: JsonRecord[]): number | null {
  const amounts = facets
    .filter((facet) => facet.facet === "economic_experience")
    .map((facet) => Number(record(facet.details_json).monto))
    .filter(Number.isFinite);
  return amounts.length ? Math.max(...amounts) : null;
}

function applyEconomicRule(
  requirements: Requirement[],
  required: number | null,
  capacity: number,
) {
  if (!required || required <= 0) return;
  const ratio = capacity / required;
  for (const requirement of requirements) {
    if (requirement.categoria !== "experiencia_economica") continue;
    if (ratio >= 1) {
      requirement.estado = "cumple";
      requirement.gap = null;
      requirement.accion = null;
    } else if (ratio >= 0.3) {
      requirement.estado = "cumple_con_accion";
      requirement.gap = `Acreditas S/ ${capacity.toLocaleString("en-US", { maximumFractionDigits: 0 })} de S/ ${required.toLocaleString("en-US", { maximumFractionDigits: 0 })} exigidos.`;
      requirement.accion = `Formar consorcio para cubrir S/ ${(required - capacity).toLocaleString("en-US", { maximumFractionDigits: 0 })}.`;
    } else {
      requirement.estado = "no_cumple";
      requirement.gap = `Acreditas S/ ${capacity.toLocaleString("en-US", { maximumFractionDigits: 0 })} de S/ ${required.toLocaleString("en-US", { maximumFractionDigits: 0 })} exigidos (menos del 30%).`;
      requirement.accion =
        "Formar consorcio con un socio que cubra la mayor parte.";
    }
  }
}

function deriveVerdict(requirements: Requirement[]): Verdict {
  if (!requirements.length) return "gris";
  if (requirements.some((r) => r.estado === "no_cumple" && r.critico))
    return "rojo";
  if (requirements.some((r) => r.estado === "requiere_revision" && r.critico))
    return "gris";
  if (requirements.some((r) => r.estado !== "cumple")) return "ambar";
  return "verde";
}

function stateSet(
  requirements: Array<Record<string, unknown> | Partial<Requirement>>,
): Set<string> {
  return new Set(
    requirements
      .map(
        (r) =>
          `${String(r.requisito ?? "")
            .trim()
            .toLowerCase()}\0${String(r.estado ?? "")}`,
      )
      .filter((entry) => !entry.startsWith("\0")),
  );
}

function sameSet(left: Set<string>, right: Set<string>) {
  return (
    left.size === right.size && [...left].every((value) => right.has(value))
  );
}

function prompt(): string {
  const candidates = [
    path.resolve(
      process.cwd(),
      "../../workers/seace/prompts/match_analysis_v2.txt",
    ),
    path.resolve(process.cwd(), "workers/seace/prompts/match_analysis_v2.txt"),
    "/app/workers/seace/prompts/match_analysis_v2.txt",
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("No se encontró el prompt match_analysis_v2.");
  return fs.readFileSync(found, "utf8");
}

const responseSchema = {
  type: "OBJECT",
  required: [
    "veredicto",
    "score",
    "resumen",
    "requisitos",
    "acciones_recomendadas",
  ],
  properties: {
    veredicto: { type: "STRING", enum: ["verde", "ambar", "rojo", "gris"] },
    score: { type: "INTEGER", minimum: 0, maximum: 100 },
    resumen: { type: "STRING" },
    requisitos: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: [
          "requisito",
          "categoria",
          "estado",
          "critico",
          "gap",
          "accion",
        ],
        properties: {
          requisito: { type: "STRING" },
          categoria: { type: "STRING", enum: [...CATEGORIES] },
          estado: { type: "STRING", enum: [...STATES] },
          critico: { type: "BOOLEAN" },
          gap: { type: "STRING", nullable: true },
          accion: { type: "STRING", nullable: true },
        },
      },
    },
    acciones_recomendadas: {
      type: "ARRAY",
      maxItems: 4,
      items: { type: "STRING" },
    },
  },
};

async function callGemini(body: JsonRecord) {
  ensureServerEnv();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini no está configurado.");
  const primary = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
  const fallback = process.env.GEMINI_FALLBACK_MODEL ?? "gemini-2.5-flash";
  let lastError: unknown;
  for (const model of [...new Set([primary, fallback])]) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: prompt() }] },
            contents: [
              { role: "user", parts: [{ text: JSON.stringify(body) }] },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema,
              temperature: 0,
              maxOutputTokens: 8192,
            },
          }),
          signal: AbortSignal.timeout(60_000),
        },
      );
      if (!response.ok)
        throw new Error(`Gemini respondió HTTP ${response.status}.`);
      const payload = record(await response.json());
      const candidate = record(list(payload.candidates)[0]);
      if (String(candidate.finishReason ?? "").includes("MAX_TOKENS")) {
        throw new Error("El análisis de Gemini fue truncado.");
      }
      const content = record(candidate.content);
      const text = String(record(list(content.parts)[0]).text ?? "");
      if (!text) throw new Error("Gemini devolvió una respuesta vacía.");
      const parsed = record(JSON.parse(text));
      const usage = record(payload.usageMetadata);
      const inputTokens = Number(usage.promptTokenCount ?? 0) || 0;
      const outputTokens = Number(usage.candidatesTokenCount ?? 0) || 0;
      const prices =
        model === "gemini-3.1-flash-lite"
          ? { input: 0.25, output: 1.5 }
          : model === "gemini-2.5-flash-lite"
            ? { input: 0.1, output: 0.4 }
            : { input: 0.3, output: 2.5 };
      return {
        parsed,
        model,
        inputTokens,
        outputTokens,
        costUsd:
          (inputTokens * prices.input + outputTokens * prices.output) /
          1_000_000,
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("No se pudo ejecutar el análisis.");
}

/** Analiza perfil vs. licitación en el backend web, sin crear jobs del worker. */
export async function analyzeMatchDirect(input: {
  tenantId: string;
  idContrato: number;
  profileId?: string;
  actorId?: string | null;
  force?: boolean;
}): Promise<DirectMatchAnalysisResult> {
  const profileResult = await pool.query(
    `SELECT * FROM company_profiles
     WHERE tenant_id=$1 AND is_active=true AND ($2::uuid IS NULL OR id=$2::uuid)
     ORDER BY updated_at DESC LIMIT 1`,
    [input.tenantId, input.profileId ?? null],
  );
  const profile = profileResult.rows[0] as JsonRecord | undefined;
  if (!profile)
    throw new Error("No se encontró un perfil activo para esta empresa.");

  const contractResult = await pool.query(
    `SELECT c.codigo, c.descripcion, c.entidad_nombre, te.summary_json
     FROM seace_contracts c
     LEFT JOIN LATERAL (
       SELECT tx.summary_json FROM contract_documents d
       JOIN tdr_extractions tx ON tx.contract_document_id=d.id AND tx.is_current=true
       WHERE d.id_contrato=c.id_contrato ORDER BY tx.created_at DESC LIMIT 1
     ) te ON true WHERE c.id_contrato=$1`,
    [input.idContrato],
  );
  const contract = contractResult.rows[0] as JsonRecord | undefined;
  if (!contract) throw new Error("No se encontró la licitación.");

  const facetsResult = await pool.query(
    `SELECT facet, label, required, details_json, facet_hash
     FROM requirement_facets WHERE id_contrato=$1 AND is_current=true ORDER BY facet,id`,
    [input.idContrato],
  );
  const facets = facetsResult.rows as JsonRecord[];
  const facetsHash = canonicalHash(
    facets.map((row) => String(row.facet_hash)).sort(),
  );
  const profileHash = String(profile.profile_hash ?? "");
  const existingResult = await pool.query(
    `SELECT id, verdict, score, breakdown_json FROM matches
     WHERE profile_id=$1 AND id_contrato=$2`,
    [profile.id, input.idContrato],
  );
  const existing = existingResult.rows[0] as JsonRecord | undefined;
  const existingBreakdown = record(existing?.breakdown_json);
  const meta = record(existingBreakdown.meta);
  if (
    existing &&
    !input.force &&
    meta.facets_hash === facetsHash &&
    meta.profile_hash === profileHash
  ) {
    return { skipped: "unchanged", match_id: Number(existing.id) };
  }

  const previousRequirements = list(existingBreakdown.requisitos).map(record);
  const previous =
    existing && previousRequirements.length
      ? {
          veredicto: existing.verdict,
          score: existing.score,
          requisitos: previousRequirements.map((item) => ({
            requisito: item.requisito,
            categoria: item.categoria,
            estado: item.estado,
            critico: item.critico,
          })),
        }
      : null;
  const result = await callGemini({
    perfil: {
      razon_social: profile.razon_social,
      ruc: profile.ruc,
      identity_json: profile.identity_json,
      team_json: profile.team_json,
      experience_json: profile.experience_json,
      econ_experience_json: profile.econ_experience_json,
      equipment_json: profile.equipment_json,
      certifications_json: profile.certifications_json,
      hireable_roles_json: profile.hireable_roles_json,
    },
    oportunidad: {
      codigo: contract.codigo,
      descripcion: contract.descripcion,
      entidad: contract.entidad_nombre,
      resumen: contract.summary_json,
    },
    requisitos: facets
      .filter((facet) => facet.facet !== "penalty_condition")
      .map((facet) => ({
        tipo: facet.facet,
        requisito: facet.label,
        obligatorio: facet.required,
        detalle: facet.details_json,
      })),
    ...(previous ? { analisis_previo: previous } : {}),
  });
  const rawRequirements = list(result.parsed.requisitos).map(record);
  const requirements: Requirement[] = rawRequirements.map((item) => ({
    requisito: clip(item.requisito, 90) ?? "Requisito",
    categoria: CATEGORIES.has(String(item.categoria))
      ? String(item.categoria)
      : "otro",
    estado: STATES.has(String(item.estado))
      ? String(item.estado)
      : "requiere_revision",
    critico: Boolean(item.critico),
    gap: clip(item.gap, 140),
    accion: clip(item.accion, 110),
  }));
  applyEconomicRule(
    requirements,
    requiredEconomicAmount(facets),
    economicCapacity(profile),
  );
  let verdict = deriveVerdict(requirements);
  let score = clampScore(verdict, Number(result.parsed.score ?? 0));
  if (
    existing &&
    previous &&
    sameSet(stateSet(requirements), stateSet(previous.requisitos))
  ) {
    verdict = String(existing.verdict) as Verdict;
    score = clampScore(verdict, Number(existing.score));
  }
  const analyzedAt = new Date().toISOString();
  const breakdown = {
    resumen: clip(result.parsed.resumen, 320),
    requisitos: requirements,
    acciones_recomendadas: list(result.parsed.acciones_recomendadas)
      .slice(0, 4)
      .map((item) => clip(item, 110))
      .filter(Boolean),
    meta: {
      model: result.model,
      prompt_version: PROMPT_VERSION,
      profile_hash: profileHash,
      facets_hash: facetsHash,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      cost_usd: result.costUsd,
      analyzed_at: analyzedAt,
      execution: "web_direct",
    },
  };
  const missing = requirements
    .filter((item) => item.estado !== "cumple")
    .map((item) => ({
      facet: item.categoria,
      label: item.requisito,
      estado: item.estado,
      accion: item.accion,
      gap: item.gap,
      critico: item.critico,
    }));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const saved = await client.query(
      `INSERT INTO matches (profile_id,id_contrato,score,verdict,breakdown_json,missing_actions_json,updated_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,now())
       ON CONFLICT (profile_id,id_contrato) DO UPDATE SET
         score=EXCLUDED.score, verdict=EXCLUDED.verdict,
         breakdown_json=EXCLUDED.breakdown_json,
         missing_actions_json=EXCLUDED.missing_actions_json,
         matched_at=now(), updated_at=now()
       RETURNING id`,
      [
        profile.id,
        input.idContrato,
        score,
        verdict,
        JSON.stringify(breakdown),
        JSON.stringify(missing),
      ],
    );
    const matchId = Number(saved.rows[0].id);
    await client.query(
      `INSERT INTO match_events (match_id,event_type,payload,actor_id)
       VALUES (
         $1,
         'ai_analysis_completed',
         $2::jsonb,
         CASE WHEN EXISTS (
           SELECT 1 FROM tenant_members WHERE tenant_id=$4::uuid AND user_id=$3::uuid
         ) THEN $3::uuid ELSE NULL END
       )`,
      [
        matchId,
        JSON.stringify({
          verdict,
          score,
          previous_verdict: existing?.verdict ?? null,
          previous_score: existing?.score ?? null,
          model: result.model,
          prompt_version: PROMPT_VERSION,
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
          cost_usd: result.costUsd,
          execution: "web_direct",
        }),
        input.actorId ?? null,
        input.tenantId,
      ],
    );
    await client.query(
      `UPDATE worker_jobs SET status='done',finished_at=now(),last_error=NULL
       WHERE job_type='analyze_match' AND status='pending'
         AND payload->>'profile_id' IN (
           SELECT id::text FROM company_profiles WHERE tenant_id=$1
         )
         AND (payload->>'id_contrato')::bigint=$2`,
      [input.tenantId, input.idContrato],
    );
    await client.query("COMMIT");
    return { match_id: matchId, verdict, score };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
