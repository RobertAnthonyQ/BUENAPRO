import { NextResponse } from "next/server";
import { currentUserId, requireTenantId } from "@/server/auth/tenant";
import { decideAgentChangeSet } from "@/server/services/applicationChat";

export async function POST(
  _request: Request,
  context: { params: Promise<{ changeSetId: string }> },
) {
  const tenantId = await requireTenantId();
  const actorId = await currentUserId();
  if (!actorId)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  const { changeSetId } = await context.params;
  const result = await decideAgentChangeSet(
    tenantId,
    changeSetId,
    actorId,
    "reject",
  );
  if (result.kind === "not_found")
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result.kind === "already_decided")
    return NextResponse.json({ error: "Already decided" }, { status: 409 });
  return NextResponse.json({ data: result.data });
}
