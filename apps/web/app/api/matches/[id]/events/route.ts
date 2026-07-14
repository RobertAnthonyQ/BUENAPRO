import { NextRequest, NextResponse } from "next/server";
import { currentUserId, requireTenantId } from "@/server/auth/tenant";
import { query } from "@/server/db/client";
import { jsonError } from "@/server/services/crud";

async function matchBelongsToTenant(tenantId: string, id: string) {
  const result = await query(
    `
    SELECT 1
    FROM matches m
    JOIN company_profiles cp ON cp.id = m.profile_id
    WHERE cp.tenant_id = $1 AND m.id = $2
    LIMIT 1
    `,
    [tenantId, id],
  );
  return Boolean(result.rows[0]);
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  if (!(await matchBelongsToTenant(tenantId, id))) return jsonError("Not found", 404);
  const result = await query("SELECT * FROM match_events WHERE match_id = $1 ORDER BY created_at DESC, id DESC", [id]);
  return NextResponse.json({ data: result.rows });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const userId = await currentUserId();
  const { id } = await context.params;
  if (!(await matchBelongsToTenant(tenantId, id))) return jsonError("Not found", 404);
  const body = await request.json();
  const result = await query(
    `
    INSERT INTO match_events (match_id, event_type, payload, actor_id)
    VALUES ($1, $2, $3::jsonb, $4)
    RETURNING *
    `,
    [id, body.event_type, JSON.stringify(body.payload ?? {}), userId],
  );
  return NextResponse.json({ data: result.rows[0] }, { status: 201 });
}
