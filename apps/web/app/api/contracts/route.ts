import { NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/server/auth/tenant";
import { listContractsForTenant } from "@/server/services/contracts";

export async function GET(request: NextRequest) {
  const tenantId = await requireTenantId();
  const result = await listContractsForTenant(tenantId, request.nextUrl.searchParams);
  return NextResponse.json(result);
}
