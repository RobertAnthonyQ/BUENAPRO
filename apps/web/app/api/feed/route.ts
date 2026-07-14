import { NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/server/auth/tenant";
import { getFeed } from "@/server/services/feed";

export async function GET(request: NextRequest) {
  const tenantId = await requireTenantId();
  const rows = await getFeed(tenantId, request.nextUrl.searchParams);
  return NextResponse.json({ data: rows });
}
