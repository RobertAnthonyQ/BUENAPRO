import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";

export async function GET() {
  const tenantId = await requireTenantId();
  const result = await query(
    `
    SELECT p.*
    FROM notification_preferences p
    JOIN users u ON u.id = p.user_id
    JOIN tenant_members tm ON tm.user_id = u.id
    WHERE tm.tenant_id = $1
    ORDER BY p.channel
    `,
    [tenantId],
  );
  return NextResponse.json({ data: result.rows });
}

export async function PUT(request: NextRequest) {
  const tenantId = await requireTenantId();
  const body = await request.json();
  const member = await query("SELECT user_id FROM tenant_members WHERE tenant_id = $1 LIMIT 1", [tenantId]);
  if (!member.rows[0]) return NextResponse.json({ error: "User required" }, { status: 400 });
  const result = await query(
    `
    INSERT INTO notification_preferences (
      tenant_id, user_id, channel, mode, max_alerts_per_day, quiet_hours_json
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    ON CONFLICT (user_id, business_line_id, channel)
    DO UPDATE SET
      mode = EXCLUDED.mode,
      max_alerts_per_day = EXCLUDED.max_alerts_per_day,
      quiet_hours_json = EXCLUDED.quiet_hours_json,
      updated_at = now()
    RETURNING *
    `,
    [tenantId, member.rows[0].user_id, body.channel, body.mode ?? "realtime", body.max_alerts_per_day ?? 5, JSON.stringify(body.quiet_hours_json ?? {})],
  );
  return NextResponse.json({ data: result.rows[0] });
}
