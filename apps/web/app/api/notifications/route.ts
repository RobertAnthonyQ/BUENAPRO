import { NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/server/auth/tenant";
import { query } from "@/server/db/client";
import { jsonError, pagination } from "@/server/services/crud";

export async function GET(request: NextRequest) {
  const tenantId = await requireTenantId();
  const { searchParams } = new URL(request.url);
  const { limit, offset, page, pageSize } = pagination(searchParams);
  const values: unknown[] = [tenantId];
  const where = ["tm.tenant_id = $1"];

  if (searchParams.get("status")) {
    values.push(searchParams.get("status"));
    where.push(`n.status = $${values.length}`);
  }
  if (searchParams.get("channel")) {
    values.push(searchParams.get("channel"));
    where.push(`n.channel = $${values.length}`);
  }

  values.push(limit, offset);
  const result = await query(
    `
    SELECT n.*
    FROM notifications n
    JOIN tenant_members tm ON tm.user_id = n.user_id
    WHERE ${where.join(" AND ")}
    ORDER BY n.created_at DESC, n.id DESC
    LIMIT $${values.length - 1}
    OFFSET $${values.length}
    `,
    values,
  );
  return NextResponse.json({ data: result.rows, meta: { page, page_size: pageSize, count: result.rows.length } });
}

export async function POST(request: NextRequest) {
  const tenantId = await requireTenantId();
  const body = await request.json();
  const user = await query("SELECT user_id FROM tenant_members WHERE tenant_id = $1 AND user_id = $2", [
    tenantId,
    body.user_id,
  ]);
  if (!user.rows[0]) return jsonError("User not found in tenant", 404);

  const result = await query(
    `
    INSERT INTO notifications (user_id, match_id, channel, reason, payload, status)
    VALUES ($1, $2, $3, $4, $5::jsonb, COALESCE($6, 'queued'))
    RETURNING *
    `,
    [
      body.user_id,
      body.match_id ?? null,
      body.channel,
      body.reason,
      JSON.stringify(body.payload ?? {}),
      body.status ?? null,
    ],
  );
  return NextResponse.json({ data: result.rows[0] }, { status: 201 });
}
