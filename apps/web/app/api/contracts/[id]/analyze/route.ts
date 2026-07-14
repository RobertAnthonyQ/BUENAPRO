import { NextRequest, NextResponse } from "next/server";
import { currentUserId, requireTenantId } from "@/server/auth/tenant";
import { analyzeMatchDirect } from "@/server/services/matchAnalysis";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const tenantId = await requireTenantId();
  const actorId = await currentUserId();
  const { id } = await context.params;
  const idContrato = Number(id);
  if (!Number.isFinite(idContrato)) {
    return NextResponse.json({ error: "Contrato invalido" }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));

  try {
    const data = await analyzeMatchDirect({
      tenantId,
      idContrato,
      actorId,
      force: Boolean(body?.force),
    });
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo completar el análisis.";
    const status = message.includes("perfil activo")
      ? 409
      : message.includes("licitación")
        ? 404
        : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
