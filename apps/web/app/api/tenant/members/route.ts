import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";

export async function GET() {
  const tenantId = await requireTenantId();
  const result = await query(
    `
    SELECT u.id, u.email, u.name, u.phone, tm.role, tm.created_at
    FROM tenant_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.tenant_id = $1
    ORDER BY tm.created_at
    `,
    [tenantId],
  );
  return NextResponse.json({ data: result.rows });
}

export async function POST(request: NextRequest) {
  const tenantId = await requireTenantId();
  const body = await request.json();
  const user = await query(
    `
    INSERT INTO users (email, name)
    VALUES ($1, $2)
    ON CONFLICT (email)
    DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name), updated_at = now()
    RETURNING id, email, name
    `,
    [body.email, body.name ?? body.email],
  );
  const result = await query(
    `
    INSERT INTO tenant_members (tenant_id, user_id, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (tenant_id, user_id)
    DO UPDATE SET role = EXCLUDED.role
    RETURNING *
    `,
    [tenantId, user.rows[0].id, body.role ?? "member"],
  );
  return NextResponse.json({ data: result.rows[0] }, { status: 201 });
}
