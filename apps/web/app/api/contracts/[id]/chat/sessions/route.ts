import { NextResponse } from "next/server";
import { currentUserId, requireTenantId } from "@/server/auth/tenant";
import {
  createChatSession,
  listChatSessions,
} from "@/server/services/applicationChat";

function contractId(raw: string) {
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const tenantId = await requireTenantId();
  const idContrato = contractId((await context.params).id);
  if (!idContrato)
    return NextResponse.json({ error: "Invalid contract" }, { status: 400 });
  return NextResponse.json({
    data: await listChatSessions(tenantId, idContrato),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const tenantId = await requireTenantId();
  const actorId = await currentUserId();
  const idContrato = contractId((await context.params).id);
  if (!idContrato)
    return NextResponse.json({ error: "Invalid contract" }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const data = await createChatSession(
    tenantId,
    idContrato,
    actorId,
    body.title,
  );
  return data
    ? NextResponse.json({ data }, { status: 201 })
    : NextResponse.json({ error: "Contract not found" }, { status: 404 });
}
