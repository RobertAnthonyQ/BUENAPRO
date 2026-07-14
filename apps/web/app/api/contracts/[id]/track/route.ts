import { NextRequest, NextResponse } from "next/server";
import { currentUserId, requireTenantId } from "@/server/auth/tenant";
import { trackContractForTenant } from "@/server/services/tracking";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const actorId = await currentUserId();
  const { id } = await context.params;
  const body = await request.json();
  const result = await trackContractForTenant(tenantId, Number(id), body, actorId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}
