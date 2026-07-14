import { NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/server/auth/tenant";
import { query } from "@/server/db/client";

export async function GET() {
  const tenantId = await requireTenantId();
  const result = await query("SELECT id, name, plan, created_at, updated_at FROM tenants WHERE id = $1", [tenantId]);
  return NextResponse.json({ data: result.rows[0] ?? null });
}

export async function PATCH(request: NextRequest) {
  const tenantId = await requireTenantId();
  const body = await request.json();
  const result = await query(
    `
    UPDATE tenants
    SET
      name = COALESCE($2, name),
      plan = COALESCE($3, plan),
      updated_at = now()
    WHERE id = $1
    RETURNING id, name, plan, created_at, updated_at
    `,
    [tenantId, body.name ?? null, body.plan ?? null],
  );
  return NextResponse.json({ data: result.rows[0] ?? null });
}
