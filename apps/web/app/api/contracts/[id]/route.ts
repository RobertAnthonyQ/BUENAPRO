import { NextResponse } from "next/server";
import { requireTenantId } from "@/server/auth/tenant";
import { getContractForTenant } from "@/server/services/contracts";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const data = await getContractForTenant(tenantId, Number(id));
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
