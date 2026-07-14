import { NextResponse } from "next/server";
import { currentUserId, requireTenantId } from "@/server/auth/tenant";
import {
  getApplication,
  updateApplication,
} from "@/server/services/applications";

export async function GET(
  _request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const tenantId = await requireTenantId();
  const matchId = Number((await context.params).matchId);
  if (!Number.isSafeInteger(matchId))
    return NextResponse.json({ error: "Invalid application" }, { status: 400 });
  const data = await getApplication(tenantId, matchId);
  return data
    ? NextResponse.json({ data })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const tenantId = await requireTenantId();
  const actorId = await currentUserId();
  const matchId = Number((await context.params).matchId);
  if (!Number.isSafeInteger(matchId))
    return NextResponse.json({ error: "Invalid application" }, { status: 400 });
  const data = await updateApplication(
    tenantId,
    matchId,
    await request.json(),
    actorId,
  );
  return data
    ? NextResponse.json({ data })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}
