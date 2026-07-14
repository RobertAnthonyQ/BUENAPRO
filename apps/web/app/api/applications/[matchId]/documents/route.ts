import { NextResponse } from "next/server";
import { requireTenantId } from "@/server/auth/tenant";
import { updateApplicationDocument } from "@/server/services/applications";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const tenantId = await requireTenantId();
  const matchId = Number((await context.params).matchId);
  if (!Number.isSafeInteger(matchId))
    return NextResponse.json({ error: "Invalid application" }, { status: 400 });
  const data = await updateApplicationDocument(
    tenantId,
    matchId,
    await request.json(),
  );
  return data
    ? NextResponse.json({ data })
    : NextResponse.json({ error: "Document not found" }, { status: 404 });
}
