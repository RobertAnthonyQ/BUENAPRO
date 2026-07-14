import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";
import {
  asJson,
  asPositiveInteger,
  asRequiredString,
  jsonError,
  requireTenantContractAccess,
} from "@/server/services/crud";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const idContrato = asPositiveInteger(id, "id");
  const denied = await requireTenantContractAccess(tenantId, idContrato);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const values: unknown[] = [idContrato];
  const where = ["id_contrato = $1"];

  if (searchParams.get("current") !== "false") where.push("is_current = true");
  if (searchParams.get("facet")) {
    values.push(searchParams.get("facet"));
    where.push(`facet = $${values.length}`);
  }

  const result = await query(
    `
    SELECT *
    FROM requirement_facets
    WHERE ${where.join(" AND ")}
    ORDER BY facet, id
    `,
    values,
  );
  return NextResponse.json({ data: result.rows });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const idContrato = asPositiveInteger(id, "id");
  const denied = await requireTenantContractAccess(tenantId, idContrato);
  if (denied) return denied;

  try {
    const body = await request.json();
    const result = await query(
      `
      INSERT INTO requirement_facets (
        id_contrato, extraction_id, facet, label, required, details_json,
        evidence_json, facet_hash, is_current
      )
      VALUES ($1, $2, $3, $4, COALESCE($5, true), $6::jsonb, $7::jsonb, $8, COALESCE($9, true))
      RETURNING *
      `,
      [
        idContrato,
        body.extraction_id ?? null,
        asRequiredString(body.facet, "facet"),
        asRequiredString(body.label, "label"),
        body.required ?? null,
        asJson(body.details_json, {}),
        asJson(body.evidence_json, []),
        body.facet_hash ?? `${idContrato}:${body.facet}:${body.label}`,
        body.is_current ?? null,
      ],
    );
    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid request");
  }
}
