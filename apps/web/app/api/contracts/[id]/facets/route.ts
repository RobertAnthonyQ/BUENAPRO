import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";
import { tenantCanAccessContract } from "@/server/services/crud";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const idContrato = Number(id);
  if (!(await tenantCanAccessContract(tenantId, idContrato))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const result = await query(
    `
    SELECT *
    FROM requirement_facets
    WHERE id_contrato = $1 AND is_current = true
    ORDER BY facet, id
    `,
    [idContrato],
  );
  return NextResponse.json({ data: result.rows });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const idContrato = Number(id);
  if (!(await tenantCanAccessContract(tenantId, idContrato))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json();
  const hash = await import("node:crypto").then((crypto) =>
    crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex"),
  );
  const result = await query(
    `
    INSERT INTO requirement_facets (
      id_contrato, facet, label, required, details_json, evidence_json, facet_hash, is_current
    )
    VALUES ($1, $2, $3, COALESCE($4, true), $5::jsonb, $6::jsonb, $7, true)
    RETURNING *
    `,
    [idContrato, body.facet, body.label, body.required ?? true, JSON.stringify(body.details_json ?? {}), JSON.stringify(body.evidence_json ?? []), hash],
  );
  return NextResponse.json({ data: result.rows[0] }, { status: 201 });
}
