import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";
import {
  asJson,
  asPositiveInteger,
  asRequiredString,
  buildPatch,
  jsonError,
  requireTenantContractAccess,
} from "@/server/services/crud";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string; facetId: string }> }) {
  const tenantId = await requireTenantId();
  const { id, facetId } = await context.params;
  const idContrato = asPositiveInteger(id, "id");
  const denied = await requireTenantContractAccess(tenantId, idContrato);
  if (denied) return denied;

  const result = await query("SELECT * FROM requirement_facets WHERE id_contrato = $1 AND id = $2", [
    idContrato,
    asPositiveInteger(facetId, "facetId"),
  ]);
  if (!result.rows[0]) return jsonError("Not found", 404);
  return NextResponse.json({ data: result.rows[0] });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string; facetId: string }> }) {
  const tenantId = await requireTenantId();
  const { id, facetId } = await context.params;
  const idContrato = asPositiveInteger(id, "id");
  const denied = await requireTenantContractAccess(tenantId, idContrato);
  if (denied) return denied;

  try {
    const body = await request.json();
    const patch = buildPatch(
      body,
      [
        { column: "extraction_id" },
        { column: "facet", transform: (value) => asRequiredString(value, "facet") },
        { column: "label", transform: (value) => asRequiredString(value, "label") },
        { column: "required" },
        { column: "details_json", cast: "::jsonb", transform: (value) => asJson(value, {}) },
        { column: "evidence_json", cast: "::jsonb", transform: (value) => asJson(value, []) },
        { column: "facet_hash", transform: (value) => asRequiredString(value, "facet_hash") },
        { column: "is_current" },
      ],
      3,
    );
    if (!patch.sets.length) return jsonError("No patch fields provided");

    const result = await query(
      `
      UPDATE requirement_facets
      SET ${patch.sets.join(", ")}
      WHERE id_contrato = $1 AND id = $2
      RETURNING *
      `,
      [idContrato, asPositiveInteger(facetId, "facetId"), ...patch.values],
    );
    if (!result.rows[0]) return jsonError("Not found", 404);
    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid request");
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string; facetId: string }> }) {
  const tenantId = await requireTenantId();
  const { id, facetId } = await context.params;
  const idContrato = asPositiveInteger(id, "id");
  const denied = await requireTenantContractAccess(tenantId, idContrato);
  if (denied) return denied;

  const result = await query("DELETE FROM requirement_facets WHERE id_contrato = $1 AND id = $2 RETURNING *", [
    idContrato,
    asPositiveInteger(facetId, "facetId"),
  ]);
  if (!result.rows[0]) return jsonError("Not found", 404);
  return NextResponse.json({ data: result.rows[0] });
}
