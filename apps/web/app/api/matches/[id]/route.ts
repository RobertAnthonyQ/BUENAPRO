import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { currentUserId, requireTenantId } from "@/server/auth/tenant";
import { isTrackingState } from "@/server/services/tracking";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const tenantId = await requireTenantId();
  const actorId = await currentUserId();
  const { id } = await context.params;
  const body = await request.json();
  if (body.user_state != null && !isTrackingState(body.user_state)) {
    return NextResponse.json({ error: "Invalid user_state" }, { status: 400 });
  }
  const result = await query(
    `
    UPDATE matches m
    SET user_state = COALESCE($3, user_state),
        responsable_id = CASE WHEN $4::boolean THEN $5::uuid ELSE responsable_id END,
        monto_ofertado = COALESCE($6, monto_ofertado),
        notas = COALESCE($7, notas),
        updated_at = now()
    FROM company_profiles cp
    WHERE cp.id = m.profile_id
      AND cp.tenant_id = $1
      AND m.id = $2
    RETURNING m.*
    `,
    [
      tenantId,
      Number(id),
      body.user_state ?? null,
      Object.prototype.hasOwnProperty.call(body, "responsable_id"),
      body.responsable_id ?? null,
      body.monto_ofertado ?? null,
      body.notas ?? null,
    ],
  );
  if (!result.rows[0])
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  await query(
    "INSERT INTO match_events (match_id, event_type, payload, actor_id) VALUES ($1, 'state_change', $2::jsonb, $3)",
    [Number(id), JSON.stringify(body), actorId],
  );
  return NextResponse.json({ data: result.rows[0] });
}
