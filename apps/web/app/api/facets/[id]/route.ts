import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";
import { tenantCanAccessContract } from "@/server/services/crud";

async function getFacetForTenant(tenantId: string, id: number) {
  const result = await query("SELECT * FROM requirement_facets WHERE id = $1", [id]);
  const facet = result.rows[0];
  if (!facet) return null;
  if (!(await tenantCanAccessContract(tenantId, Number(facet.id_contrato)))) return null;
  return facet;
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  if (!(await getFacetForTenant(tenantId, Number(id)))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json();
  const hash = await import("node:crypto").then((crypto) =>
    crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex"),
  );
  const result = await query(
    `
    UPDATE requirement_facets
    SET facet = COALESCE($2, facet),
        label = COALESCE($3, label),
        required = COALESCE($4, required),
        details_json = COALESCE($5::jsonb, details_json),
        evidence_json = COALESCE($6::jsonb, evidence_json),
        facet_hash = $7
    WHERE id = $1
    RETURNING *
    `,
    [
      Number(id),
      body.facet ?? null,
      body.label ?? null,
      body.required ?? null,
      body.details_json ? JSON.stringify(body.details_json) : null,
      body.evidence_json ? JSON.stringify(body.evidence_json) : null,
      hash,
    ],
  );
  return NextResponse.json({ data: result.rows[0] });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  if (!(await getFacetForTenant(tenantId, Number(id)))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const result = await query(
    "UPDATE requirement_facets SET is_current = false WHERE id = $1 RETURNING *",
    [Number(id)],
  );
  return NextResponse.json({ data: result.rows[0] });
}
