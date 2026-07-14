import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";

export async function PATCH(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const tenantId = await requireTenantId();
  const { userId } = await context.params;
  const body = await request.json();
  const result = await query(
    `
    UPDATE tenant_members
    SET role = COALESCE($3, role)
    WHERE tenant_id = $1 AND user_id = $2
    RETURNING *
    `,
    [tenantId, userId, body.role ?? null],
  );
  if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: result.rows[0] });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const tenantId = await requireTenantId();
  const { userId } = await context.params;
  const result = await query(
    `
    DELETE FROM tenant_members
    WHERE tenant_id = $1 AND user_id = $2
    RETURNING *
    `,
    [tenantId, userId],
  );
  if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: result.rows[0] });
}
