import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";

async function enqueueProfileMatch(profileId: string) {
  await query(
    `
    INSERT INTO worker_jobs (job_type, queue_name, payload, dedup_key, priority)
    VALUES ('match_profile', 'match', $1::jsonb, $2, 3)
    ON CONFLICT DO NOTHING
    `,
    [JSON.stringify({ profile_id: profileId }), `match_profile:${profileId}`],
  );
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const result = await query(
    `
    SELECT bl.*
    FROM business_lines bl
    JOIN company_profiles cp ON cp.id = bl.profile_id
    WHERE cp.tenant_id = $1 AND bl.id = $2
    `,
    [tenantId, id],
  );
  if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: result.rows[0] });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const body = await request.json();
  const result = await query(
    `
    UPDATE business_lines bl
    SET nombre = COALESCE($3, bl.nombre),
        cubso_segmentos = COALESCE($4, bl.cubso_segmentos),
        keywords = COALESCE($5, bl.keywords),
        ubigeos = COALESCE($6, bl.ubigeos),
        monto_min = COALESCE($7, bl.monto_min),
        monto_max = COALESCE($8, bl.monto_max),
        score_umbral = COALESCE($9, bl.score_umbral),
        is_active = COALESCE($10, bl.is_active),
        updated_at = now()
    FROM company_profiles cp
    WHERE cp.id = bl.profile_id
      AND cp.tenant_id = $1
      AND bl.id = $2
    RETURNING bl.*
    `,
    [
      tenantId,
      id,
      body.nombre ?? null,
      body.cubso_segmentos ?? null,
      body.keywords ?? null,
      body.ubigeos ?? null,
      body.monto_min ?? null,
      body.monto_max ?? null,
      body.score_umbral ?? null,
      body.is_active ?? null,
    ],
  );
  if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await enqueueProfileMatch(result.rows[0].profile_id);
  return NextResponse.json({ data: result.rows[0] });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const result = await query(
    `
    UPDATE business_lines bl
    SET is_active = false, updated_at = now()
    FROM company_profiles cp
    WHERE cp.id = bl.profile_id
      AND cp.tenant_id = $1
      AND bl.id = $2
    RETURNING bl.*
    `,
    [tenantId, id],
  );
  if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await enqueueProfileMatch(result.rows[0].profile_id);
  return NextResponse.json({ data: result.rows[0] });
}
