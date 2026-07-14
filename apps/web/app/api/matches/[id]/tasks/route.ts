import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";
import { jsonError } from "@/server/services/crud";
import { ensureDefaultTasks, matchBelongsToTenant } from "@/server/services/tracking";

const TASK_STATUSES = new Set(["pending", "done", "blocked", "skipped"]);

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const matchId = Number(id);
  if (!(await matchBelongsToTenant(tenantId, matchId))) return jsonError("Not found", 404);

  if (request.nextUrl.searchParams.get("ensure_defaults") === "true") {
    await ensureDefaultTasks(matchId);
  }

  const result = await query(
    "SELECT * FROM match_tasks WHERE match_id = $1 ORDER BY status, created_at, id",
    [matchId],
  );
  return NextResponse.json({ data: result.rows });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const matchId = Number(id);
  if (!(await matchBelongsToTenant(tenantId, matchId))) return jsonError("Not found", 404);

  const body = await request.json();
  if (typeof body.title !== "string" || !body.title.trim()) return jsonError("title is required");
  if (body.status != null && !TASK_STATUSES.has(body.status)) return jsonError("Invalid status");

  const result = await query(
    `
    INSERT INTO match_tasks (match_id, title, status, source, due_at, metadata_json)
    VALUES ($1, $2, COALESCE($3, 'pending'), COALESCE($4, 'manual'), $5, $6::jsonb)
    RETURNING *
    `,
    [
      matchId,
      body.title.trim(),
      body.status ?? null,
      body.source ?? "manual",
      body.due_at ?? null,
      JSON.stringify(body.metadata_json ?? {}),
    ],
  );
  return NextResponse.json({ data: result.rows[0] }, { status: 201 });
}
