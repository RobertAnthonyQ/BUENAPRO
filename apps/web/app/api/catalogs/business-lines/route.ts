import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";
import {
  asNullableNumber,
  asRequiredString,
  asSmallInteger,
  asStringArray,
  getTenantProfileId,
  jsonError,
} from "@/server/services/crud";

export async function GET(request: NextRequest) {
  const tenantId = await requireTenantId();
  const { searchParams } = new URL(request.url);
  const values: unknown[] = [tenantId];
  const where = ["cp.tenant_id = $1"];

  if (searchParams.get("active") === "true") where.push("bl.is_active = true");
  if (searchParams.get("active") === "false") where.push("bl.is_active = false");

  const q = searchParams.get("q");
  if (q) {
    values.push(`%${q}%`);
    where.push(
      `(bl.nombre ILIKE $${values.length} OR EXISTS (SELECT 1 FROM unnest(bl.keywords) keyword WHERE keyword ILIKE $${values.length}))`,
    );
  }

  const result = await query(
    `
    SELECT bl.*
    FROM business_lines bl
    JOIN company_profiles cp ON cp.id = bl.profile_id
    WHERE ${where.join(" AND ")}
    ORDER BY bl.created_at
    `,
    values,
  );
  return NextResponse.json({ data: result.rows });
}

export async function POST(request: NextRequest) {
  const tenantId = await requireTenantId();

  try {
    const body = await request.json();
    const profileId = await getTenantProfileId(tenantId, body.profile_id);
    if (!profileId) return jsonError("Profile required", 400);

    const result = await query(
      `
      INSERT INTO business_lines (
        profile_id, nombre, cubso_segmentos, keywords, ubigeos, monto_min, monto_max, score_umbral, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, true))
      RETURNING *
      `,
      [
        profileId,
        asRequiredString(body.nombre, "nombre"),
        asStringArray(body.cubso_segmentos, "cubso_segmentos"),
        asStringArray(body.keywords, "keywords"),
        asStringArray(body.ubigeos, "ubigeos"),
        asNullableNumber(body.monto_min, "monto_min"),
        asNullableNumber(body.monto_max, "monto_max"),
        body.score_umbral == null ? 70 : asSmallInteger(body.score_umbral, "score_umbral"),
        body.is_active ?? null,
      ],
    );
    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid request");
  }
}
