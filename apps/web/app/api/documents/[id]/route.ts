import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";
import { tenantCanAccessContract } from "@/server/services/crud";

async function getDocumentForTenant(tenantId: string, id: number) {
  const result = await query("SELECT * FROM contract_documents WHERE id = $1", [id]);
  const doc = result.rows[0];
  if (!doc) return null;
  if (!(await tenantCanAccessContract(tenantId, Number(doc.id_contrato)))) return null;
  return doc;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const doc = await getDocumentForTenant(tenantId, Number(id));
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: doc });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const doc = await getDocumentForTenant(tenantId, Number(id));
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json();
  const result = await query(
    `
    UPDATE contract_documents
    SET doc_class = COALESCE($2, doc_class),
        has_text_layer = COALESCE($3, has_text_layer),
        updated_at = now()
    WHERE id = $1
    RETURNING *
    `,
    [Number(id), body.doc_class ?? null, body.has_text_layer ?? null],
  );
  return NextResponse.json({ data: result.rows[0] });
}
