import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { query } from "@/server/db/client";

export async function currentTenantId() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const membership = await query<{ tenant_id: string }>(
      `
      SELECT tenant_id
      FROM tenant_members
      WHERE user_id = $1
      ORDER BY created_at
      LIMIT 1
      `,
      [session.user.id],
    );
    if (membership.rows[0]?.tenant_id) return membership.rows[0].tenant_id;
  }
  if (session?.user?.tenantId) return session.user.tenantId;
  if (process.env.NODE_ENV !== "production") {
    const headerStore = await headers();
    return headerStore.get("x-tenant-id") ?? process.env.DEV_TENANT_ID ?? null;
  }
  return null;
}

export async function currentUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function requireTenantId() {
  const tenantId = await currentTenantId();
  if (!tenantId) {
    throw new Response("Missing tenant context", { status: 401 });
  }
  return tenantId;
}

export async function requireTenantRole(allowed: string[] = ["owner", "admin"]) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) throw new Response("Unauthorized", { status: 401 });
  const membership = await query<{ tenant_id: string; role: string }>(
    `SELECT tenant_id, role FROM tenant_members WHERE user_id = $1 ORDER BY created_at LIMIT 1`,
    [userId],
  );
  const row = membership.rows[0];
  if (!row || !allowed.includes(row.role)) throw new Response("Forbidden", { status: 403 });
  return { tenantId: row.tenant_id, userId, role: row.role };
}
