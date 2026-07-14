import { NextResponse } from "next/server";
import { requireTenantId } from "@/server/auth/tenant";
import { getChatSession } from "@/server/services/applicationChat";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const tenantId = await requireTenantId();
  const { sessionId } = await context.params;
  const data = await getChatSession(tenantId, sessionId);
  return data
    ? NextResponse.json({ data })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}
