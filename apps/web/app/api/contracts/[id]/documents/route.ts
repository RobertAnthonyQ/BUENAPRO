import { NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";
import { tenantCanAccessContract } from "@/server/services/crud";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const idContrato = Number(id);
  if (!(await tenantCanAccessContract(tenantId, idContrato))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const result = await query(
    `
    SELECT *
    FROM contract_documents
    WHERE id_contrato = $1
    ORDER BY id
    `,
    [idContrato],
  );
  return NextResponse.json({ data: result.rows });
}
