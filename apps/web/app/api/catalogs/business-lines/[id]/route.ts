import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";
import {
  asNullableNumber,
  asRequiredString,
  asSmallInteger,
  asStringArray,
  buildPatch,
  jsonError,
} from "@/server/services/crud";
import { keywordSignals } from "@/server/services/keywordSignals";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const result = await query(
    `
    SELECT bl.*
    FROM business_lines bl
    JOIN company_profiles cp ON cp.id = bl.profile_id
    WHERE cp.tenant_id = $1 AND bl.id = $2
    `,
    [tenantId, id],
  );
  if (!result.rows[0]) return jsonError("Not found", 404);
  return NextResponse.json({ data: result.rows[0] });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;

  try {
    const body = await request.json();
    const hasKeywordPatch = body.keywords != null || body.keyword_phrases != null || body.keyword_terms != null;
    const signals = hasKeywordPatch ? keywordSignals(body) : null;
    const patchBody = signals ? { ...body, ...signals } : body;
    const patch = buildPatch(
      patchBody,
      [
        { column: "nombre", transform: (value) => asRequiredString(value, "nombre") },
        { column: "cubso_segmentos", transform: (value) => asStringArray(value, "cubso_segmentos") },
        { column: "keywords", transform: (value) => asStringArray(value, "keywords") },
        { column: "keyword_phrases", transform: (value) => asStringArray(value, "keyword_phrases") },
        { column: "keyword_terms", transform: (value) => asStringArray(value, "keyword_terms") },
        { column: "ubigeos", transform: (value) => asStringArray(value, "ubigeos") },
        { column: "monto_min", transform: (value) => asNullableNumber(value, "monto_min") },
        { column: "monto_max", transform: (value) => asNullableNumber(value, "monto_max") },
        { column: "score_umbral", transform: (value) => asSmallInteger(value, "score_umbral") },
        { column: "is_active" },
      ],
      3,
    );
    if (!patch.sets.length) return jsonError("No patch fields provided");

    const result = await query(
      `
      UPDATE business_lines bl
      SET ${patch.sets.join(", ")}, updated_at = now()
      FROM company_profiles cp
      WHERE cp.id = bl.profile_id
        AND cp.tenant_id = $1
        AND bl.id = $2
      RETURNING bl.*
      `,
      [tenantId, id, ...patch.values],
    );
    if (!result.rows[0]) return jsonError("Not found", 404);
    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid request");
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const result = await query(
    `
    DELETE FROM business_lines bl
    USING company_profiles cp
    WHERE cp.id = bl.profile_id
      AND cp.tenant_id = $1
      AND bl.id = $2
    RETURNING bl.*
    `,
    [tenantId, id],
  );
  if (!result.rows[0]) return jsonError("Not found", 404);
  return NextResponse.json({ data: result.rows[0] });
}
