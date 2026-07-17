import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";
import { keywordSignals } from "@/server/services/keywordSignals";

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

export async function GET() {
  const tenantId = await requireTenantId();
  const result = await query(
    `
    SELECT bl.*
    FROM business_lines bl
    JOIN company_profiles cp ON cp.id = bl.profile_id
    WHERE cp.tenant_id = $1
    ORDER BY bl.created_at
    `,
    [tenantId],
  );
  return NextResponse.json({ data: result.rows });
}

export async function POST(request: NextRequest) {
  const tenantId = await requireTenantId();
  const body = await request.json();
  const signals = keywordSignals(body);
  const profile = await query("SELECT id FROM company_profiles WHERE tenant_id = $1 ORDER BY created_at LIMIT 1", [tenantId]);
  if (!profile.rows[0]) return NextResponse.json({ error: "Profile required" }, { status: 400 });
  const result = await query(
    `
    INSERT INTO business_lines (
      profile_id, nombre, cubso_segmentos, keywords, keyword_phrases, keyword_terms, ubigeos, monto_min, monto_max, score_umbral
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
    `,
    [
      profile.rows[0].id,
      body.nombre,
      body.cubso_segmentos ?? [],
      signals.keywords,
      signals.keyword_phrases,
      signals.keyword_terms,
      body.ubigeos ?? [],
      body.monto_min ?? null,
      body.monto_max ?? null,
      body.score_umbral ?? 70,
    ],
  );
  await enqueueProfileMatch(profile.rows[0].id);
  return NextResponse.json({ data: result.rows[0] }, { status: 201 });
}
