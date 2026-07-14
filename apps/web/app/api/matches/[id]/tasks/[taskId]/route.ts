import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";
import { buildPatch, jsonError } from "@/server/services/crud";
import { matchBelongsToTenant } from "@/server/services/tracking";

const TASK_STATUSES = new Set(["pending", "done", "blocked", "skipped"]);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> },
) {
  const tenantId = await requireTenantId();
  const { id, taskId } = await context.params;
  const matchId = Number(id);
  if (!(await matchBelongsToTenant(tenantId, matchId))) return jsonError("Not found", 404);

  const body = await request.json();
  if (body.status != null && !TASK_STATUSES.has(body.status)) return jsonError("Invalid status");
  const patch = buildPatch(
    body,
    [
      { column: "title" },
      { column: "status" },
      { column: "due_at" },
      { column: "metadata_json", cast: "::jsonb", transform: (value) => JSON.stringify(value ?? {}) },
    ],
    3,
  );
  if (!patch.sets.length) return jsonError("No patch fields provided");

  const result = await query(
    `
    UPDATE match_tasks
    SET ${patch.sets.join(", ")}, updated_at = now()
    WHERE match_id = $1 AND id = $2
    RETURNING *
    `,
    [matchId, Number(taskId), ...patch.values],
  );
  if (!result.rows[0]) return jsonError("Not found", 404);
  return NextResponse.json({ data: result.rows[0] });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> },
) {
  const tenantId = await requireTenantId();
  const { id, taskId } = await context.params;
  const matchId = Number(id);
  if (!(await matchBelongsToTenant(tenantId, matchId))) return jsonError("Not found", 404);

  const result = await query(
    "DELETE FROM match_tasks WHERE match_id = $1 AND id = $2 RETURNING *",
    [matchId, Number(taskId)],
  );
  if (!result.rows[0]) return jsonError("Not found", 404);
  return NextResponse.json({ data: result.rows[0] });
}
